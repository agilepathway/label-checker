import { test } from "node:test";

import {
	expandText,
	type Specification,
	textAt,
} from "./specification-by-example.ts";

export function registerSpecificationTests(specification: Specification): void {
	for (const rule of specification.rules) {
		for (const example of rule.examples) {
			test(expandText(textAt(example, 0)), example.run.bind(example));
		}
	}
}
