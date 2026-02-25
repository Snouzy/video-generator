import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { BUILTIN_STYLE_TEMPLATES } from "@video-generator/shared";
import type { ApiResponse, StyleTemplate } from "@video-generator/shared";

const router = Router();
const prisma = new PrismaClient();

// GET /api/style-templates - List all templates (builtin + custom)
router.get("/style-templates", async (_req, res) => {
  try {
    const customTemplates = await prisma.styleTemplate.findMany({
      orderBy: { createdAt: "asc" },
    });

    const all: StyleTemplate[] = [
      ...BUILTIN_STYLE_TEMPLATES,
      ...customTemplates.map((t) => ({
        id: `custom:${t.id}`,
        sourceId: `custom:${t.id}`,
        name: t.name,
        description: t.description,
        stylePromptPrefix: t.stylePromptPrefix,
        llmSystemInstructions: t.llmSystemInstructions,
        isBuiltin: false as const,
      })),
    ];

    res.json({ success: true, data: all } as ApiResponse<StyleTemplate[]>);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: message } as ApiResponse<never>);
  }
});

// POST /api/style-templates - Create custom template
router.post("/style-templates", async (req, res) => {
  try {
    const { name, description, stylePromptPrefix, llmSystemInstructions } = req.body;

    if (!name || !stylePromptPrefix) {
      res.status(400).json({ success: false, error: "name and stylePromptPrefix are required" });
      return;
    }

    const template = await prisma.styleTemplate.create({
      data: {
        name,
        description: description || "",
        stylePromptPrefix,
        llmSystemInstructions: llmSystemInstructions || "",
      },
    });

    const result: StyleTemplate = {
      id: `custom:${template.id}`,
      sourceId: `custom:${template.id}`,
      name: template.name,
      description: template.description,
      stylePromptPrefix: template.stylePromptPrefix,
      llmSystemInstructions: template.llmSystemInstructions,
      isBuiltin: false,
    };

    res.status(201).json({ success: true, data: result } as ApiResponse<StyleTemplate>);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: message } as ApiResponse<never>);
  }
});

// PUT /api/style-templates/:id - Update custom template
router.put("/style-templates/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, description, stylePromptPrefix, llmSystemInstructions } = req.body;

    const template = await prisma.styleTemplate.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(stylePromptPrefix !== undefined && { stylePromptPrefix }),
        ...(llmSystemInstructions !== undefined && { llmSystemInstructions }),
      },
    });

    const result: StyleTemplate = {
      id: `custom:${template.id}`,
      sourceId: `custom:${template.id}`,
      name: template.name,
      description: template.description,
      stylePromptPrefix: template.stylePromptPrefix,
      llmSystemInstructions: template.llmSystemInstructions,
      isBuiltin: false,
    };

    res.json({ success: true, data: result } as ApiResponse<StyleTemplate>);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: message } as ApiResponse<never>);
  }
});

// DELETE /api/style-templates/:id - Delete custom template
router.delete("/style-templates/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.styleTemplate.delete({ where: { id } });
    res.json({ success: true, data: { deleted: true } } as ApiResponse<any>);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: message } as ApiResponse<never>);
  }
});

export default router;
