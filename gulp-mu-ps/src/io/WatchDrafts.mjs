// Watches PSD (or other) draft paths and debounces change notifications.

import { statSync, watch } from "node:fs";
import { extname, join, resolve } from "node:path";

/**
 * @typedef {{ path: string, at: Date }} DraftChangeEvent
 */

function _MatchesExtension(_filename, _extension) {
	if (!_extension) return true;
	return extname(_filename).toLowerCase() === _extension.toLowerCase();
}

function _WatchTarget(_target, _extension, _schedule) {
	const absTarget = resolve(_target);
	const stat = statSync(absTarget);

	if (stat.isFile()) {
		const watcher = watch(absTarget, () => _schedule(absTarget));
		return watcher;
	}

	if (stat.isDirectory()) {
		const watcher = watch(absTarget, (_event, _filename) => {
			if (!_filename || !_MatchesExtension(_filename, _extension)) return;
			_schedule(join(absTarget, _filename));
		});
		return watcher;
	}

	throw new Error(`WatchDrafts: not a file or directory: ${absTarget}`);
}

/**
 * Watches files or directories for draft changes (default: `.psd` inside directories).
 * Affinity (and other editors) may write in two passes — use debounce before running µPS.
 *
 * @param {string | string[]} _paths Files or directories to watch.
 * @param {(event: DraftChangeEvent) => void | Promise<void>} _onChange Called after debounce.
 * @param {{ debounceMs?: number, extension?: string }} [_options]
 * @returns {{ close: () => void }}
 */
export function WatchDrafts(_paths, _onChange, _options = {}) {
	const debounceMs = _options.debounceMs ?? 1500;
	const extension = _options.extension ?? ".psd";
	const paths = (Array.isArray(_paths) ? _paths : [_paths]).map((p) => resolve(p));
	const timers = new Map();
	const watchers = [];

	const schedule = (_filePath) => {
		const key = resolve(_filePath);
		clearTimeout(timers.get(key));
		timers.set(key, setTimeout(() => {
			timers.delete(key);
			void _onChange({ path: key, at: new Date() });
		}, debounceMs));
	};

	for (const target of paths) {
		watchers.push(_WatchTarget(target, extension, schedule));
	}

	return {
		close() {
			for (const watcher of watchers) watcher.close();
			for (const timer of timers.values()) clearTimeout(timer);
			timers.clear();
		}
	};
}
