// Loads a raster image (PNG, WebP, JPEG, … via sharp) into a µPS raster (non-premultiplied RGBA 0..1).

import sharp from "sharp";
import { CreateRaster } from "../render/Raster.mjs";

/**
 * @param {string} _fileName
 * @returns {Promise<{ width: number, height: number, data: Float32Array }>}
 */
export async function LoadRasterFromImage(_fileName) {
	const { data, info } = await sharp(_fileName).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
	const raster = CreateRaster(info.width, info.height);
	for (let i = 0; i < info.width * info.height; i++) {
		const si = i * 4;
		const di = si;
		raster.data[di] = data[si] / 255;
		raster.data[di + 1] = data[si + 1] / 255;
		raster.data[di + 2] = data[si + 2] / 255;
		raster.data[di + 3] = data[si + 3] / 255;
	}
	return raster;
}
