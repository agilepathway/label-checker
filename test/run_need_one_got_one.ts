import { run } from "node:test";

const integration = process.argv.includes("--integration");
console.log(`Running in ${integration ? "integration" : "virtual"} mode`);

const tests = run({
	argv: process.argv.slice(2),
	files: ["test/need_one_got_one.test.ts"],
});

let failed = false;

for await (const event of tests) {
	if (event.type === "test:fail") {
		failed = true;
	}
}

if (failed) {
	process.exitCode = 1;
}
