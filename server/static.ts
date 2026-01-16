import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  // Use standard dist folder (relative to compiled server/index.cjs in dist-server, so ../dist)
  // Or relative to src if running tsx
  const distPath = path.resolve(__dirname, "../dist");
  
  // Check if we are running in dev/local-prod or other structure
  if (!fs.existsSync(distPath)) {
      // Try old path just in case
      const oldPath = path.resolve(__dirname, "public");
       if (fs.existsSync(oldPath)) {
           // use old path
       } else {
           // Log warning but don't crash, helpful for mixed environments
           console.warn(`Could not find the build directory: ${distPath}, make sure to build the client first`);
           return;
       }
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
