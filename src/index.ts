import { appendFileSync, readFileSync } from "node:fs";

type Requirement = "none" | "one" | "all" | "any";

const query =
	"query(" +
	// biome-ignore lint/security/noSecrets: This is a static GraphQL query, not a credential.
	"$name:String!$owner:String!$pullRequestNumber:Int!" +
	// biome-ignore lint/security/noSecrets: This is a static GraphQL query, not a credential.
	"){repository(owner: $owner, name: $name){pullRequest(number: $pullRequestNumber)" +
	// biome-ignore lint/security/noSecrets: This is a static GraphQL query, not a credential.
	"{labels(first: 100){nodes{name}}}}}";

type Event = { pull_request?: { number?: number } };
type GraphQLResponse = {
	data?: {
		repository?: { pullRequest?: { labels?: { nodes?: { name: string }[] } } };
	};
	errors?: unknown;
};

export async function main(): Promise<void> {
	process.stdout.write("Checking GitHub labels ...\n");

	const event: Event = JSON.parse(
		readFileSync(requiredEnvironment("GITHUB_EVENT_PATH"), "utf8"),
	);
	const repository = requiredEnvironment("GITHUB_REPOSITORY").split("/");
	const labels = await fetchLabels(
		repository[0] ?? "",
		repository[1] ?? "",
		event.pull_request?.number ?? 0,
	);
	const prefixMode = process.env.INPUT_PREFIX_MODE === "true";
	const checks = [
		["one", readRequirements("INPUT_ONE_OF")],
		["none", readRequirements("INPUT_NONE_OF")],
		["all", readRequirements("INPUT_ALL_OF")],
		["any", readRequirements("INPUT_ANY_OF")],
	] as const;
	const { success, failure } = runChecks(checks, labels, prefixMode);

	reportResults(success, failure);
}

function reportResults(success: string, failure: string): void {
	if (success) process.stdout.write(`${success.trimEnd()}\n`);
	writeOutput(failure ? "failure" : "success");
	if (failure) {
		process.stderr.write(`::error:: ${failure.trimEnd()}\n`);
		if (process.env.INPUT_ALLOW_FAILURE !== "true") process.exitCode = 1;
	}
}

function requiredEnvironment(name: string): string {
	const value = process.env[name];
	if (!value) throw new Error(`Missing required environment variable: ${name}`);
	return value;
}

function readRequirements(name: string): string[] {
	const value = process.env[name];
	return value?.trim() ? value.split(",") : [];
}

function runChecks(
	checks: readonly (readonly [Requirement, string[]])[],
	labels: string[],
	prefixMode: boolean,
): { success: string; failure: string } {
	let success = "";
	let failure = "";
	for (const [kind, specified] of checks) {
		if (specified.length === 0) continue;
		const result = formatCheckResult(
			checkLabels(kind, specified, labels, prefixMode),
		);
		success += result.success;
		failure += result.failure;
	}
	return { success, failure };
}

function formatCheckResult(result: {
	valid: boolean;
	message: string;
	error?: string;
}): { success: string; failure: string } {
	if (result.error) return { success: "", failure: `${result.error}\n` };
	if (result.valid) return { success: `${result.message}\n`, failure: "" };
	return { success: "", failure: `${result.message}\n` };
}

function checkLabels(
	kind: Requirement,
	specified: string[],
	labels: string[],
	prefixMode: boolean,
): { valid: boolean; message: string; error?: string } {
	const checkError = getCheckError(kind, specified, prefixMode);
	if (checkError.error) {
		return { valid: false, message: "", error: checkError.error };
	}
	const found = labels.filter((label) =>
		prefixMode
			? specified.some((prefix) => label.startsWith(prefix))
			: specified.includes(label),
	);
	const valid = isValidRequirement(kind, found.length, specified.length);
	return {
		valid,
		message: formatMessage(kind, specified, found, prefixMode, valid),
	};
}

function getCheckError(
	kind: Requirement,
	specified: string[],
	prefixMode: boolean,
): { error?: string } {
	if (prefixMode && specified.length > 1) {
		return {
			error:
				"Currently the label checker only supports checking with one prefix, not multiple.",
		};
	}
	if (prefixMode && kind === "all") {
		return {
			error:
				"The label checker does not support prefix checking with `all_of`, as that is not a logical combination.",
		};
	}
	return {};
}

function isValidRequirement(
	kind: Requirement,
	foundCount: number,
	specifiedCount: number,
): boolean {
	const validators: Record<
		Requirement,
		(found: number, specified: number) => boolean
	> = {
		any: (found: number) => found > 0,
		none: (found: number) => found === 0,
		one: (found: number) => found === 1,
		all: (found: number, specified: number) => found === specified,
	};
	return validators[kind](foundCount, specifiedCount);
}

function formatMessage(
	kind: Requirement,
	specified: string[],
	found: string[],
	prefixMode: boolean,
	valid: boolean,
): string {
	const required = specified.map((label) => `'${label}'`).join(", ");
	const foundDescription = found.length
		? `: ${found.map((label) => `'${label}'`).join(", ")}`
		: ".";
	return `Label check ${valid ? "successful" : "failed"}: required ${kind === "one" ? "1" : kind} ${prefixMode ? "prefixed with" : "of"} ${required}, ${valid ? "and" : "but"} found ${found.length}${foundDescription}`;
}

async function fetchLabels(
	owner: string,
	name: string,
	pullRequestNumber: number,
): Promise<string[]> {
	const response = await fetch(getGraphQLEndpoint(), {
		method: "POST",
		headers: {
			authorization: `bearer ${process.env.INPUT_REPO_TOKEN ?? ""}`,
			"content-type": "application/json",
		},
		body: JSON.stringify({
			query,
			variables: { name, owner, pullRequestNumber },
		}),
	});
	if (!response.ok) {
		throw new Error(
			`GitHub GraphQL request failed with status ${response.status}`,
		);
	}
	const body: GraphQLResponse = await response.json();
	if (body.errors) throw new Error("GitHub GraphQL request returned errors");
	return (
		body.data?.repository?.pullRequest?.labels?.nodes?.map(
			({ name: label }) => label,
		) ?? []
	);
}

function getGraphQLEndpoint(): string {
	const enterpriseEndpoint = process.env.INPUT_GITHUB_ENTERPRISE_GRAPHQL_URL;
	if (enterpriseEndpoint) return enterpriseEndpoint;
	const apiURL = process.env.GITHUB_API_URL ?? "https://api.github.com";
	return apiURL.endsWith("/graphql") ? apiURL : `${apiURL}/graphql`;
}

function writeOutput(result: "success" | "failure"): void {
	appendFileSync(requiredEnvironment("GITHUB_OUTPUT"), `label_check=${result}`);
}

main().catch((error: unknown) => {
	process.stderr.write(
		`${error instanceof Error ? error.message : String(error)}\n`,
	);
	process.exitCode = 1;
});
