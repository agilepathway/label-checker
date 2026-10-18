import { writeFile } from "node:fs/promises";

import { renderSpecification } from "../../../../shared/specification-by-example/src/markdown-renderer.ts";
import { semanticVersionTaggingSpecification } from "./semantic-version-tagger-specification.ts";

const outputPath = new URL(
	"../spec/semantic-version-tagging.md",
	import.meta.url,
);

await writeFile(
	outputPath,
	renderSpecification(semanticVersionTaggingSpecification),
	"utf8",
);

console.log("Published semantic-version-tagging.md");
