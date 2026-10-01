import assert from "node:assert/strict";
import { test } from "node:test";
import {
	majorLevelSemanticVersionRule,
	minorLevelSemanticVersionRule,
	missingSemanticVersionTagsRule,
	patchLevelSemanticVersionRule,
} from "./semantic-version-test-definitions.ts";

function expandDescription<T extends { description: string }>(
	example: T,
): string {
	return example.description.replace(
		/\{([^}]+)\}/g,
		(_, parameterName: string) => {
			if (!Object.hasOwn(example, parameterName)) {
				throw new Error(
					`Example description references unknown parameter: ${parameterName}`,
				);
			}

			return String(Reflect.get(example, parameterName));
		},
	);
}

test("rejects unknown Example description parameters", () => {
	assert.throws(
		() => expandDescription({ description: "A `{missing}` value" }),
		{
			message: "Example description references unknown parameter: missing",
		},
	);
});

for (const rule of [
	patchLevelSemanticVersionRule,
	minorLevelSemanticVersionRule,
	majorLevelSemanticVersionRule,
	missingSemanticVersionTagsRule,
]) {
	for (const example of rule.examples) {
		test(expandDescription(example), example.run.bind(example));
	}
}
