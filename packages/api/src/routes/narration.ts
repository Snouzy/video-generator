import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { promises as fs } from "fs";
import path from "path";
import type { ApiResponse, ProjectConfig } from "@video-generator/shared";
import { listVoices, generateSpeech } from "../services/elevenlabs";

const router = Router();
const prisma = new PrismaClient();

// Ensure audio directory exists
async function ensureAudioDir(): Promise<string> {
  const audioDir = path.join(process.cwd(), "public", "audio");
  try {
    await fs.mkdir(audioDir, { recursive: true });
  } catch (error) {
    console.error("Failed to create audio directory:", error);
  }
  return audioDir;
}

// GET /api/voices - List available ElevenLabs voices
router.get("/voices", async (_req, res) => {
  try {
    const voices = await listVoices();
    res.json({ success: true, data: voices } as ApiResponse<any>);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: message } as ApiResponse<never>);
  }
});

// POST /api/projects/:id/generate-narration - Generate narration for all scenes
router.post("/projects/:id/generate-narration", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        scenes: {
          orderBy: { sceneNumber: "asc" },
        },
      },
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

    if (!config.voiceId) {
      res.status(400).json({ success: false, error: "Voice ID not configured" });
      return;
    }

    // Update project status immediately
    await prisma.project.update({
      where: { id },
      data: { status: "generating_narration" },
    });

    // Respond immediately
    res.json({
      success: true,
      data: {
        message: `Started generating narration for ${project.scenes.length} scenes`,
        sceneCount: project.scenes.length,
      },
    } as ApiResponse<any>);

    // Background processing - fire and forget
    (async () => {
      try {
        const audioDir = await ensureAudioDir();
        const scenesToProcess = project.scenes.filter((s) => !s.audioUrl);

        for (const scene of scenesToProcess) {
          try {
            // Generate speech
            const audioBuffer = await generateSpeech(
              config.voiceId,
              scene.narrativeText,
              config.ttsModel
            );

            // Save to file
            const audioFilename = `scene-${scene.id}.mp3`;
            const audioPath = path.join(audioDir, audioFilename);
            await fs.writeFile(audioPath, audioBuffer);

            // Update scene with audio URL
            const audioUrl = `/audio/${audioFilename}`;
            await prisma.scene.update({
              where: { id: scene.id },
              data: { audioUrl },
            });

            console.log(`Narration generated for scene ${scene.id}: ${audioUrl}`);
          } catch (err) {
            console.error(`Failed to generate narration for scene ${scene.id}:`, err);
          }
        }

        // Update project status to narration_ready
        await prisma.project.update({
          where: { id },
          data: { status: "narration_ready" },
        });

        console.log(`All narrations for project ${id} completed.`);
      } catch (err) {
        console.error(`Narration generation failed for project ${id}:`, err);
        // Reset project status to previous state on error
        await prisma.project.update({
          where: { id },
          data: { status: "scenes_ready" },
        }).catch(() => {});
      }
    })();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: message } as ApiResponse<never>);
  }
});

export default router;
