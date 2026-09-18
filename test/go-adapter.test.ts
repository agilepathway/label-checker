import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

test("executes the Go label checker against GitHub", async () => {
	const directory = mkdtempSync(join(tmpdir(), "label-checker-"));
	const adapter = join(directory, "go-adapter");
	const eventPath = join(directory, "event.json");
	const outputPath = join(directory, "github-output");

	execFileSync("go", ["build", "-o", adapter, "./test/fixtures/go-adapter"]);
	writeFileSync(eventPath, JSON.stringify({ pull_request: { number: 2 } }));
	writeFileSync(outputPath, "");

	const result = await new Promise<{
		status: number | null;
		stdout: string;
		stderr: string;
	}>((resolve, reject) => {
		const child = spawn(adapter, {
			env: {
				...process.env,
				GITHUB_REPOSITORY: "agilepathway/test-label-checker-consumer",
				GITHUB_EVENT_PATH: eventPath,
				GITHUB_OUTPUT: outputPath,
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
});
