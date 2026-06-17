/**
 * Click-to-zoom for `.demo-sources img[data-zoom]` thumbnails in demo sidebars.
 */
export function InitDemoLightbox(_root = document) {
	const triggers = _root.querySelectorAll(".demo-sources img[data-zoom]");
	if (triggers.length === 0) return;

	const overlay = document.createElement("div");
	overlay.className = "demo-lightbox";
	overlay.hidden = true;
	overlay.innerHTML = `
		<button type="button" class="demo-lightbox__close" aria-label="Close">×</button>
		<figure class="demo-lightbox__figure">
			<img class="demo-lightbox__img" alt="">
			<figcaption class="demo-lightbox__caption"></figcaption>
		</figure>
	`;
	document.body.appendChild(overlay);

	const imgEl = overlay.querySelector(".demo-lightbox__img");
	const captionEl = overlay.querySelector(".demo-lightbox__caption");
	const closeBtn = overlay.querySelector(".demo-lightbox__close");

	function _ApplyZoomSize() {
		if (!imgEl.naturalWidth) return;
		const scale = Math.min(
			8,
			Math.max(2, Math.floor((window.innerWidth * 0.9) / imgEl.naturalWidth))
		);
		const targetW = imgEl.naturalWidth * scale;
		imgEl.style.width = `${Math.min(targetW, window.innerWidth * 0.95)}px`;
		imgEl.style.height = "auto";
	}

	function Close() {
		overlay.hidden = true;
		document.body.classList.remove("demo-lightbox-open");
		imgEl.removeAttribute("src");
	}

	function Open(_source) {
		const figcaption = _source.closest("figure")?.querySelector("figcaption");
		imgEl.alt = _source.alt;
		captionEl.textContent = figcaption?.textContent?.trim() ?? "";
		captionEl.hidden = !captionEl.textContent;

		const _onReady = () => {
			_ApplyZoomSize();
			imgEl.removeEventListener("load", _onReady);
		};
		imgEl.addEventListener("load", _onReady);
		imgEl.src = _source.currentSrc || _source.src;
		if (imgEl.complete) _onReady();

		overlay.hidden = false;
		document.body.classList.add("demo-lightbox-open");
		closeBtn.focus();
	}

	for (const trigger of triggers) {
		trigger.title = "Click to enlarge";
		trigger.addEventListener("click", () => Open(trigger));
	}

	closeBtn.addEventListener("click", Close);
	overlay.addEventListener("click", (_event) => {
		if (_event.target === overlay) Close();
	});
	document.addEventListener("keydown", (_event) => {
		if (_event.key === "Escape" && !overlay.hidden) Close();
	});
}
