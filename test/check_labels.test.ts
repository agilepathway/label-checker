import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { renderSpecification } from "../shared/specification-by-example/src/markdown-renderer.ts";
import {
	type Example,
	expandText,
	type ParameterisedText,
	type TableText,
	tableAt,
	textAt,
} from "../shared/specification-by-example/src/specification-by-example.ts";
import { registerSpecificationTests } from "../shared/specification-by-example/src/specification-test-registration.ts";
import {
	type CombinedDiagnosticExpectation,
	type ExampleWithDiagnostics,
	labelCheckerSpecification,
} from "./check_labels_specification.ts";
import {
	type Requirement,
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

test("prefix examples have captions identifying each check before their tables", () => {
	const prefixExamples = labelCheckerSpecification.rules
		.find(
			(rule) =>
				rule.definition ===
				"The label checker can check for labels that start with a given prefix.",
		)
		?.examples.filter((example) => example.id.endsWith("_type_prefix"));

	assert(prefixExamples, "Missing the prefix-matching rule");
	assert.equal(prefixExamples.length, 3);
	const expectedCaptions = new Map([
		["none_of_type_prefix", "**`none_of`**"],
		["one_of_type_prefix", "**`one_of`**"],
		["any_of_type_prefix", "**`any_of`**"],
	]);

	for (const example of prefixExamples) {
		const expectedCaption = expectedCaptions.get(example.id);
		assert(expectedCaption, `Unexpected prefix example: ${example.id}`);
		assert.equal(expandText(textAt(example, 0)), expectedCaption);
		assert.equal(example.content[1]?.type, "table");
		tableAt(example, 1);
	}
});

const requirementByOperator = new Map<string, Requirement>([
	["none of", "none"],
	["no", "none"],
	["exactly one of", "one"],
	["exactly one", "one"],
	["at least one of", "any"],
	["at least one", "any"],
	["all of", "all"],
]);

const specificationExampleImplementations: Record<
	string,
	(example: Example) => Promise<void>
> = {
	none_of_major_minor_patch: (example: Example) =>
		verifySpecificationExample(example),
	none_of_type_prefix: verifyTypePrefixSpecificationExample,
	one_of_type_prefix: verifyTypePrefixSpecificationExample,
	any_of_type_prefix: verifyTypePrefixSpecificationExample,
	all_of_type_prefix: verifyAllOfTypePrefixSpecificationExample,
	multiple_prefixes_per_check:
		verifyMultiplePrefixesPerCheckSpecificationExample,
	two_prefix_checks_combined: verifyCombinedPrefixChecksSpecificationExample,
	one_of_major_minor_patch: (example: Example) =>
		verifySpecificationExample(example),
	all_of_major_minor_patch: (example: Example) =>
		verifySpecificationExample(example),
	any_of_major_minor_patch: (example: Example) =>
		verifySpecificationExample(example),
	two_checks_combined: verifyCombinedChecksSpecificationExample,
	three_checks_combined: verifyCombinedChecksSpecificationExample,
	four_checks_combined: verifyCombinedChecksSpecificationExample,
};

registerSpecificationTests(labelCheckerSpecification, async (example) => {
	const implementation = specificationExampleImplementations[example.id];
	if (!implementation) {
		throw new Error(`Unexpected label-checker example: ${example.id}`);
	}
	await implementation(example);
});

async function verifyMultiplePrefixesPerCheckSpecificationExample(
	example: Example,
): Promise<void> {
	const table = tableAt(example, 0);
	assert.equal(table.rows.length, 4);
	const verifiedRequirements = new Set<Requirement>();
	const requirementByOpening = new Map<string, Requirement>([
		["No", "none"],
		["Exactly", "one"],
		["At", "any"],
		["All", "all"],
	]);

	for (const [index, row] of table.rows.entries()) {
		const criterion = row[0];
		assert(
			typeof criterion !== "string",
			"Expected the criterion to use parameterised text",
		);
		const opening = criterion.template.split(" ")[0];
		const requirement = requirementByOpening.get(opening);
		assert(
			requirement,
			`Unexpected multiple-prefix criterion: ${criterion.template}`,
		);
		assert(
			!verifiedRequirements.has(requirement),
			`Duplicate multiple-prefix criterion: ${criterion.template}`,
		);
		verifiedRequirements.add(requirement);
		assert.deepEqual(criterion.parameters, {
			firstPrefix: "type:",
			secondPrefix: "visibility/",
		});
		const expectedStatus = interpretErrorOutcome(renderTableText(row[1]));

		const result = await runLabelCheck({
			pullRequestNumber: index + 1,
			labels: [],
			requirements: { [requirement]: "type:,visibility/" },
			prefixMode: true,
		});

		assert.equal(result.status, expectedStatus);
		assert.equal(result.stdout, "Checking GitHub labels ...\n");
		assert.equal(
			result.stderr,
			"::error:: Currently the label checker only supports checking with one prefix, not multiple.\n",
		);
		assert.equal(result.output, "label_check=failure");
	}

	assert.equal(verifiedRequirements.size, 4);
}

async function verifyCombinedPrefixChecksSpecificationExample(
	example: ExampleWithDiagnostics,
): Promise<void> {
	const table = tableAt(example, 0);
	assert.equal(table.rows.length, 1);
	const row = table.rows[0];
	assert(row, "Missing the combined-prefix-check example row");

	const noneCriterion = getCriterion(row[0], "first");
	const oneCriterion = getCriterion(row[1], "second");
	assert.equal(getRequirement(noneCriterion, "first"), "none");
	assert.deepEqual(noneCriterion.parameters, {
		operator: "No",
		prefix: "type:",
	});
	assert.equal(getRequirement(oneCriterion, "second"), "one");
	assert.deepEqual(oneCriterion.parameters, {
		operator: "Exactly one",
		prefix: "type:",
	});

	const labelsText = renderTableText(row[2]);
	const labels = parseLabels(labelsText);
	const diagnosticsByLabels = getDiagnosticExpectations(example, [labelsText]);
	const noneOutcome = renderTableText(row[3]);
	const oneOutcome = renderTableText(row[4]);
	const overallOutcome = renderTableText(row[5]);
	assert.equal(noneOutcome, "Success");
	assert.equal(oneOutcome, "Failure");
	assert.equal(overallOutcome, "Failure");
	const expectedStatus = interpretSuccessFailureOutcome(overallOutcome);

	const result = await runLabelCheck({
		pullRequestNumber: 1,
		labels,
		requirements: { none: "type:", one: "type:" },
		prefixMode: true,
	});

	assert.equal(result.status, expectedStatus);
	const expected = diagnosticsByLabels[labelsText];
	assert(
		expected,
		`Missing diagnostic expectations for labels "${labelsText}" in ${example.id}`,
	);
	assert.equal(result.stdout, expected.stdout);
	assert.equal(result.stderr, expected.stderr);
	assert.equal(result.output, expected.output);
}

async function verifyAllOfTypePrefixSpecificationExample(
	example: Example,
): Promise<void> {
	const table = tableAt(example, 1);
	assert.equal(table.rows.length, 1);
	const row = table.rows[0];
	assert(row, "Missing the all_of prefix example row");
	const criterion = row[0];
	assert(
		typeof criterion !== "string",
		"Expected the criterion to use parameterised text",
	);
	assert.equal(criterion.template, "All labels start with prefix {prefix}");
	assert.equal(criterion.parameters.prefix, "type:");
	const expectedStatus = interpretErrorOutcome(renderTableText(row[1]));

	const result = await runLabelCheck({
		pullRequestNumber: 1,
		labels: [],
		requirements: { all: criterion.parameters.prefix },
		prefixMode: true,
	});

	assert.equal(result.status, expectedStatus);
	assert.equal(result.stdout, "Checking GitHub labels ...\n");
	assert.equal(
		result.stderr,
		"::error:: The label checker does not support prefix checking with `all_of`, as that is not a logical combination.\n",
	);
	assert.equal(result.output, "label_check=failure");
}

function getDiagnosticExpectations(
	example: ExampleWithDiagnostics,
	labelsInputs: string[],
): Record<string, CombinedDiagnosticExpectation> {
	const diagnosticsByLabels = example.diagnosticsByLabels;
	assert(
		diagnosticsByLabels,
		`Missing diagnostic expectations for ${example.id}`,
	);
	assert.deepEqual(
		Object.keys(diagnosticsByLabels).sort(),
		labelsInputs.sort(),
		"Diagnostic expectations must correspond exactly to the example's label inputs",
	);
	return diagnosticsByLabels;
}

function interpretSuccessFailureOutcome(outcome: string): 0 | 1 {
	assert(
		outcome === "Success" || outcome === "Failure",
		`Unexpected check outcome: "${outcome}"`,
	);
	return outcome === "Success" ? 0 : 1;
}

function interpretErrorOutcome(outcome: string): 1 {
	assert.equal(outcome, "Error");
	return 1;
}

async function verifyTypePrefixSpecificationExample(
	example: ExampleWithDiagnostics,
): Promise<void> {
	const table = tableAt(example, 1);
	const diagnosticsByLabels = getDiagnosticExpectations(
		example,
		table.rows.map((row) => renderTableText(row[1])),
	);
	const pullRequestNumbers = [1, 5, 6, 7];

	for (const [index, row] of table.rows.entries()) {
		const criterion = row[0];
		assert(
			typeof criterion !== "string",
			"Expected the criterion to use parameterised text",
		);
		assert.equal(criterion.parameters.prefix, "type:");
		const requirement = getRequirement(criterion, example.id);

		const labelsText = renderTableText(row[1]);
		const labels = parseLabels(labelsText);
		const outcome = renderTableText(row[2]);
		const expectedStatus = interpretSuccessFailureOutcome(outcome);
		const expected = diagnosticsByLabels[labelsText];
		assert(
			expected,
			`Missing diagnostic expectations for labels "${labelsText}" in ${example.id}`,
		);
		const pullRequestNumber = pullRequestNumbers[index];
		assert(
			pullRequestNumber,
			`Missing pull request number for row ${index + 1}`,
		);

		const result = await runLabelCheck({
			pullRequestNumber,
			labels,
			requirements: {
				[requirement]: criterion.parameters.prefix,
			},
			prefixMode: true,
		});

		assert.equal(result.status, expectedStatus);
		assert.equal(result.stdout, expected.stdout);
		assert.equal(result.stderr, expected.stderr);
		assert.equal(result.output, expected.output);
	}
}

async function verifyCombinedChecksSpecificationExample(
	example: ExampleWithDiagnostics,
): Promise<void> {
	const table = tableAt(example, 1);
	const labelsColumn = table.headers.indexOf("Labels on the pull request");
	assert(labelsColumn >= 2, "Missing combined-check criterion columns");
	const checkCount = labelsColumn;
	assert(
		[2, 3, 4].includes(checkCount),
		`Unexpected number of combined checks: ${checkCount}`,
	);
	assert.equal(
		expandText(textAt(example, 0)),
		`${checkCount} checks combined:`,
	);
	assert.equal(table.headers.length, checkCount * 2 + 2);
	const diagnosticsByLabels = getDiagnosticExpectations(
		example,
		table.rows.map((row) => renderTableText(row[labelsColumn])),
	);

	for (const [index, row] of table.rows.entries()) {
		await verifyCombinedChecksSpecificationRow(
			example,
			row,
			index,
			checkCount,
			diagnosticsByLabels,
		);
	}
}

async function verifyCombinedChecksSpecificationRow(
	example: Example,
	row: TableText[],
	index: number,
	checkCount: number,
	diagnosticsByLabels: Record<string, CombinedDiagnosticExpectation>,
): Promise<void> {
	assert.equal(row.length, checkCount * 2 + 2);
	const criteria = row.slice(0, checkCount);
	const requiredLabels = getRequiredLabels(criteria[0], "first");
	const requirements: Requirements = {};

	for (const [criterionIndex, criterion] of criteria.entries()) {
		const name = ["first", "second", "third", "fourth"][criterionIndex];
		assert(name, `Unexpected criterion index: ${criterionIndex}`);
		assert.equal(getRequiredLabels(criterion, name), requiredLabels);

		const requirement = getRequirement(criterion, name);
		assert(
			requirements[requirement] === undefined,
			`Duplicate combined-check operator: ${requirement}`,
		);
		requirements[requirement] = requiredLabels.replaceAll(", ", ",");
	}

	const labelsText = renderTableText(row[checkCount]);
	const labels = parseLabels(labelsText);
	const overallStatus = interpretOverallOutcome(row[checkCount * 2 + 1]);
	const expected = diagnosticsByLabels[labelsText];
	assert(
		expected,
		`Missing diagnostic expectations for labels "${labelsText}" in ${example.id}`,
	);

	const result = await runLabelCheck({
		pullRequestNumber: index + 1,
		labels,
		requirements,
	});

	assert.equal(result.status, overallStatus);
	assert.equal(result.stdout, expected.stdout);
	assert.equal(result.stderr, expected.stderr);
	assert.equal(result.output, expected.output);
}

function interpretOverallOutcome(outcome: TableText | undefined): 0 | 1 {
	assert(
		typeof outcome !== "string" && outcome !== undefined,
		"Expected the overall outcome to use parameterised text",
	);
	const declaredOutcome = outcome.parameters.outcome;
	assert(
		declaredOutcome === "Success" || declaredOutcome === "Failure",
		`Unexpected combined-check overall outcome: "${declaredOutcome}"`,
	);
	assert.equal(expandText(outcome), declaredOutcome);
	return interpretSuccessFailureOutcome(declaredOutcome);
}

function getRequirement(
	criterion: TableText | undefined,
	name: string,
): Requirement {
	const operator = getCriterion(criterion, name).parameters.operator;
	assert(operator, `Expected the ${name} criterion to define an operator`);
	const requirement = requirementByOperator.get(operator.toLowerCase());
	assert(
		requirement,
		`Unsupported operator "${operator}" in the ${name} criterion`,
	);
	return requirement;
}

function getRequiredLabels(
	criterion: TableText | undefined,
	name: string,
): string {
	const criterionText = getCriterion(criterion, name);
	const requiredLabels = criterionText.parameters.required;
	assert(
		requiredLabels,
		`Expected the ${name} criterion to define required labels`,
	);
	return requiredLabels;
}

function getCriterion(
	criterion: TableText | undefined,
	name: string,
): ParameterisedText {
	assert(
		typeof criterion !== "string" && criterion !== undefined,
		`Expected the ${name} criterion to use parameterised text`,
	);
	return criterion;
}

function parseLabels(labelsText: string): string[] {
	return labelsText === "(none)" ? [] : labelsText.split(", ");
}

async function verifySpecificationExample(
	example: ExampleWithDiagnostics,
): Promise<void> {
	const table = tableAt(example, 0);
	const diagnosticsByLabels = getDiagnosticExpectations(
		example,
		table.rows.map((row) => renderTableText(row[1])),
	);

	for (const [index, row] of table.rows.entries()) {
		const criterion = row[0];
		assert(
			typeof criterion !== "string",
			"Expected the criterion to use parameterised text",
		);
		const requirement = getRequirement(criterion, example.id);
		const requiredLabels = criterion.parameters.required;
		assert(requiredLabels, "Expected the criterion to define required labels");

		const labelsText = renderTableText(row[1]);
		const labels = parseLabels(labelsText);
		const outcome = renderTableText(row[2]);
		const expectedStatus = interpretSuccessFailureOutcome(outcome);
		const expected = diagnosticsByLabels[labelsText];
		assert(
			expected,
			`Missing diagnostic expectations for labels "${labelsText}" in ${example.id}`,
		);

		const result = await runLabelCheck({
			pullRequestNumber: index + 1,
			labels,
			requirements: {
				[requirement]: requiredLabels.replaceAll(", ", ","),
			},
		});

		assert.equal(result.status, expectedStatus);
		assert.equal(result.stdout, expected.stdout);
		assert.equal(result.stderr, expected.stderr);
		assert.equal(result.output, expected.output);
	}
}

function renderTableText(value: TableText): string {
	return typeof value === "string" ? value : expandText(value);
}
