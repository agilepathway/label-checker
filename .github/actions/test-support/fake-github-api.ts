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
		const url = new URL(
			request.url ?? "/",
			`http://${request.headers.host ?? "localhost"}`,
		);
		if (request.method === "GET") {
			this.handleGetRequest(url, response);
			return;
		}
		if (request.method === "POST") {
			await this.handleCreateRequest(request, url.pathname, response);
			return;
		}
		if (request.method === "PATCH") {
			await this.handleUpdateRequest(request, url.pathname, response);
			return;
		}
		response.writeHead(404).end();
	}

	private handleGetRequest(url: URL, response: ServerResponse): void {
		if (/\/repos\/[^/]+\/[^/]+\/tags$/.test(url.pathname)) {
			this.handleListTags(url, response);
			return;
		}
		const tag = url.pathname.match(/\/git\/ref\/tags\/([^/]+)$/)?.[1];
		if (tag) {
			this.handleGet(tag, response);
		} else {
			response.writeHead(404).end();
		}
	}

	private handleListTags(url: URL, response: ServerResponse): void {
		const page = Number(url.searchParams.get("page") ?? "1");
		const perPage = Number(url.searchParams.get("per_page") ?? "30");
		if (
			!Number.isSafeInteger(page) ||
			page < 1 ||
			!Number.isSafeInteger(perPage) ||
			perPage < 1
		) {
			response.writeHead(400).end("Invalid pagination parameters");
			return;
		}

		const allTags = [...this.tags.keys()];
		const pageTags = allTags.slice((page - 1) * perPage, page * perPage);
		if (page * perPage < allTags.length) {
			const nextURL = new URL(url);
			nextURL.searchParams.set("page", String(page + 1));
			response.setHeader("link", `<${nextURL}>; rel="next"`);
		}
		response.writeHead(200, { "content-type": "application/json" });
		response.end(JSON.stringify(pageTags.map((name) => ({ name }))));
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
