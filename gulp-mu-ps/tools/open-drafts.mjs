// Opens draft PSDs in the default app, Affinity, or Photopea (browser).
// Usage:
//   node tools/open-drafts.mjs [--app default|affinity|photopea|<exe>] [--wait] [--no-save-back] <file.psd> …
//
// Photopea (--app photopea): local CORS server + browser tab. Default: save-back enabled
// (File → Save in Photopea POSTs the PSD to localhost). Use --wait to keep the server
// running until Ctrl+C (pair with watch-drafts.mjs in another terminal).
import { OpenDrafts } from "../src/io/OpenDrafts.mjs";
import { OpenPhotopeaDrafts, GetActivePhotopeaDraftServer } from "../src/io/OpenPhotopeaDrafts.mjs";

const args = process.argv.slice(2);
let app = process.env.MU_DRAFT_APP ?? "default";
let wait = false;
let saveBack = true;
const paths = [];

for (let i = 0; i < args.length; i++) {
	if (args[i] === "--app" && args[i + 1]) {
		app = args[++i];
		continue;
	}
	if (args[i] === "--wait") {
		wait = true;
		continue;
	}
	if (args[i] === "--no-save-back") {
		saveBack = false;
		continue;
	}
	if (args[i].startsWith("--")) {
		console.error(`Unknown option: ${args[i]}`);
		process.exit(1);
	}
	paths.push(args[i]);
}

if (!paths.length) {
	console.error(
		"Usage: node tools/open-drafts.mjs [--app default|affinity|photopea|<exe>] "
		+ "[--wait] [--no-save-back] <file> …"
	);
	process.exit(1);
}

try {
	if (app === "photopea") {
		const result = await OpenPhotopeaDrafts(paths, { saveBack });
		for (const path of result.paths) console.log("Draft:", path);
		console.log("Photopea URL:", result.url);
		if (saveBack) {
			console.log("Save-back:", result.server.saveUrl);
			wait = true;
		}
		if (wait) {
			console.log("\nPhotopea draft server running — save in Photopea updates the file on disk (Ctrl+C to stop)…");
			process.on("SIGINT", async () => {
				await GetActivePhotopeaDraftServer()?.close();
				process.exit(0);
			});
		} else {
			await new Promise((_r) => setTimeout(_r, 3000));
			await result.close();
		}
	} else {
		const opened = OpenDrafts(paths, { app });
		for (const path of opened) console.log("Opened:", path);
	}
} catch (err) {
	console.error(err.message ?? err);
	process.exit(1);
}
