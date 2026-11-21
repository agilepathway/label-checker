import assert from "node:assert/strict";
import { test } from "node:test";
import { renderSpecification } from "../src/markdown-renderer.ts";
import type {
	ContentItem,
	Specification,
} from "../src/specification-by-example.ts";
import { example, table } from "../src/specification-by-example.ts";

test("renderSpecification expands parameterised text", () => {
	const specification: Specification = {
		title: "A specification",
		rules: [
			{
				definition: "The rule.",
				examples: [
					example({
						id: "version-release",
						content: [
							{
								type: "text",
								text: {
									template: "A `{version}` release",
									parameters: { version: "v1.2.3" },
								},
							},
						],
					}),
				],
			},
		],
	};

	assert.equal(
		renderSpecification(specification),
		[
			"# A specification",
			"",
			"---",
			"",
			"## Rule",
			"",
			"The rule.",
			"",
			"### Example",
			"",
			"A `v1.2.3` release",
			"",
			"---",
		].join("\n"),
	);
});

test("renderSpecification preserves ordered content, tables, rules, and examples", () => {
	const specification: Specification<
		{ hiddenRowMetadata: string },
		{ hiddenExampleMetadata: string }
	> = {
		title: "A specification",
		rules: [
			{
				definition: "The first rule.",
				examples: [
					example({
						id: "ordered-content",
						associatedData: { hiddenExampleMetadata: "not published" },
						content: [
							{
								type: "text",
								text: "Before the table.",
							},
							{
								type: "table",
								table: table({
									caption: {
										template: "A {kind} caption.",
										parameters: { kind: "table" },
									},
									headings: ["Name", "Value"],
									rows: [
										{
											values: ["first", "one"],
											associatedData: { hiddenRowMetadata: "not published" },
										},
										{ values: ["second", "two"] },
									],
								}),
							},
							{
								type: "text",
								text: "After the table.",
							},
						],
					}),
					example({
						id: "second-example",
						content: [
							{
								type: "text",
								text: "A second example.",
							},
						],
					}),
				],
			},
			{
				definition: "The second rule.",
				examples: [
					example({
						id: "different-table",
						content: [
							{
								type: "table",
								table: table({
									headings: ["Only heading"],
									rows: [{ values: ["only row"] }],
								}),
							},
							{
								type: "text",
								text: "A table with a different shape.",
							},
						],
					}),
				],
			},
		],
	};

	assert.equal(
		renderSpecification(specification),
		[
			"# A specification",
			"",
			"---",
			"",
			"## Rule",
			"",
			"The first rule.",
			"",
			"### Example",
			"",
			"Before the table.",
			"",
			"A table caption.",
			"",
			"| Name | Value |",
			"|---|---|",
			"| first | one |",
			"| second | two |",
			"",
			"After the table.",
			"",
			"### Example",
			"",
			"A second example.",
			"",
			"---",
			"",
			"## Rule",
			"",
			"The second rule.",
			"",
			"### Example",
			"",
			"| Only heading |",
			"|---|",
			"| only row |",
			"",
			"A table with a different shape.",
			"",
			"---",
		].join("\n"),
	);
});

test("renderSpecification escapes literal pipes in table headers and cells", () => {
	const specification: Specification = {
		title: "A specification",
		rules: [
			{
				definition: "The rule.",
				examples: [
					example({
						id: "table-with-pipes",
						content: [
							{
								type: "table",
								table: table({
									headings: ["Name | label", "Value"],
									rows: [{ values: ["first", "one | two"] }],
								}),
							},
						],
					}),
				],
			},
		],
	};

	assert.equal(
		renderSpecification(specification),
		[
			"# A specification",
			"",
			"---",
			"",
			"## Rule",
			"",
			"The rule.",
			"",
			"### Example",
			"",
			"| Name \\| label | Value |",
			"|---|---|",
			"| first | one \\| two |",
			"",
			"---",
		].join("\n"),
	);
});

test("renderSpecification preserves braces in literal text and table values", () => {
	const specification: Specification = {
		title: "A specification",
		rules: [
			{
				definition: "The rule.",
				examples: [
					example({
						id: "literal-braces",
						content: [
							{ type: "text", text: "Use {name} literally." },
							{
								type: "table",
								table: table({
									caption: "Caption {name}",
									headings: ["Header {name}"],
									rows: [{ values: ["Cell {name}"] }],
								}),
							},
						],
					}),
				],
			},
		],
	};

	assert.match(
		renderSpecification(specification),
		/Use \{name\} literally\.\n\nCaption \{name\}\n\n\| Header \{name\} \|\n\|---\|\n\| Cell \{name\} \|/,
	);
});

test("renderSpecification expands parameterised table headers and cells", () => {
	const specification: Specification = {
		title: "A specification",
		rules: [
			{
				definition: "The rule.",
				examples: [
					example({
						id: "parameterised-table",
						content: [
							{
								type: "table",
								table: table({
									headings: [
										{
											template: "Name {kind}",
											parameters: { kind: "label|value" },
										},
									],
									rows: [
										{
											values: [
												{
													template: "{name}",
													parameters: { name: "first|one" },
												},
											],
										},
									],
								}),
							},
						],
					}),
				],
			},
		],
	};

	assert.match(
		renderSpecification(specification),
		/\| Name label\\\|value \|\n\|---\|\n\| first\\\|one \|/,
	);
});

test("renderSpecification rejects unknown placeholders in table headers and cells", () => {
	const tableSpecification = (content: ContentItem): Specification => ({
		title: "A specification",
		rules: [
			{
				definition: "The rule.",
				examples: [
					example({
						id: "unknown-table-placeholder",
						content: [content],
					}),
				],
			},
		],
	});

	assert.throws(
		() =>
			table({
				headings: [{ template: "{missing}", parameters: {} }],
				rows: [{ values: ["value"] }],
			}),
		{ message: "Unknown example placeholder: {missing}" },
	);

	assert.throws(
		() =>
			renderSpecification(
				tableSpecification({
					type: "table",
					table: table({
						headings: ["Heading"],
						rows: [{ values: [{ template: "{missing}", parameters: {} }] }],
					}),
				}),
			),
		{ message: "Unknown example placeholder: {missing}" },
	);
});
