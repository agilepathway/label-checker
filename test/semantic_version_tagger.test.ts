import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { test } from "node:test";
import { firstExample } from "../.github/actions/semantic-version-tagger/spec/semantic-version-tagging.ts";
import { FakeGitHubApi } from "./fake-github-api.ts";

const repository = "agilepathway/semantic-version-tagger-spec";

test("applies the first semantic-version tagging example", async () => {
	const fakeGitHubApi = new FakeGitHubApi(
		new Map(
			firstExample.tags.flatMap(({ tag, before }) =>
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
			Object.fromEntries(
				firstExample.tags.map(({ tag, after }) => [tag, after]),
			),
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
				new URL(
					"../.github/actions/semantic-version-tagger/src/index.ts",
					import.meta.url,
				).pathname,
			],
			{
				env: {
					GITHUB_REPOSITORY: repository,
					GITHUB_TOKEN: "fake-token",
					GITHUB_API_URL: apiUrl,
					"INPUT_SEMANTIC-VERSION": firstExample.semanticVersion,
					INPUT_COMMIT: firstExample.commit,
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
