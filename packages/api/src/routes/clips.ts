import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import type { ApiResponse } from "@video-generator/shared";

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

export default router;
