import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { VideoFormat, ElevenLabsVoice } from "@video-generator/shared";
import { createProject, getVoices } from "../api/client";

export default function ProjectCreate() {
  const [title, setTitle] = useState("");
  const [scriptContent, setScriptContent] = useState("");
  const [format, setFormat] = useState<VideoFormat>("16:9");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState("");
  const [loadingVoices, setLoadingVoices] = useState(true);
  const [playingPreview, setPlayingPreview] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchVoices() {
      try {
        const voiceList = await getVoices();
        setVoices(voiceList);
        if (voiceList.length > 0) {
          setSelectedVoiceId(voiceList[0].voice_id);
        }
      } catch (err) {
        console.error("Failed to load voices:", err);
      } finally {
        setLoadingVoices(false);
      }
    }
    fetchVoices();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !scriptContent.trim() || !selectedVoiceId) return;

    setSubmitting(true);
    setError(null);
    try {
      const project = await createProject({
        title: title.trim(),
        scriptContent: scriptContent.trim(),
        config: { format, voiceId: selectedVoiceId },
      });
      navigate(`/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setSubmitting(false);
    }
  }

  function handlePlayPreview() {
    const selectedVoice = voices.find((v) => v.voice_id === selectedVoiceId);
    if (selectedVoice?.preview_url) {
      setPlayingPreview(true);
      const audio = new Audio(selectedVoice.preview_url);
      audio.onended = () => setPlayingPreview(false);
      audio.play().catch((err) => {
        console.error("Failed to play preview:", err);
        setPlayingPreview(false);
      });
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <button
          onClick={() => navigate("/")}
          className="text-gray-400 hover:text-white text-sm flex items-center gap-1 mb-6"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to projects
        </button>

        <h1 className="text-2xl font-bold mb-8">Create New Project</h1>

        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-400 mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Project Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. The Tupperware Heist"
              className="w-full bg-slate-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
              required
            />
          </div>

          <div>
            <label
              htmlFor="script"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Script Content
            </label>
            <textarea
              id="script"
              value={scriptContent}
              onChange={(e) => setScriptContent(e.target.value)}
              placeholder="Paste your narrative script here (Markdown supported)..."
              rows={16}
              className="w-full bg-slate-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors resize-y font-mono text-sm leading-relaxed"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Video Format
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFormat("16:9")}
                className={`flex-1 py-3 rounded-lg font-medium text-sm transition-colors border ${
                  format === "16:9"
                    ? "bg-blue-600 border-blue-500 text-white"
                    : "bg-slate-900 border-gray-700 text-gray-400 hover:border-gray-500"
                }`}
              >
                <span className="inline-block w-8 h-4.5 border border-current rounded-sm align-middle mr-2" />
                16:9 YouTube
              </button>
              <button
                type="button"
                onClick={() => setFormat("9:16")}
                className={`flex-1 py-3 rounded-lg font-medium text-sm transition-colors border ${
                  format === "9:16"
                    ? "bg-blue-600 border-blue-500 text-white"
                    : "bg-slate-900 border-gray-700 text-gray-400 hover:border-gray-500"
                }`}
              >
                <span className="inline-block w-3 h-5 border border-current rounded-sm align-middle mr-2" />
                9:16 Short / TikTok
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="voice"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Narrator Voice (ElevenLabs)
            </label>
            <div className="flex gap-3">
              <select
                id="voice"
                value={selectedVoiceId}
                onChange={(e) => setSelectedVoiceId(e.target.value)}
                disabled={loadingVoices}
                className="flex-1 bg-slate-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors disabled:bg-slate-800 disabled:text-gray-500"
              >
                {loadingVoices ? (
                  <option>Loading voices...</option>
                ) : voices.length === 0 ? (
                  <option>No voices available</option>
                ) : (
                  voices.map((voice) => (
                    <option key={voice.voice_id} value={voice.voice_id}>
                      {voice.name}
                      {voice.category ? ` (${voice.category})` : ""}
                    </option>
                  ))
                )}
              </select>
              <button
                type="button"
                onClick={handlePlayPreview}
                disabled={
                  loadingVoices ||
                  !selectedVoiceId ||
                  !voices.find((v) => v.voice_id === selectedVoiceId)
                    ?.preview_url ||
                  playingPreview
                }
                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-gray-500 text-white rounded-lg font-medium transition-colors text-sm border border-gray-700"
              >
                {playingPreview ? "Playing..." : "Preview"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !title.trim() || !scriptContent.trim()}
            className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-medium transition-colors"
          >
            {submitting ? "Creating..." : "Create Project"}
          </button>
        </form>
      </div>
    </div>
  );
}
