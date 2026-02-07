import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import type { ApiResponse } from "@video-generator/shared";

const router = Router();
const prisma = new PrismaClient();

// GET /api/scenes/:id/images - Get all images for a scene
router.get("/scenes/:id/images", async (req, res) => {
  try {
    const sceneId = parseInt(req.params.id, 10);

    const scene = await prisma.scene.findUnique({ where: { id: sceneId } });
    if (!scene) {
      res.status(404).json({ success: false, error: "Scene not found" });
      return;
    }

    const images = await prisma.generatedImage.findMany({
      where: { sceneId },
      orderBy: { createdAt: "asc" },
    });

    res.json({ success: true, data: images } as ApiResponse<any>);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: message } as ApiResponse<never>);
  }
});

// PATCH /api/images/:id/select - Select image
router.patch("/images/:id/select", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    const image = await prisma.generatedImage.findUnique({ where: { id } });
    if (!image) {
      res.status(404).json({ success: false, error: "Image not found" });
      return;
    }

    // Unselect all other images for this scene
    await prisma.generatedImage.updateMany({
      where: { sceneId: image.sceneId },
      data: { isSelected: false },
    });

    // Select this image
    const updated = await prisma.generatedImage.update({
      where: { id },
      data: { isSelected: true },
    });

    // Update scene's selectedImageId
    await prisma.scene.update({
      where: { id: image.sceneId },
      data: { selectedImageId: id },
    });

    res.json({ success: true, data: updated } as ApiResponse<any>);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: message } as ApiResponse<never>);
  }
});

export default router;
