import express from "express";
import cors from "cors";
import apiRoutes from "./routes/index.js";
import publicRoutes from "./routes/public.js";

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use("/api", (_req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  next();
});
app.use("/api", publicRoutes);
app.use("/api", apiRoutes);

export default app;
