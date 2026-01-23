// Setup fetch interceptor first (before any other imports that might use fetch)
import "./lib/setupFetch";

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { pdfjs } from 'react-pdf';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configura worker PDF.js - versione 5.4.296 allineata con react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;


createRoot(document.getElementById("root")!).render(<App />);
