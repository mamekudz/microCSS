// Packages a small COLR fixture through FontGenerator (same path as an emoji font).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FontGenerator, ConvertFontFormats } from "../../src/index.mjs";
import { AttachColorTables } from "../../test/helpers/AttachColorTables.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const iconFixtures = path.join(here, "../../test/fixtures/svg");
const outDir = path.join(here, "out");

const icon = await FontGenerator.Create({
	fontName: "_fixture",
	src: iconFixtures,
	outputDir: outDir,
	formats: ["ttf"],
	css: false,
	json: false,
	html: false,
	log: false
});

const ttfPath = icon.files.find((_file) => _file.endsWith(".ttf"));
const colorTtf = AttachColorTables(fs.readFileSync(ttfPath), { colrVersion: 1, extraTables: ["sbix"] });
const fixture = path.join(outDir, "fixture-colrv1.ttf");
fs.writeFileSync(fixture, colorTtf);

const result = await FontGenerator.Create({
	fontName: "ChatEmoji",
	src: fixture,
	outputDir: outDir,
	sample: "Hello 😀 🎉 — color webfont, not an animation.",
	log: console.log
});

ConvertFontFormats(fs.readFileSync(result.files.find((_file) => _file.endsWith(".woff2"))));
console.log(`color formats: ${result.colorFont.colorFontFormats.join(", ")}`);
console.log(`files:\n${result.files.join("\n")}`);
