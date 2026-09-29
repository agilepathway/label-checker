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
