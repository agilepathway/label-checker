// biome-ignore-all lint/security/noSecrets: These commit SHAs are copied verbatim from the spec.

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { FakeGitHubApi } from "./fake-github-api.ts";

const repository = "agilepathway/semantic-version-tagger-spec";

const rule =
	"Given a new patch-level semantic version to be applied to a given new commit, a new patch tag is created for that commit and the major, minor and latest tags are moved to point to the new commit too.";

const example = {
	description:
		"A new `v2.0.1` version and a new commit SHA `a1b2c3d4e5f67890abcdef1234567890abcdef12`",
	semanticVersion: "v2.0.1",
	commit: "a1b2c3d4e5f67890abcdef1234567890abcdef12",
	tags: [
		{
			tag: "v2",
			before: "7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b",
			after: "a1b2c3d4e5f67890abcdef1234567890abcdef12",
		},
		{
			tag: "v2.0",
			before: "7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b",
			after: "a1b2c3d4e5f67890abcdef1234567890abcdef12",
		},
		{
			tag: "v2.0.0",
			before: "7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b",
			after: "7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b",
		},
		{
			tag: "v2.0.1",
			before: null,
			after: "a1b2c3d4e5f67890abcdef1234567890abcdef12",
		},
		{
			tag: "latest",
			before: "7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b",
			after: "a1b2c3d4e5f67890abcdef1234567890abcdef12",
		},
	],
} as const;

const minorRule =
	"Given a new minor-level semantic version to be applied to a given new commit, a new minor and patch-level tag are created for that commit, and the major and latest tags are moved to point to the new commit too.";

const minorExample = {
	description:
		"A new `v2.1.0` version and a new commit SHA `b2c3d4e5f67890abcdef1234567890abcdef123`",
	semanticVersion: "v2.1.0",
	commit: "b2c3d4e5f67890abcdef1234567890abcdef123",
	tags: [
		{
			tag: "v2",
			before: "a1b2c3d4e5f67890abcdef1234567890abcdef12",
			after: "b2c3d4e5f67890abcdef1234567890abcdef123",
		},
		{
			tag: "v2.0",
			before: "a1b2c3d4e5f67890abcdef1234567890abcdef12",
			after: "a1b2c3d4e5f67890abcdef1234567890abcdef12",
		},
		{
			tag: "v2.0.0",
			before: "7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b",
			after: "7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b",
		},
		{
			tag: "v2.0.1",
			before: "a1b2c3d4e5f67890abcdef1234567890abcdef12",
			after: "a1b2c3d4e5f67890abcdef1234567890abcdef12",
		},
		{
			tag: "v2.1",
			before: null,
			after: "b2c3d4e5f67890abcdef1234567890abcdef123",
		},
		{
			tag: "v2.1.0",
			before: null,
			after: "b2c3d4e5f67890abcdef1234567890abcdef123",
		},
		{
			tag: "latest",
			before: "a1b2c3d4e5f67890abcdef1234567890abcdef12",
			after: "b2c3d4e5f67890abcdef1234567890abcdef123",
		},
	],
} as const;

const majorRule =
	"Given a new major-level semantic version to be applied to a given new commit, a new major, minor and patch-level tag are created for that commit, and the latest tag is moved to point to the new commit too.";

const majorExample = {
	description:
		"A new `v3.0.0` version and a new commit SHA `c3d4e5f67890abcdef1234567890abcdef1234`",
	semanticVersion: "v3.0.0",
	commit: "c3d4e5f67890abcdef1234567890abcdef1234",
	tags: [
		{
			tag: "v2",
			before: "b2c3d4e5f67890abcdef1234567890abcdef123",
			after: "b2c3d4e5f67890abcdef1234567890abcdef123",
		},
		{
			tag: "v2.0",
			before: "a1b2c3d4e5f67890abcdef1234567890abcdef12",
			after: "a1b2c3d4e5f67890abcdef1234567890abcdef12",
		},
		{
			tag: "v2.1",
			before: "b2c3d4e5f67890abcdef1234567890abcdef123",
			after: "b2c3d4e5f67890abcdef1234567890abcdef123",
		},
		{
			tag: "v2.0.0",
			before: "7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b",
			after: "7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b",
		},
		{
			tag: "v2.0.1",
			before: "a1b2c3d4e5f67890abcdef1234567890abcdef12",
			after: "a1b2c3d4e5f67890abcdef1234567890abcdef12",
		},
		{
			tag: "v2.1.0",
			before: "b2c3d4e5f67890abcdef1234567890abcdef123",
			after: "b2c3d4e5f67890abcdef1234567890abcdef123",
		},
		{
			tag: "v3",
			before: null,
			after: "c3d4e5f67890abcdef1234567890abcdef1234",
		},
		{
			tag: "v3.0",
			before: null,
			after: "c3d4e5f67890abcdef1234567890abcdef1234",
		},
		{
			tag: "v3.0.0",
			before: null,
			after: "c3d4e5f67890abcdef1234567890abcdef1234",
		},
		{
			tag: "latest",
			before: "b2c3d4e5f67890abcdef1234567890abcdef123",
			after: "c3d4e5f67890abcdef1234567890abcdef1234",
		},
	],
} as const;

test(`${rule} ${example.description}`, async () => {
	const fakeGitHubApi = new FakeGitHubApi(
		new Map(
			example.tags.flatMap(({ tag, before }) =>
				before === null ? [] : [[tag, before]],
			),
		),
	);
	const apiUrl = await fakeGitHubApi.start();
	try {
		const result = await runAction(
			apiUrl,
			example.semanticVersion,
			example.commit,
		);

		assert.equal(result.status, 0, result.stderr);
		assert.deepEqual(
			Object.fromEntries(fakeGitHubApi.tagState()),
			Object.fromEntries(example.tags.map(({ tag, after }) => [tag, after])),
		);
	} finally {
		await fakeGitHubApi.stop();
	}
});

test(`${minorRule} ${minorExample.description}`, async () => {
	const fakeGitHubApi = new FakeGitHubApi(
		new Map(
			minorExample.tags.flatMap(({ tag, before }) =>
				before === null ? [] : [[tag, before]],
			),
		),
	);
	const apiUrl = await fakeGitHubApi.start();
	try {
		const result = await runAction(
			apiUrl,
			minorExample.semanticVersion,
			minorExample.commit,
		);

		assert.equal(result.status, 0, result.stderr);
		assert.deepEqual(
			Object.fromEntries(fakeGitHubApi.tagState()),
			Object.fromEntries(
				minorExample.tags.map(({ tag, after }) => [tag, after]),
			),
		);
	} finally {
		await fakeGitHubApi.stop();
	}
});

test(`${majorRule} ${majorExample.description}`, async () => {
	const fakeGitHubApi = new FakeGitHubApi(
		new Map(
			majorExample.tags.flatMap(({ tag, before }) =>
				before === null ? [] : [[tag, before]],
			),
		),
	);
	const apiUrl = await fakeGitHubApi.start();
	try {
		const result = await runAction(
			apiUrl,
			majorExample.semanticVersion,
			majorExample.commit,
		);

		assert.equal(result.status, 0, result.stderr);
		assert.deepEqual(
			Object.fromEntries(fakeGitHubApi.tagState()),
			Object.fromEntries(
				majorExample.tags.map(({ tag, after }) => [tag, after]),
			),
		);
	} finally {
		await fakeGitHubApi.stop();
	}
});

function runAction(
	apiUrl: string,
	semanticVersion: string,
	commit: string,
): Promise<{
	status: number | null;
	stderr: string;
}> {
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
				stdio: ["ignore", "ignore", "pipe"],
			},
		);
		let stderr = "";
		child.stderr.on("data", (chunk: Buffer) => {
			stderr += chunk;
		});
		child.on("error", reject);
		child.on("close", (status) => resolve({ status, stderr }));
	});
}
