export default async function handler(req: any, res: any) {
  try {
    const { app, initializeApp } = await import("../dist-server/app.mjs");
    await initializeApp();
    return app(req, res);
  } catch (err: any) {
    const statusCode = 500;
    const message =
      err?.message ||
      (typeof err === "string" ? err : "Server startup failed");

    const payload =
      process.env.NODE_ENV === "production"
        ? { error: "FUNCTION_INVOCATION_FAILED", message }
        : {
            error: "FUNCTION_INVOCATION_FAILED",
            message,
            stack: err?.stack,
          };

    res.statusCode = statusCode;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(payload));
  }
}
