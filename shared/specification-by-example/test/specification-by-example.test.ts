import assert from "node:assert/strict";
import { test } from "node:test";

import {
	assertUniqueExampleIds,
	cellAt,
	cellAtAnyOf,
	type Example,
	type ExampleFactoryInput,
	expandText,
	hasColumn,
	example as makeExample,
	type ParameterisedText,
	type Row,
	rawCellAt,
	rawCellAtAnyOf,
	type Specification,
	type Table,
	type TableFactoryInput,
	table,
	tableAt,
	textAt,
} from "../src/specification-by-example.ts";

const example: Example = makeExample({
	id: "sample",
	content: [
		{
			type: "text",
			text: { template: "A {value}", parameters: { value: "test" } },
		},
		{
			type: "table",
			table: table({ headings: ["Heading"], rows: [{ values: ["value"] }] }),
		},
	],
});

const literalExample: Example = makeExample({
	id: "literal",
	content: [{ type: "text", text: "A literal value" }],
});

const tableFirstExample: Example = makeExample({
	id: "table-first",
	content: [
		{
			type: "table",
			table: table({ headings: ["Heading"], rows: [{ values: ["value"] }] }),
		},
	],
});

const parameterisedTableExample: Example = makeExample({
	id: "parameterised-table",
	content: [
		{
			type: "table",
			table: table({
				headings: [{ template: "Heading {name}", parameters: { name: "one" } }],
				rows: [
					{
						values: [{ template: "Value {name}", parameters: { name: "two" } }],
					},
				],
			}),
		},
	],
});

const _emptyContentExample = makeExample({
	id: "empty",
	// @ts-expect-error Examples must have at least one content item.
	content: [],
});

const specification: Specification = {
	title: "Specification",
	rules: [
		{
			definition: "Rule",
			examples: [example, makeExample({ ...example, id: "another-sample" })],
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
					{
						definition: "Second",
						examples: [makeExample({ ...example })],
					},
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
		headings: [heading, "Second"],
		rows: [{ values: [value, "other"] }],
	});

	assert.deepEqual(result, {
		rows: [
			{
				cells: [
					{ heading, value },
					{ heading: "Second", value: "other" },
				],
				associatedData: undefined,
			},
		],
	});
});

test("table rejects rows with too few or too many values", () => {
	assert.throws(
		() =>
			table({
				headings: ["First", "Second"],
				rows: [{ values: ["only one"] }],
			}),
		{
			message: "Table row 1 has 1 values, but there are 2 headings.",
		},
	);
	assert.throws(
		() =>
			table({ headings: ["Only"], rows: [{ values: ["one", "too many"] }] }),
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
				rows: [{ values: ["Success", "Failure"] }],
			}),
		{ message: "Table headings must be unique." },
	);
});

test("table rejects empty headings", () => {
	assert.throws(() => table({ headings: [], rows: [{ values: [] }] }), {
		message: "A table must contain at least one heading.",
	});
});

test("table requires at least one data row", () => {
	assert.throws(
		// @ts-expect-error The table factory requires at least one row.
		() => table({ headings: ["Heading"], rows: [] }),
		{ message: "A table must contain at least one data row." },
	);
});

test("hasColumn finds literal headings", () => {
	const result = table({
		headings: ["Heading"],
		rows: [{ values: ["value"] }],
	});
	assert.equal(hasColumn(result, "Heading"), true);
	assert.equal(hasColumn(result, "Missing"), false);
});

test("hasColumn matches expanded parameterised headings", () => {
	const result = table({
		headings: [{ template: "Heading {name}", parameters: { name: "one" } }],
		rows: [{ values: ["value"] }],
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
		validated.rows.push({ cells: [], associatedData: undefined });
		// @ts-expect-error Validated cell properties are readonly.
		validated.rows[0].cells[0].value = "changed";
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
			{
				values: [
					{ template: "First {value}", parameters: { value: "cell" } },
					{ template: "Second {value}", parameters: { value: "cell" } },
				],
			},
		],
	}).rows[0];

	assert.equal(cellAt(row, "Preferred"), "Second cell");
	assert.deepEqual(rawCellAt(row, "Preferred"), {
		template: "Second {value}",
		parameters: { value: "cell" },
	});
});

test("cellAt reports when the exact heading does not exist", () => {
	const row = table({ headings: ["Heading"], rows: [{ values: ["value"] }] })
		.rows[0];
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
			{
				values: [
					{ template: "First {value}", parameters: { value: "cell" } },
					{ template: "Second {value}", parameters: { value: "cell" } },
				],
			},
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
		rows: [
			{
				values: [
					{ template: "Fallback {value}", parameters: { value: "cell" } },
				],
			},
		],
	}).rows[0];

	assert.equal(cellAtAnyOf(row, "Preferred", "Fallback"), "Fallback cell");
	assert.deepEqual(rawCellAtAnyOf(row, "Preferred", "Fallback"), {
		template: "Fallback {value}",
		parameters: { value: "cell" },
	});
});

test("AnyOf lookups report when none of the requested headings exist", () => {
	const row = table({ headings: ["Heading"], rows: [{ values: ["value"] }] })
		.rows[0];
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
		rows: [
			{
				cells: [{ heading: "Heading", value: "value" }],
				associatedData: undefined,
			},
		],
	});
});

test("table preserves row-associated data and leaves omitted data undefined", () => {
	const associatedData = { expectedOutcome: "success" };
	const result = table({
		headings: ["Heading"],
		rows: [{ values: ["first"], associatedData }, { values: ["second"] }],
	});

	assert.deepEqual(
		result.rows.map((row) => row.associatedData),
		[associatedData, undefined],
	);
	assert.deepEqual(result.rows[0], {
		cells: [{ heading: "Heading", value: "first" }],
		associatedData,
	});

	const mixedRows = table({
		headings: ["Heading"],
		rows: [
			{ values: ["configured"], associatedData },
			{ values: ["defaulted"] },
		],
	});

	const verifyMixedRowTypes = (): void => {
		// @ts-expect-error Mixed rows may omit associated data.
		const expectedOutcome: typeof associatedData =
			mixedRows.rows[1].associatedData;
		void expectedOutcome;

		const invalidTableInput: TableFactoryInput = {
			headings: ["Heading"],
			rows: [
				{
					values: ["value"],
					// @ts-expect-error The default generic rejects consumer-specific associated data.
					associatedData: { unexpected: true },
				},
			],
		};
		void invalidTableInput;
	};
	void verifyMixedRowTypes;

	const namedInput: TableFactoryInput<{ outcome: string }> = {
		headings: ["Heading"],
		rows: [
			{ values: ["configured"], associatedData: { outcome: "success" } },
			{ values: ["omitted"] },
		],
	};
	const namedTable = table(namedInput);
	assert.equal(namedTable.rows[1].associatedData, undefined);
	const explicitTable = table<{ outcome: string }>({
		headings: ["Heading"],
		rows: [
			{ values: ["configured"], associatedData: { outcome: "success" } },
			{ values: ["explicitly absent"], associatedData: undefined },
		],
	});

	const verifyOptionalRowTypes = (): void => {
		// @ts-expect-error Named inputs can omit the metadata.
		const namedOutcome: string = namedTable.rows[0].associatedData.outcome;
		const namedMissingOutcome: string =
			// @ts-expect-error Named inputs can omit metadata on individual rows.
			namedTable.rows[1].associatedData.outcome;
		const explicitOutcome: string =
			// @ts-expect-error Explicit generic inputs can omit metadata too.
			explicitTable.rows[1].associatedData.outcome;
		const checkedOutcome = namedTable.rows[0].associatedData?.outcome;
		// biome-ignore lint/style/noNonNullAssertion: This case verifies the documented consumer assertion.
		const assertedOutcome = explicitTable.rows[0].associatedData!.outcome;
		void namedOutcome;
		void namedMissingOutcome;
		void explicitOutcome;
		void checkedOutcome;
		void assertedOutcome;
	};
	void verifyOptionalRowTypes;

	const nullAssociatedData: null | undefined = table({
		headings: ["Heading"],
		rows: [{ values: ["null"], associatedData: null }],
	}).rows[0].associatedData;
	assert.equal(nullAssociatedData, null);
});

test("example preserves supplied associated data and leaves omitted data undefined", () => {
	const defaultExample = makeExample({
		id: "default-associated-data",
		content: [{ type: "text", text: "Visible" }],
	});
	assert.equal(defaultExample.associatedData, undefined);

	const associatedData = { testConfiguration: "special" };
	const configuredExample = makeExample({
		id: "configured-associated-data",
		content: [{ type: "text", text: "Visible" }],
		associatedData,
	});
	assert.deepEqual(configuredExample.associatedData, associatedData);
	assert.equal(configuredExample.associatedData.testConfiguration, "special");

	const nullExample = makeExample({
		id: "null-associated-data",
		content: [{ type: "text", text: "Visible" }],
		associatedData: null,
	});
	const nullExampleAssociatedData: null | undefined =
		nullExample.associatedData;
	assert.equal(nullExample.associatedData, null);
	assert.equal(nullExampleAssociatedData, null);
});

test("example preserves explicit undefined and optional associated data", () => {
	type Configuration = { mode: string };
	const explicitUndefined = makeExample({
		id: "explicitly-undefined-associated-data",
		content: [{ type: "text", text: "Visible" }],
		associatedData: undefined,
	});

	const makeOptionalExample = (
		associatedData: Configuration | undefined,
	): Example<never, Configuration> =>
		makeExample({
			id: "optional-associated-data",
			content: [{ type: "text", text: "Visible" }],
			associatedData,
		});
	const optional = makeOptionalExample(undefined);

	const verifyAssociatedDataTypes = (): void => {
		const explicitUndefinedValue: undefined = explicitUndefined.associatedData;
		const optionalValue: Configuration | undefined = optional.associatedData;
		// @ts-expect-error A union input may produce configured metadata.
		const onlyUndefined: undefined = optional.associatedData;
		// @ts-expect-error A union input may produce undefined.
		const onlyConfiguration: Configuration = optional.associatedData;
		void explicitUndefinedValue;
		void optionalValue;
		void onlyUndefined;
		void onlyConfiguration;
	};
	void verifyAssociatedDataTypes;

	assert.equal(explicitUndefined.associatedData, undefined);
	assert.equal(optional.associatedData, undefined);
});

test("example accepts named and explicitly generic inputs with optional associated data", () => {
	type Configuration = { mode: string };
	const namedInput: ExampleFactoryInput<never, Configuration> = {
		id: "named-input",
		content: [{ type: "text", text: "Visible" }],
	};
	const namedResult = makeExample(namedInput);
	const explicitResult = makeExample<never, Configuration>({
		id: "explicit-generics",
		content: [{ type: "text", text: "Visible" }],
	});

	const verifyOptionalAssociatedDataTypes = (): void => {
		// @ts-expect-error The named input may omit its associated data.
		const namedConfiguration: Configuration = namedResult.associatedData;
		// @ts-expect-error Explicit generic inputs may omit associated data too.
		const explicitConfiguration: Configuration = explicitResult.associatedData;
		void namedConfiguration;
		void explicitConfiguration;
	};
	void verifyOptionalAssociatedDataTypes;

	const verifyFactoryInputTypes = (
		named: Configuration | undefined,
		explicit: Configuration | undefined,
	): void => {
		void named;
		void explicit;
	};
	verifyFactoryInputTypes(
		namedResult.associatedData,
		explicitResult.associatedData,
	);

	const verifyDefaultAssociatedDataType = (): void => {
		makeExample<never, never>({
			id: "invalid-associated-data",
			content: [{ type: "text", text: "Visible" }],
			// @ts-expect-error The default generic rejects consumer-specific associated data.
			associatedData: { unexpected: true },
		});
	};
	void verifyDefaultAssociatedDataType;
});

test("tableAt returns a table at the start of an example", () => {
	assert.deepEqual(tableAt(tableFirstExample, 0), {
		rows: [
			{
				cells: [{ heading: "Heading", value: "value" }],
				associatedData: undefined,
			},
		],
	});
});

test("tableAt returns parameterised headers and cells", () => {
	assert.deepEqual(tableAt(parameterisedTableExample, 0), {
		rows: [
			{
				cells: [
					{
						heading: {
							template: "Heading {name}",
							parameters: { name: "one" },
						},
						value: { template: "Value {name}", parameters: { name: "two" } },
					},
				],
				associatedData: undefined,
			},
		],
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
