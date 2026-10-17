export type ParameterisedText = {
	template: string;
	parameters: Record<string, string>;
};

export type Table = {
	headers: string[];
	rows: string[][];
};

export type Example = {
	text: ParameterisedText;
	table: Table;
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
