// Compares two PNG files (or all PNGs of two directories) and reports the
// mean absolute error of the alpha-weighted RGB channels plus alpha.
// Usage: node tools/compare-images.mjs <fileOrDirA> <fileOrDirB>
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

export async function CompareImages(_fileA, _fileB) {
	const a = await sharp(_fileA).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
	const b = await sharp(_fileB).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
	if (a.info.width !== b.info.width || a.info.height !== b.info.height) {
		return { sizeMismatch: true, a: `${a.info.width}x${a.info.height}`, b: `${b.info.width}x${b.info.height}` };
	}
	let sum = 0;
	const n = a.info.width * a.info.height;
	for (let i = 0; i < n; i++) {
		const aa = a.data[i * 4 + 3] / 255;
		const ab = b.data[i * 4 + 3] / 255;
		let pixelDiff = Math.abs(aa - ab) * 255;
		for (let c = 0; c < 3; c++) {
			// Weight color differences with the alpha so fully transparent areas do not count.
			pixelDiff += Math.abs(a.data[i * 4 + c] * aa - b.data[i * 4 + c] * ab);
		}
		sum += pixelDiff / 4;
	}
	return { sizeMismatch: false, mae: sum / n };
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop());
if (isMain) {
	const [pathA, pathB] = process.argv.slice(2);
	if (!pathA || !pathB) {
		console.error("Usage: node tools/compare-images.mjs <fileOrDirA> <fileOrDirB>");
		process.exit(1);
	}
	if (statSync(pathA).isDirectory()) {
		for (const name of readdirSync(pathA).filter((f) => f.endsWith(".png"))) {
			const result = await CompareImages(join(pathA, name), join(pathB, name));
			console.log(name.padEnd(30), result.sizeMismatch ? `SIZE MISMATCH ${result.a} vs ${result.b}` : `MAE ${result.mae.toFixed(2)}`);
		}
	} else {
		console.log(await CompareImages(pathA, pathB));
	}
}
