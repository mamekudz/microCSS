// Minimal browser player for a µAU sound atlas (WAV blob + JSON timing map).

export class SoundAtlasPlayer {
	constructor(_audioContext) {
		this._ctx = _audioContext;
		this._buffer = null;
		this._map = null;
		this._gain = _audioContext.createGain();
		this._gain.gain.value = 0.85;
		this._gain.connect(_audioContext.destination);
		this._loops = new Map();
		this._oneShots = new Set();
	}

	async Load(_audioUrl, _jsonUrl) {
		const [audioRes, jsonRes] = await Promise.all([fetch(_audioUrl), fetch(_jsonUrl)]);
		if (!audioRes.ok || !jsonRes.ok) {
			throw new Error(`Failed to load sound atlas (${audioRes.status}/${jsonRes.status})`);
		}
		this._map = await jsonRes.json();
		const data = await audioRes.arrayBuffer();
		this._buffer = await this._ctx.decodeAudioData(data);
	}

	Play(_key, _options = {}) {
		const sampleName = _options.sample ?? _key;
		if (!this._buffer || !this._map?.sounds?.[sampleName]) return null;
		const [startSec, durationSec, loopStartSec, loopEndSec] = this._map.sounds[sampleName];
		const loop = _options.loop ?? (loopStartSec >= 0 && loopEndSec > loopStartSec);
		if (loop) this.Stop(_key);

		const source = this._ctx.createBufferSource();
		source.buffer = this._buffer;
		source.connect(this._gain);
		if (loop) {
			source.loop = true;
			source.loopStart = loopStartSec;
			source.loopEnd = loopEndSec;
		}
		const when = this._ctx.currentTime;
		source.start(when, startSec, loop ? undefined : durationSec);

		if (loop) {
			this._loops.set(_key, source);
			source.onended = () => {
				if (this._loops.get(_key) === source) this._loops.delete(_key);
			};
		} else {
			this._oneShots.add(source);
			source.onended = () => this._oneShots.delete(source);
		}
		return source;
	}

	Stop(_key) {
		const source = this._loops.get(_key);
		if (!source) return;
		try { source.stop(); } catch { /* already stopped */ }
		this._loops.delete(_key);
	}

	StopAll() {
		for (const name of [...this._loops.keys()]) this.Stop(name);
		for (const source of [...this._oneShots]) {
			try { source.stop(); } catch { /* already stopped */ }
			this._oneShots.delete(source);
		}
	}
}
