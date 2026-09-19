declare const process: {
	env: Record<string, string | undefined>;
	execPath: string;
	exitCode?: number;
	stdout: { write(value: string): void };
	stderr: { write(value: string): void };
};

declare module "node:fs" {
	export function appendFileSync(path: string, data: string): void;
	export function readFileSync(path: string, encoding: "utf8"): string;
}
