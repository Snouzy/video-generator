# Export comic BD → Canva

## Vue d'ensemble

Chaque page Canva reçoit **deux éléments indépendants** :
1. **Artworks des panels** — images insérées chacune à sa position exacte (x/y/width/height)
2. **Structure overlay** — PNG transparent avec les bordures de panels, captions et bulles, en pleine page par-dessus

Les deux éléments sont dissociés dans Canva : on peut modifier l'artwork d'un panel ou éditer la structure indépendamment.

---

## Étape 1 — Générer les éléments et les uploader sur R2

```
POST /api/projects/{projectId}/comic/render-structure-pages
```

Pour chaque page du `comic-structure`, le serveur :
1. Génère un SVG structure-only (bordures + captions + bulles, fond transparent, sans images) → rasterise en PNG 794×1123
2. Upload sur R2 sous `comic/{id}/pages/structure_001.png`, `structure_002.png`, etc.
3. Upload chaque artwork de panel sur R2 sous `comic/{id}/panels/{panelId}.ext`
4. Retourne les coordonnées Canva pré-calculées (espace BD 595×842 → Canva 794×1123, scale ≈ 1.3344)

Réponse :
```json
{
  "title": "La Naissance de JavaScript",
  "totalPages": 33,
  "pages": [
    {
      "pageNumber": 1,
      "structureUrl": "https://images.fitlinks.io/comic/28/pages/structure_001.png",
      "panels": [
        {
          "panelId": "p1-panel-1",
          "artworkUrl": "https://images.fitlinks.io/comic/28/panels/p1-panel-1.webp",
          "canvaX": 36, "canvaY": 36, "canvaWidth": 741, "canvaHeight": 1070
        }
      ]
    }
  ]
}
```

- `artworkUrl` est `null` si l'image du panel n'a pas encore été générée
- Les coordonnées `canvaX/Y/Width/Height` sont déjà dans l'espace **794×1123px** (Canva)

---

## Étape 2 — Créer / dupliquer le design Canva

**Canva MCP ne sait pas ajouter des pages à un design existant.** Dupliquer manuellement le design de référence "Comic - Git" (`DAHFLxADvGA`, 54 pages) depuis le navigateur.

Le nombre de pages utiles = `totalPages` retourné par l'endpoint :
- Page 1 = couverture
- Pages 2–(N+1) = contenu (N scènes)
- Pages (N+2)–53 = résidu Git (à ignorer)
- Page 54 = 4ème de couverture

Après duplication, noter le nouveau `design_id`.

---

## Étape 3 — Récupérer les page_ids du design

```
start-editing-transaction(design_id)
```

Réponse contient `pages[]` avec `{ page_id, page_number }`. Mapping :
- Canva page 2 = BD page 1
- Canva page N+1 = BD page N

> **Limitation** : l'API ne charge que 5 pages par appel `start-editing-transaction`. Faire plusieurs transactions successives pour couvrir toutes les pages (voir Étape 5).

---

## Étape 4 — Uploader les assets Canva

Pour chaque `artworkUrl` et chaque `structureUrl` :
```
upload-asset-from-url(url, name)
```

Retient : `asset_id` par panel et par page.

**Piège : Canva déduplique par URL.** Si la même URL a déjà été uploadée, retente avec une URL différente (re-upload sur R2 sous un nouveau nom).

---

## Étape 5 — Insérer les éléments dans Canva

Par page, dans cet ordre (artwork d'abord, structure par-dessus) :

```json
[
  {
    "type": "insert_fill",
    "page_id": "...",
    "asset_type": "image",
    "asset_id": "<artwork_panel_1_asset_id>",
    "alt_text": "BD Page 1 Panel 1",
    "left": 36, "top": 36, "width": 741, "height": 1070
  },
  {
    "type": "insert_fill",
    "page_id": "...",
    "asset_type": "image",
    "asset_id": "<structure_asset_id>",
    "alt_text": "BD Page 1 Structure",
    "left": 0, "top": 0, "width": 794, "height": 1123
  }
]
```

**Important :**
- L'artwork est inséré en premier (z-order inférieur), la structure par-dessus
- 1 seul `insert_fill` par élément — en mettre deux insère en doublon
- Faire **une transaction par batch de 4 pages** (limitation API : 5 pages chargées max par transaction)
- Envoyer toutes les insertions d'un batch en un seul `perform-editing-operations`

---

## Étape 6 — Titre + commit

```json
{ "type": "update_title", "title": "La Naissance de JavaScript" }
```

```
commit-editing-transaction(transaction_id)
```

---

## Workflow itératif

On peut relancer `POST /render-structure-pages` à tout moment quand de nouvelles images sont générées — les artworks seront re-uploadés sur R2 (nouvelle URL → pas de conflit de déduplication Canva). Refaire les étapes 4-6 pour les pages concernées.

---

## Notes

- La **structure overlay** couvre les fonds Git non-éditables (`editable: false`) grâce au PNG pleine page transparent qui s'insère par-dessus
- Les panels sans artwork (`artworkUrl: null`) n'ont pas d'élément artwork — seule la structure est insérée (fond Git reste visible en dessous, sera recouvert quand l'image sera générée)
- La couverture (Canva page 1) et la 4ème de couv (Canva page 54) sont traitées séparément via leurs endpoints dédiés (`/comic/cover/...` et `/comic/back-cover/...`)
- Les **bulles de dialogue** (`bubbles[]`) sont maintenant rendues dans la structure overlay (correctif inclus dans `comic-svg.ts`)

---

## Canva page IDs (design DAHF5fmhxDs — "La Naissance de JavaScript", 33 scènes)

> Ce design n'a actuellement que 5 pages. Pour avoir les 34 pages utiles, dupliquer manuellement `DAHFLxADvGA` depuis le navigateur Canva et noter le nouveau design_id.

| Canva page | BD page | page_id                             |
|------------|---------|--------------------------------------|
| 1          | cover   | PBtcnsLLDDcF3kFh                     |
| 2          | 1       | PBVWq5B2KLyQKQfZ ✓ (PNG inséré)     |
| 3          | 2       | PBmk58GvHlqpcjDn ✓ (PNG inséré)     |
| 4          | 3       | PBpxSdNcM8bcv4tQ ✓ (PNG inséré)     |
| 5          | 4       | PBKD2cKCGW1ywCfd ✓ (PNG inséré)     |
| 6–34       | 5–33    | (design trop court — à re-dupliquer) |
| 54         | back    | PBPMRc6GzLJM2rhR                     |
