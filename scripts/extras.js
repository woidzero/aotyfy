import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname } from "path";
import { marked } from "marked";

marked.setOptions({
  breaks: true,
  gfm: true,
});

let html = marked.parse(readFileSync("./CHANGELOG.md", "utf-8"));
html = html
  .replace("<h1>Changelog</h1>", "")
  .replace(/<\/h2>/g, "</h2><br />")
  .replace(/<\/h3>/g, "</h3><br />")
  .replace(/<\/ul>/g, "</ul><br />");

const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));

const content = `// auto-generated - DO NOT EDIT
export const __VERSION__ = '${pkg.version}';
export const __CHANGELOG__ = \`${html}\`;
`;

const outputPath = "./src/generated/extras.ts";

const dir = dirname(outputPath);
if (!existsSync(dir)) {
  mkdirSync(dir, { recursive: true });
  console.log(`[extras] created directory: ${dir}`);
}

writeFileSync(outputPath, content);
console.log(`[extras] ${pkg.version} injected successfully.`);
