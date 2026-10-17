import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

test("registerSpecificationTests registers each example separately in order", () => {
	const fixture = fileURLToPath(
		new URL("./fixtures/specification-test-registration.ts", import.meta.url),
	);
	const result = spawnSync(
		process.execPath,
		["--test", "--test-reporter=tap", fixture],
		{
			encoding: "utf8",
			env: Object.fromEntries(
				Object.entries(process.env).filter(
					([name]) => name !== "NODE_TEST_CONTEXT",
				),
			),
		},
	);

	assert.equal(result.status, 0, result.stderr);
	assert.deepEqual(
		[...result.stdout.matchAll(/^# Subtest: (.+)$/gm)].map(([, name]) => name),
		["First example", "Second example", "Third example"],
	);
});
