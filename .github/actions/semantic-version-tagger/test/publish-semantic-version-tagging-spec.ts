import { writeFile } from "node:fs/promises";

import { semanticVersionTaggingSpecification } from "./semantic-version-test-definitions.ts";
import type { Rule } from "./specification.ts";

type Example = Rule["examples"][number];

function interpolate(
	description: string,
	values: Record<string, string>,
): string {
	return description.replace(/\{(\w+)\}/g, (_match, name: string) => {
		const value = values[name];

		if (value === undefined) {
			throw new Error(`Unknown example placeholder: {${name}}`);
		}

		return value;
	});
}

function renderResultCell(row: Example["table"][number]): string {
	return "result" in row && row.result !== undefined ? `**${row.result}**` : "";
}

function renderTableRow(
	row: Example["table"][number],
	hasResult: boolean,
): string {
	const cells = [
		`\`${row.tag}\``,
		row.before === null ? "—" : `\`${row.before}\``,
		row.after === null ? "—" : `\`${row.after}\``,
	];

	if (hasResult) {
		cells.push(renderResultCell(row));
	}

	return `| ${cells.join(" | ")} |`;
}

function renderTable(example: Example): string {
	const hasResult = example.table.some((row) => "result" in row);

	const headers = ["Tag", "Before", "After"];

	if (hasResult) {
		headers.push("Result");
	}

	return [
		`| ${headers.join(" | ")} |`,
		`|${headers.map(() => "---").join("|")}|`,
		...example.table.map((row) => renderTableRow(row, hasResult)),
	].join("\n");
}

function renderExample(example: Example): string {
	const description = interpolate(example.description, {
		semanticVersion: example.semanticVersion,
		commit: example.commit,
	});

	return ["## Example", description, renderTable(example)].join("\n\n");
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
