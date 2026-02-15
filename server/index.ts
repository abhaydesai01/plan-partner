import "dotenv/config";
import mongoose from "mongoose";
import app from "./app.js";
import { startScheduler } from "./scheduler.js";

const DEFAULT_MONGODB_URI = "mongodb://localhost:27017/plan-partner";
const MONGODB_URI = process.env.MONGODB_URI || DEFAULT_MONGODB_URI;
const isProduction = process.env.NODE_ENV === "production";
const portParsed = parseInt(String(process.env.PORT || "3001"), 10);
const PORT = Number.isFinite(portParsed) && portParsed > 0 && portParsed < 65536 ? portParsed : 3001;

async function start() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === "change-me-in-production") {
    console.warn("Set JWT_SECRET in production for auth.");
  }
  if (isProduction && MONGODB_URI === DEFAULT_MONGODB_URI) {
    console.error("Production requires MONGODB_URI to be set (e.g. MongoDB Atlas). Current value is localhost.");
    console.error("On your server, set the env var or add to server/.env: MONGODB_URI=mongodb+srv://...");
    process.exit(1);
  }
  try {
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 100,
      minPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
    });
    if (!isProduction) console.log("MongoDB connected");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("MongoDB connection failed:", msg);
    if (msg.includes("ECONNREFUSED") || msg.includes("querySrv")) {
      console.error("\nTroubleshooting:");
      console.error("  - Using Atlas? Check cluster is running, Network Access allows your IP (or 0.0.0.0/0 for dev), and the connection string in server/.env is correct.");
      console.error("  - For local dev without Atlas, install MongoDB and set in server/.env:");
      console.error("    MONGODB_URI=mongodb://localhost:27017/plan-partner");
    }
    throw err;
  }
  // Bind to 0.0.0.0 so the server is reachable on all interfaces (public port)
  const host = "0.0.0.0";
  const server = app.listen(PORT, host, () => {
    if (!isProduction) console.log(`Server listening on http://${host}:${PORT}`);
    startScheduler();
  });
  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is already in use. Stop the other process or set PORT to a different value (e.g. PORT=3002).`);
    } else {
      console.error(err);
    }
    process.exit(1);
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
