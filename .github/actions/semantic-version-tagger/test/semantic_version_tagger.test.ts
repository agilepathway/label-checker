// biome-ignore-all lint/security/noSecrets: These commit SHAs are copied verbatim from the spec.

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { renderSpecification } from "../../../../shared/specification-by-example/src/markdown-renderer.ts";
import type {
	Example,
	Table,
	TableText,
} from "../../../../shared/specification-by-example/src/specification-by-example.ts";
import {
	expandText,
	tableAt,
	textAt,
} from "../../../../shared/specification-by-example/src/specification-by-example.ts";
import { registerSpecificationTests } from "../../../../shared/specification-by-example/src/specification-test-registration.ts";
import { FakeGitHubApi } from "../../test-support/fake-github-api.ts";
import { semanticVersionTaggingSpecification } from "./semantic-version-tagger-specification.ts";

const repository = "agilepathway/semantic-version-tagger-spec";

// Register specification-driven tests.
registerSpecificationTests(
	semanticVersionTaggingSpecification,
	runTaggingExample,
);

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

test("uses plain text in specification table cells", () => {
	const cells = semanticVersionTaggingSpecification.rules.flatMap((rule) =>
		rule.examples.flatMap((example) =>
			example.content.flatMap((item) =>
				item.type === "table" ? item.table.rows.flat() : [],
			),
		),
	);

	for (const cell of cells) {
		assert.doesNotMatch(
			typeof cell === "string" ? cell : expandText(cell),
			/[`*]/,
		);
	}
});

test("prints updated tags with short commit SHAs", async () => {
	const commit = "a1b2c3d4e5f67890abcdef1234567890abcdef12";
	const fakeGitHubApi = new FakeGitHubApi(
		new Map([
			["v2", "7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b"],
			["v2.0", "7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b"],
			["latest", "7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b"],
		]),
	);
	const apiUrl = await fakeGitHubApi.start();

	try {
		const result = await runAction(apiUrl, "v2.0.1", commit);

		assert.equal(result.status, 0, result.stderr);
		assert.equal(
			result.stdout,
			[
				"Semantic-version tags:",
				"  v2.0 → a1b2c3d4...",
				"  v2 → a1b2c3d4...",
				"  latest → a1b2c3d4...",
				"  v2.0.1 → a1b2c3d4...",
				"",
			].join("\n"),
		);
	} finally {
		await fakeGitHubApi.stop();
	}
});

async function runTaggingExample(example: Example): Promise<void> {
	const table = plainTable(tableAt(example, 1));
	const fakeGitHubApi = new FakeGitHubApi(tagState(table, "Before"));
	const apiUrl = await fakeGitHubApi.start();

	try {
		const result = await runAction(
			apiUrl,
			textAt(example, 0).parameters.semanticVersion,
			textAt(example, 0).parameters.commit,
		);

		if (example.id === "rejects-existing-version-tag") {
			assert.equal(result.status, 1, result.stderr);
			assert.match(result.stderr, /The version tag v2\.0\.1 already exists\./);
		} else {
			assert.equal(result.status, 0, result.stderr);
		}

		assert.deepEqual(
			Object.fromEntries(fakeGitHubApi.tagState()),
			Object.fromEntries(tagState(table, "After")),
		);
	} finally {
		await fakeGitHubApi.stop();
	}
}

function plainTable(table: Table): Table<string> {
	const plainText = (value: TableText): string =>
		typeof value === "string" ? value : expandText(value);

	return {
		headers: table.headers.map(plainText),
		rows: table.rows.map((row) => row.map(plainText)),
	};
}

function tagState(
	table: Table<string>,
	column: "Before" | "After",
): Map<string, string> {
	const tagIndex = table.headers.indexOf("Tag");
	const valueIndex = table.headers.indexOf(column);

	return new Map(
		table.rows.flatMap((row): [string, string][] => {
			const value = row[valueIndex];
			if (value === "—") {
				return [];
			}

			return [[row[tagIndex], value]];
		}),
	);
}

function runAction(
	apiUrl: string,
	semanticVersion: string,
	commit: string,
): Promise<{ status: number | null; stdout: string; stderr: string }> {
	return new Promise((resolve, reject) => {
		const child = spawn(
			process.execPath,
			[
				"--experimental-strip-types",
				fileURLToPath(new URL("../src/index.ts", import.meta.url)),
			],
			{
				env: {
					GITHUB_REPOSITORY: repository,
					GITHUB_TOKEN: "fake-token",
					GITHUB_API_URL: apiUrl,
					"INPUT_SEMANTIC-VERSION": semanticVersion,
					INPUT_COMMIT: commit,
				},
				stdio: ["ignore", "pipe", "pipe"],
			},
		);

		let stdout = "";
		let stderr = "";

		child.stdout.on("data", (chunk) => {
			stdout += chunk;
		});

		child.stderr.on("data", (chunk) => {
			stderr += chunk;
		});

		child.on("error", reject);

		child.on("close", (status) => {
			resolve({ status, stdout, stderr });
		});
	});
}
