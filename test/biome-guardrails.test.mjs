import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = new URL("..", import.meta.url);
const biome = join(root.pathname, "node_modules/.bin/biome");
const config = join(root.pathname, "biome.jsonc");

function runLint(source) {
	const directory = mkdtempSync(join(root.pathname, ".tmp-biome-"));
	const file = join(directory, "fixture.ts");

	try {
		writeFileSync(join(directory, "module.ts"), "export const value = 1;\n");
		writeFileSync(file, source);
		const result = spawnSync(biome, ["lint", "--config-path", config, file], {
			encoding: "utf8",
		});
		return `${result.stdout}${result.stderr}`;
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
}

test("module guardrails report type-only imports", () => {
	const output = runLint(`
		import { Type } from "./module.ts";
		type Alias = Type;
	`);

	assert.match(output, /lint\/style\/useImportType/);
});

test("module guardrails report type-only exports", () => {
	const output = runLint(`
		interface Type {}
		export { Type };
	`);

	assert.match(output, /lint\/style\/useExportType/);
});

test("module guardrails report unused imports", () => {
	const output = runLint(`
		import { value } from "./module.ts";
		export const result = 1;
	`);

	assert.match(output, /lint\/correctness\/noUnusedImports/);
});

test("module guardrails report extensionless relative imports", () => {
	const output = runLint(`
		import "./module";
	`);

	assert.match(output, /lint\/correctness\/useImportExtensions/);
});

test("organizeImports remains an enabled assist", () => {
	const directory = mkdtempSync(join(root.pathname, "test-biome-"));
	const file = join(directory, "fixture.ts");

	try {
		writeFileSync(
			file,
			[
				'import { z } from "z";',
				'import { a } from "a";',
				"export const values = [z, a];",
				"",
			].join("\n"),
		);
		execFileSync(biome, [
			"check",
			"--write",
			"--unsafe",
			"--config-path",
			config,
			file,
		]);
		const formatted = readFileSync(file, "utf8");
		assert.ok(formatted.indexOf('from "a"') < formatted.indexOf('from "z"'));
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});

test("extension guardrail does not configure compiled-JavaScript mappings", () => {
	const source = readFileSync(config, "utf8");

	assert.doesNotMatch(source, /extensionMappings|forceJsExtensions/);
	assert.doesNotMatch(source, /noNamespaceImport|useImportsFirst/);
});
