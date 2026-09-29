import {
	createServer,
	type IncomingMessage,
	type Server,
	type ServerResponse,
} from "node:http";

export class FakeGitHubApi {
	private readonly server: Server;
	private readonly tags: Map<string, string>;

	public constructor(initialTags: ReadonlyMap<string, string>) {
		this.tags = new Map(initialTags);
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
		this.tags.set(tag, body.sha);
		response.writeHead(201).end();
	}

	private async handleUpdate(
		request: IncomingMessage,
		encodedTag: string,
		response: ServerResponse,
	): Promise<void> {
		const body = await readRefBody(request);
		if (!body) {
			response.writeHead(400).end("Invalid ref payload");
			return;
		}
		this.tags.set(decodeURIComponent(encodedTag), body.sha);
		response.writeHead(200).end();
	}
}

async function readRefBody(
	request: IncomingMessage,
): Promise<{ ref?: string; sha: string } | undefined> {
	let body = "";
	for await (const chunk of request) body += chunk;
	const parsed: unknown = JSON.parse(body);
	if (!isRecord(parsed)) return undefined;
	const sha = getStringProperty(parsed, "sha");
	if (sha === undefined) return undefined;
	const ref = getStringProperty(parsed, "ref");
	return {
		...(ref === undefined ? {} : { ref }),
		sha,
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function getStringProperty(
	value: Record<string, unknown>,
	property: string,
): string | undefined {
	const propertyValue = value[property];
	return typeof propertyValue === "string" ? propertyValue : undefined;
}
