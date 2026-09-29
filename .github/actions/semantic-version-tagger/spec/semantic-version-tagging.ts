// biome-ignore-all lint/security/noSecrets: These example commit SHAs are copied from the spec.

export const firstRule =
	"Given a new patch-level semantic version to be applied to a given new commit, a new patch tag is created for that commit and the major, minor and latest tags are moved to point to the new commit too.";

export const firstExample = {
	description:
		"A new `v2.0.1` version and a new commit SHA `a1b2c3d4e5f67890abcdef1234567890abcdef12`",
	semanticVersion: "v2.0.1",
	commit: "a1b2c3d4e5f67890abcdef1234567890abcdef12",
	tags: [
		{
			tag: "v2",
			before: "7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b",
			after: "a1b2c3d4e5f67890abcdef1234567890abcdef12",
		},
		{
			tag: "v2.0",
			before: "7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b",
			after: "a1b2c3d4e5f67890abcdef1234567890abcdef12",
		},
		{
			tag: "v2.0.0",
			before: "7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b",
			after: "7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b",
		},
		{
			tag: "v2.0.1",
			before: null,
			after: "a1b2c3d4e5f67890abcdef1234567890abcdef12",
		},
		{
			tag: "latest",
			before: "7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b",
			after: "a1b2c3d4e5f67890abcdef1234567890abcdef12",
		},
	],
} as const;
