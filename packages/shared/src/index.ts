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

export type VideoFormat = "16:9" | "9:16" | "4:5" | "5:4" | "4:3" | "3:4";

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
- Background: black mode (black/light gray with subtle grid lines like notebook paper, with a faint repeating 'FD' watermark pattern) and dark mode (dark charcoal #1A1A1A with subtle grid lines).
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
    id: "builtin:niche-carousel",
    name: "Carrousel Niches / Instagram",
    description: "Slides Instagram carrousel, typo ultra-bold, badges colorés, illustrations 3D thématiques, mode clair ou sombre",
    sourceId: "builtin:niche-carousel",
    stylePromptPrefix: "Modern Instagram carousel slide design, ultra-bold heavy sans-serif uppercase typography as the dominant visual element, bright red-orange (#FF5722) rounded rectangle banners behind key words, yellow (#FFD600) highlighted badge labels, orange circle bullet point icons, stylized 3D character illustration or 3D thematic icon matching the topic, clean graphic layout, social media infographic aesthetic, square 1:1 format",
    llmSystemInstructions: `- CRITICAL: Each image MUST look like a single slide from a polished Instagram carousel. The composition is dominated by BOLD TYPOGRAPHY — massive uppercase sans-serif headlines that take up 30-50% of the image area. Text IS the design, not an afterthought.
  - BACKGROUND — TWO MODES depending on project backgroundMode setting:
    - DARK MODE (default): pure black (#0A0A0A) background with a subtle thin gray grid pattern (~40px spacing, ~10% opacity). Text is white. The red-orange banners and yellow badges pop against the dark background. 3D illustrations use vibrant colors that contrast with the dark backdrop.
    - LIGHT MODE: clean white (#FFFFFF) or very light gray (#F5F5F5) background with a subtle thin light gray grid pattern (~40px spacing, ~15% opacity). Main text is black (#1A1A1A). Red-orange (#FF5722) banners keep the same vivid color. Yellow (#FFD600) badges remain bright. Bullet point icons stay orange. 3D illustrations may use slightly softer tones to harmonize with the light background. The overall feel shifts from "bold nighttime energy" to "clean daytime professionalism" while keeping the same layout and typographic hierarchy.
  - TYPOGRAPHY HIERARCHY: (1) Main keyword/title in ultra-bold uppercase (white in dark mode, black in light mode), very large, often split across 2 lines. (2) A secondary keyword or phrase inside a bright red-orange (#FF5722) rounded rectangle banner, slightly rotated (-3° to -5°) for dynamism — this is the most eye-catching element. (3) A short yellow (#FFD600) highlighted badge/label for demographic info (age range like "28-40 ANS", or a category tag like "SPORTIFS BLESSÉS"). (4) A subtitle in italic (white in dark mode, dark gray in light mode), medium weight, 1-2 lines describing the audience's pain point or desire. (5) Three short bullet points (white in dark mode, black in light mode), each preceded by an orange (#FF5722) filled circle with a white play/arrow icon inside.
  - 3D ILLUSTRATION: Include ONE stylized 3D character or 3D thematic object/icon that visually represents the niche. Characters are cartoon-style, friendly, slightly exaggerated proportions — NOT photorealistic. They should wear context-appropriate clothing and hold relevant props. Examples: a muscular coach with a water bottle, a person with crutches for injury recovery, an elderly person with dumbbells for seniors, a baby bottle icon for post-partum, a laptop with warning sign for sedentary workers. The illustration is placed to one side or overlapping the text, creating depth.
  - SLIDE NUMBERING: If this is part of a series, include a hand-drawn style number (1, 2, 3...) inside a circle (white with sketchy outline in dark mode, black with sketchy outline in light mode), positioned in the top-left corner.
  - COLOR PALETTE is strict: background follows mode (black or white), text follows mode (white or black), red-orange (#FF5722) for banners and bullet icons in BOTH modes, yellow (#FFD600) for badges/labels in BOTH modes. The accent colors remain identical regardless of mode — only the background and text colors flip.
  - The overall feel is energetic, bold, scroll-stopping — designed for Instagram discovery. Every slide should be instantly readable in 2 seconds: the big word grabs attention, the banner gives context, the bullets deliver value.
  - LANGUAGE: All text in the image MUST be in the language of the narrative (typically French). Headlines, badges, bullet points — everything in the target language.`,
    isBuiltin: true,
  },
  {
    id: "builtin:comic-bubbles",
    name: "BD avec Bulles",
    description: "Bande dessinée franco-belge avec bulles de dialogue, phylactères expressifs, onomatopées",
    sourceId: "builtin:comic-bubbles",
    stylePromptPrefix: "Franco-Belgian comic book style single panel illustration, expressive stylized characters with clean bold ink outlines, flat color fills, dynamic poses, vivid saturated colors, thick black contour lines, hand-drawn aesthetic, detailed semi-realistic backgrounds, with prominent speech bubbles and dialogue balloons. CRITICAL: NO white margins anywhere NEITHER ON THE LEFT SIDE NOR ON THE RIGHT SIDE NOR ON THE TOP SIDE NOR ON THE BOTTOM SIDE — the colored illustration must bleed to the left edge, right edge, top and bottom with zero padding. Do not leave any white or light-colored empty space at the sides of the image",
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
    id: "builtin:whiteboard",
    name: "Whiteboard / Excalidraw",
    description: "Style tableau blanc avec traits dessinés à la main, post-its, flèches, formes simples façon Miro/Excalidraw",
    sourceId: "builtin:whiteboard",
    stylePromptPrefix: "Hand-drawn whiteboard sketch style, rough imperfect lines like Excalidraw or Miro, clean white background, simple geometric shapes with hand-drawn wobbly outlines, sticky notes in pastel yellow pink blue and green, arrows and connectors between elements, marker pen aesthetic, minimal flat colors, diagram and brainstorm visual language",
    llmSystemInstructions: `- CRITICAL: Every scene MUST look like a collaborative whiteboard session — think Miro board, Excalidraw canvas, or a real office whiteboard photographed straight-on. The white background is essential and must dominate.
- Use hand-drawn, slightly wobbly lines for ALL shapes and connectors — nothing should look computer-perfect. Lines should have slight variations in thickness like a marker pen. Think of the Excalidraw hand-drawn style: imperfect rectangles, rough circles, sketchy arrows.
- Include typical whiteboard elements as visual building blocks: sticky notes (pastel yellow, pink, blue, green, orange) with short handwritten text, rectangles and rounded boxes for concepts, arrows and curved connectors showing relationships, dotted lines for groupings, simple icons (lightbulbs, checkmarks, crosses, stars, question marks).
- Characters should be represented as simple stick figures or basic doodle-style people — NOT detailed or realistic. Think whiteboard doodles: circle head, line body, simple limbs, minimal facial features (dot eyes, line mouth). But give them personality through posture, gestures, and simple accessories (a tie for business, a cap for casual).
- Use a limited color palette: mostly black marker lines on white, with pastel accent colors ONLY on sticky notes, highlights, and important elements. Occasional red for emphasis, green for positive, blue for information.
- The composition should feel like a zoomed-in section of a larger whiteboard: some elements may be slightly cut off at edges, there might be faint erased marks, a slight shadow from the marker. Include visual hierarchy through size — important concepts are bigger.
- Text elements on the whiteboard should look handwritten in a casual, slightly messy style — like someone quickly jotting during a brainstorm. Keep text short: labels, keywords, short phrases. NOT paragraphs.
- Add subtle whiteboard authenticity: slight marker smudges, a barely visible grid or dot pattern on the background, maybe a corner of a different colored marker visible, slight shadows under sticky notes suggesting they're physically stuck on.`,
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
  {
    id: "builtin:excalidraw",
    name: "Excalidraw Export",
    description: "Diagrammes et schémas identiques à un export Excalidraw : traits rough.js, police Virgil, fond blanc pur, zéro personnage",
    sourceId: "builtin:excalidraw",
    stylePromptPrefix: "Technical diagram that looks exactly like an Excalidraw canvas export, pure white background, hand-drawn wobbly imperfect lines made with rough.js library, Virgil handwriting font for all text labels, crosshatch pattern fills inside shapes, no people no faces no hands, clean minimal vector diagram aesthetic, flat muted colors from Excalidraw default palette",
    llmSystemInstructions: `- CRITICAL: AUCUN être humain, aucun visage, aucune main, aucun personnage. Ce style est un B-roll de type diagramme technique. Chaque image doit ressembler à un VRAI EXPORT PNG d'Excalidraw — quiconque regarde doit penser que c'est un vrai fichier .excalidraw exporté.
- FOND OBLIGATOIRE : blanc pur (#FFFFFF), aucune texture, aucun grain, aucune ombre portée sur le canvas. C'est un canvas numérique, pas du papier.
- TRAITS : toutes les lignes doivent avoir le style rough.js signature d'Excalidraw — légèrement ondulées, imparfaites, comme dessinées à main levée mais avec une régularité numérique. Les traits ne sont PAS parfaitement droits mais PAS non plus gribouillés. Épaisseur de trait constante (~2px), couleur de trait noire ou gris foncé (#1e1e1e).
- FORMES : rectangles aux coins légèrement arrondis avec wobble, ellipses imparfaites, losanges (diamants), lignes et flèches. Les flèches ont des pointes simples en V ouvert. Les connecteurs entre formes sont des lignes droites ou coudées avec des pointes de flèches.
- REMPLISSAGE : les formes remplies utilisent le motif "crosshatch" iconique d'Excalidraw — des lignes diagonales parallèles espacées régulièrement (~45°) à l'intérieur des formes, PAS un aplat de couleur uni. Alterner entre crosshatch et "solid" selon l'importance de l'élément.
- COULEURS : utiliser UNIQUEMENT la palette par défaut d'Excalidraw : bleu (#1971c2), rouge (#e03131), vert (#2f9e44), orange (#f08c00), violet (#9c36b5), rose (#c2255c), gris (#868e96). Les couleurs sont utilisées avec parcimonie — la majorité du diagramme reste en noir sur blanc, avec 2-3 couleurs d'accent maximum.
- TEXTE : tout le texte doit avoir l'apparence de la police "Virgil" d'Excalidraw — une écriture manuscrite numérique propre, légèrement irrégulière, PAS une police serif ou sans-serif classique. Le texte est toujours court : labels, titres, annotations de 1-5 mots.
- TYPES DE DIAGRAMMES à varier selon le sujet : flowcharts (décisions en losanges, process en rectangles), architecture systems (boxes connectées par des flèches), mind maps (nœud central + branches), séquence diagrams simplifiés, comparaisons côte à côte, listes avec checkboxes, timelines horizontales, matrices 2x2.
- COMPOSITION : le diagramme doit être centré sur le canvas avec de l'espace négatif autour (comme un vrai export Excalidraw avec du padding). Les éléments sont organisés avec un alignement approximatif mais lisible — pas pixel-perfect, mais pas chaotique non plus. C'est le sweet spot d'Excalidraw : organisé mais humain.
- NE PAS inclure : d'interface utilisateur Excalidraw (toolbar, sidebar), de curseur, de sélection bleue, de grille de fond. Seulement le contenu du canvas comme un export "Scene only".`,
    isBuiltin: true,
  },
  {
    id: "builtin:broll-ultra",
    name: "B-Roll Ultra Réaliste",
    description: "Plans d'ambiance cinématiques ultra réalistes, objets et marques reconnaissables, zéro personnage",
    sourceId: "builtin:broll-ultra",
    stylePromptPrefix: "Ultra photorealistic cinematic B-roll footage, shot on RED V-RAPTOR 8K, anamorphic lens, shallow depth of field, natural available lighting, no people no faces no hands, atmospheric environmental shot, film grain, professional color grading",
    llmSystemInstructions: `- CRITICAL: AUCUN être humain, aucun visage, aucune main, aucun personnage ne doit apparaître. Le B-Roll est exclusivement composé de plans d'ambiance, d'objets, d'environnements et de détails.
- Les objets et environnements DOIVENT être RECONNAISSABLES et RÉELS — pas génériques. Utiliser des marques, logos, interfaces et produits que tout le monde connaît : un MacBook Pro ouvert sur une page ChatGPT, un iPhone posé sur une table avec des notifications, un écran Bloomberg Terminal, une canette Red Bull à côté d'un clavier mécanique, un café Starbucks sur un bureau, des AirPods dans leur boîtier, un écran avec du code sur VS Code, un dashboard Google Analytics, une Tesla garée, un logo Netflix sur un écran de salon, des sneakers Nike posées au sol. Ces détails reconnaissables rendent le plan immédiatement crédible et relatable.
- Chaque prompt doit décrire un PLAN CINÉMATIQUE précis comme un directeur photo : angle (plongée, contre-plongée, ras du sol, overhead), profondeur de champ (shallow focus sur un objet au premier plan, arrière-plan en bokeh), éclairage (golden hour, néons, lumière naturelle traversant une fenêtre, clair-obscur, écran luisant dans le noir).
- Les plans doivent être CONTEXTUELS au sujet de la vidéo — pas génériques. Si la vidéo parle de tech, montrer des détails d'écrans avec des interfaces reconnaissables, câbles USB-C, setup gaming RGB. Si c'est de la finance, un écran TradingView, des graphiques en chandelier, un Wall Street Journal ouvert. Chaque plan doit servir le récit.
- Varier les ÉCHELLES DE PLAN : macro extrême (texture d'un clavier Cherry MX, gouttes de condensation sur une canette, connecteur Lightning), plan moyen (un bureau home office complet, une vitrine de magasin), plan large (skyline reconnaissable comme Manhattan/La Défense, vue aérienne d'une ville la nuit).
- Spécifier des paramètres caméra réalistes : focale (24mm grand angle paysages, 50mm plans moyens, 85mm détails, 100mm macro textures), ouverture (f/1.4 bokeh crémeux, f/8 netteté), capteur full-frame.
- Inclure des éléments atmosphériques vivants : particules de poussière dans un rayon de lumière, vapeur de café, reflets sur des surfaces en verre, LEDs clignotantes, lumière d'écran projetée sur un mur dans le noir, fumée subtile.
- Color grading cinématique cohérent : orange/teal look, désaturé sophistiqué, ou haut contraste selon l'ambiance. Jamais saturé ou "Instagram filter".`,
    isBuiltin: true,
  },
  {
    id: "builtin:google-earth",
    name: "Google Earth Zoom",
    description: "Vue satellite qui zoome sur un lieu réel — style Google Earth, de l'orbite jusqu'à la rue",
    sourceId: "builtin:google-earth",
    stylePromptPrefix: "Photorealistic view of Earth from space, the full globe visible against black starfield, thin blue atmospheric halo along the horizon, continents and oceans clearly recognizable, no people no faces, Google Earth satellite imagery style, glowing pinpoint of light marking the target location on the surface",
    llmSystemInstructions: `- CRITIQUE : AUCUN être humain, aucun personnage, aucun visage. L'image est une VUE DE LA TERRE DEPUIS L'ESPACE — le globe entier visible, fond noir, étoiles en arrière-plan. C'est le point de départ du zoom, pas une vue aérienne rapprochée.
- L'image DOIT montrer la planète Terre entière ou quasi-entière dans le cadre : continents reconnaissables, masses océaniques bleues, nuages blancs tourbillonnants, atmosphère translucide bleutée sur les bords du globe. Style photo NASA/ISS ultra-réaliste.
- Sur la surface du globe, un POINT LUMINEUX discret marque le lieu cible de la scène : petit halo lumineux ou dot blanc brillant, comme une épingle Google Earth vue de l'espace. Il doit être localisé avec précision sur le bon continent/pays. Exemples : Silicon Valley → point sur la côte Pacifique de l'Amérique du Nord, Paris → point sur l'Europe de l'Ouest, Tokyo → archipel japonais.
- ORIENTATION du globe : faire pivoter la Terre pour que le lieu cible soit clairement visible, pas caché derrière la courbure. Le point lumineux doit être dans la moitié visible du globe, idéalement légèrement décentré vers le spectateur.
- QUALITÉ : photo spatiale pro style NASA Blue Marble ou ISS window shot. Éclairage solaire rasant (terminator line visible si possible), ombres des nuages sur les océans, reflets solaires sur les mers. Fond spatial profond avec quelques étoiles distantes très discrètes.
- NE PAS générer une vue aérienne de ville, une carte topographique, ou une image satellite rapprochée. L'image est TOUJOURS la Terre vue de l'espace, globe entier.`,
    isBuiltin: true,
  },
  {
    id: "builtin:big-word",
    name: "Mot en Plein Écran",
    description: "Un seul mot géant centré sur fond uni, typographie impactante style kinetic typography",
    sourceId: "builtin:big-word",
    stylePromptPrefix: "Minimalist full-bleed typographic poster, single bold word centered on solid color background, massive display typeface, no people no illustrations no decorations, pure graphic design",
    llmSystemInstructions: `- CRITIQUE : chaque image ne contient QU'UN SEUL MOT. Un seul. Pas une phrase, pas un slogan — juste UN MOT qui capture l'essence de la scène. Choisis le mot le plus fort, le plus évocateur, celui qui concentre toute l'émotion ou l'idée clé. Exemples : "RÉVOLUTION", "CONNEXION", "POUVOIR", "VITESSE", "RUPTURE".
- Le mot doit être en MAJUSCULES, typographie ultra-bold, taille maximale — il doit occuper 60-80% de la largeur de l'image. Fonte sans-serif impactante (Helvetica Neue Black, Futura Bold, Impact, DIN Condensed) OU serif dramatique (Playfair Display Black, Bodoni Bold).
- FOND UNI : choisir une couleur de fond forte qui amplifie l'émotion du mot. Noir (#000000) pour la puissance/mystère, blanc (#FFFFFF) pour la clarté/vide, rouge vif pour l'urgence/passion, bleu profond pour la technologie/confiance, jaune éclatant pour l'énergie/attention, vert saturé pour la croissance/nature. La couleur du texte doit contraster au maximum avec le fond.
- COMPOSITION : le mot est centré horizontalement et verticalement sur le fond uni. Rien d'autre — pas d'icône, pas de sous-titre, pas de ligne décorative, pas de logo. Le fond peut avoir une légère texture subtile (grain de film, papier) mais pas de gradient visible.
- COULEUR DU TEXTE : blanc sur fond sombre, noir sur fond clair, ou couleur complémentaire forte. Jamais une couleur qui réduit le contraste.
- Optionnel : une fine ligne ou un cadre minimal (1-2px) peut encadrer le mot pour l'ancrer, style affiche constructiviste.
- Le résultat doit ressembler à une affiche typographique internationale, un titre de film en cinémascope, ou un slide d'ouverture de conférence TED.`,
    isBuiltin: true,
  },
  {
    id: "builtin:bic-paper",
    name: "Cahier d'écolier / Stylo Bic",
    description: "Texte et schémas écrits au stylo bic bleu sur papier A4 quadrillé, style cahier d'école réaliste",
    sourceId: "builtin:bic-paper",
    stylePromptPrefix: "Photorealistic handwritten notes on A4 French school graph paper (papier quadrillé Séyès), blue ballpoint pen ink, authentic school notebook aesthetic, slight paper texture, realistic ink variation",
    llmSystemInstructions: `- CRITIQUE : tout le contenu visuel doit ressembler à une vraie page de cahier d'écolier français photographiée. Le papier, l'encre, les irrégularités — tout doit être photoréaliste, pas illustré.
- PAPIER : papier A4 quadrillé type Séyès (petits carreaux 5mm × 5mm, lignes bleu très clair sur fond blanc légèrement crème/ivoire). Une marge verticale rouge à gauche (~3cm). Les trous de perforation sont visibles sur le bord gauche. Le papier a une légère texture, pas parfaitement lisse. Lumière naturelle rasante qui crée de légères ombres dans les creux du papier.
- ENCRE : stylo bic bleu classique (bleu roi #0047AB légèrement désaturé). L'encre a une légère variation de pression : plus épaisse quand la vitesse d'écriture ralentit, plus fine dans les lignes droites rapides. Très léger reflet de l'encre fraîche par endroits. PAS de noir, PAS d'autres couleurs sauf une éventuelle annotation au crayon à papier (gris très clair, trace effaçable).
- ÉCRITURE : écriture cursive d'adulte (pas d'enfant), appliquée mais naturelle — pas trop calligraphiée, pas trop brouillon. Légère inclinaison droite typique (~10-15°). Les mots importants peuvent être SOULIGNÉS au bic bleu (trait droit à la règle ou à main levée). Les titres peuvent être en majuscules d'imprimerie.
- SCHÉMAS : si la scène inclut un concept visuel, ajouter un croquis au bic bleu dans la marge ou en bas de page — fleches, encadrés, diagrammes simples dessinés à main levée. Traits imparfaits, pas vectoriels. Chiffres et formules si pertinent.
- DÉTAILS D'AUTHENTICITÉ : une légère pression du stylo visible en relief au verso imaginaire, quelques ratures ou corrections (un mot barré d'un trait horizontal propre), date "${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}" écrite au bic en haut à droite de la feuille, marge respectée avec soin. L'angle de vue est légèrement de biais (pas parfaitement plat) comme si on photographiait sa feuille posée sur un bureau.
- LANGUE : tout le texte écrit sur la feuille DOIT être dans la langue de la narration.`,
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
  { id: "flux-2-klein-4b", label: "Flux 2 Klein 4B" },
  { id: "flux-2-klein-9b", label: "Flux 2 Klein 9B" },
  { id: "qwen-image-2", label: "Qwen Image 2" },
  { id: "qwen-image-2-pro", label: "Qwen Image 2 Pro" },
  { id: "qwen-image-max", label: "Qwen Image Max" },
  { id: "seedream-v5-lite", label: "Seedream v5 Lite" },
  { id: "recraft-v4", label: "Recraft V4" },
  { id: "recraft-v4-pro", label: "Recraft V4 Pro" },
  { id: "recraft-v4-vector", label: "Recraft V4 Vector (SVG)" },
  { id: "kling-image-v3", label: "Kling Image v3" },
  { id: "kling-image-o3", label: "Kling Image O3" },
  { id: "grok-image", label: "Grok Imagine" },
  { id: "hunyuan-v3", label: "Hunyuan v3 Instruct" },
  { id: "z-image-lora", label: "Z-Image LoRA" },
  { id: "gpt-image-1.5", label: "GPT Image 1.5" },
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
  "kling-image-v3": [
    { id: "1K", label: "1K" },
    { id: "2K", label: "2K" },
  ],
  "kling-image-o3": [
    { id: "1K", label: "1K" },
    { id: "2K", label: "2K" },
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
  "flux-2-klein-4b": { basePrice: 0.01 },
  "flux-2-klein-9b": { basePrice: 0.012 },
  "qwen-image-2": { basePrice: 0.035 },
  "qwen-image-2-pro": { basePrice: 0.075 },
  "qwen-image-max": { basePrice: 0.075 },
  "seedream-v5-lite": { basePrice: 0.035 },
  "recraft-v4": { basePrice: 0.04 },
  "recraft-v4-pro": { basePrice: 0.25 },
  "recraft-v4-vector": { basePrice: 0.30 },
  "kling-image-v3": {
    basePrice: 0.028,
    resolutionPricing: { "1K": 0.028, "2K": 0.028 },
  },
  "kling-image-o3": {
    basePrice: 0.028,
    resolutionPricing: { "1K": 0.028, "2K": 0.028, "4K": 0.056 },
  },
  "grok-image": { basePrice: 0.02 },
  "hunyuan-v3": { basePrice: 0.09 },
  "z-image-lora": { basePrice: 0.012 },
  "gpt-image-1.5": { basePrice: 0.034 },
};

export const CLIP_MODEL_PRICING: Record<string, ClipModelPricing> = {
  "wan-i2v": { type: "flat", basePrice: 0.40 },
  "kling-v1.6": { type: "per_second", basePrice: 0.098 },
  "kling-v2.6-pro": { type: "per_second", basePrice: 0.07, audioPricePerSecond: 0.14 },
  "kling-o3-pro": { type: "per_second", basePrice: 0.224, audioPricePerSecond: 0.28 },
  "minimax": { type: "flat", basePrice: 0.50 },
  "veo3.1": { type: "per_second", basePrice: 0.20, audioPricePerSecond: 0.40 },
  "goal-force": { type: "flat", basePrice: 0.25 },
  "ltx-2.3-fast": { type: "per_second", basePrice: 0.04 },
  "ltx-2.3": { type: "per_second", basePrice: 0.06 },
  "cosmos-2.5": { type: "flat", basePrice: 0.20 },
  "heygen-avatar4": { type: "per_second", basePrice: 0.10 },
  "lucy-i2v": { type: "per_second", basePrice: 0.08 },
  "vidu-q3-turbo": { type: "per_second", basePrice: 0.035 },
  "vidu-q3": { type: "per_second", basePrice: 0.07 },
  "kling-o3-ref": { type: "per_second", basePrice: 0.084, audioPricePerSecond: 0.112 },
  "kling-v3-std": { type: "per_second", basePrice: 0.084, audioPricePerSecond: 0.126 },
  "kling-v3-pro": { type: "per_second", basePrice: 0.112, audioPricePerSecond: 0.168 },
  "grok-video": { type: "per_second", basePrice: 0.07 },
  "seedance-1.5": { type: "per_second", basePrice: 0.052, audioPricePerSecond: 0.052 },
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
  {
    id: "diagram-draw",
    name: "Diagram / Draw-in",
    description: "Éléments du diagramme qui apparaissent progressivement, comme dessinés en temps réel",
    prompt: "Elements of the diagram appear progressively as if being drawn in real-time by an invisible hand. Lines extend from start to end, shapes form stroke by stroke, text fades in after its box is complete, arrows animate along their path. The drawing order follows a logical flow: main structure first, then details, then labels. Smooth and steady pace, no camera movement. The background stays pure white. The feel is a whiteboard explainer or Excalidraw recording playback.",
  },
  {
    id: "zoom-focus",
    name: "Zoom Focus / Spotlight",
    description: "Zoom progressif sur une zone clé de l'image, puis dézoom lent",
    prompt: "Slow deliberate camera zoom toward the most important element in the scene — a key number, a highlighted area, a central figure, or a critical diagram node. The zoom is smooth and cinematic, reaching roughly 1.5x magnification over 60% of the duration, holds briefly, then gently pulls back to reveal the full image. No rotation, no shake. The rest of the scene stays static. The effect guides the viewer's eye like an editor's cut without any actual cut.",
  },
  {
    id: "text-reveal",
    name: "Typewriter / Text Reveal",
    description: "Le texte apparaît mot par mot ou ligne par ligne, le reste de l'image déjà visible",
    prompt: "The image structure (shapes, lines, backgrounds, icons) is fully visible from the start. Only the text elements animate: labels, titles, annotations, and captions appear word by word or line by line in reading order (top to bottom, left to right). Each text block materializes with a subtle fade-in or typewriter effect. No camera movement, no shape animation. The pacing matches a natural reading speed. The feel is a presentation slide building its bullet points.",
  },
  {
    id: "ambient-drift",
    name: "Drift ambient",
    description: "Micro-mouvement lent et organique, donne vie à une image statique sans direction précise",
    prompt: "Extremely subtle, slow, organic movement that makes a static image feel alive. Imperceptible camera drift — a gentle floating motion with no clear direction, combining micro-zoom (less than 5% scale change), very slight horizontal or vertical drift, and barely noticeable rotation (under 0.5 degrees). Atmospheric micro-details may shift: faint light flicker, soft particle drift, subtle shadow play. No abrupt motion, no clear start or end point. The effect is continuous and hypnotic, like a living wallpaper. Prevents the dead slideshow feel.",
  },
  {
    id: "handwriting",
    name: "Écriture Manuscrite",
    description: "Le mot ou texte se trace lettre par lettre comme écrit à la main, encre sur papier",
    prompt: "The text or word in the image is written progressively by an invisible hand, stroke by stroke, as if a fountain pen or marker is tracing the letters in real time. The ink flows smoothly along each letterform — thick downstrokes, thin upstrokes, ink pooling slightly at the start of each letter. The rest of the image background is already fully visible and static. The writing speed is calm and deliberate, like a calligrapher working carefully. After the last stroke, the pen lifts and there is a brief pause to let the completed word settle. No camera movement.",
  },
  {
    id: "google-earth-zoom",
    name: "Google Earth Zoom",
    description: "Descente vertigineuse depuis l'orbite jusqu'au sol, style Google Earth fly-through",
    prompt: "Google Earth fly-to animation starting from full Earth view in space. The entire planet is visible against a black starfield. A glowing pinpoint on the surface marks the destination. The camera begins its descent: Earth slowly rotates and grows, filling more and more of the frame. The atmosphere thickens, continental shapes sharpen, then regional geography appears, then city grid, then streets and individual buildings rush up to fill the screen. The speed starts slow — majestic, cosmic — then accelerates as the target approaches, ending in a low aerial view of the destination with crisp ground detail. One single uninterrupted plunge from orbit to street level. No cuts.",
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
  { id: "goal-force", label: "Goal Force" },
  { id: "ltx-2.3-fast", label: "LTX 2.3 Fast" },
  { id: "ltx-2.3", label: "LTX 2.3" },
  { id: "cosmos-2.5", label: "Cosmos Predict 2.5" },
  { id: "heygen-avatar4", label: "HeyGen Avatar4" },
  { id: "lucy-i2v", label: "Lucy I2V (Decart)" },
  { id: "vidu-q3-turbo", label: "Vidu Q3 Turbo" },
  { id: "vidu-q3", label: "Vidu Q3" },
  { id: "kling-o3-ref", label: "Kling O3 Ref-to-Video" },
  { id: "kling-v3-std", label: "Kling v3 Standard" },
  { id: "kling-v3-pro", label: "Kling v3 Pro" },
  { id: "grok-video", label: "Grok Imagine Video" },
  { id: "seedance-1.5", label: "Seedance v1.5 Pro" },
];

export type TextLanguage = "French" | "English" | "Spanish";

export const AVAILABLE_TEXT_LANGUAGES: { id: TextLanguage; label: string }[] = [
  { id: "French", label: "Francais" },
  { id: "English", label: "English" },
  { id: "Spanish", label: "Espanol" },
];

export type BackgroundMode = "light" | "dark";

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
  backgroundMode?: BackgroundMode;
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
  { id: "4:5", value: 4 / 5 },
  { id: "5:4", value: 5 / 4 },
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
  backCover?: ComicCover;
  pages: ComicPage[];
}
