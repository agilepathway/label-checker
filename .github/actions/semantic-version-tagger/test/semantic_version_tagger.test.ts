import { test } from "node:test";
import {
	majorLevelSemanticVersionTest,
	minorLevelSemanticVersionTest,
	patchLevelSemanticVersionTest,
} from "./semantic-version-test-definitions.ts";

test("patch-level semantic version", patchLevelSemanticVersionTest.run);
test("minor-level semantic version", minorLevelSemanticVersionTest.run);
test("major-level semantic version", majorLevelSemanticVersionTest.run);
