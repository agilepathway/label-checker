import { run } from "node:test";

const tests = run({
	argv: process.argv.slice(2),
	files: ["test/need_one_got_one.test.ts"],
});

for await (const event of tests) {
	if (event.type === "test:stdout") {
		process.stdout.write(event.data.message);
	}

	if (event.type === "test:stderr") {
		process.stderr.write(event.data.message);
	}

	if (event.type === "test:summary" && event.data.file === undefined) {
		process.exitCode = event.data.success ? 0 : 1;
	}
}
