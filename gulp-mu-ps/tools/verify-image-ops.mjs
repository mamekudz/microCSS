// Renders adjustment + transform samples from a reference photo (default: dev Burosch test pattern).
// Usage: node tools/verify-image-ops.mjs [inputImage] [outputDir]

import { existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
	ApplyBrightnessContrast,
	ApplyGamma,
	ApplyHueSaturation
} from "../src/render/Adjustments.mjs";
import { LoadRasterFromImage } from "../src/io/LoadImage.mjs";
import { SaveRasterAsImage } from "../src/io/SaveImage.mjs";
import { CropRaster, FlipRaster, RotateRaster, RotateRasterAround, ScaleRaster } from "../src/render/Transforms.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "../..");
const defaultInput = join(repoRoot, "dev/Burosch_universaltestbild_avec-3840x2160_(3).jpg");
const defaultOut = join(repoRoot, "dev/out/image-ops");

const inputFile = resolve(process.argv[2] ?? defaultInput);
const outDir = resolve(process.argv[3] ?? defaultOut);

if (!existsSync(inputFile)) {
	console.error(`Input not found: ${inputFile}`);
	process.exit(1);
}

mkdirSync(outDir, { recursive: true });

async function _Write(_name, _raster) {
	const file = join(outDir, _name);
	await SaveRasterAsImage(_raster, file);
	console.log(file);
}

console.log(`Loading ${inputFile} ...`);
let raster = await LoadRasterFromImage(inputFile);
console.log(`  ${raster.width}x${raster.height}`);

await _Write("00_source.png", raster);

// Grayscale strip region (approx. center bar) for quick gamma checks.
const strip = CropRaster(raster, { x: 960, y: 980, w: 1920, h: 120 });
await _Write("01_crop_grayscale_strip.png", strip);

const gammaDark = await LoadRasterFromImage(inputFile);
ApplyGamma(gammaDark, 0.7);
await _Write("02_gamma_0.7.png", gammaDark);

const gammaBright = await LoadRasterFromImage(inputFile);
ApplyGamma(gammaBright, 1.4);
await _Write("03_gamma_1.4.png", gammaBright);

const bc = await LoadRasterFromImage(inputFile);
ApplyBrightnessContrast(bc, { brightness: 20, contrast: 15 });
await _Write("04_brightness_contrast.png", bc);

const desat = await LoadRasterFromImage(inputFile);
ApplyHueSaturation(desat, { saturation: -50 });
await _Write("05_desaturate_50.png", desat);

const half = await ScaleRaster(raster, { scale: 0.5, kernel: "lanczos3" });
await _Write("06_scale_half_lanczos3.png", half);

const halfNearest = await ScaleRaster(raster, { scale: 0.5, kernel: "nearest" });
await _Write("07_scale_half_nearest.png", halfNearest);

const freqPatch = CropRaster(raster, { x: 1200, y: 1120, w: 640, h: 320 });
const freq2x = await ScaleRaster(freqPatch, { scale: 2, kernel: "lanczos3" });
await _Write("08_freq_patch_upscale_2x.png", freq2x);

await _Write("09_flip_horizontal.png", FlipRaster(raster, "horizontal"));
await _Write("10_rotate_90.png", RotateRaster(raster, 90));

const pivotCrop = CropRaster(raster, { x: 800, y: 400, w: 400, h: 400 });
await _Write("11_rotate_15_pivot0.png", RotateRasterAround(pivotCrop, 15, { x: 0, y: 0 }));

console.log(`\nDone. Open ${outDir} to inspect.`);
