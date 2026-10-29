// biome-ignore-all lint/security/noSecrets: Prefix criteria are specification text, not secrets.

import type {
	Example,
	ParameterisedText,
	Rule,
	Specification,
} from "../shared/specification-by-example/src/specification-by-example.ts";
import { text } from "../shared/specification-by-example/src/specification-by-example.ts";

export type CombinedDiagnosticExpectation = {
	stdout: string;
	stderr: string;
	output: string;
};

type Requirement = "none" | "one" | "any" | "all";

export type ExecutableCriterion = ParameterisedText & {
	execution: {
		requirement: Requirement;
		input: string;
	};
};

type TestExecution = {
	kind: "supported" | "unsupported";
	prefixMode?: boolean;
	pullRequestNumbers?: number[];
	expectedError?: string;
};

export type ExampleWithDiagnostics = Example & {
	diagnosticsByLabels?: Record<string, CombinedDiagnosticExpectation>;
	testExecution?: TestExecution;
};

type LabelCheckerSpecification = Omit<Specification, "rules"> & {
	rules: Array<Omit<Rule, "examples"> & { examples: ExampleWithDiagnostics[] }>;
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

const combinedFailureOutcome: ParameterisedText = {
	template: "{outcome}",
	parameters: { outcome: "Failure" },
};

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
					diagnosticsByLabels: {
						"(none)": {
							stdout:
								"Checking GitHub labels ...\nLabel check successful: required none of 'major', 'minor', 'patch', and found 0.\n",
							stderr: "",
							output: "label_check=success",
						},
						minor: {
							stdout: "Checking GitHub labels ...\n",
							stderr:
								"::error:: Label check failed: required none of 'major', 'minor', 'patch', but found 1: 'minor'\n",
							output: "label_check=failure",
						},
						"minor, patch": {
							stdout: "Checking GitHub labels ...\n",
							stderr:
								"::error:: Label check failed: required none of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\n",
							output: "label_check=failure",
						},
						"major, minor, patch": {
							stdout: "Checking GitHub labels ...\n",
							stderr:
								"::error:: Label check failed: required none of 'major', 'minor', 'patch', but found 3: 'major', 'minor', 'patch'\n",
							output: "label_check=failure",
						},
					},
					content: [
						{
							type: "table",
							table: {
								headers: [
									text("Criterion"),
									text("Labels on the pull request"),
									text("Outcome"),
								],
								rows: [
									[noneOfCriterion, text("(none)"), text("Success")],
									[noneOfCriterion, text("minor"), text("Failure")],
									[noneOfCriterion, text("minor, patch"), text("Failure")],
									[
										noneOfCriterion,
										text("major, minor, patch"),
										text("Failure"),
									],
								],
							},
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
					diagnosticsByLabels: {
						"(none)": {
							stdout: "Checking GitHub labels ...\n",
							stderr:
								"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 0.\n",
							output: "label_check=failure",
						},
						minor: {
							stdout:
								"Checking GitHub labels ...\nLabel check successful: required 1 of 'major', 'minor', 'patch', and found 1: 'minor'\n",
							stderr: "",
							output: "label_check=success",
						},
						"minor, patch": {
							stdout: "Checking GitHub labels ...\n",
							stderr:
								"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\n",
							output: "label_check=failure",
						},
						"major, minor, patch": {
							stdout: "Checking GitHub labels ...\n",
							stderr:
								"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 3: 'major', 'minor', 'patch'\n",
							output: "label_check=failure",
						},
					},
					content: [
						{
							type: "table",
							table: {
								headers: [
									text("Criterion"),
									text("Labels on the pull request"),
									text("Outcome"),
								],
								rows: [
									[oneOfCriterion, text("(none)"), text("Failure")],
									[oneOfCriterion, text("minor"), text("Success")],
									[oneOfCriterion, text("minor, patch"), text("Failure")],
									[
										oneOfCriterion,
										text("major, minor, patch"),
										text("Failure"),
									],
								],
							},
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
					diagnosticsByLabels: {
						"(none)": {
							stdout: "Checking GitHub labels ...\n",
							stderr:
								"::error:: Label check failed: required all of 'major', 'minor', 'patch', but found 0.\n",
							output: "label_check=failure",
						},
						minor: {
							stdout: "Checking GitHub labels ...\n",
							stderr:
								"::error:: Label check failed: required all of 'major', 'minor', 'patch', but found 1: 'minor'\n",
							output: "label_check=failure",
						},
						"minor, patch": {
							stdout: "Checking GitHub labels ...\n",
							stderr:
								"::error:: Label check failed: required all of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\n",
							output: "label_check=failure",
						},
						"major, minor, patch": {
							stdout:
								"Checking GitHub labels ...\nLabel check successful: required all of 'major', 'minor', 'patch', and found 3: 'major', 'minor', 'patch'\n",
							stderr: "",
							output: "label_check=success",
						},
					},
					content: [
						{
							type: "table",
							table: {
								headers: [
									text("Criterion"),
									text("Labels on the pull request"),
									text("Outcome"),
								],
								rows: [
									[allOfCriterion, text("(none)"), text("Failure")],
									[allOfCriterion, text("minor"), text("Failure")],
									[allOfCriterion, text("minor, patch"), text("Failure")],
									[
										allOfCriterion,
										text("major, minor, patch"),
										text("Success"),
									],
								],
							},
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
					diagnosticsByLabels: {
						"(none)": {
							stdout: "Checking GitHub labels ...\n",
							stderr:
								"::error:: Label check failed: required any of 'major', 'minor', 'patch', but found 0.\n",
							output: "label_check=failure",
						},
						minor: {
							stdout:
								"Checking GitHub labels ...\nLabel check successful: required any of 'major', 'minor', 'patch', and found 1: 'minor'\n",
							stderr: "",
							output: "label_check=success",
						},
						"minor, patch": {
							stdout:
								"Checking GitHub labels ...\nLabel check successful: required any of 'major', 'minor', 'patch', and found 2: 'minor', 'patch'\n",
							stderr: "",
							output: "label_check=success",
						},
						"major, minor, patch": {
							stdout:
								"Checking GitHub labels ...\nLabel check successful: required any of 'major', 'minor', 'patch', and found 3: 'major', 'minor', 'patch'\n",
							stderr: "",
							output: "label_check=success",
						},
					},
					content: [
						{
							type: "table",
							table: {
								headers: [
									text("Criterion"),
									text("Labels on the pull request"),
									text("Outcome"),
								],
								rows: [
									[anyOfCriterion, text("(none)"), text("Failure")],
									[anyOfCriterion, text("minor"), text("Success")],
									[anyOfCriterion, text("minor, patch"), text("Success")],
									[
										anyOfCriterion,
										text("major, minor, patch"),
										text("Success"),
									],
								],
							},
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
						pullRequestNumbers: [1, 5, 6, 7],
					},
					diagnosticsByLabels: {
						"(none)": {
							stdout:
								"Checking GitHub labels ...\nLabel check successful: required none prefixed with 'type:', and found 0.\n",
							stderr: "",
							output: "label_check=success",
						},
						"type:fix": {
							stdout: "Checking GitHub labels ...\n",
							stderr:
								"::error:: Label check failed: required none prefixed with 'type:', but found 1: 'type:fix'\n",
							output: "label_check=failure",
						},
						"type:fix, type:feature": {
							stdout: "Checking GitHub labels ...\n",
							stderr:
								"::error:: Label check failed: required none prefixed with 'type:', but found 2: 'type:fix', 'type:feature'\n",
							output: "label_check=failure",
						},
						"type:fix, type:feature, type:documentation": {
							stdout: "Checking GitHub labels ...\n",
							stderr:
								"::error:: Label check failed: required none prefixed with 'type:', but found 3: 'type:fix', 'type:feature', 'type:documentation'\n",
							output: "label_check=failure",
						},
					},
					content: [
						{
							type: "table",
							table: {
								caption: text("**`none_of`**"),
								headers: [
									text("Criterion"),
									text("Labels on the pull request"),
									text("Outcome"),
								],
								rows: [
									[noneOfTypePrefixCriterion, text("(none)"), text("Success")],
									[
										noneOfTypePrefixCriterion,
										text("type:fix"),
										text("Failure"),
									],
									[
										noneOfTypePrefixCriterion,
										text("type:fix, type:feature"),
										text("Failure"),
									],
									[
										noneOfTypePrefixCriterion,
										text("type:fix, type:feature, type:documentation"),
										text("Failure"),
									],
								],
							},
						},
					],
				},
				{
					id: "one_of_type_prefix",
					testExecution: {
						kind: "supported",
						prefixMode: true,
						pullRequestNumbers: [1, 5, 6, 7],
					},
					diagnosticsByLabels: {
						"(none)": {
							stdout: "Checking GitHub labels ...\n",
							stderr:
								"::error:: Label check failed: required 1 prefixed with 'type:', but found 0.\n",
							output: "label_check=failure",
						},
						"type:fix": {
							stdout:
								"Checking GitHub labels ...\nLabel check successful: required 1 prefixed with 'type:', and found 1: 'type:fix'\n",
							stderr: "",
							output: "label_check=success",
						},
						"type:fix, type:feature": {
							stdout: "Checking GitHub labels ...\n",
							stderr:
								"::error:: Label check failed: required 1 prefixed with 'type:', but found 2: 'type:fix', 'type:feature'\n",
							output: "label_check=failure",
						},
						"type:fix, type:feature, type:documentation": {
							stdout: "Checking GitHub labels ...\n",
							stderr:
								"::error:: Label check failed: required 1 prefixed with 'type:', but found 3: 'type:fix', 'type:feature', 'type:documentation'\n",
							output: "label_check=failure",
						},
					},
					content: [
						{
							type: "table",
							table: {
								caption: text("**`one_of`**"),
								headers: [
									text("Criterion"),
									text("Labels on the pull request"),
									text("Outcome"),
								],
								rows: [
									[oneOfTypePrefixCriterion, text("(none)"), text("Failure")],
									[oneOfTypePrefixCriterion, text("type:fix"), text("Success")],
									[
										oneOfTypePrefixCriterion,
										text("type:fix, type:feature"),
										text("Failure"),
									],
									[
										oneOfTypePrefixCriterion,
										text("type:fix, type:feature, type:documentation"),
										text("Failure"),
									],
								],
							},
						},
					],
				},
				{
					id: "any_of_type_prefix",
					testExecution: {
						kind: "supported",
						prefixMode: true,
						pullRequestNumbers: [1, 5, 6, 7],
					},
					diagnosticsByLabels: {
						"(none)": {
							stdout: "Checking GitHub labels ...\n",
							stderr:
								"::error:: Label check failed: required any prefixed with 'type:', but found 0.\n",
							output: "label_check=failure",
						},
						"type:fix": {
							stdout:
								"Checking GitHub labels ...\nLabel check successful: required any prefixed with 'type:', and found 1: 'type:fix'\n",
							stderr: "",
							output: "label_check=success",
						},
						"type:fix, type:feature": {
							stdout:
								"Checking GitHub labels ...\nLabel check successful: required any prefixed with 'type:', and found 2: 'type:fix', 'type:feature'\n",
							stderr: "",
							output: "label_check=success",
						},
						"type:fix, type:feature, type:documentation": {
							stdout:
								"Checking GitHub labels ...\nLabel check successful: required any prefixed with 'type:', and found 3: 'type:fix', 'type:feature', 'type:documentation'\n",
							stderr: "",
							output: "label_check=success",
						},
					},
					content: [
						{
							type: "table",
							table: {
								caption: text("**`any_of`**"),
								headers: [
									text("Criterion"),
									text("Labels on the pull request"),
									text("Outcome"),
								],
								rows: [
									[anyOfPrefixCriterion, text("(none)"), text("Failure")],
									[anyOfPrefixCriterion, text("type:fix"), text("Success")],
									[
										anyOfPrefixCriterion,
										text("type:fix, type:feature"),
										text("Success"),
									],
									[
										anyOfPrefixCriterion,
										text("type:fix, type:feature, type:documentation"),
										text("Success"),
									],
								],
							},
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
							table: {
								caption: text("**`all_of`**"),
								headers: [text("Criterion"), text("Outcome")],
								rows: [[allOfPrefixCriterion, text("Error")]],
							},
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
							table: {
								headers: [text("Criterion"), text("Outcome")],
								rows: [
									[noneOfMultiplePrefixesCriterion, text("Error")],
									[oneOfMultiplePrefixesCriterion, text("Error")],
									[anyOfMultiplePrefixesCriterion, text("Error")],
									[allOfMultiplePrefixesCriterion, text("Error")],
								],
							},
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
					diagnosticsByLabels: {
						"(none)": {
							stdout:
								"Checking GitHub labels ...\nLabel check successful: required none prefixed with 'type:', and found 0.\n",
							stderr:
								"::error:: Label check failed: required 1 prefixed with 'type:', but found 0.\n",
							output: "label_check=failure",
						},
					},
					content: [
						{
							type: "table",
							table: {
								headers: [
									text("Criterion 1"),
									text("Criterion 2"),
									text("Labels on the pull request"),
									text("Criterion 1 outcome"),
									text("Criterion 2 outcome"),
									text("Overall outcome"),
								],
								rows: [
									[
										noneOfTypePrefixCriterion,
										oneOfTypePrefixCriterion,
										text("(none)"),
										text("Success"),
										text("Failure"),
										text("Failure"),
									],
								],
							},
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
					diagnosticsByLabels: {
						"(none)": {
							stdout:
								"Checking GitHub labels ...\nLabel check successful: required none of 'major', 'minor', 'patch', and found 0.\n",
							stderr:
								"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 0.\n",
							output: "label_check=failure",
						},
						minor: {
							stdout:
								"Checking GitHub labels ...\nLabel check successful: required 1 of 'major', 'minor', 'patch', and found 1: 'minor'\n",
							stderr:
								"::error:: Label check failed: required none of 'major', 'minor', 'patch', but found 1: 'minor'\n",
							output: "label_check=failure",
						},
						"minor, patch": {
							stdout: "Checking GitHub labels ...\n",
							stderr:
								"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\nLabel check failed: required none of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\n",
							output: "label_check=failure",
						},
						"major, minor, patch": {
							stdout: "Checking GitHub labels ...\n",
							stderr:
								"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 3: 'major', 'minor', 'patch'\nLabel check failed: required none of 'major', 'minor', 'patch', but found 3: 'major', 'minor', 'patch'\n",
							output: "label_check=failure",
						},
					},
					content: [
						{
							type: "table",
							table: {
								caption: text("2 checks combined:"),
								headers: [
									text("Criterion 1"),
									text("Criterion 2"),
									text("Labels on the pull request"),
									text("Criterion 1 outcome"),
									text("Criterion 2 outcome"),
									text("Overall outcome"),
								],
								rows: [
									[
										noneOfCriterion,
										oneOfCriterion,
										text("(none)"),
										text("Success"),
										text("Failure"),
										combinedFailureOutcome,
									],
									[
										noneOfCriterion,
										oneOfCriterion,
										text("minor"),
										text("Failure"),
										text("Success"),
										combinedFailureOutcome,
									],
									[
										noneOfCriterion,
										oneOfCriterion,
										text("minor, patch"),
										text("Failure"),
										text("Failure"),
										combinedFailureOutcome,
									],
									[
										noneOfCriterion,
										oneOfCriterion,
										text("major, minor, patch"),
										text("Failure"),
										text("Failure"),
										combinedFailureOutcome,
									],
								],
							},
						},
					],
				},
				{
					id: "three_checks_combined",
					testExecution: {
						kind: "supported",
					},
					diagnosticsByLabels: {
						"(none)": {
							stdout:
								"Checking GitHub labels ...\nLabel check successful: required none of 'major', 'minor', 'patch', and found 0.\n",
							stderr:
								"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 0.\nLabel check failed: required all of 'major', 'minor', 'patch', but found 0.\n",
							output: "label_check=failure",
						},
						minor: {
							stdout:
								"Checking GitHub labels ...\nLabel check successful: required 1 of 'major', 'minor', 'patch', and found 1: 'minor'\n",
							stderr:
								"::error:: Label check failed: required none of 'major', 'minor', 'patch', but found 1: 'minor'\nLabel check failed: required all of 'major', 'minor', 'patch', but found 1: 'minor'\n",
							output: "label_check=failure",
						},
						"minor, patch": {
							stdout: "Checking GitHub labels ...\n",
							stderr:
								"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\nLabel check failed: required none of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\nLabel check failed: required all of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\n",
							output: "label_check=failure",
						},
						"major, minor, patch": {
							stdout:
								"Checking GitHub labels ...\nLabel check successful: required all of 'major', 'minor', 'patch', and found 3: 'major', 'minor', 'patch'\n",
							stderr:
								"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 3: 'major', 'minor', 'patch'\nLabel check failed: required none of 'major', 'minor', 'patch', but found 3: 'major', 'minor', 'patch'\n",
							output: "label_check=failure",
						},
					},
					content: [
						{
							type: "table",
							table: {
								caption: text("3 checks combined:"),
								headers: [
									text("Criterion 1"),
									text("Criterion 2"),
									text("Criterion 3"),
									text("Labels on the pull request"),
									text("Criterion 1 outcome"),
									text("Criterion 2 outcome"),
									text("Criterion 3 outcome"),
									text("Overall outcome"),
								],
								rows: [
									[
										noneOfCriterion,
										oneOfCriterion,
										allOfCriterion,
										text("(none)"),
										text("Success"),
										text("Failure"),
										text("Failure"),
										combinedFailureOutcome,
									],
									[
										noneOfCriterion,
										oneOfCriterion,
										allOfCriterion,
										text("minor"),
										text("Failure"),
										text("Success"),
										text("Failure"),
										combinedFailureOutcome,
									],
									[
										noneOfCriterion,
										oneOfCriterion,
										allOfCriterion,
										text("minor, patch"),
										text("Failure"),
										text("Failure"),
										text("Failure"),
										combinedFailureOutcome,
									],
									[
										noneOfCriterion,
										oneOfCriterion,
										allOfCriterion,
										text("major, minor, patch"),
										text("Failure"),
										text("Failure"),
										text("Success"),
										combinedFailureOutcome,
									],
								],
							},
						},
					],
				},
				{
					id: "four_checks_combined",
					testExecution: {
						kind: "supported",
					},
					diagnosticsByLabels: {
						"(none)": {
							stdout:
								"Checking GitHub labels ...\nLabel check successful: required none of 'major', 'minor', 'patch', and found 0.\n",
							stderr:
								"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 0.\nLabel check failed: required all of 'major', 'minor', 'patch', but found 0.\nLabel check failed: required any of 'major', 'minor', 'patch', but found 0.\n",
							output: "label_check=failure",
						},
						minor: {
							stdout:
								"Checking GitHub labels ...\nLabel check successful: required 1 of 'major', 'minor', 'patch', and found 1: 'minor'\nLabel check successful: required any of 'major', 'minor', 'patch', and found 1: 'minor'\n",
							stderr:
								"::error:: Label check failed: required none of 'major', 'minor', 'patch', but found 1: 'minor'\nLabel check failed: required all of 'major', 'minor', 'patch', but found 1: 'minor'\n",
							output: "label_check=failure",
						},
						"minor, patch": {
							stdout:
								"Checking GitHub labels ...\nLabel check successful: required any of 'major', 'minor', 'patch', and found 2: 'minor', 'patch'\n",
							stderr:
								"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\nLabel check failed: required none of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\nLabel check failed: required all of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\n",
							output: "label_check=failure",
						},
						"major, minor, patch": {
							stdout:
								"Checking GitHub labels ...\nLabel check successful: required all of 'major', 'minor', 'patch', and found 3: 'major', 'minor', 'patch'\nLabel check successful: required any of 'major', 'minor', 'patch', and found 3: 'major', 'minor', 'patch'\n",
							stderr:
								"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 3: 'major', 'minor', 'patch'\nLabel check failed: required none of 'major', 'minor', 'patch', but found 3: 'major', 'minor', 'patch'\n",
							output: "label_check=failure",
						},
					},
					content: [
						{
							type: "table",
							table: {
								caption: text("4 checks combined:"),
								headers: [
									text("Criterion 1"),
									text("Criterion 2"),
									text("Criterion 3"),
									text("Criterion 4"),
									text("Labels on the pull request"),
									text("Criterion 1 outcome"),
									text("Criterion 2 outcome"),
									text("Criterion 3 outcome"),
									text("Criterion 4 outcome"),
									text("Overall outcome"),
								],
								rows: [
									[
										noneOfCriterion,
										oneOfCriterion,
										allOfCriterion,
										anyOfCriterion,
										text("(none)"),
										text("Success"),
										text("Failure"),
										text("Failure"),
										text("Failure"),
										combinedFailureOutcome,
									],
									[
										noneOfCriterion,
										oneOfCriterion,
										allOfCriterion,
										anyOfCriterion,
										text("minor"),
										text("Failure"),
										text("Success"),
										text("Failure"),
										text("Success"),
										combinedFailureOutcome,
									],
									[
										noneOfCriterion,
										oneOfCriterion,
										allOfCriterion,
										anyOfCriterion,
										text("minor, patch"),
										text("Failure"),
										text("Failure"),
										text("Failure"),
										text("Success"),
										combinedFailureOutcome,
									],
									[
										noneOfCriterion,
										oneOfCriterion,
										allOfCriterion,
										anyOfCriterion,
										text("major, minor, patch"),
										text("Failure"),
										text("Failure"),
										text("Success"),
										text("Success"),
										combinedFailureOutcome,
									],
								],
							},
						},
					],
				},
			],
		},
	],
};
