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
		const result = await runAction(apiUrl);

		assert.equal(result.status, 0, result.stderr);
		assert.deepEqual(
			Object.fromEntries(fakeGitHubApi.tagState()),
			Object.fromEntries(example.tags.map(({ tag, after }) => [tag, after])),
		);
	} finally {
		await fakeGitHubApi.stop();
	}
});

function runAction(apiUrl: string): Promise<{
	status: number | null;
	stderr: string;
}> {
	return new Promise((resolve, reject) => {
		const child = spawn(
			process.execPath,
			[
				"--experimental-strip-types",
				fileURLToPath(
					new URL(
						"../.github/actions/semantic-version-tagger/src/index.ts",
						import.meta.url,
					),
				),
			],
			{
				env: {
					GITHUB_REPOSITORY: repository,
					GITHUB_TOKEN: "fake-token",
					GITHUB_API_URL: apiUrl,
					"INPUT_SEMANTIC-VERSION": example.semanticVersion,
					INPUT_COMMIT: example.commit,
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
