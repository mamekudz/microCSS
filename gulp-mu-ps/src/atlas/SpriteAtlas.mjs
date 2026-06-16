// Sprite atlas generator: packs a series of PNG images into one atlas image
// (plus a @2x variant) and produces the mapping data needed to rewrite CSS
// rules to background-image/background-position (µ.Sprite in microCSS).

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, parse, format } from "node:path";
import sharp from "sharp";
import { PackRects } from "./BinPacker.mjs";
import { EncodeByExtension } from "../io/SaveImage.mjs";

function _RetinaFileName(_fileName) {
	const parts = parse(_fileName);
	return format({ dir: parts.dir, name: `${parts.name}@2x`, ext: parts.ext });
}

async function _LoadRaw(_fileName) {
	const { data, info } = await sharp(_fileName).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
	return { data, width: info.width, height: info.height };
}

async function _ComposeAtlas(_entries, _width, _height, _outputFile, _scale) {
	mkdirSync(dirname(_outputFile), { recursive: true });
	await EncodeByExtension(sharp({
		create: {
			width: _width * _scale,
			height: _height * _scale,
			channels: 4,
			background: { r: 0, g: 0, b: 0, alpha: 0 }
		}
	})
		.composite(_entries.map((_e) => ({
			input: (_scale === 2) ? _e.retinaFile : _e.file,
			left: _e.x * _scale,
			top: _e.y * _scale
		}))), _outputFile)
		.toFile(_outputFile);
}

export class SpriteAtlas {
	// _options: {
	//   images: string[]          1x source PNG files
	//   outputFile: string        atlas file name, e.g. "imgs/sprites.png";
	//                             a ".webp" extension produces a lossless WebP atlas
	//   retina = true             also write "<name>@2x.png" from the "<src>@2x.png" sources
	//   deduplicate = true        identical images share one atlas position
	//   padding = 0               spacing in pixels between sprites (1x)
	//   doSquare = true           prefer square-ish atlas growth
	//   writeMapFile = true       write "<outputFile>.json" with the mapping data
	// }
	static async Create(_options) {
		const options = {
			retina: true,
			deduplicate: true,
			padding: 0,
			doSquare: true,
			writeMapFile: true,
			..._options
		};
		if (!options.images?.length) throw new Error("SpriteAtlas: no input images given.");
		if (!options.outputFile) throw new Error("SpriteAtlas: no output file given.");

		// Load all sources, group identical images by content hash.
		const entries = [];
		const byHash = new Map();
		const spriteMap = {};
		for (const file of options.images) {
			const raw = await _LoadRaw(file);
			const hash = options.deduplicate
				? createHash("md5").update(raw.data).digest("hex") + `_${raw.width}x${raw.height}`
				: file;
			let entry = byHash.get(hash);
			if (!entry) {
				const retinaFile = _RetinaFileName(file);
				if (options.retina && !existsSync(retinaFile)) {
					throw new Error(`SpriteAtlas: missing retina source "${retinaFile}".`);
				}
				entry = {
					file,
					retinaFile,
					w: raw.width + options.padding,
					h: raw.height + options.padding,
					width: raw.width,
					height: raw.height
				};
				byHash.set(hash, entry);
				entries.push(entry);
			}
			spriteMap[file] = entry;
		}

		const [packedWidth, packedHeight] = PackRects(entries, { doSquare: options.doSquare });

		await _ComposeAtlas(entries, packedWidth, packedHeight, options.outputFile, 1);
		if (options.retina) {
			await _ComposeAtlas(entries, packedWidth, packedHeight, _RetinaFileName(options.outputFile), 2);
		}

		const result = {
			width: packedWidth,
			height: packedHeight,
			retina: options.retina,
			sprites: {}
		};
		for (const [file, entry] of Object.entries(spriteMap)) {
			result.sprites[file] = { x: entry.x, y: entry.y, width: entry.width, height: entry.height };
		}
		if (options.writeMapFile) {
			writeFileSync(`${options.outputFile}.json`, JSON.stringify(result, null, "\t"));
		}
		return result;
	}
}
