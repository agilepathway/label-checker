import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { renderSpecification } from "../../../../shared/specification-by-example/src/markdown-renderer.ts";
import { semanticVersionTaggingSpecification } from "./semantic-version-tagger-specification.ts";

test("published semantic-version tagging specification is up to date", async () => {
	const publishedMarkdown = await readFile(
		new URL("../spec/semantic-version-tagging.md", import.meta.url),
		"utf8",
	);
	const expectedMarkdown = renderSpecification(
		semanticVersionTaggingSpecification,
	);

	assert.equal(
		publishedMarkdown,
		expectedMarkdown,
		"Published semantic-version-tagging.md is stale. Regenerate it with:\n" +
			"node .github/actions/semantic-version-tagger/test/publish-semantic-version-tagging-spec.ts",
	);
});
