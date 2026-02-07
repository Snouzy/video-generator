import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";
import type { ApiResponse, ProjectConfig } from "@video-generator/shared";
import { renderVideo } from "@video-generator/remotion";

const router = Router();
const prisma = new PrismaClient();

// POST /api/projects/:id/render - Render final video from selected clips
router.post("/:id/render", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        scenes: {
          orderBy: { sceneNumber: "asc" },
          include: {
            clips: { where: { isSelected: true } },
          },
        },
      },
    });

    if (!project) {
      res.status(404).json({ success: false, error: "Project not found" });
      return;
    }

    const config = project.config as unknown as ProjectConfig;

    // Collect selected clips in scene order
    const clips: Array<{ src: string; sceneTitle?: string }> = [];
    for (const scene of project.scenes) {
      const selectedClip = scene.clips[0];
      if (selectedClip?.clipUrl) {
        clips.push({
          src: selectedClip.clipUrl,
          sceneTitle: scene.title,
        });
      }
    }

    if (clips.length === 0) {
      res.status(400).json({
        success: false,
        error: "No selected clips found. Select a clip for at least one scene.",
      });
      return;
    }

    // Prepare output directory
    const outputDir = path.resolve(process.cwd(), "renders");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = Date.now();
    const outputPath = path.join(outputDir, `project-${id}-${timestamp}.mp4`);

    // Update project status
    await prisma.project.update({
      where: { id },
      data: { status: "rendering" },
    });

    // Respond immediately, render in background
    res.json({
      success: true,
      data: {
        message: `Started rendering video with ${clips.length} clips`,
        clipCount: clips.length,
      },
    } as ApiResponse<any>);

    // Background render
    (async () => {
      try {
        console.log(`[Render] Starting render for project ${id} with ${clips.length} clips...`);
        await renderVideo({
          clips,
          format: config.format ?? "16:9",
          outputPath,
          onProgress: (progress) => {
            if (Math.round(progress * 100) % 10 === 0) {
              console.log(`[Render] Project ${id}: ${Math.round(progress * 100)}%`);
            }
          },
        });

        await prisma.project.update({
          where: { id },
          data: { status: "rendered" },
        });
        console.log(`[Render] Project ${id} done: ${outputPath}`);
      } catch (err) {
        console.error(`[Render] Project ${id} failed:`, err);
        await prisma.project.update({
          where: { id },
          data: { status: "clips_ready" },
        });
      }
    })();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: message } as ApiResponse<never>);
  }
});

export default router;
