// Embeds a raster or SVG file as a data: URI in compiled CSS (value or
// directive form). Unlike Sprite(), the image is not packed into the atlas.

import { readFileSync } from "node:fs";
import { ResolveImageFile, RetinaUrl, RASTER_EXTENSIONS } from "./ResolveImageFile.mjs";

const MIME_BY_EXT = {
	png: "image/png",
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	gif: "image/gif",
	webp: "image/webp",
	svg: "image/svg+xml"
};

const DATA_URI_EXTENSIONS = [...RASTER_EXTENSIONS, "jpg", "jpeg", "gif", "svg"];

function _MimeType(_filePath, _override) {
	if (_override) return _override;
	const ext = _filePath.split(".").pop()?.toLowerCase() ?? "";
	return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

function _ReadDataUri(_filePath, _mime) {
	const base64 = readFileSync(_filePath).toString("base64");
	return `data:${_mime};base64,${base64}`;
}

function _WrapUrl(_dataUri, _wrap) {
	return _wrap ? `url(${_dataUri})` : _dataUri;
}

// Returns a CSS url(...) or image-set(...) value for the given skin-relative
// image URL. _options: { wrap=true, mime, retina=false, extensions }.
export function CreateDataUriCSSValue(_baseDir, _url, _options = {}) {
	if (!_baseDir) throw new Error("DataUri(): baseDir is required.");
	if (!_url) throw new Error("DataUri(): an image URL is required.");

	const wrap = _options.wrap !== false;
	const extensions = _options.extensions ?? DATA_URI_EXTENSIONS;
	const file = ResolveImageFile(_baseDir, _url, extensions);
	if (!file) {
		throw new Error(
			`DataUri(): image not found for "${_url}" (tried .${extensions.join("/.")} under ${_baseDir})`
		);
	}

	const dataUri = _ReadDataUri(file, _MimeType(file, _options.mime));
	if (!_options.retina) return _WrapUrl(dataUri, wrap);

	const retinaFile = ResolveImageFile(_baseDir, RetinaUrl(_url), extensions);
	if (!retinaFile) {
		throw new Error(`DataUri(): @2x variant not found for "${_url}" (expected "${RetinaUrl(_url)}")`);
	}
	const dataUri2 = _ReadDataUri(retinaFile, _MimeType(retinaFile, _options.mime));
	if (!wrap) throw new Error("DataUri(): retina requires wrap: true (CSS url/image-set form).");
	return `image-set(url(${dataUri})1x, url(${dataUri2})2x)`;
}

// Directive helper: writes the data URI into _rule (default: background-image).
export function ApplyDataUri(_rule, _baseDir, _url, _options = {}) {
	const prop = _options.property ?? "background-image";
	const value = CreateDataUriCSSValue(_baseDir, _url, _options);
	if (prop === "background-image") _rule.RemoveProperty("background-image");
	_rule.AddProperty(prop, value);
}
