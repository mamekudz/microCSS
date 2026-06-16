// Minimal browser player for a µAU sound atlas (WAV blob + JSON timing map).
// Used by the flyex demo until µCSS exposes sounds from CSS directly.

export class SoundAtlasPlayer {
	constructor(_audioContext) {
		this._ctx = _audioContext;
		this._buffer = null;
		this._map = null;
		this._loops = new Map();
	}

	async Load(_audioUrl, _jsonUrl) {
		const [audioRes, jsonRes] = await Promise.all([fetch(_audioUrl), fetch(_jsonUrl)]);
		if (!audioRes.ok || !jsonRes.ok) throw new Error("Failed to load sound atlas");
		this._map = await jsonRes.json();
		const data = await audioRes.arrayBuffer();
		this._buffer = await this._ctx.decodeAudioData(data);
	}

	Play(_name, _options = {}) {
		if (!this._buffer || !this._map?.sounds?.[_name]) return null;
		this.Stop(_name);
		const [startSec, durationSec, loopStartSec, loopEndSec] = this._map.sounds[_name];
		const source = this._ctx.createBufferSource();
		source.buffer = this._buffer;
		source.connect(this._ctx.destination);
		const loop = _options.loop ?? (loopStartSec >= 0 && loopEndSec > loopStartSec);
		if (loop) {
			source.loop = true;
			source.loopStart = loopStartSec;
			source.loopEnd = loopEndSec;
		}
		const offset = startSec;
		const when = this._ctx.currentTime;
		source.start(when, offset, loop ? undefined : durationSec);
		this._loops.set(_name, source);
		source.onended = () => {
			if (this._loops.get(_name) === source) this._loops.delete(_name);
		};
		return source;
	}

	Stop(_name) {
		const source = this._loops.get(_name);
		if (!source) return;
		try { source.stop(); } catch { /* already stopped */ }
		this._loops.delete(_name);
	}

	StopAll() {
		for (const name of [...this._loops.keys()]) this.Stop(name);
	}
}
