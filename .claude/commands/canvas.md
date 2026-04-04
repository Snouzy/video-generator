Export a comic BD project into a Canva design with dissociated elements (artworks + structure overlay).

Usage: /canvas <project_id> <design_id>
Example: /canvas 28 DAHF5trDyos

## Steps to execute

### Step 1 — Call render-structure-pages

Run:
```
curl -s -X POST http://localhost:3002/api/projects/<project_id>/comic/render-structure-pages
```

Parse the response `.data` to get `title`, `totalPages`, and `pages[]`. Each page has:
- `pageNumber`
- `structureUrl` — transparent PNG overlay (borders + captions + bubbles)
- `panels[]` — each with `panelId`, `artworkUrl` (null if not generated yet), `canvaX`, `canvaY`, `canvaWidth`, `canvaHeight`

### Step 2 — Start Canva transaction to get page IDs

Call `start-editing-transaction(design_id)`. This loads 5 pages at a time.

Map Canva pages to BD pages: Canva page N+1 = BD page N (Canva page 2 = BD page 1, etc.).

Note the `pages[]` array from the response — each entry has `page_id` and `page_number`.

### Step 3 — Upload assets to Canva

For each page in the response:
- Upload `structureUrl` via `upload-asset-from-url(url, "Structure page N")` → save `structure_asset_id`
- For each panel where `artworkUrl` is not null: upload via `upload-asset-from-url(url, "Page N Panel panelId")` → save `artwork_asset_id`

**Piège Canva** : if an asset URL was already uploaded before, Canva returns an error "asset already exists". In that case, note the existing asset_id from the error or re-upload the file to R2 under a new key name.

### Step 4 — Insert elements (batch of 4 pages per transaction)

The Canva API only loads 5 pages per transaction. Process pages in batches of 4.

For each batch:
1. Start a new `start-editing-transaction(design_id)` — note the transaction_id and the page_ids loaded
2. Build `perform-editing-operations` with, **for each page in the batch** and **in this order**:
   a. One `insert_fill` per panel artwork (at its position):
      ```json
      { "type": "insert_fill", "page_id": "<canva_page_id>", "asset_type": "image", "asset_id": "<artwork_asset_id>", "alt_text": "Page N Panel X", "left": <canvaX>, "top": <canvaY>, "width": <canvaWidth>, "height": <canvaHeight> }
      ```
   b. One `insert_fill` for the structure overlay (full page, on top):
      ```json
      { "type": "insert_fill", "page_id": "<canva_page_id>", "asset_type": "image", "asset_id": "<structure_asset_id>", "alt_text": "Structure page N", "left": 0, "top": 0, "width": 794, "height": 1123 }
      ```
   c. Skip panels where `artworkUrl` is null (only insert the structure overlay for those pages)
3. Set `page_index` to the first Canva page number of the batch
4. Call `commit-editing-transaction(transaction_id)`

Repeat for each batch of 4 pages until all BD pages are done.

### Step 5 — Update title

In the last transaction (or a dedicated one), include:
```json
{ "type": "update_title", "title": "<title from render-structure-pages>" }
```

### Notes

- BD page N maps to Canva page N+1 (cover = Canva page 1, back cover = Canva page 54)
- Pages without artwork (`artworkUrl: null`): insert structure overlay only — the Git template background shows through until the artwork is generated
- Re-running `/canvas` after generating more images will re-upload new artworks to R2 (new URLs → no Canva deduplication conflict) and insert them on top of the existing elements
- See `docs/canva-export.md` for full reference documentation
