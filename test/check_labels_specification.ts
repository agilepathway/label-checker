// biome-ignore-all lint/security/noSecrets: Prefix criteria are specification text, not secrets.

import type {
	Example,
	HeadingInput,
	NonEmptyArray,
	ParameterisedText,
	Specification,
	Text,
} from "../shared/specification-by-example/src/specification-by-example.ts";
import {
	table,
	unpublished,
} from "../shared/specification-by-example/src/specification-by-example.ts";

export type CriterionOperator =
	| "None of"
	| "No"
	| "Exactly one of"
	| "Exactly one"
	| "At least one of"
	| "At least one"
	| "All of"
	| "All";

type ExampleInputRow = {
	readonly pullRequestNumber?: number;
	readonly values: readonly Text[];
	readonly expected: {
		stdout: string;
		stderr: string;
	};
};

const supplementaryHeadings = [
	unpublished("Pull request number"),
	unpublished("Expected stdout"),
	unpublished("Expected stderr"),
];

function executableExample({
	prefixMode = false,
	caption,
	headings,
	rows,
}: {
	prefixMode?: boolean;
	caption?: Text;
	headings: HeadingInput[];
	rows: NonEmptyArray<ExampleInputRow>;
}): Pick<Example, "content" | "associatedData"> {
	const [firstRow, ...remainingRows] = rows;
	const toTableRow = (
		{ values, expected, pullRequestNumber }: ExampleInputRow,
		index: number,
	): Text[] => [
		...values,
		String(pullRequestNumber ?? index + 1),
		expected.stdout,
		expected.stderr,
	];

	return {
		associatedData: { prefixMode },
		content: [
			{
				type: "table",
				table: table({
					...(caption === undefined ? {} : { caption }),
					headings: [...headings, ...supplementaryHeadings],
					rows: [
						toTableRow(firstRow, 0),
						...remainingRows.map((row, index) => toTableRow(row, index + 1)),
					],
				}),
			},
		],
	};
}

function criterion(
	template: string,
	inputValues: Record<string, string>,
	operator: CriterionOperator,
): ParameterisedText {
	return {
		template,
		parameters: { ...inputValues, operator },
	};
}

const oneOfCriterion = criterion(
	"{operator} {required} is present.",
	{ required: "major, minor, patch" },
	"Exactly one of",
);

const noneOfCriterion = criterion(
	"{operator} {required} are present.",
	{ required: "major, minor, patch" },
	"None of",
);

const noneOfTypePrefixCriterion = criterion(
	"{operator} labels starting with {prefix} are present.",
	{ prefix: "type:" },
	"No",
);

const oneOfTypePrefixCriterion = criterion(
	"{operator} label starting with {prefix} is present.",
	{ prefix: "type:" },
	"Exactly one",
);

const anyOfPrefixCriterion = criterion(
	"{operator} label starting with {prefix} is present.",
	{ prefix: "type:" },
	"At least one",
);

const allOfPrefixCriterion = criterion(
	"{operator} labels start with prefix {prefix}",
	{ prefix: "type:" },
	"All",
);

const multiplePrefixes = {
	firstPrefix: "type:",
	secondPrefix: "visibility/",
};

const noneOfMultiplePrefixesCriterion = criterion(
	"{operator} labels start with prefixes `{firstPrefix}` and `{secondPrefix}`",
	multiplePrefixes,
	"No",
);

const oneOfMultiplePrefixesCriterion = criterion(
	"{operator} label starts with prefixes `{firstPrefix}` and `{secondPrefix}`",
	multiplePrefixes,
	"Exactly one",
);

const anyOfMultiplePrefixesCriterion = criterion(
	"{operator} label starts with prefixes `{firstPrefix}` and `{secondPrefix}`",
	multiplePrefixes,
	"At least one",
);

const allOfMultiplePrefixesCriterion = criterion(
	"{operator} labels start with prefixes `{firstPrefix}` and `{secondPrefix}`",
	multiplePrefixes,
	"All",
);

const anyOfCriterion = criterion(
	"{operator} {required} is present.",
	{ required: "major, minor, patch" },
	"At least one of",
);

const allOfCriterion = criterion(
	"{operator} {required} are present.",
	{ required: "major, minor, patch" },
	"All of",
);

const combinedFailureOutcome = "Failure";

export const labelCheckerSpecification: Specification = {
	title: "Label checker",
	rules: [
		{
			definition:
				"A pull request must not have any of the labels specified by `none_of`.",
			examples: [
				{
					id: "none_of_major_minor_patch",
					...executableExample({
						headings: ["Criterion", "Labels on the pull request", "Outcome"],
						rows: [
							{
								values: [noneOfCriterion, "(none)", "Success"],
								expected: {
									stdout:
										"Checking GitHub labels ...\nLabel check successful: required none of 'major', 'minor', 'patch', and found 0.\n",
									stderr: "",
								},
							},
							{
								values: [noneOfCriterion, "minor", "Failure"],
								expected: {
									stdout: "Checking GitHub labels ...\n",
									stderr:
										"::error:: Label check failed: required none of 'major', 'minor', 'patch', but found 1: 'minor'\n",
								},
							},
							{
								values: [noneOfCriterion, "minor, patch", "Failure"],
								expected: {
									stdout: "Checking GitHub labels ...\n",
									stderr:
										"::error:: Label check failed: required none of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\n",
								},
							},
							{
								values: [noneOfCriterion, "major, minor, patch", "Failure"],
								expected: {
									stdout: "Checking GitHub labels ...\n",
									stderr:
										"::error:: Label check failed: required none of 'major', 'minor', 'patch', but found 3: 'major', 'minor', 'patch'\n",
								},
							},
						],
					}),
				},
			],
		},
		{
			definition:
				"A pull request must have exactly one of the labels specified by `one_of`.",
			examples: [
				{
					id: "one_of_major_minor_patch",
					...executableExample({
						headings: ["Criterion", "Labels on the pull request", "Outcome"],
						rows: [
							{
								values: [oneOfCriterion, "(none)", "Failure"],
								expected: {
									stdout: "Checking GitHub labels ...\n",
									stderr:
										"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 0.\n",
								},
							},
							{
								values: [oneOfCriterion, "minor", "Success"],
								expected: {
									stdout:
										"Checking GitHub labels ...\nLabel check successful: required 1 of 'major', 'minor', 'patch', and found 1: 'minor'\n",
									stderr: "",
								},
							},
							{
								values: [oneOfCriterion, "minor, patch", "Failure"],
								expected: {
									stdout: "Checking GitHub labels ...\n",
									stderr:
										"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\n",
								},
							},
							{
								values: [oneOfCriterion, "major, minor, patch", "Failure"],
								expected: {
									stdout: "Checking GitHub labels ...\n",
									stderr:
										"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 3: 'major', 'minor', 'patch'\n",
								},
							},
						],
					}),
				},
			],
		},
		{
			definition:
				"A pull request must have all of the labels specified by `all_of`.",
			examples: [
				{
					id: "all_of_major_minor_patch",
					...executableExample({
						headings: ["Criterion", "Labels on the pull request", "Outcome"],
						rows: [
							{
								values: [allOfCriterion, "(none)", "Failure"],
								expected: {
									stdout: "Checking GitHub labels ...\n",
									stderr:
										"::error:: Label check failed: required all of 'major', 'minor', 'patch', but found 0.\n",
								},
							},
							{
								values: [allOfCriterion, "minor", "Failure"],
								expected: {
									stdout: "Checking GitHub labels ...\n",
									stderr:
										"::error:: Label check failed: required all of 'major', 'minor', 'patch', but found 1: 'minor'\n",
								},
							},
							{
								values: [allOfCriterion, "minor, patch", "Failure"],
								expected: {
									stdout: "Checking GitHub labels ...\n",
									stderr:
										"::error:: Label check failed: required all of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\n",
								},
							},
							{
								values: [allOfCriterion, "major, minor, patch", "Success"],
								expected: {
									stdout:
										"Checking GitHub labels ...\nLabel check successful: required all of 'major', 'minor', 'patch', and found 3: 'major', 'minor', 'patch'\n",
									stderr: "",
								},
							},
						],
					}),
				},
			],
		},
		{
			definition:
				"A pull request must have at least one of the labels specified by `any_of`.",
			examples: [
				{
					id: "any_of_major_minor_patch",
					...executableExample({
						headings: ["Criterion", "Labels on the pull request", "Outcome"],
						rows: [
							{
								values: [anyOfCriterion, "(none)", "Failure"],
								expected: {
									stdout: "Checking GitHub labels ...\n",
									stderr:
										"::error:: Label check failed: required any of 'major', 'minor', 'patch', but found 0.\n",
								},
							},
							{
								values: [anyOfCriterion, "minor", "Success"],
								expected: {
									stdout:
										"Checking GitHub labels ...\nLabel check successful: required any of 'major', 'minor', 'patch', and found 1: 'minor'\n",
									stderr: "",
								},
							},
							{
								values: [anyOfCriterion, "minor, patch", "Success"],
								expected: {
									stdout:
										"Checking GitHub labels ...\nLabel check successful: required any of 'major', 'minor', 'patch', and found 2: 'minor', 'patch'\n",
									stderr: "",
								},
							},
							{
								values: [anyOfCriterion, "major, minor, patch", "Success"],
								expected: {
									stdout:
										"Checking GitHub labels ...\nLabel check successful: required any of 'major', 'minor', 'patch', and found 3: 'major', 'minor', 'patch'\n",
									stderr: "",
								},
							},
						],
					}),
				},
			],
		},
		{
			definition:
				"The label checker can check for labels that start with a given prefix.",
			examples: [
				{
					id: "none_of_type_prefix",
					...executableExample({
						prefixMode: true,
						caption: "**`none_of`**",
						headings: ["Criterion", "Labels on the pull request", "Outcome"],
						rows: [
							{
								values: [noneOfTypePrefixCriterion, "(none)", "Success"],
								expected: {
									stdout:
										"Checking GitHub labels ...\nLabel check successful: required none prefixed with 'type:', and found 0.\n",
									stderr: "",
								},
							},
							{
								pullRequestNumber: 5,
								values: [noneOfTypePrefixCriterion, "type:fix", "Failure"],
								expected: {
									stdout: "Checking GitHub labels ...\n",
									stderr:
										"::error:: Label check failed: required none prefixed with 'type:', but found 1: 'type:fix'\n",
								},
							},
							{
								pullRequestNumber: 6,
								values: [
									noneOfTypePrefixCriterion,
									"type:fix, type:feature",
									"Failure",
								],
								expected: {
									stdout: "Checking GitHub labels ...\n",
									stderr:
										"::error:: Label check failed: required none prefixed with 'type:', but found 2: 'type:fix', 'type:feature'\n",
								},
							},
							{
								pullRequestNumber: 7,
								values: [
									noneOfTypePrefixCriterion,
									"type:fix, type:feature, type:documentation",
									"Failure",
								],
								expected: {
									stdout: "Checking GitHub labels ...\n",
									stderr:
										"::error:: Label check failed: required none prefixed with 'type:', but found 3: 'type:fix', 'type:feature', 'type:documentation'\n",
								},
							},
						],
					}),
				},
				{
					id: "one_of_type_prefix",
					...executableExample({
						prefixMode: true,
						caption: "**`one_of`**",
						headings: ["Criterion", "Labels on the pull request", "Outcome"],
						rows: [
							{
								values: [oneOfTypePrefixCriterion, "(none)", "Failure"],
								expected: {
									stdout: "Checking GitHub labels ...\n",
									stderr:
										"::error:: Label check failed: required 1 prefixed with 'type:', but found 0.\n",
								},
							},
							{
								pullRequestNumber: 5,
								values: [oneOfTypePrefixCriterion, "type:fix", "Success"],
								expected: {
									stdout:
										"Checking GitHub labels ...\nLabel check successful: required 1 prefixed with 'type:', and found 1: 'type:fix'\n",
									stderr: "",
								},
							},
							{
								pullRequestNumber: 6,
								values: [
									oneOfTypePrefixCriterion,
									"type:fix, type:feature",
									"Failure",
								],
								expected: {
									stdout: "Checking GitHub labels ...\n",
									stderr:
										"::error:: Label check failed: required 1 prefixed with 'type:', but found 2: 'type:fix', 'type:feature'\n",
								},
							},
							{
								pullRequestNumber: 7,
								values: [
									oneOfTypePrefixCriterion,
									"type:fix, type:feature, type:documentation",
									"Failure",
								],
								expected: {
									stdout: "Checking GitHub labels ...\n",
									stderr:
										"::error:: Label check failed: required 1 prefixed with 'type:', but found 3: 'type:fix', 'type:feature', 'type:documentation'\n",
								},
							},
						],
					}),
				},
				{
					id: "any_of_type_prefix",
					...executableExample({
						prefixMode: true,
						caption: "**`any_of`**",
						headings: ["Criterion", "Labels on the pull request", "Outcome"],
						rows: [
							{
								values: [anyOfPrefixCriterion, "(none)", "Failure"],
								expected: {
									stdout: "Checking GitHub labels ...\n",
									stderr:
										"::error:: Label check failed: required any prefixed with 'type:', but found 0.\n",
								},
							},
							{
								pullRequestNumber: 5,
								values: [anyOfPrefixCriterion, "type:fix", "Success"],
								expected: {
									stdout:
										"Checking GitHub labels ...\nLabel check successful: required any prefixed with 'type:', and found 1: 'type:fix'\n",
									stderr: "",
								},
							},
							{
								pullRequestNumber: 6,
								values: [
									anyOfPrefixCriterion,
									"type:fix, type:feature",
									"Success",
								],
								expected: {
									stdout:
										"Checking GitHub labels ...\nLabel check successful: required any prefixed with 'type:', and found 2: 'type:fix', 'type:feature'\n",
									stderr: "",
								},
							},
							{
								pullRequestNumber: 7,
								values: [
									anyOfPrefixCriterion,
									"type:fix, type:feature, type:documentation",
									"Success",
								],
								expected: {
									stdout:
										"Checking GitHub labels ...\nLabel check successful: required any prefixed with 'type:', and found 3: 'type:fix', 'type:feature', 'type:documentation'\n",
									stderr: "",
								},
							},
						],
					}),
				},
			],
		},
		{
			definition:
				"The label checker does not support prefix checking with `all_of`.",
			examples: [
				{
					id: "all_of_type_prefix",
					...executableExample({
						prefixMode: true,
						caption: "**`all_of`**",
						headings: [
							"Criterion",
							"Outcome",
							unpublished("Labels on the pull request"),
						],
						rows: [
							{
								values: [allOfPrefixCriterion, "Error", "(none)"],
								expected: {
									stdout: "Checking GitHub labels ...\n",
									stderr:
										"::error:: The label checker does not support prefix checking with `all_of`, as that is not a logical combination.\n",
								},
							},
						],
					}),
				},
			],
		},
		{
			definition: "Each prefix check can specify only one prefix.",
			examples: [
				{
					id: "multiple_prefixes_per_check",
					...executableExample({
						prefixMode: true,
						headings: [
							"Criterion",
							"Outcome",
							unpublished("Labels on the pull request"),
						],
						rows: [
							{
								values: [noneOfMultiplePrefixesCriterion, "Error", "(none)"],
								expected: {
									stdout: "Checking GitHub labels ...\n",
									stderr:
										"::error:: Currently the label checker only supports checking with one prefix, not multiple.\n",
								},
							},
							{
								values: [oneOfMultiplePrefixesCriterion, "Error", "(none)"],
								expected: {
									stdout: "Checking GitHub labels ...\n",
									stderr:
										"::error:: Currently the label checker only supports checking with one prefix, not multiple.\n",
								},
							},
							{
								values: [anyOfMultiplePrefixesCriterion, "Error", "(none)"],
								expected: {
									stdout: "Checking GitHub labels ...\n",
									stderr:
										"::error:: Currently the label checker only supports checking with one prefix, not multiple.\n",
								},
							},
							{
								values: [allOfMultiplePrefixesCriterion, "Error", "(none)"],
								expected: {
									stdout: "Checking GitHub labels ...\n",
									stderr:
										"::error:: Currently the label checker only supports checking with one prefix, not multiple.\n",
								},
							},
						],
					}),
				},
			],
		},
		{
			definition: "The label checker can combine multiple prefix checks.",
			examples: [
				{
					id: "two_prefix_checks_combined",
					...executableExample({
						prefixMode: true,
						headings: [
							"Criterion 1",
							"Criterion 2",
							"Labels on the pull request",
							"Criterion 1 outcome",
							"Criterion 2 outcome",
							"Overall outcome",
						],
						rows: [
							{
								values: [
									noneOfTypePrefixCriterion,
									oneOfTypePrefixCriterion,
									"(none)",
									"Success",
									"Failure",
									"Failure",
								],
								expected: {
									stdout:
										"Checking GitHub labels ...\nLabel check successful: required none prefixed with 'type:', and found 0.\n",
									stderr:
										"::error:: Label check failed: required 1 prefixed with 'type:', but found 0.\n",
								},
							},
						],
					}),
				},
			],
		},
		{
			definition: "The label checker can combine multiple checks together.",
			examples: [
				{
					id: "two_checks_combined",
					...executableExample({
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
							{
								values: [
									noneOfCriterion,
									oneOfCriterion,
									"(none)",
									"Success",
									"Failure",
									combinedFailureOutcome,
								],
								expected: {
									stdout:
										"Checking GitHub labels ...\nLabel check successful: required none of 'major', 'minor', 'patch', and found 0.\n",
									stderr:
										"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 0.\n",
								},
							},
							{
								values: [
									noneOfCriterion,
									oneOfCriterion,
									"minor",
									"Failure",
									"Success",
									combinedFailureOutcome,
								],
								expected: {
									stdout:
										"Checking GitHub labels ...\nLabel check successful: required 1 of 'major', 'minor', 'patch', and found 1: 'minor'\n",
									stderr:
										"::error:: Label check failed: required none of 'major', 'minor', 'patch', but found 1: 'minor'\n",
								},
							},
							{
								values: [
									noneOfCriterion,
									oneOfCriterion,
									"minor, patch",
									"Failure",
									"Failure",
									combinedFailureOutcome,
								],
								expected: {
									stdout: "Checking GitHub labels ...\n",
									stderr:
										"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\nLabel check failed: required none of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\n",
								},
							},
							{
								values: [
									noneOfCriterion,
									oneOfCriterion,
									"major, minor, patch",
									"Failure",
									"Failure",
									combinedFailureOutcome,
								],
								expected: {
									stdout: "Checking GitHub labels ...\n",
									stderr:
										"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 3: 'major', 'minor', 'patch'\nLabel check failed: required none of 'major', 'minor', 'patch', but found 3: 'major', 'minor', 'patch'\n",
								},
							},
						],
					}),
				},
				{
					id: "three_checks_combined",
					...executableExample({
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
							{
								values: [
									noneOfCriterion,
									oneOfCriterion,
									allOfCriterion,
									"(none)",
									"Success",
									"Failure",
									"Failure",
									combinedFailureOutcome,
								],
								expected: {
									stdout:
										"Checking GitHub labels ...\nLabel check successful: required none of 'major', 'minor', 'patch', and found 0.\n",
									stderr:
										"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 0.\nLabel check failed: required all of 'major', 'minor', 'patch', but found 0.\n",
								},
							},
							{
								values: [
									noneOfCriterion,
									oneOfCriterion,
									allOfCriterion,
									"minor",
									"Failure",
									"Success",
									"Failure",
									combinedFailureOutcome,
								],
								expected: {
									stdout:
										"Checking GitHub labels ...\nLabel check successful: required 1 of 'major', 'minor', 'patch', and found 1: 'minor'\n",
									stderr:
										"::error:: Label check failed: required none of 'major', 'minor', 'patch', but found 1: 'minor'\nLabel check failed: required all of 'major', 'minor', 'patch', but found 1: 'minor'\n",
								},
							},
							{
								values: [
									noneOfCriterion,
									oneOfCriterion,
									allOfCriterion,
									"minor, patch",
									"Failure",
									"Failure",
									"Failure",
									combinedFailureOutcome,
								],
								expected: {
									stdout: "Checking GitHub labels ...\n",
									stderr:
										"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\nLabel check failed: required none of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\nLabel check failed: required all of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\n",
								},
							},
							{
								values: [
									noneOfCriterion,
									oneOfCriterion,
									allOfCriterion,
									"major, minor, patch",
									"Failure",
									"Failure",
									"Success",
									combinedFailureOutcome,
								],
								expected: {
									stdout:
										"Checking GitHub labels ...\nLabel check successful: required all of 'major', 'minor', 'patch', and found 3: 'major', 'minor', 'patch'\n",
									stderr:
										"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 3: 'major', 'minor', 'patch'\nLabel check failed: required none of 'major', 'minor', 'patch', but found 3: 'major', 'minor', 'patch'\n",
								},
							},
						],
					}),
				},
				{
					id: "four_checks_combined",
					...executableExample({
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
							{
								values: [
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
								expected: {
									stdout:
										"Checking GitHub labels ...\nLabel check successful: required none of 'major', 'minor', 'patch', and found 0.\n",
									stderr:
										"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 0.\nLabel check failed: required all of 'major', 'minor', 'patch', but found 0.\nLabel check failed: required any of 'major', 'minor', 'patch', but found 0.\n",
								},
							},
							{
								values: [
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
								expected: {
									stdout:
										"Checking GitHub labels ...\nLabel check successful: required 1 of 'major', 'minor', 'patch', and found 1: 'minor'\nLabel check successful: required any of 'major', 'minor', 'patch', and found 1: 'minor'\n",
									stderr:
										"::error:: Label check failed: required none of 'major', 'minor', 'patch', but found 1: 'minor'\nLabel check failed: required all of 'major', 'minor', 'patch', but found 1: 'minor'\n",
								},
							},
							{
								values: [
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
								expected: {
									stdout:
										"Checking GitHub labels ...\nLabel check successful: required any of 'major', 'minor', 'patch', and found 2: 'minor', 'patch'\n",
									stderr:
										"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\nLabel check failed: required none of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\nLabel check failed: required all of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\n",
								},
							},
							{
								values: [
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
								expected: {
									stdout:
										"Checking GitHub labels ...\nLabel check successful: required all of 'major', 'minor', 'patch', and found 3: 'major', 'minor', 'patch'\nLabel check successful: required any of 'major', 'minor', 'patch', and found 3: 'major', 'minor', 'patch'\n",
									stderr:
										"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 3: 'major', 'minor', 'patch'\nLabel check failed: required none of 'major', 'minor', 'patch', but found 3: 'major', 'minor', 'patch'\n",
								},
							},
						],
					}),
				},
			],
		},
	],
};
