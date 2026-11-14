try {
  const theme = localStorage.getItem("taskly-policy-theme");
  if (theme === "light" || theme === "dark") document.documentElement.dataset.theme = theme;
} catch {
  // Private browsing may disable local storage; the OS preference still works.
}
