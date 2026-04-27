import express from "express";
import { config } from "./config.js";
import { authRouter } from "./routes/auth.js";
import { publishRouter } from "./routes/publish.js";
import { commentsRouter } from "./routes/comments.js";

const app = express();

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", config.WEB_BASE_URL);
  res.header("Vary", "Origin");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "api", ts: new Date().toISOString() });
});

app.use("/auth", authRouter);
app.use("/publish", publishRouter);
app.use("/comments", commentsRouter);

app.listen(config.PORT, () => {
  console.log(`API listening on http://localhost:${config.PORT}`);
});
