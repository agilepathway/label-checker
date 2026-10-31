import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { renderSpecification } from "../shared/specification-by-example/src/markdown-renderer.ts";
import {
	expandText,
	type ParameterisedText,
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

registerSpecificationTests(
	labelCheckerSpecification,
	verifySpecificationExample,
);

async function verifySpecificationExample(
	example: ExampleWithDiagnostics,
): Promise<void> {
	const execution = example.testExecution;
	assert(execution);

	if (execution.kind === "unsupported") {
		await verifyUnsupportedExample(example, execution);
		return;
	}

	await verifySupportedExample(example, execution);
}

async function verifyUnsupportedExample(
	example: ExampleWithDiagnostics,
	execution: NonNullable<ExampleWithDiagnostics["testExecution"]>,
): Promise<void> {
	const tableContent = example.content.find((item) => item.type === "table");
	assert(tableContent);
	const table = tableContent.table;
	for (const [index, row] of table.rows.entries()) {
		// biome-ignore lint/nursery/noUnsafeTypeAssertion: Specification rows contain executable criteria.
		const criterion = row[0] as ExecutableCriterion;
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
	example: ExampleWithDiagnostics,
	execution: NonNullable<ExampleWithDiagnostics["testExecution"]>,
): Promise<void> {
	const tableContent = example.content.find((item) => item.type === "table");
	assert(tableContent);
	const table = tableContent.table;
	const labelsColumn = table.headers.findIndex(
		(header) => renderTableText(header) === "Labels on the pull request",
	);
	const expectedDiagnostics = example.expectedDiagnostics;
	assert(expectedDiagnostics);
	assert.equal(
		expectedDiagnostics.length,
		table.rows.length,
		"Diagnostic expectations must correspond to every table row",
	);

	for (const [index, row] of table.rows.entries()) {
		const labelsText = renderTableText(row[labelsColumn]);
		const labels = parseLabels(labelsText);
		const requirements: Requirements = {};
		const criteria = row
			.slice(0, labelsColumn)
			// biome-ignore lint/nursery/noUnsafeTypeAssertion: Specification rows contain executable criteria.
			.map((criterion) => criterion as ExecutableCriterion);

		for (const criterion of criteria) {
			requirements[criterion.execution.requirement] = criterion.execution.input;
		}

		const outcome = renderTableText(row[row.length - 1]);
		const expectedStatus = interpretSuccessFailureOutcome(outcome);
		const expected: CombinedDiagnosticExpectation | undefined =
			expectedDiagnostics[index];
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
