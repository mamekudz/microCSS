// Initializes ag-psd for Node without a native canvas dependency.
// We only need plain ImageData-like objects; pixel work is done with sharp.
import { initializeCanvas } from "ag-psd";

let initialized = false;

function _CreateImageData(_width, _height) {
	return {
		width: _width,
		height: _height,
		data: new Uint8ClampedArray(_width * _height * 4)
	};
}

function _CreateCanvas() {
	throw new Error("microPS: canvas operations are not supported, read PSD files with { useImageData: true }.");
}

export function EnsureAgPsdInitialized() {
	if (initialized) return;
	initializeCanvas(_CreateCanvas, _CreateImageData);
	initialized = true;
}
