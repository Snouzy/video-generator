import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import type { ApiResponse, ProjectConfig, ComicStructure } from "@video-generator/shared";
import { BUILTIN_COMIC_LAYOUTS, closestAspectRatio } from "@video-generator/shared";
import { generateComicStructure, regenerateComicPanelPrompt, regenerateComicPage, generateCoverPrompt } from "../services/llm";
import { generateComicPageSVG, generateBackCoverSVG } from "../services/comic-svg";
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
    const config = project.config as unknown as ProjectConfig | null;
    const lang = config?.textLanguage ?? "French";
    const singlePanelSuffix = `. The illustration must fill the entire image edge to edge as a single scene — no panel borders, no adjacent panels, no page layout, no visible frames or gutters, no white borders, no black borders, no margins, no vignette. The artwork must bleed to all four edges of the image with zero padding. CRITICAL: All visible text in the image — speech bubbles, dialogue, onomatopoeia, signs, labels — must be in ${lang}`;

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

// POST /api/projects/:id/comic/regenerate-panel-prompt
// Regenerates the imagePrompt for a single panel from its narrative text
router.post("/:id/comic/regenerate-panel-prompt", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { pageNumber, panelId, narrativeText } = req.body as {
      pageNumber: number;
      panelId: string;
      narrativeText: string;
    };

    if (!narrativeText) {
      res.status(400).json({ success: false, error: "narrativeText is required" } as ApiResponse<never>);
      return;
    }

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      res.status(404).json({ success: false, error: "Project not found" } as ApiResponse<never>);
      return;
    }

    const config = project.config as unknown as ProjectConfig | null;
    const lang = config?.textLanguage ?? "French";

    // Find the panel's scene title
    const comic = project.comicStructure as unknown as ComicStructure | null;
    const page = comic?.pages.find((p) => p.pageNumber === pageNumber);
    const panel = page?.panels.find((p) => p.panelId === panelId);
    const sceneTitle = panel ? `Scene ${panel.sceneNumber}` : "Scene";

    const imagePrompt = await regenerateComicPanelPrompt(narrativeText, sceneTitle, lang);

    // Update the panel's imagePrompt and caption in the persisted structure
    if (comic && panel) {
      panel.imagePrompt = imagePrompt;
      panel.caption = { text: narrativeText, position: panel.caption?.position ?? "bottom" };
      await prisma.project.update({
        where: { id },
        data: { comicStructure: comic as any },
      });
    }

    res.json({ success: true, data: { imagePrompt } } as ApiResponse<{ imagePrompt: string }>);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: message } as ApiResponse<never>);
  }
});

// POST /api/projects/:id/comic/regenerate-page
// Regenerates layout + prompts for a single page, keeping its scenes
router.post("/:id/comic/regenerate-page", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { pageNumber } = req.body as { pageNumber: number };

    const project = await prisma.project.findUnique({
      where: { id },
      include: { scenes: { orderBy: { sceneNumber: "asc" } } },
    });
    if (!project) {
      res.status(404).json({ success: false, error: "Project not found" } as ApiResponse<never>);
      return;
    }

    const comic = project.comicStructure as unknown as ComicStructure | null;
    if (!comic) {
      res.status(400).json({ success: false, error: "No comic structure" } as ApiResponse<never>);
      return;
    }

    const pageIndex = comic.pages.findIndex((p) => p.pageNumber === pageNumber);
    if (pageIndex === -1) {
      res.status(404).json({ success: false, error: `Page ${pageNumber} not found` } as ApiResponse<never>);
      return;
    }

    const oldPage = comic.pages[pageIndex];
    const sceneNumbers = oldPage.panels.map((p) => p.sceneNumber);

    // Build scene data from DB scenes
    const sceneMap = new Map(project.scenes.map((s) => [s.sceneNumber, s]));
    const scenesForLLM = sceneNumbers.map((num) => {
      const s = sceneMap.get(num);
      return {
        sceneNumber: num,
        title: s?.title ?? `Scene ${num}`,
        narrativeText: s?.narrativeText ?? "",
      };
    });

    const config = project.config as unknown as ProjectConfig | null;
    const lang = config?.textLanguage ?? "French";

    const newPage = await regenerateComicPage(scenesForLLM, BUILTIN_COMIC_LAYOUTS, lang);

    // Compute aspect ratios for the new layout
    const layout = BUILTIN_COMIC_LAYOUTS.find((l) => l.id === newPage.layoutId);
    if (layout) {
      const panelMap = new Map(layout.panels.map((p) => [p.id, p]));
      for (const panel of newPage.panels) {
        const layoutPanel = panelMap.get(panel.panelId);
        if (layoutPanel) {
          (panel as any).aspectRatio = closestAspectRatio(layoutPanel.width, layoutPanel.height);
        }
      }
    }

    // Replace the page in the structure
    comic.pages[pageIndex] = {
      pageNumber,
      layoutId: newPage.layoutId,
      panels: newPage.panels as any,
    };

    await prisma.project.update({
      where: { id },
      data: { comicStructure: comic as any },
    });

    res.json({ success: true, data: comic } as ApiResponse<ComicStructure>);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: message } as ApiResponse<never>);
  }
});

// POST /api/projects/:id/comic/cover/generate-prompt
// Generates a cover image prompt from the comic's scenes via LLM
router.post("/:id/comic/cover/generate-prompt", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    const project = await prisma.project.findUnique({
      where: { id },
      include: { scenes: { orderBy: { sceneNumber: "asc" } } },
    });
    if (!project) {
      res.status(404).json({ success: false, error: "Project not found" } as ApiResponse<never>);
      return;
    }

    const comic = project.comicStructure as unknown as ComicStructure | null;
    if (!comic) {
      res.status(400).json({ success: false, error: "No comic structure" } as ApiResponse<never>);
      return;
    }

    const config = project.config as unknown as ProjectConfig | null;
    const lang = config?.textLanguage ?? "French";

    const scenesForLLM = project.scenes.map((s) => ({
      sceneNumber: s.sceneNumber,
      title: s.title,
      narrativeText: s.narrativeText ?? "",
    }));

    const imagePrompt = await generateCoverPrompt(comic.title, scenesForLLM, lang);

    // Persist
    comic.cover = { imagePrompt, imageUrl: comic.cover?.imageUrl, imageStatus: comic.cover?.imageStatus };
    await prisma.project.update({ where: { id }, data: { comicStructure: comic as any } });

    res.json({ success: true, data: { imagePrompt } } as ApiResponse<{ imagePrompt: string }>);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: message } as ApiResponse<never>);
  }
});

// POST /api/projects/:id/comic/cover/generate-image
// Generates the cover image from a prompt
router.post("/:id/comic/cover/generate-image", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { imagePrompt, model, stylePromptPrefix } = req.body as {
      imagePrompt: string;
      model: string;
      stylePromptPrefix?: string;
    };

    if (!imagePrompt || !model) {
      res.status(400).json({ success: false, error: "imagePrompt and model are required" } as ApiResponse<never>);
      return;
    }

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      res.status(404).json({ success: false, error: "Project not found" } as ApiResponse<never>);
      return;
    }

    // Mark as processing
    const comic = project.comicStructure as unknown as ComicStructure | null;
    if (comic) {
      comic.cover = { imagePrompt, imageUrl: comic.cover?.imageUrl, imageStatus: "processing" };
      await prisma.project.update({ where: { id }, data: { comicStructure: comic as any } });
    }

    res.json({ success: true, data: { message: "Generating cover image" } } as ApiResponse<{ message: string }>);

    // Background generation
    const config = project.config as unknown as ProjectConfig | null;
    const lang = config?.textLanguage ?? "French";
    const prefix = stylePromptPrefix ?? "";
    const suffix = `. The illustration must fill the entire image edge to edge — no borders, no margins, no panel frames. Portrait orientation (3:4). CRITICAL: All visible text must be in ${lang}`;
    const fullPrompt = prefix ? `${prefix}, ${imagePrompt}${suffix}` : `${imagePrompt}${suffix}`;

    (async () => {
      let localUrl: string | null = null;
      let status: "completed" | "failed" = "failed";

      try {
        const result = await generateImage(model, fullPrompt, "3:4");
        if (result.imageUrl) {
          localUrl = await downloadToLocal(result.imageUrl, "images", `comic-${id}-cover`);
          status = "completed";
        }
      } catch (err) {
        console.error(`[Comic] Cover generation failed:`, err);
      }

      try {
        const fresh = await prisma.project.findUnique({ where: { id } });
        const freshComic = fresh?.comicStructure as unknown as ComicStructure | null;
        if (freshComic) {
          freshComic.cover = {
            imagePrompt,
            imageStatus: status,
            imageUrl: localUrl ? `${localUrl}?v=${Date.now()}` : null,
          };
          await prisma.project.update({ where: { id }, data: { comicStructure: freshComic as any } });
        }
      } catch (dbErr) {
        console.error(`[Comic] Failed to update cover in DB:`, dbErr);
      }
    })();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: message } as ApiResponse<never>);
    }
  }
});

// GET /api/projects/:id/comic/back-cover
// Returns the back cover SVG
router.get("/:id/comic/back-cover", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      res.status(404).json({ success: false, error: "Project not found" } as ApiResponse<never>);
      return;
    }

    const comic = project.comicStructure as unknown as ComicStructure | null;
    const title = comic?.title ?? project.title;

    const svg = generateBackCoverSVG({
      title,
      author: "codingbiceps",
      links: [
        { label: "TikTok", url: "https://www.tiktok.com/@codingbiceps" },
        { label: "YouTube", url: "https://www.youtube.com/@codingbiceps" },
      ],
    });

    res.setHeader("Content-Type", "image/svg+xml");
    res.send(svg);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: message } as ApiResponse<never>);
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

    // Back cover
    const backCover = generateBackCoverSVG({
      title: comicStructure.title,
      author: "codingbiceps",
      links: [
        { label: "TikTok", url: "https://www.tiktok.com/@codingbiceps" },
        { label: "YouTube", url: "https://www.youtube.com/@codingbiceps" },
      ],
    });
    const lastPageNum = String(comicStructure.pages.length + 1).padStart(3, "0");
    archive.append(backCover, { name: `page_${lastPageNum}_back-cover.svg` });

    await archive.finalize();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: message } as ApiResponse<never>);
    }
  }
});

export default router;
