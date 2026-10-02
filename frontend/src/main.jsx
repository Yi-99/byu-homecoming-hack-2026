import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { finishNotionLogin } from "./lib.js";

const root = document.getElementById("root");
const notionMessage = finishNotionLogin();

if (notionMessage) {
  root.className = "p-8 font-semibold";
  root.textContent = notionMessage;
} else {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
