import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import type {
  ApiResponse,
  CreateProjectRequest,
  ProjectConfig,
} from "@video-generator/shared";
import { splitScript, generateImagePrompt } from "../services/llm";
import { generateImage } from "../services/replicate";

const router = Router();
const prisma = new PrismaClient();

// POST /api/projects - Create project
router.post("/", async (req, res) => {
  try {
    const { title, scriptContent, config } = req.body as CreateProjectRequest;

    if (!title || !scriptContent) {
      res.status(400).json({ success: false, error: "title and scriptContent are required" });
      return;
    }

    const { DEFAULT_PROJECT_CONFIG } = await import("@video-generator/shared");
    const mergedConfig = { ...DEFAULT_PROJECT_CONFIG, ...config };

    const project = await prisma.project.create({
      data: {
        title,
        scriptContent,
        config: mergedConfig as any,
      },
    });

    res.status(201).json({ success: true, data: project } as ApiResponse<any>);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: message } as ApiResponse<never>);
  }
});

// GET /api/projects - List projects (with scene count)
router.get("/", async (_req, res) => {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { scenes: true } },
      },
    });

    const data = projects.map((p) => ({
      ...p,
      sceneCount: p._count.scenes,
      _count: undefined,
    }));

    res.json({ success: true, data } as ApiResponse<any>);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: message } as ApiResponse<never>);
  }
});

// GET /api/projects/:id - Get project with all scenes
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        scenes: {
          orderBy: { sceneNumber: "asc" },
          include: {
            images: true,
            clips: true,
          },
        },
      },
    });

    if (!project) {
      res.status(404).json({ success: false, error: "Project not found" });
      return;
    }

    res.json({ success: true, data: project } as ApiResponse<any>);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: message } as ApiResponse<never>);
  }
});

// POST /api/projects/:id/split - Split script into scenes
router.post("/:id/split", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const project = await prisma.project.findUnique({ where: { id } });

    if (!project) {
      res.status(404).json({ success: false, error: "Project not found" });
      return;
    }

    const config = project.config as unknown as ProjectConfig;

    // Update project status
    await prisma.project.update({
      where: { id },
      data: { status: "splitting" },
    });

    // Split script using LLM
    const sceneSplits = await splitScript(project.scriptContent, config.maxScenes);

    // Delete existing scenes for this project (in case of re-split)
    await prisma.scene.deleteMany({ where: { projectId: id } });

    // Create scenes and generate image prompts
    const scenes = [];
    for (const split of sceneSplits) {
      const imagePrompt = await generateImagePrompt(
        split.narrativeText,
        split.title,
        config.stylePromptPrefix
      );

      const scene = await prisma.scene.create({
        data: {
          projectId: id,
          sceneNumber: split.sceneNumber,
          title: split.title,
          narrativeText: split.narrativeText,
          startTimestamp: split.startTimestamp,
          endTimestamp: split.endTimestamp,
          tags: split.tags as any,
          imagePrompt,
          status: "pending",
        },
      });

      scenes.push(scene);
    }

    // Update project status
    await prisma.project.update({
      where: { id },
      data: { status: "scenes_ready" },
    });

    res.json({ success: true, data: scenes } as ApiResponse<any>);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    // Reset status on failure
    const id = parseInt(req.params.id, 10);
    await prisma.project.update({ where: { id }, data: { status: "draft" } }).catch(() => {});
    res.status(500).json({ success: false, error: message } as ApiResponse<never>);
  }
});

// POST /api/projects/:id/generate-all-images - Generate images for ALL scenes
router.post("/:id/generate-all-images", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const project = await prisma.project.findUnique({
      where: { id },
      include: { scenes: { orderBy: { sceneNumber: "asc" } } },
    });

    if (!project) {
      res.status(404).json({ success: false, error: "Project not found" });
      return;
    }

    if (project.scenes.length === 0) {
      res.status(400).json({ success: false, error: "No scenes found. Split the script first." });
      return;
    }

    const config = project.config as unknown as ProjectConfig;

    // Update project status
    await prisma.project.update({
      where: { id },
      data: { status: "generating_images" },
    });

    // Create all image records first, then process sequentially in background
    const allImageRecords = [];
    for (const scene of project.scenes) {
      if (!scene.imagePrompt) continue;

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
          allImageRecords.push(imageRecord);
        }
      }
    }

    // Respond immediately, process sequentially in background
    res.json({
      success: true,
      data: {
        message: `Started generating ${allImageRecords.length} images across ${project.scenes.length} scenes`,
        imageCount: allImageRecords.length,
      },
    } as ApiResponse<any>);

    // Sequential background processing (respects rate limits)
    (async () => {
      for (const imageRecord of allImageRecords) {
        try {
          const result = await generateImage(imageRecord.model, imageRecord.prompt);
          await prisma.generatedImage.update({
            where: { id: imageRecord.id },
            data: {
              replicatePredictionId: result.predictionId,
              imageUrl: result.imageUrl,
              status: result.imageUrl ? "completed" : "failed",
            },
          });
          console.log(`Image ${imageRecord.id} completed: ${result.imageUrl ? "success" : "no url"}`);
        } catch (err) {
          await prisma.generatedImage.update({
            where: { id: imageRecord.id },
            data: { status: "failed" },
          });
          console.error(`Image generation failed for image ${imageRecord.id}:`, err);
        }
      }
      await prisma.project.update({
        where: { id },
        data: { status: "images_ready" },
      });
      console.log(`All images for project ${id} done.`);
    })();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: message } as ApiResponse<never>);
  }
});

export default router;
