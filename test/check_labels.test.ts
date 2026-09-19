import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

type Requirement = "none" | "one" | "all" | "any";
type Requirements = Partial<Record<Requirement, string>>;
type Scenario = {
	name: string;
	pullRequestNumber: number;
	labels: string[];
	requirements: Requirements;
	prefixMode?: boolean;
	status: number;
	stdout: string;
	stderr: string;
	output: string;
};

const scenarios: Scenario[] = [
	{
		name: "none, got 0",
		pullRequestNumber: 1,
		labels: [],
		requirements: { none: "major,minor,patch" },
		status: 0,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required none of 'major', 'minor', 'patch', and found 0.\n",
		stderr: "",
		output: "label_check=success",
	},
	{
		name: "none, got 1",
		pullRequestNumber: 2,
		labels: ["minor"],
		requirements: { none: "major,minor,patch" },
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required none of 'major', 'minor', 'patch', but found 1: 'minor'\n",
		output: "label_check=failure",
	},
	{
		name: "none, got 2",
		pullRequestNumber: 3,
		labels: ["minor", "patch"],
		requirements: { none: "major,minor,patch" },
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required none of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\n",
		output: "label_check=failure",
	},
	{
		name: "none, got 3",
		pullRequestNumber: 4,
		labels: ["major", "minor", "patch"],
		requirements: { none: "major,minor,patch" },
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required none of 'major', 'minor', 'patch', but found 3: 'major', 'minor', 'patch'\n",
		output: "label_check=failure",
	},
	{
		name: "one, got 0",
		pullRequestNumber: 1,
		labels: [],
		requirements: { one: "major,minor,patch" },
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 0.\n",
		output: "label_check=failure",
	},
	{
		name: "one, got 1",
		pullRequestNumber: 2,
		labels: ["minor"],
		requirements: { one: "major,minor,patch" },
		status: 0,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required 1 of 'major', 'minor', 'patch', and found 1: 'minor'\n",
		stderr: "",
		output: "label_check=success",
	},
	{
		name: "one, got 2",
		pullRequestNumber: 3,
		labels: ["minor", "patch"],
		requirements: { one: "major,minor,patch" },
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\n",
		output: "label_check=failure",
	},
	{
		name: "one, got 3",
		pullRequestNumber: 4,
		labels: ["major", "minor", "patch"],
		requirements: { one: "major,minor,patch" },
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 3: 'major', 'minor', 'patch'\n",
		output: "label_check=failure",
	},
	{
		name: "all, got 0",
		pullRequestNumber: 1,
		labels: [],
		requirements: { all: "major,minor,patch" },
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required all of 'major', 'minor', 'patch', but found 0.\n",
		output: "label_check=failure",
	},
	{
		name: "all, got 1",
		pullRequestNumber: 2,
		labels: ["minor"],
		requirements: { all: "major,minor,patch" },
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required all of 'major', 'minor', 'patch', but found 1: 'minor'\n",
		output: "label_check=failure",
	},
	{
		name: "all, got 2",
		pullRequestNumber: 3,
		labels: ["minor", "patch"],
		requirements: { all: "major,minor,patch" },
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required all of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\n",
		output: "label_check=failure",
	},
	{
		name: "all, got 3",
		pullRequestNumber: 4,
		labels: ["major", "minor", "patch"],
		requirements: { all: "major,minor,patch" },
		status: 0,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required all of 'major', 'minor', 'patch', and found 3: 'major', 'minor', 'patch'\n",
		stderr: "",
		output: "label_check=success",
	},
	{
		name: "any, got 0",
		pullRequestNumber: 1,
		labels: [],
		requirements: { any: "major,minor,patch" },
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required any of 'major', 'minor', 'patch', but found 0.\n",
		output: "label_check=failure",
	},
	{
		name: "any, got 1",
		pullRequestNumber: 2,
		labels: ["minor"],
		requirements: { any: "major,minor,patch" },
		status: 0,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required any of 'major', 'minor', 'patch', and found 1: 'minor'\n",
		stderr: "",
		output: "label_check=success",
	},
	{
		name: "any, got 2",
		pullRequestNumber: 3,
		labels: ["minor", "patch"],
		requirements: { any: "major,minor,patch" },
		status: 0,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required any of 'major', 'minor', 'patch', and found 2: 'minor', 'patch'\n",
		stderr: "",
		output: "label_check=success",
	},
	{
		name: "any, got 3",
		pullRequestNumber: 4,
		labels: ["major", "minor", "patch"],
		requirements: { any: "major,minor,patch" },
		status: 0,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required any of 'major', 'minor', 'patch', and found 3: 'major', 'minor', 'patch'\n",
		stderr: "",
		output: "label_check=success",
	},
	{
		name: "[none, one], got 0",
		pullRequestNumber: 1,
		labels: [],
		requirements: { none: "major,minor,patch", one: "major,minor,patch" },
		status: 1,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required none of 'major', 'minor', 'patch', and found 0.\n",
		stderr:
			"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 0.\n",
		output: "label_check=failure",
	},
	{
		name: "[none, one], got 1",
		pullRequestNumber: 2,
		labels: ["minor"],
		requirements: { none: "major,minor,patch", one: "major,minor,patch" },
		status: 1,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required 1 of 'major', 'minor', 'patch', and found 1: 'minor'\n",
		stderr:
			"::error:: Label check failed: required none of 'major', 'minor', 'patch', but found 1: 'minor'\n",
		output: "label_check=failure",
	},
	{
		name: "[none, one], got 2",
		pullRequestNumber: 3,
		labels: ["minor", "patch"],
		requirements: { none: "major,minor,patch", one: "major,minor,patch" },
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\nLabel check failed: required none of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\n",
		output: "label_check=failure",
	},
	{
		name: "[none, one], got 3",
		pullRequestNumber: 4,
		labels: ["major", "minor", "patch"],
		requirements: { none: "major,minor,patch", one: "major,minor,patch" },
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 3: 'major', 'minor', 'patch'\nLabel check failed: required none of 'major', 'minor', 'patch', but found 3: 'major', 'minor', 'patch'\n",
		output: "label_check=failure",
	},
	{
		name: "[none, one, all], got 0",
		pullRequestNumber: 1,
		labels: [],
		requirements: {
			none: "major,minor,patch",
			one: "major,minor,patch",
			all: "major,minor,patch",
		},
		status: 1,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required none of 'major', 'minor', 'patch', and found 0.\n",
		stderr:
			"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 0.\nLabel check failed: required all of 'major', 'minor', 'patch', but found 0.\n",
		output: "label_check=failure",
	},
	{
		name: "[none, one, all], got 1",
		pullRequestNumber: 2,
		labels: ["minor"],
		requirements: {
			none: "major,minor,patch",
			one: "major,minor,patch",
			all: "major,minor,patch",
		},
		status: 1,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required 1 of 'major', 'minor', 'patch', and found 1: 'minor'\n",
		stderr:
			"::error:: Label check failed: required none of 'major', 'minor', 'patch', but found 1: 'minor'\nLabel check failed: required all of 'major', 'minor', 'patch', but found 1: 'minor'\n",
		output: "label_check=failure",
	},
	{
		name: "[none, one, all], got 2",
		pullRequestNumber: 3,
		labels: ["minor", "patch"],
		requirements: {
			none: "major,minor,patch",
			one: "major,minor,patch",
			all: "major,minor,patch",
		},
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\nLabel check failed: required none of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\nLabel check failed: required all of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\n",
		output: "label_check=failure",
	},
	{
		name: "[none, one, all], got 3",
		pullRequestNumber: 4,
		labels: ["major", "minor", "patch"],
		requirements: {
			none: "major,minor,patch",
			one: "major,minor,patch",
			all: "major,minor,patch",
		},
		status: 1,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required all of 'major', 'minor', 'patch', and found 3: 'major', 'minor', 'patch'\n",
		stderr:
			"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 3: 'major', 'minor', 'patch'\nLabel check failed: required none of 'major', 'minor', 'patch', but found 3: 'major', 'minor', 'patch'\n",
		output: "label_check=failure",
	},
	{
		name: "[none, one, all, any], got 0",
		pullRequestNumber: 1,
		labels: [],
		requirements: {
			none: "major,minor,patch",
			one: "major,minor,patch",
			all: "major,minor,patch",
			any: "major,minor,patch",
		},
		status: 1,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required none of 'major', 'minor', 'patch', and found 0.\n",
		stderr:
			"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 0.\nLabel check failed: required all of 'major', 'minor', 'patch', but found 0.\nLabel check failed: required any of 'major', 'minor', 'patch', but found 0.\n",
		output: "label_check=failure",
	},
	{
		name: "[none, one, all, any], got 1",
		pullRequestNumber: 2,
		labels: ["minor"],
		requirements: {
			none: "major,minor,patch",
			one: "major,minor,patch",
			all: "major,minor,patch",
			any: "major,minor,patch",
		},
		status: 1,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required 1 of 'major', 'minor', 'patch', and found 1: 'minor'\nLabel check successful: required any of 'major', 'minor', 'patch', and found 1: 'minor'\n",
		stderr:
			"::error:: Label check failed: required none of 'major', 'minor', 'patch', but found 1: 'minor'\nLabel check failed: required all of 'major', 'minor', 'patch', but found 1: 'minor'\n",
		output: "label_check=failure",
	},
	{
		name: "[none, one, all, any], got 2",
		pullRequestNumber: 3,
		labels: ["minor", "patch"],
		requirements: {
			none: "major,minor,patch",
			one: "major,minor,patch",
			all: "major,minor,patch",
			any: "major,minor,patch",
		},
		status: 1,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required any of 'major', 'minor', 'patch', and found 2: 'minor', 'patch'\n",
		stderr:
			"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\nLabel check failed: required none of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\nLabel check failed: required all of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\n",
		output: "label_check=failure",
	},
	{
		name: "[none, one, all, any], got 3",
		pullRequestNumber: 4,
		labels: ["major", "minor", "patch"],
		requirements: {
			none: "major,minor,patch",
			one: "major,minor,patch",
			all: "major,minor,patch",
			any: "major,minor,patch",
		},
		status: 1,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required all of 'major', 'minor', 'patch', and found 3: 'major', 'minor', 'patch'\nLabel check successful: required any of 'major', 'minor', 'patch', and found 3: 'major', 'minor', 'patch'\n",
		stderr:
			"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 3: 'major', 'minor', 'patch'\nLabel check failed: required none of 'major', 'minor', 'patch', but found 3: 'major', 'minor', 'patch'\n",
		output: "label_check=failure",
	},
	{
		name: "prefix none, got 0",
		pullRequestNumber: 1,
		labels: [],
		requirements: { none: "type:" },
		prefixMode: true,
		status: 0,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required none prefixed with 'type:', and found 0.\n",
		stderr: "",
		output: "label_check=success",
	},
	{
		name: "prefix none, got 1",
		pullRequestNumber: 5,
		labels: ["type:fix"],
		requirements: { none: "type:" },
		prefixMode: true,
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required none prefixed with 'type:', but found 1: 'type:fix'\n",
		output: "label_check=failure",
	},
	{
		name: "prefix none, got 2",
		pullRequestNumber: 6,
		labels: ["type:fix", "type:feature"],
		requirements: { none: "type:" },
		prefixMode: true,
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required none prefixed with 'type:', but found 2: 'type:fix', 'type:feature'\n",
		output: "label_check=failure",
	},
	{
		name: "prefix none, got 3",
		pullRequestNumber: 7,
		labels: ["type:fix", "type:feature", "type:documentation"],
		requirements: { none: "type:" },
		prefixMode: true,
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required none prefixed with 'type:', but found 3: 'type:fix', 'type:feature', 'type:documentation'\n",
		output: "label_check=failure",
	},
	{
		name: "prefix one, got 0",
		pullRequestNumber: 1,
		labels: [],
		requirements: { one: "type:" },
		prefixMode: true,
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required 1 prefixed with 'type:', but found 0.\n",
		output: "label_check=failure",
	},
	{
		name: "prefix one, got 1",
		pullRequestNumber: 5,
		labels: ["type:fix"],
		requirements: { one: "type:" },
		prefixMode: true,
		status: 0,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required 1 prefixed with 'type:', and found 1: 'type:fix'\n",
		stderr: "",
		output: "label_check=success",
	},
	{
		name: "prefix one, got 2",
		pullRequestNumber: 6,
		labels: ["type:fix", "type:feature"],
		requirements: { one: "type:" },
		prefixMode: true,
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required 1 prefixed with 'type:', but found 2: 'type:fix', 'type:feature'\n",
		output: "label_check=failure",
	},
	{
		name: "prefix one, got 3",
		pullRequestNumber: 7,
		labels: ["type:fix", "type:feature", "type:documentation"],
		requirements: { one: "type:" },
		prefixMode: true,
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required 1 prefixed with 'type:', but found 3: 'type:fix', 'type:feature', 'type:documentation'\n",
		output: "label_check=failure",
	},
	{
		name: "prefix any, got 0",
		pullRequestNumber: 1,
		labels: [],
		requirements: { any: "type:" },
		prefixMode: true,
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required any prefixed with 'type:', but found 0.\n",
		output: "label_check=failure",
	},
	{
		name: "prefix any, got 1",
		pullRequestNumber: 5,
		labels: ["type:fix"],
		requirements: { any: "type:" },
		prefixMode: true,
		status: 0,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required any prefixed with 'type:', and found 1: 'type:fix'\n",
		stderr: "",
		output: "label_check=success",
	},
	{
		name: "prefix any, got 2",
		pullRequestNumber: 6,
		labels: ["type:fix", "type:feature"],
		requirements: { any: "type:" },
		prefixMode: true,
		status: 0,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required any prefixed with 'type:', and found 2: 'type:fix', 'type:feature'\n",
		stderr: "",
		output: "label_check=success",
	},
	{
		name: "prefix any, got 3",
		pullRequestNumber: 7,
		labels: ["type:fix", "type:feature", "type:documentation"],
		requirements: { any: "type:" },
		prefixMode: true,
		status: 0,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required any prefixed with 'type:', and found 3: 'type:fix', 'type:feature', 'type:documentation'\n",
		stderr: "",
		output: "label_check=success",
	},
	{
		name: "prefix [none, one], got none",
		pullRequestNumber: 1,
		labels: [],
		requirements: { none: "type:", one: "type:" },
		prefixMode: true,
		status: 1,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required none prefixed with 'type:', and found 0.\n",
		stderr:
			"::error:: Label check failed: required 1 prefixed with 'type:', but found 0.\n",
		output: "label_check=failure",
	},
];

for (const scenario of scenarios) {
	test(`executes Go label checker for ${scenario.name}`, async () => {
		const result = await runLabelCheck({
			pullRequestNumber: scenario.pullRequestNumber,
			labels: scenario.labels,
			requirements: scenario.requirements,
			prefixMode: scenario.prefixMode,
		});

		assert.equal(result.status, scenario.status);
		assert.equal(result.stdout, scenario.stdout);
		assert.equal(result.stderr, scenario.stderr);
		assert.equal(result.output, scenario.output);
	});
}

for (const scenario of [
	{
		name: "all",
		requirements: { all: "type:" },
		stderr:
			"::error:: The label checker does not support prefix checking with `all_of`, as that is not a logical combination.\n",
	},
	{
		name: "none",
		requirements: { none: "type:,visibility/" },
		stderr:
			"::error:: Currently the label checker only supports checking with one prefix, not multiple.\n",
	},
	{
		name: "one",
		requirements: { one: "type:,visibility/" },
		stderr:
			"::error:: Currently the label checker only supports checking with one prefix, not multiple.\n",
	},
	{
		name: "any",
		requirements: { any: "type:,visibility/" },
		stderr:
			"::error:: Currently the label checker only supports checking with one prefix, not multiple.\n",
	},
] as const) {
	test(`rejects prefix ${scenario.name} configuration`, async () => {
		const result = await runLabelCheck({
			pullRequestNumber: 1,
			labels: [],
			requirements: scenario.requirements,
			prefixMode: true,
		});

		assert.equal(result.status, 1);
		assert.equal(result.stdout, "Checking GitHub labels ...\n");
		assert.equal(result.stderr, scenario.stderr);
		assert.equal(result.output, "label_check=failure");
	});
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
