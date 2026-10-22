import { writeFile } from "node:fs/promises";

import { renderSpecification } from "../../../../shared/specification-by-example/src/markdown-renderer.ts";
import { semanticVersionCalculationSpecification } from "./semantic-version-calculator-specification.ts";

const outputPath = new URL(
	"../spec/semantic-version-calculation.md",
	import.meta.url,
);

await writeFile(
	outputPath,
	renderSpecification(semanticVersionCalculationSpecification),
	"utf8",
);

console.log("Published semantic-version-calculation.md");
