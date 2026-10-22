import assert from "node:assert/strict";
import { test } from "node:test";
import { FakeGitHubApi } from "./fake-github-api.ts";

test("enforces ref creation and forced-update semantics", async () => {
	const api = new FakeGitHubApi(new Map([["v2", "existing-commit"]]));
	const apiUrl = await api.start();
	try {
		const existingTagUrl = `${apiUrl}/repos/example/repo/git/refs/tags/v2`;
		const missingTagUrl = `${apiUrl}/repos/example/repo/git/refs/tags/v3`;

		assert.equal(
			(
				await fetch(existingTagUrl, {
					method: "PATCH",
					body: JSON.stringify({ sha: "new-commit" }),
				})
			).status,
			400,
		);
		assert.equal(
			(
				await fetch(existingTagUrl, {
					method: "PATCH",
					body: JSON.stringify({ sha: "new-commit", force: false }),
				})
			).status,
			400,
		);
		assert.equal(
			(
				await fetch(missingTagUrl, {
					method: "PATCH",
					body: JSON.stringify({ sha: "new-commit", force: true }),
				})
			).status,
			404,
		);
		assert.equal(
			(
				await fetch(`${apiUrl}/repos/example/repo/git/refs`, {
					method: "POST",
					body: JSON.stringify({ ref: "refs/tags/v2", sha: "new-commit" }),
				})
			).status,
			422,
		);
		assert.equal(
			(
				await fetch(existingTagUrl, {
					method: "PATCH",
					body: JSON.stringify({ sha: "new-commit", force: true }),
				})
			).status,
			200,
		);
		assert.equal(api.tagState().get("v2"), "new-commit");
	} finally {
		await api.stop();
	}
});

test("lists tags using GitHub's paginated tags endpoint", async () => {
	const initialTags = new Map<string, string>(
		Array.from({ length: 101 }, (_, index): [string, string] => [
			`tag-${index}`,
			`commit-${index}`,
		]),
	);
	const api = new FakeGitHubApi(initialTags);
	const apiUrl = await api.start();
	try {
		const firstPage = await fetch(
			`${apiUrl}/repos/example/repo/tags?per_page=100&page=1`,
		);
		const firstTags: unknown = await firstPage.json();
		assert(Array.isArray(firstTags));
		assert.equal(firstTags.length, 100);
		assert.match(firstPage.headers.get("link") ?? "", /rel="next"/);

		const nextURL = firstPage.headers.get("link")?.match(/<([^>]+)>/)?.[1];
		assert(nextURL);
		const secondPage = await fetch(nextURL);
		const secondTags: unknown = await secondPage.json();
		assert(Array.isArray(secondTags));
		assert.equal(secondTags.length, 1);
	} finally {
		await api.stop();
	}
});
