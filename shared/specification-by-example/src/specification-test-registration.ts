import { test } from "node:test";

import {
	assertUniqueExampleIds,
	type Example,
} from "./specification-by-example.ts";

export type ExampleTestImplementation<
	TExample extends Example<unknown, unknown> = Example,
> = (example: TExample) => Promise<void>;

export function registerSpecificationTests<
	TExample extends Example<unknown, unknown>,
>(
	specification: {
		rules: { examples: TExample[] }[];
	},
	implementation: ExampleTestImplementation<TExample>,
): void {
	const examples = specification.rules.flatMap((rule) => rule.examples);
	assertUniqueExampleIds(specification);

	for (const example of examples) {
		test(example.id, () => implementation(example));
	}
}
