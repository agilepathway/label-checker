import type {
	Example,
	Rule,
	Specification,
	Table,
} from "./specification-by-example.ts";
import { expandText } from "./specification-by-example.ts";

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

export function renderSpecification(specification: Specification): string {
	return [
		`# ${specification.title}`,
		"---",
		specification.rules.map(renderRule).join("\n\n---\n\n"),
		"---",
	].join("\n\n");
}
