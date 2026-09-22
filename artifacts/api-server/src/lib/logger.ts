import pino from "pino";

// Pretty logging runs through a worker thread, which a serverless function
// can't spawn — so it is for local runs only.
const isServerless = Boolean(process.env.VERCEL);
const usePlainLogs = process.env.NODE_ENV === "production" || isServerless;

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "res.headers['set-cookie']",
  ],
  ...(usePlainLogs
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }),
});
