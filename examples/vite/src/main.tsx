import "@dashfoo/theme/dashfoo.css";
import "./style.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { Dashboard } from "./dashboard";

const root = document.querySelector("#root");
if (!root) {
  throw new Error("Missing #root");
}
createRoot(root).render(
  <StrictMode>
    <Dashboard />
  </StrictMode>,
);
