// Bootstrap loader for µPS Photoshop scripts (ExtendScript).
// Uses eval(read) — $.evalFile runs in an isolated scope in Photoshop,
// so helper functions would not be visible to build-mups-reference.jsx.

function MuPsEvalJsx(_file) {
	if (!_file.exists) {
		throw new Error("Missing helper file:\n" + _file.fsName);
	}
	_file.encoding = "UTF8";
	if (!_file.open("r")) {
		throw new Error("Cannot open:\n" + _file.fsName);
	}
	var source = _file.read();
	_file.close();
	eval(source);
}

function MuPsBootLoad(_options) {
	var folder = _options.folder;
	var needEffects = !!_options.needEffects;

	MuPsEvalJsx(new File(folder.fsName + "/MuPsReferenceLib.jsx"));
	if (typeof MuPsSetAnchorFolder !== "function" || typeof MuPsFindSampleButtonsPsd !== "function") {
		throw new Error("MuPsReferenceLib.jsx did not load.\n\nScript folder:\n" + folder.fsName);
	}
	MuPsSetAnchorFolder(folder);

	if (needEffects) {
		MuPsEvalJsx(new File(folder.fsName + "/MuPsLayerEffects.jsx"));
		if (typeof MuPsApplyEffectProfile !== "function") {
			throw new Error("MuPsLayerEffects.jsx did not load.");
		}
	}
	return folder;
}

function MuPsBootAlert(_err, _title) {
	var msg = (_err && _err.message) ? _err.message : String(_err);
	if (_err && _err.line) msg += "\n(line " + _err.line + ")";
	alert((_title || "MuPS script error") + ":\n\n" + msg);
}
