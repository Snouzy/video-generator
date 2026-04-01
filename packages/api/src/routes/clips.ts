import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import type { ApiResponse, ProjectConfig } from "@video-generator/shared";
import { generateClip, downloadToLocal } from "../services/fal";
import archiver from "archiver";
import path from "path";

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
      data: { status: "processing", clipUrl: null, falRequestId: null },
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
            falRequestId: result.requestId,
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

// GET /api/projects/:id/export-clips - Download all selected clips as a zip
router.get("/projects/:id/export-clips", async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      res.status(404).json({ success: false, error: "Project not found" });
      return;
    }

    const selectedClips = await prisma.generatedClip.findMany({
      where: {
        scene: { projectId },
        isSelected: true,
        clipUrl: { not: null },
      },
      include: { scene: true },
      orderBy: { scene: { sceneNumber: "asc" } },
    });

    if (selectedClips.length === 0) {
      res.status(400).json({ success: false, error: "No selected clips to export" });
      return;
    }

    const slug = project.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${slug}-clips.zip"`);

    const archive = archiver("zip", { zlib: { level: 0 } }); // no compression for video
    archive.pipe(res);

    for (const clip of selectedClips) {
      const localPath = path.join(process.cwd(), "public", clip.clipUrl!.slice(1));
      const sceneNum = String(clip.scene.sceneNumber).padStart(3, "0");
      const ext = path.extname(localPath) || ".mp4";
      archive.file(localPath, { name: `scene_${sceneNum}_${clip.model}${ext}` });
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
