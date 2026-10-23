import type { Specification } from "../shared/specification-by-example/src/specification-by-example.ts";

export const noneOfSpecification: Specification = {
	title: "Label checker",
	rules: [
		{
			definition: "A pull request must not have any of the labels specified by `none_of`.",
			examples: [
				{
					id: "none_of_major_minor_patch",
					content: [
						{
							type: "table",
							table: {
								headers: ["Criterion", "Labels on the pull request", "Outcome"],
								rows: [
									[
										{ template: "None of {required} are present.", parameters: { required: "major, minor, patch" } },
										"(none)",
										"Success",
									],
									[
										{ template: "None of {required} are present.", parameters: { required: "major, minor, patch" } },
										"minor",
										"Failure",
									],
									[
										{ template: "None of {required} are present.", parameters: { required: "major, minor, patch" } },
										"minor, patch",
										"Failure",
									],
									[
										{ template: "None of {required} are present.", parameters: { required: "major, minor, patch" } },
										"major, minor, patch",
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
