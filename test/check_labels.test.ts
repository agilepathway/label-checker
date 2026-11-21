import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { renderSpecification } from "../shared/specification-by-example/src/markdown-renderer.ts";
import {
	type Cell,
	cellAt,
	cellAtAnyOf,
	expandText,
	type Row,
	rawCellAt,
} from "../shared/specification-by-example/src/specification-by-example.ts";
import { registerSpecificationTests } from "../shared/specification-by-example/src/specification-test-registration.ts";
import {
	type ExecutableCriterion,
	type LabelCheckerExample,
	labelCheckerSpecification,
} from "./check_labels_specification.ts";
import {
	type Requirements,
	runLabelCheck,
} from "./check_labels_test_harness.ts";

test("ExecutableCriterion execution metadata is readonly", () => {
	const verifyReadonlyTypes = (criterion: ExecutableCriterion): void => {
		// @ts-expect-error Executable criterion execution metadata is readonly.
		criterion.execution = { requirement: "all", input: "" };
		// @ts-expect-error Executable criterion requirements are readonly.
		criterion.execution.requirement = "all";
		// @ts-expect-error Executable criterion input is readonly.
		criterion.execution.input = "";
	};
	void verifyReadonlyTypes;
});

test("ExecutableCriterion runtime validation checks the complete shape", () => {
	const criterion: ExecutableCriterion = {
		template: "Requires {labels}",
		parameters: { labels: "bug" },
		execution: { requirement: "one", input: "bug" },
	};

	assert.equal(executableCriterion(criterion, "Criterion"), criterion);
	const emptyParametersCriterion = { ...criterion, parameters: {} };
	assert.equal(
		executableCriterion(emptyParametersCriterion, "Criterion"),
		emptyParametersCriterion,
	);

	const invalidCriteria: unknown[] = [
		"not executable",
		null,
		[],
		{ parameters: criterion.parameters, execution: criterion.execution },
		{ ...criterion, template: 1 },
		{ ...criterion, parameters: null },
		{ ...criterion, parameters: [] },
		{ ...criterion, parameters: { labels: 1 } },
		{ template: criterion.template, execution: criterion.execution },
		{ template: criterion.template, parameters: criterion.parameters },
		{ ...criterion, execution: null },
		{ ...criterion, execution: [] },
		{ ...criterion, execution: { input: "bug" } },
		{ ...criterion, execution: { requirement: "one" } },
		{
			...criterion,
			execution: { requirement: "something-else", input: "bug" },
		},
		{
			...criterion,
			execution: { requirement: "one", input: 1 },
		},
	];

	for (const invalidCriterion of invalidCriteria) {
		assert.throws(() => executableCriterion(invalidCriterion, "Criterion"), {
			message: "Expected executable Criterion",
		});
	}
});

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

registerSpecificationTests(
	labelCheckerSpecification,
	// biome-ignore lint/nursery/noUnsafeTypeAssertion: The label-checker specification adds required metadata to shared examples.
	(example) => verifySpecificationExample(example as LabelCheckerExample),
);

async function verifySpecificationExample(
	example: LabelCheckerExample,
): Promise<void> {
	if (isUnsupportedExample(example)) {
		await verifyUnsupportedExample(example);
		return;
	}

	await verifySupportedExample(example);
}

function isUnsupportedExample(
	example: LabelCheckerExample,
): example is Extract<
	LabelCheckerExample,
	{ testExecution: { kind: "unsupported" } }
> {
	return example.testExecution.kind === "unsupported";
}

async function verifyUnsupportedExample(
	example: Extract<
		LabelCheckerExample,
		{ testExecution: { kind: "unsupported" } }
	>,
): Promise<void> {
	const tableContent = example.content.find((item) => item.type === "table");
	assert(tableContent);
	const table = tableContent.table;
	for (const [index, row] of table.rows.entries()) {
		const criterion = executableCriterionAt(row, "Criterion");
		assert.equal(cellAtAnyOf(row, "Outcome", "Overall outcome"), "Error");

		const result = await runLabelCheck({
			pullRequestNumber: index + 1,
			labels: [],
			requirements: {
				[criterion.execution.requirement]: criterion.execution.input,
			},
			prefixMode: example.testExecution.prefixMode ?? false,
		});

		assert.equal(result.status, 1);
		assert.equal(result.stdout, "Checking GitHub labels ...\n");
		assert.equal(result.stderr, example.testExecution.expectedError);
		assert.equal(result.output, "label_check=failure");
	}
}

async function verifySupportedExample(
	example: Extract<
		LabelCheckerExample,
		{ testExecution: { kind: "supported" } }
	>,
): Promise<void> {
	for (const [index, { row, expected }] of example.supportedRows.entries()) {
		const labelsText = cellAt(row, "Labels on the pull request");
		const labels = parseLabels(labelsText);
		const requirements: Requirements = {};
		const criteria = row
			.filter((cell) => /^Criterion(?: \d+)?$/.test(expandText(cell.heading)))
			.map(executableCriterionFromCell);
		for (const criterion of criteria)
			requirements[criterion.execution.requirement] = criterion.execution.input;
		const outcome = cellAtAnyOf(row, "Outcome", "Overall outcome");
		const expectedOutcome = interpretSuccessFailureOutcome(outcome);
		const result = await runLabelCheck({
			pullRequestNumber: expected.pullRequestNumber ?? index + 1,
			labels,
			requirements,
			prefixMode: example.testExecution.prefixMode ?? false,
		});
		assert.equal(result.status, expectedOutcome.status);
		assert.equal(result.stdout, expected.stdout);
		assert.equal(result.stderr, expected.stderr);
		assert.equal(result.output, expectedOutcome.output);
	}
}

function interpretSuccessFailureOutcome(outcome: string):
	| { status: 0; output: "label_check=success" }
	| {
			status: 1;
			output: "label_check=failure";
	  } {
	assert(outcome === "Success" || outcome === "Failure");
	return outcome === "Success"
		? { status: 0, output: "label_check=success" }
		: { status: 1, output: "label_check=failure" };
}

function parseLabels(labelsText: string): string[] {
	return labelsText === "(none)" ? [] : labelsText.split(", ");
}

function executableCriterionAt(row: Row, heading: string): ExecutableCriterion {
	return executableCriterion(rawCellAt(row, heading), heading);
}

function executableCriterionFromCell(cell: Cell): ExecutableCriterion {
	const heading = expandText(cell.heading);
	return executableCriterion(cell.value, heading);
}

function executableCriterion(
	criterion: unknown,
	heading: string,
): ExecutableCriterion {
	assert(isExecutableCriterion(criterion), `Expected executable ${heading}`);
	return criterion;
}

function isExecutableCriterion(text: unknown): text is ExecutableCriterion {
	return (
		isRecord(text) &&
		typeof text.template === "string" &&
		isStringRecord(text.parameters) &&
		isRecord(text.execution) &&
		isRequirement(text.execution.requirement) &&
		typeof text.execution.input === "string"
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringRecord(value: unknown): value is Record<string, string> {
	return (
		isRecord(value) &&
		Object.values(value).every((item) => typeof item === "string")
	);
}

function isRequirement(
	value: unknown,
): value is ExecutableCriterion["execution"]["requirement"] {
	return (
		value === "none" || value === "one" || value === "any" || value === "all"
	);
}
