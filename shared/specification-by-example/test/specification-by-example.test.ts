import assert from "node:assert/strict";
import { test } from "node:test";

import { renderSpecification } from "../src/markdown-renderer.ts";
import {
	assertUniqueExampleIds,
	cellAt,
	cellAtAnyOf,
	type Example,
	expandText,
	hasColumn,
	type ParameterisedText,
	type Row,
	rawCellAt,
	rawCellAtAnyOf,
	type Specification,
	soleTable,
	type Table,
	table,
	tableAt,
	textAt,
	unpublished,
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
			table: table({ headings: ["Heading"], rows: [["value"]] }),
		},
	],
};

const literalExample: Example = {
	id: "literal",
	content: [{ type: "text", text: "A literal value" }],
	associatedData: {
		tags: ["wip", "slow", "unstable"],
		details: {
			source: "test",
			values: [1, { enabled: true }],
		},
	},
};

const tableFirstExample: Example = {
	id: "table-first",
	content: [
		{
			type: "table",
			table: table({ headings: ["Heading"], rows: [["value"]] }),
		},
	],
};

const parameterisedTableExample: Example = {
	id: "parameterised-table",
	content: [
		{
			type: "table",
			table: table({
				headings: [{ template: "Heading {name}", parameters: { name: "one" } }],
				rows: [[{ template: "Value {name}", parameters: { name: "two" } }]],
			}),
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

test("renderSpecification excludes example associated data", () => {
	const rendered = renderSpecification({
		title: "Specification",
		rules: [
			{
				definition: "Rule",
				examples: [literalExample],
			},
		],
	});

	assert.equal(
		rendered,
		"# Specification\n\n---\n\n## Rule\n\nRule\n\n### Example\n\nA literal value\n\n---",
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

test("expandText returns literal strings unchanged", () => {
	assert.equal(expandText("A literal value"), "A literal value");
	assert.equal(expandText("Use {value} literally"), "Use {value} literally");
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

test("table pairs values with expanded, unique headings", () => {
	const heading = {
		template: "Heading {name}",
		parameters: { name: "one" },
	};
	const value = { template: "Value {name}", parameters: { name: "two" } };
	const result = table({
		headings: [heading, unpublished("Second")],
		rows: [[value, "other"]],
	});

	assert.deepEqual(result, {
		rows: [
			[
				{ heading: { name: heading }, value },
				{ heading: { name: "Second", published: false }, value: "other" },
			],
		],
	});
});

test("table rejects rows with too few or too many values", () => {
	assert.throws(
		() =>
			table({
				headings: ["First", "Second"],
				rows: [["only one"]],
			}),
		{
			message: "Table row 1 has 1 values, but there are 2 headings.",
		},
	);
	assert.throws(
		() => table({ headings: ["Only"], rows: [["one", "too many"]] }),
		{
			message: "Table row 1 has 2 values, but there are 1 headings.",
		},
	);
});

test("table rejects duplicate expanded headings", () => {
	assert.throws(
		() =>
			table({
				headings: [
					"Outcome",
					{ template: "{name}", parameters: { name: "Outcome" } },
				],
				rows: [["Success", "Failure"]],
			}),
		{ message: "Table headings must be unique." },
	);
});

test("table rejects headings that differ only by case", () => {
	assert.throws(
		() => table({ headings: ["Name", "name"], rows: [["one", "two"]] }),
		{ message: "Table headings must be unique." },
	);
	assert.throws(
		() =>
			table({
				headings: [
					{ template: "Name {value}", parameters: { value: "one" } },
					{ template: "name {value}", parameters: { value: "ONE" } },
				],
				rows: [["one", "two"]],
			}),
		{ message: "Table headings must be unique." },
	);
	assert.throws(
		() =>
			table({
				headings: [
					"Unpublished data",
					{
						template: "{label}",
						parameters: { label: "UNPUBLISHED DATA" },
					},
				],
				rows: [["one", "two"]],
			}),
		{ message: "Table headings must be unique." },
	);
});

test("table preserves headings that differ by whitespace", () => {
	const result = table({
		headings: ["Name", " Name"],
		rows: [["one", "two"]],
	});

	assert.equal(result.rows[0][0].heading.name, "Name");
	assert.equal(result.rows[0][1].heading.name, " Name");
});

test("table rejects empty headings", () => {
	assert.throws(() => table({ headings: [], rows: [[]] }), {
		message: "A table must contain at least one heading.",
	});
});

test("table normalises plain text headings into Heading objects", () => {
	const result = table({ headings: ["Heading"], rows: [["value"]] });
	assert.deepEqual(result.rows[0][0].heading, { name: "Heading" });
});

test("table normalises unpublished headings without exposing the wrapper", () => {
	const heading = {
		template: "Internal {name}",
		parameters: { name: "data" },
	};
	const result = table({
		headings: [unpublished(heading)],
		rows: [["value"]],
	});

	assert.deepEqual(result.rows[0][0].heading, {
		name: heading,
		published: false,
	});
	assert.equal(hasColumn(result, "Internal data"), true);
	assert.equal(cellAt(result.rows[0], "Internal data"), "value");
});

test("table treats parameterised headings with name and published properties as text", () => {
	const heading = {
		template: "Heading {value}",
		parameters: { value: "one" },
		name: "Not a heading",
		published: false,
	};
	const result = table({ headings: [heading], rows: [["value"]] });

	assert.deepEqual(result.rows[0][0].heading, { name: heading });
	assert.equal(hasColumn(result, "Heading one"), true);
});

test("table factory accepts only text or unpublished heading inputs", () => {
	const verifyHeadingInputTypes = (text: ParameterisedText): void => {
		table({
			headings: ["Literal", text, unpublished(text)],
			rows: [["a", "b", "c"]],
		});

		const arbitraryHeading = { name: "Internal", published: false };
		// @ts-expect-error Arbitrary Heading objects are not factory inputs.
		table({ headings: [arbitraryHeading], rows: [["value"]] });
	};
	void verifyHeadingInputTypes;
});

test("table requires at least one data row", () => {
	assert.throws(
		// @ts-expect-error The table factory requires at least one row.
		() => table({ headings: ["Heading"], rows: [] }),
		{ message: "A table must contain at least one data row." },
	);
});

test("hasColumn finds literal headings", () => {
	const result = table({ headings: ["Heading"], rows: [["value"]] });
	assert.equal(hasColumn(result, "Heading"), true);
	assert.equal(hasColumn(result, "heading"), false);
	assert.equal(hasColumn(result, "Missing"), false);
});

test("hasColumn matches expanded parameterised headings", () => {
	const result = table({
		headings: [{ template: "Heading {name}", parameters: { name: "one" } }],
		rows: [["value"]],
	});

	assert.equal(hasColumn(result, "Heading one"), true);
	assert.equal(hasColumn(result, "Heading {name}"), false);
});

test("Table requires factory construction and is readonly", () => {
	const verifyReadonlyTypes = (validated: Table): void => {
		// @ts-expect-error Tables must be constructed through the factory.
		const unvalidated: Table = { rows: validated.rows };
		void unvalidated;

		// @ts-expect-error Validated table properties are readonly.
		validated.rows = [];
		// @ts-expect-error Validated row collections are readonly.
		validated.rows.push([]);
		// @ts-expect-error Validated cell properties are readonly.
		validated.rows[0][0].value = "changed";
		// @ts-expect-error Heading properties are readonly.
		validated.rows[0][0].heading.name = "changed";
	};
	void verifyReadonlyTypes;
});

test("ParameterisedText properties and parameters are readonly", () => {
	const verifyReadonlyTypes = (text: ParameterisedText): void => {
		// @ts-expect-error Parameterised text templates are readonly.
		text.template = "changed";
		// @ts-expect-error Parameterised text parameters are readonly.
		text.parameters = {};
		// @ts-expect-error Individual parameter values are readonly.
		text.parameters.name = "changed";
	};
	void verifyReadonlyTypes;
});

test("cellAt looks up an exact heading and expands the value", () => {
	const row = table({
		headings: ["Fallback", "Preferred"],
		rows: [
			[
				{ template: "First {value}", parameters: { value: "cell" } },
				{ template: "Second {value}", parameters: { value: "cell" } },
			],
		],
	}).rows[0];

	assert.equal(cellAt(row, "Preferred"), "Second cell");
	assert.throws(() => cellAt(row, "preferred"), {
		message: 'Could not find a table cell with the heading: "preferred".',
	});
	assert.deepEqual(rawCellAt(row, "Preferred"), {
		template: "Second {value}",
		parameters: { value: "cell" },
	});
});

test("cellAt reports when the exact heading does not exist", () => {
	const row = table({
		headings: ["Heading"],
		rows: [["value"]],
	}).rows[0];
	assert.throws(() => cellAt(row, "Missing"), {
		message: 'Could not find a table cell with the heading: "Missing".',
	});
	assert.throws(() => rawCellAt(row, "Missing"), {
		message: 'Could not find a table cell with the heading: "Missing".',
	});
});

test("AnyOf lookups use the first matching alternative heading and expand the value", () => {
	const row = table({
		headings: ["Fallback", "Preferred"],
		rows: [
			[
				{ template: "First {value}", parameters: { value: "cell" } },
				{ template: "Second {value}", parameters: { value: "cell" } },
			],
		],
	}).rows[0];

	assert.equal(cellAtAnyOf(row, "Preferred", "Fallback"), "Second cell");
	assert.deepEqual(rawCellAtAnyOf(row, "Preferred", "Fallback"), {
		template: "Second {value}",
		parameters: { value: "cell" },
	});
});

test("AnyOf lookups fall back when the preferred heading is absent", () => {
	const row = table({
		headings: ["Fallback"],
		rows: [[{ template: "Fallback {value}", parameters: { value: "cell" } }]],
	}).rows[0];

	assert.equal(cellAtAnyOf(row, "Preferred", "Fallback"), "Fallback cell");
	assert.deepEqual(rawCellAtAnyOf(row, "Preferred", "Fallback"), {
		template: "Fallback {value}",
		parameters: { value: "cell" },
	});
});

test("AnyOf lookups report when none of the requested headings exist", () => {
	const row = table({
		headings: ["Heading"],
		rows: [["value"]],
	}).rows[0];
	assert.throws(() => cellAtAnyOf(row, "Missing", "Also missing"), {
		message:
			'Could not find a table cell with any of the headings: "Missing", "Also missing".',
	});
	assert.throws(() => rawCellAtAnyOf(row, "Missing", "Also missing"), {
		message:
			'Could not find a table cell with any of the headings: "Missing", "Also missing".',
	});
});

test("exact and AnyOf lookup APIs have distinct TypeScript signatures", () => {
	const verifyLookupTypes = (row: Row): void => {
		cellAt(row, "Heading");
		cellAtAnyOf(row, "Preferred", "Fallback");
		rawCellAt(row, "Heading");
		rawCellAtAnyOf(row, "Preferred", "Fallback");

		// @ts-expect-error Exact-heading lookups accept only one heading.
		cellAt(row, "Preferred", "Fallback");
		// @ts-expect-error Exact-heading lookups accept only one heading.
		rawCellAt(row, "Preferred", "Fallback");
	};
	void verifyLookupTypes;
});

test("textAt returns the text payload at the requested index", () => {
	assert.deepEqual(textAt(example, 0), {
		template: "A {value}",
		parameters: { value: "test" },
	});
});

test("textAt returns literal text", () => {
	assert.equal(textAt(literalExample, 0), "A literal value");
});

test("textAt reports an out-of-range index", () => {
	assert.throws(() => textAt(example, 2), {
		message:
			'Example "sample" has 1 text item; textAt() index 2 is out of range.',
	});
});

test("textAt indexes text items regardless of intervening tables", () => {
	const interleavedExample: Example = {
		id: "interleaved",
		content: [
			{ type: "table", table: table({ headings: ["First"], rows: [["one"]] }) },
			{ type: "text", text: "First text" },
			{
				type: "table",
				table: table({ headings: ["Second"], rows: [["two"]] }),
			},
			{ type: "text", text: "Second text" },
		],
	};

	assert.equal(textAt(interleavedExample, 0), "First text");
	assert.equal(textAt(interleavedExample, 1), "Second text");
});

test("textAt reports the number of available text items", () => {
	assert.throws(() => textAt(example, 1), {
		message:
			'Example "sample" has 1 text item; textAt() index 1 is out of range.',
	});
});

test("tableAt returns the table payload at the requested index", () => {
	assert.deepEqual(tableAt(example, 0), {
		rows: [[{ heading: { name: "Heading" }, value: "value" }]],
	});
});

test("tableAt indexes tables regardless of intervening text", () => {
	const interleavedExample: Example = {
		id: "interleaved",
		content: [
			{ type: "text", text: "Before" },
			{ type: "table", table: table({ headings: ["First"], rows: [["one"]] }) },
			{ type: "text", text: "Between" },
			{
				type: "table",
				table: table({ headings: ["Second"], rows: [["two"]] }),
			},
		],
	};

	assert.equal(tableAt(interleavedExample, 0).rows[0][0].value, "one");
	assert.equal(tableAt(interleavedExample, 1).rows[0][0].value, "two");
});

test("tableAt returns a table at the start of an example", () => {
	assert.deepEqual(tableAt(tableFirstExample, 0), {
		rows: [[{ heading: { name: "Heading" }, value: "value" }]],
	});
});

test("tableAt returns parameterised headers and cells", () => {
	assert.deepEqual(tableAt(parameterisedTableExample, 0), {
		rows: [
			[
				{
					heading: {
						name: {
							template: "Heading {name}",
							parameters: { name: "one" },
						},
					},
					value: { template: "Value {name}", parameters: { name: "two" } },
				},
			],
		],
	});
});

test("tableAt reports an out-of-range index", () => {
	assert.throws(() => tableAt(example, 2), {
		message: 'Example "sample" has 1 table; tableAt() index 2 is out of range.',
	});
});

test("tableAt reports the number of available tables", () => {
	assert.throws(() => tableAt(example, 1), {
		message: 'Example "sample" has 1 table; tableAt() index 1 is out of range.',
	});
});

test("soleTable returns the only table regardless of its position", () => {
	const expectedTable = table({ headings: ["Heading"], rows: [["value"]] });
	const surroundedExample: Example = {
		id: "surrounded",
		content: [
			{ type: "text", text: "Before" },
			{ type: "table", table: expectedTable },
			{ type: "text", text: "After" },
		],
	};

	assert.equal(soleTable(surroundedExample), expectedTable);
});

test("soleTable reports when an example contains no tables", () => {
	assert.throws(() => soleTable(literalExample), {
		message:
			'Example "literal" contains no tables; soleTable() requires exactly one.',
	});
});

test("soleTable reports when an example contains multiple tables", () => {
	const multipleTablesExample: Example = {
		id: "multiple-tables",
		content: [
			{ type: "table", table: table({ headings: ["First"], rows: [["one"]] }) },
			{ type: "text", text: "Between" },
			{
				type: "table",
				table: table({ headings: ["Second"], rows: [["two"]] }),
			},
		],
	};

	assert.throws(() => soleTable(multipleTablesExample), {
		message:
			'Example "multiple-tables" contains multiple tables; soleTable() requires exactly one. Use tableAt() to select a table by position.',
	});
});
