# Feature: UGC Factory — Générateur de vidéos UGC par IA

## Objectif

Transformer la description d'un produit logiciel (texte + captures d'écran) en une série de vidéos UGC (User Generated Content) prêtes à être utilisées en publicité. L'application génère des visages IA réalistes, propose des angles marketing adaptés au produit, et produit des vidéos "talking head" où les visages sélectionnés délivrent les scripts générés.

Le livrable final : un ensemble de vidéos UGC (un visage IA qui parle face caméra, avec conviction) prêtes à être diffusées sur TikTok, Instagram Reels, YouTube Shorts ou en ads.

---

## Workflow global

```
Description produit + screenshots → Analyse produit (LLM)
→ Génération d'angles marketing & scripts (LLM)
→ Génération de visages IA (fal.ai, multi-modèles)
→ Sélection des visages (UI web)
→ Génération de talking head vidéos (visage + audio TTS)
→ Export des UGC finaux
```

---

## Étape 1 : Création du projet produit

**Input** :
- Nom du produit
- Description textuelle du produit (ce qu'il fait, pour qui, fonctionnalités clés)
- Images de référence : captures d'écran de l'app, logo, visuels marketing existants (upload)
- URL du site web (optionnel — pour enrichir le contexte)
- Cible marketing (ex: "coaches fitness", "freelances", "e-commerçants")

**Traitement** :
- Un LLM (Claude) analyse la description, les screenshots et la cible pour produire un résumé structuré du produit :
  - Proposition de valeur principale
  - Fonctionnalités clés (top 5-10)
  - Pain points résolus
  - Audience cible détaillée
  - Ton recommandé (inspirant, urgence, éducatif, témoignage…)

**Output** : Un profil produit stocké en base, associé au projet.

---

## Étape 2 : Génération des angles marketing & scripts

**Traitement** :
- À partir du profil produit, un LLM génère **N angles marketing** (configurable, défaut : 5). Les angles s'appuient sur les frameworks et stratégies des meilleurs ouvrages de marketing/copywriting :
  - *$100M Leads* — Alex Hormozi (lead magnets, value equation, dream outcome)
  - *$100M Offers* — Alex Hormozi (offre irrésistible, stacking, urgence/scarcité)
  - *Building a StoryBrand* — Donald Miller (framework SB7 : le client est le héros, le produit est le guide)
  - *Influence* — Robert Cialdini (6 principes : réciprocité, engagement, preuve sociale, autorité, rareté, sympathie)
  - *Breakthrough Advertising* — Eugene Schwartz (niveaux de conscience du prospect, sophistication du marché)
  - *The Adweek Copywriting Handbook* — Joseph Sugarman (slippery slide, psychological triggers)
  - *Ogilvy on Advertising* — David Ogilvy (headlines, long copy, crédibilité)
  - *Contagious* — Jonah Berger (STEPPS : Social currency, Triggers, Emotion, Public, Practical value, Stories)
- Chaque angle est une approche différente pour vendre le produit :
  - **Angle "pain point"** : "T'en as marre de gérer tes clients sur 15 apps différentes ?"
  - **Angle "transformation"** : "En 3 mois j'ai doublé mon nombre de clients grâce à…"
  - **Angle "social proof"** : "Mes clients me demandent tous comment je fais pour être aussi organisé…"
  - **Angle "feature spotlight"** : "Cette fonctionnalité a changé ma façon de coacher…"
  - **Angle "comparison"** : "J'utilisais X avant, maintenant je ne pourrais plus revenir en arrière…"
- Pour chaque angle, le LLM génère :
  - Un titre court (pour identifier l'angle)
  - Le hook (les 3 premières secondes, cruciales)
  - Le script complet (30s, 60s, 90s — 3 variantes de durée)
  - Les instructions de ton et d'émotion (enthousiaste, confidentiel, indigné, surpris…)
  - Les call-to-action suggérés
- L'utilisateur peut éditer chaque script avant de passer à l'étape suivante

---

## Étape 3 : Génération de visages IA

**Traitement** :
- Le LLM génère des descriptions de personas adaptés à la cible du produit (âge, genre, style, ethnicité, contexte — ex: "femme 30 ans, sportive, fond neutre, éclairage naturel, t-shirt décontracté")
- Pour chaque persona, on génère des visages via **plusieurs modèles IA** (comme pour les images de scènes dans le projet vidéo) : chaque modèle produit sa propre variante du même persona
- Les visages doivent être réalistes, en vue de face/légèrement de côté, expression neutre ou légèrement souriante, haute résolution
- Le fond est neutre ou contextuel (bureau, salle de sport, café…) selon la cible

**Modèles configurés** (extensible) :
| Modèle | Identifiant fal.ai | Usage |
|---|---|---|
| Flux Pro (portrait) | À configurer | Portraits réalistes haute qualité |
| Flux Dev | À configurer | Alternative rapide |
| SDXL Lightning | À configurer | Génération ultra-rapide |
| Ideogram | À configurer | Style naturel/photographique |

- Chaque modèle génère **1 image par persona** → pour 4 personas × 4 modèles = 16 visages générés
- Les images sont générées en parallèle via l'API fal.ai

**Configuration** :
- Nombre de personas : configurable (défaut : 4)
- Modèles de visages : liste configurable (défaut : tous les modèles ci-dessus)

---

## Étape 4 : Sélection des visages (UI Web React)

**Interface** : même principe que la sélection d'images par scène dans le projet vidéo.

**Fonctionnalités** :
- Navigation persona par persona (← Prev / Next →)
- Barre de progression (ex: "Persona 2/4 — 50%")
- Pour chaque persona :
  - Description du persona (âge, style, contexte)
  - Prompt utilisé (tronqué avec "Show more")
  - Grille d'images : une par modèle, avec le nom du modèle affiché sur chaque carte
  - Actions par image : **sélectionner** (checkmark vert), **régénérer** (relance ce modèle), éditer le prompt
- Sélection multiple : l'utilisateur choisit **1 ou plusieurs visages** (potentiellement de personas différents) pour lesquels générer des vidéos
- Bouton "Generate All Faces" pour lancer la génération de tous les personas d'un coup
- Bouton "Regenerate" par image individuelle (relance un seul modèle pour un persona)
- Vue d'ensemble : liste de tous les personas avec statut (faces générées, face sélectionnée)
- Matrice de sélection finale : cocher les combinaisons visage/angle souhaitées avant de passer à l'étape 5

---

## Étape 5 : Génération des talking head vidéos

**Traitement** :
Pour chaque combinaison (visage sélectionné × script sélectionné) :

1. **Génération audio (TTS)** :
   - Le script est converti en audio via ElevenLabs
   - Voix configurable par projet (ou par persona)
   - Ton et émotion adaptés aux instructions du script
   - Durée : selon la variante choisie (30s / 60s / 90s)

2. **Génération de la talking head vidéo** :
   - Le visage IA + l'audio sont combinés pour créer une vidéo où le visage "parle"
   - Lip sync réaliste, micro-expressions, légers mouvements de tête
   - Modèles image-to-video spécialisés lip sync (fal.ai)

**Modèles de lip sync (image + audio → vidéo)** :
| Modèle | Usage |
|---|---|
| SadTalker | Référence open-source |
| Wav2Lip | Alternative lip sync |
| HeyGen-style (fal.ai) | Premium |
| MuseTalk | Alternative |

- Plusieurs variantes possibles par combinaison
- L'utilisateur peut prévisualiser et sélectionner la meilleure

---

## Étape 6 : Export

- Vue récapitulative : grille de toutes les vidéos générées (visage × angle × durée)
- Filtres par visage, par angle, par durée
- Download individuel ou batch (ZIP)
- Nommage : `{persona}_{angle}_{duration}.mp4` (ex: `coach-femme_pain-point_30s.mp4`)
- Optionnel : ajout de sous-titres brûlés dans la vidéo (style TikTok, animés mot par mot)

---

## Modèle de données

```
Project
├── id, name, productDescription, targetAudience, websiteUrl
├── status, config (JSON), createdAt
├── referenceImages[] (uploads)

ProductProfile (belongs to Project)
├── id, projectId, valueProp, keyFeatures (JSON), painPoints (JSON)
├── audienceDetail, recommendedTone, createdAt

MarketingAngle (belongs to Project)
├── id, projectId, angleName, angleType, hook
├── script30s, script60s, script90s
├── toneInstructions, callToAction
├── isSelected, sortOrder, createdAt

Persona (belongs to Project)
├── id, projectId, description, age, gender, style, context
├── sortOrder, createdAt

GeneratedFace (belongs to Persona)
├── id, personaId, model, prompt, imageUrl, falRequestId
├── status (pending | processing | completed | failed), isSelected, createdAt

GeneratedUGC (belongs to Project)
├── id, projectId, faceId, angleId, duration (30 | 60 | 90)
├── audioUrl, videoUrl, falRequestId
├── voiceId, ttsModel
├── status (pending | audio_generating | video_generating | completed | failed)
├── isSelected, createdAt
```

---

## Stack technique

- **Backend** : Express.js + Prisma + PostgreSQL
- **Frontend** : React + Vite
- **API IA images** : fal.ai (génération de visages)
- **API IA vidéo** : fal.ai (lip sync / talking head)
- **API TTS** : ElevenLabs (text-to-speech)
- **LLM** : Claude API (analyse produit, angles marketing, scripts, descriptions personas)
- **Stockage** : fichiers locaux (public/) avec URLs relatives en base

---

## Configuration (par projet)

```json
{
  "personasCount": 4,
  "facesPerPersona": 3,
  "anglesCount": 5,
  "durations": [30, 60, 90],
  "faceModels": ["flux-portrait", "sdxl-face"],
  "lipSyncModels": ["sadtalker", "wav2lip"],
  "voiceId": "",
  "ttsModel": "eleven_multilingual_v2",
  "subtitles": false,
  "format": "9:16"
}
```

---

## Contraintes

- **Coût** : commencer avec peu de personas/variantes. Chaque talking head vidéo = 1 appel TTS + 1 appel lip sync. Estimation affichée avant lancement.
- **Async** : toutes les générations (visages, audio, vidéo) sont asynchrones. L'UI reflète l'état en temps réel via polling.
- **Parallélisation** : les appels fal.ai et ElevenLabs sont fire-and-poll en parallèle, pas séquentiels.
- **Extensibilité** : ajouter un nouveau modèle de lip sync ou de visage = ajouter une entrée dans la config.
- **Format** : par défaut 9:16 (vertical, optimisé TikTok/Reels/Shorts). Configurable en 16:9 ou 1:1.
- **Qualité UGC** : les vidéos doivent sembler authentiques et naturelles, pas trop "produites". Le style UGC est volontairement imparfait (caméra frontale, éclairage naturel).
