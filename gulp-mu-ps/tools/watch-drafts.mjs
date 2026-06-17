// Watches draft paths and runs a command (or logs changes) after debounce.
// Usage:
//   node tools/watch-drafts.mjs [--debounce ms] <path> … [--] <command…>
// Example:
//   node tools/watch-drafts.mjs dev/media/final -- npx gulp SkinStd
import { spawn } from "node:child_process";
import { WatchDrafts } from "../src/io/WatchDrafts.mjs";

const args = process.argv.slice(2);
let debounceMs = 1500;
const paths = [];
let command = null;

for (let i = 0; i < args.length; i++) {
	if (args[i] === "--debounce" && args[i + 1]) {
		debounceMs = Number(args[++i]);
		continue;
	}
	if (args[i] === "--") {
		command = args.slice(i + 1);
		break;
	}
	if (args[i].startsWith("--")) {
		console.error(`Unknown option: ${args[i]}`);
		process.exit(1);
	}
	paths.push(args[i]);
}

if (!paths.length) {
	console.error("Usage: node tools/watch-drafts.mjs [--debounce ms] <path> … [--] <command…>");
	process.exit(1);
}

let running = false;

const handle = WatchDrafts(
	paths,
	async (event) => {
		console.log(`[watch-drafts] changed: ${event.path}`);
		if (!command?.length) return;
		if (running) {
			console.log("[watch-drafts] build still running, skipping");
			return;
		}
		running = true;
		await new Promise((resolvePromise, rejectPromise) => {
			const child = spawn(command[0], command.slice(1), {
				stdio: "inherit",
				shell: platformShell()
			});
			child.on("error", rejectPromise);
			child.on("close", (code) => {
				running = false;
				if (code === 0) resolvePromise();
				else rejectPromise(new Error(`Command exited with code ${code}`));
			});
		}).catch((err) => {
			console.error(`[watch-drafts] ${err.message ?? err}`);
		});
	},
	{ debounceMs }
);

console.log(`[watch-drafts] watching ${paths.join(", ")} (debounce ${debounceMs} ms)`);
if (command?.length) console.log(`[watch-drafts] command: ${command.join(" ")}`);

process.on("SIGINT", () => {
	handle.close();
	process.exit(0);
});

function platformShell() {
	return process.platform === "win32";
}
