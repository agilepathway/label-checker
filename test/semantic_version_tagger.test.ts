import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
	createServer,
	type IncomingMessage,
	type ServerResponse,
} from "node:http";
import { test } from "node:test";
import { firstExample } from "../.github/actions/semantic-version-tagger/spec/semantic-version-tagging.ts";

const repository = "agilepathway/semantic-version-tagger-spec";
const refPrefix = `/repos/${repository}/git/ref/tags/`;
const updateRefPrefix = `/repos/${repository}/git/refs/tags/`;

test("applies the first semantic-version tagging example", async () => {
	const refs = new Map(
		firstExample.tags.flatMap(({ tag, before }) =>
			before === null ? [] : [[tag, before]],
		),
	);
	const server = createServer(createFakeGitHubHandler(refs));

	await listen(server);
	try {
		const address = server.address();
		assert(address && typeof address !== "string");
		const result = await runAction(`http://127.0.0.1:${address.port}`);

		assert.equal(result.status, 0, result.stderr);
		assert.deepEqual(
			Object.fromEntries(refs),
			Object.fromEntries(
				firstExample.tags.map(({ tag, after }) => [tag, after]),
			),
		);
	} finally {
		await close(server);
	}
});

function createFakeGitHubHandler(
	refs: Map<string, string>,
): (request: IncomingMessage, response: ServerResponse) => Promise<void> {
	return async (
		request: IncomingMessage,
		response: ServerResponse,
	): Promise<void> => {
		const path = new URL(request.url ?? "/", "http://localhost").pathname;
		const handled =
			handleGetRef(request, response, refs, path) ||
			(await handleCreateRef(request, response, refs, path)) ||
			(await handleUpdateRef(request, response, refs, path));
		if (!handled) respond(response, 404, { message: "Not Found" });
	};
}

function handleGetRef(
	request: IncomingMessage,
	response: ServerResponse,
	refs: Map<string, string>,
	path: string,
): boolean {
	if (request.method !== "GET") return false;
	const tag = tagFromPath(path, refPrefix);
	if (tag === undefined) return false;
	const sha = refs.get(tag);
	if (sha === undefined) {
		respond(response, 404, { message: "Not Found" });
		return true;
	}
	respond(response, 200, { ref: `refs/tags/${tag}`, object: { sha } });
	return true;
}

async function handleCreateRef(
	request: IncomingMessage,
	response: ServerResponse,
	refs: Map<string, string>,
	path: string,
): Promise<boolean> {
	if (request.method !== "POST" || path !== `/repos/${repository}/git/refs`) {
		return false;
	}
	const body = await readRefBody(request);
	if (!body?.ref?.startsWith("refs/tags/")) {
		respond(response, 400, { message: "Invalid ref" });
		return true;
	}
	refs.set(body.ref.slice("refs/tags/".length), body.sha);
	respond(response, 201, {});
	return true;
}

async function handleUpdateRef(
	request: IncomingMessage,
	response: ServerResponse,
	refs: Map<string, string>,
	path: string,
): Promise<boolean> {
	if (request.method !== "PATCH") return false;
	const tag = tagFromPath(path, updateRefPrefix);
	if (tag === undefined) return false;
	const body = await readRefBody(request);
	if (body === undefined) {
		respond(response, 400, { message: "Invalid ref" });
		return true;
	}
	refs.set(tag, body.sha);
	respond(response, 200, {});
	return true;
}

function tagFromPath(path: string, prefix: string): string | undefined {
	if (!path.startsWith(prefix)) return undefined;
	return decodeURIComponent(path.slice(prefix.length));
}

function runAction(apiUrl: string): Promise<{
	status: number | null;
	stderr: string;
}> {
	return new Promise((resolve, reject) => {
		const child = spawn(
			process.execPath,
			[
				"--experimental-strip-types",
				new URL(
					"../.github/actions/semantic-version-tagger/src/index.ts",
					import.meta.url,
				).pathname,
			],
			{
				env: {
					GITHUB_REPOSITORY: repository,
					GITHUB_TOKEN: "fake-token",
					GITHUB_API_URL: apiUrl,
					"INPUT_SEMANTIC-VERSION": firstExample.semanticVersion,
					INPUT_COMMIT: firstExample.commit,
				},
				stdio: ["ignore", "ignore", "pipe"],
			},
		);
		let stderr = "";
		child.stderr.on("data", (chunk: Buffer) => {
			stderr += chunk;
		});
		child.on("error", reject);
		child.on("close", (status) => resolve({ status, stderr }));
	});
}

async function readRefBody(
	request: IncomingMessage,
): Promise<{ ref?: string; sha: string } | undefined> {
	const chunks: Buffer[] = [];
	for await (const chunk of request) {
		chunks.push(Buffer.from(chunk));
	}

	const body: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
	if (!isRecord(body) || typeof body.sha !== "string") return undefined;
	return {
		...(typeof body.ref === "string" ? { ref: body.ref } : {}),
		sha: body.sha,
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function respond(response: ServerResponse, status: number, body: object): void {
	response.statusCode = status;
	response.setHeader("content-type", "application/json");
	response.end(JSON.stringify(body));
}

async function listen(server: ReturnType<typeof createServer>): Promise<void> {
	await new Promise<void>((resolve, reject) => {
		server.once("error", reject);
		server.listen(0, "127.0.0.1", resolve);
	});
}

async function close(server: ReturnType<typeof createServer>): Promise<void> {
	await new Promise<void>((resolve, reject) => {
		server.close((error) => (error ? reject(error) : resolve()));
	});
}
