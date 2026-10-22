import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { renderSpecification } from "../../../../shared/specification-by-example/src/markdown-renderer.ts";
import { semanticVersionCalculationSpecification } from "./semantic-version-calculator-specification.ts";

test("published semantic-version calculation specification is up to date", async () => {
	const publishedMarkdown = await readFile(
		new URL("../spec/semantic-version-calculation.md", import.meta.url),
		"utf8",
	);
	const expectedMarkdown = renderSpecification(
		semanticVersionCalculationSpecification,
	);

	assert.equal(
		publishedMarkdown,
		expectedMarkdown,
		"Published semantic-version-calculation.md is stale. Regenerate it with:\n" +
			"node .github/actions/semantic-version-calculator/test/publish-semantic-version-calculation-spec.ts",
	);
});
