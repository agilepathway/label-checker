import assert from "node:assert/strict";
import { test } from "node:test";

import {
	assertUniqueExampleIds,
	type Example,
	expandText,
	type Specification,
	tableAt,
	textAt,
} from "../src/specification-by-example.ts";

const example: Example = {
	id: "sample",
	content: [
		{
			type: "text",
			text: { template: "A {value}", parameters: { value: "test" } },
		},
		{
			type: "table",
			table: { headers: ["Heading"], rows: [["value"]] },
		},
	],
};

const tableFirstExample: Example = {
	id: "table-first",
	content: [
		{
			type: "table",
			table: { headers: ["Heading"], rows: [["value"]] },
		},
	],
};

const parameterisedTableExample: Example = {
	id: "parameterised-table",
	content: [
		{
			type: "table",
			table: {
				headers: [{ template: "Heading {name}", parameters: { name: "one" } }],
				rows: [[{ template: "Value {name}", parameters: { name: "two" } }]],
			},
		},
	],
};

const _emptyContentExample: Example = {
	id: "empty",
	// @ts-expect-error Examples must have at least one content item.
	content: [],
};

const specification: Specification = {
	title: "Specification",
	rules: [
		{
			definition: "Rule",
			examples: [example, { ...example, id: "another-sample" }],
		},
	],
};

test("assertUniqueExampleIds accepts distinct IDs", () => {
	assertUniqueExampleIds(specification);
});

test("assertUniqueExampleIds rejects duplicate IDs", () => {
	assert.throws(
		() =>
			assertUniqueExampleIds({
				title: "Specification",
				rules: [
					{ definition: "First", examples: [example] },
					{ definition: "Second", examples: [{ ...example }] },
				],
			}),
		{ message: "Duplicate example ID: sample" },
	);
});

test("expandText expands known Example text parameters", () => {
	const text = {
		template: "A {first} value and a {second} value",
		parameters: {
			first: "one",
			second: "two",
		},
	};

	assert.equal(expandText(text), "A one value and a two value");
});

test("expandText rejects unknown Example text parameters", () => {
	assert.throws(
		() =>
			expandText({
				template: "A `{missing}` value",
				parameters: {},
			}),
		{ message: "Unknown example placeholder: {missing}" },
	);
});

test("textAt returns the text payload at the requested index", () => {
	assert.deepEqual(textAt(example, 0), {
		template: "A {value}",
		parameters: { value: "test" },
	});
});

test("textAt reports an out-of-range index", () => {
	assert.throws(() => textAt(example, 2), {
		message: "Expected text content at index 2, but found no content.",
	});
});

test("textAt reports a content-type mismatch", () => {
	assert.throws(() => textAt(example, 1), {
		message: 'Expected text content at index 1, but found "table" content.',
	});
});

test("tableAt returns the table payload at the requested index", () => {
	assert.deepEqual(tableAt(example, 1), {
		headers: ["Heading"],
		rows: [["value"]],
	});
});

test("tableAt returns a table at the start of an example", () => {
	assert.deepEqual(tableAt(tableFirstExample, 0), {
		headers: ["Heading"],
		rows: [["value"]],
	});
});

test("tableAt returns parameterised headers and cells", () => {
	assert.deepEqual(tableAt(parameterisedTableExample, 0), {
		headers: [{ template: "Heading {name}", parameters: { name: "one" } }],
		rows: [[{ template: "Value {name}", parameters: { name: "two" } }]],
	});
});

test("tableAt reports an out-of-range index", () => {
	assert.throws(() => tableAt(example, 2), {
		message: "Expected table content at index 2, but found no content.",
	});
});

test("tableAt reports a content-type mismatch", () => {
	assert.throws(() => tableAt(example, 0), {
		message: 'Expected table content at index 0, but found "text" content.',
	});
});
