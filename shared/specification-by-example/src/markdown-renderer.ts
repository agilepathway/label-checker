import type {
	Example,
	Rule,
	Specification,
	Table,
} from "./specification-by-example.ts";
import { expandText } from "./specification-by-example.ts";

function escapePipes(value: string): string {
	return value.replaceAll("|", "\\|");
}

function renderTable(table: Table): string {
	const headingRow = table.rows[0];
	const visibleColumnIndices = headingRow.flatMap((cell, index) =>
		typeof cell.heading === "string" &&
		cell.heading.toLowerCase() === "unpublished data"
			? []
			: [index],
	);
	const visibleColumns = new Set(visibleColumnIndices);
	const renderedTable = [
		`| ${headingRow
			.filter((_cell, index) => visibleColumns.has(index))
			.map((cell) => expandText(cell.heading))
			.map(escapePipes)
			.join(" | ")} |`,
		`|${visibleColumnIndices.map(() => "---").join("|")}|`,
		...table.rows.map(
			(row) =>
				`| ${row
					.filter((_cell, index) => visibleColumns.has(index))
					.map((cell) => expandText(cell.value))
					.map(escapePipes)
					.join(" | ")} |`,
		),
	].join("\n");

	return table.caption
		? `${expandText(table.caption)}\n\n${renderedTable}`
		: renderedTable;
}

function renderExample(example: Example): string {
	const content = example.content.map((item) => {
		if (item.type === "text") {
			return expandText(item.text);
		}

		return renderTable(item.table);
	});

	return ["### Example", ...content].join("\n\n");
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
