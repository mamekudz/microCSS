// Skin build orchestration (CONCEPT.md, D3/D7): loads a skin manifest
// (skins/src/<skinname>.µcss.mjs), runs the media steps (microPS bridge, cached),
// compiles all µCSS source files (*.µ.css), resolves the sprite atlas (with position cache)
// and writes the results into the skin output directory.

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, parse, resolve, relative, sep } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import uglifycss from "uglifycss";
import { SoundAtlasMaker } from "gulp-mu-au";
import { CompileMcss } from "../compile/Compiler.mjs";
import { SpriteManager } from "../api/Sprites.mjs";
import { CursorManager } from "../api/Cursors.mjs";
import { PreloadRegistry } from "../api/Preload.mjs";
import { BuildCache, FingerprintFiles, FingerprintsMatch, CACHE_SCHEMA } from "./BuildCache.mjs";
import { RunMediaStep } from "./MediaSteps.mjs";

const ownPackage = JSON.parse(
	readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../package.json"), "utf8")
);

// "imgs/sprites.png" + "webp" -> "imgs/sprites.webp"
function _SwapExtension(_file, _format) {
	const dot = _file.lastIndexOf(".");
	return dot < 0 ? `${_file}.${_format}` : `${_file.slice(0, dot)}.${_format}`;
}

function _RetinaUrl(_url) {
	const dot = _url.lastIndexOf(".");
	return dot < 0 ? `${_url}@2x` : `${_url.slice(0, dot)}@2x${_url.slice(dot)}`;
}

// CSS minification for the manifest `minify` option. The default engine is
// uglifycss (the library behind gulp-uglifycss): conservative - it strips
// whitespace/comments but never reorders or merges rules, so the deployed CSS
// stays byte-for-byte equivalent to the legacy gulp-uglifycss output.
//   minify: true            uglifycss with defaults { maxLineLen: 1000, uglyComments: true }
//   minify: { ...options }  uglifycss with these options merged over the defaults
//   minify: (css) => css    custom minifier (any engine), no extra dependency
function _MinifyCss(_css, _minify) {
	if (typeof _minify === "function") return _minify(_css);
	const options = (_minify && typeof _minify === "object") ? _minify : {};
	return uglifycss.processString(_css, { maxLineLen: 1000, uglyComments: true, ...options });
}

// Raster extensions accepted for manifest-level sprite includes.
const SPRITE_INCLUDE_EXTENSIONS = [".png", ".webp"];

// Expands the sprites.include manifest entries (files and/or directories,
// relative to the skin output dir) into atlas image URLs. Directories are
// scanned recursively; @2x retina variants and the atlas file itself are
// skipped (the @2x sources are pulled in automatically by the atlas builder).
// Each directory's matches are sorted for a deterministic atlas order.
function _ExpandSpriteIncludes(_includes, _baseDir, _atlasFile) {
	const atlasUrls = new Set([_atlasFile, _RetinaUrl(_atlasFile)]);
	const isCandidate = (_name) => {
		const lower = _name.toLowerCase();
		return SPRITE_INCLUDE_EXTENSIONS.some((_ext) => lower.endsWith(_ext)) && !/@2x\.(png|webp)$/i.test(_name);
	};
	const toUrl = (_absFile) => relative(_baseDir, _absFile).split(sep).join("/");

	const urls = [];
	for (const entry of _includes) {
		const abs = join(_baseDir, entry);
		if (!existsSync(abs)) {
			throw new Error(`BuildSkin: sprites.include path "${entry}" not found under ${_baseDir}.`);
		}
		if (statSync(abs).isDirectory()) {
			const found = [];
			const walk = (_dir) => {
				for (const dirent of readdirSync(_dir, { withFileTypes: true })) {
					const full = join(_dir, dirent.name);
					if (dirent.isDirectory()) walk(full);
					else if (dirent.isFile() && isCandidate(dirent.name)) found.push(toUrl(full));
				}
			};
			walk(abs);
			found.sort();
			for (const url of found) if (!atlasUrls.has(url)) urls.push(url);
		} else {
			const url = entry.split(/[\\/]/).join("/");
			if (!atlasUrls.has(url)) urls.push(url);
		}
	}
	return urls;
}

// Declares a skin configuration (manifest default export). Performs basic
// validation and fills in nothing - the structure is plain data plus helper
// functions, see CONCEPT.md D3.
export function DefineSkin(_config) {
	if (!_config || typeof _config !== "object") {
		throw new Error("DefineSkin: a configuration object is required.");
	}
	for (const entry of _config.files ?? []) {
		if (!entry.source || !entry.target) {
			throw new Error(`DefineSkin: files entries need source and target (${JSON.stringify(entry)}).`);
		}
	}
	return _config;
}

// Imports the manifest module; the mtime query defeats Node's module cache
// so watch runs pick up manifest edits. The default export may be a config
// object (DefineSkin({...})) or a factory function that receives the build
// parameters (the BuildSkin options) and returns one - the latter lets a single
// manifest react to release/variant/vars passed in per gulp invocation, e.g.
// `export default ({ release }) => DefineSkin({ buildFilter: { release }, ... })`.
async function _LoadManifest(_manifestFile, _params) {
	const stamp = Math.round(statSync(_manifestFile).mtimeMs);
	const module = await import(`${pathToFileURL(_manifestFile).href}?mtime=${stamp}`);
	let config = module.default;
	if (typeof config === "function") config = config(_params);
	if (!config || typeof config !== "object") {
		throw new Error(`BuildSkin: manifest "${_manifestFile}" must default-export a DefineSkin({...}) object or a function returning one.`);
	}
	return config;
}

// Resolves the sprite atlas with the D7 position cache: when the image set,
// the source images (incl. @2x) and the atlas options are unchanged and the
// atlas files still exist, the cached positions are reused and no packing or
// encoding happens.
async function _ResolveSprites(_sprites, _document, _cache, _force) {
	const urls = _sprites.ImageUrls();
	if (!urls.length) {
		await _sprites.Resolve(_document);
		return { atlas: null, skipped: false };
	}

	const options = _sprites.options;
	// Fingerprint the actually resolved source files (P2: a Sprite() URL may
	// resolve to a different extension than referenced), so an extension swap
	// or a later-created source correctly invalidates the cache.
	const sourceFiles = _sprites.SourceFiles();
	const signature = JSON.stringify({
		atlasFile: options.atlasFile,
		retina: options.retina,
		padding: options.padding,
		urls
	});
	const fingerprints = FingerprintFiles(sourceFiles);
	const atlasFiles = [join(options.baseDir, options.atlasFile)];
	if (options.retina) atlasFiles.push(join(options.baseDir, _RetinaUrl(options.atlasFile)));

	const cached = _cache.Get("atlas");
	if (!_force
		&& cached
		&& cached.signature === signature
		&& FingerprintsMatch(cached.sources, fingerprints)
		&& atlasFiles.every((_file) => existsSync(_file))) {
		const atlas = await _sprites.Resolve(_document, { cached: cached.atlas });
		return { atlas, skipped: true };
	}

	const atlas = await _sprites.Resolve(_document);
	_cache.Set("atlas", { signature, sources: fingerprints, atlas });
	return { atlas, skipped: false };
}

// Builds one sound atlas from a manifest sounds entry (microAU bridge).
// Sources (src directory / include files) are project-relative (rootDir, like
// media sources); the combined blob and the JSON timing map land in the skin
// output dir. Each atlas keeps its own incremental cache under <outputDir>/.cache.
async function _BuildSoundAtlas(_entry, _ctx) {
	const { rootDir, outputDir, skinName, index, force } = _ctx;
	const format = _entry.format ?? "wav";
	const ext = format === "mp3" ? "mp3" : "wav";
	const dataFile = _entry.dataFile ?? `snds/${skinName}.sounds.${ext}`;
	const jsonFile = _entry.jsonFile ?? _SwapExtension(dataFile, "json");
	const includeFiles = (_entry.include ?? []).map((_file) => join(rootDir, _file));

	const result = await SoundAtlasMaker.Create({
		src: _entry.src ? join(rootDir, _entry.src) : undefined,
		sounds: includeFiles.length ? includeFiles : undefined,
		dataFile: join(outputDir, dataFile),
		jsonFile: join(outputDir, jsonFile),
		format,
		mp3KBitRate: _entry.mp3KBitRate,
		sampleRate: _entry.sampleRate,
		sampleSize: _entry.sampleSize,
		channels: _entry.channels,
		stereo: _entry.stereo,
		cacheFile: join(outputDir, ".cache", `sounds-${index}.cache.json`),
		force,
		log: false
	});
	return { dataFile, jsonFile, sounds: result.sounds, skipped: result.skipped };
}

// Builds one skin from its manifest file.
//
// Directory conventions (CONCEPT.md, D3): for skins/src/std.µcss.mjs the skin
// name is "std", the output directory skins/std/ and the project root (base of
// media source paths like dev/media/...) two levels above the manifest.
// All three are overridable via _options { outputDir, rootDir, force }.
// Further options let a gulp task steer the build per invocation:
//   - buildFilter: merged over the manifest's buildFilter (option wins),
//   - vars: merged over the manifest's vars (global variable overrides),
//   - any other fields are forwarded to a factory manifest (function default
//     export) so it can react to e.g. release/variant.
export async function BuildSkin(_manifestPath, _options = {}) {
	const startedAt = Date.now();
	const manifestFile = resolve(_manifestPath);
	const srcDir = dirname(manifestFile);
	// Strip the manifest marker (".µcss" or ASCII ".mucss") from the basename.
	const skinName = parse(manifestFile).name.replace(/\.(µcss|mucss)$/i, "");
	const rootDir = _options.rootDir ? resolve(_options.rootDir) : resolve(srcDir, "..", "..");
	const outputDir = _options.outputDir ? resolve(_options.outputDir) : resolve(srcDir, "..", skinName);
	const force = !!_options.force;

	// Build parameters handed to a factory manifest (and used below to override
	// manifest defaults): everything from the BuildSkin() call plus the derived
	// paths, so the manifest can react to release/variant/vars per invocation.
	const config = await _LoadManifest(manifestFile, { ..._options, skinName, srcDir, rootDir, outputDir });
	mkdirSync(outputDir, { recursive: true });

	const cache = BuildCache.Load(join(outputDir, ".cache", "build.json"), {
		schema: CACHE_SCHEMA,
		package: ownPackage.version
	});
	if (force) cache.Clear();

	// 1. Media steps (microPS bridge) - the images must exist before the
	// sprite atlas and the cursor @2x checks run. skipMedia builds CSS only,
	// assuming the media outputs already exist (e.g. migration comparisons).
	const imageFormat = config.imageFormat ?? "png";
	const media = [];
	if (!_options.skipMedia) {
		for (let index = 0; index < (config.media ?? []).length; index++) {
			const step = config.media[index];
			try {
				media.push(await RunMediaStep(step, { rootDir, outputDir, imageFormat, cache, index }));
			} catch (error) {
				const label = ["copy", "copyFolder", "buttonsAndIcons", "appIcons", "sequenceStrip"]
					.filter((_key) => step[_key]).map((_key) => `${_key}: "${step[_key]}"`).join(", ");
				throw new Error(`BuildSkin: media step ${index + 1} of ${config.media.length} (${label || JSON.stringify(step)}) failed: ${error.message}`, { cause: error });
			}
		}
	}

	// 1b. Sound atlases (microAU bridge): one combined audio blob + JSON timing
	// map per sounds entry (object or array). Independent of the CSS/sprite
	// pipeline; sounds are referenced by name from JS (or, later, CSS bindings).
	const sounds = [];
	if (!_options.skipMedia) {
		const soundsConfig = Array.isArray(config.sounds)
			? config.sounds
			: (config.sounds ? [config.sounds] : []);
		for (let index = 0; index < soundsConfig.length; index++) {
			try {
				sounds.push(await _BuildSoundAtlas(soundsConfig[index], { rootDir, outputDir, skinName, index, force }));
			} catch (error) {
				throw new Error(`BuildSkin: sounds entry ${index + 1} of ${soundsConfig.length} failed: ${error.message}`, { cause: error });
			}
		}
	}

	// 2. Managers for the µ-directives.
	const preload = new PreloadRegistry(outputDir);
	const cursors = new CursorManager(config.cursors ?? [], { baseDir: outputDir, preload });
	const spritesConfig = config.sprites ?? {};
	// The atlas output format is decoupled from the global imageFormat (P1):
	// sprites.format overrides it, so the atlas alone can be switched to e.g.
	// webp (sprites: { format: "webp" }) without annotating every media
	// generator step. The atlas file extension follows the resulting format.
	const atlasFormat = spritesConfig.format ?? imageFormat;
	const atlasFile = atlasFormat === "png"
		? (spritesConfig.file ?? "imgs/sprites.png")
		: _SwapExtension(spritesConfig.file ?? "imgs/sprites.png", atlasFormat);
	const sprites = new SpriteManager({
		baseDir: outputDir,
		atlasFile,
		retina: spritesConfig.retina ?? true,
		padding: spritesConfig.padding ?? 0,
		preloadRule: !!spritesConfig.preloadRule,
		preload,
		pruneSources: !!spritesConfig.pruneSources,
		pruneKeep: spritesConfig.pruneKeep ?? []
	});

	// 3. Compile all stylesheets (sprite rules register, nothing is packed yet).
	// Build-type / variant filtering (gulp-mu-build-filter): manifest defaults
	// merged with BuildSkin() options, so release/variants can also come from
	// the CLI/env per invocation; per-file entry.buildFilter overrides both.
	const buildFilterBase = (config.buildFilter || _options.buildFilter)
		? { ...config.buildFilter, ..._options.buildFilter }
		: null;
	const compiled = [];
	for (const entry of config.files ?? []) {
		const sourceFile = join(srcDir, entry.source);
		if (!existsSync(sourceFile)) {
			throw new Error(`BuildSkin: source file "${entry.source}" (files entry for target "${entry.target}") not found: ${sourceFile}`);
		}
		const document = CompileMcss(readFileSync(sourceFile, "utf8"), {
			// BuildSkin({ vars }) overrides manifest vars per invocation, so a
			// gulp task can inject globals (theme color, version, ...) from CLI/env.
			vars: { ...config.vars, ..._options.vars },
			helpers: config.helpers ?? {},
			sprites,
			cursors,
			from: sourceFile,
			// Local @import targets are always inlined; the import diagnostic
			// modes, the opt-in rule merge and the build filter are manifest-
			// configurable (per-file entry.* wins over the skin-wide config.*).
			imports: entry.imports ?? config.imports,
			merge: entry.merge ?? config.merge,
			buildFilter: entry.buildFilter ? { ...buildFilterBase, ...entry.buildFilter } : buildFilterBase
		});
		compiled.push({ entry, document });
	}

	// 3b. Manifest-level sprite includes (sprites.include): add single images
	// and/or whole directories to the atlas without a CSS rule, so assets used
	// only from JS or for preload still land in the atlas. Resolved against the
	// skin output dir (like Sprite() URLs); registered after the CSS sprites so
	// directive-referenced sprites keep their order.
	for (const url of _ExpandSpriteIncludes(spritesConfig.include ?? [], outputDir, atlasFile)) {
		sprites.RegisterImage(url);
	}

	// 4. Sprite atlas (cached) - rewrites the registered rules in all
	// documents; the preload rule goes into the first stylesheet.
	const atlasResult = await _ResolveSprites(sprites, compiled[0]?.document ?? null, cache, force);

	// 5. Emit (optionally minified via the manifest `minify` option).
	const minify = config.minify ?? false;
	const minifyTransform = minify ? (_css) => _MinifyCss(_css, minify) : undefined;
	const files = [];
	for (const { entry, document } of compiled) {
		const target = join(outputDir, entry.target);
		await document.ToFile(target, minifyTransform);
		files.push({ source: entry.source, target });
	}

	cache.Save();
	return {
		skin: skinName,
		outputDir,
		media,
		sounds,
		files,
		atlas: atlasResult.atlas,
		atlasSkipped: atlasResult.skipped,
		prunedSources: sprites.lastPruned?.deleted ?? [],
		keptSources: sprites.lastPruned?.kept ?? [],
		minified: !!minify,
		duration: Date.now() - startedAt
	};
}
