import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import type {
	Example,
	Specification,
} from "../src/specification-by-example.ts";
import type { ExampleTestImplementation } from "../src/specification-test-registration.ts";
import { registerSpecificationTests } from "../src/specification-test-registration.ts";

const noOpImplementation: ExampleTestImplementation = () => Promise.resolve();

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
		["first-example", "second-example", "third-example"],
	);
});

test("registerSpecificationTests rejects missing implementations", () => {
	assert.throws(
		() => registerSpecificationTests(createSpecification(), new Map()),
		{ message: "Missing test implementation for example ID: example" },
	);
});

test("registerSpecificationTests rejects unknown implementations", () => {
	assert.throws(
		() =>
			registerSpecificationTests(
				createSpecification(),
				new Map([
					["example", noOpImplementation],
					["unknown", noOpImplementation],
				]),
			),
		{ message: "Unknown example ID in test implementations: unknown" },
	);
});

test("registerSpecificationTests rejects duplicate example IDs", () => {
	const specification = createSpecification();
	const example = specification.rules[0].examples[0];
	specification.rules[0].examples.push({ ...example });

	assert.throws(
		() =>
			registerSpecificationTests(
				specification,
				new Map([["example", noOpImplementation]]),
			),
		{ message: "Duplicate example ID: example" },
	);
});

function createSpecification(): Specification {
	const example: Example = {
		id: "example",
		content: [
			{
				type: "text",
				text: { template: "Example", parameters: {} },
			},
		],
	};

	return {
		title: "Test",
		rules: [{ definition: "Rule", examples: [example] }],
	};
}
