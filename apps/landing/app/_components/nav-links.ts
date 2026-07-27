type NavLink = { href: string; label: string };

const GITHUB_URL = "https://github.com/pedroapfilho/dashfoo";

// In-page anchors. The matching ids live on the <section> elements, which carry
// scroll-mt-20 so headings clear the sticky header.
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
