# Feature: Script-to-Video Scene Generator

## Objectif

Transformer un script narratif (Markdown) en une série de scènes visuelles pour YouTube/TikTok. L'application génère plusieurs variantes d'images par scène via différents modèles IA (Replicate), permet de choisir la meilleure, puis anime les images sélectionnées en clips vidéo.

Le livrable final : un ensemble de clips vidéo (un par scène) prêts à être envoyés à un monteur.

---

## Workflow global

```
Script (.md) → Découpage en scènes (LLM) → Génération de prompts visuels (LLM)
→ Génération d'images (Replicate, multi-modèles) → Sélection manuelle (UI web)
→ Génération de prompts d'animation (LLM) → Animation image→vidéo (Replicate)
→ Export des clips finaux
```

---

## Étape 1 : Import et découpage du script

**Input** : Un fichier Markdown type `script-example.md` contenant un texte narratif avec timestamps.

**Traitement** :
- Un LLM (Claude) analyse le script et le découpe en scènes cohérentes
- Le découpage est intelligent : il se base sur les changements de lieu, d'action, d'ambiance, de personnage — pas mécaniquement sur les paragraphes
- Chaque scène produite contient :
  - Un identifiant (`scene_001`, `scene_002`, ...)
  - Le texte narratif source correspondant
  - Le timestamp de début/fin dans le script
  - Un titre court généré (ex: "Le piratage de Tupperware")
  - Des tags descriptifs générés (ex: `hacking`, `tension`, `bureau`)

**Output** : Liste de scènes stockées en base de données, associées au projet.

---

## Étape 2 : Génération des prompts visuels

**Traitement** :
- Pour chaque scène, un LLM génère un prompt de génération d'image
- Le prompt doit respecter le style visuel de référence (voir `/image-generation-examples/`) :
  - Style 3D, personnages type mannequin/low-poly
  - Éclairage cinématique, ambiance sombre avec accents colorés (rouge, bleu, cyan)
  - Décors minimalistes mais expressifs
- Le prompt est adapté à chaque modèle de génération (certains modèles ont des syntaxes ou des forces différentes)
- L'utilisateur peut éditer le prompt avant de lancer la génération

---

## Étape 3 : Génération des images (Replicate)

**Modèles configurés** (facilement extensible) :
| Modèle | Identifiant Replicate |
|---|---|
| Nano Banana | À configurer |
| Nano Banana Pro | À configurer |
| Flux | À configurer |

**Configuration** :
- Nombre d'images par scène : **configurable** (défaut : 2 pour limiter les coûts au départ)
- Les images sont générées en parallèle via l'API Replicate
- Chaque image est associée en DB à : sa scène, son modèle, son prompt, l'URL Replicate, le statut de génération

**Gestion des coûts** :
- Estimation du coût affichée avant lancement (basée sur le nombre de scènes × images × modèles)
- Possibilité de ne générer que pour certaines scènes ou certains modèles

---

## Étape 4 : Sélection des images (UI Web React)

**Interface de référence** : voir `product-developement/app-screen-1.png`

**Fonctionnalités** :
- Navigation scène par scène (← Prev / Next →)
- Barre de progression (ex: "Scene 5/12 — 40%")
- Pour chaque scène :
  - Affichage du titre, des tags, du prompt (tronqué avec "Show more")
  - Grille d'images (2x2 ou adaptative selon le nombre)
  - Chaque image affiche le nom du modèle utilisé
  - Actions par image : sélectionner (checkmark vert), régénérer, éditer le prompt, voir en plein écran
- Onglets "Images" / "Clips" (pour la phase animation)
- Vue d'ensemble : liste de toutes les scènes avec statut (images générées, image sélectionnée, clip généré)

---

## Étape 5 : Animation des images sélectionnées

**Traitement** :
- Pour chaque image sélectionnée, un LLM génère un prompt d'animation basé sur :
  - Le texte narratif de la scène
  - Le contenu de l'image
  - Des instructions cinématiques : angle de caméra, mouvement (pan, zoom, travelling), vitesse, durée
- L'utilisateur peut éditer le prompt d'animation avant lancement

**Modèles d'animation (image→vidéo)** :
| Modèle | Usage |
|---|---|
| Stable Video Diffusion | Référence |
| Kling | Alternative |
| Runway (via Replicate) | Alternative |

- Comme pour les images : plusieurs variantes générées, l'utilisateur choisit la meilleure
- Chaque clip est associé en DB à : sa scène, son image source, son modèle, son prompt d'animation, l'URL, le statut

---

## Étape 6 : Export

- Vue récapitulative de toutes les scènes avec le clip sélectionné
- Export/download de tous les clips en une fois (ou un par un)
- Les clips sont nommés séquentiellement (`scene_001.mp4`, `scene_002.mp4`, ...)

---

## Modèle de données

```
Project
├── id, title, scriptContent, scriptFilePath, status, config (JSON), createdAt

Scene (belongs to Project)
├── id, projectId, sceneNumber, title, narrativeText, startTimestamp, endTimestamp
├── tags (JSON array), imagePrompt, animationPrompt, status
├── selectedImageId, selectedClipId

GeneratedImage (belongs to Scene)
├── id, sceneId, model, prompt, imageUrl, replicatePredictionId
├── status (pending | processing | completed | failed), isSelected, createdAt

GeneratedClip (belongs to Scene)
├── id, sceneId, sourceImageId, model, animationPrompt, clipUrl, replicatePredictionId
├── status (pending | processing | completed | failed), isSelected, createdAt
```

---

## Stack technique

- **Backend** : Express.js (existant) + Prisma + PostgreSQL
- **Frontend** : React + Vite (existant)
- **API IA** : Replicate (génération d'images et animation)
- **LLM** : Claude API (découpage du script, génération de prompts visuels et d'animation)
- **Stockage** : URLs Replicate en base de données (pas de stockage fichier local)

---

## Configuration (par projet)

```json
{
  "imagesPerScene": 2,
  "imageModels": ["nano-banana", "nano-banana-pro", "flux"],
  "animationModels": ["stable-video-diffusion", "kling", "runway"],
  "stylePromptPrefix": "3D render, mannequin-style characters, cinematic dark lighting, minimalist scene",
  "maxScenes": null
}
```

---

## Contraintes

- **Coût** : commencer avec 2 images/scène et peu de scènes. Le nombre est configurable.
- **Async** : la génération Replicate est asynchrone (webhooks ou polling). L'UI doit refléter l'état en temps réel.
- **Extensibilité** : ajouter un nouveau modèle = ajouter une entrée dans la config, pas de changement de code.
