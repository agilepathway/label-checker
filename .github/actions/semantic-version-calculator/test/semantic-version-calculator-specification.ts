import type {
	Rule,
	Specification,
} from "../../../../shared/specification-by-example/src/specification-by-example.ts";
import {
	example,
	table,
} from "../../../../shared/specification-by-example/src/specification-by-example.ts";

const requestedIncrementRule: Rule = {
	definition:
		"The consumer must provide exactly one semantic version increment: `major`, `minor` or `patch`. The value is case-insensitive.",
	examples: [
		example({
			id: "requested-increment-values",
			content: [
				{
					type: "table",
					table: table({
						headings: ["Input", "Outcome"],
						rows: [
							{ values: ["major", "Accepted"] },
							{ values: ["minor", "Accepted"] },
							{ values: ["patch", "Accepted"] },
							{ values: ["MAJOR", "Accepted"] },
							{ values: ["Minor", "Accepted"] },
							{ values: ["PATCH", "Accepted"] },
							{ values: ["banana", "Error"] },
							{ values: ["v-major", "Error"] },
							{ values: ["semver-minor", "Error"] },
							{ values: ["patch-version", "Error"] },
							{ values: ["Empty string", "Error"] },
							{ values: ["Missing input", "Error"] },
						],
					}),
				},
			],
		}),
	],
};

const versionTagFormatRule: Rule = {
	definition:
		"A version tag must take the form `vX.Y.Z` where X is the major version, Y is the minor version and Z is the patch version.",
	examples: [
		example({
			id: "version-tag-format",
			content: [
				{
					type: "table",
					table: table({
						headings: ["Existing tag", "Accepted?", "Notes"],
						rows: [
							{ values: ["v2.0.0", "Yes", ""] },
							{ values: ["v2.10.3", "Yes", ""] },
							{ values: ["2.0.0", "No", ""] },
							{ values: ["v02.0.0", "No", ""] },
							{ values: ["v2.00.0", "No", ""] },
							{ values: ["v2.0.03", "No", ""] },
							{ values: ["v-1.0.0", "No", ""] },
							{ values: ["v2.0", "No", ""] },
							{
								values: [
									"v2.0.0-rc.1",
									"No",
									"Pre-release versions may be considered in the future, but are not accepted now.",
								],
							},
							{
								values: [
									"v2.0.0+build.1",
									"No",
									"Build metadata may be considered in the future, but are not accepted now.",
								],
							},
						],
					}),
				},
			],
		}),
	],
};

const highestExistingSemanticVersionTagRule: Rule = {
	definition:
		"The version increment is applied against the highest valid existing semantic version tag in the repository.",
	examples: [
		example({
			id: "highest-existing-semantic-version-tag",
			content: [
				{
					type: "table",
					table: table({
						headings: [
							"Existing tags",
							"Highest existing semantic version tag",
							"Notes",
						],
						rows: [
							{ values: ["v2.0.0, v2.0.1, v2.1.0", "v2.1.0", ""] },
							{ values: ["v2.1.0, v2.0.9, v2.1.1", "v2.1.1", ""] },
							{ values: ["v3.0.0, v2.9.9, v3.0.1", "v3.0.1", ""] },
							{ values: ["v2.10.0, v2.9.0, v2.8.0", "v2.10.0", ""] },
							{
								values: [
									"v2.4.9, v2.4.10, 2.5.0",
									"v2.4.10",
									"2.5.0 is ignored because it is not a valid semantic version tag.",
								],
							},
						],
					}),
				},
			],
		}),
	],
};

const requiresExistingSemanticVersionTagRule: Rule = {
	definition:
		"At least one valid semantic version tag must exist in the repository. If none exists, calculation fails.",
	examples: [
		example({
			id: "no-existing-semantic-version-tags",
			content: [
				{
					type: "table",
					table: table({
						headings: ["Existing tags", "Outcome"],
						rows: [{ values: ["None", "Error"] }],
					}),
				},
				{
					type: "text",
					text: "This behaviour is acceptable for `label-checker`, which already has valid SemVer tags. Before making the calculator available to other repositories, we will need to amend this rule to support repositories with no existing SemVer tags. See #787.",
				},
			],
		}),
	],
};

const calculatingNextVersionRule: Rule = {
	definition:
		"The specified version component is incremented by one. When the major version is incremented, the minor and patch versions are reset to zero. When the minor version is incremented, the patch version is reset to zero.",
	examples: [
		example({
			id: "calculating-next-version",
			content: [
				{
					type: "table",
					table: table({
						headings: ["Starting version", "Increment", "Result"],
						rows: [
							{ values: ["v2.4.7", "patch", "v2.4.8"] },
							{ values: ["v2.4.7", "minor", "v2.5.0"] },
							{ values: ["v2.4.7", "major", "v3.0.0"] },
							{ values: ["v2.0.0", "patch", "v2.0.1"] },
							{ values: ["v2.0.0", "minor", "v2.1.0"] },
							{ values: ["v2.0.0", "major", "v3.0.0"] },
							{ values: ["v2.4.17", "patch", "v2.4.18"] },
							{ values: ["v2.4.17", "minor", "v2.5.0"] },
							{ values: ["v2.4.17", "major", "v3.0.0"] },
							{ values: ["v2.4.9", "patch", "v2.4.10"] },
							{ values: ["v2.4.9", "minor", "v2.5.0"] },
							{ values: ["v2.4.9", "major", "v3.0.0"] },
						],
					}),
				},
			],
		}),
	],
};

export const semanticVersionCalculationSpecification: Specification = {
	title: "Semantic Version Calculation",
	rules: [
		requestedIncrementRule,
		versionTagFormatRule,
		highestExistingSemanticVersionTagRule,
		requiresExistingSemanticVersionTagRule,
		calculatingNextVersionRule,
	],
};
