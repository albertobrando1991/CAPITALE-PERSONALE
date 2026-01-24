// Disable SSL certificate verification for development/proxy environments
// This is needed because some environments (corporate VPNs, proxies) use self-signed certificates
if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

import { app, httpServer, initializeApp, log } from "./app";
import { runMigrations } from "./migrate";

(async () => {
  await runMigrations();
  await initializeApp();

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  const port = parseInt(process.env.PORT || "5000", 10);
  
  // Force restart log
  log("Server restarting...");
  
  httpServer.listen(
    {
      port,
      host: process.env.HOST || "0.0.0.0",
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
