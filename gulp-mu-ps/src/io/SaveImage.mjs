// Image export helpers based on sharp. The output format is derived from the
// file extension: ".webp" produces lossless WebP, everything else PNG.

import sharp from "sharp";
import { RasterToBytes } from "../render/Raster.mjs";

// Applies the encoder matching the target file extension.
export function EncodeByExtension(_sharpInstance, _fileName) {
	if (_fileName.toLowerCase().endsWith(".webp")) {
		return _sharpInstance.webp({ lossless: true, effort: 6 });
	}
	return _sharpInstance.png({ compressionLevel: 9 });
}

export async function SaveRasterAsImage(_raster, _fileName) {
	await EncodeByExtension(sharp(RasterToBytes(_raster), {
		raw: { width: _raster.width, height: _raster.height, channels: 4 }
	}), _fileName).toFile(_fileName);
}

// Saves the raster downscaled by factor 2 (used for the 1x variant of a @2x master).
export async function SaveRasterAsImageHalfSize(_raster, _fileName) {
	await EncodeByExtension(sharp(RasterToBytes(_raster), {
		raw: { width: _raster.width, height: _raster.height, channels: 4 }
	})
		.resize(Math.round(_raster.width / 2), Math.round(_raster.height / 2), { kernel: "lanczos3" }), _fileName)
		.toFile(_fileName);
}
