import { useEffect, useState, useCallback, useRef } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import type { Project, Scene, GeneratedImage, GeneratedClip, ElevenLabsVoice, StyleTemplateValue, SceneGenerationOverride, TextLanguage, ComicStructure, BackgroundMode } from "@video-generator/shared";
import { AVAILABLE_IMAGE_MODELS, AVAILABLE_CLIP_MODELS, AVAILABLE_TEXT_LANGUAGES } from "@video-generator/shared";
import {
  getProject,
  getScenes,
  splitProject,
  generateAllImages,
  generateAllClips,
  generateSceneImages,
  generateSceneClips,
  getSceneImages,
  getSceneClips,
  selectImage,
  selectClip,
  regenerateImage,
  regenerateClip,
  generateNarration,
  getVoices,
  updateProjectConfig,
  regeneratePrompts,
  updateSceneStyleOverride,
  regenerateScenePrompt,
  updateSceneGenerationOverride,
  updateScene,
  generateComicStructure,
} from "../api/client";
import SceneNavigation from "../components/SceneNavigation";
import SceneDetail from "../components/SceneDetail";
import SceneOverview from "../components/SceneOverview";
import ImageGrid from "../components/ImageGrid";
import ClipGrid from "../components/ClipGrid";
import StyleTemplateSelector from "../components/StyleTemplateSelector";
import ModelSelector from "../components/ModelSelector";
import ComicPanel from "../components/ComicPanel";

export default function ProjectView() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);

  const [project, setProject] = useState<Project | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<"images" | "clips" | "comics">("images");
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [clips, setClips] = useState<GeneratedClip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("");
  const [showSettings, setShowSettings] = useState(false);
  const [projectStyle, setProjectStyle] = useState<StyleTemplateValue | null>(null);
  const [regeneratingSceneIds, setRegeneratingSceneIds] = useState<Set<number>>(new Set());
  const [comicStructure, setComicStructure] = useState<ComicStructure | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keyboard shortcuts: 1 = images, 2 = clips, left/right = prev/next scene
  useHotkeys("1", () => setActiveTab("images"));
  useHotkeys("2", () => setActiveTab("clips"));
  useHotkeys("3", () => setActiveTab("comics"));
  useHotkeys("left", () => setCurrentIndex((i) => Math.max(0, i - 1)));
  useHotkeys("right", () => setCurrentIndex((i) => Math.min(scenes.length - 1, i + 1)));

  const currentScene = scenes[currentIndex] ?? null;

  // Load project data
  const loadProject = useCallback(async () => {
    try {
      const p = await getProject(projectId);
      setProject(p);
      if (p.scenes && p.scenes.length > 0) {
        setScenes(p.scenes);
      } else {
        const s = await getScenes(projectId).catch(() => []);
        setScenes(s);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load project");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  // Load voices
  useEffect(() => {
    getVoices().then(setVoices).catch(() => {});
  }, []);

  // Load persisted comic structure (use JSON string to detect deep changes)
  const comicJson = JSON.stringify(project?.comicStructure ?? null);
  useEffect(() => {
    try {
      const parsed = JSON.parse(comicJson);
      setComicStructure(parsed);
    } catch {
      // comicJson is always produced by JSON.stringify — this only fires if
      // comicStructure somehow contained a non-serialisable value upstream
    }
  }, [comicJson]);

  // Sync config state from project
  useEffect(() => {
    if (project?.config) {
      if (project.config.voiceId) setSelectedVoiceId(project.config.voiceId);
      setProjectStyle(
        project.config.styleTemplate ?? {
          sourceId: "builtin:mannequin",
          stylePromptPrefix: project.config.stylePromptPrefix ?? "",
          llmSystemInstructions: "",
        }
      );
    }
  }, [project?.config]);

  // Load images/clips when current scene changes
  const loadSceneMedia = useCallback(async () => {
    if (!currentScene) return;
    try {
      const [imgs, clps] = await Promise.all([
        getSceneImages(currentScene.id).catch(() => []),
        getSceneClips(currentScene.id).catch(() => []),
      ]);
      setImages(imgs);
      setClips(clps);
      // Sync sidebar badges for the current scene
      setScenes((prev) =>
        prev.map((s) =>
          s.id === currentScene.id ? { ...s, images: imgs, clips: clps } : s
        )
      );
    } catch {
      // Silently handle - individual errors caught above
    }
  }, [currentScene?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadSceneMedia();
  }, [loadSceneMedia]);

  // Polling: if any image/clip is processing, poll every 3 seconds
  useEffect(() => {
    const hasProcessing =
      images.some(
        (img) => img.status === "processing" || img.status === "pending"
      ) ||
      clips.some(
        (clip) => clip.status === "processing" || clip.status === "pending"
      );

    if (hasProcessing) {
      pollRef.current = setInterval(() => {
        loadSceneMedia();
      }, 3000);
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [images, clips, loadSceneMedia]);

  // Poll comic structure when any panel is processing
  useEffect(() => {
    const hasComicProcessing = comicStructure?.pages.some((page) =>
      page.panels.some((p) => p.imageStatus === "processing")
    );

    if (!hasComicProcessing) return;

    const interval = setInterval(() => {
      loadProject();
    }, 3000);
    return () => clearInterval(interval);
  }, [comicStructure, loadProject]);

  // Also poll project/scenes when splitting or generating
  useEffect(() => {
    if (
      project?.status === "splitting" ||
      project?.status === "generating_images" ||
      project?.status === "generating_clips" ||
      project?.status === "generating_narration" ||
      project?.status === "rendering"
    ) {
      const interval = setInterval(() => {
        loadProject();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [project?.status, loadProject]);

  async function handleSplit() {
    setActionLoading("split");
    try {
      const newScenes = await splitProject(projectId);
      setScenes(newScenes);
      setCurrentIndex(0);
      await loadProject();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to split script");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleGenerateAll() {
    setActionLoading("generate-all");
    try {
      await generateAllImages(projectId);
      await loadProject();
      await loadSceneMedia();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to generate all images"
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function handleGenerateSceneImages() {
    if (!currentScene) return;
    setActionLoading("generate-scene");
    try {
      await generateSceneImages(currentScene.id);
      await loadSceneMedia();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to generate scene images"
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function handleGenerateSceneClips() {
    if (!currentScene) return;
    setActionLoading("generate-clips");
    try {
      await generateSceneClips(currentScene.id);
      await loadSceneMedia();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to generate scene clips"
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSelectImage(imageId: number) {
    try {
      await selectImage(imageId);
      await loadSceneMedia();
      // Refresh scenes to update selectedImageId
      const updatedScenes = await getScenes(projectId);
      setScenes(updatedScenes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to select image");
    }
  }

  async function handleSelectClip(clipId: number) {
    try {
      await selectClip(clipId);
      await loadSceneMedia();
      const updatedScenes = await getScenes(projectId);
      setScenes(updatedScenes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to select clip");
    }
  }

  async function handleGenerateAllClips() {
    setActionLoading("generate-all-clips");
    try {
      await generateAllClips(projectId);
      await loadProject();
      await loadSceneMedia();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to generate all clips"
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRegenerateImage(imageId: number) {
    try {
      await regenerateImage(imageId);
      await loadSceneMedia();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to regenerate image");
    }
  }

  async function handleRegenerateClip(clipId: number) {
    try {
      await regenerateClip(clipId);
      await loadSceneMedia();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to regenerate clip");
    }
  }

  async function handleGenerateNarration() {
    if (!selectedVoiceId) {
      setError("Please select a voice first");
      return;
    }
    setActionLoading("generate-narration");
    try {
      await updateProjectConfig(projectId, { voiceId: selectedVoiceId });
      await generateNarration(projectId);
      await loadProject();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to generate narration"
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSaveProjectStyle() {
    if (!projectStyle) return;
    setActionLoading("save-style");
    try {
      await updateProjectConfig(projectId, {
        styleTemplate: projectStyle,
        stylePromptPrefix: projectStyle.stylePromptPrefix,
      });
      await loadProject();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save style");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRegeneratePrompts() {
    if (!projectStyle) return;
    const allSceneIds = new Set(scenes.map((s) => s.id));
    setActionLoading("regen-prompts");
    setRegeneratingSceneIds(allSceneIds);
    try {
      await updateProjectConfig(projectId, {
        styleTemplate: projectStyle,
        stylePromptPrefix: projectStyle.stylePromptPrefix,
      });
      await regeneratePrompts(projectId);
      await loadProject();
      toast.success(`All prompts regenerated (${allSceneIds.size} scenes)`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to regenerate prompts";
      setError(msg);
      toast.error("Failed to regenerate prompts", { description: msg });
    } finally {
      setRegeneratingSceneIds(new Set());
      setActionLoading(null);
    }
  }

  async function handleSetSceneStyle(style: StyleTemplateValue) {
    if (!currentScene) return;
    // Optimistic local update
    setScenes((prev) =>
      prev.map((s) =>
        s.id === currentScene.id ? { ...s, styleOverride: style } : s
      )
    );
    // Auto-save to API
    try {
      await updateSceneStyleOverride(currentScene.id, style);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save scene style");
    }
  }

  async function handleSaveSceneStyleOverride() {
    if (!currentScene) return;
    setActionLoading("save-scene-style");
    try {
      const scene = scenes.find((s) => s.id === currentScene.id);
      await updateSceneStyleOverride(currentScene.id, scene?.styleOverride ?? null);
      await loadProject();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save scene style");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRegenerateScenePrompt(sceneId?: number) {
    const targetId = sceneId ?? currentScene?.id;
    if (!targetId) return;
    const target = scenes.find((s) => s.id === targetId);
    if (!target) return;
    setRegeneratingSceneIds((prev) => new Set(prev).add(targetId));
    try {
      await updateSceneStyleOverride(targetId, target.styleOverride ?? null);
      await regenerateScenePrompt(targetId);
      await loadProject();
      toast.success(`Scene ${target.sceneNumber} — "${target.title}"`, { description: "Prompt regenerated" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to regenerate scene prompt";
      setError(msg);
      toast.error(`Scene ${target.sceneNumber} — "${target.title}"`, { description: msg });
    } finally {
      setRegeneratingSceneIds((prev) => {
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
    }
  }

  async function handleSetGenerationOverride(override: SceneGenerationOverride) {
    if (!currentScene) return;
    // Optimistic local update
    setScenes((prev) =>
      prev.map((s) =>
        s.id === currentScene.id ? { ...s, generationOverride: override } : s
      )
    );
    // Auto-save to API
    try {
      await updateSceneGenerationOverride(currentScene.id, override);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save generation settings");
    }
  }

  async function handleUpdateNarrativeText(text: string) {
    if (!currentScene) return;
    // Optimistic local update
    setScenes((prev) =>
      prev.map((s) =>
        s.id === currentScene.id ? { ...s, narrativeText: text } : s
      )
    );
    // Auto-save to API
    try {
      await updateScene(currentScene.id, { narrativeText: text });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update narrative text");
    }
  }

  async function handleUpdateAnimationPrompt(text: string) {
    if (!currentScene) return;
    setScenes((prev) =>
      prev.map((s) =>
        s.id === currentScene.id ? { ...s, animationPrompt: text } : s
      )
    );
    try {
      await updateScene(currentScene.id, { animationPrompt: text });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update animation prompt");
    }
  }

  async function handleClearGenerationOverride() {
    if (!currentScene) return;
    setActionLoading("save-gen-override");
    try {
      await updateSceneGenerationOverride(currentScene.id, null);
      setScenes((prev) =>
        prev.map((s) =>
          s.id === currentScene.id ? { ...s, generationOverride: null } : s
        )
      );
      await loadProject();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to clear generation settings");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleGenerateComic() {
    setActionLoading("generate-comic");
    try {
      const structure = await generateComicStructure(projectId);
      setComicStructure(structure);
      toast.success(`BD structure generated — ${structure.pages.length} pages`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to generate comic structure";
      setError(msg);
      toast.error("Comic generation failed", { description: msg });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleClearSceneStyleOverride() {
    if (!currentScene) return;
    setActionLoading("save-scene-style");
    try {
      await updateSceneStyleOverride(currentScene.id, null);
      setScenes((prev) =>
        prev.map((s) =>
          s.id === currentScene.id ? { ...s, styleOverride: null } : s
        )
      );
      await loadProject();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to clear scene style");
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-gray-700 border-t-green-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-6 text-red-400 max-w-md">
          <p className="font-medium mb-1">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!project) return null;

  // State: no scenes yet
  if (scenes.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="max-w-2xl mx-auto px-6 py-10">
          <h1 className="text-2xl font-bold mb-2">{project.title}</h1>
          <p className="text-gray-400 text-sm mb-8">
            Status: {project.status.replace(/_/g, " ")}
          </p>

          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-400 mb-6">
              {error}
            </div>
          )}

          {project.status === "splitting" ? (
            <div className="flex flex-col items-center gap-4 py-20">
              <div className="w-10 h-10 border-4 border-gray-700 border-t-yellow-400 rounded-full animate-spin" />
              <p className="text-gray-400">
                Splitting script into scenes...
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-20">
              <p className="text-gray-500 mb-4">
                Your script needs to be split into scenes before you can
                generate images.
              </p>
              <button
                onClick={handleSplit}
                disabled={actionLoading === "split"}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                {actionLoading === "split"
                  ? "Splitting..."
                  : "Split Script into Scenes"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const sceneLabel = `scene_${String(currentScene?.sceneNumber ?? 0).padStart(3, "0")}`;
  const format = project.config?.format ?? "16:9";

  return (
    <div className="h-screen bg-slate-950 text-white flex flex-col overflow-hidden">
      {/* Top navigation bar */}
      <SceneNavigation
        scenes={scenes}
        currentIndex={currentIndex}
        projectId={projectId}
        onPrev={() => setCurrentIndex((i) => Math.max(0, i - 1))}
        onNext={() =>
          setCurrentIndex((i) => Math.min(scenes.length - 1, i + 1))
        }
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showSettings={showSettings}
        onToggleSettings={() => setShowSettings((v) => !v)}
        onGenerateAllImages={handleGenerateAll}
        onGenerateAllClips={handleGenerateAllClips}
        actionLoading={actionLoading}
        projectStatus={project.status}
      />

      {/* Error banner */}
      {error && (
        <div className="mx-6 mt-4 bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-400 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-300"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Settings panel */}
      {showSettings && (
        <div className="mx-6 mt-4 bg-gray-900/80 border border-gray-700 rounded-lg p-4 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Project Style</h3>
            <StyleTemplateSelector
              value={projectStyle}
              onChange={setProjectStyle}
              onSave={handleSaveProjectStyle}
              onSaveAndRegenerate={handleRegeneratePrompts}
              loading={actionLoading === "save-style" || actionLoading === "regen-prompts"}
            />
          </div>

          {(projectStyle?.sourceId === "builtin:fitcoach" || project.config?.styleTemplate?.sourceId === "builtin:fitcoach") && (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Background Mode
              </label>
              <div className="flex gap-2">
                {([undefined, "light", "dark"] as const).map((mode) => (
                  <button
                    key={mode ?? "auto"}
                    onClick={() =>
                      updateProjectConfig(projectId, { backgroundMode: (mode ?? null) as any }).then(loadProject)
                    }
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors border ${
                      (project.config?.backgroundMode ?? undefined) === mode
                        ? "bg-blue-600 border-blue-500 text-white"
                        : "bg-slate-900 border-gray-700 text-gray-400 hover:border-gray-500"
                    }`}
                  >
                    {mode === undefined ? "Auto" : mode === "light" ? "Light" : "Dark"}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-gray-500">
                Force le fond clair ou sombre pour les slides Instagram.
              </p>
            </div>
          )}

          <div className="border-t border-gray-700 pt-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-300">Models & Quantities</h3>

            <ModelSelector
              label="Image Models"
              availableModels={AVAILABLE_IMAGE_MODELS}
              selectedModels={project.config?.imageModels ?? []}
              onChange={(models) => updateProjectConfig(projectId, { imageModels: models }).then(loadProject)}
            />

            <ModelSelector
              label="Clip Models"
              availableModels={AVAILABLE_CLIP_MODELS}
              selectedModels={project.config?.animationModels ?? []}
              onChange={(models) => updateProjectConfig(projectId, { animationModels: models }).then(loadProject)}
            />

            <div className="flex gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Images per model
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={project.config?.imagesPerScene ?? 1}
                  onChange={(e) => {
                    const val = Math.max(1, Math.min(10, parseInt(e.target.value, 10) || 1));
                    updateProjectConfig(projectId, { imagesPerScene: val }).then(loadProject);
                  }}
                  className="w-20 px-2.5 py-1 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Clips per model
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={project.config?.clipsPerScene ?? 1}
                  onChange={(e) => {
                    const val = Math.max(1, Math.min(10, parseInt(e.target.value, 10) || 1));
                    updateProjectConfig(projectId, { clipsPerScene: val }).then(loadProject);
                  }}
                  className="w-20 px-2.5 py-1 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Langue du texte (s'il y en a)
              </label>
              <select
                value={project.config?.textLanguage ?? "French"}
                onChange={(e) => updateProjectConfig(projectId, { textLanguage: e.target.value as TextLanguage }).then(loadProject)}
                className="px-2.5 py-1 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm focus:outline-none focus:border-blue-500"
              >
                {AVAILABLE_TEXT_LANGUAGES.map((lang) => (
                  <option key={lang.id} value={lang.id}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Layout: sidebar + main content */}
      <div className="flex-1 flex min-h-0">
        {/* Sidebar: Scene overview */}
        <div className="w-80 shrink-0 p-4 border-r border-gray-800 overflow-y-auto">
          <SceneOverview
            scenes={scenes}
            currentIndex={currentIndex}
            onNavigate={setCurrentIndex}
            regeneratingSceneIds={regeneratingSceneIds}
          />
        </div>

        {/* Main content area */}
        <div className="flex-1 px-6 py-4 overflow-y-auto">
          {/* Scene detail */}
          {currentScene && (
            <SceneDetail
              scene={currentScene}
              onSetStyleOverride={handleSetSceneStyle}
              onSaveStyleOverride={handleSaveSceneStyleOverride}
              onRegeneratePrompt={() => handleRegenerateScenePrompt()}
              onClearStyleOverride={handleClearSceneStyleOverride}
              styleLoading={actionLoading === "save-scene-style" || regeneratingSceneIds.has(currentScene.id)}
              onSetGenerationOverride={handleSetGenerationOverride}
              onClearGenerationOverride={handleClearGenerationOverride}
              onUpdateNarrativeText={handleUpdateNarrativeText}
              onUpdateAnimationPrompt={handleUpdateAnimationPrompt}
              promptRegenerating={regeneratingSceneIds.has(currentScene.id)}
              projectConfig={project.config}
            />
          )}

          <div className="mt-6">
            {activeTab === "images" && (
              <>
                {/* Action buttons */}
                <div className="flex gap-3 mb-6">
                  <button
                    onClick={handleGenerateSceneImages}
                    disabled={actionLoading === "generate-scene"}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {actionLoading === "generate-scene"
                      ? "Generating..."
                      : images.length > 0
                        ? "Regenerate Images for This Scene"
                        : "Generate Images for This Scene"}
                  </button>
                </div>

                <ImageGrid
                  images={images}
                  onSelect={handleSelectImage}
                  onRegenerate={handleRegenerateImage}
                  sceneLabel={sceneLabel}
                  format={format}
                />
              </>
            )}

            {activeTab === "clips" && (
              <>
                {/* Clip action buttons */}
                <div className="flex gap-3 mb-6">
                  {currentScene?.selectedImageId && (
                    <button
                      onClick={handleGenerateSceneClips}
                      disabled={actionLoading === "generate-clips"}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      {actionLoading === "generate-clips"
                        ? "Generating..."
                        : clips.length > 0
                          ? "Regenerate Clips for This Scene"
                          : "Generate Clips for This Scene"}
                    </button>
                  )}
                  <div className="flex items-center gap-1">
                    <select
                      value={selectedVoiceId}
                      onChange={(e) => setSelectedVoiceId(e.target.value)}
                      className="px-3 py-2 bg-slate-800 border border-gray-700 text-white rounded-l-lg text-sm focus:outline-none focus:border-orange-500"
                    >
                      <option value="">Select voice...</option>
                      {voices.map((v) => (
                        <option key={v.voice_id} value={v.voice_id}>
                          {v.name}{v.category ? ` (${v.category})` : ""}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleGenerateNarration}
                      disabled={
                        !selectedVoiceId ||
                        actionLoading === "generate-narration" ||
                        project.status === "generating_narration"
                      }
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 text-white rounded-r-lg text-sm font-medium transition-colors"
                    >
                      {actionLoading === "generate-narration" ||
                      project.status === "generating_narration"
                        ? "Generating..."
                        : "Generate Narration"}
                    </button>
                  </div>
                </div>

                {!currentScene?.selectedImageId && (
                  <div className="flex items-center justify-center py-20 text-gray-500">
                    Select an image first before generating clips.
                  </div>
                )}

                {currentScene?.selectedImageId && (
                  <ClipGrid
                    clips={clips}
                    onSelect={handleSelectClip}
                    onRegenerate={handleRegenerateClip}
                    sceneLabel={sceneLabel}
                    format={format}
                  />
                )}
              </>
            )}

            {activeTab === "comics" && (
              <div>
                {comicStructure ? (
                  <ComicPanel
                    projectId={projectId}
                    comicStructure={comicStructure}
                    onRegenerate={handleGenerateComic}
                    onRefresh={loadProject}
                    regenerating={actionLoading === "generate-comic"}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-4 py-20">
                    <p className="text-gray-500">
                      Aucune BD générée. Cliquez pour créer la structure de la bande dessinée à partir de vos scènes.
                    </p>
                    <button
                      onClick={handleGenerateComic}
                      disabled={actionLoading === "generate-comic"}
                      className="px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                    >
                      {actionLoading === "generate-comic"
                        ? "Generating BD..."
                        : "Generate BD"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
