import { writeFile } from "node:fs/promises";

import { semanticVersionTaggingSpecification } from "./semantic-version-tagger-specification.ts";
import type { Example, Rule, Table } from "./specification.ts";

function interpolate(
	template: string,
	parameters: Record<string, string>,
): string {
	return template.replace(/\{(\w+)\}/g, (_match, name: string) => {
		const value = parameters[name];

		if (value === undefined) {
			throw new Error(`Unknown example placeholder: {${name}}`);
		}

		return value;
	});
}

function renderTable(table: Table): string {
	return [
		`| ${table.headers.join(" | ")} |`,
		`|${table.headers.map(() => "---").join("|")}|`,
		...table.rows.map((row) => `| ${row.join(" | ")} |`),
	].join("\n");
}

function renderExample(example: Example): string {
	const text = interpolate(example.text.template, example.text.parameters);

	return ["## Example", text, renderTable(example.table)].join("\n\n");
}

function renderRule(rule: Rule): string {
	return ["## Rule", rule.definition, ...rule.examples.map(renderExample)].join(
		"\n\n",
	);
}

const markdown = [
	`# ${semanticVersionTaggingSpecification.title}`,
	"---",
	semanticVersionTaggingSpecification.rules.map(renderRule).join("\n\n---\n\n"),
	"---",
].join("\n\n");

const outputPath = new URL(
	"../spec/semantic-version-tagging.md",
	import.meta.url,
);

await writeFile(outputPath, markdown, "utf8");

console.log("Published semantic-version-tagging.md");
