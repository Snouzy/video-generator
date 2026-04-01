import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import type { ApiResponse, ProjectConfig } from "@video-generator/shared";
import { generateImage, downloadToLocal } from "../services/fal";
import archiver from "archiver";
import path from "path";

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

// POST /api/images/:id/regenerate - Regenerate a single image
router.post("/images/:id/regenerate", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    const image = await prisma.generatedImage.findUnique({
      where: { id },
      include: { scene: { include: { project: true } } },
    });
    if (!image) {
      res.status(404).json({ success: false, error: "Image not found" });
      return;
    }

    const config = image.scene.project.config as unknown as ProjectConfig;

    // Reset status
    await prisma.generatedImage.update({
      where: { id },
      data: { status: "processing", imageUrl: null, falRequestId: null },
    });

    res.json({ success: true, data: { message: "Regeneration started" } } as ApiResponse<any>);

    // Background processing
    (async () => {
      try {
        const result = await generateImage(image.model, image.prompt, config.format);
        let localUrl: string | null = null;
        if (result.imageUrl) {
          localUrl = await downloadToLocal(result.imageUrl, "images", `img-${id}`);
        }
        await prisma.generatedImage.update({
          where: { id },
          data: {
            falRequestId: result.requestId,
            imageUrl: localUrl,
            status: localUrl ? "completed" : "failed",
          },
        });
        console.log(`Image ${id} regenerated: ${localUrl ? "success" : "no url"}`);
      } catch (err) {
        await prisma.generatedImage.update({
          where: { id },
          data: { status: "failed" },
        });
        console.error(`Image regeneration failed for image ${id}:`, err);
        if (err && typeof err === "object" && "body" in err) {
          console.error(`fal.ai error details:`, JSON.stringify((err as any).body, null, 2));
        }
      }
    })();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: message } as ApiResponse<never>);
  }
});

// GET /api/projects/:id/export-images - Download all selected images as a zip
router.get("/projects/:id/export-images", async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      res.status(404).json({ success: false, error: "Project not found" });
      return;
    }

    const selectedImages = await prisma.generatedImage.findMany({
      where: {
        scene: { projectId },
        isSelected: true,
        imageUrl: { not: null },
      },
      include: { scene: true },
      orderBy: { scene: { sceneNumber: "asc" } },
    });

    if (selectedImages.length === 0) {
      res.status(400).json({ success: false, error: "No selected images to export" });
      return;
    }

    const slug = project.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${slug}-images.zip"`);

    const archive = archiver("zip", { zlib: { level: 0 } });
    archive.pipe(res);

    for (const image of selectedImages) {
      const localPath = path.join(process.cwd(), "public", image.imageUrl!.slice(1));
      const sceneNum = String(image.scene.sceneNumber).padStart(3, "0");
      const ext = path.extname(localPath) || ".png";
      archive.file(localPath, { name: `scene_${sceneNum}_${image.model}${ext}` });
    }

    await archive.finalize();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: message } as ApiResponse<never>);
    }
  }
});

export default router;
