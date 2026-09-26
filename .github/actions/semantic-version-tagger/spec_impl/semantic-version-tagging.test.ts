import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { FakeGitHubApi } from "../spec_test_support/fake-github-api.ts";

const directory = dirname(fileURLToPath(import.meta.url));
const specificationPath = resolve(
	directory,
	"../spec/semantic-version-tagging.md",
);
const actionPath = resolve(directory, "../src/index.ts");

test("executes the first semantic-version tagging Rule and Example", async () => {
	const example = await readFirstExample();
	const { commit, version } = parseInputs(example);
	const api = new FakeGitHubApi(parseBeforeState(example));
	const apiUrl = await api.start();

	try {
		await runAction({ apiUrl, commit, version });
		assertAfterState(example, api.tagState());
	} finally {
		await api.stop();
	}
});

async function readFirstExample(): Promise<string> {
	const specification = await readFile(specificationPath, "utf8");
	const match = specification.match(
		/## Rule\n\n(?<rule>[\s\S]+?)\n\n## Example\n\n(?<example>[\s\S]+?)(?=\n\n---)/,
	);
	assert.ok(
		match?.groups,
		"The first Rule and Example must exist in the specification.",
	);
	assert.match(
		match.groups.rule,
		/^Given a new patch-level semantic version to be applied to a given new commit, a new patch tag is created for that commit and the major, minor and latest tags are moved to point to the new commit too\.$/,
	);
	return match.groups.example;
}

function parseInputs(example: string): { commit: string; version: string } {
	const match = example.match(
		/A new `(?<version>v[^`]+)` version and a new commit SHA `(?<commit>[0-9a-f]+)`/,
	);
	assert.ok(match?.groups, "The first Example inputs must be present.");
	return { commit: match.groups.commit, version: match.groups.version };
}

function parseBeforeState(example: string): Map<string, string> {
	const state = new Map<string, string>();
	for (const row of tableRows(example)) {
		if (row.before !== "—") state.set(row.tag, row.before);
	}
	return state;
}

function assertAfterState(
	example: string,
	state: ReadonlyMap<string, string>,
): void {
	const expectedState = new Map<string, string>();
	for (const row of tableRows(example)) {
		if (row.after !== "—") expectedState.set(row.tag, row.after);
	}
	assert.deepEqual(
		[...state.entries()].sort(),
		[...expectedState.entries()].sort(),
		"The final tag state must match the complete Markdown After state.",
	);
}

function tableRows(
	example: string,
): Array<{ after: string; before: string; tag: string }> {
	const rows = [
		...example.matchAll(
			/\| `(?<tag>[^`]+)` \| (?<before>[^|]+) \| (?<after>[^|]+) \|/g,
		),
	].map((row) => {
		const tag = row.groups?.tag;
		const before = row.groups?.before?.trim().replaceAll("`", "");
		const after = row.groups?.after?.trim().replaceAll("`", "");
		assert.ok(tag && before && after);
		return { after, before, tag };
	});
	assert.ok(
		rows.length > 0,
		"The Example tag table must contain at least one row.",
	);
	return rows;
}

async function runAction(input: {
	apiUrl: string;
	commit: string;
	version: string;
}): Promise<void> {
	const child = spawn(process.execPath, [actionPath], {
		env: {
			...process.env,
			GITHUB_API_URL: input.apiUrl,
			GITHUB_REPOSITORY: "example/repository",
			GITHUB_TOKEN: "test-token",
			INPUT_COMMIT: input.commit,
			"INPUT_SEMANTIC-VERSION": input.version,
		},
	});
	let stderr = "";
	child.stderr.setEncoding("utf8");
	child.stderr.on("data", (chunk: string) => {
		stderr += chunk;
	});
	const exitCode = await new Promise<number>((resolveExit, reject) => {
		child.once("error", reject);
		child.once("exit", (code) => resolveExit(code ?? 1));
	});
	assert.equal(exitCode, 0, stderr);
}
