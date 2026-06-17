// Sprite directive support (legacy µ.Sprite): rules register their image
// reference during compilation; Resolve() then packs all images into one
// atlas (microPS SpriteAtlas, incl. @2x) and rewrites the registered rules to
// background-image/image-set/background-position/width/height. Output format
// matches the legacy compiled CSS, minus the vendor-prefixed image-set lines
// (CONCEPT.md, D6).

import { existsSync, unlinkSync } from "node:fs";
import { join, relative } from "node:path";
import { SpriteAtlas } from "gulp-mu-ps";

// Raster source extensions tried (in order) when the literally referenced
// sprite file does not exist (P2): the generator output and the CSS Sprite()
// reference may diverge in extension, e.g. a webp atlas built from png sources.
const SOURCE_EXTENSIONS = ["png", "webp"];

// "imgs/sprites.png" -> "imgs/sprites@2x.png" (inserts @2x before the
// extension; works on both CSS URLs and file system paths).
function _RetinaUrl(_url) {
	const dot = _url.lastIndexOf(".");
	return dot < 0 ? `${_url}@2x` : `${_url.slice(0, dot)}@2x${_url.slice(dot)}`;
}

// Resolves a sprite URL to an existing source file: the literal path first,
// then the same stem with each supported raster extension. Returns null when
// no variant exists (so the build does not break on diverging extensions).
function _ResolveSourceFile(_baseDir, _url) {
	const literal = join(_baseDir, _url);
	if (existsSync(literal)) return literal;
	const dot = _url.lastIndexOf(".");
	const stem = dot < 0 ? _url : _url.slice(0, dot);
	for (const ext of SOURCE_EXTENSIONS) {
		const candidate = join(_baseDir, `${stem}.${ext}`);
		if (existsSync(candidate)) return candidate;
	}
	return null;
}

// Source location of the rule that registered a sprite, for error messages:
// ' - selector "div.logo" (src.µ.css:12)'.
function _Origin(_rule) {
	if (!_rule?.node) return "";
	const parts = [`selector "${_rule.selector}"`];
	const start = _rule.node.source?.start;
	const file = _rule.node.source?.input?.file;
	if (file) parts.push(`(${file}${start ? `:${start.line}` : ""})`);
	return ` - ${parts.join(" ")}`;
}

export class SpriteManager {
	// _options: {
	//   baseDir = "."              skin output dir; sprite URLs and the atlas
	//                              file are resolved against it
	//   atlasFile = "imgs/sprites.png"  atlas URL as it appears in the CSS;
	//                              a ".webp" extension produces a WebP atlas
	//   retina = true              build "<atlas>@2x" from "<image>@2x" sources
	//   padding = 0                spacing between sprites in the atlas
	//   preloadRule = false        write the div.csspreload rule on Resolve
	//   preload = null             PreloadRegistry (required for preloadRule)
	//   writeMapFile = false       persist "<atlas>.json" mapping data
	//   pruneSources = false       delete packed source images after Resolve
	// }
	constructor(_options = {}) {
		this.options = {
			baseDir: ".",
			atlasFile: "imgs/sprites.png",
			retina: true,
			padding: 0,
			preloadRule: false,
			preload: null,
			writeMapFile: false,
			pruneSources: false,
			..._options
		};
		this.registrations = [];
	}

	// Called by the -µ: Sprite(...) directive. _spriteOptions:
	// { offsetWidth, offsetHeight, offsetPosX, offsetPosY, afterWork }
	Register(_rule, _url, _spriteOptions = {}) {
		if (!_url) throw new Error("Sprite(): an image URL is required.");
		this.registrations.push({
			rule: _rule,
			url: _url,
			offsetWidth: _spriteOptions.offsetWidth ?? 0,
			offsetHeight: _spriteOptions.offsetHeight ?? 0,
			offsetPosX: _spriteOptions.offsetPosX ?? 0,
			offsetPosY: _spriteOptions.offsetPosY ?? 0,
			afterWork: _spriteOptions.afterWork ?? null
		});
	}

	// Manifest-level registration (sprites.include): the image is packed into
	// the atlas without a CSS rule to rewrite, so it is available for JS use or
	// preload even when no Sprite() directive references it. Duplicates of an
	// already registered URL are ignored.
	RegisterImage(_url) {
		if (!_url) throw new Error("SpriteManager.RegisterImage: an image URL is required.");
		if (this.registrations.some((_reg) => _reg.url === _url)) return;
		this.registrations.push({
			rule: null,
			url: _url,
			offsetWidth: 0,
			offsetHeight: 0,
			offsetPosX: 0,
			offsetPosY: 0,
			afterWork: null
		});
	}

	// Verifies that all registered sprite images (and their @2x variants when
	// retina is on) exist before the expensive packing starts. Reports ALL
	// missing files at once, each with the rule that referenced it. _files maps
	// each URL to its resolved source path (or null when no variant was found).
	_CheckSourceImages(_files) {
		const origins = new Map();
		for (const reg of this.registrations) {
			if (!origins.has(reg.url)) origins.set(reg.url, _Origin(reg.rule));
		}
		const missing = [];
		for (const [url, file] of _files) {
			if (!file) {
				missing.push(`"${url}" (no .${SOURCE_EXTENSIONS.join("/.")} source under ${this.options.baseDir})${origins.get(url)}`);
			} else if (this.options.retina && !existsSync(_RetinaUrl(file))) {
				missing.push(`"${_RetinaUrl(url)}" (@2x variant of "${url}") -> ${_RetinaUrl(file)}${origins.get(url)}`);
			}
		}
		if (missing.length) {
			throw new Error(
				`SpriteManager: ${missing.length} sprite image(s) not found:\n  - ${missing.join("\n  - ")}`
			);
		}
	}

	// Unique image URLs in registration order (used for cache fingerprints).
	ImageUrls() {
		const urls = [];
		for (const reg of this.registrations) {
			if (!urls.includes(reg.url)) urls.push(reg.url);
		}
		return urls;
	}

	// Resolved 1x (and @2x, when retina) source file paths for all registered
	// sprites, in registration order. Used by the build cache fingerprint so a
	// later-created or extension-swapped source still invalidates the cache.
	// Unresolved URLs contribute their literal path.
	SourceFiles() {
		const files = [];
		const seen = new Set();
		for (const reg of this.registrations) {
			if (seen.has(reg.url)) continue;
			seen.add(reg.url);
			const resolved = _ResolveSourceFile(this.options.baseDir, reg.url)
				?? join(this.options.baseDir, reg.url);
			files.push(resolved);
			if (this.options.retina) files.push(_RetinaUrl(resolved));
		}
		return files;
	}

	// Deletes 1x/@2x source files that were packed into the atlas (deploy trim).
	// Never removes the atlas itself. Returns skin-relative URLs deleted.
	PruneSources() {
		if (!this.options.pruneSources || !this.registrations.length) {
			return { deleted: [] };
		}
		const atlasPaths = new Set([
			join(this.options.baseDir, this.options.atlasFile),
			join(this.options.baseDir, _RetinaUrl(this.options.atlasFile))
		]);
		const deleted = [];
		const seen = new Set();
		for (const reg of this.registrations) {
			if (seen.has(reg.url)) continue;
			seen.add(reg.url);
			const resolved = _ResolveSourceFile(this.options.baseDir, reg.url)
				?? join(this.options.baseDir, reg.url);
			const candidates = [resolved];
			if (this.options.retina) candidates.push(_RetinaUrl(resolved));
			for (const file of candidates) {
				if (atlasPaths.has(file) || !existsSync(file)) continue;
				unlinkSync(file);
				deleted.push(relative(this.options.baseDir, file).split("\\").join("/"));
			}
		}
		return { deleted };
	}

	// Builds the atlas and rewrites all registered rules.
	// primary document (receives the preload rule); returns the atlas mapping
	// (sprites keyed by URL) or null when nothing was registered.
	// _resolveOptions.cached: a previous Resolve() result - the atlas images
	// are then assumed up to date and only the rules are rewritten (skips the
	// expensive packing/encoding, see CONCEPT.md D7).
	async Resolve(_document, _resolveOptions = {}) {
		let atlas = null;
		if (this.registrations.length) {
			if (_resolveOptions.cached) {
				atlas = _resolveOptions.cached;
			} else {
				const files = new Map();
				for (const reg of this.registrations) {
					if (!files.has(reg.url)) files.set(reg.url, _ResolveSourceFile(this.options.baseDir, reg.url));
				}
				this._CheckSourceImages(files);
				const packed = await SpriteAtlas.Create({
					images: [...files.values()],
					outputFile: join(this.options.baseDir, this.options.atlasFile),
					retina: this.options.retina,
					padding: this.options.padding,
					writeMapFile: this.options.writeMapFile
				});
				atlas = { width: packed.width, height: packed.height, retina: packed.retina, sprites: {} };
				for (const [url, file] of files) atlas.sprites[url] = packed.sprites[file];
			}

			const atlasUrl = this.options.atlasFile;
			const retinaUrl = _RetinaUrl(atlasUrl);
			for (const reg of this.registrations) {
				const sprite = atlas.sprites[reg.url];
				if (!sprite) throw new Error(`SpriteManager: no atlas position for "${reg.url}".`);
				const rule = reg.rule;
				// Manifest-included sprite (RegisterImage): it is in the atlas,
				// but there is no rule to rewrite.
				if (!rule) continue;
				["width", "height", "background-repeat", "background-position", "background-image"]
					.forEach((_prop) => rule.RemoveProperty(_prop));
				rule.AddProperty("background-image", `url(${atlasUrl})`);
				if (this.options.retina) {
					rule.AddProperty("background-image", `image-set(url(${atlasUrl})1x, url(${retinaUrl})2x)`);
				}
				rule.AddProperty("background-repeat", "no-repeat");
				rule.AddProperty("background-position",
					`${-(sprite.x + reg.offsetPosX)}px ${-(sprite.y + reg.offsetPosY)}px`);
				rule.AddProperty("width", `${sprite.width + reg.offsetWidth}px`);
				rule.AddProperty("height", `${sprite.height + reg.offsetHeight}px`);
				if (reg.afterWork) {
					try {
						reg.afterWork({
							rule,
							document: _document,
							url: reg.url,
							baseDir: this.options.baseDir,
							sprite: { ...sprite },
							atlas: { file: atlasUrl, retinaFile: this.options.retina ? retinaUrl : null, width: atlas.width, height: atlas.height }
						});
					} catch (error) {
						throw new Error(
							`afterWork hook for sprite "${reg.url}" failed${_Origin(reg.rule)}: ${error.message}`,
							{ cause: error }
						);
					}
				}
			}
		}
		if (this.options.preloadRule && this.options.preload && _document) {
			this.options.preload.CreateRule(_document);
		}
		this.lastPruned = atlas ? this.PruneSources() : { deleted: [] };
		return atlas;
	}
}
