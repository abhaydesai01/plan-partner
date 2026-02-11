/**
 * One-off script: deletes all data in the MongoDB database (plan-partner).
 * Run from server folder: npx tsx scripts/clear-db.ts
 */
import "dotenv/config";
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/plan-partner";

async function clearDb() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  if (!db) {
    console.error("No database connection");
    process.exit(1);
  }
  const name = db.databaseName;
  await db.dropDatabase();
  console.log(`Dropped database "${name}". All data deleted.`);
  await mongoose.disconnect();
  process.exit(0);
}

clearDb().catch((err) => {
  console.error(err);
  process.exit(1);
});
