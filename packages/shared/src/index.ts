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

export type VideoFormat = "16:9" | "9:16" | "4:3" | "3:4";

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
    stylePromptPrefix: "Digital illustration in the Wojak/Feels Guy meme art style, characters drawn with oversized smooth pale white bald round heads with thin black ink outlines, small beady black dot eyes, tiny subtle nose, thin simple line mouth, horizontal forehead wrinkle lines, hand-drawn sketch aesthetic for faces contrasting with detailed semi-realistic painted bodies and backgrounds, muted cinematic color grading, editorial illustration, dark moody atmospheric lighting",
    llmSystemInstructions: `- CRITICAL: ALL characters MUST have the iconic Wojak/Feels Guy/NPC meme head style. The head is disproportionately large compared to the body. It is smooth, pale white/light gray, perfectly bald and round. Drawn with thin black ink outlines like a simple internet sketch. The face has: small beady black dot eyes (sometimes with dark circles underneath for the doomer variant), a tiny minimal nose (just a small bump or line), a thin simple line mouth (straight for neutral, curved down for sad, wobbly for crying). Horizontal wrinkle lines across the forehead. NO realistic facial features — the face must look like it was drawn in MS Paint.
- Specify which Wojak variant fits the scene mood: NPC (completely blank expressionless gray face), Wojak/Feels Guy (melancholic, downturned mouth, tired eyes), Doomer (dark circles, beanie, cigarette), Bloomer (smiling, optimistic), Zoomer (broccoli hair, AirPods), Boomer (receding hairline, goatee, sunglasses), Coomer (bloodshot eyes, receding hairline), Trad (strong jaw, blond hair), Soyjak (wide open mouth, glasses, beard, pointing), Chad (exaggerated strong jawline, blond). Pick the variant that best matches the scene's emotion.
- Bodies should be proportional (not chibi) and realistically dressed in context-appropriate clothing: work uniforms, hoodies, streetwear, suits, hi-vis vests, aprons, military gear, etc. The clothing and body rendering should be detailed and semi-realistic while the HEAD stays in the flat hand-drawn Wojak meme style. This contrast between cartoon head and realistic body is essential.
- Backgrounds must be detailed, semi-realistic painted environments grounded in everyday life: supermarkets, fast-food restaurants, construction sites, suburbs, highways, offices, apartments, delivery vans, tech offices, bedrooms with PC setups, etc.
- The overall mood should feel like a satirical slice-of-life editorial illustration — slightly melancholic, ironic, relatable. Think "Le French Dreamer" Instagram aesthetic or JVC forum 15-18 meme culture.
- Use cinematic composition and moody lighting: golden hour, neon signs at night, overcast gray skies, harsh fluorescent office lighting, blue monitor glow in dark rooms. The environment tells the story as much as the character.
- Include real-world contextual props that ground the scene: smartphones, energy drinks, fast food packaging, branded logos (or parody versions), work tools, vehicles, Uber Eats bags, headphones, cigarettes, etc.`,
    isBuiltin: true,
  },
  {
    id: "builtin:fitcoach",
    name: "Fit Coach / Social Media",
    description: "Avatar 3D coach sportif stylisé, typographie bold, grid background, palette orange/noir",
    sourceId: "builtin:fitcoach",
    stylePromptPrefix: "Modern social media graphic design, stylized 3D avatar of an athletic male coach character with short dark brown hair with a bright orange streak, fitted black athletic shirt with white 'FD' logo, orange sneakers and orange whistle, bold heavy sans-serif typography in black and bright orange (#FF5722), light gray grid/notebook paper background, clean graphic layout, Instagram carousel style, fitness and sports coaching aesthetic",
    llmSystemInstructions: `- CRITICAL: Every scene MUST feature the same recurring 3D avatar character — a friendly, athletic male sports coach. He has: short dark brown hair with a modern fade and a distinctive bright orange streak (#FF5722) above his right temple, light stubble, blue eyes, muscular but approachable build, broad shoulders. He wears a fitted black athletic t-shirt with a white 'FD' logo on the chest, black joggers, bright orange sneakers (#FF5722), an orange whistle on a black cord around his neck, and a black smartwatch with an orange band on his left wrist. The style is modern and slightly stylized like Notion or Headspace characters — NOT hyper-realistic.
- The composition should look like a polished Instagram carousel slide or social media post. Use BOLD, heavy sans-serif typography as a major visual element — big impactful headlines, numbers, and text overlays are part of the image, not just the subject.
- Color palette is strictly: bright orange (#FF5722) for accents, highlights, and key text; black (#1A1A1A) for headlines and the avatar's clothing; white for contrast text; light gray grid/notebook paper background for light slides, or dark charcoal (#1A1A1A) grid background for dark slides.
- Include graphic design elements typical of social media content: arrows, hand-drawn circles, emoji, icons, "NEW" badges, calendar elements, comparison layouts (VS), numbered lists, checkmarks.
- The avatar should have expressive poses matching the content: pointing, shrugging, celebrating, thinking, presenting. He should feel like a brand mascot guiding the viewer through the content.
- Backgrounds alternate between: light mode (white/light gray with subtle grid lines like notebook paper, with a faint repeating 'FD' watermark pattern) and dark mode (dark charcoal #1A1A1A with subtle grid lines).
- Think of the overall aesthetic as a fitness influencer's polished Instagram content — professional, energetic, bold, with strong visual hierarchy. Every image should feel like it could be swiped through in a carousel.`,
    isBuiltin: true,
  },
  {
    id: "builtin:scientific",
    name: "Scientific / Etude",
    description: "Figures scientifiques style publication, graphiques, schémas, palette sobre",
    sourceId: "builtin:scientific",
    stylePromptPrefix: "Scientific educational illustration inspired by figures found in medical articles and research journals, clean minimalist style, light background, ample negative space, data visualization with bar charts line graphs pie charts, biological or hormonal pathway diagrams, simple human silhouettes, arrows indicating cause-effect relationships and variations, sober readable color palette of blue green orange red, sans-serif academic typography for titles legends percentages and biomarker names, no cartoon no photorealism no 3D effects, only clean graphs and diagrams like a scientific publication figure",
    llmSystemInstructions: `- Each image prompt MUST describe a single, self-contained scientific figure — like one figure from a research paper. Think of it as "Figure 1", "Figure 2", etc.
- Use data visualization elements appropriate to the narrative content: bar charts, line graphs, scatter plots, pie/donut charts, hormonal pathway diagrams, dose-response curves, before/after comparisons, timeline progressions.
- Include simple human silhouettes or anatomical outlines when relevant (e.g., muscle groups, organs, hormonal axes like the HPA axis). Keep them schematic, never photorealistic.
- Use arrows (→, ↑, ↓) to indicate cause-effect relationships, increases, decreases, and feedback loops. These are essential to the scientific visual language.
- Color palette MUST be sober and readable: use blue for primary data, green for positive outcomes, orange for moderate/warning, red for negative outcomes or inflammation markers. Use gray for baselines and controls.
- All text elements in the figure (axis labels, legend entries, percentages, biomarker names like "cortisol", "testosterone", "VO2max", "HRV") should use clean sans-serif typography — like you'd see in a Nature or JAMA figure.
- Include a short centered caption at the bottom of the image in italic, summarizing the key finding, e.g.: "Acute effects of HIIT on appetite hormones in trained athletes" or "Dose-response relationship between sleep duration and recovery markers."
- The overall composition should feel like a polished figure from a peer-reviewed publication: structured, precise, informative. NO decorative elements, no gradients, no shadows, no 3D effects.
- Vary the figure types across scenes to keep the visual narrative interesting: don't repeat the same chart type for every scene.`,
    isBuiltin: true,
  },
];

export interface ModelDefinition {
  id: string;
  label: string;
}

export const AVAILABLE_IMAGE_MODELS: ModelDefinition[] = [
  { id: "nano-banana", label: "Nano Banana" },
  { id: "nano-banana-pro", label: "Nano Banana Pro" },
  { id: "nano-banana-2", label: "Nano Banana 2" },
  { id: "flux", label: "Flux Schnell" },
  { id: "gemini-flash", label: "Gemini Flash" },
];

export const IMAGE_MODEL_RESOLUTIONS: Record<string, { id: string; label: string }[]> = {
  "nano-banana-pro": [
    { id: "1K", label: "1K" },
    { id: "2K", label: "2K" },
    { id: "4K", label: "4K (2x cost)" },
  ],
  "nano-banana-2": [
    { id: "0.5K", label: "0.5K" },
    { id: "1K", label: "1K" },
    { id: "2K", label: "2K (1.5x cost)" },
    { id: "4K", label: "4K (2x cost)" },
  ],
};

export const AVAILABLE_CLIP_MODELS: ModelDefinition[] = [
  { id: "wan-i2v", label: "Wan I2V" },
  { id: "kling-v1.6", label: "Kling v1.6" },
  { id: "kling-v2.6-pro", label: "Kling v2.6 Pro" },
  { id: "kling-o3-pro", label: "Kling O3 Pro" },
  { id: "minimax", label: "Minimax" },
  { id: "veo3.1", label: "Veo 3.1" },
];

export type TextLanguage = "French" | "English" | "Spanish";

export const AVAILABLE_TEXT_LANGUAGES: { id: TextLanguage; label: string }[] = [
  { id: "French", label: "Francais" },
  { id: "English", label: "English" },
  { id: "Spanish", label: "Espanol" },
];

export interface ProjectConfig {
  imagesPerScene: number;
  clipsPerScene: number;
  imageModels: string[];
  animationModels: string[];
  stylePromptPrefix: string;
  styleTemplate?: StyleTemplateValue;
  maxScenes: number | null;
  format: VideoFormat;
  voiceId: string;
  ttsModel: string;
  textLanguage: TextLanguage;
}

export const DEFAULT_PROJECT_CONFIG: ProjectConfig = {
  imagesPerScene: 1,
  clipsPerScene: 1,
  imageModels: ["nano-banana", "nano-banana-pro", "flux"],
  animationModels: ["wan-i2v", "kling-v1.6", "kling-v2.6-pro", "kling-o3-pro", "minimax", "veo3.1"],
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
  textLanguage: "French",
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
  generationOverride: SceneGenerationOverride | null;
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

export interface ImageParams {
  aspectRatio?: VideoFormat;
  resolutions?: Record<string, string>; // modelId -> resolution (e.g. "nano-banana-pro" -> "2K")
}

export interface ClipParams {
  duration?: number;
  generateAudio?: boolean;
  aspectRatio?: VideoFormat;
}

export interface SceneGenerationOverride {
  imageModels?: string[];
  animationModels?: string[];
  imagesPerScene?: number;
  clipsPerScene?: number;
  imageParams?: ImageParams;
  clipParams?: ClipParams;
  textLanguage?: TextLanguage;
}

export interface UpdateSceneRequest {
  narrativeText?: string;
  imagePrompt?: string;
  animationPrompt?: string;
  styleOverride?: StyleTemplateValue | null;
  generationOverride?: SceneGenerationOverride | null;
}
