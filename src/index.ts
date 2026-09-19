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

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The action coordinates its observable steps.
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

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: This preserves the required check ordering.
function runChecks(
	checks: readonly (readonly [Requirement, string[]])[],
	labels: string[],
	prefixMode: boolean,
): { success: string; failure: string } {
	let success = "";
	let failure = "";
	for (const [kind, specified] of checks) {
		if (specified.length === 0) continue;
		const result = checkLabels(kind, specified, labels, prefixMode);
		if (result.error) failure += `${result.error}\n`;
		else if (result.valid) success += `${result.message}\n`;
		else failure += `${result.message}\n`;
	}
	return { success, failure };
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The four contract predicates are intentionally explicit.
function checkLabels(
	kind: Requirement,
	specified: string[],
	labels: string[],
	prefixMode: boolean,
): { valid: boolean; message: string; error?: string } {
	if (prefixMode && specified.length > 1) {
		return {
			valid: false,
			message: "",
			error:
				"Currently the label checker only supports checking with one prefix, not multiple.",
		};
	}
	if (prefixMode && kind === "all") {
		return {
			valid: false,
			message: "",
			error:
				"The label checker does not support prefix checking with `all_of`, as that is not a logical combination.",
		};
	}
	const found = labels.filter((label) =>
		prefixMode
			? specified.some((prefix) => label.startsWith(prefix))
			: specified.includes(label),
	);
	const valid =
		kind === "any"
			? found.length > 0
			: kind === "none"
				? found.length === 0
				: kind === "one"
					? found.length === 1
					: found.length === specified.length;
	return {
		valid,
		message: formatMessage(kind, specified, found, prefixMode, valid),
	};
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
