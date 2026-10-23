export type ParameterisedText = {
	template: string;
	parameters: Record<string, string>;
};

export type TableText = string | ParameterisedText;

export type Table<T extends TableText = TableText> = {
	headers: T[];
	rows: T[][];
};

export type ContentItem =
	| { type: "text"; text: ParameterisedText }
	| { type: "table"; table: Table };

export type NonEmptyArray<T> = [T, ...T[]];

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

export function expandText(text: ParameterisedText): string {
	return text.template.replace(/\{(\w+)\}/g, (_match, name: string) => {
		const value = text.parameters[name];

		if (value === undefined) {
			throw new Error(`Unknown example placeholder: {${name}}`);
		}

		return value;
	});
}

export function textAt(example: Example, index: number): ParameterisedText {
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
