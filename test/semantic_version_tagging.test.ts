import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

type Refs = Readonly<Record<string, string>>;

type Example = {
	description: string;
	version: string;
	commit: string;
	before: Refs;
	after: Refs;
	error: boolean;
};

const specification = readFileSync(
	new URL(
		"../.github/actions/semantic-version-tagger/spec/semantic-version-tagging.md",
		import.meta.url,
	),
	"utf8",
);

function parseExamples(markdown: string): Example[] {
	const examples: Example[] = [];
	const exampleSections = markdown.matchAll(
		/## Example\n\n([\s\S]*?)(?=\n## (?:Rule|Example)|$)/g,
	);

	for (const [, section] of exampleSections) {
		const versionAndCommit = parseVersionAndCommit(section);
		if (versionAndCommit === null) {
			throw new Error(`Could not read version and commit from:\n${section}`);
		}

		const [, version, commit] = versionAndCommit;
		const rows = parseRows(section);
		if (rows.length === 0) {
			throw new Error(`Could not read tag table from:\n${section}`);
		}

		const before = buildRefs(rows, 1);
		const after = buildRefs(rows, 2);
		const error = rows.some(([, , , result]) => result === "**Error**");

		examples.push({
			description: section.slice(0, section.indexOf("\n\n")).trim(),
			version,
			commit,
			before,
			after,
			error,
		});
	}

	return examples;
}

function parseVersionAndCommit(section: string): RegExpExecArray | null {
	return /(?:new )?`(v\d+\.\d+\.\d+)` version[\s\S]*?`([0-9a-f]+)`/i.exec(
		section,
	);
}

function parseRows(section: string): string[][] {
	return section
		.split("\n")
		.filter((line) => line.startsWith("| `"))
		.map((line) =>
			line
				.split("|")
				.slice(1, -1)
				.map((cell) => cell.trim().replaceAll("`", "")),
		);
}

function buildRefs(
	rows: string[][],
	valueIndex: number,
): Record<string, string> {
	const refs: Record<string, string> = {};
	for (const row of rows) {
		const tag = row[0];
		const value = row[valueIndex];
		if (value !== "—") {
			refs[tag] = value;
		}
	}
	return refs;
}

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

for (const example of parseExamples(specification)) {
	test(`executes Markdown example: ${example.description}`, () => {
		const before = { ...example.before };

		if (example.error) {
			assert.throws(() =>
				applyVersion(example.version, example.commit, before),
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
