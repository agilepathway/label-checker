// biome-ignore-all lint/security/noSecrets: These commit SHAs are copied verbatim from the spec.

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { FakeGitHubApi } from "./fake-github-api.ts";

const repository = "agilepathway/semantic-version-tagger-spec";

export const patchLevelSemanticVersionRule = {
	definition:
		"Given a new patch semantic version to be applied to a given new commit, a new patch tag is created for that commit and the major, minor and latest tags are moved to point to the new commit too.",

	examples: [
		{
			description:
				"A new `{semanticVersion}` version and a new commit SHA `{commit}`",

			semanticVersion: "v2.0.1",
			commit: "a1b2c3d4e5f67890abcdef1234567890abcdef12",

			table: [
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

			async run(): Promise<void> {
				const fakeGitHubApi = new FakeGitHubApi(
					new Map(
						this.table.flatMap(({ tag, before }) =>
							before === null ? [] : [[tag, before]],
						),
					),
				);

				const apiUrl = await fakeGitHubApi.start();
				try {
					const result = await runAction(
						apiUrl,
						this.semanticVersion,
						this.commit,
					);

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
					assert.deepEqual(
						Object.fromEntries(fakeGitHubApi.tagState()),
						Object.fromEntries(
							this.table.map(({ tag, after }) => [tag, after]),
						),
					);
				} finally {
					await fakeGitHubApi.stop();
				}
			},
		},
	],
};

export const failedAliasUpdateSemanticVersionRule = {
	definition: "A tag is only reported after its ref update succeeds.",
	examples: [
		{
			description: "The update to the `{failedTag}` alias fails",
			semanticVersion: "v2.0.1",
			commit: "a1b2c3d4e5f67890abcdef1234567890abcdef12",
			failedTag: "latest",
			async run(): Promise<void> {
				const previousCommit = "7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b";
				const fakeGitHubApi = new FakeGitHubApi(
					new Map([
						["v2", previousCommit],
						["v2.0", previousCommit],
						["latest", previousCommit],
					]),
					this.failedTag,
				);
				const apiUrl = await fakeGitHubApi.start();
				try {
					const result = await runAction(
						apiUrl,
						this.semanticVersion,
						this.commit,
					);

					assert.equal(result.status, 1);
					assert.match(
						result.stderr,
						/GitHub ref operation failed with status 500: Simulated ref update failure/,
					);
					assert.equal(
						result.stdout,
						[
							"Semantic-version tags:",
							"  v2.0 → a1b2c3d4...",
							"  v2 → a1b2c3d4...",
							"",
						].join("\n"),
					);
					assert.deepEqual(Object.fromEntries(fakeGitHubApi.tagState()), {
						v2: this.commit,
						"v2.0": this.commit,
						latest: previousCommit,
					});
				} finally {
					await fakeGitHubApi.stop();
				}
			},
		},
	],
};

export const minorLevelSemanticVersionRule = {
	definition:
		"Given a new minor semantic version to be applied to a given new commit, a new minor and patch tag are created for that commit, and the major and latest tags are moved to point to the new commit too.",

	examples: [
		{
			description:
				"A new `{semanticVersion}` version and a new commit SHA `{commit}`",

			semanticVersion: "v2.1.0",
			commit: "b2c3d4e5f67890abcdef1234567890abcdef123",

			table: [
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

			async run(): Promise<void> {
				const fakeGitHubApi = new FakeGitHubApi(
					new Map(
						this.table.flatMap(({ tag, before }) =>
							before === null ? [] : [[tag, before]],
						),
					),
				);
				const apiUrl = await fakeGitHubApi.start();
				try {
					const result = await runAction(
						apiUrl,
						this.semanticVersion,
						this.commit,
					);
					assert.equal(result.status, 0, result.stderr);
					assert.deepEqual(
						Object.fromEntries(fakeGitHubApi.tagState()),
						Object.fromEntries(
							this.table.map(({ tag, after }) => [tag, after]),
						),
					);
				} finally {
					await fakeGitHubApi.stop();
				}
			},
		},
	],
};

export const majorLevelSemanticVersionRule = {
	definition:
		"Given a new major semantic version to be applied to a given new commit, a new major, minor and patch tag are created for that commit, and the latest tag is moved to point to the new commit too.",
	examples: [
		{
			description:
				"A new `{semanticVersion}` version and a new commit SHA `{commit}`",
			semanticVersion: "v3.0.0",
			commit: "c3d4e5f67890abcdef1234567890abcdef1234",
			table: [
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
			async run(): Promise<void> {
				const fakeGitHubApi = new FakeGitHubApi(
					new Map(
						this.table.flatMap(({ tag, before }) =>
							before === null ? [] : [[tag, before]],
						),
					),
				);
				const apiUrl = await fakeGitHubApi.start();
				try {
					const result = await runAction(
						apiUrl,
						this.semanticVersion,
						this.commit,
					);
					assert.equal(result.status, 0, result.stderr);
					assert.deepEqual(
						Object.fromEntries(fakeGitHubApi.tagState()),
						Object.fromEntries(
							this.table.map(({ tag, after }) => [tag, after]),
						),
					);
				} finally {
					await fakeGitHubApi.stop();
				}
			},
		},
	],
};

export const missingSemanticVersionTagsRule = {
	definition:
		"Given a new patch semantic version to be applied to a given new commit, if any of the semantic version tags expected to already be present on an earlier commit are missing then they are created rather than moved.",
	examples: [
		{
			description:
				"A new `{semanticVersion}` version and a new commit SHA `{commit}`, with no major, minor and latest tags already existing",
			semanticVersion: "v2.0.1",
			commit: "a1b2c3d4e5f67890abcdef1234567890abcdef12",
			table: [
				{
					tag: "v2",
					before: null,
					after: "a1b2c3d4e5f67890abcdef1234567890abcdef12",
				},
				{
					tag: "v2.0",
					before: null,
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
					before: null,
					after: "a1b2c3d4e5f67890abcdef1234567890abcdef12",
				},
			],
			async run(): Promise<void> {
				const fakeGitHubApi = new FakeGitHubApi(
					new Map(
						this.table.flatMap(({ tag, before }) =>
							before === null ? [] : [[tag, before]],
						),
					),
				);
				const apiUrl = await fakeGitHubApi.start();
				try {
					const result = await runAction(
						apiUrl,
						this.semanticVersion,
						this.commit,
					);
					assert.equal(result.status, 0, result.stderr);
					assert.deepEqual(
						Object.fromEntries(fakeGitHubApi.tagState()),
						Object.fromEntries(
							this.table.map(({ tag, after }) => [tag, after]),
						),
					);
				} finally {
					await fakeGitHubApi.stop();
				}
			},
		},
		{
			description:
				"The very first semantic `{semanticVersion}` version for the repo and a new commit SHA `{commit}`, with no previous semantic version tags existing",
			semanticVersion: "v0.0.1",
			commit: "a1b2c3d4e5f67890abcdef1234567890abcdef12",
			table: [
				{
					tag: "v0",
					before: null,
					after: "a1b2c3d4e5f67890abcdef1234567890abcdef12",
				},
				{
					tag: "v0.0",
					before: null,
					after: "a1b2c3d4e5f67890abcdef1234567890abcdef12",
				},
				{
					tag: "v0.0.1",
					before: null,
					after: "a1b2c3d4e5f67890abcdef1234567890abcdef12",
				},
				{
					tag: "latest",
					before: null,
					after: "a1b2c3d4e5f67890abcdef1234567890abcdef12",
				},
			],
			async run(): Promise<void> {
				const fakeGitHubApi = new FakeGitHubApi(
					new Map(
						this.table.flatMap(({ tag, before }) =>
							before === null ? [] : [[tag, before]],
						),
					),
				);
				const apiUrl = await fakeGitHubApi.start();
				try {
					const result = await runAction(
						apiUrl,
						this.semanticVersion,
						this.commit,
					);
					assert.equal(result.status, 0, result.stderr);
					assert.deepEqual(
						Object.fromEntries(fakeGitHubApi.tagState()),
						Object.fromEntries(
							this.table.map(({ tag, after }) => [tag, after]),
						),
					);
				} finally {
					await fakeGitHubApi.stop();
				}
			},
		},
		{
			description:
				"The project adopts the `latest` tag for the first time. A new `{semanticVersion}` version and a new commit SHA `{commit}`, with no `latest` tag already existing",
			semanticVersion: "v2.0.1",
			commit: "a1b2c3d4e5f67890abcdef1234567890abcdef12",
			table: [
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
					before: null,
					after: "a1b2c3d4e5f67890abcdef1234567890abcdef12",
				},
			],
			async run(): Promise<void> {
				const fakeGitHubApi = new FakeGitHubApi(
					new Map(
						this.table.flatMap(({ tag, before }) =>
							before === null ? [] : [[tag, before]],
						),
					),
				);
				const apiUrl = await fakeGitHubApi.start();
				try {
					const result = await runAction(
						apiUrl,
						this.semanticVersion,
						this.commit,
					);
					assert.equal(result.status, 0, result.stderr);
					assert.deepEqual(
						Object.fromEntries(fakeGitHubApi.tagState()),
						Object.fromEntries(
							this.table.map(({ tag, after }) => [tag, after]),
						),
					);
				} finally {
					await fakeGitHubApi.stop();
				}
			},
		},
	],
};

export const existingSemanticVersionTagRule = {
	definition: "The new version tag must not already exist.",
	examples: [
		{
			description:
				"A new `{semanticVersion}` version and a new commit SHA `{commit}`, where the `{semanticVersion}` tag already exists",
			semanticVersion: "v2.0.1",
			commit: "a1b2c3d4e5f67890abcdef1234567890abcdef12",
			table: [
				{
					tag: "v2.0.1",
					before: "7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b",
					after: "7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b",
				},
			],
			async run(): Promise<void> {
				const fakeGitHubApi = new FakeGitHubApi(
					new Map(
						this.table.flatMap(({ tag, before }) =>
							before === null ? [] : [[tag, before]],
						),
					),
				);
				const apiUrl = await fakeGitHubApi.start();
				try {
					const result = await runAction(
						apiUrl,
						this.semanticVersion,
						this.commit,
					);
					assert.equal(result.status, 1);
					assert.match(
						result.stderr,
						/The version tag v2\.0\.1 already exists\./,
					);
					assert.deepEqual(
						Object.fromEntries(fakeGitHubApi.tagState()),
						Object.fromEntries(
							this.table.map(({ tag, after }) => [tag, after]),
						),
					);
				} finally {
					await fakeGitHubApi.stop();
				}
			},
		},
	],
};

export const existingAliasSemanticVersionTagRule = {
	definition:
		"If a tag exists and is in scope to be moved to the new commit, it is moved regardless of which commit it currently points to.",
	examples: [
		{
			description:
				"The `v2` tag currently (wrongly) points to the commit tagged `v1.0.0`. A new `{semanticVersion}` version and a new commit SHA `{commit}`",
			semanticVersion: "v2.0.1",
			commit: "a1b2c3d4e5f67890abcdef1234567890abcdef12",
			table: [
				{
					tag: "v1.0.0",
					before: "9e8d7c6b5a4f3210fedcba9876543210fedcba98",
					after: "9e8d7c6b5a4f3210fedcba9876543210fedcba98",
				},
				{
					tag: "v2",
					before: "9e8d7c6b5a4f3210fedcba9876543210fedcba98",
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
			async run(): Promise<void> {
				const fakeGitHubApi = new FakeGitHubApi(
					new Map(
						this.table.flatMap(({ tag, before }) =>
							before === null ? [] : [[tag, before]],
						),
					),
				);
				const apiUrl = await fakeGitHubApi.start();
				try {
					const result = await runAction(
						apiUrl,
						this.semanticVersion,
						this.commit,
					);
					assert.equal(result.status, 0, result.stderr);
					assert.deepEqual(
						Object.fromEntries(fakeGitHubApi.tagState()),
						Object.fromEntries(
							this.table.map(({ tag, after }) => [tag, after]),
						),
					);
				} finally {
					await fakeGitHubApi.stop();
				}
			},
		},
	],
};

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
