// Applies the µCSS™ brand mark in user-facing docs. Reverts false positives (paths, filenames).
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");

const files = process.argv.slice(2);
if (files.length === 0) {
	console.error("Usage: node tools/apply-trademark.mjs <file...>");
	process.exit(1);
}

function ApplyTrademark(_text) {
	let r = _text.replace(/µCSS(?!™)/g, "µCSS™");
	const reverts = [
		[/µCSS™\//g, "µCSS/"],
		[/µCSS™\.jsx/g, "µCSS.jsx"],
		[/µCSS™\.pdf/g, "µCSS.pdf"],
		[/µCSS™\.plugins/g, "µCSS.plugins"],
		[/µCSS™%201\.0/g, "µCSS%201.0"],
		[/µCSS™%20/g, "µCSS%20"],
		[/µCSS™\.old/g, "µCSS.old"],
		[/µ\.CSS/g, "µ.CSS"], // no-op guard if ever needed
	];
	for (const [pattern, replacement] of reverts) {
		r = r.replace(pattern, replacement);
	}
	return r;
}

for (const rel of files) {
	const path = join(rootDir, rel);
	const before = readFileSync(path, "utf8");
	const after = ApplyTrademark(before);
	if (after !== before) {
		writeFileSync(path, after, "utf8");
		const count = (before.match(/µCSS(?!™)/g) ?? []).length;
		console.log(`${rel}: ${count} replacement(s)`);
	} else {
		console.log(`${rel}: unchanged`);
	}
}
