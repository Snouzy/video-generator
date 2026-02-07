import "dotenv/config";
import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import type { ApiResponse, Video } from "@video-generator/shared";
import projectsRouter from "./routes/projects";
import scenesRouter from "./routes/scenes";
import imagesRouter from "./routes/images";
import clipsRouter from "./routes/clips";

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ success: true, data: { status: "ok" } } satisfies ApiResponse<{ status: string }>);
});

app.get("/api/videos", async (_req, res) => {
  const videos = await prisma.video.findMany({ orderBy: { createdAt: "desc" } });
  res.json({ success: true, data: videos as unknown as Video[] } satisfies ApiResponse<Video[]>);
});

app.post("/api/videos", async (req, res) => {
  const { title, url } = req.body;
  const video = await prisma.video.create({ data: { title, url } });
  res.status(201).json({ success: true, data: video as unknown as Video } satisfies ApiResponse<Video>);
});

// Mount route modules
app.use("/api/projects", projectsRouter);
app.use("/api", scenesRouter);
app.use("/api", imagesRouter);
app.use("/api", clipsRouter);

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
