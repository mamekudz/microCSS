// Quick sanity check — run in Photoshop before build-mups-reference.jsx.
// File > Scripts > Browse... > test-mups-script.jsx

#target photoshop

var MuPsScriptDir = new File($.fileName).parent;

var __muPsLibFile = new File(MuPsScriptDir.fsName + "/MuPsReferenceLib.jsx");
__muPsLibFile.encoding = "UTF8";
__muPsLibFile.open("r");
eval(__muPsLibFile.read());
__muPsLibFile.close();

var __muPsFxFile = new File(MuPsScriptDir.fsName + "/MuPsLayerEffects.jsx");
__muPsFxFile.encoding = "UTF8";
__muPsFxFile.open("r");
eval(__muPsFxFile.read());
__muPsFxFile.close();

try {
	MuPsSetAnchorFolder(MuPsScriptDir);
	if (typeof MuPsFindSampleButtonsPsd !== "function") {
		throw new Error("MuPsReferenceLib.jsx did not load.");
	}

	var buttons = MuPsFindSampleButtonsPsd();
	var drafts = MuPsDraftsFolder();
	var outPsd = new File(drafts.fsName + "/mups-reference.psd");
	alert([
		"MuPS script check OK",
		"",
		"Script folder:",
		MuPsScriptDir.fsName,
		"",
		"Drafts folder:",
		drafts.fsName,
		"",
		"buttons.psd:",
		buttons ? buttons.fsName : "(not found)",
		"",
		"mups-reference.psd:",
		outPsd.exists ? outPsd.fsName + " (exists)" : "(not built yet)"
	].join("\n"));
} catch (err) {
	var msg = (err && err.message) ? err.message : String(err);
	if (err && err.line) msg += "\n(line " + err.line + ")";
	alert("test-mups-script failed:\n\n" + msg);
}
