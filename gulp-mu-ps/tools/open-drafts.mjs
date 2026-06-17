// Opens draft PSDs (or other files) in the default app or Affinity.
// Usage:
//   node tools/open-drafts.mjs [--app default|affinity|<exe>] <file.psd> …
import { OpenDrafts } from "../src/io/OpenDrafts.mjs";

const args = process.argv.slice(2);
let app = process.env.MU_DRAFT_APP ?? "default";
const paths = [];

for (let i = 0; i < args.length; i++) {
	if (args[i] === "--app" && args[i + 1]) {
		app = args[++i];
		continue;
	}
	if (args[i].startsWith("--")) {
		console.error(`Unknown option: ${args[i]}`);
		process.exit(1);
	}
	paths.push(args[i]);
}

if (!paths.length) {
	console.error("Usage: node tools/open-drafts.mjs [--app default|affinity|<exe>] <file> …");
	process.exit(1);
}

try {
	const opened = OpenDrafts(paths, { app });
	for (const path of opened) console.log("Opened:", path);
} catch (err) {
	console.error(err.message ?? err);
	process.exit(1);
}
