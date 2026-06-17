const canvas = document.getElementById("btn-root");
const themeLabel = document.getElementById("theme-label");

for (const control of document.querySelectorAll("[data-theme]")) {
	control.addEventListener("click", () => {
		const theme = control.dataset.theme;
		canvas.classList.remove("theme-aqua", "theme-alu");
		canvas.classList.add(`theme-${theme}`);
		for (const btn of document.querySelectorAll("[data-theme]")) {
			btn.setAttribute("aria-pressed", btn === control ? "true" : "false");
		}
		if (themeLabel) themeLabel.textContent = theme;
	});
}
