// Backup policy shared by the Gulp task and its integration tests.
import { realpathSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";

export function GetNasBackupExcludedDirs(_rootDir) {
	// Bare names apply at every depth. Never exclude "build" or "out" by
	// name: src/build contains source code and old extracts can contain out/.
	return [
		"node_modules",
		".cache",
		...[
			".microgulp",
			"build",
			"dev/out",
			"gulp-mu-ps/test/out",
			"gulp-mu-ps/examples-out",
		].map((_path) => resolve(_rootDir, _path)),
	];
}

export function AssertSeparateBackupPaths(_source, _destination) {
	// Resolve junctions as well as spelling differences before allowing /MIR.
	const source = realpathSync(_source);
	const destination = realpathSync(_destination);
	const contains = (_parent, _child) => {
		const path = relative(_parent, _child);
		return path === "" || (!isAbsolute(path) && path !== ".." && !path.startsWith(`..${sep}`));
	};
	if (contains(source, destination) || contains(destination, source)) {
		throw new Error("BACKUP_TO_NAS: source and destination must be separate folders, not nested inside each other.");
	}
}
