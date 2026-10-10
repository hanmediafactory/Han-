export type Theme = "light" | "dark" | "system";

export function getTheme(): Theme {
  const value = localStorage.getItem("han_theme");
  return value === "light" || value === "dark" ? value : "system";
}

export function applyTheme(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.classList.toggle("light", !dark);
}

export function setTheme(theme: Theme) {
  localStorage.setItem("han_theme", theme);
  applyTheme(theme);
}

export function initializeTheme() {
  applyTheme(getTheme());
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => applyTheme(getTheme()));
  window.addEventListener("storage", event => {
    if (event.key === "han_theme") applyTheme(getTheme());
  });
}
