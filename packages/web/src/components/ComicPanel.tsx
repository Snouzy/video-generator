import { useState } from "react";
import type { ComicStructure, ComicPagePanel } from "@video-generator/shared";
import { AVAILABLE_IMAGE_MODELS, BUILTIN_STYLE_TEMPLATES } from "@video-generator/shared";
import { generateComicImages, downloadComicSvgs, mediaUrl } from "../api/client";
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

function PanelCard({ panel, pageNumber, isSelected, onToggle, onRegenerate }: {
  panel: ComicPagePanel;
  pageNumber: number;
  isSelected: boolean;
  onToggle: () => void;
  onRegenerate: () => void;
}) {
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
      <div className={`relative bg-gray-800 ${aspectRatioClass(panel.aspectRatio)}`}>
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
              title="(Re)generate image"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            {/* Download */}
            {hasImage && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  downloadImage(mediaUrl(panel.imageUrl!), `comic-p${pageNumber}-${panel.panelId}.png`);
                }}
                className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center"
                title="Download image"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
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
          <span className="text-xs text-gray-600">Scene {panel.sceneNumber}</span>
        </div>
        {panel.caption?.text && (
          <p className="text-[11px] text-yellow-500/70 truncate mt-0.5" title={panel.caption.text}>
            {panel.caption.text}
          </p>
        )}
        <p className="text-[11px] text-gray-500 truncate mt-0.5" title={panel.imagePrompt}>
          {panel.imagePrompt}
        </p>
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

  const panelKey = (p: { pageNumber: number; panelId: string }) => `${p.pageNumber}-${p.panelId}`;

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
        [{ pageNumber: item.pageNumber, panelId: item.panelId, sceneNumber: item.sceneNumber, imagePrompt: item.imagePrompt, aspectRatio: item.aspectRatio }],
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
        panelsToGenerate.map(({ pageNumber, panelId, sceneNumber, imagePrompt, aspectRatio: ar }) => ({
          pageNumber, panelId, sceneNumber, imagePrompt, aspectRatio: ar,
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
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
