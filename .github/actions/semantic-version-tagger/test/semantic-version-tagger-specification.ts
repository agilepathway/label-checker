// biome-ignore-all lint/security/noSecrets: These are dummy commit SHAs and pose no risk.

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
	type Rule,
	type Specification,
	type Table,
	tableAt,
	textAt,
} from "../../../../shared/specification-by-example/src/specification-by-example.ts";
import { FakeGitHubApi } from "./fake-github-api.ts";

const repository = "agilepathway/semantic-version-tagger-spec";

function tagState(
	table: Table,
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

export const patchLevelSemanticVersionRule: Rule = {
	definition:
		"Given a new patch semantic version to be applied to a given new commit, a new patch tag is created for that commit and the major, minor and latest tags are moved to point to the new commit too.",

	examples: [
		{
			content: [
				{
					type: "text",
					text: {
						template:
							"A new `{semanticVersion}` version and a new commit SHA `{commit}`",
						parameters: {
							semanticVersion: "v2.0.1",
							commit: "a1b2c3d4e5f67890abcdef1234567890abcdef12",
						},
					},
				},

				{
					type: "table",
					table: {
						headers: ["Tag", "Before", "After"],
						rows: [
							[
								"v2",
								"7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b",
								"a1b2c3d4e5f67890abcdef1234567890abcdef12",
							],
							[
								"v2.0",
								"7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b",
								"a1b2c3d4e5f67890abcdef1234567890abcdef12",
							],
							[
								"v2.0.0",
								"7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b",
								"7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b",
							],
							["v2.0.1", "—", "a1b2c3d4e5f67890abcdef1234567890abcdef12"],
							[
								"latest",
								"7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b",
								"a1b2c3d4e5f67890abcdef1234567890abcdef12",
							],
						],
					},
				},
			],

			async run(): Promise<void> {
				const fakeGitHubApi = new FakeGitHubApi(
					tagState(tableAt(this, 1), "Before"),
				);

				const apiUrl = await fakeGitHubApi.start();
				try {
					const result = await runAction(
						apiUrl,
						textAt(this, 0).parameters.semanticVersion,
						textAt(this, 0).parameters.commit,
					);

					assert.equal(result.status, 0, result.stderr);
					assert.deepEqual(
						Object.fromEntries(fakeGitHubApi.tagState()),
						Object.fromEntries(tagState(tableAt(this, 1), "After")),
					);
				} finally {
					await fakeGitHubApi.stop();
				}
			},
		},
	],
};

export const minorLevelSemanticVersionRule: Rule = {
	definition:
		"Given a new minor semantic version to be applied to a given new commit, a new minor and patch tag are created for that commit, and the major and latest tags are moved to point to the new commit too.",

	examples: [
		{
			content: [
				{
					type: "text",
					text: {
						template:
							"A new `{semanticVersion}` version and a new commit SHA `{commit}`",
						parameters: {
							semanticVersion: "v2.1.0",
							commit: "b2c3d4e5f67890abcdef1234567890abcdef123",
						},
					},
				},

				{
					type: "table",
					table: {
						headers: ["Tag", "Before", "After"],
						rows: [
							[
								"v2",
								"a1b2c3d4e5f67890abcdef1234567890abcdef12",
								"b2c3d4e5f67890abcdef1234567890abcdef123",
							],
							[
								"v2.0",
								"a1b2c3d4e5f67890abcdef1234567890abcdef12",
								"a1b2c3d4e5f67890abcdef1234567890abcdef12",
							],
							[
								"v2.0.0",
								"7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b",
								"7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b",
							],
							[
								"v2.0.1",
								"a1b2c3d4e5f67890abcdef1234567890abcdef12",
								"a1b2c3d4e5f67890abcdef1234567890abcdef12",
							],
							["v2.1", "—", "b2c3d4e5f67890abcdef1234567890abcdef123"],
							["v2.1.0", "—", "b2c3d4e5f67890abcdef1234567890abcdef123"],
							[
								"latest",
								"a1b2c3d4e5f67890abcdef1234567890abcdef12",
								"b2c3d4e5f67890abcdef1234567890abcdef123",
							],
						],
					},
				},
			],

			async run(): Promise<void> {
				const fakeGitHubApi = new FakeGitHubApi(
					tagState(tableAt(this, 1), "Before"),
				);
				const apiUrl = await fakeGitHubApi.start();
				try {
					const result = await runAction(
						apiUrl,
						textAt(this, 0).parameters.semanticVersion,
						textAt(this, 0).parameters.commit,
					);
					assert.equal(result.status, 0, result.stderr);
					assert.deepEqual(
						Object.fromEntries(fakeGitHubApi.tagState()),
						Object.fromEntries(tagState(tableAt(this, 1), "After")),
					);
				} finally {
					await fakeGitHubApi.stop();
				}
			},
		},
	],
};

export const majorLevelSemanticVersionRule: Rule = {
	definition:
		"Given a new major semantic version to be applied to a given new commit, a new major, minor and patch tag are created for that commit, and the latest tag is moved to point to the new commit too.",
	examples: [
		{
			content: [
				{
					type: "text",
					text: {
						template:
							"A new `{semanticVersion}` version and a new commit SHA `{commit}`",
						parameters: {
							semanticVersion: "v3.0.0",
							commit: "c3d4e5f67890abcdef1234567890abcdef1234",
						},
					},
				},
				{
					type: "table",
					table: {
						headers: ["Tag", "Before", "After"],
						rows: [
							[
								"v2",
								"b2c3d4e5f67890abcdef1234567890abcdef123",
								"b2c3d4e5f67890abcdef1234567890abcdef123",
							],
							[
								"v2.0",
								"a1b2c3d4e5f67890abcdef1234567890abcdef12",
								"a1b2c3d4e5f67890abcdef1234567890abcdef12",
							],
							[
								"v2.1",
								"b2c3d4e5f67890abcdef1234567890abcdef123",
								"b2c3d4e5f67890abcdef1234567890abcdef123",
							],
							[
								"v2.0.0",
								"7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b",
								"7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b",
							],
							[
								"v2.0.1",
								"a1b2c3d4e5f67890abcdef1234567890abcdef12",
								"a1b2c3d4e5f67890abcdef1234567890abcdef12",
							],
							[
								"v2.1.0",
								"b2c3d4e5f67890abcdef1234567890abcdef123",
								"b2c3d4e5f67890abcdef1234567890abcdef123",
							],
							["v3", "—", "c3d4e5f67890abcdef1234567890abcdef1234"],
							["v3.0", "—", "c3d4e5f67890abcdef1234567890abcdef1234"],
							["v3.0.0", "—", "c3d4e5f67890abcdef1234567890abcdef1234"],
							[
								"latest",
								"b2c3d4e5f67890abcdef1234567890abcdef123",
								"c3d4e5f67890abcdef1234567890abcdef1234",
							],
						],
					},
				},
			],
			async run(): Promise<void> {
				const fakeGitHubApi = new FakeGitHubApi(
					tagState(tableAt(this, 1), "Before"),
				);
				const apiUrl = await fakeGitHubApi.start();
				try {
					const result = await runAction(
						apiUrl,
						textAt(this, 0).parameters.semanticVersion,
						textAt(this, 0).parameters.commit,
					);
					assert.equal(result.status, 0, result.stderr);
					assert.deepEqual(
						Object.fromEntries(fakeGitHubApi.tagState()),
						Object.fromEntries(tagState(tableAt(this, 1), "After")),
					);
				} finally {
					await fakeGitHubApi.stop();
				}
			},
		},
	],
};

export const missingSemanticVersionTagsRule: Rule = {
	definition:
		"Given a new patch semantic version to be applied to a given new commit, if any of the semantic version tags expected to already be present on an earlier commit are missing then they are created rather than moved.",
	examples: [
		{
			content: [
				{
					type: "text",
					text: {
						template:
							"The project has only patch tags in existence. A new `{semanticVersion}` version and a new commit SHA `{commit}`, with no major, minor and latest tags already existing.",
						parameters: {
							semanticVersion: "v2.0.1",
							commit: "a1b2c3d4e5f67890abcdef1234567890abcdef12",
						},
					},
				},
				{
					type: "table",
					table: {
						headers: ["Tag", "Before", "After"],
						rows: [
							["v2", "—", "a1b2c3d4e5f67890abcdef1234567890abcdef12"],
							["v2.0", "—", "a1b2c3d4e5f67890abcdef1234567890abcdef12"],
							[
								"v2.0.0",
								"7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b",
								"7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b",
							],
							["v2.0.1", "—", "a1b2c3d4e5f67890abcdef1234567890abcdef12"],
							["latest", "—", "a1b2c3d4e5f67890abcdef1234567890abcdef12"],
						],
					},
				},
			],
			async run(): Promise<void> {
				const fakeGitHubApi = new FakeGitHubApi(
					tagState(tableAt(this, 1), "Before"),
				);
				const apiUrl = await fakeGitHubApi.start();
				try {
					const result = await runAction(
						apiUrl,
						textAt(this, 0).parameters.semanticVersion,
						textAt(this, 0).parameters.commit,
					);
					assert.equal(result.status, 0, result.stderr);
					assert.deepEqual(
						Object.fromEntries(fakeGitHubApi.tagState()),
						Object.fromEntries(tagState(tableAt(this, 1), "After")),
					);
				} finally {
					await fakeGitHubApi.stop();
				}
			},
		},
		{
			content: [
				{
					type: "text",
					text: {
						template:
							"The very first semantic `{semanticVersion}` version for the repo and a new commit SHA `{commit}`, with no previous semantic version tags existing.",
						parameters: {
							semanticVersion: "v0.0.1",
							commit: "a1b2c3d4e5f67890abcdef1234567890abcdef12",
						},
					},
				},
				{
					type: "table",
					table: {
						headers: ["Tag", "Before", "After"],
						rows: [
							["v0", "—", "a1b2c3d4e5f67890abcdef1234567890abcdef12"],
							["v0.0", "—", "a1b2c3d4e5f67890abcdef1234567890abcdef12"],
							["v0.0.1", "—", "a1b2c3d4e5f67890abcdef1234567890abcdef12"],
							["latest", "—", "a1b2c3d4e5f67890abcdef1234567890abcdef12"],
						],
					},
				},
			],
			async run(): Promise<void> {
				const fakeGitHubApi = new FakeGitHubApi(
					tagState(tableAt(this, 1), "Before"),
				);
				const apiUrl = await fakeGitHubApi.start();
				try {
					const result = await runAction(
						apiUrl,
						textAt(this, 0).parameters.semanticVersion,
						textAt(this, 0).parameters.commit,
					);
					assert.equal(result.status, 0, result.stderr);
					assert.deepEqual(
						Object.fromEntries(fakeGitHubApi.tagState()),
						Object.fromEntries(tagState(tableAt(this, 1), "After")),
					);
				} finally {
					await fakeGitHubApi.stop();
				}
			},
		},
		{
			content: [
				{
					type: "text",
					text: {
						template:
							"The project adopts the `latest` tag for the first time. A new `{semanticVersion}` version and a new commit SHA `{commit}`, with no `latest` tag already existing.",
						parameters: {
							semanticVersion: "v2.0.1",
							commit: "a1b2c3d4e5f67890abcdef1234567890abcdef12",
						},
					},
				},
				{
					type: "table",
					table: {
						headers: ["Tag", "Before", "After"],
						rows: [
							[
								"v2",
								"7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b",
								"a1b2c3d4e5f67890abcdef1234567890abcdef12",
							],
							[
								"v2.0",
								"7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b",
								"a1b2c3d4e5f67890abcdef1234567890abcdef12",
							],
							[
								"v2.0.0",
								"7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b",
								"7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b",
							],
							["v2.0.1", "—", "a1b2c3d4e5f67890abcdef1234567890abcdef12"],
							["latest", "—", "a1b2c3d4e5f67890abcdef1234567890abcdef12"],
						],
					},
				},
			],
			async run(): Promise<void> {
				const fakeGitHubApi = new FakeGitHubApi(
					tagState(tableAt(this, 1), "Before"),
				);
				const apiUrl = await fakeGitHubApi.start();
				try {
					const result = await runAction(
						apiUrl,
						textAt(this, 0).parameters.semanticVersion,
						textAt(this, 0).parameters.commit,
					);
					assert.equal(result.status, 0, result.stderr);
					assert.deepEqual(
						Object.fromEntries(fakeGitHubApi.tagState()),
						Object.fromEntries(tagState(tableAt(this, 1), "After")),
					);
				} finally {
					await fakeGitHubApi.stop();
				}
			},
		},
	],
};

export const existingSemanticVersionTagRule: Rule = {
	definition: "The new version tag must not already exist.",
	examples: [
		{
			content: [
				{
					type: "text",
					text: {
						template:
							"A new `{semanticVersion}` version and a new commit SHA `{commit}`, where the `{semanticVersion}` tag already exists:",
						parameters: {
							semanticVersion: "v2.0.1",
							commit: "a1b2c3d4e5f67890abcdef1234567890abcdef12",
						},
					},
				},
				{
					type: "table",
					table: {
						headers: ["Tag", "Before", "After", "Result"],
						rows: [
							[
								"v2.0.1",
								"7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b",
								"7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b",
								"Error",
							],
						],
					},
				},
			],
			async run(): Promise<void> {
				const fakeGitHubApi = new FakeGitHubApi(
					tagState(tableAt(this, 1), "Before"),
				);
				const apiUrl = await fakeGitHubApi.start();
				try {
					const result = await runAction(
						apiUrl,
						textAt(this, 0).parameters.semanticVersion,
						textAt(this, 0).parameters.commit,
					);
					assert.notEqual(result.status, null);
					assert.equal(
						result.status === 0 ? "Success" : "Error",
						tableAt(this, 1).rows[0][
							tableAt(this, 1).headers.indexOf("Result")
						],
					);
					assert.match(
						result.stderr,
						/The version tag v2\.0\.1 already exists\./,
					);
					assert.deepEqual(
						Object.fromEntries(fakeGitHubApi.tagState()),
						Object.fromEntries(tagState(tableAt(this, 1), "After")),
					);
				} finally {
					await fakeGitHubApi.stop();
				}
			},
		},
	],
};

export const existingAliasSemanticVersionTagRule: Rule = {
	definition:
		"If a tag exists and is in scope to be moved to the new commit, it is moved regardless of which commit it currently points to.",
	examples: [
		{
			content: [
				{
					type: "text",
					text: {
						template:
							"The `v2` tag currently (wrongly) points to the commit tagged `v1.0.0`. A new `{semanticVersion}` version and a new commit SHA `{commit}`:",
						parameters: {
							semanticVersion: "v2.0.1",
							commit: "a1b2c3d4e5f67890abcdef1234567890abcdef12",
						},
					},
				},
				{
					type: "table",
					table: {
						headers: ["Tag", "Before", "After"],
						rows: [
							[
								"v1.0.0",
								"9e8d7c6b5a4f3210fedcba9876543210fedcba98",
								"9e8d7c6b5a4f3210fedcba9876543210fedcba98",
							],
							[
								"v2",
								"9e8d7c6b5a4f3210fedcba9876543210fedcba98",
								"a1b2c3d4e5f67890abcdef1234567890abcdef12",
							],
							[
								"v2.0",
								"7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b",
								"a1b2c3d4e5f67890abcdef1234567890abcdef12",
							],
							[
								"v2.0.0",
								"7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b",
								"7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b",
							],
							["v2.0.1", "—", "a1b2c3d4e5f67890abcdef1234567890abcdef12"],
							[
								"latest",
								"7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b",
								"a1b2c3d4e5f67890abcdef1234567890abcdef12",
							],
						],
					},
				},
			],
			async run(): Promise<void> {
				const fakeGitHubApi = new FakeGitHubApi(
					tagState(tableAt(this, 1), "Before"),
				);
				const apiUrl = await fakeGitHubApi.start();
				try {
					const result = await runAction(
						apiUrl,
						textAt(this, 0).parameters.semanticVersion,
						textAt(this, 0).parameters.commit,
					);
					assert.equal(result.status, 0, result.stderr);
					assert.deepEqual(
						Object.fromEntries(fakeGitHubApi.tagState()),
						Object.fromEntries(tagState(tableAt(this, 1), "After")),
					);
				} finally {
					await fakeGitHubApi.stop();
				}
			},
		},
	],
};

export const semanticVersionTaggingSpecification: Specification = {
	title: "Semantic Version Tagging",
	rules: [
		patchLevelSemanticVersionRule,
		minorLevelSemanticVersionRule,
		majorLevelSemanticVersionRule,
		missingSemanticVersionTagsRule,
		existingSemanticVersionTagRule,
		existingAliasSemanticVersionTagRule,
	],
};

function runAction(
	apiUrl: string,
	semanticVersion: string,
	commit: string,
): Promise<{ status: number | null; stderr: string }> {
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

		child.stderr.on("data", (chunk) => {
			stderr += chunk;
		});

		child.on("error", reject);

		child.on("close", (status) => {
			resolve({ status, stderr });
		});
	});
}
