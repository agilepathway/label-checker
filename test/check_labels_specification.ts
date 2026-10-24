// biome-ignore-all lint/security/noSecrets: Prefix criteria are specification text, not secrets.

import type {
	ParameterisedText,
	Specification,
} from "../shared/specification-by-example/src/specification-by-example.ts";

const oneOfCriterion: ParameterisedText = {
	template: "Exactly one of {required} is present.",
	parameters: { required: "major, minor, patch" },
};

const noneOfCriterion: ParameterisedText = {
	template: "None of {required} are present.",
	parameters: { required: "major, minor, patch" },
};

const noneOfPrefixCriterion: ParameterisedText = {
	template: "No labels starting with {prefix} are present.",
	parameters: { prefix: "type:" },
};

const oneOfPrefixCriterion: ParameterisedText = {
	template: "Exactly one label starting with {prefix} is present.",
	parameters: { prefix: "type:" },
};

const anyOfPrefixCriterion: ParameterisedText = {
	template: "At least one label starting with {prefix} is present.",
	parameters: { prefix: "type:" },
};

const allOfPrefixCriterion: ParameterisedText = {
	template: "All labels start with prefix {prefix}",
	parameters: { prefix: "type:" },
};

const multiplePrefixes = {
	firstPrefix: "type:",
	secondPrefix: "visibility/",
};

const noneOfMultiplePrefixesCriterion: ParameterisedText = {
	template:
		"No labels start with prefixes `{firstPrefix}` and `{secondPrefix}`",
	parameters: multiplePrefixes,
};

const oneOfMultiplePrefixesCriterion: ParameterisedText = {
	template:
		"Exactly one label starts with prefixes `{firstPrefix}` and `{secondPrefix}`",
	parameters: multiplePrefixes,
};

const anyOfMultiplePrefixesCriterion: ParameterisedText = {
	template:
		"At least one label starts with prefixes `{firstPrefix}` and `{secondPrefix}`",
	parameters: multiplePrefixes,
};

const allOfMultiplePrefixesCriterion: ParameterisedText = {
	template:
		"All labels start with prefixes `{firstPrefix}` and `{secondPrefix}`",
	parameters: multiplePrefixes,
};

const anyOfCriterion: ParameterisedText = {
	template: "At least one of {required} is present.",
	parameters: { required: "major, minor, patch" },
};

const allOfCriterion: ParameterisedText = {
	template: "All of {required} are present.",
	parameters: { required: "major, minor, patch" },
};

export const labelCheckerSpecification: Specification = {
	title: "Label checker",
	rules: [
		{
			definition:
				"A pull request must not have any of the labels specified by `none_of`.",
			examples: [
				{
					id: "none_of_major_minor_patch",
					content: [
						{
							type: "table",
							table: {
								headers: ["Criterion", "Labels on the pull request", "Outcome"],
								rows: [
									[noneOfCriterion, "(none)", "Success"],
									[noneOfCriterion, "minor", "Failure"],
									[noneOfCriterion, "minor, patch", "Failure"],
									[noneOfCriterion, "major, minor, patch", "Failure"],
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
					content: [
						{
							type: "table",
							table: {
								headers: ["Criterion", "Labels on the pull request", "Outcome"],
								rows: [
									[oneOfCriterion, "(none)", "Failure"],
									[oneOfCriterion, "minor", "Success"],
									[oneOfCriterion, "minor, patch", "Failure"],
									[oneOfCriterion, "major, minor, patch", "Failure"],
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
					content: [
						{
							type: "table",
							table: {
								headers: ["Criterion", "Labels on the pull request", "Outcome"],
								rows: [
									[allOfCriterion, "(none)", "Failure"],
									[allOfCriterion, "minor", "Failure"],
									[allOfCriterion, "minor, patch", "Failure"],
									[allOfCriterion, "major, minor, patch", "Success"],
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
					content: [
						{
							type: "table",
							table: {
								headers: ["Criterion", "Labels on the pull request", "Outcome"],
								rows: [
									[anyOfCriterion, "(none)", "Failure"],
									[anyOfCriterion, "minor", "Success"],
									[anyOfCriterion, "minor, patch", "Success"],
									[anyOfCriterion, "major, minor, patch", "Success"],
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
					content: [
						{
							type: "text",
							text: {
								template: "**`none_of`**",
								parameters: {},
							},
						},
						{
							type: "table",
							table: {
								headers: ["Criterion", "Labels on the pull request", "Outcome"],
								rows: [
									[noneOfPrefixCriterion, "(none)", "Success"],
									[noneOfPrefixCriterion, "type:fix", "Failure"],
									[noneOfPrefixCriterion, "type:fix, type:feature", "Failure"],
									[
										noneOfPrefixCriterion,
										"type:fix, type:feature, type:documentation",
										"Failure",
									],
								],
							},
						},
					],
				},
				{
					id: "one_of_type_prefix",
					content: [
						{
							type: "text",
							text: {
								template: "**`one_of`**",
								parameters: {},
							},
						},
						{
							type: "table",
							table: {
								headers: ["Criterion", "Labels on the pull request", "Outcome"],
								rows: [
									[oneOfPrefixCriterion, "(none)", "Failure"],
									[oneOfPrefixCriterion, "type:fix", "Success"],
									[oneOfPrefixCriterion, "type:fix, type:feature", "Failure"],
									[
										oneOfPrefixCriterion,
										"type:fix, type:feature, type:documentation",
										"Failure",
									],
								],
							},
						},
					],
				},
				{
					id: "any_of_type_prefix",
					content: [
						{
							type: "text",
							text: {
								template: "**`any_of`**",
								parameters: {},
							},
						},
						{
							type: "table",
							table: {
								headers: ["Criterion", "Labels on the pull request", "Outcome"],
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
					content: [
						{
							type: "text",
							text: {
								template: "**`all_of`**",
								parameters: {},
							},
						},
						{
							type: "table",
							table: {
								headers: ["Criterion", "Outcome"],
								rows: [[allOfPrefixCriterion, "Error"]],
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
					content: [
						{
							type: "table",
							table: {
								headers: ["Criterion", "Outcome"],
								rows: [
									[noneOfMultiplePrefixesCriterion, "Error"],
									[oneOfMultiplePrefixesCriterion, "Error"],
									[anyOfMultiplePrefixesCriterion, "Error"],
									[allOfMultiplePrefixesCriterion, "Error"],
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
					content: [
						{
							type: "table",
							table: {
								headers: [
									"Criterion 1",
									"Criterion 2",
									"Labels on the pull request",
									"Criterion 1 outcome",
									"Criterion 2 outcome",
									"Overall outcome",
								],
								rows: [
									[
										noneOfPrefixCriterion,
										oneOfPrefixCriterion,
										"(none)",
										"Success",
										"Failure",
										"Failure",
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
					content: [
						{
							type: "text",
							text: {
								template: "2 checks combined:",
								parameters: {},
							},
						},
						{
							type: "table",
							table: {
								headers: [
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
										"Failure",
									],
									[
										noneOfCriterion,
										oneOfCriterion,
										"minor",
										"Failure",
										"Success",
										"Failure",
									],
									[
										noneOfCriterion,
										oneOfCriterion,
										"minor, patch",
										"Failure",
										"Failure",
										"Failure",
									],
									[
										noneOfCriterion,
										oneOfCriterion,
										"major, minor, patch",
										"Failure",
										"Failure",
										"Failure",
									],
								],
							},
						},
					],
				},
				{
					id: "three_checks_combined",
					content: [
						{
							type: "text",
							text: {
								template: "3 checks combined:",
								parameters: {},
							},
						},
						{
							type: "table",
							table: {
								headers: [
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
										"Failure",
									],
									[
										noneOfCriterion,
										oneOfCriterion,
										allOfCriterion,
										"minor",
										"Failure",
										"Success",
										"Failure",
										"Failure",
									],
									[
										noneOfCriterion,
										oneOfCriterion,
										allOfCriterion,
										"minor, patch",
										"Failure",
										"Failure",
										"Failure",
										"Failure",
									],
									[
										noneOfCriterion,
										oneOfCriterion,
										allOfCriterion,
										"major, minor, patch",
										"Failure",
										"Failure",
										"Success",
										"Failure",
									],
								],
							},
						},
					],
				},
				{
					id: "four_checks_combined",
					content: [
						{
							type: "text",
							text: {
								template: "4 checks combined:",
								parameters: {},
							},
						},
						{
							type: "table",
							table: {
								headers: [
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
										"Failure",
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
										"Failure",
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
										"Failure",
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
										"Failure",
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
