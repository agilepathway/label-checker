// biome-ignore-all lint/security/noSecrets: These are dummy commit SHAs and pose no risk.

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import type {
	Example,
	Table,
} from "../../../../shared/specification-by-example/src/specification-by-example.ts";
import {
	tableAt,
	textAt,
} from "../../../../shared/specification-by-example/src/specification-by-example.ts";
import type { ExampleTestImplementation } from "../../../../shared/specification-by-example/src/specification-test-registration.ts";
import { FakeGitHubApi } from "./fake-github-api.ts";

const repository = "agilepathway/semantic-version-tagger-spec";

async function runTaggingExample(example: Example): Promise<void> {
	const table = tableAt(example, 1);
	const fakeGitHubApi = new FakeGitHubApi(tagState(table, "Before"));
	const apiUrl = await fakeGitHubApi.start();

	try {
		const result = await runAction(
			apiUrl,
			textAt(example, 0).parameters.semanticVersion,
			textAt(example, 0).parameters.commit,
		);
		const resultIndex = table.headers.indexOf("Result");

		if (resultIndex >= 0) {
			assert.notEqual(result.status, null);
			assert.equal(
				result.status === 0 ? "Success" : "Error",
				table.rows[0][resultIndex],
			);
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

export const semanticVersionTaggingTestImplementations: ReadonlyMap<
	string,
	ExampleTestImplementation
> = new Map([
	["patch-version-creates-tags", runTaggingExample],
	["minor-version-creates-tags", runTaggingExample],
	["major-version-creates-tags", runTaggingExample],
	["creates-missing-alias-tags", runTaggingExample],
	["first-semantic-version", runTaggingExample],
	["adopts-latest-tag", runTaggingExample],
	["rejects-existing-version-tag", runTaggingExample],
	["moves-existing-alias-tags", runTaggingExample],
]);

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
