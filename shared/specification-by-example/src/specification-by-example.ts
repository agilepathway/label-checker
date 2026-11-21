export type ParameterisedText = {
	readonly template: string;
	readonly parameters: Readonly<Record<string, string>>;
};

export type Text = string | ParameterisedText;

export type NonEmptyArray<T> = [T, ...T[]];

export type ReadonlyNonEmptyArray<T> = readonly [T, ...T[]];

export type Cell = {
	readonly heading: Text;
	readonly value: Text;
};

export type Row = readonly Cell[];

export type Table = {
	readonly caption?: Text;
	readonly rows: ReadonlyNonEmptyArray<Row>;
	readonly [validatedTable]: true;
};

declare const validatedTable: unique symbol;

export type ContentItem =
	| { type: "text"; text: Text }
	| { type: "table"; table: Table };

export type TableFactoryInput = {
	caption?: Text;
	headings: Text[];
	rows: NonEmptyArray<Text[]>;
};

export type Example = {
	id: string;
	content: NonEmptyArray<ContentItem>;
};

export type Rule = {
	definition: string;
	examples: Example[];
};

export type Specification = {
	title: string;
	rules: Rule[];
};

export function expandText(text: Text): string {
	if (typeof text === "string") {
		return text;
	}

	return text.template.replace(/\{(\w+)\}/g, (_match, name: string) => {
		const value = text.parameters[name];

		if (value === undefined) {
			throw new Error(`Unknown example placeholder: {${name}}`);
		}

		return value;
	});
}

export function table({ caption, headings, rows }: TableFactoryInput): Table {
	if (headings.length === 0) {
		throw new Error("A table must contain at least one heading.");
	}

	const expandedHeadings = headings.map(expandText);
	if (new Set(expandedHeadings).size !== expandedHeadings.length) {
		throw new Error("Table headings must be unique.");
	}

	const pairedRows = rows.map((row, rowIndex) => {
		if (row.length !== headings.length) {
			throw new Error(
				`Table row ${rowIndex + 1} has ${row.length} values, but there are ${headings.length} headings.`,
			);
		}

		return headings.map((heading, index) => {
			const value = row[index];
			if (value === undefined) {
				throw new Error(
					`Table row ${rowIndex + 1} is missing a value for heading "${expandText(heading)}".`,
				);
			}

			return { heading, value };
		});
	});

	if (pairedRows.length === 0) {
		throw new Error("A table must contain at least one data row.");
	}

	const [firstRow, ...remainingRows] = pairedRows;
	if (firstRow === undefined) {
		throw new Error("A table must contain at least one data row.");
	}

	const result = {
		...(caption === undefined ? {} : { caption }),
		rows: [firstRow, ...remainingRows],
	};
	// biome-ignore lint/nursery/noUnsafeTypeAssertion: The private brand is compile-time-only and is created only after validation.
	return result as unknown as Table;
}

export function hasColumn(table: Table, heading: string): boolean {
	return table.rows[0].some((cell) => expandText(cell.heading) === heading);
}

export function rawCellAt(row: Row, heading: string): Text {
	const cell = row.find(
		(candidate) => expandText(candidate.heading) === heading,
	);
	if (cell === undefined) {
		throw new Error(
			`Could not find a table cell with the heading: "${heading}".`,
		);
	}

	return cell.value;
}

export function rawCellAtAnyOf(row: Row, ...headings: string[]): Text {
	const cell = headings
		.map((heading) =>
			row.find((candidate) => expandText(candidate.heading) === heading),
		)
		.find((candidate) => candidate !== undefined);
	if (cell === undefined) {
		throw new Error(
			`Could not find a table cell with any of the headings: ${headings.map((heading) => `"${heading}"`).join(", ")}.`,
		);
	}

	return cell.value;
}

export function cellAt(row: Row, heading: string): string {
	return expandText(rawCellAt(row, heading));
}

export function cellAtAnyOf(row: Row, ...headings: string[]): string {
	return expandText(rawCellAtAnyOf(row, ...headings));
}

export function textAt(example: Example, index: number): Text {
	const item = example.content[index];
	if (item?.type !== "text") {
		const found = item ? `"${item.type}" content` : "no content";
		throw new Error(
			`Expected text content at index ${index}, but found ${found}.`,
		);
	}

	return item.text;
}

export function tableAt(example: Example, index: number): Table {
	const item = example.content[index];
	if (item?.type !== "table") {
		const found = item ? `"${item.type}" content` : "no content";
		throw new Error(
			`Expected table content at index ${index}, but found ${found}.`,
		);
	}

	return item.table;
}

export function assertUniqueExampleIds(specification: Specification): void {
	const ids = new Set<string>();

	for (const example of specification.rules.flatMap((rule) => rule.examples)) {
		if (ids.has(example.id)) {
			throw new Error(`Duplicate example ID: ${example.id}`);
		}

		ids.add(example.id);
	}
}
