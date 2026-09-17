import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { test } from "node:test";

test("Biome reports runtime import cycles", () => {
	const biome = join(process.cwd(), "node_modules", ".bin", "biome");
	const fixture = join(
		process.cwd(),
		"testdata",
		"biome",
		"no-import-cycles",
	);
	const result = spawnSync(biome, ["check", fixture], {
		encoding: "utf8",
	});

	assert.notEqual(result.status, 0, result.stderr);
	assert.match(`${result.stdout}\n${result.stderr}`, /noImportCycles/);
});
