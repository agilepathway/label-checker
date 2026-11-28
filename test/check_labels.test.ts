import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { renderSpecification } from "../shared/specification-by-example/src/markdown-renderer.ts";
import {
	type Cell,
	cellAt,
	cellAtAnyOf,
	type Example,
	expandText,
	soleTable,
	type Text,
} from "../shared/specification-by-example/src/specification-by-example.ts";
import { registerSpecificationTests } from "../shared/specification-by-example/src/specification-test-registration.ts";
import {
	type CriterionOperator,
	labelCheckerSpecification,
} from "./check_labels_specification.ts";
import {
	type Requirement,
	type Requirements,
	runLabelCheck,
} from "./check_labels_test_harness.ts";

test("criterion interpreter rejects missing or unsupported operators", () => {
	const criterion: Text = {
		template: "{operator} {labels}",
		parameters: { labels: "bug" },
	};
	assert.throws(() => interpretCriterion(criterion, "Criterion"), {
		message: "Expected a supported operator for Criterion",
	});

	const unsupportedOperator: Text = {
		template: "{operator} {labels}",
		parameters: { operator: "Sometimes", labels: "bug" },
	};
	assert.throws(() => interpretCriterion(unsupportedOperator, "Criterion"), {
		message: "Expected a supported operator for Criterion",
	});
});

test("criterion interpreter preserves parameter order", () => {
	const criterion: Text = {
		template: "{operator} {first} {second}",
		parameters: {
			first: "type:",
			second: "visibility/",
			operator: "No",
		},
	};

	assert.deepEqual(interpretCriterion(criterion, "Criterion"), {
		requirement: "none",
		input: "type:,visibility/",
	});
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

registerSpecificationTests(labelCheckerSpecification, (example) =>
	verifySpecificationExample(example),
);

async function verifySpecificationExample(example: Example): Promise<void> {
	const exampleTable = soleTable(example);
	const prefixMode = example.associatedData?.prefixMode;
	assert(typeof prefixMode === "boolean", "Expected a boolean prefix mode");
	for (const row of exampleTable.rows) {
		const pullRequestNumber = parsePullRequestNumber(
			cellAt(row, "Pull request number"),
		);
		const expectedStdout = cellAt(row, "Expected stdout");
		const expectedStderr = cellAt(row, "Expected stderr");
		const labels = parseLabels(cellAt(row, "Labels on the pull request"));
		const requirements: Requirements = {};
		const criteria = row
			.filter((cell) =>
				/^Criterion(?: \d+)?$/.test(expandText(cell.heading.name)),
			)
			.map(criterionFromCell);
		for (const criterion of criteria)
			requirements[criterion.requirement] = criterion.input;
		const outcome = cellAtAnyOf(row, "Outcome", "Overall outcome");
		const expectedOutcome = interpretOutcome(outcome);
		const result = await runLabelCheck({
			pullRequestNumber,
			labels,
			requirements,
			prefixMode,
		});
		assert.equal(result.status, expectedOutcome.status);
		assert.equal(result.stdout, expectedStdout);
		assert.equal(result.stderr, expectedStderr);
		assert.equal(result.output, expectedOutcome.output);
	}
}

function parsePullRequestNumber(value: string): number {
	const pullRequestNumber = Number(value);
	assert(
		Number.isSafeInteger(pullRequestNumber) && pullRequestNumber > 0,
		"Expected a positive pull request number",
	);
	return pullRequestNumber;
}

function interpretOutcome(outcome: string):
	| { status: 0; output: "label_check=success" }
	| {
			status: 1;
			output: "label_check=failure";
	  } {
	assert(outcome === "Success" || outcome === "Failure" || outcome === "Error");
	return outcome === "Success"
		? { status: 0, output: "label_check=success" }
		: { status: 1, output: "label_check=failure" };
}

function parseLabels(labelsText: string): string[] {
	return labelsText === "(none)" ? [] : labelsText.split(", ");
}

const requirementByOperator: Record<CriterionOperator, Requirement> = {
	"None of": "none",
	No: "none",
	"Exactly one of": "one",
	"Exactly one": "one",
	"At least one of": "any",
	"At least one": "any",
	"All of": "all",
	All: "all",
};

function criterionFromCell(cell: Cell): {
	requirement: Requirement;
	input: string;
} {
	const heading = expandText(cell.heading.name);
	return interpretCriterion(cell.value, heading);
}

function interpretCriterion(
	criterion: Text,
	heading: string,
): { requirement: Requirement; input: string } {
	assert(typeof criterion !== "string", `Expected parameterised ${heading}`);
	const { operator, ...inputParameters } = criterion.parameters;
	assert(
		isCriterionOperator(operator),
		`Expected a supported operator for ${heading}`,
	);
	return {
		requirement: requirementByOperator[operator],
		input: Object.values(inputParameters).join(",").replaceAll(", ", ","),
	};
}

function isCriterionOperator(value: string): value is CriterionOperator {
	return Object.hasOwn(requirementByOperator, value);
}
