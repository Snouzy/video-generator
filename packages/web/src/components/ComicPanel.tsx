import { useState } from "react";
import type { ComicStructure, ComicPagePanel } from "@video-generator/shared";
import { AVAILABLE_IMAGE_MODELS, BUILTIN_STYLE_TEMPLATES } from "@video-generator/shared";
import { generateComicImages, downloadComicSvgs, mediaUrl, regenerateComicPanelPrompt, regenerateComicPage } from "../api/client";
import { toast } from "sonner";

interface ComicPanelItem {
  pageNumber: number;
  panelId: string;
  sceneNumber: number;
  imagePrompt: string;
  aspectRatio?: string;
  layoutId: string;
  imageUrl?: string | null;
  imageStatus?: string;
}

interface ComicPanelProps {
  projectId: number;
  comicStructure: ComicStructure;
  onRegenerate: () => void;
  onRefresh: () => void;
  regenerating: boolean;
}

function downloadImage(url: string, filename: string) {
  fetch(url)
    .then((res) => res.blob())
    .then((blob) => {
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(blobUrl);
    });
}

async function copyImageToClipboard(url: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    // Convert to PNG for clipboard compatibility
    const pngBlob = blob.type === "image/png"
      ? blob
      : await new Promise<Blob>((resolve) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            canvas.getContext("2d")!.drawImage(img, 0, 0);
            canvas.toBlob((b) => resolve(b!), "image/png");
          };
          img.src = URL.createObjectURL(blob);
        });
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": pngBlob }),
    ]);
    toast.success("Image copiee");
  } catch {
    toast.error("Impossible de copier l'image");
  }
}

function aspectRatioClass(ar?: string): string {
  switch (ar) {
    case "16:9": return "aspect-[16/9]";
    case "9:16": return "aspect-[9/16]";
    case "4:3": return "aspect-[4/3]";
    case "3:4": return "aspect-[3/4]";
    case "1:1": return "aspect-square";
    default: return "aspect-[4/3]";
  }
}

const ASPECT_RATIO_OPTIONS = ["16:9", "9:16", "4:3", "3:4", "1:1"] as const;

function PanelCard({ panel, pageNumber, isSelected, onToggle, onRegenerate, aspectRatio, onAspectChange, prompt, onPromptChange, narrative, onNarrativeChange, onGeneratePrompt, generatingPrompt, onZoom }: {
  panel: ComicPagePanel;
  pageNumber: number;
  isSelected: boolean;
  onToggle: () => void;
  onRegenerate: () => void;
  aspectRatio: string;
  onAspectChange: (ar: string) => void;
  prompt: string;
  onPromptChange: (text: string) => void;
  narrative: string;
  onNarrativeChange: (text: string) => void;
  onGeneratePrompt: () => void;
  generatingPrompt: boolean;
  onZoom: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const status = panel.imageStatus;
  const hasImage = status === "completed" && panel.imageUrl;

  return (
    <div
      onClick={onToggle}
      className={`group/card rounded-lg overflow-hidden cursor-pointer transition-all border-2 ${
        isSelected
          ? "border-blue-500 shadow-lg shadow-blue-500/20"
          : "border-gray-700 hover:border-gray-500"
      }`}
    >
      {/* Image area */}
      <div className={`relative bg-gray-800 ${aspectRatioClass(aspectRatio)}`}>
        {status === "processing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <div className="w-10 h-10 border-4 border-gray-600 border-t-purple-400 rounded-full animate-spin" />
            <span className="text-purple-400 text-sm">Generating...</span>
          </div>
        )}

        {status === "failed" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-red-400 text-sm">Failed</span>
            <button
              onClick={(e) => { e.stopPropagation(); onRegenerate(); }}
              className="mt-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs rounded-md transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {hasImage && (
          <img
            src={mediaUrl(panel.imageUrl!)}
            alt={`Scene ${panel.sceneNumber}`}
            className="w-full h-full object-cover"
          />
        )}

        {!status && !hasImage && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-gray-600 text-lg font-bold">S{panel.sceneNumber}</span>
          </div>
        )}

        {/* Action buttons (hover) */}
        {status !== "processing" && (
          <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover/card:opacity-100 transition-opacity">
            {/* Regenerate */}
            <button
              onClick={(e) => { e.stopPropagation(); onRegenerate(); }}
              className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center"
              title="Regenerer l'image"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            {hasImage && (
              <>
                {/* Copy to clipboard */}
                <button
                  onClick={(e) => { e.stopPropagation(); copyImageToClipboard(mediaUrl(panel.imageUrl!)); }}
                  className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center"
                  title="Copier l'image"
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                </button>
                {/* Zoom / fullscreen */}
                <button
                  onClick={(e) => { e.stopPropagation(); onZoom(); }}
                  className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center"
                  title="Agrandir"
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </button>
                {/* Download */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadImage(mediaUrl(panel.imageUrl!), `comic-p${pageNumber}-${panel.panelId}.png`);
                  }}
                  className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center"
                  title="Telecharger"
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
              </>
            )}
          </div>
        )}

        {/* Checkbox overlay */}
        <div className="absolute top-2 left-2">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggle}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 accent-blue-500"
          />
        </div>

        {/* Status badge */}
        {status === "completed" && (
          <div className="absolute bottom-2 right-2 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>

      {/* Info bar */}
      <div className="px-2 py-1.5 bg-gray-900/80">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-400">{panel.panelId}</span>
          <select
            value={aspectRatio}
            onChange={(e) => { e.stopPropagation(); onAspectChange(e.target.value); }}
            onClick={(e) => e.stopPropagation()}
            className="px-1 py-0.5 bg-gray-800 border border-gray-700 text-gray-300 rounded text-[11px] focus:outline-none focus:border-blue-500"
          >
            {ASPECT_RATIO_OPTIONS.map((ar) => (
              <option key={ar} value={ar}>{ar}</option>
            ))}
          </select>
          <span className="text-xs text-gray-600">Scene {panel.sceneNumber}</span>
        </div>
        {/* 1. Narrative (editable) */}
        <div className="mt-1" onClick={(e) => e.stopPropagation()}>
          <textarea
            value={narrative}
            onChange={(e) => onNarrativeChange(e.target.value)}
            rows={2}
            placeholder="Texte narratif..."
            className="w-full text-[11px] text-yellow-500/80 bg-gray-800/50 border border-gray-700 rounded p-1.5 resize-y focus:outline-none focus:border-yellow-600"
          />
          <button
            onClick={onGeneratePrompt}
            disabled={generatingPrompt || !narrative.trim()}
            className="mt-1 w-full px-2 py-1 text-[11px] bg-yellow-700 hover:bg-yellow-600 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded transition-colors"
          >
            {generatingPrompt ? "Generation du prompt..." : "Generer le prompt"}
          </button>
        </div>

        {/* 2. Image prompt (editable) + regenerate */}
        {editing ? (
          <div className="mt-1" onClick={(e) => e.stopPropagation()}>
            <textarea
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              rows={4}
              className="w-full text-[11px] text-gray-300 bg-gray-800 border border-gray-600 rounded p-1.5 resize-y focus:outline-none focus:border-blue-500"
            />
            <div className="flex items-center gap-1.5 mt-1">
              <button
                onClick={() => { setEditing(false); onRegenerate(); }}
                className="px-2 py-0.5 text-[11px] bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
              >
                Regenerer image
              </button>
              <button
                onClick={() => setEditing(false)}
                className="px-2 py-0.5 text-[11px] text-gray-400 hover:text-white transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        ) : (
          <p
            className="text-[11px] text-gray-500 truncate mt-1 hover:text-gray-300 cursor-text"
            title={prompt}
            onClick={(e) => { e.stopPropagation(); setEditing(true); }}
          >
            {prompt}
          </p>
        )}
      </div>
    </div>
  );
}

export default function ComicPanel({ projectId, comicStructure, onRegenerate, onRefresh, regenerating }: ComicPanelProps) {
  const allPanels: ComicPanelItem[] = comicStructure.pages.flatMap((page) =>
    page.panels.map((panel) => ({
      pageNumber: page.pageNumber,
      panelId: panel.panelId,
      sceneNumber: panel.sceneNumber,
      imagePrompt: panel.imagePrompt,
      aspectRatio: panel.aspectRatio,
      layoutId: page.layoutId,
      imageUrl: panel.imageUrl,
      imageStatus: panel.imageStatus,
    }))
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [model, setModel] = useState("flux");
  const [styleId, setStyleId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [aspectOverrides, setAspectOverrides] = useState<Record<string, string>>({});
  const [promptOverrides, setPromptOverrides] = useState<Record<string, string>>({});
  const [narrativeOverrides, setNarrativeOverrides] = useState<Record<string, string>>({});
  const [generatingPromptKeys, setGeneratingPromptKeys] = useState<Set<string>>(new Set());
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [regeneratingPages, setRegeneratingPages] = useState<Set<number>>(new Set());

  const panelKey = (p: { pageNumber: number; panelId: string }) => `${p.pageNumber}-${p.panelId}`;

  function getAspectRatio(p: ComicPanelItem): string {
    return aspectOverrides[panelKey(p)] ?? p.aspectRatio ?? "4:3";
  }

  function setAspectRatio(p: { pageNumber: number; panelId: string }, ar: string) {
    setAspectOverrides((prev) => ({ ...prev, [panelKey(p)]: ar }));
  }

  function getPrompt(p: ComicPanelItem): string {
    return promptOverrides[panelKey(p)] ?? p.imagePrompt;
  }

  function setPrompt(p: { pageNumber: number; panelId: string }, text: string) {
    setPromptOverrides((prev) => ({ ...prev, [panelKey(p)]: text }));
  }

  function getNarrative(p: ComicPanelItem): string {
    const key = panelKey(p);
    if (key in narrativeOverrides) return narrativeOverrides[key];
    // Find the caption from the comic structure
    const page = comicStructure.pages.find((pg) => pg.pageNumber === p.pageNumber);
    const panel = page?.panels.find((pan) => pan.panelId === p.panelId);
    return panel?.caption?.text ?? "";
  }

  function setNarrative(p: { pageNumber: number; panelId: string }, text: string) {
    setNarrativeOverrides((prev) => ({ ...prev, [panelKey(p)]: text }));
  }

  async function handleGeneratePrompt(item: ComicPanelItem) {
    const key = panelKey(item);
    const narrative = getNarrative(item);
    if (!narrative.trim()) return;

    setGeneratingPromptKeys((prev) => new Set(prev).add(key));
    try {
      const { imagePrompt } = await regenerateComicPanelPrompt(
        projectId,
        item.pageNumber,
        item.panelId,
        narrative
      );
      setPromptOverrides((prev) => ({ ...prev, [key]: imagePrompt }));
      toast.success(`Prompt regenere pour ${item.panelId}`);
      onRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Echec de la generation du prompt");
    } finally {
      setGeneratingPromptKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  async function handleRegeneratePage(pageNumber: number) {
    setRegeneratingPages((prev) => new Set(prev).add(pageNumber));
    try {
      await regenerateComicPage(projectId, pageNumber);
      toast.success(`Page ${pageNumber} regeneree`);
      onRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Echec de la regeneration de la page");
    } finally {
      setRegeneratingPages((prev) => {
        const next = new Set(prev);
        next.delete(pageNumber);
        return next;
      });
    }
  }

  function togglePanel(p: ComicPanelItem) {
    setSelected((prev) => {
      const next = new Set(prev);
      const key = panelKey(p);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(allPanels.map(panelKey)));
  }

  function selectNone() {
    setSelected(new Set());
  }

  async function handleRegenerateOne(item: ComicPanelItem) {
    const styleTemplate = styleId ? BUILTIN_STYLE_TEMPLATES.find((s) => s.id === styleId) : undefined;
    const prefix = styleTemplate?.stylePromptPrefix;

    try {
      await generateComicImages(
        projectId,
        [{ pageNumber: item.pageNumber, panelId: item.panelId, sceneNumber: item.sceneNumber, imagePrompt: getPrompt(item), aspectRatio: getAspectRatio(item) }],
        model,
        prefix
      );
      toast.success(`Image p${item.pageNumber}-${item.panelId} en cours de génération`);
      onRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    }
  }

  async function handleGenerate() {
    const panelsToGenerate = allPanels.filter((p) => selected.has(panelKey(p)));
    if (panelsToGenerate.length === 0) {
      toast.error("Select at least one panel");
      return;
    }

    const styleTemplate = styleId ? BUILTIN_STYLE_TEMPLATES.find((s) => s.id === styleId) : undefined;
    const prefix = styleTemplate?.stylePromptPrefix;

    setGenerating(true);
    try {
      await generateComicImages(
        projectId,
        panelsToGenerate.map((p) => ({
          pageNumber: p.pageNumber, panelId: p.panelId, sceneNumber: p.sceneNumber, imagePrompt: getPrompt(p), aspectRatio: getAspectRatio(p),
        })),
        model,
        prefix
      );
      toast.success(`${panelsToGenerate.length} image(s) en cours de génération`);
      // Refresh project to get "processing" status and trigger polling
      onRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadComicSvgs(projectId, comicStructure);
      toast.success("ZIP SVGs downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  }

  const processingCount = allPanels.filter((p) => p.imageStatus === "processing").length;
  const completedCount = allPanels.filter((p) => p.imageStatus === "completed").length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          {comicStructure.title}
          <span className="ml-2 text-sm text-gray-400 font-normal">
            {comicStructure.pages.length} pages, {allPanels.length} cases
          </span>
          {completedCount > 0 && (
            <span className="ml-2 text-sm text-green-400 font-normal">{completedCount} images</span>
          )}
          {processingCount > 0 && (
            <span className="ml-2 text-sm text-purple-400 font-normal flex items-center gap-1 inline-flex">
              <div className="w-2 h-2 border border-purple-400 border-t-transparent rounded-full animate-spin" />
              {processingCount} en cours
            </span>
          )}
        </h3>
        <button
          onClick={onRegenerate}
          disabled={regenerating}
          className="px-3 py-1.5 text-sm border border-purple-700 text-purple-400 hover:text-white hover:bg-purple-600 disabled:opacity-30 rounded-lg transition-colors"
        >
          {regenerating ? "Regenerating..." : "Regenerate BD"}
        </button>
      </div>

      {/* Controls bar */}
      <div className="flex items-center gap-3 flex-wrap mb-5 p-3 bg-gray-900/60 border border-gray-700 rounded-lg sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <button onClick={selectAll} className="px-2 py-1 text-xs border border-gray-600 rounded text-gray-300 hover:text-white hover:border-gray-400">
            Tout
          </button>
          <button onClick={selectNone} className="px-2 py-1 text-xs border border-gray-600 rounded text-gray-300 hover:text-white hover:border-gray-400">
            Aucun
          </button>
          <span className="text-xs text-gray-500">{selected.size}/{allPanels.length}</span>
        </div>

        <div className="h-4 w-px bg-gray-700" />

        <select value={model} onChange={(e) => setModel(e.target.value)}
          className="px-2 py-1 bg-gray-800 border border-gray-700 text-white rounded text-sm">
          {AVAILABLE_IMAGE_MODELS.map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>

        <select value={styleId} onChange={(e) => setStyleId(e.target.value)}
          className="px-2 py-1 bg-gray-800 border border-gray-700 text-white rounded text-sm max-w-[180px]">
          <option value="">Sans style</option>
          {BUILTIN_STYLE_TEMPLATES.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <div className="flex-1" />

        <button onClick={handleGenerate} disabled={generating || selected.size === 0}
          className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors">
          {generating ? "Generating..." : `Generate images (${selected.size})`}
        </button>

        <button onClick={handleDownload} disabled={downloading}
          className="px-3 py-1.5 text-sm border border-cyan-700 text-cyan-400 hover:text-white hover:bg-cyan-600 rounded-lg font-medium transition-colors flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {downloading ? "..." : "SVGs"}
        </button>

        <button
          onClick={() => window.open(`http://localhost:3001/api/projects/${projectId}/comic/back-cover`, "_blank")}
          className="px-3 py-1.5 text-sm border border-amber-700 text-amber-400 hover:text-white hover:bg-amber-600 rounded-lg font-medium transition-colors"
        >
          4e de couverture
        </button>
      </div>

      {/* Pages */}
      <div className="space-y-8">
        {comicStructure.pages.map((page) => {
          const pageCompleted = page.panels.filter((p) => p.imageStatus === "completed").length;
          const pageProcessing = page.panels.filter((p) => p.imageStatus === "processing").length;

          return (
            <div key={page.pageNumber}>
              {/* Page header */}
              <div className="flex items-center gap-3 mb-3">
                <h4 className="text-sm font-bold text-white">
                  Page {page.pageNumber}
                </h4>
                <span className="text-xs text-gray-500">
                  {page.layoutId.replace("layout:", "")}
                </span>
                <span className="text-xs text-gray-600">
                  {page.panels.length} cases
                </span>
                {pageCompleted > 0 && (
                  <span className="text-xs text-green-400">{pageCompleted}/{page.panels.length} done</span>
                )}
                {pageProcessing > 0 && (
                  <span className="text-xs text-purple-400 flex items-center gap-1">
                    <div className="w-2 h-2 border border-purple-400 border-t-transparent rounded-full animate-spin" />
                    {pageProcessing} generating
                  </span>
                )}
                <button
                  onClick={() => handleRegeneratePage(page.pageNumber)}
                  disabled={regeneratingPages.has(page.pageNumber)}
                  className="ml-auto px-2 py-0.5 text-xs border border-gray-600 text-gray-400 hover:text-white hover:border-gray-400 disabled:opacity-30 rounded transition-colors"
                >
                  {regeneratingPages.has(page.pageNumber) ? "Regeneration..." : "Regenerer cette page"}
                </button>
              </div>

              {/* Panel cards grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {page.panels.map((panel) => {
                  const item: ComicPanelItem = {
                    pageNumber: page.pageNumber,
                    panelId: panel.panelId,
                    sceneNumber: panel.sceneNumber,
                    imagePrompt: panel.imagePrompt,
                    aspectRatio: panel.aspectRatio,
                    layoutId: page.layoutId,
                    imageUrl: panel.imageUrl,
                    imageStatus: panel.imageStatus,
                  };
                  const key = panelKey(item);

                  return (
                    <PanelCard
                      key={key}
                      panel={panel}
                      pageNumber={page.pageNumber}
                      isSelected={selected.has(key)}
                      onToggle={() => togglePanel(item)}
                      onRegenerate={() => handleRegenerateOne(item)}
                      aspectRatio={getAspectRatio(item)}
                      onAspectChange={(ar) => setAspectRatio(item, ar)}
                      prompt={getPrompt(item)}
                      onPromptChange={(text) => setPrompt(item, text)}
                      narrative={getNarrative(item)}
                      onNarrativeChange={(text) => setNarrative(item, text)}
                      onGeneratePrompt={() => handleGeneratePrompt(item)}
                      generatingPrompt={generatingPromptKeys.has(key)}
                      onZoom={() => panel.imageUrl && setZoomedImage(mediaUrl(panel.imageUrl))}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center cursor-pointer"
          onClick={() => setZoomedImage(null)}
        >
          <img
            src={zoomedImage}
            alt="Zoom"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setZoomedImage(null)}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white text-xl"
          >
            &times;
          </button>
          <div className="absolute bottom-6 flex gap-3">
            <button
              onClick={(e) => { e.stopPropagation(); copyImageToClipboard(zoomedImage); }}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm backdrop-blur transition-colors"
            >
              Copier
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); downloadImage(zoomedImage, "comic-panel.png"); }}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm backdrop-blur transition-colors"
            >
              Telecharger
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
