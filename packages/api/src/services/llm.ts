import { readFileSync } from "fs";
import { join } from "path";
import Anthropic from "@anthropic-ai/sdk";
import type { ContentBlock } from "@anthropic-ai/sdk/resources/messages/messages";

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
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `You are a script analyst. Analyze the following narrative script and split it into coherent visual scenes.

Rules:
- Split based on changes in location, action, mood, or character focus — NOT mechanically by paragraph.
- Each scene should represent a distinct visual moment that could be illustrated as a single image.
- Use the timestamps from the script (e.g., [00:10], [01:19]) to assign start and end timestamps.
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
  stylePrefix: string
): Promise<string> {
  if (process.env.USE_MOCK_LLM === "true") {
    console.log(`[MOCK] Generating image prompt for: ${sceneTitle}`);
    return `${stylePrefix}, ${sceneTitle}, dramatic scene depicting: ${narrativeText.slice(0, 100)}...`;
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

Style prefix to prepend: "${stylePrefix}"

Rules:
- Describe the visual scene in vivid detail: characters, setting, lighting, camera angle, composition.
- Include mood and atmosphere descriptions.
- The prompt should work well with AI image generation models (Flux, SDXL, etc.).
- Prepend the style prefix at the beginning.
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
