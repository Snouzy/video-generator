import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { promises as fs } from "fs";
import path from "path";
import type { ApiResponse, ProjectConfig, ComicStructure } from "@video-generator/shared";
import { BUILTIN_COMIC_LAYOUTS, closestAspectRatio } from "@video-generator/shared";
import { generateComicStructure, regenerateComicPanelPrompt, regenerateComicPage, generateCoverPrompt, generateBackCoverPrompt } from "../services/llm";
import { generateComicPageSVG, generateBackCoverSVG, generateFullComicSVG, type PanelImageSource } from "../services/comic-svg";
import { generateImage, downloadToLocal } from "../services/fal";
import { uploadToR2, uploadBufferToR2 } from "../services/r2";
import { Resvg } from "@resvg/resvg-js";
import archiver from "archiver";

const router = Router();
const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function readPngDimensions(diskPath: string): Promise<{ width: number; height: number } | null> {
  try {
    const fd = await fs.open(diskPath, "r");
    try {
      const buf = Buffer.alloc(24);
      await fd.read(buf, 0, 24, 0);
      // PNG signature: 89 50 4E 47 0D 0A 1A 0A
      if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
        return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
      }
      return null;
    } finally {
      await fd.close();
    }
  } catch {
    return null;
  }
}

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
    const singlePanelSuffix = `. The illustration must fill the entire image edge to edge — no panel borders, no adjacent panels, no page layout, no visible frames or gutters, no vignette. CRITICAL: absolutely NO white space, NO white margin, NO white padding on the LEFT side or RIGHT side or TOP or BOTTOM of the image. The colored artwork, characters and backgrounds must touch and bleed fully to the left edge, right edge, top edge and bottom edge of the image. Zero gap between artwork and any image boundary. CRITICAL: All visible text in the image — speech bubbles, dialogue, onomatopoeia, signs, labels — must be in ${lang}`;

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
          if (err && typeof err === "object" && "body" in err) {
            console.error(`fal.ai error details:`, JSON.stringify((err as any).body, null, 2));
          }
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
    const { imagePrompt, model, stylePromptPrefix, aspectRatio: arParam } = req.body as {
      imagePrompt: string;
      model: string;
      stylePromptPrefix?: string;
      aspectRatio?: string;
    };

    if (!imagePrompt || !model) {
      res.status(400).json({ success: false, error: "imagePrompt and model are required" } as ApiResponse<never>);
      return;
    }

    const ar = arParam ?? "3:4";

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
    const suffix = `. The illustration must fill the entire image edge to edge — no borders, no margins, no panel frames. CRITICAL: All visible text must be in ${lang}`;
    const fullPrompt = prefix ? `${prefix}, ${imagePrompt}${suffix}` : `${imagePrompt}${suffix}`;

    (async () => {
      let localUrl: string | null = null;
      let status: "completed" | "failed" = "failed";

      try {
        const result = await generateImage(model, fullPrompt, ar);
        if (result.imageUrl) {
          localUrl = await downloadToLocal(result.imageUrl, "images", `comic-${id}-cover-${ar.replace(":", "x")}`);
          status = "completed";
        }
      } catch (err) {
        console.error(`[Comic] Cover generation failed:`, err);
        if (err && typeof err === "object" && "body" in err) {
          console.error(`fal.ai error details:`, JSON.stringify((err as any).body, null, 2));
        }
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

// POST /api/projects/:id/comic/back-cover/generate-prompt
router.post("/:id/comic/back-cover/generate-prompt", async (req, res) => {
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

    const imagePrompt = await generateBackCoverPrompt(comic.title, scenesForLLM, lang);

    comic.backCover = { imagePrompt, imageUrl: comic.backCover?.imageUrl, imageStatus: comic.backCover?.imageStatus };
    await prisma.project.update({ where: { id }, data: { comicStructure: comic as any } });

    res.json({ success: true, data: { imagePrompt } } as ApiResponse<{ imagePrompt: string }>);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: message } as ApiResponse<never>);
  }
});

// POST /api/projects/:id/comic/back-cover/generate-image
router.post("/:id/comic/back-cover/generate-image", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { imagePrompt, model, stylePromptPrefix, aspectRatio: arParam } = req.body as {
      imagePrompt: string;
      model: string;
      stylePromptPrefix?: string;
      aspectRatio?: string;
    };

    if (!imagePrompt || !model) {
      res.status(400).json({ success: false, error: "imagePrompt and model are required" } as ApiResponse<never>);
      return;
    }

    const ar = arParam ?? "3:4";

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      res.status(404).json({ success: false, error: "Project not found" } as ApiResponse<never>);
      return;
    }

    const comic = project.comicStructure as unknown as ComicStructure | null;
    if (comic) {
      comic.backCover = { imagePrompt, imageUrl: comic.backCover?.imageUrl, imageStatus: "processing" };
      await prisma.project.update({ where: { id }, data: { comicStructure: comic as any } });
    }

    res.json({ success: true, data: { message: "Generating back cover image" } } as ApiResponse<{ message: string }>);

    const config = project.config as unknown as ProjectConfig | null;
    const lang = config?.textLanguage ?? "French";
    const prefix = stylePromptPrefix ?? "";
    const suffix = `. The illustration must fill the entire image edge to edge — no borders, no margins. CRITICAL: All visible text must be in ${lang} except URLs`;
    const fullPrompt = prefix ? `${prefix}, ${imagePrompt}${suffix}` : `${imagePrompt}${suffix}`;

    (async () => {
      let localUrl: string | null = null;
      let status: "completed" | "failed" = "failed";

      try {
        const result = await generateImage(model, fullPrompt, ar);
        if (result.imageUrl) {
          localUrl = await downloadToLocal(result.imageUrl, "images", `comic-${id}-back-cover-${ar.replace(":", "x")}`);
          status = "completed";
        }
      } catch (err) {
        console.error(`[Comic] Back cover generation failed:`, err);
        if (err && typeof err === "object" && "body" in err) {
          console.error(`fal.ai error details:`, JSON.stringify((err as any).body, null, 2));
        }
      }

      try {
        const fresh = await prisma.project.findUnique({ where: { id } });
        const freshComic = fresh?.comicStructure as unknown as ComicStructure | null;
        if (freshComic) {
          freshComic.backCover = {
            imagePrompt,
            imageStatus: status,
            imageUrl: localUrl ? `${localUrl}?v=${Date.now()}` : null,
          };
          await prisma.project.update({ where: { id }, data: { comicStructure: freshComic as any } });
        }
      } catch (dbErr) {
        console.error(`[Comic] Failed to update back cover in DB:`, dbErr);
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

// GET /api/projects/:id/comic/page/:pageNumber/svg
// Returns SVG with embedded images
router.get("/:id/comic/page/:pageNumber/svg", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const pageNumber = parseInt(req.params.pageNumber, 10);

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      res.status(404).json({ success: false, error: "Project not found" } as ApiResponse<never>);
      return;
    }

    const comic = project.comicStructure as unknown as ComicStructure | null;
    if (!comic) {
      res.status(400).json({ success: false, error: "No comic structure" } as ApiResponse<never>);
      return;
    }

    const page = comic.pages.find((p) => p.pageNumber === pageNumber);
    if (!page) {
      res.status(404).json({ success: false, error: `Page ${pageNumber} not found` } as ApiResponse<never>);
      return;
    }

    const layout = BUILTIN_COMIC_LAYOUTS.find((l) => l.id === page.layoutId);
    if (!layout) {
      res.status(400).json({ success: false, error: "Layout not found" } as ApiResponse<never>);
      return;
    }

    // Build panelImages map
    const panelImages = new Map<string, PanelImageSource>();
    for (const panel of page.panels) {
      if (panel.imageStatus === "completed" && panel.imageUrl) {
        const imageUrlClean = panel.imageUrl.split("?")[0];
        const diskPath = path.join(process.cwd(), "public", imageUrlClean);

        try {
          const buffer = await fs.readFile(diskPath);
          const ext = path.extname(imageUrlClean).toLowerCase();
          let mime = "image/png";
          if (ext === ".webp") mime = "image/webp";
          else if (ext === ".jpg" || ext === ".jpeg") mime = "image/jpeg";

          const dims = await readPngDimensions(diskPath);
          const dataUri = `data:${mime};base64,${buffer.toString("base64")}`;
          panelImages.set(panel.panelId, { src: dataUri, width: dims?.width, height: dims?.height });
        } catch (err) {
          console.error(`Failed to read image file ${diskPath}:`, err);
        }
      }
    }

    const svg = generateComicPageSVG(page, layout, panelImages);

    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Content-Disposition", `attachment; filename="page_${String(pageNumber).padStart(3, "0")}.svg"`);
    res.send(svg);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: message } as ApiResponse<never>);
  }
});

// GET /api/projects/:id/comic/svg
// Full comic multi-page SVG export
router.get("/:id/comic/svg", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      res.status(404).json({ success: false, error: "Project not found" } as ApiResponse<never>);
      return;
    }
    const comic = project.comicStructure as unknown as ComicStructure | null;
    if (!comic) {
      res.status(400).json({ success: false, error: "No comic structure" } as ApiResponse<never>);
      return;
    }

    const layoutMap = new Map(BUILTIN_COMIC_LAYOUTS.map((l) => [l.id, l]));
    const allPanelImages = new Map<number, Map<string, PanelImageSource>>();
    const imageFiles: { zipPath: string; diskPath: string }[] = [];

    for (const page of comic.pages) {
      const pageImages = new Map<string, PanelImageSource>();
      for (const panel of page.panels) {
        if (panel.imageStatus === "completed" && panel.imageUrl) {
          const imageUrlClean = panel.imageUrl.split("?")[0];
          const filename = path.basename(imageUrlClean);
          const diskPath = path.join(process.cwd(), "public", imageUrlClean);
          const zipImagePath = `images/${filename}`;

          const dims = await readPngDimensions(diskPath);
          pageImages.set(panel.panelId, { src: zipImagePath, width: dims?.width, height: dims?.height });
          imageFiles.push({ zipPath: zipImagePath, diskPath });
        }
      }
      if (pageImages.size > 0) allPanelImages.set(page.pageNumber, pageImages);
    }

    const svg = generateFullComicSVG(comic.pages, layoutMap, allPanelImages);

    const slug = project.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${slug}-comic.zip"`);

    const archive = archiver("zip", { zlib: { level: 5 } });
    archive.pipe(res);
    archive.append(svg, { name: "comic.svg" });
    for (const { zipPath, diskPath } of imageFiles) {
      archive.file(diskPath, { name: zipPath });
    }
    await archive.finalize();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: message } as ApiResponse<never>);
  }
});

// POST /api/projects/:id/comic/canva-export
// Uploads all completed panel images to R2, returns public URLs + layout positions
router.post("/:id/comic/canva-export", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      res.status(404).json({ success: false, error: "Project not found" } as ApiResponse<never>);
      return;
    }
    const comic = project.comicStructure as unknown as ComicStructure | null;
    if (!comic) {
      res.status(400).json({ success: false, error: "No comic structure" } as ApiResponse<never>);
      return;
    }

    const layoutMap = new Map(BUILTIN_COMIC_LAYOUTS.map((l) => [l.id, l]));

    const result = await Promise.all(
      comic.pages.map(async (page) => {
        const layout = layoutMap.get(page.layoutId);
        const panelMap = new Map(layout?.panels.map((p) => [p.id, p]) ?? []);

        const panels = await Promise.all(
          page.panels
            .filter((p) => p.imageStatus === "completed" && p.imageUrl)
            .map(async (panel) => {
              const layoutPanel = panelMap.get(panel.panelId);
              const imageUrlClean = panel.imageUrl!.split("?")[0];
              const filename = path.basename(imageUrlClean);
              const key = `comic/${id}/${filename}`;

              const publicUrl = await uploadToR2(imageUrlClean, key);

              return {
                panelId: panel.panelId,
                publicUrl,
                x: layoutPanel?.x ?? 0,
                y: layoutPanel?.y ?? 0,
                width: layoutPanel?.width ?? 0,
                height: layoutPanel?.height ?? 0,
                caption: panel.caption?.text ?? null,
              };
            })
        );

        return { pageNumber: page.pageNumber, panels };
      })
    );

    res.json({ success: true, data: { title: comic.title, pages: result } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: message } as ApiResponse<never>);
  }
});

// POST /api/projects/:id/comic/render-structure-pages
// Renders two elements per page for Canva:
//   1. structureUrl — transparent PNG (borders + captions + bubbles, no artwork)
//   2. panels[] — individual artwork images uploaded to R2 with Canva-scaled coordinates
router.post("/:id/comic/render-structure-pages", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      res.status(404).json({ success: false, error: "Project not found" } as ApiResponse<never>);
      return;
    }
    const comic = project.comicStructure as unknown as ComicStructure | null;
    if (!comic) {
      res.status(400).json({ success: false, error: "No comic structure" } as ApiResponse<never>);
      return;
    }

    // BD coordinate space → Canva page size (794×1123)
    const CANVA_W = 794;
    const BD_W = 595; // COMIC_PAGE_WIDTH
    const scale = CANVA_W / BD_W; // ≈ 1.3344

    const results = await Promise.all(
      comic.pages.map(async (page) => {
        const layout = BUILTIN_COMIC_LAYOUTS.find((l) => l.id === page.layoutId);
        if (!layout) return { pageNumber: page.pageNumber, structureUrl: null, panels: [] };

        // --- 1. Render structure-only transparent PNG ---
        const svgStructure = generateComicPageSVG(page, layout, undefined, { structureOnly: true });
        const resvgStructure = new Resvg(svgStructure, {
          fitTo: { mode: "width", value: CANVA_W },
          background: "rgba(0,0,0,0)",
        });
        const structurePng = resvgStructure.render().asPng();
        const structureKey = `comic/${id}/pages/structure_${String(page.pageNumber).padStart(3, "0")}.png`;
        const structureUrl = await uploadBufferToR2(Buffer.from(structurePng), structureKey, "image/png");

        // --- 2. Upload individual panel artworks to R2 ---
        const panelMap = new Map(layout.panels.map((p) => [p.id, p]));

        const panels = await Promise.all(
          page.panels.map(async (pagePanel) => {
            const layoutPanel = panelMap.get(pagePanel.panelId);
            if (!layoutPanel) return null;

            const canvaX = Math.round(layoutPanel.x * scale);
            const canvaY = Math.round(layoutPanel.y * scale);
            const canvaWidth = Math.round(layoutPanel.width * scale);
            const canvaHeight = Math.round(layoutPanel.height * scale);

            let artworkUrl: string | null = null;
            if (pagePanel.imageStatus === "completed" && pagePanel.imageUrl) {
              const imageUrlClean = pagePanel.imageUrl.split("?")[0];
              const ext = path.extname(imageUrlClean).toLowerCase().slice(1) || "png";
              const diskPath = path.join(process.cwd(), "public", imageUrlClean);
              try {
                const buffer = await fs.readFile(diskPath);
                let mime = "image/png";
                if (ext === "webp") mime = "image/webp";
                else if (ext === "jpg" || ext === "jpeg") mime = "image/jpeg";
                const artworkKey = `comic/${id}/panels/page_${String(page.pageNumber).padStart(3, "0")}_${pagePanel.panelId}.${ext}`;
                artworkUrl = await uploadBufferToR2(Buffer.from(buffer), artworkKey, mime);
              } catch {
                // artwork not available on disk
              }
            }

            return { panelId: pagePanel.panelId, artworkUrl, canvaX, canvaY, canvaWidth, canvaHeight };
          })
        );

        return {
          pageNumber: page.pageNumber,
          structureUrl,
          panels: panels.filter(Boolean),
        };
      })
    );

    res.json({ success: true, data: { title: comic.title, totalPages: comic.pages.length, pages: results } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: message } as ApiResponse<never>);
  }
});

// POST /api/projects/:id/comic/render-pages
// Renders each comic page as a full PNG (panels + captions/bubbles) and uploads to R2.
// Returns one public URL per page — use these as full-page fills in Canva.
router.post("/:id/comic/render-pages", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      res.status(404).json({ success: false, error: "Project not found" } as ApiResponse<never>);
      return;
    }
    const comic = project.comicStructure as unknown as ComicStructure | null;
    if (!comic) {
      res.status(400).json({ success: false, error: "No comic structure" } as ApiResponse<never>);
      return;
    }

    // Render SVG at 96 DPI → 794×1123px (matches Canva page size)
    // SVG natural size is 595×842 at 72 DPI. 72 * (794/595) ≈ 96 DPI.
    const TARGET_WIDTH = 794;
    const TARGET_HEIGHT = 1123;

    const results = await Promise.all(
      comic.pages.map(async (page) => {
        const layout = BUILTIN_COMIC_LAYOUTS.find((l) => l.id === page.layoutId);
        if (!layout) return { pageNumber: page.pageNumber, publicUrl: null };

        // Build panelImages map (same logic as /page/:n/svg)
        const panelImages = new Map<string, PanelImageSource>();
        for (const panel of page.panels) {
          if (panel.imageStatus === "completed" && panel.imageUrl) {
            const imageUrlClean = panel.imageUrl.split("?")[0];
            const diskPath = path.join(process.cwd(), "public", imageUrlClean);
            try {
              const buffer = await fs.readFile(diskPath);
              const ext = path.extname(imageUrlClean).toLowerCase();
              let mime = "image/png";
              if (ext === ".webp") mime = "image/webp";
              else if (ext === ".jpg" || ext === ".jpeg") mime = "image/jpeg";
              const dims = await readPngDimensions(diskPath);
              const dataUri = `data:${mime};base64,${buffer.toString("base64")}`;
              panelImages.set(panel.panelId, { src: dataUri, width: dims?.width, height: dims?.height });
            } catch {
              // image not available — placeholder will be rendered
            }
          }
        }

        const svg = generateComicPageSVG(page, layout, panelImages);

        const resvg = new Resvg(svg, {
          fitTo: { mode: "width", value: TARGET_WIDTH },
        });
        const pngData = resvg.render();
        const pngBuffer = pngData.asPng();

        const key = `comic/${id}/pages/page_${String(page.pageNumber).padStart(3, "0")}.png`;
        const publicUrl = await uploadBufferToR2(Buffer.from(pngBuffer), key, "image/png");

        return { pageNumber: page.pageNumber, publicUrl };
      })
    );

    res.json({ success: true, data: { title: comic.title, totalPages: comic.pages.length, pages: results } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: message } as ApiResponse<never>);
  }
});

export default router;
