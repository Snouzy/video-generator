import { readFileSync } from "fs";
import { join } from "path";
import Anthropic from "@anthropic-ai/sdk";
import type { ContentBlock } from "@anthropic-ai/sdk/resources/messages/messages";
import type { ComicLayout, ComicStructure, TextLanguage } from "@video-generator/shared";

let _anthropic: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _anthropic;
}

const MODEL = "claude-sonnet-4-5-20250929";

function extractText(content: ContentBlock[]): string {
  for (const block of content) {
    if (block.type === "text") {
      return block.text;
    }
  }
  throw new Error("No text response from LLM");
}

interface SceneSplit {
  sceneNumber: number;
  title: string;
  narrativeText: string;
  startTimestamp: string | null;
  endTimestamp: string | null;
  tags: string[];
}

export async function splitScript(
  scriptContent: string,
  maxScenes?: number | null
): Promise<SceneSplit[]> {
  if (process.env.USE_MOCK_LLM === "true") {
    console.log("[MOCK] Using mock split data");
    const raw = readFileSync(join(__dirname, "../fixtures/mock-split.json"), "utf-8");
    return JSON.parse(raw);
  }

  const maxScenesInstruction = maxScenes
    ? `Split the script into at most ${maxScenes} scenes.`
    : "Split the script into as many scenes as appropriate.";

  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 16384,
    messages: [
      {
        role: "user",
        content: `You are a script analyst. Analyze the following narrative script and split it into coherent visual scenes.

Rules:
- Each scene MUST correspond to a single visual shot lasting 5-8 seconds.
- The narrative text per scene MUST NOT exceed 20 words (~8 seconds of spoken narration at 150 words/minute). This is critical.
- If a paragraph describes multiple visual moments or actions, split it into separate scenes. For example, "He writes a script to hack a platform. He downloads everything in 24 hours." should be 2 scenes.
- Split based on changes in location, action, mood, or character focus — NOT mechanically by paragraph.
- Use the timestamps from the script (e.g., [00:10], [01:19]) to assign start and end timestamps. Interpolate timestamps for scenes within the same paragraph.
- Generate a short descriptive title for each scene.
- Generate relevant descriptive tags (e.g., "hacking", "tension", "office", "arrest").
- ${maxScenesInstruction}

Return ONLY a JSON array with this exact structure (no other text):
[
  {
    "sceneNumber": 1,
    "title": "Short scene title",
    "narrativeText": "The narrative text for this scene",
    "startTimestamp": "00:00",
    "endTimestamp": "00:10",
    "tags": ["tag1", "tag2"]
  }
]

Script:
${scriptContent}`,
      },
    ],
  });

  const text = extractText(response.content);

  // Extract JSON from the response (handle markdown code blocks)
  let jsonStr = text.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  const scenes: SceneSplit[] = JSON.parse(jsonStr);
  return scenes;
}

export async function generateImagePrompt(
  narrativeText: string,
  sceneTitle: string,
  llmSystemInstructions?: string
): Promise<string> {
  if (process.env.USE_MOCK_LLM === "true") {
    console.log(`[MOCK] Generating image prompt for: ${sceneTitle}`);
    return `${sceneTitle}, dramatic scene depicting: ${narrativeText.slice(0, 100)}...`;
  }

  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are a visual prompt engineer for AI image generation. Generate a detailed image generation prompt for the following scene.

Scene title: ${sceneTitle}
Narrative text: ${narrativeText}

Rules:
- Describe the visual scene in vivid detail: characters, setting, lighting, camera angle, composition.
- Include mood and atmosphere descriptions.
${llmSystemInstructions || "- Be vivid and specific about visual details, clothing, objects, and setting."}
- The prompt should work well with AI image generation models (Flux, SDXL, etc.).
- Do NOT include any style prefix — only describe the scene content.
- Return ONLY the prompt text, nothing else. No quotes, no explanation.`,
      },
    ],
  });

  return extractText(response.content).trim();
}

export async function generateAnimationPrompt(
  narrativeText: string,
  sceneTitle: string
): Promise<string> {
  if (process.env.USE_MOCK_LLM === "true") {
    console.log(`[MOCK] Generating animation prompt for: ${sceneTitle}`);
    return `Slow cinematic zoom in, dramatic lighting shift, subtle camera pan right revealing the scene of ${sceneTitle}`;
  }

  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are a cinematic animation prompt engineer. Generate a detailed animation prompt to animate a still image into a short video clip.

Scene title: ${sceneTitle}
Narrative text: ${narrativeText}

Rules:
- Describe camera movement: slow pan, zoom in/out, tracking shot, dolly, tilt, etc.
- Specify movement speed and direction.
- Describe any character or object motion in the scene.
- Include mood and pacing (dramatic, tense, calm, energetic).
- Keep it concise but specific enough for an image-to-video AI model.
- Return ONLY the animation prompt text, nothing else. No quotes, no explanation.`,
      },
    ],
  });

  return extractText(response.content).trim();
}

// ---------------------------------------------------------------------------
// Comic Book Structure Generation
// ---------------------------------------------------------------------------

export async function generateComicStructure(
  scenes: Array<{ sceneNumber: number; title: string; narrativeText: string; imageUrl: string | null }>,
  layouts: ComicLayout[],
  language: TextLanguage
): Promise<ComicStructure> {
  if (process.env.USE_MOCK_LLM === "true") {
    console.log("[MOCK] Using mock comic structure");
    const raw = readFileSync(join(__dirname, "../fixtures/mock-comic-structure.json"), "utf-8");
    return JSON.parse(raw);
  }

  const layoutSummary = layouts.map(l => ({
    id: l.id,
    name: l.name,
    description: l.description,
    panelCount: l.panelCount,
    panelIds: l.panels.map(p => p.id),
  }));

  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 16384,
    messages: [
      {
        role: "user",
        content: `You are a comic book editor (bande dessinée). Your job is to organize scenes into comic book pages with narration captions and speech bubbles, like the graphic novel adaptation of "Sapiens".

You are given:
1. A list of scenes (each has a sceneNumber, title, narrativeText)
2. Available page layouts (each has an id, panelCount, and panel IDs)

Your task:
- Distribute ALL scenes across pages by choosing the best layout for each page based on narrative pacing.
- A dramatic or important scene should get a large panel (use "layout:full-page" or "layout:1-large-2-small" with the key scene in panel-1).
- Fast-paced sequences or montages should use layouts with more panels ("layout:2x2-grid", "layout:3-top-2-bottom", "layout:6-grid").
- Dialogue exchanges work well with "layout:2-horizontal" or "layout:3-horizontal".
- Each panel holds exactly ONE scene. Every scene must appear exactly once.
- For each panel, generate:
  - An "imagePrompt": a detailed AI image generation prompt describing ONLY the visual scene content. Be vivid and specific: characters, setting, lighting, camera angle, composition, mood. CRITICAL: The generated image will be placed into a comic panel layout separately — so the prompt must describe ONLY the scene itself. Do NOT mention or include any comic panel elements: no borders, no frames, no speech bubbles, no text overlays, no captions, no character name labels, no "comic panel" framing, no white borders, no black outlines around the image. Just describe the raw scene as if directing a photograph or painting.
  - A "caption" (narrator voice-over) adapted from the narrativeText. Keep it short (1-2 sentences max), in the style of Sapiens: factual, slightly ironic, engaging. Set position to "top" or "bottom".
  - "bubbles" must ALWAYS be an empty array []. Do NOT generate any speech bubbles.

ALL text (captions and bubbles) MUST be in ${language}.

Available layouts:
${JSON.stringify(layoutSummary, null, 2)}

Scenes:
${JSON.stringify(scenes.map(s => ({ sceneNumber: s.sceneNumber, title: s.title, narrativeText: s.narrativeText })), null, 2)}

Return ONLY a valid JSON object with this exact structure (no other text):
{
  "title": "Comic title",
  "pages": [
    {
      "pageNumber": 1,
      "layoutId": "layout:...",
      "panels": [
        {
          "panelId": "panel-1",
          "sceneNumber": 1,
          "imagePrompt": "A detailed visual description of the scene for AI image generation...",
          "caption": { "text": "Narrator text...", "position": "top" },
          "bubbles": []
        }
      ]
    }
  ]
}`,
      },
    ],
  });

  const text = extractText(response.content);
  let jsonStr = text.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  const structure: ComicStructure = JSON.parse(jsonStr);
  return structure;
}
