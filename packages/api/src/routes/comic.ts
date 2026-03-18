import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import type { ApiResponse, ProjectConfig, ComicStructure } from "@video-generator/shared";
import { BUILTIN_COMIC_LAYOUTS, closestAspectRatio } from "@video-generator/shared";
import { generateComicStructure } from "../services/llm";
import { generateComicPageSVG } from "../services/comic-svg";
import { generateImage, downloadToLocal } from "../services/fal";
import archiver from "archiver";

const router = Router();
const prisma = new PrismaClient();

// POST /api/projects/:id/comic/generate
// Returns the comic structure JSON (no images, no ZIP)
router.post("/:id/comic/generate", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        scenes: {
          orderBy: { sceneNumber: "asc" },
          include: {
            images: { where: { isSelected: true } },
          },
        },
      },
    });

    if (!project) {
      res.status(404).json({ success: false, error: "Project not found" } as ApiResponse<never>);
      return;
    }

    if (project.scenes.length === 0) {
      res.status(400).json({ success: false, error: "Project has no scenes" } as ApiResponse<never>);
      return;
    }

    const config = project.config as unknown as ProjectConfig;

    const scenesForLLM = project.scenes.map((s) => ({
      sceneNumber: s.sceneNumber,
      title: s.title,
      narrativeText: s.narrativeText,
      imageUrl: s.images[0]?.imageUrl ?? null,
    }));

    const comicStructure = await generateComicStructure(
      scenesForLLM,
      BUILTIN_COMIC_LAYOUTS,
      config.textLanguage ?? "French"
    );

    // Compute aspectRatio for each panel based on layout dimensions
    const layoutMap = new Map(BUILTIN_COMIC_LAYOUTS.map((l) => [l.id, l]));
    for (const page of comicStructure.pages) {
      const layout = layoutMap.get(page.layoutId);
      if (!layout) continue;
      const panelMap = new Map(layout.panels.map((p) => [p.id, p]));
      for (const panel of page.panels) {
        const layoutPanel = panelMap.get(panel.panelId);
        if (layoutPanel) {
          panel.aspectRatio = closestAspectRatio(layoutPanel.width, layoutPanel.height);
        }
      }
    }

    // Persist to database
    await prisma.project.update({
      where: { id },
      data: { comicStructure: comicStructure as any },
    });

    res.json({ success: true, data: comicStructure } as ApiResponse<ComicStructure>);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: message } as ApiResponse<never>);
  }
});

// POST /api/projects/:id/comic/generate-images
// Generates images for selected panels only
router.post("/:id/comic/generate-images", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { panels, model, stylePromptPrefix, aspectRatio } = req.body as {
      panels: { pageNumber: number; panelId: string; sceneNumber: number; imagePrompt: string; aspectRatio?: string }[];
      model: string;
      stylePromptPrefix?: string;
      aspectRatio?: string; // fallback if panel has no aspectRatio
    };

    if (!panels || panels.length === 0) {
      res.status(400).json({ success: false, error: "panels array is required" } as ApiResponse<never>);
      return;
    }
    if (!model) {
      res.status(400).json({ success: false, error: "model is required" } as ApiResponse<never>);
      return;
    }

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      res.status(404).json({ success: false, error: "Project not found" } as ApiResponse<never>);
      return;
    }

    // Mark selected panels as "processing" in the persisted structure
    const comic = project.comicStructure as unknown as ComicStructure | null;
    if (comic) {
      const panelKeys = new Set(panels.map((p) => `${p.pageNumber}-${p.panelId}`));
      for (const page of comic.pages) {
        for (const p of page.panels) {
          if (panelKeys.has(`${page.pageNumber}-${p.panelId}`)) {
            p.imageStatus = "processing";
          }
        }
      }
      await prisma.project.update({
        where: { id },
        data: { comicStructure: comic as any },
      });
    }

    // Respond immediately
    res.json({
      success: true,
      data: {
        message: `Generating ${panels.length} comic image(s) with "${model}"`,
        totalPanels: panels.length,
      },
    } as ApiResponse<{ message: string; totalPanels: number }>);

    // Background: generate images and update status per panel
    const fallbackAr = aspectRatio ?? "4:3";
    const prefix = stylePromptPrefix ?? "";
    const singlePanelSuffix = ". The illustration must fill the entire image as a single scene — no panel borders, no adjacent panels, no page layout, no visible frames or gutters around the edges";

    (async () => {
      for (const panel of panels) {
        const ar = panel.aspectRatio ?? fallbackAr;
        const basePrompt = prefix ? `${prefix}, ${panel.imagePrompt}` : panel.imagePrompt;
        const fullPrompt = `${basePrompt}${singlePanelSuffix}`;
        let localUrl: string | null = null;
        let status: "completed" | "failed" = "failed";

        try {
          const result = await generateImage(model, fullPrompt, ar);
          if (result.imageUrl) {
            const filename = `comic-${id}-p${panel.pageNumber}-${panel.panelId}`;
            localUrl = await downloadToLocal(result.imageUrl, "images", filename);
            status = "completed";
            console.log(`[Comic] Generated image for page ${panel.pageNumber} ${panel.panelId}`);
          }
        } catch (err) {
          console.error(`[Comic] Failed: page ${panel.pageNumber} ${panel.panelId}:`, err);
        }

        // Update this panel's status in the persisted structure
        try {
          const fresh = await prisma.project.findUnique({ where: { id } });
          const freshComic = fresh?.comicStructure as unknown as ComicStructure | null;
          if (freshComic) {
            const targetPage = freshComic.pages.find((pg) => pg.pageNumber === panel.pageNumber);
            const targetPanel = targetPage?.panels.find((p) => p.panelId === panel.panelId);
            if (targetPanel) {
              targetPanel.imageStatus = status;
              targetPanel.imageUrl = localUrl ? `${localUrl}?v=${Date.now()}` : null;
            }
            await prisma.project.update({
              where: { id },
              data: { comicStructure: freshComic as any },
            });
          }
        } catch (dbErr) {
          console.error(`[Comic] Failed to update DB for ${panel.panelId}:`, dbErr);
        }
      }
      console.log(`[Comic] Done — ${panels.length} images for project ${id}`);
    })();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: message } as ApiResponse<never>);
    }
  }
});

// POST /api/projects/:id/comic/download
// Takes the comic structure and returns a ZIP of SVGs
router.post("/:id/comic/download", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { comicStructure } = req.body as { comicStructure: ComicStructure };

    if (!comicStructure) {
      res.status(400).json({ success: false, error: "comicStructure is required" } as ApiResponse<never>);
      return;
    }

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      res.status(404).json({ success: false, error: "Project not found" } as ApiResponse<never>);
      return;
    }

    const layoutMap = new Map(BUILTIN_COMIC_LAYOUTS.map((l) => [l.id, l]));
    const svgPages: { filename: string; content: string }[] = [];

    for (const page of comicStructure.pages) {
      const layout = layoutMap.get(page.layoutId);
      if (!layout) continue;

      const svg = generateComicPageSVG(page, layout);
      const pageNum = String(page.pageNumber).padStart(3, "0");
      svgPages.push({ filename: `page_${pageNum}.svg`, content: svg });
    }

    const slug = project.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 40);
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${slug}-comic.zip"`);

    const archive = archiver("zip", { zlib: { level: 5 } });
    archive.pipe(res);

    archive.append(JSON.stringify(comicStructure, null, 2), {
      name: "comic-structure.json",
    });

    for (const page of svgPages) {
      archive.append(page.content, { name: page.filename });
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
