import { SoundAtlasPlayer } from "../shared/sound-atlas-player.mjs";

const SOUND_BASE = new URL("./dist/snds/", import.meta.url);
const KEY_CTRL_F6 = 512 + 117;
const INVASION_BATCH = 19;

const GO_X = [0, 1, 2, 1, 0, -1, -2, -1];
const GO_Y = [-2, -1, 0, 1, 2, 1, 0, -1];
const GO_NOS = [5, 6, 7, 5, 8, 9];
const FLY_NOS = [1, 1, 2, 2, 2, 3, 3, 3, 2, 2, 2];

function _MinMaxRandom(_min, _max) {
	return Math.floor(Math.random() * (_max - _min + 1)) + _min;
}

function _GetKeyMapping(_ev) {
	let key = _ev.keyCode;
	if (_ev.ctrlKey) key += 512;
	if (_ev.altKey) key += 1024;
	if (_ev.shiftKey) key += 2048;
	if (_ev.metaKey) key += 4096;
	return key;
}

function _SetDirByAcc(_fly) {
	if (_fly.accY < 0) {
		if (Math.abs(_fly.accY) > Math.abs(_fly.accX * 2)) {
			_fly.dir = 0;
		} else if (_fly.accX < 0) {
			_fly.dir = Math.abs(_fly.accX) > Math.abs(_fly.accY * 2) ? 6 : 7;
		} else if (_fly.accX > 0) {
			_fly.dir = Math.abs(_fly.accX) > Math.abs(_fly.accY * 2) ? 2 : 1;
		}
	} else {
		if (Math.abs(_fly.accY) > Math.abs(_fly.accX * 2)) {
			_fly.dir = 4;
		} else if (_fly.accX < 0) {
			_fly.dir = Math.abs(_fly.accX) > Math.abs(_fly.accY * 2) ? 6 : 5;
		} else if (_fly.accX > 0) {
			_fly.dir = Math.abs(_fly.accX) > Math.abs(_fly.accY * 2) ? 2 : 3;
		}
	}
}

function _SetDirBySpeed(_fly) {
	if (_fly.velocityY < 0) {
		if (Math.abs(_fly.velocityY) > Math.abs(_fly.velocityX * 2)) {
			_fly.dir = 0;
		} else if (_fly.velocityX < 0) {
			_fly.dir = Math.abs(_fly.velocityX) > Math.abs(_fly.velocityY * 2) ? 6 : 7;
		} else if (_fly.velocityX > 0) {
			_fly.dir = Math.abs(_fly.velocityX) > Math.abs(_fly.velocityY * 2) ? 2 : 1;
		}
	} else {
		if (Math.abs(_fly.velocityY) > Math.abs(_fly.velocityX * 2)) {
			_fly.dir = 4;
		} else if (_fly.velocityX < 0) {
			_fly.dir = Math.abs(_fly.velocityX) > Math.abs(_fly.velocityY * 2) ? 6 : 5;
		} else if (_fly.velocityX > 0) {
			_fly.dir = Math.abs(_fly.velocityX) > Math.abs(_fly.velocityY * 2) ? 2 : 3;
		}
	}
}

class Fly {
	constructor(_id, _engine) {
		this.id = _id;
		this._engine = _engine;
		this.active = false;
		this.status = "none";
		this.x = 0;
		this.y = 0;
		this.dir = 0;
		this.no = 0;
		this.go = 0;
		this.fly = 0;
		this.counter = 0;
		this.wayCounter = 0;
		this.cyclusCounter = 0;
		this.tailX = 0;
		this.tailY = 0;
		this.accX = 0;
		this.accY = 0;
		this.velocityX = 0;
		this.velocityY = 0;
		this.soundKey = `fly-${_id}`;
		this.div = document.createElement("div");
		this.div.className = "fly";
		this.div.style.display = "none";
		_engine._root.appendChild(this.div);
	}

	IntoLife(_x, _y) {
		this.active = true;
		this.x = _x;
		this.y = _y;
		this.dir = 0;
		this.div.style.display = "block";
		this._Pos(this.x, this.y);
		this._SetStatus("fly");
		this._engine._StartLoop();
	}

	_SetStatus(_status) {
		const prev = this.status;
		if (prev === "fly" && _status !== "fly") {
			this._engine._sounds?.Stop(this.soundKey);
		}

		switch (_status) {
			case "suck":
				this.counter = _MinMaxRandom(10, 40);
				break;
			case "go":
				this.counter = 0;
				this.cyclusCounter = _MinMaxRandom(1, 4);
				break;
			case "land":
				this.counter = 0;
				this.wayCounter = 0;
				this.cyclusCounter = 2;
				break;
			case "fly":
				this.counter = 0;
				this.wayCounter = 0;
				this.cyclusCounter = 2 * 60 * 10;
				this.tailX = _MinMaxRandom(0, this._engine._maxW());
				this.tailY = _MinMaxRandom(0, this._engine._maxH());
				if (prev !== "fly") {
					this._engine._sounds?.Play(this.soundKey, {
						sample: `fly${_MinMaxRandom(1, 2)}`,
						loop: true
					});
				}
				break;
			case "dead":
				this.div.className = "fly dead";
				this.accY = 0.1;
				this.velocityY = 0;
				this.counter = 60;
				break;
			default:
				break;
		}
		this.status = _status;
	}

	IntoDeath(_swatX, _swatY) {
		if (!this.active || this.status === "dead") return;
		this.active = false;
		this._engine._sounds?.Stop(this.soundKey);
		this._engine._sounds?.Play(`swatter-${this.id}`, { sample: "swatter" });
		this._engine._sounds?.Play(`crush-${this.id}`, { sample: "crush" });
		this._SetStatus("dead");

		const rect = this._engine._root.getBoundingClientRect();
		const swatter = document.createElement("div");
		swatter.className = "flySwatter clap";
		swatter.style.left = `${_swatX - rect.left - 21}px`;
		swatter.style.top = `${_swatY - rect.top - 21}px`;
		this._engine._root.appendChild(swatter);
		window.setTimeout(() => swatter.remove(), 520);
		window.setTimeout(() => this._Remove(), 1400);
	}

	_Remove() {
		this.active = false;
		this.status = "none";
		this._engine._sounds?.Stop(this.soundKey);
		this.div.style.display = "none";
		this.div.className = "fly";
		this._engine._active.delete(this.id);
		this._engine._free.push(this);
	}

	Animate() {
		if (!this.active) return;

		const maxW = this._engine._maxW();
		const maxH = this._engine._maxH();
		let x;
		let y;
		let dist;

		switch (this.status) {
			case "suck":
				this.counter--;
				if (this.counter < 0) {
					this.no = 4;
					this._SetStatus("go");
				}
				this._SyncClass();
				break;

			case "go":
				this.counter--;
				if (this.counter < 0) {
					x = this.x - this._engine._mouseX;
					y = this.y - this._engine._mouseY;
					dist = Math.sqrt(x * x + y * y);
					if (this._engine._swatterSpeed > 0.15 && dist < 250) {
						this._SetStatus("fly");
					}
					this.counter = 8;
					this.go++;
					this.no = GO_NOS[this.go % 6];
					this.wayCounter--;
					if (this.wayCounter < 0) {
						this.dir = (this.dir + _MinMaxRandom(-1, 1)) & 7;
						this.wayCounter = _MinMaxRandom(5, 40);
						this.cyclusCounter--;
						if (this.no === 5) this._SetStatus("suck");
						if (this.cyclusCounter < 0) this._SetStatus("fly");
					}
					this._Move(GO_X[this.dir], GO_Y[this.dir]);
					this._SyncClass();
				}
				break;

			case "land":
				x = this.x - this.tailX;
				y = this.y - this.tailY;
				this.accX = -x * 0.0001;
				this.accY = -y * 0.0001;
				this.velocityX += this.accX;
				this.velocityY += this.accY;
				this.x += this.velocityX;
				this.y += this.velocityY;
				this.velocityX *= 0.97;
				this.velocityY *= 0.97;
				this.fly++;
				_SetDirBySpeed(this);
				this.no = FLY_NOS[this.fly % FLY_NOS.length];
				this._Pos(this.x, this.y);
				this._SyncClass();
				this.counter++;
				if (this.counter > 300) this._SetStatus("go");
				break;

			case "fly": {
				x = this.x - this.tailX;
				y = this.y - this.tailY;
				dist = Math.sqrt(x * x + y * y);
				this.accX = -x * 0.0001;
				this.accY = -y * 0.0001;
				this.velocityX += this.accX;
				this.velocityY += this.accY;
				this.x += this.velocityX;
				this.y += this.velocityY;
				this.velocityX *= 0.99;
				this.velocityY *= 0.99;
				this.fly++;
				_SetDirByAcc(this);
				if (dist < 120) {
					if (_MinMaxRandom(0, 50) > 10) {
						this._SetStatus("land");
					} else {
						this.tailX = _MinMaxRandom(0, maxW);
						this.tailY = _MinMaxRandom(0, maxH);
					}
				}
				this.no = FLY_NOS[this.fly % FLY_NOS.length];
				this._Pos(this.x, this.y);
				this._SyncClass();
				break;
			}

			case "dead":
				this.counter--;
				if (this.counter < 0) {
					this.velocityY += this.accY;
					this._Move(0, this.velocityY);
					if (this.y > maxH) this._Remove();
				}
				break;

			default:
				break;
		}
	}

	_Move(_dx, _dy) {
		this.x += _dx;
		this.y += _dy;
		this._Pos(this.x, this.y);
	}

	_Pos(_x, _y) {
		this.x = _x;
		this.y = _y;
		this.div.style.left = `${this.x}px`;
		this.div.style.top = `${this.y}px`;
	}

	_SyncClass() {
		this.div.className = `fly n${this.no} d${this.dir}`;
	}

	_HitTest(_x, _y) {
		if (!this.active || this.status === "dead") return false;
		const rect = this.div.getBoundingClientRect();
		const pad = 14;
		return _x >= rect.left - pad && _x <= rect.right + pad
			&& _y >= rect.top - pad && _y <= rect.bottom + pad;
	}
}

class FlyExDemo {
	constructor(_root, _sounds) {
		this._root = _root;
		this._sounds = _sounds;
		this._free = [];
		this._active = new Map();
		this._running = false;
		this._raf = 0;
		this._lastTs = 0;
		this._mouseX = 0;
		this._mouseY = 0;
		this._mouseMoveX = 0;
		this._mouseMoveY = 0;
		this._swatterSpeed = 0;
		this.isActive = false;

		for (let i = 0; i < 200; i++) {
			this._free.push(new Fly(i, this));
		}
	}

	_maxW() {
		return Math.max(1, this._root.clientWidth);
	}

	_maxH() {
		return Math.max(1, this._root.clientHeight);
	}

	Activate() {
		if (this.isActive) return;
		this.isActive = true;
		this._StartLoop();
	}

	StartNewFly() {
		if (!this.isActive || this._free.length === 0) return;
		const w = this._maxW();
		const h = this._maxH();
		const d = _MinMaxRandom(100, 300);
		const e = _MinMaxRandom(100, 300);
		let x = _MinMaxRandom(0, w);
		let y = _MinMaxRandom(0, h);

		switch (_MinMaxRandom(0, 7)) {
			case 0: y = -d; break;
			case 1: y = -d; x = e; break;
			case 2: x = w + d; break;
			case 3: y = d; x = e; break;
			case 4: y = h + d; break;
			case 5: y = d; x = -e; break;
			case 6: x = -d; break;
			default: break;
		}

		const fly = this._free.pop();
		fly.IntoLife(x, y);
		this._active.set(fly.id, fly);
	}

	StartInvasion() {
		for (let i = 0; i < INVASION_BATCH; i++) {
			this.StartNewFly();
		}
	}

	_StartLoop() {
		if (this._running) return;
		this._running = true;
		this._lastTs = 0;
		const tick = (_ts) => {
			if (!this._running) return;
			this._raf = requestAnimationFrame(tick);
			const diff = _ts - this._lastTs;
			if (diff <= 0) return;
			this._lastTs = _ts;
			this._swatterSpeed = Math.sqrt(this._mouseMoveX * this._mouseMoveX
				+ this._mouseMoveY * this._mouseMoveY) / diff;
			for (const fly of this._active.values()) fly.Animate();
			this._mouseMoveX = 0;
			this._mouseMoveY = 0;
		};
		this._raf = requestAnimationFrame(tick);
	}

	TrackMouse(_clientX, _clientY) {
		const rect = this._root.getBoundingClientRect();
		const x = _clientX - rect.left;
		const y = _clientY - rect.top;
		this._mouseMoveX += x - this._mouseX;
		this._mouseMoveY += y - this._mouseY;
		this._mouseX = x;
		this._mouseY = y;
	}

	swat(_x, _y) {
		for (const fly of this._active.values()) {
			if (!fly._HitTest(_x, _y)) continue;
			fly.IntoDeath(_x, _y);
			return true;
		}
		return false;
	}
}

async function _Boot() {
	const root = document.getElementById("fx-root");
	const audio = new AudioContext();
	const sounds = new SoundAtlasPlayer(audio);
	await sounds.Load(
		new URL("fly.sounds.wav", SOUND_BASE).href,
		new URL("fly.sounds.json", SOUND_BASE).href
	);

	const demo = new FlyExDemo(root, sounds);
	let started = false;

	async function _UnlockAudio() {
		if (audio.state === "suspended") await audio.resume();
	}

	async function _EnsureStarted() {
		await _UnlockAudio();
		root.classList.remove("is-idle");
		if (!started) {
			started = true;
			demo.Activate();
			demo.StartInvasion();
		}
	}

	root.addEventListener("pointerdown", async (_event) => {
		await _EnsureStarted();
		demo.swat(_event.clientX, _event.clientY);
		_event.preventDefault();
	});

	root.addEventListener("pointermove", (_event) => {
		demo.TrackMouse(_event.clientX, _event.clientY);
	});

	root.addEventListener("pointerenter", _UnlockAudio);

	document.addEventListener("keydown", async (_event) => {
		if (_GetKeyMapping(_event) !== KEY_CTRL_F6) return;
		await _EnsureStarted();
		demo.StartInvasion();
		_event.preventDefault();
	});
}

_Boot().catch((_error) => {
	console.error(_error);
	document.body.insertAdjacentHTML("beforeend",
		`<p style="color:#f88;padding:1rem">Demo failed to load sounds. Run <code>npx gulp demos:build</code> first.</p>`);
});
