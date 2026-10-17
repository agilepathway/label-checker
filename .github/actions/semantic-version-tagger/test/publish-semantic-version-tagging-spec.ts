import { writeFile } from "node:fs/promises";

import type {
	Example,
	Rule,
	Table,
} from "../../../../shared/specification-by-example/src/specification-by-example.ts";
import { expandText } from "../../../../shared/specification-by-example/src/specification-by-example.ts";
import { semanticVersionTaggingSpecification } from "./semantic-version-tagger-specification.ts";

function renderTable(table: Table): string {
	return [
		`| ${table.headers.join(" | ")} |`,
		`|${table.headers.map(() => "---").join("|")}|`,
		...table.rows.map((row) => `| ${row.join(" | ")} |`),
	].join("\n");
}

function renderExample(example: Example): string {
	const content = example.content.map((item) => {
		if (item.type === "text") {
			return expandText(item.text);
		}

		return renderTable(item.table);
	});

	return ["## Example", ...content].join("\n\n");
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
