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

export type Row<TAssociatedData = never> = {
	readonly cells: readonly Cell[];
	readonly associatedData: TAssociatedData | undefined;
};

export type Table<TAssociatedData = never> = {
	readonly caption?: Text;
	readonly rows: ReadonlyNonEmptyArray<Row<TAssociatedData>>;
	readonly [validatedTable]: true;
};

declare const validatedTable: unique symbol;

export type ContentItem<TAssociatedData = never> =
	| { type: "text"; text: Text }
	| { type: "table"; table: Table<TAssociatedData> };

export type TableFactoryInput<TAssociatedData = never> = {
	caption?: Text;
	headings: Text[];
	rows: NonEmptyArray<{
		values: Text[];
		associatedData?: TAssociatedData | undefined;
	}>;
};

export type Example<TRowAssociatedData = never, TAssociatedData = never> = {
	id: string;
	content: NonEmptyArray<ContentItem<TRowAssociatedData>>;
	associatedData: TAssociatedData | undefined;
};

export type ExampleFactoryInput<
	TRowAssociatedData = never,
	TAssociatedData = never,
> = {
	id: string;
	content: NonEmptyArray<ContentItem<TRowAssociatedData>>;
	associatedData?: TAssociatedData | undefined;
};

export type Rule<TRowAssociatedData = never, TExampleAssociatedData = never> = {
	definition: string;
	examples: Example<TRowAssociatedData, TExampleAssociatedData>[];
};

export type Specification<
	TRowAssociatedData = never,
	TExampleAssociatedData = never,
> = {
	title: string;
	rules: Rule<TRowAssociatedData, TExampleAssociatedData>[];
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

export function table<TAssociatedData = never>({
	caption,
	headings,
	rows,
}: TableFactoryInput<TAssociatedData>): Table<
	Exclude<TAssociatedData, undefined>
> {
	if (headings.length === 0) {
		throw new Error("A table must contain at least one heading.");
	}

	const expandedHeadings = headings.map(expandText);
	if (new Set(expandedHeadings).size !== expandedHeadings.length) {
		throw new Error("Table headings must be unique.");
	}

	const pairedRows = rows.map(({ values, associatedData }, rowIndex) => {
		if (values.length !== headings.length) {
			throw new Error(
				`Table row ${rowIndex + 1} has ${values.length} values, but there are ${headings.length} headings.`,
			);
		}

		const cells = headings.map((heading, index) => {
			const value = values[index];
			if (value === undefined) {
				throw new Error(
					`Table row ${rowIndex + 1} is missing a value for heading "${expandText(heading)}".`,
				);
			}

			return { heading, value };
		});

		return {
			cells,
			associatedData,
		};
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
	return result as unknown as Table<Exclude<TAssociatedData, undefined>>;
}

export function hasColumn(table: Table<unknown>, heading: string): boolean {
	return table.rows[0].cells.some(
		(cell) => expandText(cell.heading) === heading,
	);
}

export function rawCellAt(row: Row<unknown>, heading: string): Text {
	const cell = row.cells.find(
		(candidate) => expandText(candidate.heading) === heading,
	);
	if (cell === undefined) {
		throw new Error(
			`Could not find a table cell with the heading: "${heading}".`,
		);
	}

	return cell.value;
}

export function rawCellAtAnyOf(row: Row<unknown>, ...headings: string[]): Text {
	const cell = headings
		.map((heading) =>
			row.cells.find((candidate) => expandText(candidate.heading) === heading),
		)
		.find((candidate) => candidate !== undefined);
	if (cell === undefined) {
		throw new Error(
			`Could not find a table cell with any of the headings: ${headings.map((heading) => `"${heading}"`).join(", ")}.`,
		);
	}

	return cell.value;
}

export function cellAt(row: Row<unknown>, heading: string): string {
	return expandText(rawCellAt(row, heading));
}

export function cellAtAnyOf(row: Row<unknown>, ...headings: string[]): string {
	return expandText(rawCellAtAnyOf(row, ...headings));
}

export function example<TRowAssociatedData = never, TAssociatedData = never>({
	id,
	content,
	associatedData,
}: ExampleFactoryInput<TRowAssociatedData, TAssociatedData>): Example<
	TRowAssociatedData,
	Exclude<TAssociatedData, undefined>
> {
	return {
		id,
		content,
		// biome-ignore lint/nursery/noUnsafeTypeAssertion: Undefined is normalized out of the inferred associated-data generic.
		associatedData: associatedData as
			| Exclude<TAssociatedData, undefined>
			| undefined,
	};
}

export function textAt<TRowAssociatedData, TAssociatedData>(
	example: Example<TRowAssociatedData, TAssociatedData>,
	index: number,
): Text {
	const item = example.content[index];
	if (item?.type !== "text") {
		const found = item ? `"${item.type}" content` : "no content";
		throw new Error(
			`Expected text content at index ${index}, but found ${found}.`,
		);
	}

	return item.text;
}

export function tableAt<TRowAssociatedData, TAssociatedData>(
	example: Example<TRowAssociatedData, TAssociatedData>,
	index: number,
): Table<TRowAssociatedData> {
	const item = example.content[index];
	if (item?.type !== "table") {
		const found = item ? `"${item.type}" content` : "no content";
		throw new Error(
			`Expected table content at index ${index}, but found ${found}.`,
		);
	}

	return item.table;
}

export function assertUniqueExampleIds<
	TSpecification extends {
		rules: { examples: { id: string }[] }[];
	},
>(specification: TSpecification): void {
	const ids = new Set<string>();

	for (const example of specification.rules.flatMap((rule) => rule.examples)) {
		if (ids.has(example.id)) {
			throw new Error(`Duplicate example ID: ${example.id}`);
		}

		ids.add(example.id);
	}
}
