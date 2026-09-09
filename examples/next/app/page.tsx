import type { Metadata } from "next";

const metadata: Metadata = {
  description: "A docking workspace with tabs, floating panels and saved layouts.",
  title: "Dashfoo starter",
};

export { metadata };
export { Dashboard as default } from "./dashboard";
