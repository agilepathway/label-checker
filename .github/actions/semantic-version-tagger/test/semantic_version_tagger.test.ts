import { test } from "node:test";
import {
	adoptingLatestTagTest,
	firstSemanticVersionTest,
	majorLevelSemanticVersionTest,
	minorLevelSemanticVersionTest,
	missingMajorMinorAndLatestTagsTest,
	patchLevelSemanticVersionTest,
} from "./semantic-version-test-definitions.ts";

test("patch-level semantic version", patchLevelSemanticVersionTest.run);
test("minor-level semantic version", minorLevelSemanticVersionTest.run);
test("major-level semantic version", majorLevelSemanticVersionTest.run);
test(
	"missing major, minor, and latest tags",
	missingMajorMinorAndLatestTagsTest.run,
);
test("first semantic version", firstSemanticVersionTest.run);
test("adopting latest tag", adoptingLatestTagTest.run);
