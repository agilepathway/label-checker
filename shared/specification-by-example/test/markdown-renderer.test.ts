import assert from "node:assert/strict";
import { test } from "node:test";
import { renderSpecification } from "../src/markdown-renderer.ts";
import type { Specification } from "../src/specification-by-example.ts";

test("renderSpecification expands parameterised text", () => {
	const specification: Specification = {
		title: "A specification",
		rules: [
			{
				definition: "The rule.",
				examples: [
					{
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
					},
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
			"## Example",
			"",
			"A `v1.2.3` release",
			"",
			"---",
		].join("\n"),
	);
});

test("renderSpecification preserves ordered content, tables, rules, and examples", () => {
	const specification: Specification = {
		title: "A specification",
		rules: [
			{
				definition: "The first rule.",
				examples: [
					{
						id: "ordered-content",
						content: [
							{
								type: "text",
								text: { template: "Before the table.", parameters: {} },
							},
							{
								type: "table",
								table: {
									headers: ["Name", "Value"],
									rows: [
										["first", "one"],
										["second", "two"],
									],
								},
							},
							{
								type: "text",
								text: { template: "After the table.", parameters: {} },
							},
						],
					},
					{
						id: "second-example",
						content: [
							{
								type: "text",
								text: { template: "A second example.", parameters: {} },
							},
						],
					},
				],
			},
			{
				definition: "The second rule.",
				examples: [
					{
						id: "different-table",
						content: [
							{
								type: "table",
								table: {
									headers: ["Only heading"],
									rows: [["only row"]],
								},
							},
							{
								type: "text",
								text: {
									template: "A table with a different shape.",
									parameters: {},
								},
							},
						],
					},
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
			"## Example",
			"",
			"Before the table.",
			"",
			"| Name | Value |",
			"|---|---|",
			"| first | one |",
			"| second | two |",
			"",
			"After the table.",
			"",
			"## Example",
			"",
			"A second example.",
			"",
			"---",
			"",
			"## Rule",
			"",
			"The second rule.",
			"",
			"## Example",
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
