import assert from "node:assert/strict";
import { test } from "node:test";

type Refs = Readonly<Record<string, string>>;

type Example = {
	name: string;
	version: string;
	commit: string;
	before: Refs;
	after: Refs;
	error?: string;
};

// biome-ignore lint/security/noSecrets: Public example SHA from the specification.
const oldCommit = "7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b";
// biome-ignore lint/security/noSecrets: Public example SHA from the specification.
const patchCommit = "a1b2c3d4e5f67890abcdef1234567890abcdef12";
// biome-ignore lint/security/noSecrets: Public example SHA from the specification.
const minorCommit = "b2c3d4e5f67890abcdef1234567890abcdef123";
// biome-ignore lint/security/noSecrets: Public example SHA from the specification.
const majorCommit = "c3d4e5f67890abcdef1234567890abcdef1234";
// biome-ignore lint/security/noSecrets: Public example SHA from the specification.
const unrelatedCommit = "9e8d7c6b5a4f3210fedcba9876543210fedcba98";

function applyVersion(version: string, commit: string, refs: Refs): Refs {
	const match = /^v(\d+)\.(\d+)\.(\d+)$/.exec(version);
	if (match === null) {
		throw new Error(`Unsupported semantic version: ${version}`);
	}

	const [, major, minor, patch] = match;
	if (refs[version] !== undefined) {
		throw new Error(`Version tag already exists: ${version}`);
	}

	return {
		...refs,
		[`v${major}`]: commit,
		[`v${major}.${minor}`]: commit,
		[`v${major}.${minor}.${patch}`]: commit,
		latest: commit,
	};
}

const examples: Example[] = [
	{
		name: "patch release moves patch aliases and latest",
		version: "v2.0.1",
		commit: patchCommit,
		before: {
			v2: oldCommit,
			"v2.0": oldCommit,
			"v2.0.0": oldCommit,
			latest: oldCommit,
		},
		after: {
			v2: patchCommit,
			"v2.0": patchCommit,
			"v2.0.0": oldCommit,
			"v2.0.1": patchCommit,
			latest: patchCommit,
		},
	},
	{
		name: "minor release creates the minor and patch tags",
		version: "v2.1.0",
		commit: minorCommit,
		before: {
			v2: patchCommit,
			"v2.0": patchCommit,
			"v2.0.0": oldCommit,
			"v2.0.1": patchCommit,
			latest: patchCommit,
		},
		after: {
			v2: minorCommit,
			"v2.0": patchCommit,
			"v2.0.0": oldCommit,
			"v2.0.1": patchCommit,
			"v2.1": minorCommit,
			"v2.1.0": minorCommit,
			latest: minorCommit,
		},
	},
	{
		name: "major release creates the major, minor, and patch tags",
		version: "v3.0.0",
		commit: majorCommit,
		before: {
			v2: minorCommit,
			"v2.0": patchCommit,
			"v2.1": minorCommit,
			"v2.0.0": oldCommit,
			"v2.0.1": patchCommit,
			"v2.1.0": minorCommit,
			latest: minorCommit,
		},
		after: {
			v2: minorCommit,
			"v2.0": patchCommit,
			"v2.1": minorCommit,
			"v2.0.0": oldCommit,
			"v2.0.1": patchCommit,
			"v2.1.0": minorCommit,
			v3: majorCommit,
			"v3.0": majorCommit,
			"v3.0.0": majorCommit,
			latest: majorCommit,
		},
	},
	{
		name: "patch release creates missing aliases",
		version: "v2.0.1",
		commit: patchCommit,
		before: { "v2.0.0": oldCommit },
		after: {
			v2: patchCommit,
			"v2.0": patchCommit,
			"v2.0.0": oldCommit,
			"v2.0.1": patchCommit,
			latest: patchCommit,
		},
	},
	{
		name: "first semantic version creates every supported tag",
		version: "v0.0.1",
		commit: patchCommit,
		before: {},
		after: {
			v0: patchCommit,
			"v0.0": patchCommit,
			"v0.0.1": patchCommit,
			latest: patchCommit,
		},
	},
	{
		name: "first latest tag is created",
		version: "v2.0.1",
		commit: patchCommit,
		before: {
			v2: oldCommit,
			"v2.0": oldCommit,
			"v2.0.0": oldCommit,
		},
		after: {
			v2: patchCommit,
			"v2.0": patchCommit,
			"v2.0.0": oldCommit,
			"v2.0.1": patchCommit,
			latest: patchCommit,
		},
	},
	{
		name: "existing version tag is rejected",
		version: "v2.0.1",
		commit: patchCommit,
		before: {
			"v2.0.1": oldCommit,
		},
		after: {
			"v2.0.1": oldCommit,
		},
		error: "Version tag already exists: v2.0.1",
	},
	{
		name: "in-scope aliases move from unrelated commits",
		version: "v2.0.1",
		commit: patchCommit,
		before: {
			"v1.0.0": unrelatedCommit,
			v2: unrelatedCommit,
			"v2.0": oldCommit,
			"v2.0.0": oldCommit,
			latest: oldCommit,
		},
		after: {
			"v1.0.0": unrelatedCommit,
			v2: patchCommit,
			"v2.0": patchCommit,
			"v2.0.0": oldCommit,
			"v2.0.1": patchCommit,
			latest: patchCommit,
		},
	},
];

for (const example of examples) {
	test(`translates Markdown example: ${example.name}`, () => {
		const before = { ...example.before };

		if (example.error !== undefined) {
			assert.throws(
				() => applyVersion(example.version, example.commit, before),
				new Error(example.error),
			);
			assert.deepEqual(before, example.before);
			return;
		}

		assert.deepEqual(
			applyVersion(example.version, example.commit, before),
			example.after,
		);
		assert.deepEqual(before, example.before);
	});
}
