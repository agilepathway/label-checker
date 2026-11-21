// biome-ignore-all lint/security/noSecrets: Prefix criteria are specification text, not secrets.

import type {
	Example,
	NonEmptyArray,
	ParameterisedText,
	Row,
	Rule,
	Specification,
	Table,
	Text,
} from "../shared/specification-by-example/src/specification-by-example.ts";
import { table } from "../shared/specification-by-example/src/specification-by-example.ts";

export type LabelCheckerInputsAndExpectedResults = {
	pullRequestNumber?: number;
	stdout: string;
	stderr: string;
};

type Requirement = "none" | "one" | "any" | "all";

export type ExecutableCriterion = ParameterisedText & {
	readonly execution: {
		readonly requirement: Requirement;
		readonly input: string;
	};
};

export type LabelCheckerExample = Example &
	(
		| {
				testExecution: SupportedTestExecution;
				supportedRows: SupportedExampleRow[];
		  }
		| {
				testExecution: {
					kind: "unsupported";
					prefixMode?: boolean;
					expectedError: string;
				};
				supportedRows?: never;
		  }
	);

type LabelCheckerSpecification = Omit<Specification, "rules"> & {
	rules: Array<Omit<Rule, "examples"> & { examples: LabelCheckerExample[] }>;
};

type SupportedTestExecution = {
	kind: "supported";
	prefixMode?: boolean;
};

type SupportedExampleRow = {
	readonly row: Row;
	readonly expected: LabelCheckerInputsAndExpectedResults;
};

type SupportedExampleInputRow = {
	readonly values: readonly Text[];
	readonly expected: LabelCheckerInputsAndExpectedResults;
};

function supportedExample({
	testExecution,
	caption,
	headings,
	rows,
}: {
	testExecution: SupportedTestExecution;
	caption?: Text;
	headings: Text[];
	rows: NonEmptyArray<SupportedExampleInputRow>;
}): {
	testExecution: SupportedTestExecution;
	supportedRows: SupportedExampleRow[];
	content: [{ type: "table"; table: Table }];
} {
	const [firstRow, ...remainingRows] = rows;
	if (firstRow === undefined) {
		throw new Error("A supported example must have at least one row.");
	}

	const specificationTable = table({
		...(caption === undefined ? {} : { caption }),
		headings,
		rows: [
			[...firstRow.values],
			...remainingRows.map(({ values }) => [...values]),
		],
	});
	const supportedRows = rows.map((supportedRow, index) => {
		const row = specificationTable.rows[index];
		if (row === undefined)
			throw new Error(`Missing constructed table row ${index + 1}.`);
		return { row, expected: supportedRow.expected };
	});
	return {
		testExecution,
		supportedRows,
		content: [{ type: "table", table: specificationTable }],
	};
}

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
					...supportedExample({
						testExecution: {
							kind: "supported",
						},
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
					...supportedExample({
						testExecution: {
							kind: "supported",
						},
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
					...supportedExample({
						testExecution: {
							kind: "supported",
						},
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
					...supportedExample({
						testExecution: {
							kind: "supported",
						},
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
					...supportedExample({
						testExecution: {
							kind: "supported",
							prefixMode: true,
						},
						caption: "**`none_of`**",
						headings: ["Criterion", "Labels on the pull request", "Outcome"],
						rows: [
							{
								values: [noneOfTypePrefixCriterion, "(none)", "Success"],
								expected: {
									pullRequestNumber: 1,
									stdout:
										"Checking GitHub labels ...\nLabel check successful: required none prefixed with 'type:', and found 0.\n",
									stderr: "",
								},
							},
							{
								values: [noneOfTypePrefixCriterion, "type:fix", "Failure"],
								expected: {
									pullRequestNumber: 5,
									stdout: "Checking GitHub labels ...\n",
									stderr:
										"::error:: Label check failed: required none prefixed with 'type:', but found 1: 'type:fix'\n",
								},
							},
							{
								values: [
									noneOfTypePrefixCriterion,
									"type:fix, type:feature",
									"Failure",
								],
								expected: {
									pullRequestNumber: 6,
									stdout: "Checking GitHub labels ...\n",
									stderr:
										"::error:: Label check failed: required none prefixed with 'type:', but found 2: 'type:fix', 'type:feature'\n",
								},
							},
							{
								values: [
									noneOfTypePrefixCriterion,
									"type:fix, type:feature, type:documentation",
									"Failure",
								],
								expected: {
									pullRequestNumber: 7,
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
					...supportedExample({
						testExecution: {
							kind: "supported",
							prefixMode: true,
						},
						caption: "**`one_of`**",
						headings: ["Criterion", "Labels on the pull request", "Outcome"],
						rows: [
							{
								values: [oneOfTypePrefixCriterion, "(none)", "Failure"],
								expected: {
									pullRequestNumber: 1,
									stdout: "Checking GitHub labels ...\n",
									stderr:
										"::error:: Label check failed: required 1 prefixed with 'type:', but found 0.\n",
								},
							},
							{
								values: [oneOfTypePrefixCriterion, "type:fix", "Success"],
								expected: {
									pullRequestNumber: 5,
									stdout:
										"Checking GitHub labels ...\nLabel check successful: required 1 prefixed with 'type:', and found 1: 'type:fix'\n",
									stderr: "",
								},
							},
							{
								values: [
									oneOfTypePrefixCriterion,
									"type:fix, type:feature",
									"Failure",
								],
								expected: {
									pullRequestNumber: 6,
									stdout: "Checking GitHub labels ...\n",
									stderr:
										"::error:: Label check failed: required 1 prefixed with 'type:', but found 2: 'type:fix', 'type:feature'\n",
								},
							},
							{
								values: [
									oneOfTypePrefixCriterion,
									"type:fix, type:feature, type:documentation",
									"Failure",
								],
								expected: {
									pullRequestNumber: 7,
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
					...supportedExample({
						testExecution: {
							kind: "supported",
							prefixMode: true,
						},
						caption: "**`any_of`**",
						headings: ["Criterion", "Labels on the pull request", "Outcome"],
						rows: [
							{
								values: [anyOfPrefixCriterion, "(none)", "Failure"],
								expected: {
									pullRequestNumber: 1,
									stdout: "Checking GitHub labels ...\n",
									stderr:
										"::error:: Label check failed: required any prefixed with 'type:', but found 0.\n",
								},
							},
							{
								values: [anyOfPrefixCriterion, "type:fix", "Success"],
								expected: {
									pullRequestNumber: 5,
									stdout:
										"Checking GitHub labels ...\nLabel check successful: required any prefixed with 'type:', and found 1: 'type:fix'\n",
									stderr: "",
								},
							},
							{
								values: [
									anyOfPrefixCriterion,
									"type:fix, type:feature",
									"Success",
								],
								expected: {
									pullRequestNumber: 6,
									stdout:
										"Checking GitHub labels ...\nLabel check successful: required any prefixed with 'type:', and found 2: 'type:fix', 'type:feature'\n",
									stderr: "",
								},
							},
							{
								values: [
									anyOfPrefixCriterion,
									"type:fix, type:feature, type:documentation",
									"Success",
								],
								expected: {
									pullRequestNumber: 7,
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
					...supportedExample({
						testExecution: {
							kind: "supported",
							prefixMode: true,
						},
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
					...supportedExample({
						testExecution: {
							kind: "supported",
						},
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
					...supportedExample({
						testExecution: {
							kind: "supported",
						},
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
					...supportedExample({
						testExecution: {
							kind: "supported",
						},
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
