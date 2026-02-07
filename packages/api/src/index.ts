import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import type { ApiResponse, Video } from "@video-generator/shared";

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ success: true, data: { status: "ok" } } satisfies ApiResponse<{ status: string }>);
});

app.get("/api/videos", async (_req, res) => {
  const videos = await prisma.video.findMany({ orderBy: { createdAt: "desc" } });
  res.json({ success: true, data: videos } satisfies ApiResponse<Video[]>);
});

app.post("/api/videos", async (req, res) => {
  const { title, url } = req.body;
  const video = await prisma.video.create({ data: { title, url } });
  res.status(201).json({ success: true, data: video } satisfies ApiResponse<Video>);
});

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
