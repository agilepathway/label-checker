// biome-ignore-all lint/security/noSecrets: Prefix criteria are specification text, not secrets.

import type {
	Example,
	ParameterisedText,
	Rule,
	Specification,
} from "../shared/specification-by-example/src/specification-by-example.ts";
import { table } from "../shared/specification-by-example/src/specification-by-example.ts";

export type LabelCheckerInputsAndExpectedResults = {
	pullRequestNumber?: number;
	stdout: string;
	stderr: string;
};

type Requirement = "none" | "one" | "any" | "all";

export type ExecutableCriterion = ParameterisedText & {
	execution: {
		requirement: Requirement;
		input: string;
	};
};

export type LabelCheckerExample = Example &
	(
		| {
				testExecution: {
					kind: "supported";
					prefixMode?: boolean;
				};
				inputsAndExpectedResults: LabelCheckerInputsAndExpectedResults[];
		  }
		| {
				testExecution: {
					kind: "unsupported";
					prefixMode?: boolean;
					expectedError: string;
				};
				inputsAndExpectedResults?: never;
		  }
	);

type LabelCheckerSpecification = Omit<Specification, "rules"> & {
	rules: Array<Omit<Rule, "examples"> & { examples: LabelCheckerExample[] }>;
};

function criterion(
	template: string,
	inputValues: Record<string, string>,
	requirement: Requirement,
): ExecutableCriterion {
	const parameters = { ...inputValues };
	if (template.includes("{operator}")) {
		const operatorByRequirement: Record<Requirement, string> = Object.hasOwn(
			inputValues,
			"required",
		)
			? {
					none: "None of",
					one: "Exactly one of",
					any: "At least one of",
					all: "All of",
				}
			: {
					none: "No",
					one: "Exactly one",
					any: "At least one",
					all: "All",
				};
		parameters.operator = operatorByRequirement[requirement];
	}

	return {
		template,
		parameters,
		execution: {
			requirement,
			input: Object.values(inputValues).join(",").replaceAll(", ", ","),
		},
	};
}

const oneOfCriterion = criterion(
	"{operator} {required} is present.",
	{ required: "major, minor, patch" },
	"one",
);

const noneOfCriterion = criterion(
	"{operator} {required} are present.",
	{ required: "major, minor, patch" },
	"none",
);

const noneOfTypePrefixCriterion = criterion(
	"{operator} labels starting with {prefix} are present.",
	{ prefix: "type:" },
	"none",
);

const oneOfTypePrefixCriterion = criterion(
	"{operator} label starting with {prefix} is present.",
	{ prefix: "type:" },
	"one",
);

const anyOfPrefixCriterion = criterion(
	"{operator} label starting with {prefix} is present.",
	{ prefix: "type:" },
	"any",
);

const allOfPrefixCriterion = criterion(
	"{operator} labels start with prefix {prefix}",
	{ prefix: "type:" },
	"all",
);

const multiplePrefixes = {
	firstPrefix: "type:",
	secondPrefix: "visibility/",
};

const noneOfMultiplePrefixesCriterion = criterion(
	"{operator} labels start with prefixes `{firstPrefix}` and `{secondPrefix}`",
	multiplePrefixes,
	"none",
);

const oneOfMultiplePrefixesCriterion = criterion(
	"{operator} label starts with prefixes `{firstPrefix}` and `{secondPrefix}`",
	multiplePrefixes,
	"one",
);

const anyOfMultiplePrefixesCriterion = criterion(
	"{operator} label starts with prefixes `{firstPrefix}` and `{secondPrefix}`",
	multiplePrefixes,
	"any",
);

const allOfMultiplePrefixesCriterion = criterion(
	"{operator} labels start with prefixes `{firstPrefix}` and `{secondPrefix}`",
	multiplePrefixes,
	"all",
);

const anyOfCriterion = criterion(
	"{operator} {required} is present.",
	{ required: "major, minor, patch" },
	"any",
);

const allOfCriterion = criterion(
	"{operator} {required} are present.",
	{ required: "major, minor, patch" },
	"all",
);

const combinedFailureOutcome = "Failure";

export const labelCheckerSpecification: LabelCheckerSpecification = {
	title: "Label checker",
	rules: [
		{
			definition:
				"A pull request must not have any of the labels specified by `none_of`.",
			examples: [
				{
					id: "none_of_major_minor_patch",
					testExecution: {
						kind: "supported",
					},
					inputsAndExpectedResults: [
						{
							stdout:
								"Checking GitHub labels ...\nLabel check successful: required none of 'major', 'minor', 'patch', and found 0.\n",
							stderr: "",
						},
						{
							stdout: "Checking GitHub labels ...\n",
							stderr:
								"::error:: Label check failed: required none of 'major', 'minor', 'patch', but found 1: 'minor'\n",
						},
						{
							stdout: "Checking GitHub labels ...\n",
							stderr:
								"::error:: Label check failed: required none of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\n",
						},
						{
							stdout: "Checking GitHub labels ...\n",
							stderr:
								"::error:: Label check failed: required none of 'major', 'minor', 'patch', but found 3: 'major', 'minor', 'patch'\n",
						},
					],
					content: [
						{
							type: "table",
							table: table({
								headings: [
									"Criterion",
									"Labels on the pull request",
									"Outcome",
								],
								rows: [
									[noneOfCriterion, "(none)", "Success"],
									[noneOfCriterion, "minor", "Failure"],
									[noneOfCriterion, "minor, patch", "Failure"],
									[noneOfCriterion, "major, minor, patch", "Failure"],
								],
							}),
						},
					],
				},
			],
		},
		{
			definition:
				"A pull request must have exactly one of the labels specified by `one_of`.",
			examples: [
				{
					id: "one_of_major_minor_patch",
					testExecution: {
						kind: "supported",
					},
					inputsAndExpectedResults: [
						{
							stdout: "Checking GitHub labels ...\n",
							stderr:
								"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 0.\n",
						},
						{
							stdout:
								"Checking GitHub labels ...\nLabel check successful: required 1 of 'major', 'minor', 'patch', and found 1: 'minor'\n",
							stderr: "",
						},
						{
							stdout: "Checking GitHub labels ...\n",
							stderr:
								"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\n",
						},
						{
							stdout: "Checking GitHub labels ...\n",
							stderr:
								"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 3: 'major', 'minor', 'patch'\n",
						},
					],
					content: [
						{
							type: "table",
							table: table({
								headings: [
									"Criterion",
									"Labels on the pull request",
									"Outcome",
								],
								rows: [
									[oneOfCriterion, "(none)", "Failure"],
									[oneOfCriterion, "minor", "Success"],
									[oneOfCriterion, "minor, patch", "Failure"],
									[oneOfCriterion, "major, minor, patch", "Failure"],
								],
							}),
						},
					],
				},
			],
		},
		{
			definition:
				"A pull request must have all of the labels specified by `all_of`.",
			examples: [
				{
					id: "all_of_major_minor_patch",
					testExecution: {
						kind: "supported",
					},
					inputsAndExpectedResults: [
						{
							stdout: "Checking GitHub labels ...\n",
							stderr:
								"::error:: Label check failed: required all of 'major', 'minor', 'patch', but found 0.\n",
						},
						{
							stdout: "Checking GitHub labels ...\n",
							stderr:
								"::error:: Label check failed: required all of 'major', 'minor', 'patch', but found 1: 'minor'\n",
						},
						{
							stdout: "Checking GitHub labels ...\n",
							stderr:
								"::error:: Label check failed: required all of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\n",
						},
						{
							stdout:
								"Checking GitHub labels ...\nLabel check successful: required all of 'major', 'minor', 'patch', and found 3: 'major', 'minor', 'patch'\n",
							stderr: "",
						},
					],
					content: [
						{
							type: "table",
							table: table({
								headings: [
									"Criterion",
									"Labels on the pull request",
									"Outcome",
								],
								rows: [
									[allOfCriterion, "(none)", "Failure"],
									[allOfCriterion, "minor", "Failure"],
									[allOfCriterion, "minor, patch", "Failure"],
									[allOfCriterion, "major, minor, patch", "Success"],
								],
							}),
						},
					],
				},
			],
		},
		{
			definition:
				"A pull request must have at least one of the labels specified by `any_of`.",
			examples: [
				{
					id: "any_of_major_minor_patch",
					testExecution: {
						kind: "supported",
					},
					inputsAndExpectedResults: [
						{
							stdout: "Checking GitHub labels ...\n",
							stderr:
								"::error:: Label check failed: required any of 'major', 'minor', 'patch', but found 0.\n",
						},
						{
							stdout:
								"Checking GitHub labels ...\nLabel check successful: required any of 'major', 'minor', 'patch', and found 1: 'minor'\n",
							stderr: "",
						},
						{
							stdout:
								"Checking GitHub labels ...\nLabel check successful: required any of 'major', 'minor', 'patch', and found 2: 'minor', 'patch'\n",
							stderr: "",
						},
						{
							stdout:
								"Checking GitHub labels ...\nLabel check successful: required any of 'major', 'minor', 'patch', and found 3: 'major', 'minor', 'patch'\n",
							stderr: "",
						},
					],
					content: [
						{
							type: "table",
							table: table({
								headings: [
									"Criterion",
									"Labels on the pull request",
									"Outcome",
								],
								rows: [
									[anyOfCriterion, "(none)", "Failure"],
									[anyOfCriterion, "minor", "Success"],
									[anyOfCriterion, "minor, patch", "Success"],
									[anyOfCriterion, "major, minor, patch", "Success"],
								],
							}),
						},
					],
				},
			],
		},
		{
			definition:
				"The label checker can check for labels that start with a given prefix.",
			examples: [
				{
					id: "none_of_type_prefix",
					testExecution: {
						kind: "supported",
						prefixMode: true,
					},
					inputsAndExpectedResults: [
						{
							pullRequestNumber: 1,
							stdout:
								"Checking GitHub labels ...\nLabel check successful: required none prefixed with 'type:', and found 0.\n",
							stderr: "",
						},
						{
							pullRequestNumber: 5,
							stdout: "Checking GitHub labels ...\n",
							stderr:
								"::error:: Label check failed: required none prefixed with 'type:', but found 1: 'type:fix'\n",
						},
						{
							pullRequestNumber: 6,
							stdout: "Checking GitHub labels ...\n",
							stderr:
								"::error:: Label check failed: required none prefixed with 'type:', but found 2: 'type:fix', 'type:feature'\n",
						},
						{
							pullRequestNumber: 7,
							stdout: "Checking GitHub labels ...\n",
							stderr:
								"::error:: Label check failed: required none prefixed with 'type:', but found 3: 'type:fix', 'type:feature', 'type:documentation'\n",
						},
					],
					content: [
						{
							type: "table",
							table: table({
								caption: "**`none_of`**",
								headings: [
									"Criterion",
									"Labels on the pull request",
									"Outcome",
								],
								rows: [
									[noneOfTypePrefixCriterion, "(none)", "Success"],
									[noneOfTypePrefixCriterion, "type:fix", "Failure"],
									[
										noneOfTypePrefixCriterion,
										"type:fix, type:feature",
										"Failure",
									],
									[
										noneOfTypePrefixCriterion,
										"type:fix, type:feature, type:documentation",
										"Failure",
									],
								],
							}),
						},
					],
				},
				{
					id: "one_of_type_prefix",
					testExecution: {
						kind: "supported",
						prefixMode: true,
					},
					inputsAndExpectedResults: [
						{
							pullRequestNumber: 1,
							stdout: "Checking GitHub labels ...\n",
							stderr:
								"::error:: Label check failed: required 1 prefixed with 'type:', but found 0.\n",
						},
						{
							pullRequestNumber: 5,
							stdout:
								"Checking GitHub labels ...\nLabel check successful: required 1 prefixed with 'type:', and found 1: 'type:fix'\n",
							stderr: "",
						},
						{
							pullRequestNumber: 6,
							stdout: "Checking GitHub labels ...\n",
							stderr:
								"::error:: Label check failed: required 1 prefixed with 'type:', but found 2: 'type:fix', 'type:feature'\n",
						},
						{
							pullRequestNumber: 7,
							stdout: "Checking GitHub labels ...\n",
							stderr:
								"::error:: Label check failed: required 1 prefixed with 'type:', but found 3: 'type:fix', 'type:feature', 'type:documentation'\n",
						},
					],
					content: [
						{
							type: "table",
							table: table({
								caption: "**`one_of`**",
								headings: [
									"Criterion",
									"Labels on the pull request",
									"Outcome",
								],
								rows: [
									[oneOfTypePrefixCriterion, "(none)", "Failure"],
									[oneOfTypePrefixCriterion, "type:fix", "Success"],
									[
										oneOfTypePrefixCriterion,
										"type:fix, type:feature",
										"Failure",
									],
									[
										oneOfTypePrefixCriterion,
										"type:fix, type:feature, type:documentation",
										"Failure",
									],
								],
							}),
						},
					],
				},
				{
					id: "any_of_type_prefix",
					testExecution: {
						kind: "supported",
						prefixMode: true,
					},
					inputsAndExpectedResults: [
						{
							pullRequestNumber: 1,
							stdout: "Checking GitHub labels ...\n",
							stderr:
								"::error:: Label check failed: required any prefixed with 'type:', but found 0.\n",
						},
						{
							pullRequestNumber: 5,
							stdout:
								"Checking GitHub labels ...\nLabel check successful: required any prefixed with 'type:', and found 1: 'type:fix'\n",
							stderr: "",
						},
						{
							pullRequestNumber: 6,
							stdout:
								"Checking GitHub labels ...\nLabel check successful: required any prefixed with 'type:', and found 2: 'type:fix', 'type:feature'\n",
							stderr: "",
						},
						{
							pullRequestNumber: 7,
							stdout:
								"Checking GitHub labels ...\nLabel check successful: required any prefixed with 'type:', and found 3: 'type:fix', 'type:feature', 'type:documentation'\n",
							stderr: "",
						},
					],
					content: [
						{
							type: "table",
							table: table({
								caption: "**`any_of`**",
								headings: [
									"Criterion",
									"Labels on the pull request",
									"Outcome",
								],
								rows: [
									[anyOfPrefixCriterion, "(none)", "Failure"],
									[anyOfPrefixCriterion, "type:fix", "Success"],
									[anyOfPrefixCriterion, "type:fix, type:feature", "Success"],
									[
										anyOfPrefixCriterion,
										"type:fix, type:feature, type:documentation",
										"Success",
									],
								],
							}),
						},
					],
				},
			],
		},
		{
			definition:
				"The label checker does not support prefix checking with `all_of`.",
			examples: [
				{
					id: "all_of_type_prefix",
					testExecution: {
						kind: "unsupported",
						prefixMode: true,
						expectedError:
							"::error:: The label checker does not support prefix checking with `all_of`, as that is not a logical combination.\n",
					},
					content: [
						{
							type: "table",
							table: table({
								caption: "**`all_of`**",
								headings: ["Criterion", "Outcome"],
								rows: [[allOfPrefixCriterion, "Error"]],
							}),
						},
					],
				},
			],
		},
		{
			definition: "Each prefix check can specify only one prefix.",
			examples: [
				{
					id: "multiple_prefixes_per_check",
					testExecution: {
						kind: "unsupported",
						prefixMode: true,
						expectedError:
							"::error:: Currently the label checker only supports checking with one prefix, not multiple.\n",
					},
					content: [
						{
							type: "table",
							table: table({
								headings: ["Criterion", "Outcome"],
								rows: [
									[noneOfMultiplePrefixesCriterion, "Error"],
									[oneOfMultiplePrefixesCriterion, "Error"],
									[anyOfMultiplePrefixesCriterion, "Error"],
									[allOfMultiplePrefixesCriterion, "Error"],
								],
							}),
						},
					],
				},
			],
		},
		{
			definition: "The label checker can combine multiple prefix checks.",
			examples: [
				{
					id: "two_prefix_checks_combined",
					testExecution: {
						kind: "supported",
						prefixMode: true,
					},
					inputsAndExpectedResults: [
						{
							stdout:
								"Checking GitHub labels ...\nLabel check successful: required none prefixed with 'type:', and found 0.\n",
							stderr:
								"::error:: Label check failed: required 1 prefixed with 'type:', but found 0.\n",
						},
					],
					content: [
						{
							type: "table",
							table: table({
								headings: [
									"Criterion 1",
									"Criterion 2",
									"Labels on the pull request",
									"Criterion 1 outcome",
									"Criterion 2 outcome",
									"Overall outcome",
								],
								rows: [
									[
										noneOfTypePrefixCriterion,
										oneOfTypePrefixCriterion,
										"(none)",
										"Success",
										"Failure",
										"Failure",
									],
								],
							}),
						},
					],
				},
			],
		},
		{
			definition: "The label checker can combine multiple checks together.",
			examples: [
				{
					id: "two_checks_combined",
					testExecution: {
						kind: "supported",
					},
					inputsAndExpectedResults: [
						{
							stdout:
								"Checking GitHub labels ...\nLabel check successful: required none of 'major', 'minor', 'patch', and found 0.\n",
							stderr:
								"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 0.\n",
						},
						{
							stdout:
								"Checking GitHub labels ...\nLabel check successful: required 1 of 'major', 'minor', 'patch', and found 1: 'minor'\n",
							stderr:
								"::error:: Label check failed: required none of 'major', 'minor', 'patch', but found 1: 'minor'\n",
						},
						{
							stdout: "Checking GitHub labels ...\n",
							stderr:
								"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\nLabel check failed: required none of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\n",
						},
						{
							stdout: "Checking GitHub labels ...\n",
							stderr:
								"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 3: 'major', 'minor', 'patch'\nLabel check failed: required none of 'major', 'minor', 'patch', but found 3: 'major', 'minor', 'patch'\n",
						},
					],
					content: [
						{
							type: "table",
							table: table({
								caption: "2 checks combined:",
								headings: [
									"Criterion 1",
									"Criterion 2",
									"Labels on the pull request",
									"Criterion 1 outcome",
									"Criterion 2 outcome",
									"Overall outcome",
								],
								rows: [
									[
										noneOfCriterion,
										oneOfCriterion,
										"(none)",
										"Success",
										"Failure",
										combinedFailureOutcome,
									],
									[
										noneOfCriterion,
										oneOfCriterion,
										"minor",
										"Failure",
										"Success",
										combinedFailureOutcome,
									],
									[
										noneOfCriterion,
										oneOfCriterion,
										"minor, patch",
										"Failure",
										"Failure",
										combinedFailureOutcome,
									],
									[
										noneOfCriterion,
										oneOfCriterion,
										"major, minor, patch",
										"Failure",
										"Failure",
										combinedFailureOutcome,
									],
								],
							}),
						},
					],
				},
				{
					id: "three_checks_combined",
					testExecution: {
						kind: "supported",
					},
					inputsAndExpectedResults: [
						{
							stdout:
								"Checking GitHub labels ...\nLabel check successful: required none of 'major', 'minor', 'patch', and found 0.\n",
							stderr:
								"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 0.\nLabel check failed: required all of 'major', 'minor', 'patch', but found 0.\n",
						},
						{
							stdout:
								"Checking GitHub labels ...\nLabel check successful: required 1 of 'major', 'minor', 'patch', and found 1: 'minor'\n",
							stderr:
								"::error:: Label check failed: required none of 'major', 'minor', 'patch', but found 1: 'minor'\nLabel check failed: required all of 'major', 'minor', 'patch', but found 1: 'minor'\n",
						},
						{
							stdout: "Checking GitHub labels ...\n",
							stderr:
								"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\nLabel check failed: required none of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\nLabel check failed: required all of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\n",
						},
						{
							stdout:
								"Checking GitHub labels ...\nLabel check successful: required all of 'major', 'minor', 'patch', and found 3: 'major', 'minor', 'patch'\n",
							stderr:
								"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 3: 'major', 'minor', 'patch'\nLabel check failed: required none of 'major', 'minor', 'patch', but found 3: 'major', 'minor', 'patch'\n",
						},
					],
					content: [
						{
							type: "table",
							table: table({
								caption: "3 checks combined:",
								headings: [
									"Criterion 1",
									"Criterion 2",
									"Criterion 3",
									"Labels on the pull request",
									"Criterion 1 outcome",
									"Criterion 2 outcome",
									"Criterion 3 outcome",
									"Overall outcome",
								],
								rows: [
									[
										noneOfCriterion,
										oneOfCriterion,
										allOfCriterion,
										"(none)",
										"Success",
										"Failure",
										"Failure",
										combinedFailureOutcome,
									],
									[
										noneOfCriterion,
										oneOfCriterion,
										allOfCriterion,
										"minor",
										"Failure",
										"Success",
										"Failure",
										combinedFailureOutcome,
									],
									[
										noneOfCriterion,
										oneOfCriterion,
										allOfCriterion,
										"minor, patch",
										"Failure",
										"Failure",
										"Failure",
										combinedFailureOutcome,
									],
									[
										noneOfCriterion,
										oneOfCriterion,
										allOfCriterion,
										"major, minor, patch",
										"Failure",
										"Failure",
										"Success",
										combinedFailureOutcome,
									],
								],
							}),
						},
					],
				},
				{
					id: "four_checks_combined",
					testExecution: {
						kind: "supported",
					},
					inputsAndExpectedResults: [
						{
							stdout:
								"Checking GitHub labels ...\nLabel check successful: required none of 'major', 'minor', 'patch', and found 0.\n",
							stderr:
								"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 0.\nLabel check failed: required all of 'major', 'minor', 'patch', but found 0.\nLabel check failed: required any of 'major', 'minor', 'patch', but found 0.\n",
						},
						{
							stdout:
								"Checking GitHub labels ...\nLabel check successful: required 1 of 'major', 'minor', 'patch', and found 1: 'minor'\nLabel check successful: required any of 'major', 'minor', 'patch', and found 1: 'minor'\n",
							stderr:
								"::error:: Label check failed: required none of 'major', 'minor', 'patch', but found 1: 'minor'\nLabel check failed: required all of 'major', 'minor', 'patch', but found 1: 'minor'\n",
						},
						{
							stdout:
								"Checking GitHub labels ...\nLabel check successful: required any of 'major', 'minor', 'patch', and found 2: 'minor', 'patch'\n",
							stderr:
								"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\nLabel check failed: required none of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\nLabel check failed: required all of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\n",
						},
						{
							stdout:
								"Checking GitHub labels ...\nLabel check successful: required all of 'major', 'minor', 'patch', and found 3: 'major', 'minor', 'patch'\nLabel check successful: required any of 'major', 'minor', 'patch', and found 3: 'major', 'minor', 'patch'\n",
							stderr:
								"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 3: 'major', 'minor', 'patch'\nLabel check failed: required none of 'major', 'minor', 'patch', but found 3: 'major', 'minor', 'patch'\n",
						},
					],
					content: [
						{
							type: "table",
							table: table({
								caption: "4 checks combined:",
								headings: [
									"Criterion 1",
									"Criterion 2",
									"Criterion 3",
									"Criterion 4",
									"Labels on the pull request",
									"Criterion 1 outcome",
									"Criterion 2 outcome",
									"Criterion 3 outcome",
									"Criterion 4 outcome",
									"Overall outcome",
								],
								rows: [
									[
										noneOfCriterion,
										oneOfCriterion,
										allOfCriterion,
										anyOfCriterion,
										"(none)",
										"Success",
										"Failure",
										"Failure",
										"Failure",
										combinedFailureOutcome,
									],
									[
										noneOfCriterion,
										oneOfCriterion,
										allOfCriterion,
										anyOfCriterion,
										"minor",
										"Failure",
										"Success",
										"Failure",
										"Success",
										combinedFailureOutcome,
									],
									[
										noneOfCriterion,
										oneOfCriterion,
										allOfCriterion,
										anyOfCriterion,
										"minor, patch",
										"Failure",
										"Failure",
										"Failure",
										"Success",
										combinedFailureOutcome,
									],
									[
										noneOfCriterion,
										oneOfCriterion,
										allOfCriterion,
										anyOfCriterion,
										"major, minor, patch",
										"Failure",
										"Failure",
										"Success",
										"Success",
										combinedFailureOutcome,
									],
								],
							}),
						},
					],
				},
			],
		},
	],
};
