import type { Example, Table } from "./specification-by-example.ts";
import { expandText } from "./specification-by-example.ts";

function escapePipes(value: string): string {
	return value.replaceAll("|", "\\|");
}

function renderTable(table: Table<unknown>): string {
	const renderedTable = [
		`| ${table.rows[0].cells
			.map((cell) => expandText(cell.heading))
			.map(escapePipes)
			.join(" | ")} |`,
		`|${table.rows[0].cells.map(() => "---").join("|")}|`,
		...table.rows.map(
			(row) =>
				`| ${row.cells
					.map((cell) => expandText(cell.value))
					.map(escapePipes)
					.join(" | ")} |`,
		),
	].join("\n");

	return table.caption
		? `${expandText(table.caption)}\n\n${renderedTable}`
		: renderedTable;
}

function renderExample(example: Example<unknown, unknown>): string {
	const content = example.content.map((item) => {
		if (item.type === "text") {
			return expandText(item.text);
		}

		return renderTable(item.table);
	});

	return ["### Example", ...content].join("\n\n");
}

function renderRule(rule: {
	definition: string;
	examples: Example<unknown, unknown>[];
}): string {
	return ["## Rule", rule.definition, ...rule.examples.map(renderExample)].join(
		"\n\n",
	);
}

export function renderSpecification(specification: {
	title: string;
	rules: { definition: string; examples: Example<unknown, unknown>[] }[];
}): string {
	return [
		`# ${specification.title}`,
		"---",
		specification.rules.map(renderRule).join("\n\n---\n\n"),
		"---",
	].join("\n\n");
}
