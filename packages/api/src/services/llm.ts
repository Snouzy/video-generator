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
        content: `Tu es un éditeur de bande dessinée. Ton travail est d'organiser des scènes en pages de BD avec des légendes narratives, dans le style de l'adaptation graphique de « Sapiens ».

Tu reçois :
1. Une liste de scènes (chacune a un sceneNumber, title, narrativeText)
2. Des mises en page disponibles (chacune a un id, panelCount, et des IDs de cases)

Ta mission :
- Distribuer TOUTES les scènes sur des pages en choisissant la meilleure mise en page selon le rythme narratif.
- Une scène dramatique ou importante doit avoir une grande case (utilise "layout:full-page" ou "layout:1-large-2-small" avec la scène clé en panel-1).
- Les séquences rapides ou montages doivent utiliser des mises en page avec plus de cases ("layout:2x2-grid", "layout:3-top-2-bottom", "layout:6-grid").
- Les échanges de dialogue fonctionnent bien avec "layout:2-horizontal" ou "layout:3-horizontal".
- Chaque case contient exactement UNE scène. Chaque scène doit apparaître exactement une fois.
- Pour chaque case, génère :
  - Un "imagePrompt" : un prompt détaillé de génération d'image IA décrivant le contenu visuel de la scène, EN ANGLAIS. Sois vivant et précis : personnages, décor, éclairage, angle de caméra, composition, ambiance. CRITIQUE : L'image doit représenter UNE SEULE scène remplissant toute l'image. PAS de bordures de cases, PAS de cases adjacentes visibles, PAS de mise en page multi-cases, PAS de cadres ou gouttières sur les bords. L'illustration occupe 100% de l'image. Les bulles de dialogue et le texte sont OK si le style le demande. Ajoute toujours à la fin : "Single panel illustration filling the entire image, no panel borders, no adjacent panels, no page layout visible."
  - Une "caption" (voix-off du narrateur) adaptée du narrativeText. Courte (1-2 phrases max), dans le style de Sapiens : factuel, légèrement ironique, engageant. Position "top" ou "bottom".
  - "bubbles" doit TOUJOURS être un tableau vide []. NE génère AUCUNE bulle de dialogue.

TOUT le texte (captions) DOIT être en ${language}.
Les "imagePrompt" DOIVENT être en anglais SAUF le texte des dialogues/bulles/onomatopées qui doit être en ${language}. Exemple : "... Two men arguing in an office. Speech bubble from the left man: «On a un accord, messieurs !». Speech bubble from the right man: «L'avenir est à nous !» ..."

Mises en page disponibles :
${JSON.stringify(layoutSummary, null, 2)}

Scènes :
${JSON.stringify(scenes.map(s => ({ sceneNumber: s.sceneNumber, title: s.title, narrativeText: s.narrativeText })), null, 2)}

Retourne UNIQUEMENT un objet JSON valide avec cette structure exacte (pas d'autre texte) :
{
  "title": "Titre de la BD",
  "pages": [
    {
      "pageNumber": 1,
      "layoutId": "layout:...",
      "panels": [
        {
          "panelId": "panel-1",
          "sceneNumber": 1,
          "imagePrompt": "A detailed visual description of the scene for AI image generation, in English...",
          "caption": { "text": "Texte du narrateur en ${language}...", "position": "top" },
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
