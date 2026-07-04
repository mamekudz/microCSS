// Optional build diagnostics for BuildSkin(): collects generated asset paths,
// emits step callbacks and produces small WebP thumbnail data URIs for raster
// outputs (requires sharp, available transitively via gulp-mu-ps).

import { existsSync } from "node:fs";
import { join, relative, sep } from "node:path";

const RASTER_EXTENSIONS = [".png", ".webp", ".jpg", ".jpeg", ".gif", ".svg"];

/** @typedef {{ thumbnails: boolean, thumbnailSize: number, maxThumbnails: number, log: boolean | ((_line: string) => void), onStepComplete: ((info: object) => void) | null }} DebugOptions */

/**
 * Normalizes BuildSkin({ debug }) — `true` enables thumbnails with defaults;
 * `false`/omitted disables diagnostics.
 * @param {boolean | object | undefined} _debug
 * @returns {DebugOptions | null}
 */
export function NormalizeDebugOptions(_debug) {
	if (!_debug) return null;
	if (_debug === true) {
		return {
			thumbnails: true,
			thumbnailSize: 64,
			maxThumbnails: 48,
			log: false,
			onStepComplete: null
		};
	}
	if (typeof _debug !== "object") return null;
	return {
		thumbnails: _debug.thumbnails !== false,
		thumbnailSize: Math.max(16, Math.min(256, Number(_debug.thumbnailSize) || 64)),
		maxThumbnails: Math.max(1, Number(_debug.maxThumbnails) || 48),
		log: _debug.log ?? false,
		onStepComplete: typeof _debug.onStepComplete === "function" ? _debug.onStepComplete : null
	};
}

/** @type {import("sharp").default | null | undefined} */
let sharpModule;

async function _GetSharp() {
	if (sharpModule !== undefined) return sharpModule;
	try {
		const mod = await import("sharp");
		sharpModule = mod.default;
		sharpModule.cache(false);
	} catch {
		sharpModule = null;
	}
	return sharpModule;
}

function _IsRaster(_file) {
	const lower = _file.toLowerCase();
	return RASTER_EXTENSIONS.some((_ext) => lower.endsWith(_ext));
}

function _RelPath(_outputDir, _absPath) {
	return relative(_outputDir, _absPath).split(sep).join("/");
}

function _PreferThumbnailOrder(_relPath) {
	// Prefer 1x assets and atlas over @2x duplicates when capping thumbnails.
	let score = 0;
	if (/@2x\.(png|webp|jpe?g|gif)$/i.test(_relPath)) score += 10;
	if (/sprites/i.test(_relPath)) score -= 2;
	return score;
}

/**
 * @param {string} _file
 * @param {number} _size
 * @returns {Promise<{ width?: number, height?: number, thumbDataUri?: string } | null>}
 */
async function _MakeThumbnail(_file, _size) {
	const sharp = await _GetSharp();
	if (!sharp || !_IsRaster(_file)) return null;
	const lower = _file.toLowerCase();
	if (lower.endsWith(".svg")) {
		try {
			const meta = await sharp(_file).metadata();
			const buffer = await sharp(_file)
				.resize(_size, _size, { fit: "inside", withoutEnlargement: true })
				.webp({ quality: 80 })
				.toBuffer();
			return {
				width: meta.width,
				height: meta.height,
				thumbDataUri: `data:image/webp;base64,${buffer.toString("base64")}`
			};
		} catch {
			return null;
		}
	}
	try {
		const meta = await sharp(_file).metadata();
		const buffer = await sharp(_file)
			.resize(_size, _size, { fit: "inside", withoutEnlargement: true })
			.webp({ quality: 75 })
			.toBuffer();
		return {
			width: meta.width,
			height: meta.height,
			thumbDataUri: `data:image/webp;base64,${buffer.toString("base64")}`
		};
	} catch {
		return null;
	}
}

function _EmitLog(_log, _line) {
	if (typeof _log === "function") _log(_line);
	else if (_log) console.log(_line);
}

/**
 * Builds the `report.debug` block after a skin build completes.
 * @param {object} _ctx
 * @param {DebugOptions} _ctx.debugOpts
 * @param {string} _ctx.outputDir
 * @param {string} _ctx.skinName
 * @param {object[]} _ctx.media
 * @param {object[]} _ctx.sounds
 * @param {object[]} _ctx.files
 * @param {object | null} _ctx.atlas
 * @param {boolean} _ctx.atlasSkipped
 * @param {string} _ctx.atlasFile
 * @param {number} _ctx.duration
 */
export async function BuildDebugReport(_ctx) {
	const { debugOpts, outputDir, skinName, media, sounds, files, atlas, atlasSkipped, atlasFile, duration } = _ctx;

	/** @type {Map<string, { path: string, relPath: string, step?: string, category: string, skipped?: boolean }>} */
	const entries = new Map();

	const addFile = (_absPath, _meta) => {
		if (!_absPath || !existsSync(_absPath)) return;
		const relPath = _RelPath(outputDir, _absPath);
		if (!entries.has(relPath)) entries.set(relPath, { path: _absPath, relPath, ..._meta });
	};

	for (const result of media ?? []) {
		for (const output of result.outputs ?? []) {
			addFile(output, { step: result.type, category: "media", skipped: !!result.skipped });
		}
	}

	if (atlasFile) {
		addFile(join(outputDir, atlasFile), { step: "atlas", category: "atlas", skipped: !!atlasSkipped });
		const dot = atlasFile.lastIndexOf(".");
		if (dot >= 0) {
			const retinaFile = `${atlasFile.slice(0, dot)}@2x${atlasFile.slice(dot)}`;
			addFile(join(outputDir, retinaFile), { step: "atlas", category: "atlas", skipped: !!atlasSkipped });
		}
	}

	for (const sound of sounds ?? []) {
		if (sound.dataFile) addFile(join(outputDir, sound.dataFile), { step: "sounds", category: "sound", skipped: !!sound.skipped });
	}

	const sorted = [...entries.values()].sort((_a, _b) => _a.relPath.localeCompare(_b.relPath));
	const rasterCandidates = sorted
		.filter((_entry) => _IsRaster(_entry.path))
		.sort((_a, _b) => _PreferThumbnailOrder(_a.relPath) - _PreferThumbnailOrder(_b.relPath));

	let thumbCount = 0;
	/** @type {object[]} */
	const previews = [];
	for (const entry of sorted) {
		/** @type {object} */
		const preview = { ...entry };
		if (debugOpts.thumbnails && _IsRaster(entry.path) && thumbCount < debugOpts.maxThumbnails) {
			const thumb = await _MakeThumbnail(entry.path, debugOpts.thumbnailSize);
			if (thumb) {
				preview.width = thumb.width;
				preview.height = thumb.height;
				preview.thumbDataUri = thumb.thumbDataUri;
				thumbCount++;
			}
		}
		previews.push(preview);
	}

	const summary = {
		skin: skinName,
		duration,
		mediaSteps: media?.length ?? 0,
		skippedMediaSteps: media?.filter((_m) => _m.skipped).length ?? 0,
		soundAtlases: sounds?.length ?? 0,
		stylesheets: files?.length ?? 0,
		atlasSprites: atlas?.positions?.length ?? 0,
		atlasSkipped: !!atlasSkipped,
		assets: sorted.length,
		thumbnails: previews.filter((_p) => _p.thumbDataUri).length,
		rasterAssets: rasterCandidates.length
	};

	if (debugOpts.log) {
		_EmitLog(debugOpts.log, `BuildSkin debug: skin "${skinName}" — ${summary.assets} asset(s), `
			+ `${summary.thumbnails} thumbnail(s), ${summary.duration} ms`);
		for (const preview of previews) {
			const flags = [preview.category, preview.step, preview.skipped ? "cached" : null].filter(Boolean).join(" · ");
			_EmitLog(debugOpts.log, `  ${preview.relPath}${flags ? ` (${flags})` : ""}`);
		}
	}

	return { summary, previews };
}
