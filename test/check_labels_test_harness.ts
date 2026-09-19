import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";

export type Requirement = "none" | "one" | "all" | "any";
export type Requirements = Partial<Record<Requirement, string>>;

let goAdapterPath: string | undefined;

export async function runLabelCheck({
	pullRequestNumber,
	labels,
	requirements,
	prefixMode = false,
}: {
	pullRequestNumber: number;
	labels: string[];
	requirements: Requirements;
	prefixMode?: boolean;
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
			const adapter = getAdapter();
			const child = spawn(adapter.command, adapter.args, {
				env: createAdapterEnvironment({
					implementation: adapter.implementation,
					endpoint,
					enterprisePlatform,
					eventPath,
					outputPath,
					enterpriseServer,
					requirements,
					prefixMode,
				}),
			});
			collectProcessResult(child).then(resolve, reject);
		});

		return { ...result, output: readFileSync(outputPath, "utf8") };
	} finally {
		await closeServer(server);
	}
}

function getAdapter(): {
	command: string;
	args: string[];
	implementation: "go" | "typescript";
} {
	if (process.env.TEST_IMPLEMENTATION !== "go") {
		return {
			command: process.execPath,
			args: [
				"--experimental-strip-types",
				new URL("../src/index.ts", import.meta.url).pathname,
			],
			implementation: "typescript",
		};
	}

	if (goAdapterPath) {
		return { command: goAdapterPath, args: [], implementation: "go" };
	}
	const directory = mkdtempSync(join(tmpdir(), "label-checker-"));
	goAdapterPath = join(directory, "go-adapter");
	execFileSync("go", [
		"build",
		"-o",
		goAdapterPath,
		"./test/fixtures/go-adapter",
	]);
	return { command: goAdapterPath, args: [], implementation: "go" };
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The environment mirrors both adapter modes and platforms.
function createAdapterEnvironment({
	implementation,
	endpoint,
	enterprisePlatform,
	eventPath,
	outputPath,
	enterpriseServer,
	requirements,
	prefixMode,
}: {
	implementation: "go" | "typescript";
	endpoint: string | undefined;
	enterprisePlatform: string | undefined;
	eventPath: string;
	outputPath: string;
	enterpriseServer: boolean;
	requirements: Requirements;
	prefixMode: boolean;
}): NodeJS.ProcessEnv {
	const {
		GITHUB_API_URL: _githubApiURL,
		INPUT_GITHUB_ENTERPRISE_GRAPHQL_URL: _enterpriseEndpoint,
		INPUT_ONE_OF: _inputOneOf,
		INPUT_ALL_OF: _inputAllOf,
		INPUT_NONE_OF: _inputNoneOf,
		INPUT_ANY_OF: _inputAnyOf,
		INPUT_PREFIX_MODE: _prefixMode,
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
						? implementation === "typescript"
							? `${endpoint}/api/graphql`
							: "https://example.com/api/graphql"
						: (endpoint ?? "https://api.github.com/graphql"),
				}
			: {}),
		...createRequirementEnvironment(requirements),
		...createPrefixModeEnvironment(prefixMode),
	};
}

function createPrefixModeEnvironment(
	prefixMode: boolean,
): Pick<NodeJS.ProcessEnv, "INPUT_PREFIX_MODE"> {
	if (prefixMode) {
		return { INPUT_PREFIX_MODE: "true" };
	}

	return {};
}

function createRequirementEnvironment(
	requirements: Requirements,
): Pick<
	NodeJS.ProcessEnv,
	"INPUT_NONE_OF" | "INPUT_ONE_OF" | "INPUT_ALL_OF" | "INPUT_ANY_OF"
> {
	return {
		...(requirements.none ? { INPUT_NONE_OF: requirements.none } : {}),
		...(requirements.one ? { INPUT_ONE_OF: requirements.one } : {}),
		...(requirements.all ? { INPUT_ALL_OF: requirements.all } : {}),
		...(requirements.any ? { INPUT_ANY_OF: requirements.any } : {}),
	};
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
