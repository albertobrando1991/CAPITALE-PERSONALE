import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { pdfjs } from 'react-pdf';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configura worker PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;


createRoot(document.getElementById("root")!).render(<App />);
