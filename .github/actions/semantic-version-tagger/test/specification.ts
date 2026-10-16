export type Rule = {
	definition: string;
	examples: {
		description: string;
		semanticVersion: string;
		commit: string;
		table: {
			tag: string;
			before: string | null;
			after: string | null;
			result?: "Error";
		}[];
		run: () => Promise<void>;
	}[];
};

export type Specification = {
	title: string;
	rules: Rule[];
};
