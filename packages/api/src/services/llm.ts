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
  const arrStart = jsonStr.indexOf('[');
  const arrEnd = jsonStr.lastIndexOf(']');
  if (arrStart !== -1 && arrEnd > arrStart) {
    jsonStr = jsonStr.substring(arrStart, arrEnd + 1);
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

  const userPrompt = `Tu es un éditeur de bande dessinée. Ton travail est d'organiser des scènes en pages de BD avec des légendes narratives, dans le style de l'adaptation graphique de « Sapiens ».

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
  - Un "imagePrompt" CONCIS (2-3 phrases max, ~40 mots) EN ANGLAIS décrivant la scène : personnages, décor, éclairage, ambiance. NE PAS ajouter d'instructions techniques sur les bordures ou le cadrage — c'est géré automatiquement.
  - Une "caption" (voix-off du narrateur) adaptée du narrativeText. Courte (1-2 phrases max), style Sapiens : factuel, légèrement ironique. Position "top" ou "bottom".
  - "bubbles" : TOUJOURS un tableau vide [].

TOUT le texte (captions) DOIT être en ${language}.
Les "imagePrompt" DOIVENT être en anglais SAUF le texte de dialogues/onomatopées qui doit être en ${language}.

Mises en page disponibles :
${JSON.stringify(layoutSummary, null, 2)}

Scènes :
${JSON.stringify(scenes.map(s => ({ sceneNumber: s.sceneNumber, title: s.title, narrativeText: s.narrativeText })), null, 2)}

Retourne UNIQUEMENT du JSON compact valide (pas de markdown, pas de code fences, pas d'autre texte).
Structure : {"title":"...","pages":[{"pageNumber":1,"layoutId":"layout:...","panels":[{"panelId":"panel-1","sceneNumber":1,"imagePrompt":"...","caption":{"text":"...","position":"top"},"bubbles":[]}]}]}`;

  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 16384,
    messages: [{ role: "user", content: userPrompt }],
  });

  if (response.stop_reason === "max_tokens") {
    throw new Error("Comic structure too large for a single LLM call. Try reducing the number of scenes.");
  }

  let jsonStr = extractText(response.content).trim();

  // Strip markdown code fences or any wrapper – just extract the JSON object
  const start = jsonStr.indexOf('{');
  const end = jsonStr.lastIndexOf('}');
  if (start !== -1 && end > start) {
    jsonStr = jsonStr.substring(start, end + 1);
  }

  const structure: ComicStructure = JSON.parse(jsonStr);
  return structure;
}

// ---------------------------------------------------------------------------
// Regenerate a single comic panel prompt from narrative text
// ---------------------------------------------------------------------------

export async function regenerateComicPanelPrompt(
  narrativeText: string,
  sceneTitle: string,
  language: TextLanguage
): Promise<string> {
  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Tu es un directeur artistique de bande dessinée. À partir du texte narratif ci-dessous, génère un prompt détaillé de génération d'image IA pour une case de BD.

Le prompt doit être EN ANGLAIS et décrire UNIQUEMENT le contenu visuel de la scène : personnages, décor, éclairage, angle de caméra, composition, ambiance, expressions faciales.

Règles :
- L'image doit remplir tout le cadre sans bordures, sans cases adjacentes, sans marges blanches ou noires.
- Les dialogues et textes visibles dans les bulles doivent être en ${language}.
- Sois vivant, précis et cinématique. Pense à un plan de film ou une peinture.

Titre de la scène : ${sceneTitle}

Texte narratif :
${narrativeText}

Retourne UNIQUEMENT le prompt (texte brut, pas de JSON, pas de guillemets).`,
      },
    ],
  });

  return extractText(response.content).trim();
}

// ---------------------------------------------------------------------------
// Regenerate a single comic page (new layout + new prompts for its scenes)
// ---------------------------------------------------------------------------

export async function regenerateComicPage(
  scenes: Array<{ sceneNumber: number; title: string; narrativeText: string }>,
  layouts: ComicLayout[],
  language: TextLanguage
): Promise<{ layoutId: string; panels: Array<{ panelId: string; sceneNumber: number; imagePrompt: string; caption: { text: string; position: "top" | "bottom" }; bubbles: [] }> }> {
  const layoutSummary = layouts
    .filter((l) => l.panelCount >= scenes.length)
    .map((l) => ({
      id: l.id,
      name: l.name,
      description: l.description,
      panelCount: l.panelCount,
      panelIds: l.panels.map((p) => p.id),
    }));

  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `Tu es un éditeur de bande dessinée. Tu dois ré-organiser ${scenes.length} scène(s) sur UNE SEULE page de BD en choisissant la meilleure mise en page.

Règles :
- Choisis la mise en page la plus adaptée au rythme narratif des scènes.
- Chaque case contient exactement UNE scène. Utilise les panelIds dans l'ordre.
- Pour chaque case, génère :
  - Un "imagePrompt" EN ANGLAIS décrivant le contenu visuel. CRITIQUE : l'illustration remplit toute l'image bord à bord, PAS de bordures, cadres, cases adjacentes, marges. Les dialogues/bulles visibles doivent être en ${language}.
  - Une "caption" en ${language} (voix-off narrateur, 1-2 phrases max, style Sapiens).
  - "bubbles": toujours []

Mises en page disponibles :
${JSON.stringify(layoutSummary, null, 2)}

Scènes :
${JSON.stringify(scenes, null, 2)}

Retourne UNIQUEMENT un objet JSON :
{
  "layoutId": "layout:...",
  "panels": [
    {
      "panelId": "panel-1",
      "sceneNumber": 1,
      "imagePrompt": "...",
      "caption": { "text": "...", "position": "top" },
      "bubbles": []
    }
  ]
}`,
      },
    ],
  });

  const text = extractText(response.content).trim();
  let jsonStr = text;
  const start = jsonStr.indexOf('{');
  const end = jsonStr.lastIndexOf('}');
  if (start !== -1 && end > start) {
    jsonStr = jsonStr.substring(start, end + 1);
  }
  return JSON.parse(jsonStr);
}

// ---------------------------------------------------------------------------
// Generate a cover image prompt from the comic's scenes
// ---------------------------------------------------------------------------

export async function generateCoverPrompt(
  title: string,
  scenes: Array<{ sceneNumber: number; title: string; narrativeText: string }>,
  language: TextLanguage
): Promise<string> {
  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Tu es un directeur artistique de bande dessinée. Tu dois créer un prompt de génération d'image IA pour la PREMIÈRE DE COUVERTURE d'une BD.

Titre de la BD : "${title}"

Résumé des scènes :
${scenes.map((s) => `- Scene ${s.sceneNumber}: ${s.title} — ${s.narrativeText}`).join("\n")}

Le prompt doit être EN ANGLAIS et décrire une illustration de couverture impactante, comme les couvertures de Sapiens, Tintin, ou Blacksad :
- Composition forte, accrocheuse, qui donne envie de lire
- Personnage(s) principal(aux) mis en avant avec une pose dynamique ou iconique
- Ambiance visuelle qui capture le thème central de l'histoire
- Éclairage cinématique, couleurs vibrantes
- Format portrait (A4), l'illustration remplit tout le cadre bord à bord, pas de bordures ni marges
- CRITIQUE — TYPOGRAPHIE INTÉGRÉE À L'ILLUSTRATION :
  - Le titre "${title}" doit apparaître en GROS dans l'image, en haut ou en position proéminente, avec une typographie stylisée, bold, imposante, qui fait partie intégrante de la composition (comme sur Sapiens, Tintin, Astérix). Précise la couleur, le style, et l'effet du texte (ombre portée, relief, dégradé, etc.).
  - "Une BD de codingbiceps" doit apparaître en plus petit, en bas ou sous le titre, dans un style élégant et lisible.
- Tout le texte visible (titre, auteur) DOIT être en ${language}.

Retourne UNIQUEMENT le prompt (texte brut, pas de JSON, pas de guillemets).`,
      },
    ],
  });

  return extractText(response.content).trim();
}

// ---------------------------------------------------------------------------
// Generate a back cover image prompt
// ---------------------------------------------------------------------------

export async function generateBackCoverPrompt(
  title: string,
  scenes: Array<{ sceneNumber: number; title: string; narrativeText: string }>,
  language: TextLanguage
): Promise<string> {
  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Tu es un directeur artistique de bande dessinée. Tu dois créer un prompt de génération d'image IA pour la 4e DE COUVERTURE (dos) d'une BD.

Titre de la BD : "${title}"

Résumé des scènes :
${scenes.map((s) => `- Scene ${s.sceneNumber}: ${s.title} — ${s.narrativeText}`).join("\n")}

Le prompt doit être EN ANGLAIS et décrire une illustration de 4e de couverture élégante :
- Ambiance plus calme/épilogue que la 1ère de couverture — une scène de conclusion, un détail symbolique, ou une vue d'ensemble
- Peut montrer un personnage de dos, un paysage, un objet symbolique, une scène d'after
- Éclairage doux, atmosphérique
- Format portrait (A4), l'illustration remplit tout le cadre bord à bord, pas de bordures ni marges
- CRITIQUE — TEXTE INTÉGRÉ À L'ILLUSTRATION :
  - Le mot "FIN" en typographie stylisée, visible mais pas dominant
  - "Une BD de codingbiceps" en petit, élégant
  - Les liens "tiktok.com/@codingbiceps" et "youtube.com/@codingbiceps" intégrés de façon discrète en bas
- Tout le texte visible DOIT être en ${language} (sauf les URLs).

Retourne UNIQUEMENT le prompt (texte brut, pas de JSON, pas de guillemets).`,
      },
    ],
  });

  return extractText(response.content).trim();
}
