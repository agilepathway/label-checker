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

export const labelCheckerSpecification: Specification = {
	title: "Label checker",
	rules: [
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
	],
};
