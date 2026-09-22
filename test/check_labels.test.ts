import assert from "node:assert/strict";
import { test } from "node:test";
import {
	type Requirements,
	runLabelCheck,
} from "./check_labels_test_harness.ts";

type Scenario = {
	name: string;
	pullRequestNumber: number;
	labels: string[];
	requirements: Requirements;
	prefixMode?: boolean;
	status: number;
	stdout: string;
	stderr: string;
	output: string;
};

const scenarios: Scenario[] = [
	{
		name: "none, got 0",
		pullRequestNumber: 1,
		labels: [],
		requirements: { none: "major,minor,patch" },
		status: 0,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required none of 'major', 'minor', 'patch', and found 0.\n",
		stderr: "",
		output: "label_check=success",
	},
	{
		name: "none, got 1",
		pullRequestNumber: 2,
		labels: ["minor"],
		requirements: { none: "major,minor,patch" },
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required none of 'major', 'minor', 'patch', but found 1: 'minor'\n",
		output: "label_check=failure",
	},
	{
		name: "none, got 2",
		pullRequestNumber: 3,
		labels: ["minor", "patch"],
		requirements: { none: "major,minor,patch" },
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required none of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\n",
		output: "label_check=failure",
	},
	{
		name: "none, got 3",
		pullRequestNumber: 4,
		labels: ["major", "minor", "patch"],
		requirements: { none: "major,minor,patch" },
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required none of 'major', 'minor', 'patch', but found 3: 'major', 'minor', 'patch'\n",
		output: "label_check=failure",
	},
	{
		name: "one, got 0",
		pullRequestNumber: 1,
		labels: [],
		requirements: { one: "major,minor,patch" },
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 0.\n",
		output: "label_check=failure",
	},
	{
		name: "one, got 1",
		pullRequestNumber: 2,
		labels: ["minor"],
		requirements: { one: "major,minor,patch" },
		status: 0,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required 1 of 'major', 'minor', 'patch', and found 1: 'minor'\n",
		stderr: "",
		output: "label_check=success",
	},
	{
		name: "one, got 2",
		pullRequestNumber: 3,
		labels: ["minor", "patch"],
		requirements: { one: "major,minor,patch" },
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\n",
		output: "label_check=failure",
	},
	{
		name: "one, got 3",
		pullRequestNumber: 4,
		labels: ["major", "minor", "patch"],
		requirements: { one: "major,minor,patch" },
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 3: 'major', 'minor', 'patch'\n",
		output: "label_check=failure",
	},
	{
		name: "all, got 0",
		pullRequestNumber: 1,
		labels: [],
		requirements: { all: "major,minor,patch" },
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required all of 'major', 'minor', 'patch', but found 0.\n",
		output: "label_check=failure",
	},
	{
		name: "all, got 1",
		pullRequestNumber: 2,
		labels: ["minor"],
		requirements: { all: "major,minor,patch" },
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required all of 'major', 'minor', 'patch', but found 1: 'minor'\n",
		output: "label_check=failure",
	},
	{
		name: "all, got 2",
		pullRequestNumber: 3,
		labels: ["minor", "patch"],
		requirements: { all: "major,minor,patch" },
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required all of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\n",
		output: "label_check=failure",
	},
	{
		name: "all, got 3",
		pullRequestNumber: 4,
		labels: ["major", "minor", "patch"],
		requirements: { all: "major,minor,patch" },
		status: 0,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required all of 'major', 'minor', 'patch', and found 3: 'major', 'minor', 'patch'\n",
		stderr: "",
		output: "label_check=success",
	},
	{
		name: "any, got 0",
		pullRequestNumber: 1,
		labels: [],
		requirements: { any: "major,minor,patch" },
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required any of 'major', 'minor', 'patch', but found 0.\n",
		output: "label_check=failure",
	},
	{
		name: "any, got 1",
		pullRequestNumber: 2,
		labels: ["minor"],
		requirements: { any: "major,minor,patch" },
		status: 0,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required any of 'major', 'minor', 'patch', and found 1: 'minor'\n",
		stderr: "",
		output: "label_check=success",
	},
	{
		name: "any, got 2",
		pullRequestNumber: 3,
		labels: ["minor", "patch"],
		requirements: { any: "major,minor,patch" },
		status: 0,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required any of 'major', 'minor', 'patch', and found 2: 'minor', 'patch'\n",
		stderr: "",
		output: "label_check=success",
	},
	{
		name: "any, got 3",
		pullRequestNumber: 4,
		labels: ["major", "minor", "patch"],
		requirements: { any: "major,minor,patch" },
		status: 0,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required any of 'major', 'minor', 'patch', and found 3: 'major', 'minor', 'patch'\n",
		stderr: "",
		output: "label_check=success",
	},
	{
		name: "[none, one], got 0",
		pullRequestNumber: 1,
		labels: [],
		requirements: { none: "major,minor,patch", one: "major,minor,patch" },
		status: 1,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required none of 'major', 'minor', 'patch', and found 0.\n",
		stderr:
			"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 0.\n",
		output: "label_check=failure",
	},
	{
		name: "[none, one], got 1",
		pullRequestNumber: 2,
		labels: ["minor"],
		requirements: { none: "major,minor,patch", one: "major,minor,patch" },
		status: 1,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required 1 of 'major', 'minor', 'patch', and found 1: 'minor'\n",
		stderr:
			"::error:: Label check failed: required none of 'major', 'minor', 'patch', but found 1: 'minor'\n",
		output: "label_check=failure",
	},
	{
		name: "[none, one], got 2",
		pullRequestNumber: 3,
		labels: ["minor", "patch"],
		requirements: { none: "major,minor,patch", one: "major,minor,patch" },
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\nLabel check failed: required none of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\n",
		output: "label_check=failure",
	},
	{
		name: "[none, one], got 3",
		pullRequestNumber: 4,
		labels: ["major", "minor", "patch"],
		requirements: { none: "major,minor,patch", one: "major,minor,patch" },
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 3: 'major', 'minor', 'patch'\nLabel check failed: required none of 'major', 'minor', 'patch', but found 3: 'major', 'minor', 'patch'\n",
		output: "label_check=failure",
	},
	{
		name: "[none, one, all], got 0",
		pullRequestNumber: 1,
		labels: [],
		requirements: {
			none: "major,minor,patch",
			one: "major,minor,patch",
			all: "major,minor,patch",
		},
		status: 1,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required none of 'major', 'minor', 'patch', and found 0.\n",
		stderr:
			"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 0.\nLabel check failed: required all of 'major', 'minor', 'patch', but found 0.\n",
		output: "label_check=failure",
	},
	{
		name: "[none, one, all], got 1",
		pullRequestNumber: 2,
		labels: ["minor"],
		requirements: {
			none: "major,minor,patch",
			one: "major,minor,patch",
			all: "major,minor,patch",
		},
		status: 1,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required 1 of 'major', 'minor', 'patch', and found 1: 'minor'\n",
		stderr:
			"::error:: Label check failed: required none of 'major', 'minor', 'patch', but found 1: 'minor'\nLabel check failed: required all of 'major', 'minor', 'patch', but found 1: 'minor'\n",
		output: "label_check=failure",
	},
	{
		name: "[none, one, all], got 2",
		pullRequestNumber: 3,
		labels: ["minor", "patch"],
		requirements: {
			none: "major,minor,patch",
			one: "major,minor,patch",
			all: "major,minor,patch",
		},
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\nLabel check failed: required none of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\nLabel check failed: required all of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\n",
		output: "label_check=failure",
	},
	{
		name: "[none, one, all], got 3",
		pullRequestNumber: 4,
		labels: ["major", "minor", "patch"],
		requirements: {
			none: "major,minor,patch",
			one: "major,minor,patch",
			all: "major,minor,patch",
		},
		status: 1,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required all of 'major', 'minor', 'patch', and found 3: 'major', 'minor', 'patch'\n",
		stderr:
			"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 3: 'major', 'minor', 'patch'\nLabel check failed: required none of 'major', 'minor', 'patch', but found 3: 'major', 'minor', 'patch'\n",
		output: "label_check=failure",
	},
	{
		name: "[none, one, all, any], got 0",
		pullRequestNumber: 1,
		labels: [],
		requirements: {
			none: "major,minor,patch",
			one: "major,minor,patch",
			all: "major,minor,patch",
			any: "major,minor,patch",
		},
		status: 1,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required none of 'major', 'minor', 'patch', and found 0.\n",
		stderr:
			"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 0.\nLabel check failed: required all of 'major', 'minor', 'patch', but found 0.\nLabel check failed: required any of 'major', 'minor', 'patch', but found 0.\n",
		output: "label_check=failure",
	},
	{
		name: "[none, one, all, any], got 1",
		pullRequestNumber: 2,
		labels: ["minor"],
		requirements: {
			none: "major,minor,patch",
			one: "major,minor,patch",
			all: "major,minor,patch",
			any: "major,minor,patch",
		},
		status: 1,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required 1 of 'major', 'minor', 'patch', and found 1: 'minor'\nLabel check successful: required any of 'major', 'minor', 'patch', and found 1: 'minor'\n",
		stderr:
			"::error:: Label check failed: required none of 'major', 'minor', 'patch', but found 1: 'minor'\nLabel check failed: required all of 'major', 'minor', 'patch', but found 1: 'minor'\n",
		output: "label_check=failure",
	},
	{
		name: "[none, one, all, any], got 2",
		pullRequestNumber: 3,
		labels: ["minor", "patch"],
		requirements: {
			none: "major,minor,patch",
			one: "major,minor,patch",
			all: "major,minor,patch",
			any: "major,minor,patch",
		},
		status: 1,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required any of 'major', 'minor', 'patch', and found 2: 'minor', 'patch'\n",
		stderr:
			"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\nLabel check failed: required none of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\nLabel check failed: required all of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\n",
		output: "label_check=failure",
	},
	{
		name: "[none, one, all, any], got 3",
		pullRequestNumber: 4,
		labels: ["major", "minor", "patch"],
		requirements: {
			none: "major,minor,patch",
			one: "major,minor,patch",
			all: "major,minor,patch",
			any: "major,minor,patch",
		},
		status: 1,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required all of 'major', 'minor', 'patch', and found 3: 'major', 'minor', 'patch'\nLabel check successful: required any of 'major', 'minor', 'patch', and found 3: 'major', 'minor', 'patch'\n",
		stderr:
			"::error:: Label check failed: required 1 of 'major', 'minor', 'patch', but found 3: 'major', 'minor', 'patch'\nLabel check failed: required none of 'major', 'minor', 'patch', but found 3: 'major', 'minor', 'patch'\n",
		output: "label_check=failure",
	},
	{
		name: "prefix none, got 0",
		pullRequestNumber: 1,
		labels: [],
		requirements: { none: "type:" },
		prefixMode: true,
		status: 0,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required none prefixed with 'type:', and found 0.\n",
		stderr: "",
		output: "label_check=success",
	},
	{
		name: "prefix none, got 1",
		pullRequestNumber: 5,
		labels: ["type:fix"],
		requirements: { none: "type:" },
		prefixMode: true,
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required none prefixed with 'type:', but found 1: 'type:fix'\n",
		output: "label_check=failure",
	},
	{
		name: "prefix none, got 2",
		pullRequestNumber: 6,
		labels: ["type:fix", "type:feature"],
		requirements: { none: "type:" },
		prefixMode: true,
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required none prefixed with 'type:', but found 2: 'type:fix', 'type:feature'\n",
		output: "label_check=failure",
	},
	{
		name: "prefix none, got 3",
		pullRequestNumber: 7,
		labels: ["type:fix", "type:feature", "type:documentation"],
		requirements: { none: "type:" },
		prefixMode: true,
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required none prefixed with 'type:', but found 3: 'type:fix', 'type:feature', 'type:documentation'\n",
		output: "label_check=failure",
	},
	{
		name: "prefix one, got 0",
		pullRequestNumber: 1,
		labels: [],
		requirements: { one: "type:" },
		prefixMode: true,
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required 1 prefixed with 'type:', but found 0.\n",
		output: "label_check=failure",
	},
	{
		name: "prefix one, got 1",
		pullRequestNumber: 5,
		labels: ["type:fix"],
		requirements: { one: "type:" },
		prefixMode: true,
		status: 0,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required 1 prefixed with 'type:', and found 1: 'type:fix'\n",
		stderr: "",
		output: "label_check=success",
	},
	{
		name: "prefix one, got 2",
		pullRequestNumber: 6,
		labels: ["type:fix", "type:feature"],
		requirements: { one: "type:" },
		prefixMode: true,
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required 1 prefixed with 'type:', but found 2: 'type:fix', 'type:feature'\n",
		output: "label_check=failure",
	},
	{
		name: "prefix one, got 3",
		pullRequestNumber: 7,
		labels: ["type:fix", "type:feature", "type:documentation"],
		requirements: { one: "type:" },
		prefixMode: true,
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required 1 prefixed with 'type:', but found 3: 'type:fix', 'type:feature', 'type:documentation'\n",
		output: "label_check=failure",
	},
	{
		name: "prefix any, got 0",
		pullRequestNumber: 1,
		labels: [],
		requirements: { any: "type:" },
		prefixMode: true,
		status: 1,
		stdout: "Checking GitHub labels ...\n",
		stderr:
			"::error:: Label check failed: required any prefixed with 'type:', but found 0.\n",
		output: "label_check=failure",
	},
	{
		name: "prefix any, got 1",
		pullRequestNumber: 5,
		labels: ["type:fix"],
		requirements: { any: "type:" },
		prefixMode: true,
		status: 0,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required any prefixed with 'type:', and found 1: 'type:fix'\n",
		stderr: "",
		output: "label_check=success",
	},
	{
		name: "prefix any, got 2",
		pullRequestNumber: 6,
		labels: ["type:fix", "type:feature"],
		requirements: { any: "type:" },
		prefixMode: true,
		status: 0,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required any prefixed with 'type:', and found 2: 'type:fix', 'type:feature'\n",
		stderr: "",
		output: "label_check=success",
	},
	{
		name: "prefix any, got 3",
		pullRequestNumber: 7,
		labels: ["type:fix", "type:feature", "type:documentation"],
		requirements: { any: "type:" },
		prefixMode: true,
		status: 0,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required any prefixed with 'type:', and found 3: 'type:fix', 'type:feature', 'type:documentation'\n",
		stderr: "",
		output: "label_check=success",
	},
	{
		name: "prefix [none, one], got none",
		pullRequestNumber: 1,
		labels: [],
		requirements: { none: "type:", one: "type:" },
		prefixMode: true,
		status: 1,
		stdout:
			"Checking GitHub labels ...\nLabel check successful: required none prefixed with 'type:', and found 0.\n",
		stderr:
			"::error:: Label check failed: required 1 prefixed with 'type:', but found 0.\n",
		output: "label_check=failure",
	},
];

for (const scenario of scenarios) {
	test(`checks labels for ${scenario.name}`, async () => {
		const result = await runLabelCheck({
			pullRequestNumber: scenario.pullRequestNumber,
			labels: scenario.labels,
			requirements: scenario.requirements,
			prefixMode: scenario.prefixMode,
		});

		assert.equal(result.status, scenario.status);
		assert.equal(result.stdout, scenario.stdout);
		assert.equal(result.stderr, scenario.stderr);
		assert.equal(result.output, scenario.output);
	});
}

for (const scenario of [
	{
		name: "all",
		requirements: { all: "type:" },
		stderr:
			"::error:: The label checker does not support prefix checking with `all_of`, as that is not a logical combination.\n",
	},
	{
		name: "none",
		requirements: { none: "type:,visibility/" },
		stderr:
			"::error:: Currently the label checker only supports checking with one prefix, not multiple.\n",
	},
	{
		name: "one",
		requirements: { one: "type:,visibility/" },
		stderr:
			"::error:: Currently the label checker only supports checking with one prefix, not multiple.\n",
	},
	{
		name: "any",
		requirements: { any: "type:,visibility/" },
		stderr:
			"::error:: Currently the label checker only supports checking with one prefix, not multiple.\n",
	},
	{
		name: "all with multiple prefixes",
		requirements: { all: "type:,visibility/" },
		stderr:
			"::error:: Currently the label checker only supports checking with one prefix, not multiple.\n",
	},
] as const) {
	test(`rejects prefix ${scenario.name} configuration`, async () => {
		const result = await runLabelCheck({
			pullRequestNumber: 1,
			labels: [],
			requirements: scenario.requirements,
			prefixMode: true,
		});

		assert.equal(result.status, 1);
		assert.equal(result.stdout, "Checking GitHub labels ...\n");
		assert.equal(result.stderr, scenario.stderr);
		assert.equal(result.output, "label_check=failure");
	});
}
