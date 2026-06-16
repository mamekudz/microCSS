// Node port of the former AppIconMaker plugin, updated to the current (2026)
// platform requirements. Instead of the fixed 2014 favicon size list, icons
// are generated from configurable profiles:
//
//   "web"  - favicons, favicon.ico, apple-touch-icon and PWA icons including a maskable
//            variant (logo confined to the 80% safe zone on an opaque
//            background), plus site.webmanifest and an HTML snippet
//   "ios"  - single 1024x1024 App Store master, alpha channel removed
//            (Xcode "Single Size" generates all other variants itself)
//   "play" - 512x512 Play Store listing icon plus adaptive icon layers
//            (432x432 xxxhdpi, logo inside the 66/108 dp safe zone)
//
// Custom profiles can be passed as { name, icons: [{ file, size, mode }] }
// with mode being "plain" (default), "flatten" or "maskable".

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { PsDocument } from "../psd/PsDocument.mjs";
import { RenderDocument } from "../render/Compositor.mjs";
import { RasterToBytes } from "../render/Raster.mjs";
import { EncodeIco } from "../io/WriteIco.mjs";

const PROFILES = {
	web: {
		name: "web",
		icons: [
			{ file: "favicon-16x16.png", size: 16 },
			{ file: "favicon-32x32.png", size: 32 },
			{ file: "favicon-48x48.png", size: 48 },
			{ file: "favicon.ico", mode: "ico", sizes: [16, 32, 48] },
			{ file: "favicon-96x96.png", size: 96 },
			{ file: "apple-touch-icon.png", size: 180 },
			{ file: "icon-192.png", size: 192 },
			{ file: "icon-512.png", size: 512 },
			{ file: "icon-512-maskable.png", size: 512, mode: "maskable" }
		]
	},
	ios: {
		name: "ios",
		icons: [
			{ file: "appstore-icon-1024.png", size: 1024, mode: "flatten" }
		]
	},
	play: {
		name: "play",
		icons: [
			{ file: "playstore-icon-512.png", size: 512 },
			// Adaptive icon layers at xxxhdpi (108dp grid = 432px, safe zone 66dp ≈ 264px).
			{ file: "adaptive-foreground-432.png", size: 432, mode: "maskable", safeZone: 66 / 108, transparentBackground: true },
			{ file: "adaptive-background-432.png", size: 432, mode: "background" }
		]
	}
};

// PWA safe zone: content must stay within the central 80% of a maskable icon.
const MASKABLE_SAFE_ZONE = 0.8;

function _MasterSharp(_master) {
	return sharp(_master.data, { raw: { width: _master.size, height: _master.size, channels: 4 } });
}

async function _SavePlain(_master, _size, _fileName) {
	await _MasterSharp(_master)
		.resize(_size, _size, { kernel: "lanczos3" })
		.png({ compressionLevel: 9 })
		.toFile(_fileName);
}

// Flattens onto the background color and removes the alpha channel (App Store requirement).
async function _SaveFlattened(_master, _size, _fileName, _background) {
	await _MasterSharp(_master)
		.resize(_size, _size, { kernel: "lanczos3" })
		.flatten({ background: _background })
		.removeAlpha()
		.png({ compressionLevel: 9 })
		.toFile(_fileName);
}

// Scales the logo into the safe zone and centers it on an opaque (or transparent) background.
async function _SaveMaskable(_master, _size, _fileName, _background, _safeZone, _transparentBackground) {
	const logoSize = Math.round(_size * _safeZone);
	const logo = await _MasterSharp(_master)
		.resize(logoSize, logoSize, { kernel: "lanczos3" })
		.png()
		.toBuffer();
	const background = _transparentBackground ? { r: 0, g: 0, b: 0, alpha: 0 } : _background;
	await sharp({
		create: { width: _size, height: _size, channels: 4, background }
	})
		.composite([{ input: logo, gravity: "centre" }])
		.png({ compressionLevel: 9 })
		.toFile(_fileName);
}

async function _SaveBackground(_size, _fileName, _background) {
	await sharp({
		create: { width: _size, height: _size, channels: 4, background: _background }
	})
		.flatten({ background: _background })
		.png({ compressionLevel: 9 })
		.toFile(_fileName);
}

async function _SaveIco(_master, _fileName, _sizes) {
	const images = [];
	for (const size of _sizes) {
		const data = await _MasterSharp(_master)
			.resize(size, size, { kernel: "lanczos3" })
			.png({ compressionLevel: 9 })
			.toBuffer();
		images.push({ size, data });
	}
	writeFileSync(_fileName, EncodeIco(images));
}

function _WriteWebManifest(_outputDir, _options) {
	const manifest = {
		name: _options.appName,
		short_name: _options.shortName ?? _options.appName,
		icons: [
			{ src: "icon-192.png", sizes: "192x192", type: "image/png" },
			{ src: "icon-512.png", sizes: "512x512", type: "image/png" },
			{ src: "icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
		],
		theme_color: _options.themeColor,
		background_color: _options.background,
		display: "standalone",
		start_url: "/"
	};
	const manifestFile = join(_outputDir, "site.webmanifest");
	writeFileSync(manifestFile, JSON.stringify(manifest, null, "\t"));

	const snippet = [
		`<link rel="icon" href="favicon.ico" sizes="any">`,
		`<link rel="icon" type="image/png" sizes="16x16" href="favicon-16x16.png">`,
		`<link rel="icon" type="image/png" sizes="32x32" href="favicon-32x32.png">`,
		`<link rel="icon" type="image/png" sizes="96x96" href="favicon-96x96.png">`,
		`<link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png">`,
		`<link rel="manifest" href="site.webmanifest">`,
		`<meta name="theme-color" content="${_options.themeColor}">`
	].join("\n") + "\n";
	const snippetFile = join(_outputDir, "appicons.html");
	writeFileSync(snippetFile, snippet);
	return [manifestFile, snippetFile];
}

export class AppIconMaker {
	// _source: PSD file (rendered with the document compositor) or any image file sharp can read.
	// _options: {
	//   outputDir: string
	//   profiles = ["web", "ios", "play"]   profile names and/or custom profile objects
	//   layout = null                       PSD only: show exactly this top-level group
	//   background = "#ffffff"              flatten/maskable background color
	//   appName = "App", shortName, themeColor = "#ffffff"   web manifest values
	// }
	static async Create(_source, _options) {
		const options = {
			profiles: ["web", "ios", "play"],
			layout: null,
			background: "#ffffff",
			appName: "App",
			themeColor: "#ffffff",
			..._options
		};
		if (!options.outputDir) throw new Error("AppIconMaker: no output directory given.");
		mkdirSync(options.outputDir, { recursive: true });

		const master = await this._LoadMaster(_source, options.layout);
		const generated = [];
		for (const profileRef of options.profiles) {
			const profile = (typeof profileRef === "string") ? PROFILES[profileRef] : profileRef;
			if (!profile) throw new Error(`AppIconMaker: unknown profile "${profileRef}".`);
			for (const icon of profile.icons) {
				const fileName = join(options.outputDir, icon.file);
				const mode = icon.mode ?? "plain";
				if (mode === "plain") {
					await _SavePlain(master, icon.size, fileName);
				} else if (mode === "flatten") {
					await _SaveFlattened(master, icon.size, fileName, options.background);
				} else if (mode === "maskable") {
					await _SaveMaskable(master, icon.size, fileName, options.background,
						icon.safeZone ?? MASKABLE_SAFE_ZONE, icon.transparentBackground ?? false);
				} else if (mode === "background") {
					await _SaveBackground(icon.size, fileName, options.background);
				} else if (mode === "ico") {
					await _SaveIco(master, fileName, icon.sizes ?? [16, 32, 48]);
				} else {
					throw new Error(`AppIconMaker: unknown icon mode "${mode}".`);
				}
				generated.push(fileName);
			}
			if (profile.name === "web") {
				generated.push(..._WriteWebManifest(options.outputDir, options));
			}
		}
		return generated;
	}

	// Loads the master image as a square RGBA buffer ({ data, size }).
	static async _LoadMaster(_source, _layout) {
		if (_source.toLowerCase().endsWith(".psd")) {
			const doc = PsDocument.Load(_source);
			if (_layout) {
				// Like the legacy _switchLayout: show exactly the matching top-level group.
				let found = false;
				for (const node of doc.children) {
					if (!node.children) continue;
					node.hidden = (node.name !== _layout);
					found = found || !node.hidden;
				}
				if (!found) throw new Error(`AppIconMaker: layout "${_layout}" not found.`);
			}
			if (doc.width !== doc.height) {
				throw new Error(`AppIconMaker: master must be square (got ${doc.width}x${doc.height}).`);
			}
			const raster = RenderDocument(doc);
			return { data: RasterToBytes(raster), size: doc.width };
		}
		const { data, info } = await sharp(_source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
		if (info.width !== info.height) {
			throw new Error(`AppIconMaker: master must be square (got ${info.width}x${info.height}).`);
		}
		return { data, size: info.width };
	}
}
