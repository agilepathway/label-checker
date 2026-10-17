export type ParameterisedText = {
	template: string;
	parameters: Record<string, string>;
};

export type Table = {
	headers: string[];
	rows: string[][];
};

export type NonEmptyArray<T> = [T, ...T[]];

export type ContentItem =
	| { type: "text"; text: ParameterisedText }
	| { type: "table"; table: Table };

export type Example = {
	content: NonEmptyArray<ContentItem>;
	run(this: Example): Promise<void>;
};

export type Rule = {
	definition: string;
	examples: Example[];
};

export type Specification = {
	title: string;
	rules: Rule[];
};
