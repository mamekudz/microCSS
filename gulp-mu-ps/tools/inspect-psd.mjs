// Small diagnostic tool: prints the layer tree and layer effects of a PSD file.
// Usage: node tools/inspect-psd.mjs <file.psd>
import { readFileSync } from "node:fs";
import { readPsd } from "ag-psd";
import { EnsureAgPsdInitialized } from "../src/psd/InitAgPsd.mjs";

EnsureAgPsdInitialized();

const fileName = process.argv[2];
if (!fileName) {
	console.error("Usage: node tools/inspect-psd.mjs <file.psd>");
	process.exit(1);
}

const buffer = readFileSync(fileName);
const psd = readPsd(buffer, { skipCompositeImageData: true, skipThumbnail: true, useImageData: true });

console.log(`Document: ${psd.width}x${psd.height}px, channels=${psd.channels}, bitsPerChannel=${psd.bitsPerChannel}`);

function DumpLayer(_layer, _indent) {
	const pad = "  ".repeat(_indent);
	const kind = _layer.children ? "GROUP" : "LAYER";
	const vis = _layer.hidden ? "hidden" : "visible";
	const bounds = `[${_layer.left},${_layer.top} ${_layer.right - _layer.left}x${_layer.bottom - _layer.top}]`;
	console.log(`${pad}${kind} "${_layer.name}" ${vis} opacity=${_layer.opacity} blend=${_layer.blendMode} ${bounds}`);
	if (_layer.effects) {
		console.log(`${pad}  effects: ${JSON.stringify(_layer.effects, null, 2).split("\n").join("\n" + pad + "  ")}`);
	}
	if (_layer.children) {
		for (const child of _layer.children) DumpLayer(child, _indent + 1);
	}
}

for (const layer of psd.children ?? []) DumpLayer(layer, 0);
