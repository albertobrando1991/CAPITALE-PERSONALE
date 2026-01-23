// Setup fetch interceptor first (before any other imports that might use fetch)
import "./lib/setupFetch";

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { pdfjs } from 'react-pdf';

// Configura worker PDF.js - usa la versione bundled da react-pdf per evitare mismatch
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();


createRoot(document.getElementById("root")!).render(<App />);
