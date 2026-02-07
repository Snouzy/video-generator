import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import type { Project, Scene, GeneratedImage, GeneratedClip, ElevenLabsVoice } from "@video-generator/shared";
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
  renderProject,
  generateNarration,
  getVoices,
  updateProjectConfig,
} from "../api/client";
import SceneNavigation from "../components/SceneNavigation";
import SceneDetail from "../components/SceneDetail";
import SceneOverview from "../components/SceneOverview";
import ImageGrid from "../components/ImageGrid";
import ClipGrid from "../components/ClipGrid";

export default function ProjectView() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);

  const [project, setProject] = useState<Project | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<"images" | "clips">("images");
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [clips, setClips] = useState<GeneratedClip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("");

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Sync selected voice from project config
  useEffect(() => {
    if (project?.config?.voiceId) {
      setSelectedVoiceId(project.config.voiceId);
    }
  }, [project?.config?.voiceId]);

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

  async function handleRenderVideo() {
    setActionLoading("render");
    try {
      await renderProject(projectId);
      await loadProject();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start render");
    } finally {
      setActionLoading(null);
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
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Top navigation bar */}
      <SceneNavigation
        scenes={scenes}
        currentIndex={currentIndex}
        onPrev={() => setCurrentIndex((i) => Math.max(0, i - 1))}
        onNext={() =>
          setCurrentIndex((i) => Math.min(scenes.length - 1, i + 1))
        }
        activeTab={activeTab}
        onTabChange={setActiveTab}
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

      {/* Layout: sidebar + main content */}
      <div className="flex-1 flex">
        {/* Sidebar: Scene overview */}
        <div className="w-80 shrink-0 p-4 border-r border-gray-800">
          <SceneOverview
            scenes={scenes}
            currentIndex={currentIndex}
            onNavigate={setCurrentIndex}
          />
        </div>

        {/* Main content area */}
        <div className="flex-1 px-6 py-4 overflow-y-auto">
          {/* Scene detail */}
          {currentScene && <SceneDetail scene={currentScene} />}

          <div className="mt-6">
            {activeTab === "images" && (
              <>
                {/* Action buttons */}
                <div className="flex gap-3 mb-6">
                  {images.length === 0 && (
                    <button
                      onClick={handleGenerateSceneImages}
                      disabled={actionLoading === "generate-scene"}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      {actionLoading === "generate-scene"
                        ? "Generating..."
                        : "Generate Images for This Scene"}
                    </button>
                  )}
                  <button
                    onClick={handleGenerateAll}
                    disabled={actionLoading === "generate-all"}
                    className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {actionLoading === "generate-all"
                      ? "Generating..."
                      : "Generate All Images"}
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
                  {currentScene?.selectedImageId && clips.length === 0 && (
                    <button
                      onClick={handleGenerateSceneClips}
                      disabled={actionLoading === "generate-clips"}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      {actionLoading === "generate-clips"
                        ? "Generating..."
                        : "Generate Clips for This Scene"}
                    </button>
                  )}
                  <button
                    onClick={handleGenerateAllClips}
                    disabled={actionLoading === "generate-all-clips"}
                    className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {actionLoading === "generate-all-clips"
                      ? "Generating..."
                      : "Generate All Clips"}
                  </button>
                  <button
                    onClick={handleRenderVideo}
                    disabled={actionLoading === "render" || project.status === "rendering"}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {actionLoading === "render" || project.status === "rendering"
                      ? "Rendering..."
                      : "Export Video"}
                  </button>
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
          </div>
        </div>
      </div>
    </div>
  );
}
