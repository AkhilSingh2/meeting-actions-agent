"use client";

export function ThemeToggle() {
  function apply() {
    const dark = document.documentElement.dataset.theme === "dark";
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
    localStorage.setItem("quorum.theme", next);
  }

  return (
    <button type="button" className="q-icon-btn" aria-label="Toggle color theme" onClick={apply}>
      <Sun />
      <Moon />
    </button>
  );
}

function Moon() {
  return (
    <svg className="q-icon-moon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M16 3.5A8.5 8.5 0 1 0 20.5 14 7 7 0 0 1 16 3.5Z" />
    </svg>
  );
}

function Sun() {
  return (
    <svg className="q-icon-sun" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5 5l1.6 1.6M17.4 17.4 19 19M19 5l-1.6 1.6M6.6 17.4 5 19" />
    </svg>
  );
}
