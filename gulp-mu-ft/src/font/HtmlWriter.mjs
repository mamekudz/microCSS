// microFT - HTML overview generator. Produces a self-contained, build-time
// rendered page that shows the whole character set grouped by source directory.
// Group labels/descriptions and per-glyph descriptions are supplied by the
// manifest; all text is English only (i18n is added later via i18x).

function _Escape(_text) {
	return String(_text ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function _Hex(_code) {
	return _code.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Groups glyphs by their source directory and resolves the group metadata.
 *
 * @returns {Array<{id: string, label: string, description: string, order: number, minCode: number, glyphs: Array}>}
 */
function _GroupGlyphs(_glyphs, _groupMeta) {
	const byId = new Map();
	for (const glyph of _glyphs) {
		if (!byId.has(glyph.groupId)) byId.set(glyph.groupId, []);
		byId.get(glyph.groupId).push(glyph);
	}

	const groups = [];
	for (const [id, glyphs] of byId) {
		const meta = _groupMeta[id] ?? {};
		const sorted = [...glyphs].sort((_a, _b) => _a.code - _b.code);
		groups.push({
			id,
			label: meta.label ?? (id === "" ? "(root)" : id),
			description: meta.description ?? "",
			order: typeof meta.order === "number" ? meta.order : Number.POSITIVE_INFINITY,
			minCode: sorted[0].code,
			glyphs: sorted
		});
	}

	groups.sort((_a, _b) => _a.order - _b.order || _a.minCode - _b.minCode);
	return groups;
}

/**
 * Builds the overview HTML page.
 *
 * @param {Array} _glyphs glyphs from ScanGlyphs
 * @param {object} [_options]
 * @param {string} [_options.fontName="icons"]
 * @param {string} [_options.classPrefix="icon"]
 * @param {string} [_options.fontUrlBase=""] path prefix for the embedded font
 * @param {number} [_options.glyphFontSize=28] preview glyph size in px
 * @param {object} [_options.groups={}] groupId -> { label, description, order }
 * @param {object} [_options.glyphMeta={}] glyphName -> { description }
 * @param {object} [_options.html={}] { title, intro }
 * @param {number} [_options.cacheBust]
 * @returns {string} the HTML document
 */
export function BuildOverviewHtml(_glyphs, _options = {}) {
	const fontName = _options.fontName ?? "icons";
	const prefix = _options.classPrefix ?? "icon";
	const base = _options.fontUrlBase ?? "";
	const glyphSize = _options.glyphFontSize ?? 28;
	const groupMeta = _options.groups ?? {};
	const glyphMeta = _options.glyphMeta ?? {};
	const htmlMeta = _options.html ?? {};
	const title = htmlMeta.title ?? `${fontName} - Character Set`;
	const intro = htmlMeta.intro ?? "";
	const bust = _options.cacheBust != null ? `?${_options.cacheBust}` : "";

	const groups = _GroupGlyphs(_glyphs, groupMeta);
	const total = _glyphs.length;

	let body = "";
	body += `<h1>${_Escape(title)}</h1>\n`;
	body += `<p class="meta">${total} glyph${total === 1 ? "" : "s"} &middot; font-family <code>${_Escape(fontName)}</code></p>\n`;
	if (intro) body += `<p class="intro">${_Escape(intro)}</p>\n`;

	for (const group of groups) {
		const min = _Hex(group.glyphs[0].code);
		const max = _Hex(group.glyphs[group.glyphs.length - 1].code);
		body += `<section>\n`;
		body += `<h2>${_Escape(group.label)} <span class="range">U+${min} – U+${max}</span></h2>\n`;
		if (group.description) body += `<p class="group-descr">${_Escape(group.description)}</p>\n`;
		body += `<table>\n<thead><tr><th>Glyph</th><th>Code</th><th>CSS class</th><th>Description</th></tr></thead>\n<tbody>\n`;
		for (const glyph of group.glyphs) {
			const descr = glyphMeta[glyph.name]?.description ?? "";
			body += `<tr>`;
			body += `<td class="glyph"><span style="font-family:'${_Escape(fontName)}';font-size:${glyphSize}px">&#${glyph.code};</span></td>`;
			body += `<td class="code">U+${_Hex(glyph.code)}</td>`;
			body += `<td class="cls"><code>${_Escape(prefix)}-${_Escape(glyph.name)}</code></td>`;
			body += `<td class="descr">${_Escape(descr)}</td>`;
			body += `</tr>\n`;
		}
		body += `</tbody>\n</table>\n</section>\n`;
	}

	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${_Escape(title)}</title>
<style>
@font-face {
	font-family: '${fontName}';
	src: url('${base}${fontName}.woff2${bust}') format('woff2'),
		url('${base}${fontName}.woff${bust}') format('woff');
	font-weight: normal;
	font-style: normal;
	font-display: block;
}
:root { color-scheme: light dark; }
body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; margin: 0; padding: 24px; line-height: 1.45; }
h1 { margin: 0 0 4px; font-size: 1.6rem; }
h2 { margin: 32px 0 4px; font-size: 1.2rem; }
.meta, .intro, .group-descr { color: #666; margin: 4px 0; }
.range { font-weight: normal; font-size: .8rem; color: #888; margin-left: 8px; }
table { border-collapse: collapse; width: 100%; margin: 8px 0 4px; }
th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: left; vertical-align: middle; }
th { background: rgba(127,127,127,.12); font-weight: 600; }
td.glyph { text-align: center; width: 64px; }
td.code { white-space: nowrap; font-variant-numeric: tabular-nums; }
code { font-family: ui-monospace, "SFMono-Regular", Consolas, monospace; font-size: .85em; }
</style>
</head>
<body>
${body}</body>
</html>
`;
}
