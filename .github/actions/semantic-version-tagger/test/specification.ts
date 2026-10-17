export type ParameterisedDescription = {
	template: string;
	parameters: Record<string, string>;
};

export type Example = {
	description: ParameterisedDescription;
	table: {
		tag: string;
		before: string | null;
		after: string | null;
		result?: "Error";
	}[];
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
