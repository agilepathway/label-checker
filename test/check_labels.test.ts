import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { renderSpecification } from "../shared/specification-by-example/src/markdown-renderer.ts";
import {
	type Example,
	expandText,
	type ParameterisedText,
	tableAt,
} from "../shared/specification-by-example/src/specification-by-example.ts";
import { registerSpecificationTests } from "../shared/specification-by-example/src/specification-test-registration.ts";
import {
	type CombinedDiagnosticExpectation,
	type ExampleWithDiagnostics,
	type ExecutableCriterion,
	labelCheckerSpecification,
} from "./check_labels_specification.ts";
import {
	type Requirements,
	runLabelCheck,
} from "./check_labels_test_harness.ts";

test("published label-checker specification is up to date", async () => {
	const publishedMarkdown = await readFile(
		new URL("../spec/label-checker.md", import.meta.url),
		"utf8",
	);
	const expectedMarkdown = renderSpecification(labelCheckerSpecification);

	assert.equal(
		publishedMarkdown,
		expectedMarkdown,
		"Published label-checker.md is stale. Regenerate it with:\n" +
			"node test/publish-label-checker-spec.ts",
	);
});

test("captioned examples attach their captions to the corresponding tables", () => {
	const examples = labelCheckerSpecification.rules.flatMap(
		(rule) => rule.examples,
	);
	const expectedCaptions = new Map([
		["none_of_type_prefix", "**`none_of`**"],
		["one_of_type_prefix", "**`one_of`**"],
		["any_of_type_prefix", "**`any_of`**"],
		["all_of_type_prefix", "**`all_of`**"],
		["two_checks_combined", "2 checks combined:"],
		["three_checks_combined", "3 checks combined:"],
		["four_checks_combined", "4 checks combined:"],
	]);

	for (const example of examples.filter((item) =>
		expectedCaptions.has(item.id),
	)) {
		const expectedCaption = expectedCaptions.get(example.id);
		assert(expectedCaption, `Unexpected captioned example: ${example.id}`);
		assert.equal(example.content.length, 1);
		assert.equal(example.content[0]?.type, "table");
		assert.equal(tableAt(example, 0).caption?.template, expectedCaption);
		assert.deepEqual(tableAt(example, 0).caption?.parameters, {});
	}

	assert.equal(
		examples.filter((example) => expectedCaptions.has(example.id)).length,
		expectedCaptions.size,
		"Missing a captioned example",
	);
});

registerSpecificationTests(
	labelCheckerSpecification,
	verifySpecificationExample,
);

async function verifySpecificationExample(example: Example): Promise<void> {
	const specificationExample = asExampleWithDiagnostics(example);
	const execution = specificationExample.testExecution;
	assert(execution);

	if (execution.kind === "unsupported") {
		await verifyUnsupportedExample(example, execution);
		return;
	}

	await verifySupportedExample(example, specificationExample, execution);
}

async function verifyUnsupportedExample(
	example: Example,
	execution: NonNullable<ExampleWithDiagnostics["testExecution"]>,
): Promise<void> {
	const tableContent = example.content.find((item) => item.type === "table");
	assert(tableContent);
	const table = tableContent.table;
	for (const [index, row] of table.rows.entries()) {
		const criterion = asExecutableCriterion(row[0]);
		assert.equal(renderTableText(row[row.length - 1]), "Error");

		const result = await runLabelCheck({
			pullRequestNumber: execution.pullRequestNumbers?.[index] ?? index + 1,
			labels: [],
			requirements: {
				[criterion.execution.requirement]: criterion.execution.input,
			},
			prefixMode: execution.prefixMode,
		});

		assert.equal(result.status, 1);
		assert.equal(result.stdout, "Checking GitHub labels ...\n");
		assert.equal(result.stderr, execution.expectedError);
		assert.equal(result.output, "label_check=failure");
	}
}

async function verifySupportedExample(
	example: Example,
	specificationExample: ExampleWithDiagnostics,
	execution: NonNullable<ExampleWithDiagnostics["testExecution"]>,
): Promise<void> {
	const tableContent = example.content.find((item) => item.type === "table");
	assert(tableContent);
	const table = tableContent.table;
	const labelsColumn = table.headers.findIndex(
		(header) => renderTableText(header) === "Labels on the pull request",
	);

	const diagnosticsByLabels = getDiagnosticExpectations(
		specificationExample,
		table.rows.map((row) => renderTableText(row[labelsColumn])),
	);

	for (const [index, row] of table.rows.entries()) {
		const labelsText = renderTableText(row[labelsColumn]);
		const labels = parseLabels(labelsText);
		const requirements: Requirements = {};
		const criteria = row.slice(0, labelsColumn).map(asExecutableCriterion);

		for (const criterion of criteria) {
			requirements[criterion.execution.requirement] = criterion.execution.input;
		}

		const outcome = renderTableText(row[row.length - 1]);
		const expectedStatus = interpretSuccessFailureOutcome(outcome);
		const expected = diagnosticsByLabels[labelsText];
		assert(expected);

		const result = await runLabelCheck({
			pullRequestNumber: execution.pullRequestNumbers?.[index] ?? index + 1,
			labels,
			requirements,
			prefixMode: execution.prefixMode,
		});

		assert.equal(result.status, expectedStatus);
		assert.equal(result.stdout, expected.stdout);
		assert.equal(result.stderr, expected.stderr);
		assert.equal(result.output, expected.output);
	}
}

function asExampleWithDiagnostics(example: Example): ExampleWithDiagnostics {
	if (
		!("testExecution" in example) ||
		!isTestExecution(example.testExecution)
	) {
		throw new TypeError("Expected an example with execution metadata");
	}

	return {
		...example,
		testExecution: example.testExecution,
	};
}

function isTestExecution(
	value: unknown,
): value is NonNullable<ExampleWithDiagnostics["testExecution"]> {
	if (!isRecord(value)) return false;

	return (
		isExecutionKind(value.kind) &&
		isOptionalBoolean(value.prefixMode) &&
		isOptionalString(value.expectedError) &&
		isOptionalPullRequestNumbers(value.pullRequestNumbers)
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function isExecutionKind(value: unknown): boolean {
	return value === "supported" || value === "unsupported";
}

function isOptionalBoolean(value: unknown): boolean {
	return value === undefined || typeof value === "boolean";
}

function isOptionalString(value: unknown): boolean {
	return value === undefined || typeof value === "string";
}

function isOptionalPullRequestNumbers(value: unknown): boolean {
	return (
		value === undefined ||
		(Array.isArray(value) &&
			value.every((pullRequestNumber) => typeof pullRequestNumber === "number"))
	);
}

function asExecutableCriterion(
	value: ParameterisedText | undefined,
): ExecutableCriterion {
	if (value === undefined || !("execution" in value)) {
		throw new TypeError("Expected an executable criterion");
	}
	if (!isCriterionExecution(value.execution)) {
		throw new TypeError("Expected an executable criterion");
	}
	return {
		template: value.template,
		parameters: value.parameters,
		execution: value.execution,
	};
}

function isCriterionExecution(
	value: unknown,
): value is ExecutableCriterion["execution"] {
	if (!isRecord(value)) return false;
	return isRequirement(value.requirement) && typeof value.input === "string";
}

function isRequirement(
	value: unknown,
): value is ExecutableCriterion["execution"]["requirement"] {
	return (
		value === "none" || value === "one" || value === "any" || value === "all"
	);
}
function getDiagnosticExpectations(
	example: ExampleWithDiagnostics,
	labelsInputs: string[],
): Record<string, CombinedDiagnosticExpectation> {
	const diagnosticsByLabels = example.diagnosticsByLabels;
	assert(diagnosticsByLabels);
	assert.deepEqual(
		Object.keys(diagnosticsByLabels).sort(),
		labelsInputs.sort(),
		"Diagnostic expectations must correspond exactly to the example's label inputs",
	);
	return diagnosticsByLabels;
}

function interpretSuccessFailureOutcome(outcome: string): 0 | 1 {
	assert(outcome === "Success" || outcome === "Failure");
	return outcome === "Success" ? 0 : 1;
}

function parseLabels(labelsText: string): string[] {
	return labelsText === "(none)" ? [] : labelsText.split(", ");
}

function renderTableText(value: ParameterisedText | undefined): string {
	assert(value !== undefined, "Expected table text to be present");
	return expandText(value);
}
