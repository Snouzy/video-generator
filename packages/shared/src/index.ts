// Shared types between API and Web

export interface Video {
  id: number;
  title: string;
  url: string;
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// --- Video Generator Types ---

export type GenerationStatus = "pending" | "processing" | "completed" | "failed";

export type ProjectStatus = "draft" | "splitting" | "scenes_ready" | "generating_narration" | "narration_ready" | "generating_images" | "images_ready" | "generating_clips" | "clips_ready" | "rendering" | "rendered" | "completed";

export type VideoFormat = "16:9" | "9:16";

// --- Style Templates ---

export interface StyleTemplateValue {
  sourceId: string;
  stylePromptPrefix: string;
  llmSystemInstructions: string;
}

export interface StyleTemplate extends StyleTemplateValue {
  id: string;
  name: string;
  description: string;
  isBuiltin: boolean;
}

export const BUILTIN_STYLE_TEMPLATES: StyleTemplate[] = [
  {
    id: "builtin:mannequin",
    name: "3D Mannequin",
    description: "Personnages mannequins 3D stylisés, éclairage cinématique",
    sourceId: "builtin:mannequin",
    stylePromptPrefix: "3D render, stylized mannequin-style characters dressed in trendy real-world clothing, cinematic dark lighting, minimalist scene",
    llmSystemInstructions: `- Characters MUST feel relatable and mainstream — dress them in real everyday outfits that Gen Z would recognize: hoodies, oversized tees, streetwear, suits, caps, beanies, sneakers, AirPods, tote bags, etc. Vary the outfits across scenes — some casual, some professional, some sporty. Make them look like real people living real lives, not generic blank mannequins.
- Add realistic contextual details to make the scene feel alive: real-world objects relevant to the scene (branded logos, recognizable software interfaces, specific devices, documents, newspapers, real company names, stock tickers, etc.). Be subtle — these details should enrich the scene, not dominate it.`,
    isBuiltin: true,
  },
  {
    id: "builtin:photorealistic",
    name: "Photo-réaliste",
    description: "Style photographique hyperréaliste, éclairage naturel",
    sourceId: "builtin:photorealistic",
    stylePromptPrefix: "Photorealistic, hyperrealistic photography, natural lighting, shallow depth of field, 8K resolution, shot on Sony A7IV",
    llmSystemInstructions: `- Describe the scene as if directing a real photograph. Focus on natural lighting conditions, realistic skin textures, authentic environments.
- Characters should look like real people photographed in candid or editorial style.
- Specify camera lens (35mm, 50mm, 85mm), aperture, and lighting setup.
- Include environmental details that ground the scene in reality.`,
    isBuiltin: true,
  },
  {
    id: "builtin:diagram",
    name: "Diagramme / Infographie",
    description: "Style infographique épuré, données visuelles, lignes nettes",
    sourceId: "builtin:diagram",
    stylePromptPrefix: "Clean infographic style, data visualization, flat geometric shapes, muted professional color palette, white background, clean lines",
    llmSystemInstructions: `- Describe the scene as a clean infographic or diagram. Use abstract geometric representations for people and objects.
- Focus on data visualization elements: charts, graphs, flowcharts, icons, arrows, and labeled sections.
- Keep the composition organized and readable. Use a professional, muted color palette.
- Avoid photorealism — think of this as a polished business presentation slide or editorial infographic.`,
    isBuiltin: true,
  },
  {
    id: "builtin:abstract",
    name: "Abstrait / Artistique",
    description: "Art abstrait, textures expressives, palettes audacieuses",
    sourceId: "builtin:abstract",
    stylePromptPrefix: "Abstract art, expressive brushstrokes, bold color palette, mixed media texture, artistic composition, gallery-quality contemporary art",
    llmSystemInstructions: `- Interpret the scene as abstract contemporary art. Use metaphorical visual elements rather than literal depictions.
- Focus on color, texture, form, and emotion. Describe brushstrokes, layering, dripping effects, collage elements.
- Think Basquiat, Richter, or Kaws. The mood and feeling of the narrative should drive the composition, not a literal scene description.`,
    isBuiltin: true,
  },
  {
    id: "builtin:flat",
    name: "Flat Design",
    description: "Illustration vectorielle flat, couleurs vives, formes simples",
    sourceId: "builtin:flat",
    stylePromptPrefix: "Flat design illustration, vector art style, bold vivid colors, simple geometric shapes, clean outlines, modern digital illustration",
    llmSystemInstructions: `- Describe the scene as a flat design vector illustration. Characters should be simplified with minimal detail — geometric shapes, no realistic textures.
- Use bold, saturated colors with clean separations. Think of tech company blog illustrations or app onboarding screens.
- Include simple icons and UI-style elements where relevant. Keep compositions clean with plenty of negative space.`,
    isBuiltin: true,
  },
  {
    id: "builtin:anime",
    name: "Anime / Manga",
    description: "Style anime japonais, traits dynamiques, expressions marquées",
    sourceId: "builtin:anime",
    stylePromptPrefix: "Anime style, Japanese animation aesthetic, dynamic poses, expressive eyes, cel-shading, vibrant colors, detailed backgrounds in anime style",
    llmSystemInstructions: `- Describe the scene in anime/manga visual language. Characters should have expressive anime-style features: large emotive eyes, dynamic hair, exaggerated expressions.
- Use dramatic angles, speed lines for action, sparkle/glow effects for emphasis.
- Describe the scene as if it were a key frame from a high-budget anime production.
- Include typical anime visual tropes where appropriate (dramatic wind, cherry blossoms, lens flares, etc.).`,
    isBuiltin: true,
  },
  {
    id: "builtin:wojak",
    name: "Wojak / NPC Meme",
    description: "Personnages Wojak/NPC dans des décors réalistes illustrés, style French Dreamer / JVC 15-18",
    sourceId: "builtin:wojak",
    stylePromptPrefix: "Digital illustration, Wojak meme-style characters with smooth white bald heads, simple dot eyes, small nose, thin-line mouth, expressive minimalist faces, placed in detailed semi-realistic illustrated backgrounds, muted cinematic color palette, urban French environments, editorial illustration style",
    llmSystemInstructions: `- ALL characters MUST be drawn as Wojak/NPC meme figures: smooth white/pale bald round heads, simple dot eyes, small subtle nose, thin line mouth. Expressions conveyed through minimal facial features (sad Wojak, angry Wojak, smug Wojak, doomer Wojak, etc.). No hair unless specifically a wig, hat, or cap.
- Bodies should be proportional and realistically dressed in context-appropriate clothing: work uniforms, streetwear, suits, hi-vis vests, aprons, military gear, etc. The clothing and body should be detailed and semi-realistic while the HEAD stays in the flat Wojak meme style.
- Backgrounds must be detailed, semi-realistic illustrated environments grounded in everyday French/European life: supermarkets, fast-food restaurants, construction sites, suburbs, highways, offices, apartments, delivery vans, etc.
- The overall mood should feel like a satirical slice-of-life editorial illustration — slightly melancholic, ironic, relatable. Think "French Dreamer" Instagram aesthetic.
- Use cinematic composition and lighting: golden hour, neon signs at night, overcast skies, fluorescent office lighting. The environment tells the story as much as the character.
- Include real-world contextual props: branded logos (or parody versions), smartphones, work tools, vehicles, food items, paperwork, etc.`,
    isBuiltin: true,
  },
];

export interface ProjectConfig {
  imagesPerScene: number;
  imageModels: string[];
  animationModels: string[];
  stylePromptPrefix: string;
  styleTemplate?: StyleTemplateValue;
  maxScenes: number | null;
  format: VideoFormat;
  voiceId: string;
  ttsModel: string;
}

export const DEFAULT_PROJECT_CONFIG: ProjectConfig = {
  imagesPerScene: 1,
  imageModels: ["nano-banana", "nano-banana-pro", "flux"],
  animationModels: ["wan-i2v", "kling", "minimax"],
  stylePromptPrefix: BUILTIN_STYLE_TEMPLATES[0].stylePromptPrefix,
  styleTemplate: {
    sourceId: BUILTIN_STYLE_TEMPLATES[0].sourceId,
    stylePromptPrefix: BUILTIN_STYLE_TEMPLATES[0].stylePromptPrefix,
    llmSystemInstructions: BUILTIN_STYLE_TEMPLATES[0].llmSystemInstructions,
  },
  maxScenes: null,
  format: "16:9",
  voiceId: "",
  ttsModel: "eleven_multilingual_v2",
};

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category?: string;
  preview_url?: string;
}

export interface Project {
  id: number;
  title: string;
  scriptContent: string;
  status: ProjectStatus;
  config: ProjectConfig;
  createdAt: Date;
  updatedAt: Date;
  scenes?: Scene[];
}

export interface Scene {
  id: number;
  projectId: number;
  sceneNumber: number;
  title: string;
  narrativeText: string;
  startTimestamp: string | null;
  endTimestamp: string | null;
  tags: string[];
  imagePrompt: string | null;
  animationPrompt: string | null;
  audioUrl: string | null;
  status: GenerationStatus;
  selectedImageId: number | null;
  selectedClipId: number | null;
  styleOverride: StyleTemplateValue | null;
  createdAt: Date;
  updatedAt: Date;
  images?: GeneratedImage[];
  clips?: GeneratedClip[];
}

export interface GeneratedImage {
  id: number;
  sceneId: number;
  model: string;
  prompt: string;
  imageUrl: string | null;
  falRequestId: string | null;
  status: GenerationStatus;
  isSelected: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface GeneratedClip {
  id: number;
  sceneId: number;
  sourceImageId: number;
  model: string;
  animationPrompt: string;
  clipUrl: string | null;
  falRequestId: string | null;
  status: GenerationStatus;
  isSelected: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// API request types

export interface CreateProjectRequest {
  title: string;
  scriptContent: string;
  config?: Partial<ProjectConfig>;
}

export interface UpdateSceneRequest {
  imagePrompt?: string;
  animationPrompt?: string;
  styleOverride?: StyleTemplateValue | null;
}
