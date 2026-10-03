// biome-ignore-all lint/security/noSecrets: These commit SHAs are copied verbatim from the spec.

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { FakeGitHubApi } from "./fake-github-api.ts";
import {
	existingAliasSemanticVersionTagRule,
	existingSemanticVersionTagRule,
	majorLevelSemanticVersionRule,
	minorLevelSemanticVersionRule,
	missingSemanticVersionTagsRule,
	patchLevelSemanticVersionRule,
} from "./semantic-version-test-definitions.ts";

function expandDescription<T extends { description: string }>(
	example: T,
): string {
	return example.description.replace(
		/\{([^}]+)\}/g,
		(_, parameterName: string) => {
			if (!Object.hasOwn(example, parameterName)) {
				throw new Error(
					`Example description references unknown parameter: ${parameterName}`,
				);
			}

			return String(Reflect.get(example, parameterName));
		},
	);
}

test("rejects unknown Example description parameters", () => {
	assert.throws(
		() => expandDescription({ description: "A `{missing}` value" }),
		{
			message: "Example description references unknown parameter: missing",
		},
	);
});

test("expands known Example description parameters", () => {
	const example = {
		description: "A {first} value and a {second} value",
		first: "one",
		second: "two",
	};

	assert.equal(expandDescription(example), "A one value and a two value");
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
		const result = await runAction(apiUrl, commit);

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

for (const rule of [
	patchLevelSemanticVersionRule,
	minorLevelSemanticVersionRule,
	majorLevelSemanticVersionRule,
	missingSemanticVersionTagsRule,
	existingSemanticVersionTagRule,
	existingAliasSemanticVersionTagRule,
]) {
	for (const example of rule.examples) {
		test(expandDescription(example), example.run.bind(example));
	}
}

function runAction(
	apiUrl: string,
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
					GITHUB_REPOSITORY: "agilepathway/semantic-version-tagger-spec",
					GITHUB_TOKEN: "fake-token",
					GITHUB_API_URL: apiUrl,
					"INPUT_SEMANTIC-VERSION": "v2.0.1",
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
