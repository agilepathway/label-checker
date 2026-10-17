import assert from "node:assert/strict";

import type {
	Example,
	Specification,
} from "../../src/specification-by-example.ts";
import { registerSpecificationTests } from "../../src/specification-test-registration.ts";

const expectedNames = ["First example", "Second example", "Third example"];
let nextExampleIndex = 0;

function createExample(name: string): Example {
	let example: Example;
	example = {
		content: [
			{
				type: "text",
				text: { template: name, parameters: {} },
			},
		],
		run(): Promise<void> {
			assert.equal(this, example);
			assert.equal(expectedNames[nextExampleIndex], name);
			nextExampleIndex += 1;
			return Promise.resolve();
		},
	};

	return example;
}

const specification: Specification = {
	title: "Registration fixture",
	rules: [
		{
			definition: "First rule",
			examples: [
				createExample("First example"),
				createExample("Second example"),
			],
		},
		{
			definition: "Second rule",
			examples: [createExample("Third example")],
		},
	],
};

registerSpecificationTests(specification);
