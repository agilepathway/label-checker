import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
} from "../../../../shared/specification-by-example/src/specification-by-example.ts";
import { registerSpecificationTests } from "../../../../shared/specification-by-example/src/specification-test-registration.ts";
import { FakeGitHubApi } from "../../test-support/fake-github-api.ts";
import { semanticVersionCalculationSpecification } from "./semantic-version-calculator-specification.ts";

const repository = "agilepathway/semantic-version-calculator-spec";

registerSpecificationTests(
	semanticVersionCalculationSpecification,
	runCalculatorExample,
);

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

test("retrieves tags across GitHub API pages", async () => {
	const tags = new Map<string, string>(
		Array.from({ length: 100 }, (_, index): [string, string] => [
			`unrelated-${index}`,
			`commit-${index}`,
		]),
	);
	tags.set("v9.0.0", "latest-version-commit");

	const result = await runAction(tags, "patch");

	assert.equal(result.status, 0, result.stderr);
	assert.equal(result.output, "new-semantic-version=v9.0.1\n");
});

async function runCalculatorExample(example: Example): Promise<void> {
	switch (example.id) {
		case "requested-increment-values":
			await testRequestedIncrements(plainTable(tableAt(example, 0)));
			return;
		case "version-tag-format": {
			const tagFormats = plainTable(tableAt(example, 0));
			await testTagFormats(tagFormats);
			await testRejectedTagFormats(tagFormats);
			await testAllInvalidTags(tagFormats);
			return;
		}
		case "highest-existing-semantic-version-tag":
			await testHighestTags(plainTable(tableAt(example, 0)));
			return;
		case "no-existing-semantic-version-tags":
			await testNoExistingTags(plainTable(tableAt(example, 0)));
			return;
		case "calculating-next-version":
			await testNextVersions(plainTable(tableAt(example, 0)));
			return;
		default:
			throw new Error(`Unexpected semantic-version example: ${example.id}`);
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

function rejectedTags(table: Table<string>): string[] {
	return table.rows.flatMap((row) => {
		const tag = row[0];
		const accepted = row[1];
		assert(tag !== undefined);
		assert(accepted !== undefined);
		return accepted === "No" ? [tag] : [];
	});
}

async function testRequestedIncrements(table: Table<string>): Promise<void> {
	for (const row of table.rows) {
		await testRequestedIncrement(row);
	}
}

async function testRequestedIncrement(row: string[]): Promise<void> {
	const input = row[0];
	const outcome = row[1];
	assert(input !== undefined);
	assert(outcome !== undefined);
	const increment =
		input === "Empty string"
			? ""
			: input === "Missing input"
				? undefined
				: input;
	const result = await runAction(new Map([["v2.4.7", "commit"]]), increment);

	if (outcome === "Accepted") {
		assert.equal(result.status, 0, result.stderr);
		assert.equal(
			result.output,
			`new-semantic-version=${expectedIncrement("v2.4.7", input)}\n`,
		);
		return;
	}

	assert.equal(result.status, 1);
	assert.equal(result.output, "");
}
async function testTagFormats(table: Table<string>): Promise<void> {
	for (const row of table.rows) {
		const tag = row[0];
		const accepted = row[1];
		assert(tag !== undefined);
		assert(accepted !== undefined);
		const tags = new Map<string, string>();
		if (accepted === "No") tags.set("v2.0.0", "baseline");
		tags.set(tag, "candidate");

		const result = await runAction(tags, "patch");

		assert.equal(result.status, 0, result.stderr);
		assert.equal(
			result.output,
			`new-semantic-version=${accepted === "Yes" ? expectedIncrement(tag, "patch") : "v2.0.1"}\n`,
		);
	}
}

async function testRejectedTagFormats(table: Table<string>): Promise<void> {
	for (const tag of rejectedTags(table)) {
		const result = await runAction(new Map([[tag, "invalid-tag"]]), "patch");

		assert.equal(result.status, 1);
		assert.match(result.stderr, /No valid semantic version tags exist/);
		assert.equal(result.output, "");
	}
}

async function testAllInvalidTags(table: Table<string>): Promise<void> {
	const tags = new Map(
		rejectedTags(table).map((tag) => [tag, "invalid-tag"] as const),
	);
	assert(tags.size > 0);

	const result = await runAction(tags, "patch");

	assert.equal(result.status, 1);
	assert.match(result.stderr, /No valid semantic version tags exist/);
	assert.equal(result.output, "");
}

async function testHighestTags(table: Table<string>): Promise<void> {
	for (const row of table.rows) {
		const existingTags = row[0];
		const highestTag = row[1];
		assert(existingTags !== undefined);
		assert(highestTag !== undefined);
		const tags = new Map(
			existingTags.split(", ").map((tag) => [tag, "commit"] as const),
		);
		const result = await runAction(tags, "patch");

		assert.equal(result.status, 0, result.stderr);
		assert.equal(
			result.output,
			`new-semantic-version=${expectedIncrement(highestTag, "patch")}\n`,
		);
	}
}

async function testNoExistingTags(table: Table<string>): Promise<void> {
	for (const row of table.rows) {
		assert.equal(row[0], "None");
		const result = await runAction(new Map(), "patch");
		assert.equal(result.status, 1);
		assert.match(result.stderr, /No valid semantic version tags exist/);
		assert.equal(result.output, "");
	}
}

async function testNextVersions(table: Table<string>): Promise<void> {
	for (const row of table.rows) {
		const startingVersion = row[0];
		const increment = row[1];
		const expectedVersion = row[2];
		assert(startingVersion !== undefined);
		assert(increment !== undefined);
		assert(expectedVersion !== undefined);
		const result = await runAction(
			new Map([[startingVersion, "commit"]]),
			increment,
		);

		assert.equal(result.status, 0, result.stderr);
		assert.equal(result.output, `new-semantic-version=${expectedVersion}\n`);
	}
}

function expectedIncrement(version: string, increment: string): string {
	const match = /^v(\d+)\.(\d+)\.(\d+)$/.exec(version);
	assert(match);
	const [, major, minor, patch] = match;
	assert(major !== undefined);
	assert(minor !== undefined);
	assert(patch !== undefined);
	if (increment.toLowerCase() === "major") {
		return `v${BigInt(major) + 1n}.0.0`;
	}
	if (increment.toLowerCase() === "minor") {
		return `v${major}.${BigInt(minor) + 1n}.0`;
	}
	return `v${major}.${minor}.${BigInt(patch) + 1n}`;
}

async function runAction(
	tags: ReadonlyMap<string, string>,
	increment: string | undefined,
): Promise<{
	status: number | null;
	stdout: string;
	stderr: string;
	output: string;
}> {
	const fakeGitHubApi = new FakeGitHubApi(tags);
	const apiURL = await fakeGitHubApi.start();
	const directory = await mkdtemp(
		join(tmpdir(), "semantic-version-calculator-"),
	);
	const outputPath = join(directory, "github-output");
	await writeFile(outputPath, "");

	try {
		const result = await new Promise<{
			status: number | null;
			stdout: string;
			stderr: string;
		}>((resolve, reject) => {
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
						GITHUB_API_URL: apiURL,
						GITHUB_OUTPUT: outputPath,
						...(increment !== undefined ? { INPUT_INCREMENT: increment } : {}),
					},
					stdio: ["ignore", "pipe", "pipe"],
				},
			);
			let stdout = "";
			let stderr = "";
			child.stdout.on("data", (chunk: Buffer) => {
				stdout += chunk;
			});
			child.stderr.on("data", (chunk: Buffer) => {
				stderr += chunk;
			});
			child.on("error", reject);
			child.on("close", (status) => resolve({ status, stdout, stderr }));
		});

		return { ...result, output: await readFile(outputPath, "utf8") };
	} finally {
		await fakeGitHubApi.stop();
		await rm(directory, { recursive: true, force: true });
	}
}
