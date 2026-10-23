import type {
	ParameterisedText,
	Specification,
} from "../shared/specification-by-example/src/specification-by-example.ts";

const criterion: ParameterisedText = {
	template: "None of {required} are present.",
	parameters: { required: "major, minor, patch" },
};

export const noneOfSpecification: Specification = {
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
								headers: [
									"Criterion",
									"Labels on the pull request",
									"Outcome",
								],
								rows: [
									[criterion, "(none)", "Success"],
									[criterion, "minor", "Failure"],
									[criterion, "minor, patch", "Failure"],
									[criterion, "major, minor, patch", "Failure"],
								],
							},
						},
					],
				},
			],
		},
	],
};
