import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import apiRoutes from "./routes/index.js";
import publicRoutes from "./routes/public.js";
import authRoutes from "./routes/auth.js";

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));

// Production: rate limit API to support 10k+ users without abuse
const isProduction = process.env.NODE_ENV === "production";
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 500 : 2000, // 500 req/15min per IP in production
  message: { error: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", apiLimiter);

app.use("/api", (_req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  next();
});
// Auth (register/login) mounted first so they are always available
app.use("/api", authRoutes);
app.use("/api", publicRoutes);
app.use("/api", apiRoutes);

export default app;
