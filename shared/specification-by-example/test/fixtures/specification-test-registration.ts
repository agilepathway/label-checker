import assert from "node:assert/strict";

import type {
	Example,
	Specification,
} from "../../src/specification-by-example.ts";
import { registerSpecificationTests } from "../../src/specification-test-registration.ts";

function createExample(id: string): Example {
	const example: Example = {
		id,
		content: [
			{
				type: "text",
				text: { template: id, parameters: {} },
			},
		],
	};

	return example;
}

const specification: Specification = {
	title: "Registration fixture",
	rules: [
		{
			definition: "First rule",
			examples: [
				createExample("first-example"),
				createExample("second-example"),
			],
		},
		{
			definition: "Second rule",
			examples: [createExample("third-example")],
		},
	],
};

const expectedNames = ["first-example", "second-example", "third-example"];
let nextExampleIndex = 0;

function verifyRegistrationOrder(example: Example): Promise<void> {
	assert.equal(expectedNames[nextExampleIndex], example.id);
	nextExampleIndex += 1;
	return Promise.resolve();
}

registerSpecificationTests(specification, verifyRegistrationOrder);
