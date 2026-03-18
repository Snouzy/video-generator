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
  {
    id: "builtin:comic",
    name: "Bande Dessinée",
    description: "Personnages BD franco-belge expressifs, traits encrés, aplats de couleur vifs",
    sourceId: "builtin:comic",
    stylePromptPrefix: "Franco-Belgian comic book style illustration, expressive stylized characters with clean bold ink outlines, flat color fills, dynamic poses, vivid saturated colors, thick black contour lines, hand-drawn aesthetic, detailed semi-realistic backgrounds",
    llmSystemInstructions: `- CRITICAL: Every scene MUST feature expressive, well-defined characters as the focal point. Characters should have slightly exaggerated but recognizable proportions in the Franco-Belgian BD tradition (think Blacksad, Largo Winch, or Moebius). Strong jawlines, expressive eyes, defined body language, dynamic poses.
- Characters MUST be dressed in real, recognizable clothing appropriate to the scene: business suits, hoodies, streetwear, uniforms, lab coats, leather jackets, etc. Vary outfits across scenes. Add personality through accessories: watches, glasses, tattoos, piercings, headphones, bags. They should look like real people drawn in BD style, not generic cartoon characters.
- Facial expressions are key — BD characters communicate emotion through exaggerated but readable faces: furrowed brows, wide grins, clenched jaws, raised eyebrows. Specify the emotion clearly for each character in the scene.
- Use bold ink outlines with varying line weight — thicker for character silhouettes, thinner for facial details and background. This contrast makes characters pop from the environment.
- Backgrounds should be detailed and hand-drawn but secondary to the characters: cityscapes, offices, cafés, streets. Include contextual props that ground the characters in reality: smartphones, laptops, coffee cups, branded items, vehicles.
- The overall feel should be a polished album-quality BD panel — characters you'd want to follow across an entire graphic novel.`,
    isBuiltin: true,
  },
  {
    id: "builtin:comic-bubbles",
    name: "BD avec Bulles",
    description: "Bande dessinée franco-belge avec bulles de dialogue, phylactères expressifs, onomatopées",
    sourceId: "builtin:comic-bubbles",
    stylePromptPrefix: "Franco-Belgian comic book style single panel illustration, expressive stylized characters with clean bold ink outlines, flat color fills, dynamic poses, vivid saturated colors, thick black contour lines, hand-drawn aesthetic, detailed semi-realistic backgrounds, with prominent speech bubbles and dialogue balloons. The illustration must fill the entire image edge to edge — no panel borders, no adjacent panels, no page layout, no visible frames or gutters, no white or black borders, no margins. The artwork bleeds to all four edges with zero padding",
    llmSystemInstructions: `- CRITIQUE : chaque scène DOIT mettre en avant des personnages expressifs AVEC des bulles de dialogue (phylactères) bien visibles EN FRANÇAIS. Les bulles sont un élément visuel central de ce style. Chaque personnage qui parle ou pense DOIT avoir une bulle visible reliée à lui.
- Les bulles DOIVENT être de style BD classique : formes arrondies blanches ou claires avec une queue pointée vers la bouche du personnage. Différents styles selon le contexte : bulles ovales lisses pour la parole normale, en forme de nuage pour les pensées, dentelées/piquantes pour les cris ou la colère, ondulées pour les chuchotements.
- Inclure un texte COURT dans les bulles qui capture le dialogue ou la réaction clé de la scène. Le texte doit être en lettrage BD gras, 3-8 mots maximum par bulle. CRITIQUE : le texte des bulles et onomatopées DOIT être dans la langue du récit (PAS en anglais). Plusieurs bulles par personnage sont possibles pour les échanges.
- Ajouter des onomatopées (effets sonores) en texte stylisé gras intégré à la scène : "BOOM", "CRACK", "SPLASH", etc. Grands, colorés et dynamiques.
- Les personnages doivent avoir des proportions légèrement exagérées mais reconnaissables dans la tradition BD franco-belge (Astérix, Tintin, Lucky Luke, Blacksad). Expressions fortes, poses dynamiques, yeux et bouches expressifs qui correspondent au contenu des bulles.
- Les personnages DOIVENT porter des vêtements réels et reconnaissables adaptés à la scène. Varier les tenues entre les scènes. Ajouter de la personnalité via les accessoires.
- Les expressions faciales DOIVENT correspondre au contenu des bulles — un personnage avec une bulle de cri doit avoir la bouche ouverte et les yeux intenses.
- Contours encrés gras avec variation d'épaisseur de trait — plus épais pour les silhouettes, plus fins pour les détails et l'arrière-plan.
- CRITIQUE : composer la scène comme UNE SEULE case de BD remplissant toute l'image. PAS de bordures de cases visibles, PAS de cases adjacentes, PAS de mise en page multi-cases, PAS de cadres ou gouttières sur les bords. L'illustration doit occuper 100% de l'image.
- Arrière-plans détaillés et dessinés à la main mais secondaires par rapport aux personnages et leurs dialogues.`,
    isBuiltin: true,
  },
  {
    id: "builtin:pixel-art",
    name: "Pixel Art / Retro Gaming",
    description: "Personnages pixel art expressifs style RPG 16-bit, sprites détaillés, nostalgie gaming",
    sourceId: "builtin:pixel-art",
    stylePromptPrefix: "Pixel art illustration, retro 16-bit and 32-bit video game aesthetic, expressive character sprites with visible pixel grid, limited color palette, detailed pixel backgrounds, nostalgic gaming atmosphere, dithering shading technique",
    llmSystemInstructions: `- CRITICAL: Every scene MUST feature one or more expressive pixel art character sprites as the central focus. Characters should have clear, readable silhouettes and dynamic poses — like the best RPG character sprites from Final Fantasy VI, Chrono Trigger, or Celeste.
- Characters MUST be dressed in recognizable, context-appropriate pixel outfits: suits with tiny pixel ties, hoodies with logos, streetwear, work uniforms, armor, casual wear. Vary outfits across scenes. Add pixel accessories: tiny glasses, hats, headphones, backpacks, watches. Each character should have a distinct look and personality even at low resolution.
- Character expressions should be readable despite the pixel limitation: use eye shape, mouth position, body posture, and gesture to convey emotion. A pixel character pointing, shrugging, facepalming, or celebrating should be immediately understood.
- Use a constrained color palette (16 to 64 colors per scene). Apply dithering for shading. Characters should use slightly brighter, more saturated colors than backgrounds so they pop visually.
- Backgrounds are detailed pixel environments that contextualize the characters: offices, city streets, bedrooms with PC setups, cafés, public transport. Include pixel props characters interact with: laptops, phones, coffee cups, documents.
- Include RPG-style UI elements where they enhance the narrative: dialogue boxes with character portraits, status bars, inventory icons, quest prompts. These should frame the characters, not replace them.`,
    isBuiltin: true,
  },
  {
    id: "builtin:film-noir",
    name: "Film Noir",
    description: "Personnages mystérieux en noir et blanc, contrastes forts, ombres dramatiques, style détective",
    sourceId: "builtin:film-noir",
    stylePromptPrefix: "Film noir style, high contrast black and white, dramatic chiaroscuro lighting, stylish mysterious characters in sharp clothing, deep shadows, venetian blind light patterns, moody atmospheric composition, 1940s cinematic aesthetic, grain texture",
    llmSystemInstructions: `- CRITICAL: Every scene MUST be centered on one or more characters who feel like film noir protagonists. Characters are the emotional anchor — the lighting, shadows, and environment exist to frame them.
- Characters MUST be dressed in stylish, timeless clothing that translates the narrative to noir: tailored suits, trench coats, fedoras, long coats, turtlenecks, leather gloves, sharp dress shoes. For modern contexts, adapt: a tech CEO becomes a shadowy businessman in a dark overcoat, a developer becomes a brooding figure hunched over a glowing screen in a dark room, a journalist becomes a trench-coated investigator. Always elegant, never casual.
- Facial features should be sculpted by light and shadow: half-lit faces, eyes catching a sliver of light, jawlines defined by harsh contrast. Characters should have intense, unreadable expressions — the noir mystique. Specify whether they look determined, suspicious, exhausted, conflicted.
- Lighting defines the character's mood. Use dramatic chiaroscuro from single sources: desk lamps illuminating only hands and face, streetlights casting long shadows behind a walking figure, neon signs through rain-streaked windows painting light across a character's silhouette. Venetian blind shadow patterns falling across characters are iconic.
- Characters should interact with noir props that extend their personality: cigarettes, whiskey glasses, newspapers, briefcases, phones, car steering wheels. These objects tell stories about the character.
- Environments frame the characters: rain-slicked streets they walk alone, smoke-filled bars where they sit in corners, dimly lit offices where they work late. Always black and white, subtle film grain. Dutch angles and reflections in puddles/mirrors add depth.`,
    isBuiltin: true,
  },
  {
    id: "builtin:sketch",
    name: "Crayon / Sketch",
    description: "Personnages croqués au crayon sur papier, traits expressifs, style carnet d'illustrateur",
    sourceId: "builtin:sketch",
    stylePromptPrefix: "Pencil sketch on white paper, hand-drawn character illustration, expressive graphite pencil strokes, crosshatching shading, visible paper texture, figure drawing aesthetic, loose confident linework, detailed character studies",
    llmSystemInstructions: `- CRITICAL: Every scene MUST feature one or more hand-drawn pencil characters as the central subject. The characters are the sketch — they should feel like a skilled illustrator's character study or storyboard frame.
- Characters should be drawn with confident, anatomically accurate proportions and expressive poses. Use varying pencil pressure: bold dark strokes for character outlines and facial features, lighter lines for clothing folds and hair texture, very faint construction lines visible underneath for authenticity.
- Characters MUST wear recognizable, detailed clothing rendered in pencil: the texture of a knit sweater through crosshatching, the creases of a suit jacket through parallel lines, the softness of a hoodie through light shading. Clothing details (zippers, buttons, logos, patterns) should be carefully sketched. Vary outfits across scenes.
- Facial expressions are paramount — pencil sketches live or die by the face. Describe precise expressions: furrowed brows with deep crosshatch shadows, a slight smirk with minimal line work, tired eyes with dark tonal shading underneath. The character's emotion should be immediately readable.
- Shade characters using traditional pencil techniques: crosshatching for dark areas (under chin, inside jacket), parallel hatching for mid-tones (cheeks, arms), smooth graphite gradients for soft surfaces (skin, hair). Leave highlights as pure white paper.
- Leave strategic areas unfinished — a character's hand might trail off into loose gestural lines, the background might be barely suggested with faint marks. The contrast between the detailed character and the sparse surroundings focuses attention on the person.
- Include subtle sketchbook authenticity: faint eraser marks, a small character expression study in the corner, pencil smudges. The feel is an illustrator's working sketchbook, not a finished piece.`,
    isBuiltin: true,
  },
  {
    id: "builtin:isometric",
    name: "Isométrique / Low Poly",
    description: "Personnages low-poly mignons dans des dioramas isométriques, couleurs pastels, style miniature",
    sourceId: "builtin:isometric",
    stylePromptPrefix: "Isometric 3D illustration, cute low-poly geometric characters interacting in miniature diorama scenes, soft pastel color palette, clean geometric shapes, subtle ambient occlusion shadows, tilt-shift depth of field, charming minimalist design",
    llmSystemInstructions: `- CRITICAL: Every scene MUST feature one or more cute low-poly characters as the focus. Characters are small geometric figures made of flat polygonal faces — simplified but full of personality. Think Monument Valley meets The Sims. Characters should be DOING something: working, talking, walking, reacting.
- Characters should have minimal but expressive features: simple dot eyes, a tiny geometric mouth or no mouth at all — emotion is conveyed through body posture, head tilt, arm position, and the objects they interact with. A character slumped at a desk reads as tired, one with arms raised reads as excited.
- Characters MUST wear recognizable low-poly outfits that tell a story: a tiny geometric suit for a businessman, a hoodie with a visible pixel-logo for a developer, an apron for a barista, a hard hat for a worker. Add small accessories: geometric glasses, tiny bags, miniature headphones, small hats. Vary character appearances and outfits across scenes.
- Place characters in self-contained isometric dioramas — floating tile platforms they inhabit like game boards. The environment should be built around the characters: a tiny office with a desk they sit at, a miniature café where they order coffee, a small street corner where they wait.
- Use a soft pastel palette: muted pinks, light blues, warm yellows, sage greens. Characters should use slightly more saturated colors than their environment so they stand out as the focal point.
- Include charming details that enhance the characters' world: tiny trees, miniature vehicles, small pets next to characters, steam rising from a cup they hold. Tilt-shift blur at edges reinforces the miniature diorama feeling.`,
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

// ---------------------------------------------------------------------------
// fal.ai Model Pricing
// ---------------------------------------------------------------------------

export interface ImageModelPricing {
  basePrice: number;
  resolutionPricing?: Record<string, number>;
}

export interface ClipModelPricing {
  type: "flat" | "per_second";
  basePrice: number;
  audioPricePerSecond?: number;
}

export const IMAGE_MODEL_PRICING: Record<string, ImageModelPricing> = {
  "nano-banana": { basePrice: 0.039 },
  "nano-banana-pro": {
    basePrice: 0.15,
    resolutionPricing: { "1K": 0.15, "2K": 0.15, "4K": 0.30 },
  },
  "nano-banana-2": {
    basePrice: 0.08,
    resolutionPricing: { "0.5K": 0.06, "1K": 0.08, "2K": 0.12, "4K": 0.16 },
  },
  "flux": { basePrice: 0.003 },
  "gemini-flash": { basePrice: 0.039 },
};

export const CLIP_MODEL_PRICING: Record<string, ClipModelPricing> = {
  "wan-i2v": { type: "flat", basePrice: 0.40 },
  "kling-v1.6": { type: "per_second", basePrice: 0.098 },
  "kling-v2.6-pro": { type: "per_second", basePrice: 0.07, audioPricePerSecond: 0.14 },
  "kling-o3-pro": { type: "per_second", basePrice: 0.224, audioPricePerSecond: 0.28 },
  "minimax": { type: "flat", basePrice: 0.50 },
  "veo3.1": { type: "per_second", basePrice: 0.20, audioPricePerSecond: 0.40 },
};

// ---------------------------------------------------------------------------
// Animation Prompt Templates (presets for clip generation prompts)
// ---------------------------------------------------------------------------

export interface AnimationTemplate {
  id: string;
  name: string;
  description: string;
  prompt: string;
}

export const BUILTIN_ANIMATION_TEMPLATES: AnimationTemplate[] = [
  {
    id: "comic-limited",
    name: "BD / Animation limitée",
    description: "Mouvements minimaux, expressions faciales subtiles, bouches qui bougent",
    prompt: "Very limited animation like an animated comic book panel. Characters barely move their bodies — only subtle facial expression changes: eyes blinking slowly, mouth opening and closing gently as if speaking, slight eyebrow raises. No body movement, no camera movement, no dynamic action. The scene feels like a living comic book illustration with minimal, restrained animation. Soft breathing motion only.",
  },
  {
    id: "cinematic",
    name: "Cinématique",
    description: "Mouvements de caméra fluides, action dynamique, transitions cinématiques",
    prompt: "Cinematic camera movement with smooth dolly, pan, or crane motion. Characters move naturally with fluid body language, gestures, and realistic weight. Dynamic lighting shifts. The scene feels like a shot from a high-budget film with professional cinematography.",
  },
  {
    id: "ken-burns",
    name: "Ken Burns / Zoom lent",
    description: "Zoom lent et pan doux sur image statique, style documentaire",
    prompt: "Slow Ken Burns effect — gentle, almost imperceptible zoom in or slow pan across the scene. No character movement, no animation. The image is treated as a static photograph with only a subtle camera drift to add life. Documentary style.",
  },
  {
    id: "parallax",
    name: "Parallaxe / Profondeur",
    description: "Effet de parallaxe avec séparation des plans, profondeur 2.5D",
    prompt: "2.5D parallax depth effect — foreground elements move slightly faster than background elements, creating a sense of depth. No character animation. Subtle floating particles or atmospheric effects (dust, light rays) add life. The scene feels like layered paper cutouts with gentle independent movement.",
  },
  {
    id: "talking-head",
    name: "Talking Head",
    description: "Personnage qui parle face caméra, gestes naturels des mains",
    prompt: "Character talking directly to camera with natural head movements, hand gestures while speaking, occasional nods, and expressive facial animations. Mouth moves in sync with speech rhythm. Slight body sway. Background is static. The feel is a YouTube video or podcast recording.",
  },
];

export interface CostBreakdownItem {
  model: string;
  type: "image" | "clip";
  unitCost: number;
  quantity: number;
  subtotal: number;
}

export interface SceneCostEstimate {
  imageCost: number;
  clipCost: number;
  totalCost: number;
  breakdown: CostBreakdownItem[];
}

export function calculateSceneCost(params: {
  imageModels: string[];
  imagesPerScene: number;
  imageResolutions?: Record<string, string>;
  animationModels: string[];
  clipsPerScene: number;
  clipDuration?: number;
  generateAudio?: boolean;
}): SceneCostEstimate {
  const breakdown: CostBreakdownItem[] = [];
  let imageCost = 0;
  let clipCost = 0;

  // Image costs
  for (const model of params.imageModels) {
    const pricing = IMAGE_MODEL_PRICING[model];
    if (!pricing) continue;

    const resolution = params.imageResolutions?.[model];
    const unitCost = (resolution ? pricing.resolutionPricing?.[resolution] : undefined) ?? pricing.basePrice;
    const quantity = params.imagesPerScene;
    const subtotal = unitCost * quantity;

    breakdown.push({ model, type: "image", unitCost, quantity, subtotal });
    imageCost += subtotal;
  }

  // Clip costs
  const duration = params.clipDuration ?? 5;
  for (const model of params.animationModels) {
    const pricing = CLIP_MODEL_PRICING[model];
    if (!pricing) continue;

    let unitCost: number;
    if (pricing.type === "flat") {
      unitCost = pricing.basePrice;
    } else {
      const pricePerSecond = params.generateAudio && pricing.audioPricePerSecond
        ? pricing.audioPricePerSecond
        : pricing.basePrice;
      unitCost = pricePerSecond * duration;
    }

    const quantity = params.clipsPerScene;
    const subtotal = unitCost * quantity;

    breakdown.push({ model, type: "clip", unitCost, quantity, subtotal });
    clipCost += subtotal;
  }

  return { imageCost, clipCost, totalCost: imageCost + clipCost, breakdown };
}

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
  comicStructure: ComicStructure | null;
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

// ---------------------------------------------------------------------------
// Comic Book (BD) Generation
// ---------------------------------------------------------------------------

export const COMIC_PAGE_WIDTH = 595;
export const COMIC_PAGE_HEIGHT = 842;
export const COMIC_PAGE_MARGIN = 20;
export const COMIC_PANEL_GUTTER = 10;

export interface ComicPanel {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ComicLayout {
  id: string;
  name: string;
  description: string;
  panelCount: number;
  panels: ComicPanel[];
}

const M = COMIC_PAGE_MARGIN;
const G = COMIC_PANEL_GUTTER;
const W = COMIC_PAGE_WIDTH - 2 * M;   // 555
const H = COMIC_PAGE_HEIGHT - 2 * M;  // 802

export const BUILTIN_COMIC_LAYOUTS: ComicLayout[] = [
  {
    id: "layout:full-page",
    name: "Pleine page",
    description: "1 case pleine page — idéal pour une scène dramatique ou d'ouverture",
    panelCount: 1,
    panels: [
      { id: "panel-1", x: M, y: M, width: W, height: H },
    ],
  },
  {
    id: "layout:2-horizontal",
    name: "2 bandes",
    description: "2 cases horizontales égales — dialogue ou avant/après",
    panelCount: 2,
    panels: [
      { id: "panel-1", x: M, y: M, width: W, height: (H - G) / 2 },
      { id: "panel-2", x: M, y: M + (H - G) / 2 + G, width: W, height: (H - G) / 2 },
    ],
  },
  {
    id: "layout:3-horizontal",
    name: "3 bandes",
    description: "3 bandes horizontales égales — progression narrative classique",
    panelCount: 3,
    panels: (() => {
      const ph = (H - 2 * G) / 3;
      return [
        { id: "panel-1", x: M, y: M, width: W, height: ph },
        { id: "panel-2", x: M, y: M + ph + G, width: W, height: ph },
        { id: "panel-3", x: M, y: M + 2 * (ph + G), width: W, height: ph },
      ];
    })(),
  },
  {
    id: "layout:2x2-grid",
    name: "Grille 2×2",
    description: "4 cases en grille — séquence rapide ou montage",
    panelCount: 4,
    panels: (() => {
      const pw = (W - G) / 2;
      const ph = (H - G) / 2;
      return [
        { id: "panel-1", x: M, y: M, width: pw, height: ph },
        { id: "panel-2", x: M + pw + G, y: M, width: pw, height: ph },
        { id: "panel-3", x: M, y: M + ph + G, width: pw, height: ph },
        { id: "panel-4", x: M + pw + G, y: M + ph + G, width: pw, height: ph },
      ];
    })(),
  },
  {
    id: "layout:1-large-2-small",
    name: "1 grande + 2 petites",
    description: "1 grande case en haut, 2 petites en bas — intro puis détails",
    panelCount: 3,
    panels: (() => {
      const topH = Math.round(H * 0.6);
      const botH = H - topH - G;
      const pw = (W - G) / 2;
      return [
        { id: "panel-1", x: M, y: M, width: W, height: topH },
        { id: "panel-2", x: M, y: M + topH + G, width: pw, height: botH },
        { id: "panel-3", x: M + pw + G, y: M + topH + G, width: pw, height: botH },
      ];
    })(),
  },
  {
    id: "layout:2-small-1-large",
    name: "2 petites + 1 grande",
    description: "2 petites en haut, 1 grande en bas — build-up vers climax",
    panelCount: 3,
    panels: (() => {
      const topH = Math.round(H * 0.38);
      const botH = H - topH - G;
      const pw = (W - G) / 2;
      return [
        { id: "panel-1", x: M, y: M, width: pw, height: topH },
        { id: "panel-2", x: M + pw + G, y: M, width: pw, height: topH },
        { id: "panel-3", x: M, y: M + topH + G, width: W, height: botH },
      ];
    })(),
  },
  {
    id: "layout:2-top-1-bottom",
    name: "2 en haut + 1 en bas",
    description: "2 cases en haut, 1 panoramique en bas — transition",
    panelCount: 3,
    panels: (() => {
      const topH = (H - G) / 2;
      const pw = (W - G) / 2;
      return [
        { id: "panel-1", x: M, y: M, width: pw, height: topH },
        { id: "panel-2", x: M + pw + G, y: M, width: pw, height: topH },
        { id: "panel-3", x: M, y: M + topH + G, width: W, height: topH },
      ];
    })(),
  },
  {
    id: "layout:1-large-3-small",
    name: "1 grande + 3 petites",
    description: "1 grande case en haut, 3 petites en bas — intro puis détails",
    panelCount: 4,
    panels: (() => {
      const topH = Math.round(H * 0.55);
      const botH = H - topH - G;
      const pw = (W - 2 * G) / 3;
      return [
        { id: "panel-1", x: M, y: M, width: W, height: topH },
        { id: "panel-2", x: M, y: M + topH + G, width: pw, height: botH },
        { id: "panel-3", x: M + pw + G, y: M + topH + G, width: pw, height: botH },
        { id: "panel-4", x: M + 2 * (pw + G), y: M + topH + G, width: pw, height: botH },
      ];
    })(),
  },
  {
    id: "layout:3-top-2-bottom",
    name: "3 en haut + 2 en bas",
    description: "5 cases — rythme soutenu, séquence d'action",
    panelCount: 5,
    panels: (() => {
      const topH = (H - G) / 2;
      const pw3 = (W - 2 * G) / 3;
      const pw2 = (W - G) / 2;
      return [
        { id: "panel-1", x: M, y: M, width: pw3, height: topH },
        { id: "panel-2", x: M + pw3 + G, y: M, width: pw3, height: topH },
        { id: "panel-3", x: M + 2 * (pw3 + G), y: M, width: pw3, height: topH },
        { id: "panel-4", x: M, y: M + topH + G, width: pw2, height: topH },
        { id: "panel-5", x: M + pw2 + G, y: M + topH + G, width: pw2, height: topH },
      ];
    })(),
  },
  {
    id: "layout:6-grid",
    name: "Grille 3×2",
    description: "6 cases — montage rapide, séquence narrative dense",
    panelCount: 6,
    panels: (() => {
      const pw = (W - 2 * G) / 3;
      const ph = (H - G) / 2;
      return [
        { id: "panel-1", x: M, y: M, width: pw, height: ph },
        { id: "panel-2", x: M + pw + G, y: M, width: pw, height: ph },
        { id: "panel-3", x: M + 2 * (pw + G), y: M, width: pw, height: ph },
        { id: "panel-4", x: M, y: M + ph + G, width: pw, height: ph },
        { id: "panel-5", x: M + pw + G, y: M + ph + G, width: pw, height: ph },
        { id: "panel-6", x: M + 2 * (pw + G), y: M + ph + G, width: pw, height: ph },
      ];
    })(),
  },
];

// --- Comic Structure (LLM output types) ---

export interface ComicSpeechBubble {
  character: string;
  text: string;
  type: "speech" | "thought" | "shout" | "whisper";
  position: { x: number; y: number }; // 0-1 relative to panel
}

export interface ComicCaption {
  text: string;
  position: "top" | "bottom";
}

export interface ComicPagePanel {
  panelId: string;
  sceneNumber: number;
  imagePrompt: string;
  aspectRatio?: string; // computed from layout panel dimensions
  caption?: ComicCaption;
  bubbles: ComicSpeechBubble[];
  imageUrl?: string | null;
  imageStatus?: "pending" | "processing" | "completed" | "failed";
}

const SUPPORTED_RATIOS = [
  { id: "16:9", value: 16 / 9 },
  { id: "9:16", value: 9 / 16 },
  { id: "4:3", value: 4 / 3 },
  { id: "3:4", value: 3 / 4 },
  { id: "1:1", value: 1 },
];

export function closestAspectRatio(width: number, height: number): string {
  const ratio = width / height;
  let best = SUPPORTED_RATIOS[0];
  let bestDiff = Math.abs(ratio - best.value);
  for (const r of SUPPORTED_RATIOS) {
    const diff = Math.abs(ratio - r.value);
    if (diff < bestDiff) {
      best = r;
      bestDiff = diff;
    }
  }
  return best.id;
}

export interface ComicPage {
  pageNumber: number;
  layoutId: string;
  panels: ComicPagePanel[];
}

export interface ComicCover {
  imagePrompt: string;
  imageUrl?: string | null;
  imageStatus?: "pending" | "processing" | "completed" | "failed";
}

export interface ComicStructure {
  title: string;
  cover?: ComicCover;
  pages: ComicPage[];
}
