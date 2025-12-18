import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname } from "path";
import { marked } from "marked";

marked.setOptions({
  breaks: true,
  gfm: true,
});

function addLineBreaks(html) {
  return (
    html
      // Add <br /> after all h2 and h3
      .replace("<h1>Changelog</h1>", "")
      .replace(/<\/h2>/g, "</h2><br />")
      .replace(/<\/h3>/g, "</h3><br />")
      .replace(/<\/ul>/g, "</ul><br />")
      // Add <br /> after the specific paragraph
      .replace(/(<p>The format is based[\s\S]*?<\/p>)/, "$1<br />")
  );
}

const changelog = addLineBreaks(marked.parse(readFileSync("./CHANGELOG.md", "utf-8")));
const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));

const content = `// auto-generated - DO NOT EDIT
export const __VERSION__ = '${pkg.version}';
export const __CHANGELOG__ = \`${changelog}\`;
`;

const outputPath = "./src/generated/meta.ts";

// Check if directory exists, create if not
const dir = dirname(outputPath);
if (!existsSync(dir)) {
  mkdirSync(dir, { recursive: true });
  console.log(`[build:meta] created directory: ${dir}`);
}

writeFileSync(outputPath, content);
console.log("[build:meta] injected successfully.");
