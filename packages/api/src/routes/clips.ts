import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import type { ApiResponse, ProjectConfig } from "@video-generator/shared";
import { generateClip, downloadToLocal } from "../services/replicate";

const router = Router();
const prisma = new PrismaClient();

// GET /api/scenes/:id/clips - Get all clips for a scene
router.get("/scenes/:id/clips", async (req, res) => {
  try {
    const sceneId = parseInt(req.params.id, 10);

    const scene = await prisma.scene.findUnique({ where: { id: sceneId } });
    if (!scene) {
      res.status(404).json({ success: false, error: "Scene not found" });
      return;
    }

    const clips = await prisma.generatedClip.findMany({
      where: { sceneId },
      orderBy: { createdAt: "asc" },
    });

    res.json({ success: true, data: clips } as ApiResponse<any>);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: message } as ApiResponse<never>);
  }
});

// PATCH /api/clips/:id/select - Select clip
router.patch("/clips/:id/select", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    const clip = await prisma.generatedClip.findUnique({ where: { id } });
    if (!clip) {
      res.status(404).json({ success: false, error: "Clip not found" });
      return;
    }

    // Unselect all other clips for this scene
    await prisma.generatedClip.updateMany({
      where: { sceneId: clip.sceneId },
      data: { isSelected: false },
    });

    // Select this clip
    const updated = await prisma.generatedClip.update({
      where: { id },
      data: { isSelected: true },
    });

    // Update scene's selectedClipId
    await prisma.scene.update({
      where: { id: clip.sceneId },
      data: { selectedClipId: id },
    });

    res.json({ success: true, data: updated } as ApiResponse<any>);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: message } as ApiResponse<never>);
  }
});

// POST /api/clips/:id/regenerate - Regenerate a single clip
router.post("/clips/:id/regenerate", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    const clip = await prisma.generatedClip.findUnique({
      where: { id },
      include: { sourceImage: true, scene: { include: { project: true } } },
    });
    if (!clip) {
      res.status(404).json({ success: false, error: "Clip not found" });
      return;
    }

    if (!clip.sourceImage.imageUrl) {
      res.status(400).json({ success: false, error: "Source image has no URL" });
      return;
    }

    const config = clip.scene.project.config as unknown as ProjectConfig;

    // Reset status
    await prisma.generatedClip.update({
      where: { id },
      data: { status: "processing", clipUrl: null, replicatePredictionId: null },
    });

    res.json({ success: true, data: { message: "Clip regeneration started" } } as ApiResponse<any>);

    // Background processing
    (async () => {
      try {
        const result = await generateClip(clip.model, clip.sourceImage.imageUrl!, clip.animationPrompt, config.format);
        let localUrl: string | null = null;
        if (result.clipUrl) {
          localUrl = await downloadToLocal(result.clipUrl, "clips", `clip-${id}`);
        }
        await prisma.generatedClip.update({
          where: { id },
          data: {
            replicatePredictionId: result.predictionId,
            clipUrl: localUrl,
            status: localUrl ? "completed" : "failed",
          },
        });
        console.log(`Clip ${id} regenerated: ${localUrl ? "success" : "no url"}`);
      } catch (err) {
        await prisma.generatedClip.update({
          where: { id },
          data: { status: "failed" },
        });
        console.error(`Clip regeneration failed for clip ${id}:`, err);
      }
    })();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: message } as ApiResponse<never>);
  }
});

export default router;
