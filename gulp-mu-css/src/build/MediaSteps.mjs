// Bridge from manifest "media" steps to microPS (CONCEPT.md, D3): renders
// PSD-based image series, app icons and sequence strips into the skin output
// directory and copies static assets. Generator steps are skipped when their
// configuration, sources and outputs are unchanged (D7); copy steps use a
// classic make-style mtime comparison.

import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, basename, dirname } from "node:path";
import { ButtonAndIconCreator, AppIconMaker, SequenceStrip } from "gulp-mu-ps";
import { FileFingerprint, FingerprintFiles, FingerprintsMatch } from "./BuildCache.mjs";
import { GetMediaStepHandler, MatchRegisteredMediaStep } from "./MediaStepRegistry.mjs";

// "imgs/smoke.png" + "webp" -> "imgs/smoke.webp"
function _SwapExtension(_file, _format) {
	const dot = _file.lastIndexOf(".");
	return dot < 0 ? `${_file}.${_format}` : `${_file.slice(0, dot)}.${_format}`;
}

function _ListFilesRecursive(_dir) {
	const result = [];
	for (const entry of readdirSync(_dir, { withFileTypes: true }).sort((_a, _b) => _a.name.localeCompare(_b.name))) {
		const path = join(_dir, entry.name);
		if (entry.isDirectory()) result.push(..._ListFilesRecursive(path));
		else result.push(path);
	}
	return result;
}

// Copies _source to _target when the target is missing or older (make-style).
function _CopyIfNewer(_source, _target) {
	const sourceStat = statSync(_source);
	if (existsSync(_target) && statSync(_target).mtimeMs >= sourceStat.mtimeMs) return false;
	mkdirSync(dirname(_target), { recursive: true });
	copyFileSync(_source, _target);
	return true;
}

// Resolves the base directory for step outputs. Default is the skin output
// directory; outputBase: "project" targets the project root instead, so a
// step can generate intermediate assets (raw -> final, e.g. sequence strips)
// that later copy/copyFolder steps pick up.
function _OutputBase(_step, _ctx) {
	const base = _step.outputBase ?? "skin";
	if (base === "skin") return _ctx.outputDir;
	if (base === "project") return _ctx.rootDir;
	throw new Error(`invalid outputBase "${_step.outputBase}" (use "skin" or "project")`);
}

// Runs one media step. _ctx: { rootDir, outputDir, imageFormat, cache, index }
// Returns { type, skipped, outputs }.
export async function RunMediaStep(_step, _ctx) {
	if (_step.copy) return _RunCopy(_step, _ctx);
	if (_step.copyFolder) return _RunCopyFolder(_step, _ctx);
	if (_step.buttonsAndIcons) return _RunGenerator(_step, _ctx, "buttonsAndIcons", _ButtonsAndIcons);
	if (_step.appIcons) return _RunGenerator(_step, _ctx, "appIcons", _AppIcons);
	if (_step.sequenceStrip) return _RunGenerator(_step, _ctx, "sequenceStrip", _SequenceStrip);
	const registeredType = MatchRegisteredMediaStep(_step);
	if (registeredType) {
		const handler = GetMediaStepHandler(registeredType);
		const result = await handler(_step, _ctx);
		return { type: registeredType, skipped: !!result.skipped, outputs: result.outputs ?? [] };
	}
	throw new Error(`unknown media step: ${JSON.stringify(_step)}`);
}

function _RunCopy(_step, _ctx) {
	const source = join(_ctx.rootDir, _step.copy);
	if (!existsSync(source)) {
		throw new Error(`copy: source file not found: ${source}`);
	}
	const target = join(_OutputBase(_step, _ctx), _step.to ?? ".", basename(_step.copy));
	const copied = _CopyIfNewer(source, target);
	return { type: "copy", skipped: !copied, outputs: [target] };
}

function _RunCopyFolder(_step, _ctx) {
	const sourceDir = join(_ctx.rootDir, _step.copyFolder);
	if (!existsSync(sourceDir)) {
		throw new Error(`copyFolder: source folder not found: ${sourceDir} `
			+ "(was the generation step that produces this folder run?)");
	}
	const targetDir = join(_OutputBase(_step, _ctx), _step.to ?? basename(_step.copyFolder));
	// Optional filename filter (regex source string), e.g. "\\.(png|json)$".
	const filter = _step.filter ? new RegExp(_step.filter, "i") : null;
	// P3: warn when the filter silently drops files in the active image format
	// (e.g. a "(png|json)" filter discarding freshly generated webp strips).
	const activeExt = `.${(_ctx.imageFormat ?? "png").toLowerCase()}`;
	const droppedActiveFormat = [];
	const outputs = [];
	let copiedAny = false;
	for (const source of _ListFilesRecursive(sourceDir)) {
		const relative = source.slice(sourceDir.length + 1);
		const relPosix = relative.replace(/\\/g, "/");
		if (filter && !filter.test(relPosix)) {
			if (relPosix.toLowerCase().endsWith(activeExt)) droppedActiveFormat.push(relPosix);
			continue;
		}
		const target = join(targetDir, relative);
		if (_CopyIfNewer(source, target)) copiedAny = true;
		outputs.push(target);
	}
	if (droppedActiveFormat.length) {
		const sample = droppedActiveFormat.slice(0, 3).join(", ");
		const more = droppedActiveFormat.length > 3 ? `, +${droppedActiveFormat.length - 3} more` : "";
		console.warn(`copyFolder: filter "${_step.filter}" excludes ${droppedActiveFormat.length} `
			+ `file(s) in the active image format "${activeExt}" (${sample}${more}). `
			+ `Add "${activeExt}" to the filter if these should be copied.`);
	}
	return { type: "copyFolder", skipped: !copiedAny, outputs };
}

// Generic generator step with D7 cache check: skip when the step config is
// unchanged, all sources have unchanged mtime/size and all outputs exist.
async function _RunGenerator(_step, _ctx, _type, _Runner) {
	const format = _step.format ?? _ctx.imageFormat;
	const sources = _CollectSources(_step, _ctx, _type);
	const signature = JSON.stringify({ step: _step, format });
	const fingerprints = FingerprintFiles(sources);
	const cacheKey = `media:${_ctx.index}`;

	const cached = _ctx.cache?.Get(cacheKey);
	if (cached
		&& cached.signature === signature
		&& FingerprintsMatch(cached.sources, fingerprints)
		&& cached.outputs.every((_file) => existsSync(_file))) {
		return { type: _type, skipped: true, outputs: cached.outputs };
	}

	const outputs = await _Runner(_step, _ctx, format, sources);
	_ctx.cache?.Set(cacheKey, { signature, sources: fingerprints, outputs });
	return { type: _type, skipped: false, outputs };
}

function _CollectSources(_step, _ctx, _type) {
	const source = join(_ctx.rootDir, _step[_type]);
	if (!existsSync(source)) {
		throw new Error(`${_type}: source not found: ${source}`);
	}
	if (_type === "sequenceStrip" && statSync(source).isDirectory()) {
		return _ListFilesRecursive(source);
	}
	return [source];
}

async function _ButtonsAndIcons(_step, _ctx, _format, _sources) {
	if (!_step.outputDir) throw new Error("buttonsAndIcons: outputDir is required.");
	const outputDir = join(_OutputBase(_step, _ctx), _step.outputDir);
	// mode "topLayerSets": one image per top child group (legacy
	// CreateByTopLayerSets); default mode is the icon x state matrix.
	if (_step.mode === "topLayerSets") {
		return ButtonAndIconCreator.CreateByTopLayerSets(_sources[0], {
			layout: _step.layout,
			outputDir,
			retina: _step.retina ?? true,
			format: _format,
			...(_step.setPattern ? { setPattern: _step.setPattern } : {})
		});
	}
	return ButtonAndIconCreator.Create(_sources[0], {
		layout: _step.layout,
		outputDir,
		retina: _step.retina ?? true,
		format: _format
	});
}

async function _AppIcons(_step, _ctx, _format, _sources) {
	return AppIconMaker.Create(_sources[0], {
		outputDir: join(_OutputBase(_step, _ctx), _step.outputDir ?? "."),
		...(_step.profiles ? { profiles: _step.profiles } : {}),
		...(_step.layout ? { layout: _step.layout } : {}),
		...(_step.background ? { background: _step.background } : {}),
		...(_step.appName ? { appName: _step.appName } : {}),
		...(_step.themeColor ? { themeColor: _step.themeColor } : {}),
		...(_step.shortName ? { shortName: _step.shortName } : {})
	});
}

async function _SequenceStrip(_step, _ctx, _format, _sources) {
	if (!_step.outputFile) throw new Error("sequenceStrip: outputFile is required.");
	const outputFile = join(_OutputBase(_step, _ctx), _format === "png"
		? _step.outputFile
		: _SwapExtension(_step.outputFile, _format));
	// A directory source is a frame sequence, a single file is a DSD image.
	const sourceIsDir = statSync(join(_ctx.rootDir, _step.sequenceStrip)).isDirectory();
	const result = await SequenceStrip.Create({
		...(sourceIsDir ? { images: _sources } : { dsdImage: _sources[0] }),
		outputFile,
		retina: _step.retina ?? true,
		writeMapFile: _step.writeMapFile ?? true
	});
	return result.files;
}
