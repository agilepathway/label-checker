import { test } from "node:test";

import { expandText, type Specification } from "./specification-by-example.ts";

export function registerSpecificationTests(specification: Specification): void {
	for (const rule of specification.rules) {
		for (const example of rule.examples) {
			test(expandText(example.content[0].text), example.run.bind(example));
		}
	}
}
