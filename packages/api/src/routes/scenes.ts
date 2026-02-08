import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import type { ApiResponse, UpdateSceneRequest, ProjectConfig } from "@video-generator/shared";
import { generateImage, generateClip, downloadToLocal } from "../services/replicate";
import { generateAnimationPrompt } from "../services/llm";

const router = Router();
const prisma = new PrismaClient();

// GET /api/projects/:id/scenes - Get all scenes for a project
router.get("/projects/:id/scenes", async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      res.status(404).json({ success: false, error: "Project not found" });
      return;
    }

    const scenes = await prisma.scene.findMany({
      where: { projectId },
      orderBy: { sceneNumber: "asc" },
      include: {
        images: { orderBy: { createdAt: "asc" } },
        clips: { orderBy: { createdAt: "asc" } },
      },
    });

    res.json({ success: true, data: scenes } as ApiResponse<any>);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: message } as ApiResponse<never>);
  }
});

// PATCH /api/scenes/:id - Update scene (edit imagePrompt or animationPrompt)
router.patch("/scenes/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { imagePrompt, animationPrompt } = req.body as UpdateSceneRequest;

    const scene = await prisma.scene.findUnique({ where: { id } });
    if (!scene) {
      res.status(404).json({ success: false, error: "Scene not found" });
      return;
    }

    const updateData: Record<string, string> = {};
    if (imagePrompt !== undefined) updateData.imagePrompt = imagePrompt;
    if (animationPrompt !== undefined) updateData.animationPrompt = animationPrompt;

    const updated = await prisma.scene.update({
      where: { id },
      data: updateData,
    });

    res.json({ success: true, data: updated } as ApiResponse<any>);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: message } as ApiResponse<never>);
  }
});

// POST /api/scenes/:id/generate-images - Generate images for one scene
router.post("/scenes/:id/generate-images", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    const scene = await prisma.scene.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!scene) {
      res.status(404).json({ success: false, error: "Scene not found" });
      return;
    }

    if (!scene.imagePrompt) {
      res.status(400).json({ success: false, error: "Scene has no image prompt" });
      return;
    }

    const config = scene.project.config as unknown as ProjectConfig;

    const imageRecords = [];
    for (const model of config.imageModels) {
      for (let i = 0; i < config.imagesPerScene; i++) {
        const imageRecord = await prisma.generatedImage.create({
          data: {
            sceneId: scene.id,
            model,
            prompt: scene.imagePrompt,
            status: "processing",
          },
        });
        imageRecords.push(imageRecord);
      }
    }

    // Respond immediately
    res.json({
      success: true,
      data: {
        message: `Started generating ${imageRecords.length} images`,
        images: imageRecords,
      },
    } as ApiResponse<any>);

    // Sequential background processing (respects rate limits)
    (async () => {
      for (const imageRecord of imageRecords) {
        try {
          const result = await generateImage(imageRecord.model, imageRecord.prompt, config.format);
          let localUrl: string | null = null;
          if (result.imageUrl) {
            localUrl = await downloadToLocal(result.imageUrl, "images", `img-${imageRecord.id}`);
          }
          await prisma.generatedImage.update({
            where: { id: imageRecord.id },
            data: {
              replicatePredictionId: result.predictionId,
              imageUrl: localUrl,
              status: localUrl ? "completed" : "failed",
            },
          });
          console.log(`Image ${imageRecord.id} completed`);
        } catch (err) {
          await prisma.generatedImage.update({
            where: { id: imageRecord.id },
            data: { status: "failed" },
          });
          console.error(`Image generation failed for image ${imageRecord.id}:`, err);
        }
      }
    })();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: message } as ApiResponse<never>);
  }
});

// POST /api/scenes/:id/generate-clips - Generate clips for one scene
router.post("/scenes/:id/generate-clips", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    const scene = await prisma.scene.findUnique({
      where: { id },
      include: {
        project: true,
        images: { where: { isSelected: true } },
      },
    });

    if (!scene) {
      res.status(404).json({ success: false, error: "Scene not found" });
      return;
    }

    const selectedImage = scene.images[0];
    if (!selectedImage || !selectedImage.imageUrl) {
      res.status(400).json({
        success: false,
        error: "No selected image with a URL found for this scene",
      });
      return;
    }

    const config = scene.project.config as unknown as ProjectConfig;

    // Generate animation prompt if not already set
    let animPrompt = scene.animationPrompt;
    if (!animPrompt) {
      animPrompt = await generateAnimationPrompt(scene.narrativeText, scene.title);
      await prisma.scene.update({
        where: { id },
        data: { animationPrompt: animPrompt },
      });
    }

    const clipRecords = [];
    for (const model of config.animationModels) {
      const clipRecord = await prisma.generatedClip.create({
        data: {
          sceneId: scene.id,
          sourceImageId: selectedImage.id,
          model,
          animationPrompt: animPrompt,
          status: "processing",
        },
      });
      clipRecords.push(clipRecord);
    }

    // Respond immediately
    res.json({
      success: true,
      data: {
        message: `Started generating ${clipRecords.length} clips`,
        clips: clipRecords,
      },
    } as ApiResponse<any>);

    // Sequential background processing (respects rate limits)
    (async () => {
      for (const clipRecord of clipRecords) {
        try {
          const result = await generateClip(
            clipRecord.model,
            selectedImage.imageUrl!,
            clipRecord.animationPrompt,
            config.format
          );
          let localUrl: string | null = null;
          if (result.clipUrl) {
            localUrl = await downloadToLocal(result.clipUrl, "clips", `clip-${clipRecord.id}`);
          }
          await prisma.generatedClip.update({
            where: { id: clipRecord.id },
            data: {
              replicatePredictionId: result.predictionId,
              clipUrl: localUrl,
              status: localUrl ? "completed" : "failed",
            },
          });
          console.log(`Clip ${clipRecord.id} completed`);
        } catch (err) {
          await prisma.generatedClip.update({
            where: { id: clipRecord.id },
            data: { status: "failed" },
          });
          console.error(`Clip generation failed for clip ${clipRecord.id}:`, err);
        }
      }
    })();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: message } as ApiResponse<never>);
  }
});

export default router;
