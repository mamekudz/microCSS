// Renders all example outputs permanently into microPS/examples-out so the
// results can be inspected manually. Invoked via "gulp examples:render".
import { rmSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readdirSync } from "node:fs";
import { ButtonAndIconCreator, AppIconMaker, SpriteAtlas, TileSheet, SequenceStrip } from "../src/index.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const examplesDir = join(here, "../../oldsrcs/old_adobe_scripts/µCSS/examples");
const draftPsd = join(examplesDir, "drafts/buttons.psd");
const cursorsPsd = join(examplesDir, "drafts/cursors.psd");
const outDir = join(here, "../examples-out");

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

// Button/icon series for both layouts...
for (const layout of ["alu", "aqua"]) {
	const files = await ButtonAndIconCreator.Create(draftPsd, {
		layout,
		outputDir: join(outDir, "buttons", layout),
		retina: true
	});
	console.log(`buttons/${layout}: ${files.length} files`);
}

// Cursor series (std layout, icons partly organized as layer groups)...
const cursorFiles = await ButtonAndIconCreator.Create(cursorsPsd, {
	layout: "std",
	outputDir: join(outDir, "cursors"),
	retina: true
});
console.log(`cursors: ${cursorFiles.length} files`);

// Sprite atlas from the same sources the legacy sprites.png was built from...
const spriteSources = [
	"but_login_normal", "but_login_hover",
	"but_help_normal", "but_help_hover",
	"but_settings_normal", "but_settings_hover"
].map((name) => join(outDir, "buttons/aqua", `${name}.png`));
const atlas = await SpriteAtlas.Create({
	images: spriteSources,
	outputFile: join(outDir, "atlas/sprites.png"),
	retina: true
});
console.log(`atlas: ${atlas.width}x${atlas.height}, ${Object.keys(atlas.sprites).length} sprites`);

// Tile sheet from the button images (55x55 tiles)...
const sheet = await TileSheet.Create({
	images: spriteSources,
	outputFile: join(outDir, "tiles/tiles.png"),
	tileSize: 55
});
console.log(`tiles: ${sheet.tileCount} unique tiles in ${sheet.textureSize}x${sheet.textureSize}`);

// Sprite strips from image sequences and DSD format images...
const specialDir = join(examplesDir, "specialimgs/source_images");
for (const name of ["glittery", "smoke", "sparks"]) {
	const seqDir = join(specialDir, name, "imgs");
	const strip = await SequenceStrip.Create({
		images: readdirSync(seqDir).filter((f) => f.endsWith(".png")).map((f) => join(seqDir, f)),
		outputFile: join(outDir, "strips", `${name}.png`)
	});
	console.log(`strips/${name}: ${strip.frameCount} frames, cell ${strip.cellWidth}x${strip.cellHeight}`);
}
for (const name of ["flyex", "flyexutils"]) {
	const strip = await SequenceStrip.Create({
		dsdImage: join(specialDir, "flyex/imgs", `${name}.png`),
		outputFile: join(outDir, "strips", `${name}.png`)
	});
	console.log(`strips/${name}: ${strip.frameCount} frames, cell ${strip.cellWidth}x${strip.cellHeight}`);
}

// App icons (all profiles) from a square master...
const appIconFiles = await AppIconMaker.Create(join(examplesDir, "imgs/aqua/but_login_normal@2x.png"), {
	outputDir: join(outDir, "appicons"),
	appName: "ExampleApp",
	themeColor: "#0a5ae0"
});
console.log(`appicons: ${appIconFiles.length} files`);

console.log(`done -> ${outDir}`);
