import { test } from "node:test";
import {
	majorLevelSemanticVersionRule,
	minorLevelSemanticVersionRule,
	missingSemanticVersionTagsRule,
	patchLevelSemanticVersionRule,
} from "./semantic-version-test-definitions.ts";

for (const rule of [
	patchLevelSemanticVersionRule,
	minorLevelSemanticVersionRule,
	majorLevelSemanticVersionRule,
	missingSemanticVersionTagsRule,
]) {
	for (const example of rule.examples) {
		test(example.description, example.run.bind(example));
	}
}
