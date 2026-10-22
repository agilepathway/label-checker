import { appendFileSync } from "node:fs";

type Increment = "major" | "minor" | "patch";
type Version = {
	major: bigint;
	minor: bigint;
	patch: bigint;
};

const semanticVersionPattern = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

async function main(): Promise<void> {
	const increment = parseIncrement(process.env.INPUT_INCREMENT);
	const repository = requiredEnvironment("GITHUB_REPOSITORY");
	const token = requiredEnvironment("GITHUB_TOKEN");
	const tags = await fetchTags(
		token,
		process.env.GITHUB_API_URL ?? "https://api.github.com",
		repository,
	);
	const versions = tags.flatMap((tag) => {
		const version = parseVersion(tag);
		return version ? [{ tag, version }] : [];
	});

	if (versions.length === 0) {
		throw new Error("No valid semantic version tags exist in the repository.");
	}

	const highest = versions.reduce((current, candidate) =>
		compareVersions(candidate.version, current.version) > 0
			? candidate
			: current,
	);
	const nextVersion = incrementVersion(highest.version, increment);
	const formattedVersion = `v${nextVersion.major}.${nextVersion.minor}.${nextVersion.patch}`;

	appendFileSync(
		requiredEnvironment("GITHUB_OUTPUT"),
		`new-semantic-version=${formattedVersion}\n`,
	);
	process.stdout.write(`Calculated semantic version: ${formattedVersion}\n`);
}

function requiredEnvironment(name: string): string {
	const value = process.env[name];
	if (!value) throw new Error(`Missing required environment variable: ${name}`);
	return value;
}

function parseIncrement(value: string | undefined): Increment {
	const increment = value?.toLowerCase();
	if (increment === "major" || increment === "minor" || increment === "patch") {
		return increment;
	}
	throw new Error(
		`Invalid semantic version increment ${value ?? "(missing)"}; expected major, minor, or patch.`,
	);
}

function parseVersion(value: string): Version | undefined {
	const match = semanticVersionPattern.exec(value);
	if (!match) return undefined;

	const [, major, minor, patch] = match;
	if (major === undefined || minor === undefined || patch === undefined) {
		throw new Error(`Unable to parse semantic version tag ${value}.`);
	}
	return {
		major: BigInt(major),
		minor: BigInt(minor),
		patch: BigInt(patch),
	};
}

function compareVersions(left: Version, right: Version): -1 | 0 | 1 {
	for (const component of ["major", "minor", "patch"] as const) {
		if (left[component] > right[component]) return 1;
		if (left[component] < right[component]) return -1;
	}
	return 0;
}

function incrementVersion(version: Version, increment: Increment): Version {
	if (increment === "major") {
		return { major: version.major + 1n, minor: 0n, patch: 0n };
	}
	if (increment === "minor") {
		return { major: version.major, minor: version.minor + 1n, patch: 0n };
	}
	return {
		major: version.major,
		minor: version.minor,
		patch: version.patch + 1n,
	};
}

async function fetchTags(
	token: string,
	apiURL: string,
	repository: string,
): Promise<string[]> {
	const headers = {
		accept: "application/vnd.github+json",
		authorization: `Bearer ${token}`,
		"X-GitHub-Api-Version": "2022-11-28",
	};
	const baseURL = `${apiURL.replace(/\/$/, "")}/repos/${repository}/tags?per_page=100&page=1`;
	const apiOrigin = new URL(apiURL).origin;
	const tags: string[] = [];
	let nextPage: string | undefined = baseURL;

	while (nextPage) {
		const response = await fetch(nextPage, { headers });
		if (!response.ok) {
			const details = await response.text();
			throw new Error(
				`GitHub tag listing failed with status ${response.status}: ${details}`,
			);
		}

		tags.push(...(await readTagNames(response)));
		nextPage = nextPageURL(response.headers.get("link"), apiOrigin);
	}
	return tags;
}

async function readTagNames(response: Response): Promise<string[]> {
	const body: unknown = await response.json();
	if (!Array.isArray(body) || !body.every(isTag)) {
		throw new Error("GitHub tag listing returned an invalid response.");
	}
	return body.map(({ name }) => name);
}

function isTag(value: unknown): value is { name: string } {
	return (
		typeof value === "object" &&
		value !== null &&
		"name" in value &&
		typeof value.name === "string"
	);
}

function nextPageURL(
	linkHeader: string | null,
	apiOrigin: string,
): string | undefined {
	if (!linkHeader) return undefined;
	const nextLink = linkHeader
		.split(",")
		.find((link) => /;\s*rel="next"/.test(link));
	const match = nextLink?.match(/<([^>]+)>/);
	if (!match?.[1]) return undefined;

	const nextURL = new URL(match[1]);
	if (nextURL.origin !== apiOrigin) {
		throw new Error(
			"GitHub tag listing returned a cross-origin pagination URL.",
		);
	}
	return nextURL.toString();
}

main().catch((error: unknown) => {
	process.stderr.write(
		`${error instanceof Error ? error.message : String(error)}\n`,
	);
	process.exitCode = 1;
});
