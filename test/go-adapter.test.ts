import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

test("executes the Go label checker through the test adapter", async () => {
	const directory = mkdtempSync(join(tmpdir(), "label-checker-"));
	const adapter = join(directory, "go-adapter");
	const eventPath = join(directory, "event.json");
	const outputPath = join(directory, "github-output");

	execFileSync("go", ["build", "-o", adapter, "./test/fixtures/go-adapter"]);
	writeFileSync(eventPath, JSON.stringify({ pull_request: { number: 2 } }));
	writeFileSync(outputPath, "");

	const server = createServer((_request, response) => {
		response.setHeader("content-type", "application/json");
		response.end(
			JSON.stringify({
				data: {
					repository: {
						pullRequest: {
							labels: { nodes: [{ name: "minor" }] },
						},
					},
				},
			}),
		);
	});

	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
	const address = server.address();
	assert(address && typeof address !== "string");

	try {
		const result = spawnSync(adapter, {
			encoding: "utf8",
			env: {
				...process.env,
				GITHUB_REPOSITORY: "agilepathway/test-label-checker-consumer",
				GITHUB_EVENT_PATH: eventPath,
				GITHUB_OUTPUT: outputPath,
				INPUT_GITHUB_ENTERPRISE_GRAPHQL_URL: `http://127.0.0.1:${address.port}`,
				INPUT_ONE_OF: "major,minor,patch",
				INPUT_REPO_TOKEN: "test-token",
			},
		});

		assert.equal(result.status, 0);
		assert.equal(
			result.stdout,
			"Checking GitHub labels ...\n" +
				"Label check successful: required 1 of 'major', 'minor', 'patch', and found 1: 'minor'\n",
		);
		assert.equal(result.stderr, "");
		assert.equal(readFileSync(outputPath, "utf8"), "label_check=success");
	} finally {
		server.close();
	}
});
