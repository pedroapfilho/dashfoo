type NavLink = { href: string; label: string };

const GITHUB_URL = "https://github.com/pedroapfilho/dashfoo";

const SECTION_LINKS: Array<NavLink> = [
  { href: "#features", label: "Features" },
  { href: "#quickstart", label: "Quickstart" },
  { href: "#fit", label: "Fit" },
];

const EXTERNAL_LINKS: Array<NavLink> = [
  { href: "https://docs.dashfoo.com", label: "Docs" },
  { href: "https://demo.dashfoo.com", label: "Demo" },
];

export { EXTERNAL_LINKS, GITHUB_URL, SECTION_LINKS };
export type { NavLink };
