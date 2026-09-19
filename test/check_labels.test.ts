import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

type Requirement = "none" | "one" | "all" | "any";
type Requirements = Partial<Record<Requirement, string>>;

const standardLabels = ["major", "minor", "patch"];
const standardRows = [
	[1, []],
	[2, ["minor"]],
	[3, ["minor", "patch"]],
	[4, standardLabels],
] as const;

for (const requirement of ["none", "one", "all", "any"] as const) {
	for (const [pullRequestNumber, labels] of standardRows) {
		test(`executes Go label checker for ${requirement}, got ${labels.length}`, async () => {
			await assertScenario({
				pullRequestNumber,
				labels,
				requirements: { [requirement]: standardLabels.join(",") },
			});
		});
	}
}

for (const requirements of [
	{ none: standardLabels, one: standardLabels },
	{ none: standardLabels, one: standardLabels, all: standardLabels },
	{
		none: standardLabels,
		one: standardLabels,
		all: standardLabels,
		any: standardLabels,
	},
] satisfies Requirements[]) {
	for (const [pullRequestNumber, labels] of standardRows) {
		test(`executes Go label checker for ${Object.keys(requirements).join(", ")}, got ${labels.length}`, async () => {
			await assertScenario({
				pullRequestNumber,
				labels,
				requirements: toRequirements(requirements),
			});
		});
	}
}

const prefixRows = [
	[1, []],
	[5, ["type:fix"]],
	[6, ["type:fix", "type:feature"]],
	[7, ["type:fix", "type:feature", "type:documentation"]],
] as const;

for (const requirement of ["none", "one", "any"] as const) {
	for (const [pullRequestNumber, labels] of prefixRows) {
		test(`executes Go prefix label checker for ${requirement}, got ${labels.length}`, async () => {
			await assertScenario({
				pullRequestNumber,
				labels,
				requirements: { [requirement]: "type:" },
				prefixMode: true,
			});
		});
	}
}

for (const [pullRequestNumber, labels] of prefixRows) {
	test(`rejects Go prefix all-of check with ${labels.length} labels`, async () => {
		await assertScenario({
			pullRequestNumber,
			labels,
			requirements: { all: "type:" },
			prefixMode: true,
			expectedError:
				"The label checker does not support prefix checking with `all_of`, as that is not a logical combination.",
		});
	});
}

for (const requirement of ["none", "one", "any", "all"] as const) {
	test(`rejects multiple prefixes for ${requirement}`, async () => {
		await assertScenario({
			pullRequestNumber: 1,
			labels: [],
			requirements: { [requirement]: "type:,visibility/" },
			prefixMode: true,
			expectedError:
				"Currently the label checker only supports checking with one prefix, not multiple.",
		});
	});
}

async function assertScenario({
	pullRequestNumber,
	labels,
	requirements,
	prefixMode = false,
	expectedError,
}: {
	pullRequestNumber: number;
	labels: readonly string[];
	requirements: Requirements;
	prefixMode?: boolean;
	expectedError?: string;
}): Promise<void> {
	const result = await runLabelCheck({
		pullRequestNumber,
		labels: [...labels],
		requirements,
		prefixMode,
	});
	const messages = expectedError
		? { stdout: "", stderr: `::error:: ${expectedError}\n`, success: false }
		: expectedMessages(requirements, labels, prefixMode);

	assert.equal(result.status === 0, messages.success);
	assert.equal(result.stdout, `Checking GitHub labels ...\n${messages.stdout}`);
	assert.equal(result.stderr, messages.stderr);
	assert.equal(
		result.output,
		messages.success ? "label_check=success" : "label_check=failure",
	);
}

// Keep the expected message ordering aligned with Action.CheckLabels.
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: matrix expectation helper
function expectedMessages(
	requirements: Requirements,
	labels: readonly string[],
	prefixMode: boolean,
): { stdout: string; stderr: string; success: boolean } {
	const stdout: string[] = [];
	const stderr: string[] = [];

	for (const requirement of ["one", "none", "all", "any"] as const) {
		const expected = expectedMessageFor(
			requirement,
			requirements[requirement],
			labels,
			prefixMode,
		);
		if (expected) {
			(expected.passed ? stdout : stderr).push(expected.message);
		}
	}

	return {
		stdout: stdout.length > 0 ? `${stdout.join("\n")}\n` : "",
		stderr: stderr.length > 0 ? `::error:: ${stderr.join("\n")}\n` : "",
		success: stderr.length === 0,
	};
}

function expectedMessageFor(
	requirement: Requirement,
	configuredLabels: string | undefined,
	labels: readonly string[],
	prefixMode: boolean,
): { message: string; passed: boolean } | undefined {
	if (!configuredLabels) {
		return undefined;
	}

	const required = configuredLabels.split(",");
	const matchingLabels = matchingLabelsFor(required, labels, prefixMode);
	const passed = requirementPassed(
		requirement,
		matchingLabels.length,
		required.length,
	);

	return {
		message: formatMessage(
			requirement,
			required,
			matchingLabels,
			prefixMode,
			passed,
		),
		passed,
	};
}

function toRequirements(
	requirements: Partial<Record<Requirement, readonly string[]>>,
): Requirements {
	return {
		...(requirements.none ? { none: requirements.none.join(",") } : {}),
		...(requirements.one ? { one: requirements.one.join(",") } : {}),
		...(requirements.all ? { all: requirements.all.join(",") } : {}),
		...(requirements.any ? { any: requirements.any.join(",") } : {}),
	};
}

function matchingLabelsFor(
	required: readonly string[],
	labels: readonly string[],
	prefixMode: boolean,
): readonly string[] {
	if (prefixMode) {
		return labels.filter((label) => label.startsWith(required[0] ?? ""));
	}

	return labels.filter((label) => required.includes(label));
}

function requirementPassed(
	requirement: Requirement,
	matchingCount: number,
	requiredCount: number,
): boolean {
	switch (requirement) {
		case "none":
			return matchingCount === 0;
		case "one":
			return matchingCount === 1;
		case "all":
			return matchingCount === requiredCount;
		case "any":
			return matchingCount > 0;
	}
}

function formatMessage(
	requirement: Requirement,
	required: readonly string[],
	matchingLabels: readonly string[],
	prefixMode: boolean,
	passed: boolean,
): string {
	const requiredText = prefixMode
		? `prefixed with '${required[0]}'`
		: `of '${required.join("', '")}'`;
	const foundText =
		matchingLabels.length === 0 ? "." : `: '${matchingLabels.join("', '")}'`;
	const conjunction = passed ? "and" : "but";

	return `Label check ${passed ? "successful" : "failed"}: required ${requirement === "one" ? "1" : requirement} ${requiredText}, ${conjunction} found ${matchingLabels.length}${foundText}`;
}

async function runLabelCheck({
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

function createAdapterEnvironment({
	endpoint,
	enterprisePlatform,
	eventPath,
	outputPath,
	enterpriseServer,
	requirements,
	prefixMode,
}: {
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
						? "https://example.com/api/graphql"
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
