import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import type {
  ApiResponse,
  CreateProjectRequest,
  ProjectConfig,
} from "@video-generator/shared";
import { splitScript, generateImagePrompt, generateAnimationPrompt } from "../services/llm";
import { fireImagePrediction, fireClipPrediction, waitForPrediction } from "../services/replicate";

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

    // Respond immediately
    res.json({
      success: true,
      data: {
        message: `Started generating ${allImageRecords.length} images across ${project.scenes.length} scenes`,
        imageCount: allImageRecords.length,
      },
    } as ApiResponse<any>);

    // Parallel background processing: fire all predictions, then poll all
    (async () => {
      // Step 1: Fire all predictions in parallel
      const tasks = await Promise.all(
        allImageRecords.map(async (imageRecord) => {
          try {
            const predictionId = await fireImagePrediction(imageRecord.model, imageRecord.prompt, config.format);
            await prisma.generatedImage.update({
              where: { id: imageRecord.id },
              data: { replicatePredictionId: predictionId },
            });
            return { imageRecord, predictionId };
          } catch (err) {
            await prisma.generatedImage.update({
              where: { id: imageRecord.id },
              data: { status: "failed" },
            });
            console.error(`Image ${imageRecord.id} fire failed:`, err);
            return null;
          }
        })
      );

      console.log(`[Images] Fired ${tasks.filter(Boolean).length}/${allImageRecords.length} predictions for project ${id}`);

      // Step 2: Poll all predictions in parallel
      await Promise.all(
        tasks.filter(Boolean).map(async (task) => {
          if (!task) return;
          try {
            const result = await waitForPrediction(task.predictionId);
            await prisma.generatedImage.update({
              where: { id: task.imageRecord.id },
              data: {
                imageUrl: result.output || null,
                status: result.output ? "completed" : "failed",
              },
            });
            console.log(`Image ${task.imageRecord.id} completed: ${result.output ? "success" : "no url"}`);
          } catch (err) {
            await prisma.generatedImage.update({
              where: { id: task.imageRecord.id },
              data: { status: "failed" },
            });
            console.error(`Image ${task.imageRecord.id} poll failed:`, err);
          }
        })
      );

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

// POST /api/projects/:id/generate-all-clips - Generate clips for ALL scenes with a selected image
router.post("/:id/generate-all-clips", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        scenes: {
          orderBy: { sceneNumber: "asc" },
          include: {
            images: { where: { isSelected: true } },
            clips: true,
          },
        },
      },
    });

    if (!project) {
      res.status(404).json({ success: false, error: "Project not found" });
      return;
    }

    const config = project.config as unknown as ProjectConfig;

    // Filter scenes that have a selected image but no clips yet
    const eligibleScenes = project.scenes.filter(
      (s) => s.images.length > 0 && s.images[0].imageUrl && s.clips.length === 0
    );

    if (eligibleScenes.length === 0) {
      res.status(400).json({
        success: false,
        error: "No eligible scenes found. Scenes need a selected image and no existing clips.",
      });
      return;
    }

    await prisma.project.update({
      where: { id },
      data: { status: "generating_clips" },
    });

    // Create all clip records
    const allClipRecords: { clipId: number; model: string; imageUrl: string; animationPrompt: string }[] = [];

    for (const scene of eligibleScenes) {
      const selectedImage = scene.images[0];

      // Generate animation prompt if not already set
      let animPrompt = scene.animationPrompt;
      if (!animPrompt) {
        animPrompt = await generateAnimationPrompt(scene.narrativeText, scene.title);
        await prisma.scene.update({
          where: { id: scene.id },
          data: { animationPrompt: animPrompt },
        });
      }

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
        allClipRecords.push({
          clipId: clipRecord.id,
          model,
          imageUrl: selectedImage.imageUrl!,
          animationPrompt: animPrompt,
        });
      }
    }

    res.json({
      success: true,
      data: {
        message: `Started generating ${allClipRecords.length} clips across ${eligibleScenes.length} scenes`,
        clipCount: allClipRecords.length,
      },
    } as ApiResponse<any>);

    // Parallel background processing: fire all, then poll all
    (async () => {
      // Step 1: Fire all clip predictions in parallel
      const tasks = await Promise.all(
        allClipRecords.map(async (record) => {
          try {
            const predictionId = await fireClipPrediction(record.model, record.imageUrl, record.animationPrompt, config.format);
            await prisma.generatedClip.update({
              where: { id: record.clipId },
              data: { replicatePredictionId: predictionId },
            });
            return { record, predictionId };
          } catch (err) {
            await prisma.generatedClip.update({
              where: { id: record.clipId },
              data: { status: "failed" },
            });
            console.error(`Clip ${record.clipId} fire failed:`, err);
            return null;
          }
        })
      );

      console.log(`[Clips] Fired ${tasks.filter(Boolean).length}/${allClipRecords.length} predictions for project ${id}`);

      // Step 2: Poll all predictions in parallel
      await Promise.all(
        tasks.filter(Boolean).map(async (task) => {
          if (!task) return;
          try {
            const result = await waitForPrediction(task.predictionId);
            await prisma.generatedClip.update({
              where: { id: task.record.clipId },
              data: {
                clipUrl: result.output || null,
                status: result.output ? "completed" : "failed",
              },
            });
            console.log(`Clip ${task.record.clipId} completed: ${result.output ? "success" : "no url"}`);
          } catch (err) {
            await prisma.generatedClip.update({
              where: { id: task.record.clipId },
              data: { status: "failed" },
            });
            console.error(`Clip ${task.record.clipId} poll failed:`, err);
          }
        })
      );

      await prisma.project.update({
        where: { id },
        data: { status: "clips_ready" },
      });
      console.log(`All clips for project ${id} done.`);
    })();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: message } as ApiResponse<never>);
  }
});

// PATCH /api/projects/:id/config - Update project config
router.patch("/:id/config", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const project = await prisma.project.findUnique({ where: { id } });

    if (!project) {
      res.status(404).json({ success: false, error: "Project not found" });
      return;
    }

    const currentConfig = project.config as unknown as ProjectConfig;
    const updatedConfig = { ...currentConfig, ...req.body };

    const updated = await prisma.project.update({
      where: { id },
      data: { config: updatedConfig as any },
    });

    res.json({ success: true, data: updated } as ApiResponse<any>);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: message } as ApiResponse<never>);
  }
});

export default router;
