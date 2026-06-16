document.addEventListener("click", (_event) => {
	const sparkle = document.createElement("div");
	sparkle.className = "glittery";
	sparkle.style.left = `${_event.clientX}px`;
	sparkle.style.top = `${_event.clientY}px`;
	document.body.appendChild(sparkle);
	sparkle.addEventListener("animationend", () => sparkle.remove(), { once: true });
});
