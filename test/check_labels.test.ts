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

test("combined prefix example is grouped under the combined-prefix rule", () => {
	const combinedPrefixRule = labelCheckerSpecification.rules.find(
		(rule) =>
			rule.definition ===
			"The label checker can combine multiple prefix checks.",
	);
	assert(combinedPrefixRule, "Missing the combined-prefix rule");
	assert(
		combinedPrefixRule.examples.some(
			(example) => example.id === "two_prefix_checks_combined",
		),
		"The combined-prefix example must be under the combined-prefix rule",
	);

	const combinedChecksRule = labelCheckerSpecification.rules.find(
		(rule) =>
			rule.definition ===
			"The label checker can combine multiple checks together.",
	);
	assert(combinedChecksRule, "Missing the combined-checks rule");
	assert(
		!combinedChecksRule.examples.some(
			(example) => example.id === "two_prefix_checks_combined",
		),
		"The combined-prefix example must not be under the combined-checks rule",
	);
});

test("prefix examples are grouped under the prefix-matching rule", () => {
	const prefixRule = labelCheckerSpecification.rules.find(
		(rule) =>
			rule.definition ===
			"The label checker can check for labels that start with a given prefix.",
	);
	assert(prefixRule, "Missing the prefix-matching rule");
	assert(
		prefixRule.examples.some((example) => example.id === "none_of_type_prefix"),
		"The none_of prefix example must be under the prefix-matching rule",
	);
	assert(
		prefixRule.examples.some((example) => example.id === "one_of_type_prefix"),
		"The one_of prefix example must be under the prefix-matching rule",
	);
	assert(
		prefixRule.examples.some((example) => example.id === "any_of_type_prefix"),
		"The any_of prefix example must be under the prefix-matching rule",
	);
	assert(
		!prefixRule.examples.some((example) => example.id === "all_of_type_prefix"),
		"The all_of prefix example must not be under the prefix-matching rule",
	);

	const allOfPrefixRule = labelCheckerSpecification.rules.find(
		(rule) =>
			rule.definition ===
			"The label checker does not support prefix checking with `all_of`.",
	);
	assert(allOfPrefixRule, "Missing the unsupported all_of prefix rule");
	assert(
		allOfPrefixRule.examples.some(
			(example) => example.id === "all_of_type_prefix",
		),
		"The all_of prefix example must be under the unsupported all_of prefix rule",
	);

	const onePrefixRuleIndex = labelCheckerSpecification.rules.findIndex(
		(rule) =>
			rule.definition === "Each prefix check can specify only one prefix.",
	);
	assert.equal(
		labelCheckerSpecification.rules.indexOf(allOfPrefixRule),
		labelCheckerSpecification.rules.indexOf(prefixRule) + 1,
		"The unsupported all_of prefix rule must immediately follow the prefix-matching rule",
	);
	assert.equal(
		onePrefixRuleIndex,
		labelCheckerSpecification.rules.indexOf(allOfPrefixRule) + 1,
		"The one-prefix rule must immediately follow the unsupported all_of prefix rule",
	);

	const noneOfRule = labelCheckerSpecification.rules.find(
		(rule) =>
			rule.definition ===
			"A pull request must not have any of the labels specified by `none_of`.",
	);
	assert(noneOfRule, "Missing the none_of rule");
	assert(
		!noneOfRule.examples.some(
			(example) => example.id === "none_of_type_prefix",
		),
		"The none_of prefix example must not be under the none_of rule",
	);

	const oneOfRule = labelCheckerSpecification.rules.find(
		(rule) =>
			rule.definition ===
			"A pull request must have exactly one of the labels specified by `one_of`.",
	);
	assert(oneOfRule, "Missing the one_of rule");
	assert(
		!oneOfRule.examples.some((example) => example.id === "one_of_type_prefix"),
		"The one_of prefix example must not be under the one_of rule",
	);

	const anyOfRule = labelCheckerSpecification.rules.find(
		(rule) =>
			rule.definition ===
			"A pull request must have at least one of the labels specified by `any_of`.",
	);
	assert(anyOfRule, "Missing the any_of rule");
	assert(
		!anyOfRule.examples.some((example) => example.id === "any_of_type_prefix"),
		"The any_of prefix example must not be under the any_of rule",
	);

	const allOfRule = labelCheckerSpecification.rules.find(
		(rule) =>
			rule.definition ===
			"A pull request must have all of the labels specified by `all_of`.",
	);
	assert(allOfRule, "Missing the all_of rule");
	assert(
		!allOfRule.examples.some((example) => example.id === "all_of_type_prefix"),
		"The all_of prefix example must not be under the all_of rule",
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

type Scenario = {
	name: string;
	pullRequestNumber: number;
	labels: string[];
	requirements: Requirements;
	prefixMode?: boolean;
	status: number;
	stdout: string;
	stderr: string;
	output: string;
};

const scenarios: Scenario[] = [
	{
		name: "all, got 0",
		pullRequestNumber: 1,
		labels: [],
		requirements: { all: "major,minor,patch" },
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required all of 'major', 'minor', 'patch', but found 0.\n",
		output: "label_check=failure",
	},
	{
		name: "all, got 1",
		pullRequestNumber: 2,
		labels: ["minor"],
		requirements: { all: "major,minor,patch" },
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required all of 'major', 'minor', 'patch', but found 1: 'minor'\n",
		output: "label_check=failure",
	},
	{
		name: "all, got 2",
		pullRequestNumber: 3,
		labels: ["minor", "patch"],
		requirements: { all: "major,minor,patch" },
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required all of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\n",
		output: "label_check=failure",
	},
	{
		name: "all, got 3",
		pullRequestNumber: 4,
		labels: ["major", "minor", "patch"],
		requirements: { all: "major,minor,patch" },
		status: 0,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required all of 'major', 'minor', 'patch', and found 3: 'major', 'minor', 'patch'\n",
		stderr: "",
		output: "label_check=success",
	},
	{
		name: "any, got 0",
		pullRequestNumber: 1,
		labels: [],
		requirements: { any: "major,minor,patch" },
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required any of 'major', 'minor', 'patch', but found 0.\n",
		output: "label_check=failure",
	},
	{
		name: "any, got 1",
		pullRequestNumber: 2,
		labels: ["minor"],
		requirements: { any: "major,minor,patch" },
		status: 0,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required any of 'major', 'minor', 'patch', and found 1: 'minor'\n",
		stderr: "",
		output: "label_check=success",
	},
	{
		name: "any, got 2",
		pullRequestNumber: 3,
		labels: ["minor", "patch"],
		requirements: { any: "major,minor,patch" },
		status: 0,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required any of 'major', 'minor', 'patch', and found 2: 'minor', 'patch'\n",
		stderr: "",
		output: "label_check=success",
	},
	{
		name: "any, got 3",
		pullRequestNumber: 4,
		labels: ["major", "minor", "patch"],
		requirements: { any: "major,minor,patch" },
		status: 0,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required any of 'major', 'minor', 'patch', and found 3: 'major', 'minor', 'patch'\n",
		stderr: "",
		output: "label_check=success",
	},
];

type DiagnosticExpectation = {
	status: number;
	stdout: string;
	stderr: string;
	output: string;
};

const oneOfDiagnosticExpectations: DiagnosticExpectation[] = [
	{
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 0.\n",
		output: "label_check=failure",
	},
	{
		status: 0,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required 1 of 'major', 'minor', 'patch', and found 1: 'minor'\n",
		stderr: "",
		output: "label_check=success",
	},
	{
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\n",
		output: "label_check=failure",
	},
	{
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 3: 'major', 'minor', 'patch'\n",
		output: "label_check=failure",
	},
];

const noneOfDiagnosticExpectations: DiagnosticExpectation[] = [
	{
		status: 0,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required none of 'major', 'minor', 'patch', and found 0.\n",
		stderr: "",
		output: "label_check=success",
	},
	{
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required none of 'major', 'minor', 'patch', but found 1: 'minor'\n",
		output: "label_check=failure",
	},
	{
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required none of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\n",
		output: "label_check=failure",
	},
	{
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required none of 'major', 'minor', 'patch', but found 3: 'major', 'minor', 'patch'\n",
		output: "label_check=failure",
	},
];

const noneOfTypePrefixDiagnosticExpectations: DiagnosticExpectation[] = [
	{
		status: 0,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required none prefixed with 'type:', and found 0.\n",
		stderr: "",
		output: "label_check=success",
	},
	{
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required none prefixed with 'type:', but found 1: 'type:fix'\n",
		output: "label_check=failure",
	},
	{
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required none prefixed with 'type:', but found 2: 'type:fix', 'type:feature'\n",
		output: "label_check=failure",
	},
	{
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required none prefixed with 'type:', but found 3: 'type:fix', 'type:feature', 'type:documentation'\n",
		output: "label_check=failure",
	},
];

const oneOfTypePrefixDiagnosticExpectations: DiagnosticExpectation[] = [
	{
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required 1 prefixed with 'type:', but found 0.\n",
		output: "label_check=failure",
	},
	{
		status: 0,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required 1 prefixed with 'type:', and found 1: 'type:fix'\n",
		stderr: "",
		output: "label_check=success",
	},
	{
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required 1 prefixed with 'type:', but found 2: 'type:fix', 'type:feature'\n",
		output: "label_check=failure",
	},
	{
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required 1 prefixed with 'type:', but found 3: 'type:fix', 'type:feature', 'type:documentation'\n",
		output: "label_check=failure",
	},
];

const anyOfTypePrefixDiagnosticExpectations: DiagnosticExpectation[] = [
	{
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required any prefixed with 'type:', but found 0.\n",
		output: "label_check=failure",
	},
	{
		status: 0,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required any prefixed with 'type:', and found 1: 'type:fix'\n",
		stderr: "",
		output: "label_check=success",
	},
	{
		status: 0,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required any prefixed with 'type:', and found 2: 'type:fix', 'type:feature'\n",
		stderr: "",
		output: "label_check=success",
	},
	{
		status: 0,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required any prefixed with 'type:', and found 3: 'type:fix', 'type:feature', 'type:documentation'\n",
		stderr: "",
		output: "label_check=success",
	},
];

type TypePrefixSpecificationVerification = {
	requirement: Extract<Requirement, "none" | "one" | "any">;
	criterionTemplate: string;
	diagnosticExpectations: DiagnosticExpectation[];
};

const allOfDiagnosticExpectations: DiagnosticExpectation[] = [
	{
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required all of 'major', 'minor', 'patch', but found 0.\n",
		output: "label_check=failure",
	},
	{
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required all of 'major', 'minor', 'patch', but found 1: 'minor'\n",
		output: "label_check=failure",
	},
	{
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required all of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\n",
		output: "label_check=failure",
	},
	{
		status: 0,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required all of 'major', 'minor', 'patch', and found 3: 'major', 'minor', 'patch'\n",
		stderr: "",
		output: "label_check=success",
	},
];

const anyOfDiagnosticExpectations: DiagnosticExpectation[] = [
	{
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required any of 'major', 'minor', 'patch', but found 0.\n",
		output: "label_check=failure",
	},
	{
		status: 0,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required any of 'major', 'minor', 'patch', and found 1: 'minor'\n",
		stderr: "",
		output: "label_check=success",
	},
	{
		status: 0,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required any of 'major', 'minor', 'patch', and found 2: 'minor', 'patch'\n",
		stderr: "",
		output: "label_check=success",
	},
	{
		status: 0,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required any of 'major', 'minor', 'patch', and found 3: 'major', 'minor', 'patch'\n",
		stderr: "",
		output: "label_check=success",
	},
];

const requirementByOperator = new Map<string, Requirement>([
	["none of", "none"],
	["exactly one of", "one"],
	["at least one of", "any"],
	["all of", "all"],
]);

const specificationExampleImplementations: Record<
	string,
	(example: Example) => Promise<void>
> = {
	none_of_major_minor_patch: (example: Example) =>
		verifySpecificationExample(example, "none", noneOfDiagnosticExpectations),
	none_of_type_prefix: createTypePrefixSpecificationImplementation({
		requirement: "none",
		criterionTemplate: "No labels starting with {prefix} are present.",
		diagnosticExpectations: noneOfTypePrefixDiagnosticExpectations,
	}),
	one_of_type_prefix: createTypePrefixSpecificationImplementation({
		requirement: "one",
		criterionTemplate: "Exactly one label starting with {prefix} is present.",
		diagnosticExpectations: oneOfTypePrefixDiagnosticExpectations,
	}),
	any_of_type_prefix: createTypePrefixSpecificationImplementation({
		requirement: "any",
		criterionTemplate: "At least one label starting with {prefix} is present.",
		diagnosticExpectations: anyOfTypePrefixDiagnosticExpectations,
	}),
	all_of_type_prefix: verifyAllOfTypePrefixSpecificationExample,
	multiple_prefixes_per_check:
		verifyMultiplePrefixesPerCheckSpecificationExample,
	two_prefix_checks_combined: verifyCombinedPrefixChecksSpecificationExample,
	one_of_major_minor_patch: (example: Example) =>
		verifySpecificationExample(example, "one", oneOfDiagnosticExpectations),
	all_of_major_minor_patch: (example: Example) =>
		verifySpecificationExample(example, "all", allOfDiagnosticExpectations),
	any_of_major_minor_patch: (example: Example) =>
		verifySpecificationExample(example, "any", anyOfDiagnosticExpectations),
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

function createTypePrefixSpecificationImplementation(
	verification: TypePrefixSpecificationVerification,
): (example: Example) => Promise<void> {
	return (example: Example) =>
		verifyTypePrefixSpecificationExample(example, verification);
}

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
		assert.equal(renderTableText(row[1]), "Error");

		const result = await runLabelCheck({
			pullRequestNumber: index + 1,
			labels: [],
			requirements: { [requirement]: "type:,visibility/" },
			prefixMode: true,
		});

		assert.equal(result.status, 1);
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
	example: Example,
): Promise<void> {
	const table = tableAt(example, 0);
	assert.equal(table.rows.length, 1);
	const row = table.rows[0];
	assert(row, "Missing the combined-prefix-check example row");

	const noneCriterion = getCriterion(row[0], "first");
	const oneCriterion = getCriterion(row[1], "second");
	assert.equal(
		noneCriterion.template,
		"No labels starting with {prefix} are present.",
	);
	assert.deepEqual(noneCriterion.parameters, { prefix: "type:" });
	assert.equal(
		oneCriterion.template,
		"Exactly one label starting with {prefix} is present.",
	);
	assert.deepEqual(oneCriterion.parameters, { prefix: "type:" });

	const labels = parseLabels(renderTableText(row[2]));
	const noneOutcome = renderTableText(row[3]);
	const oneOutcome = renderTableText(row[4]);
	const overallOutcome = renderTableText(row[5]);
	assert.equal(noneOutcome, "Success");
	assert.equal(oneOutcome, "Failure");
	assert.equal(overallOutcome, "Failure");

	const result = await runLabelCheck({
		pullRequestNumber: 1,
		labels,
		requirements: { none: "type:", one: "type:" },
		prefixMode: true,
	});

	assert.equal(result.status, 1);
	assert.equal(overallOutcome, "Failure");
	assert.equal(
		result.stdout,
		"Checking GitHub labels ...\nLabel check successful: required none prefixed with 'type:', and found 0.\n",
	);
	assert.equal(
		result.stderr,
		"::error:: Label check failed: required 1 prefixed with 'type:', but found 0.\n",
	);
	assert.equal(result.output, "label_check=failure");
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
	assert.equal(renderTableText(row[1]), "Error");

	const result = await runLabelCheck({
		pullRequestNumber: 1,
		labels: [],
		requirements: { all: criterion.parameters.prefix },
		prefixMode: true,
	});

	assert.equal(result.status, 1);
	assert.equal(result.stdout, "Checking GitHub labels ...\n");
	assert.equal(
		result.stderr,
		"::error:: The label checker does not support prefix checking with `all_of`, as that is not a logical combination.\n",
	);
	assert.equal(result.output, "label_check=failure");
}

async function verifyTypePrefixSpecificationExample(
	example: Example,
	verification: TypePrefixSpecificationVerification,
): Promise<void> {
	const table = tableAt(example, 1);
	assert.equal(table.rows.length, verification.diagnosticExpectations.length);
	const pullRequestNumbers = [1, 5, 6, 7];

	for (const [index, row] of table.rows.entries()) {
		const criterion = row[0];
		assert(
			typeof criterion !== "string",
			"Expected the criterion to use parameterised text",
		);
		assert.equal(criterion.template, verification.criterionTemplate);
		assert.equal(criterion.parameters.prefix, "type:");

		const labels = parseLabels(renderTableText(row[1]));
		const outcome = renderTableText(row[2]);
		const expected = verification.diagnosticExpectations[index];
		assert(expected, `Missing diagnostic expectations for row ${index + 1}`);
		const pullRequestNumber = pullRequestNumbers[index];
		assert(
			pullRequestNumber,
			`Missing pull request number for row ${index + 1}`,
		);

		const result = await runLabelCheck({
			pullRequestNumber,
			labels,
			requirements: {
				[verification.requirement]: criterion.parameters.prefix,
			},
			prefixMode: true,
		});

		assert.equal(result.status, expected.status);
		assert.equal(expected.status, outcome === "Success" ? 0 : 1);
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
	const diagnosticsByLabels = example.diagnosticsByLabels;
	assert(
		diagnosticsByLabels,
		`Missing diagnostic expectations for ${example.id}`,
	);
	assert.equal(
		expandText(textAt(example, 0)),
		`${checkCount} checks combined:`,
	);
	assert.equal(table.headers.length, checkCount * 2 + 2);
	assert.deepEqual(
		Object.keys(diagnosticsByLabels).sort(),
		table.rows.map((row) => renderTableText(row[labelsColumn])).sort(),
		"Diagnostic expectations must correspond exactly to the example's label inputs",
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

test("combined-check operators accept only canonical phrases case-insensitively", () => {
	assert.equal(
		getRequirement(
			{ template: "{operator}", parameters: { operator: "nOnE Of" } },
			"first",
		),
		"none",
	);
	assert.equal(
		getRequirement(
			{ template: "{operator}", parameters: { operator: "EXACTLY ONE OF" } },
			"second",
		),
		"one",
	);
	assert.equal(
		getRequirement(
			{ template: "{operator}", parameters: { operator: "AT LEAST ONE OF" } },
			"third",
		),
		"any",
	);
	assert.equal(
		getRequirement(
			{ template: "{operator}", parameters: { operator: "aLl Of" } },
			"fourth",
		),
		"all",
	);
	for (const operator of ["One of", "Any of", "Some of"]) {
		assert.throws(
			() =>
				getRequirement(
					{ template: "{operator}", parameters: { operator } },
					"first",
				),
			new RegExp(
				`Unsupported combined-check operator "${operator}" in the first criterion`,
			),
		);
	}
	assert.throws(
		() => getRequirement({ template: "{operator}", parameters: {} }, "first"),
		/Expected the first criterion to define an operator/,
	);
});

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
	return declaredOutcome === "Success" ? 0 : 1;
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
		`Unsupported combined-check operator "${operator}" in the ${name} criterion`,
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
	example: Example,
	requirement: "one" | "none" | "all" | "any",
	expectations: DiagnosticExpectation[],
): Promise<void> {
	const table = tableAt(example, 0);
	assert.equal(table.rows.length, expectations.length);

	for (const [index, row] of table.rows.entries()) {
		const criterion = row[0];
		assert(
			typeof criterion !== "string",
			"Expected the criterion to use parameterised text",
		);
		const requiredLabels = criterion.parameters.required;
		assert(requiredLabels, "Expected the criterion to define required labels");

		const labelsText = renderTableText(row[1]);
		const labels = labelsText === "(none)" ? [] : labelsText.split(", ");
		const outcome = renderTableText(row[2]);
		const expected = expectations[index];
		assert(expected, `Missing diagnostic expectations for row ${index + 1}`);

		const result = await runLabelCheck({
			pullRequestNumber: index + 1,
			labels,
			requirements: {
				[requirement]: requiredLabels.replaceAll(", ", ","),
			},
		});

		assert.equal(result.status, expected.status);
		assert.equal(expected.status, outcome === "Success" ? 0 : 1);
		assert.equal(result.stdout, expected.stdout);
		assert.equal(result.stderr, expected.stderr);
		assert.equal(result.output, expected.output);
	}
}

function renderTableText(value: TableText): string {
	return typeof value === "string" ? value : expandText(value);
}

for (const scenario of scenarios) {
	test(`checks labels for ${scenario.name}`, async () => {
		const result = await runLabelCheck({
			pullRequestNumber: scenario.pullRequestNumber,
			labels: scenario.labels,
			requirements: scenario.requirements,
			prefixMode: scenario.prefixMode,
		});

		assert.equal(result.status, scenario.status);
		assert.equal(result.stdout, scenario.stdout);
		assert.equal(result.stderr, scenario.stderr);
		assert.equal(result.output, scenario.output);
	});
}
