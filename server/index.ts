import "dotenv/config";
import mongoose from "mongoose";
import app from "./app.js";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/plan-partner";
const portParsed = parseInt(String(process.env.PORT || "3001"), 10);
const PORT = Number.isFinite(portParsed) && portParsed > 0 && portParsed < 65536 ? portParsed : 3001;

async function start() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.warn("SUPABASE_URL and SUPABASE_ANON_KEY should be set for auth.");
  }
  await mongoose.connect(MONGODB_URI);
  console.log("MongoDB connected");
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
