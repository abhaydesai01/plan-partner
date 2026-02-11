import "dotenv/config";
import mongoose from "mongoose";
import app from "./app.js";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/plan-partner";
const PORT = parseInt(process.env.PORT || "3001", 10);

async function start() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.warn("SUPABASE_URL and SUPABASE_ANON_KEY should be set for auth.");
  }
  await mongoose.connect(MONGODB_URI);
  console.log("MongoDB connected");
  app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
