import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

test("executes the Go label checker for Need one, got one", async () => {
	const integration = process.env.TEST_MODE === "integration";
	console.log(`Running in ${integration ? "integration" : "virtual"} mode`);

	const directory = mkdtempSync(join(tmpdir(), "label-checker-"));
	const adapter = join(directory, "go-adapter");
	const eventPath = join(directory, "event.json");
	const outputPath = join(directory, "github-output");
	const server = integration
		? undefined
		: createServer((_request, response) => {
				response.setHeader("content-type", "application/json");
				response.end(
					JSON.stringify({
						data: {
							repository: {
								pullRequest: {
									labels: {
										nodes: [{ name: "minor" }],
									},
								},
							},
						},
					}),
				);
			});

	execFileSync("go", ["build", "-o", adapter, "./test/fixtures/go-adapter"]);
	writeFileSync(eventPath, JSON.stringify({ pull_request: { number: 2 } }));
	writeFileSync(outputPath, "");
	const endpoint = await startServer(server);

	try {
		const result = await new Promise<{
			status: number | null;
			stdout: string;
			stderr: string;
		}>((resolve, reject) => {
			const { GITHUB_API_URL: _githubApiURL, ...environment } = process.env;
			const child = spawn(adapter, {
				env: {
					...environment,
					GITHUB_REPOSITORY: "agilepathway/test-label-checker-consumer",
					GITHUB_EVENT_PATH: eventPath,
					GITHUB_OUTPUT: outputPath,
					...(endpoint ? { GITHUB_API_URL: endpoint } : {}),
					INPUT_ONE_OF: "major,minor,patch",
				},
			});
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

		assert.equal(result.status, 0);
		assert.equal(
			result.stdout,
			"Checking GitHub labels ...\n" +
				"Label check successful: required 1 of 'major', 'minor', 'patch', and found 1: 'minor'\n",
		);
		assert.equal(result.stderr, "");
		assert.equal(readFileSync(outputPath, "utf8"), "label_check=success");
	} finally {
		await closeServer(server);
	}
});

async function startServer(
	server: ReturnType<typeof createServer> | undefined,
): Promise<string | undefined> {
	if (!server) {
		return undefined;
	}

	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
	const address = server.address();
	assert(address && typeof address !== "string");
	return `http://127.0.0.1:${address.port}`;
}

async function closeServer(
	server: ReturnType<typeof createServer> | undefined,
): Promise<void> {
	if (!server) {
		return;
	}

	await new Promise<void>((resolve, reject) => {
		server.close((error) => (error ? reject(error) : resolve()));
	});
}
