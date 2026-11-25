import { createRoot } from "react-dom/client";
import "@fontsource/anton/latin-400.css";
import "@fontsource-variable/inter/wght.css";
import App from "./App";
import "./styles/global.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element missing");

createRoot(root).render(<App />);
