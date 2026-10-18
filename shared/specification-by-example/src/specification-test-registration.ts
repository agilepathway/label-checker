import { test } from "node:test";

import {
	assertUniqueExampleIds,
	type Example,
	type Specification,
} from "./specification-by-example.ts";

export type ExampleTestImplementation = (example: Example) => Promise<void>;

export function registerSpecificationTests(
	specification: Specification,
	implementations: ReadonlyMap<string, ExampleTestImplementation>,
): void {
	const examples = specification.rules.flatMap((rule) => rule.examples);
	validateImplementationIds(specification, examples, implementations);

	for (const example of examples) {
		test(example.id, () =>
			getImplementation(implementations, example.id)(example),
		);
	}
}

function validateImplementationIds(
	specification: Specification,
	examples: Example[],
	implementations: ReadonlyMap<string, ExampleTestImplementation>,
): void {
	assertUniqueExampleIds(specification);

	const exampleIds = new Set(examples.map((example) => example.id));
	const missing = examples.find((example) => !implementations.has(example.id));
	if (missing) {
		throw new Error(
			`Missing test implementation for example ID: ${missing.id}`,
		);
	}

	const unknown = [...implementations.keys()].find((id) => !exampleIds.has(id));
	if (unknown) {
		throw new Error(`Unknown example ID in test implementations: ${unknown}`);
	}
}

function getImplementation(
	implementations: ReadonlyMap<string, ExampleTestImplementation>,
	id: string,
): ExampleTestImplementation {
	const implementation = implementations.get(id);
	if (!implementation) {
		throw new Error(`Missing test implementation for example ID: ${id}`);
	}

	return implementation;
}
