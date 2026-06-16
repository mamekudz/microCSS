// Tile sheet generator: the foundation of the legacy tile computation
// (SpriteTools.js) for game projects like Oxyd and their Unity3D pipelines.
//
// Source images are split into a grid of uniform tiles. Empty (fully
// transparent) tiles are dropped, duplicates are reduced (exact or with a
// tolerance like the legacy "dubRedSen" sensitivity) and the remaining unique
// tiles are packed into a square texture whose edge length is snapped to a
// set of allowed texture sizes (power-of-two friendly for GPU usage).

import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import sharp from "sharp";
import { EncodeByExtension } from "../io/SaveImage.mjs";

const DEFAULT_TEXTURE_SIZES = [128, 256, 512, 1024, 2048, 4096];

function _IsFullTransparentTile(_data, _imgWidth, _xs, _ys, _tileSize) {
	for (let y = 0; y < _tileSize; y++) {
		for (let x = 0; x < _tileSize; x++) {
			if (_data[((_ys + y) * _imgWidth + (_xs + x)) * 4 + 3] !== 0) return false;
		}
	}
	return true;
}

function _ExtractTile(_data, _imgWidth, _xs, _ys, _tileSize) {
	const out = Buffer.alloc(_tileSize * _tileSize * 4);
	for (let y = 0; y < _tileSize; y++) {
		const srcStart = ((_ys + y) * _imgWidth + _xs) * 4;
		_data.copy(out, y * _tileSize * 4, srcStart, srcStart + _tileSize * 4);
	}
	return out;
}

// Mean absolute per-channel difference of two tiles (legacy _CompareBox logic).
function _TileDifference(_a, _b) {
	let sum = 0;
	for (let i = 0; i < _a.length; i++) sum += Math.abs(_a[i] - _b[i]);
	return sum / _a.length;
}

function _CenterPixelKey(_pixels, _tileSize) {
	const center = ((_tileSize >> 1) * _tileSize + (_tileSize >> 1)) * 4;
	return `${_pixels[center]},${_pixels[center + 1]},${_pixels[center + 2]},${_pixels[center + 3]}`;
}

export class TileSheet {
	// _options: {
	//   images: string[]              source PNG files (single tiles or tile grids)
	//   outputFile: string            target texture file name; ".webp" produces lossless WebP
	//   tileSize = 64                 tile edge length in pixels
	//   deduplicate = true            reuse identical tiles
	//   duplicateTolerance = 0        mean abs. channel difference (0 = bit-exact)
	//   dropEmptyTiles = true         fully transparent tiles map to index -1
	//   textureSizes = [128..4096]    allowed square texture edge lengths
	//   writeMapFile = true           write "<outputFile>.json" with the mapping data
	// }
	static async Create(_options) {
		const options = {
			tileSize: 64,
			deduplicate: true,
			duplicateTolerance: 0,
			dropEmptyTiles: true,
			textureSizes: DEFAULT_TEXTURE_SIZES,
			writeMapFile: true,
			..._options
		};
		if (!options.images?.length) throw new Error("TileSheet: no input images given.");
		if (!options.outputFile) throw new Error("TileSheet: no output file given.");
		const tileSize = options.tileSize;

		// Collect tiles from all source images.
		const uniqueTiles = [];
		const byHash = new Map();
		const byCenter = new Map();
		const sources = {};
		for (const file of options.images) {
			const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
			if (info.width % tileSize !== 0 || info.height % tileSize !== 0) {
				throw new Error(`TileSheet: "${file}" (${info.width}x${info.height}) is no multiple of the tile size ${tileSize}.`);
			}
			const cols = info.width / tileSize;
			const rows = info.height / tileSize;
			const indices = [];
			for (let row = 0; row < rows; row++) {
				for (let col = 0; col < cols; col++) {
					indices.push(this._RegisterTile(
						data, info.width, col * tileSize, row * tileSize,
						{ options, uniqueTiles, byHash, byCenter }
					));
				}
			}
			sources[file] = { columns: cols, rows, tiles: indices };
		}
		if (uniqueTiles.length === 0) throw new Error("TileSheet: all tiles are empty.");

		// Choose the smallest allowed square texture that holds all unique tiles.
		const sizes = [...options.textureSizes].sort((_a, _b) => _a - _b);
		let textureSize = 0, columns = 0;
		for (const size of sizes) {
			const perRow = Math.floor(size / tileSize);
			if (perRow * perRow >= uniqueTiles.length) {
				textureSize = size;
				columns = perRow;
				break;
			}
		}
		if (!textureSize) {
			throw new Error(`TileSheet: ${uniqueTiles.length} tiles do not fit into the largest texture (${sizes[sizes.length - 1]}px).`);
		}

		// Grid placement (row-major), then compose and save the texture.
		const composites = uniqueTiles.map((_tile, _index) => {
			_tile.x = (_index % columns) * tileSize;
			_tile.y = Math.floor(_index / columns) * tileSize;
			return {
				input: _tile.pixels,
				raw: { width: tileSize, height: tileSize, channels: 4 },
				left: _tile.x,
				top: _tile.y
			};
		});
		mkdirSync(dirname(options.outputFile), { recursive: true });
		await EncodeByExtension(sharp({
			create: { width: textureSize, height: textureSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
		}).composite(composites), options.outputFile).toFile(options.outputFile);

		const result = {
			textureSize,
			tileSize,
			tileCount: uniqueTiles.length,
			tiles: uniqueTiles.map((_t) => ({ x: _t.x, y: _t.y })),
			sources
		};
		if (options.writeMapFile) {
			writeFileSync(`${options.outputFile}.json`, JSON.stringify(result, null, "\t"));
		}
		return result;
	}

	// Returns the unique tile index for the tile at the given position, -1 for empty tiles.
	static _RegisterTile(_data, _imgWidth, _xs, _ys, _context) {
		const { options, uniqueTiles, byHash, byCenter } = _context;
		const tileSize = options.tileSize;
		if (options.dropEmptyTiles && _IsFullTransparentTile(_data, _imgWidth, _xs, _ys, tileSize)) return -1;
		const pixels = _ExtractTile(_data, _imgWidth, _xs, _ys, tileSize);
		if (options.deduplicate) {
			const hash = createHash("md5").update(pixels).digest("hex");
			if (byHash.has(hash)) return byHash.get(hash);
			if (options.duplicateTolerance > 0) {
				// Tolerance comparison only against tiles with the same center pixel
				// (legacy center pre-sort optimization).
				const centerKey = _CenterPixelKey(pixels, tileSize);
				for (const index of byCenter.get(centerKey) ?? []) {
					if (_TileDifference(uniqueTiles[index].pixels, pixels) <= options.duplicateTolerance) {
						byHash.set(hash, index);
						return index;
					}
				}
			}
			const index = uniqueTiles.length;
			uniqueTiles.push({ pixels });
			byHash.set(hash, index);
			const centerKey = _CenterPixelKey(pixels, tileSize);
			if (!byCenter.has(centerKey)) byCenter.set(centerKey, []);
			byCenter.get(centerKey).push(index);
			return index;
		}
		const index = uniqueTiles.length;
		uniqueTiles.push({ pixels });
		return index;
	}
}
