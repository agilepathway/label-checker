type TagParts = {
	major: string;
	minor: string;
	version: string;
};

const semanticVersionPattern = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

async function main(): Promise<void> {
	const semanticVersion = requiredEnvironment("INPUT_SEMANTIC-VERSION");
	const commit = requiredEnvironment("INPUT_COMMIT");
	const tags = parseSemanticVersion(semanticVersion);
	const repository = requiredEnvironment("GITHUB_REPOSITORY");

	const client = new GitHubClient(
		requiredEnvironment("GITHUB_TOKEN"),
		process.env.GITHUB_API_URL ?? "https://api.github.com",
		repository,
	);

	if (await client.refExists(tags.version)) {
		throw new Error(`The version tag ${tags.version} already exists.`);
	}

	await client.createRef(tags.version, commit);
	for (const tag of [tags.minor, tags.major, "latest"]) {
		await client.createOrMoveRef(tag, commit);
	}
}

function requiredEnvironment(name: string): string {
	const value = process.env[name];
	if (!value) throw new Error(`Missing required environment variable: ${name}`);
	return value;
}

function parseSemanticVersion(value: string): TagParts {
	const match = semanticVersionPattern.exec(value);
	if (!match) {
		throw new Error(
			`Invalid semantic version ${value}; expected v<major>.<minor>.<patch>.`,
		);
	}
	const [, major, minor] = match;
	if (!major || !minor) {
		throw new Error(`Invalid semantic version ${value}.`);
	}
	return {
		major: `v${major}`,
		minor: `v${major}.${minor}`,
		version: value,
	};
}

class GitHubClient {
	private readonly baseURL: string;
	private readonly headers: HeadersInit;

	public constructor(token: string, apiURL: string, repository: string) {
		this.baseURL = `${apiURL.replace(/\/$/, "")}/repos/${repository}`;
		this.headers = {
			accept: "application/vnd.github+json",
			authorization: `Bearer ${token}`,
			"content-type": "application/json",
			"X-GitHub-Api-Version": "2022-11-28",
		};
	}

	public async refExists(tag: string): Promise<boolean> {
		const response = await this.request("GET", `/git/ref/tags/${tag}`);
		if (response.status === 404) return false;
		await this.requireSuccess(response);
		return true;
	}

	public async createOrMoveRef(tag: string, commit: string): Promise<void> {
		const response = await this.request("GET", `/git/ref/tags/${tag}`);
		if (response.status === 404) {
			await this.createRef(tag, commit);
			return;
		}
		await this.requireSuccess(response);
		await this.updateRef(tag, commit);
	}

	public async createRef(tag: string, commit: string): Promise<void> {
		const response = await this.request("POST", "/git/refs", {
			ref: `refs/tags/${tag}`,
			sha: commit,
		});
		await this.requireSuccess(response);
	}

	private async updateRef(tag: string, commit: string): Promise<void> {
		const response = await this.request("PATCH", `/git/refs/tags/${tag}`, {
			sha: commit,
			force: true,
		});
		await this.requireSuccess(response);
	}

	private request(
		method: string,
		path: string,
		body?: Record<string, boolean | string>,
	): Promise<Response> {
		return fetch(`${this.baseURL}${path}`, {
			method,
			headers: this.headers,
			body: body ? JSON.stringify(body) : undefined,
		});
	}

	private async requireSuccess(response: Response): Promise<void> {
		if (response.ok) return;
		const details = await response.text();
		throw new Error(
			`GitHub ref operation failed with status ${response.status}: ${details}`,
		);
	}
}

main().catch((error: unknown) => {
	process.stderr.write(
		`${error instanceof Error ? error.message : String(error)}\n`,
	);
	process.exitCode = 1;
});
