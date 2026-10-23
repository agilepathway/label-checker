import { writeFile } from "node:fs/promises";

import { renderSpecification } from "../shared/specification-by-example/src/markdown-renderer.ts";
import { noneOfSpecification } from "./check_labels_specification.ts";

const outputPath = new URL("../spec/label-checker.md", import.meta.url);

await writeFile(outputPath, renderSpecification(noneOfSpecification), "utf8");

console.log("Published label-checker.md");
