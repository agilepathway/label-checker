export type ParameterisedText = {
	template: string;
	parameters: Record<string, string>;
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

export type Table = {
	headers: string[];
	rows: string[][];
};

export type ContentItem =
	| { type: "text"; text: ParameterisedText }
	| { type: "table"; table: Table };

export type Example = {
	content: [{ type: "text"; text: ParameterisedText }, ...ContentItem[]];
	run(this: Example): Promise<void>;
};

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

export type Rule = {
	definition: string;
	examples: Example[];
};

export type Specification = {
	title: string;
	rules: Rule[];
};
