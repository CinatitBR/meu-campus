import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import SendRoute from "./send-route";

// import "./index.css";
import "./global.css";

createRoot(document.getElementById("root")!).render(<SendRoute />);
