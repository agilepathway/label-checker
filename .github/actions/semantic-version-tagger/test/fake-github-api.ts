import {
	createServer,
	type IncomingMessage,
	type Server,
	type ServerResponse,
} from "node:http";

export class FakeGitHubApi {
	private readonly server: Server;
	private readonly tags: Map<string, string>;
	private readonly failedUpdateTag: string | undefined;

	public constructor(
		initialTags: ReadonlyMap<string, string>,
		failedUpdateTag?: string,
	) {
		this.tags = new Map(initialTags);
		this.failedUpdateTag = failedUpdateTag;
		this.server = createServer((request, response) => {
			this.handleRequest(request, response).catch((error: unknown) => {
				response
					.writeHead(500)
					.end(error instanceof Error ? error.message : String(error));
			});
		});
	}

	public async start(): Promise<string> {
		await new Promise<void>((resolve, reject) => {
			this.server.once("error", reject);
			this.server.listen(0, "127.0.0.1", resolve);
		});
		const address = this.server.address();
		if (!address || typeof address === "string") {
			throw new Error("Fake GitHub API did not expose a TCP address.");
		}
		return `http://127.0.0.1:${address.port}`;
	}

	public async stop(): Promise<void> {
		await new Promise<void>((resolve, reject) => {
			this.server.close((error) => (error ? reject(error) : resolve()));
		});
	}

	public tagState(): ReadonlyMap<string, string> {
		return new Map(this.tags);
	}

	private async handleRequest(
		request: IncomingMessage,
		response: ServerResponse,
	): Promise<void> {
		const path = new URL(request.url ?? "/", "http://localhost").pathname;
		if (request.method === "GET") {
			this.handleGetRequest(path, response);
			return;
		}
		if (request.method === "POST") {
			await this.handleCreateRequest(request, path, response);
			return;
		}
		if (request.method === "PATCH") {
			await this.handleUpdateRequest(request, path, response);
			return;
		}
		response.writeHead(404).end();
	}

	private handleGetRequest(path: string, response: ServerResponse): void {
		const tag = path.match(/\/git\/ref\/tags\/([^/]+)$/)?.[1];
		if (tag) {
			this.handleGet(tag, response);
		} else {
			response.writeHead(404).end();
		}
	}

	private async handleCreateRequest(
		request: IncomingMessage,
		path: string,
		response: ServerResponse,
	): Promise<void> {
		if (path.endsWith("/git/refs")) {
			await this.handleCreate(request, response);
			return;
		}
		response.writeHead(404).end();
	}

	private async handleUpdateRequest(
		request: IncomingMessage,
		path: string,
		response: ServerResponse,
	): Promise<void> {
		const tag = path.match(/\/git\/refs?\/tags\/([^/]+)$/)?.[1];
		if (tag) {
			await this.handleUpdate(request, tag, response);
			return;
		}
		response.writeHead(404).end();
	}

	private handleGet(tag: string, response: ServerResponse): void {
		const commit = this.tags.get(decodeURIComponent(tag));
		if (!commit) {
			response.writeHead(404).end();
			return;
		}
		response.writeHead(200, { "content-type": "application/json" });
		response.end(JSON.stringify({ object: { sha: commit } }));
	}

	private async handleCreate(
		request: IncomingMessage,
		response: ServerResponse,
	): Promise<void> {
		const body = await readRefBody(request);
		if (!body?.ref?.startsWith("refs/tags/")) {
			response.writeHead(400).end("Invalid ref payload");
			return;
		}
		const tag = body.ref.slice("refs/tags/".length);
		if (this.tags.has(tag)) {
			response.writeHead(422).end("Reference already exists");
			return;
		}
		this.tags.set(tag, body.sha);
		response.writeHead(201).end();
	}

	private async handleUpdate(
		request: IncomingMessage,
		encodedTag: string,
		response: ServerResponse,
	): Promise<void> {
		const body = await readRefBody(request);
		if (body?.force !== true) {
			response.writeHead(400).end("Invalid ref payload");
			return;
		}
		const tag = decodeURIComponent(encodedTag);
		if (!this.tags.has(tag)) {
			response.writeHead(404).end("Reference does not exist");
			return;
		}
		if (tag === this.failedUpdateTag) {
			response.writeHead(500).end("Simulated ref update failure");
			return;
		}
		this.tags.set(tag, body.sha);
		response.writeHead(200).end();
	}
}

async function readRefBody(
	request: IncomingMessage,
): Promise<{ force?: boolean; ref?: string; sha: string } | undefined> {
	let body = "";
	for await (const chunk of request) body += chunk;
	const parsed: unknown = JSON.parse(body);
	return isRefBody(parsed) ? parsed : undefined;
}

function isRefBody(
	value: unknown,
): value is { force?: boolean; ref?: string; sha: string } {
	return (
		typeof value === "object" &&
		value !== null &&
		"sha" in value &&
		typeof value.sha === "string" &&
		(!("ref" in value) || typeof value.ref === "string") &&
		(!("force" in value) || typeof value.force === "boolean")
	);
}
