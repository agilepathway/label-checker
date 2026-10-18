import { test } from "node:test";

import {
	assertUniqueExampleIds,
	type Example,
	type Specification,
} from "./specification-by-example.ts";

export type ExampleTestImplementation = (example: Example) => Promise<void>;

export function registerSpecificationTests(
	specification: Specification,
	implementation: ExampleTestImplementation,
): void {
	const examples = specification.rules.flatMap((rule) => rule.examples);
	assertUniqueExampleIds(specification);

	for (const example of examples) {
		test(example.id, () => implementation(example));
	}
}
