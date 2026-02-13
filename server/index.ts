import "dotenv/config";
import mongoose from "mongoose";
import app from "./app.js";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/plan-partner";
const portParsed = parseInt(String(process.env.PORT || "3001"), 10);
const PORT = Number.isFinite(portParsed) && portParsed > 0 && portParsed < 65536 ? portParsed : 3001;

async function start() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === "change-me-in-production") {
    console.warn("Set JWT_SECRET in production for auth.");
  }
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("MongoDB connected");
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
  const server = app.listen(PORT, host, () => console.log(`Server listening on http://${host}:${PORT}`));
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
