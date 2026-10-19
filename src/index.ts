
import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();
const PORT = Number(process.env.PORT ?? 4000);

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3000"
}));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "JGC Flight Planner API"
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
