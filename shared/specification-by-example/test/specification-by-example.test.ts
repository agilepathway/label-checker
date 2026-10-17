import assert from "node:assert/strict";
import { test } from "node:test";

import {
	type Example,
	expandText,
	tableAt,
	textAt,
} from "../src/specification-by-example.ts";

const example: Example = {
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
	run: async () => {},
};

const _tableFirstExample: Example = {
	content: [
		{
			// @ts-expect-error Examples must start with text.
			type: "table",
			table: { headers: ["Heading"], rows: [["value"]] },
		},
	],
	run: async () => {},
};

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
