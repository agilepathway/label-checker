import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

test("executes the Go label checker for Need one, got one", async () => {
	const result = await runLabelCheck({
		pullRequestNumber: 2,
		labels: ["minor"],
	});

	assert.equal(result.status, 0);
	assert.equal(
		result.stdout,
		"Checking GitHub labels ...\n" +
			"Label check successful: required 1 of 'major', 'minor', 'patch', and found 1: 'minor'\n",
	);
	assert.equal(result.stderr, "");
	assert.equal(result.output, "label_check=success");
});

test("executes the Go label checker for Need one, got none", async () => {
	const result = await runLabelCheck({ pullRequestNumber: 1, labels: [] });

	assert.notEqual(result.status, 0);
	assert.equal(result.stdout, "Checking GitHub labels ...\n");
	assert.equal(
		result.stderr,
		"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 0.\n",
	);
	assert.equal(result.output, "label_check=failure");
});

test("executes the Go label checker for Need all, got one", async () => {
	const result = await runLabelCheck({
		pullRequestNumber: 1,
		labels: ["minor"],
		requirement: "all",
	});

	assert.notEqual(result.status, 0);
	assert.equal(result.stdout, "Checking GitHub labels ...\n");
	assert.equal(
		result.stderr,
		"::error:: Label check failed: required all of 'major', 'minor', 'patch', but found 1: 'minor'\n",
	);
	assert.equal(result.output, "label_check=failure");
});

async function runLabelCheck({
	pullRequestNumber,
	labels,
	requirement = "one",
}: {
	pullRequestNumber: number;
	labels: string[];
	requirement?: "one" | "all";
}): Promise<{
	status: number | null;
	stdout: string;
	stderr: string;
	output: string;
}> {
	const integration = process.env.TEST_MODE === "integration";
	const enterprisePlatform = process.env.TEST_GITHUB_PLATFORM;
	const enterpriseServer = enterprisePlatform === "enterprise-server";
	console.log(`Running in ${integration ? "integration" : "virtual"} mode`);

	const directory = mkdtempSync(join(tmpdir(), "label-checker-"));
	const adapter = join(directory, "go-adapter");
	const eventPath = join(directory, "event.json");
	const outputPath = join(directory, "github-output");
	const server = integration
		? undefined
		: createServer((request, response) => {
				if (enterpriseServer && request.url !== "/api/graphql") {
					response.statusCode = 404;
					response.end();
					return;
				}

				response.setHeader("content-type", "application/json");
				response.end(
					JSON.stringify({
						data: {
							repository: {
								pullRequest: {
									labels: {
										nodes: labels.map((name) => ({ name })),
									},
								},
							},
						},
					}),
				);
			});

	execFileSync("go", ["build", "-o", adapter, "./test/fixtures/go-adapter"]);
	writeFileSync(
		eventPath,
		JSON.stringify({ pull_request: { number: pullRequestNumber } }),
	);
	writeFileSync(outputPath, "");
	const endpoint = await startServer(server);

	try {
		const result = await new Promise<{
			status: number | null;
			stdout: string;
			stderr: string;
		}>((resolve, reject) => {
			const child = spawn(adapter, {
				env: createAdapterEnvironment({
					endpoint,
					enterprisePlatform,
					eventPath,
					outputPath,
					enterpriseServer,
					requirement,
				}),
			});
			collectProcessResult(child).then(resolve, reject);
		});

		return { ...result, output: readFileSync(outputPath, "utf8") };
	} finally {
		await closeServer(server);
	}
}

function createAdapterEnvironment({
	endpoint,
	enterprisePlatform,
	eventPath,
	outputPath,
	enterpriseServer,
	requirement,
}: {
	endpoint: string | undefined;
	enterprisePlatform: string | undefined;
	eventPath: string;
	outputPath: string;
	enterpriseServer: boolean;
	requirement: "one" | "all";
}): NodeJS.ProcessEnv {
	const {
		GITHUB_API_URL: _githubApiURL,
		INPUT_GITHUB_ENTERPRISE_GRAPHQL_URL: _enterpriseEndpoint,
		...environment
	} = process.env;

	return {
		...environment,
		GITHUB_REPOSITORY: "agilepathway/test-label-checker-consumer",
		GITHUB_EVENT_PATH: eventPath,
		GITHUB_OUTPUT: outputPath,
		...(endpoint ? { GITHUB_API_URL: endpoint } : {}),
		...(enterprisePlatform
			? {
					INPUT_GITHUB_ENTERPRISE_GRAPHQL_URL: enterpriseServer
						? "https://example.com/api/graphql"
						: (endpoint ?? "https://api.github.com/graphql"),
				}
			: {}),
		...createRequirementEnvironment(requirement),
	};
}

function createRequirementEnvironment(
	requirement: "one" | "all",
): Pick<NodeJS.ProcessEnv, "INPUT_ONE_OF" | "INPUT_ALL_OF"> {
	if (requirement === "all") {
		return { INPUT_ALL_OF: "major,minor,patch" };
	}

	return { INPUT_ONE_OF: "major,minor,patch" };
}

function collectProcessResult(child: ReturnType<typeof spawn>): Promise<{
	status: number | null;
	stdout: string;
	stderr: string;
}> {
	return new Promise((resolve, reject) => {
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
}

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
