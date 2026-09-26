import { createServer, type Server } from "node:http";

type TagState = Map<string, string>;

export class FakeGitHubApi {
	private readonly server: Server;
	private readonly tags: TagState;
	private port = 0;

	public constructor(initialTags: ReadonlyMap<string, string>) {
		this.tags = new Map(initialTags);
		this.server = createServer((request, response) =>
			this.handleRequest(request, response),
		);
	}

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: This test double routes three API operations.
	private handleRequest(
		request: import("node:http").IncomingMessage,
		response: import("node:http").ServerResponse,
	): void {
		const tag = request.url?.match(/\/git\/refs?\/tags\/([^/]+)$/)?.[1];
		if (request.method === "GET" && tag) {
			this.handleGet(tag, response);
			return;
		}
		if (request.method === "POST" && request.url?.endsWith("/git/refs")) {
			void this.handleCreate(request, response);
			return;
		}
		if (request.method === "PATCH" && tag) {
			void this.handleUpdate(request, tag, response);
			return;
		}
		response.writeHead(404).end();
	}

	private handleGet(
		encodedTag: string,
		response: import("node:http").ServerResponse,
	): void {
		const commit = this.tags.get(decodeURIComponent(encodedTag));
		if (!commit) {
			response.writeHead(404).end();
			return;
		}
		response.writeHead(200, { "content-type": "application/json" });
		response.end(JSON.stringify({ object: { sha: commit } }));
	}

	private async handleCreate(
		request: import("node:http").IncomingMessage,
		response: import("node:http").ServerResponse,
	): Promise<void> {
		const body = await readJson(request);
		const createdTag = body.ref.replace(/^refs\/tags\//, "");
		this.tags.set(createdTag, body.sha);
		response.writeHead(201).end();
	}

	private async handleUpdate(
		request: import("node:http").IncomingMessage,
		encodedTag: string,
		response: import("node:http").ServerResponse,
	): Promise<void> {
		const body = await readJson(request);
		this.tags.set(decodeURIComponent(encodedTag), body.sha);
		response.writeHead(200).end();
	}

	public async start(): Promise<string> {
		await new Promise<void>((resolve) => {
			this.server.listen(0, "127.0.0.1", () => resolve());
		});
		const address = this.server.address();
		if (!address || typeof address === "string") {
			throw new Error("Fake GitHub API did not expose a TCP address.");
		}
		this.port = address.port;
		return `http://127.0.0.1:${this.port}`;
	}

	public async stop(): Promise<void> {
		await new Promise<void>((resolve, reject) => {
			this.server.close((error) => (error ? reject(error) : resolve()));
		});
	}

	public tagState(): ReadonlyMap<string, string> {
		return this.tags;
	}
}

async function readJson(
	request: import("node:http").IncomingMessage,
): Promise<{ ref: string; sha: string }> {
	let body = "";
	for await (const chunk of request) body += chunk;
	const parsed: unknown = JSON.parse(body);
	if (
		typeof parsed !== "object" ||
		parsed === null ||
		!("sha" in parsed) ||
		typeof parsed.sha !== "string"
	) {
		throw new Error("Fake GitHub API received an invalid ref payload.");
	}
	return {
		ref: "ref" in parsed && typeof parsed.ref === "string" ? parsed.ref : "",
		sha: parsed.sha,
	};
}
