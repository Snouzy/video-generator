import { useState } from "react";
import type { Scene, StyleTemplateValue, SceneGenerationOverride, VideoFormat, TextLanguage } from "@video-generator/shared";
import { AVAILABLE_IMAGE_MODELS, AVAILABLE_CLIP_MODELS, AVAILABLE_TEXT_LANGUAGES } from "@video-generator/shared";
import { getTagColor } from "./ImageCard";
import { mediaUrl } from "../api/client";
import StyleTemplateSelector from "./StyleTemplateSelector";
import ModelSelector from "./ModelSelector";
import PromptDisplay from "./PromptDisplay";

interface SceneDetailProps {
  scene: Scene;
  onSetStyleOverride: (style: StyleTemplateValue) => void;
  onSaveStyleOverride: () => void;
  onRegeneratePrompt: () => void;
  onClearStyleOverride: () => void;
  styleLoading?: boolean;
  onSetGenerationOverride: (override: SceneGenerationOverride) => void;
  onClearGenerationOverride: () => void;
  promptRegenerating?: boolean;
  projectConfig?: { imageModels: string[]; animationModels: string[]; imagesPerScene: number; clipsPerScene: number; format?: VideoFormat; textLanguage?: TextLanguage };
}

export default function SceneDetail({
  scene,
  onSetStyleOverride,
  onSaveStyleOverride,
  onRegeneratePrompt,
  onClearStyleOverride,
  styleLoading = false,
  onSetGenerationOverride,
  onClearGenerationOverride,
  promptRegenerating = false,
  projectConfig,
}: SceneDetailProps) {
  const [showNarrative, setShowNarrative] = useState(false);
  const [showStyleOverride, setShowStyleOverride] = useState(false);
  const [showGenerationOverride, setShowGenerationOverride] = useState(false);

  return (
    <div className="px-6 py-4 border-b border-gray-800">
      <div className="flex items-center gap-3 mb-2">
        <h2 className="text-lg font-semibold text-white">{scene.title}</h2>
        <div className="flex gap-2">
          {scene.tags.map((tag, i) => (
            <span
              key={tag}
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getTagColor(i)}`}
            >
              {tag}
            </span>
          ))}
        </div>
        {scene.styleOverride && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-900/50 text-purple-300 border border-purple-700/50">
            Custom style
          </span>
        )}
        {scene.generationOverride && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-teal-900/50 text-teal-300 border border-teal-700/50">
            Custom generation
          </span>
        )}
      </div>

      <PromptDisplay
        prompt={scene.imagePrompt || ""}
        loading={promptRegenerating}
      />

      {scene.narrativeText && (
        <div className="mt-2">
          <button
            className="text-xs text-gray-500 hover:text-gray-400 flex items-center gap-1"
            onClick={() => setShowNarrative(!showNarrative)}
          >
            <svg
              className={`w-3 h-3 transition-transform ${showNarrative ? "rotate-90" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
            Narrative text
          </button>
          {showNarrative && (
            <p className="mt-1 text-sm text-gray-500 leading-relaxed pl-4 border-l-2 border-gray-700">
              {scene.narrativeText}
            </p>
          )}
        </div>
      )}

      {/* Scene style override */}
      <div className="mt-2">
        <button
          className="text-xs text-gray-500 hover:text-gray-400 flex items-center gap-1"
          onClick={() => setShowStyleOverride(!showStyleOverride)}
        >
          <svg
            className={`w-3 h-3 transition-transform ${showStyleOverride ? "rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
          Scene style override
          {scene.styleOverride && (
            <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-purple-400" />
          )}
        </button>
        {showStyleOverride && (
          <div className="mt-2 pl-4 border-l-2 border-gray-700">
            <StyleTemplateSelector
              value={scene.styleOverride ?? null}
              onChange={onSetStyleOverride}
              onSave={onSaveStyleOverride}
              onSaveAndRegenerate={onRegeneratePrompt}
              loading={styleLoading}
              showClearButton={!!scene.styleOverride}
              onClear={onClearStyleOverride}
              compact
            />
          </div>
        )}
      </div>

      {/* Scene generation override */}
      <div className="mt-2">
        <button
          className="text-xs text-gray-500 hover:text-gray-400 flex items-center gap-1"
          onClick={() => setShowGenerationOverride(!showGenerationOverride)}
        >
          <svg
            className={`w-3 h-3 transition-transform ${showGenerationOverride ? "rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
          Generation settings
          {scene.generationOverride && (
            <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-teal-400" />
          )}
        </button>
        {showGenerationOverride && (
          <div className="mt-2 pl-4 border-l-2 border-gray-700 space-y-3">
            <ModelSelector
              label="Image Models"
              availableModels={AVAILABLE_IMAGE_MODELS}
              selectedModels={scene.generationOverride?.imageModels ?? projectConfig?.imageModels ?? []}
              onChange={(models) =>
                onSetGenerationOverride({ ...scene.generationOverride, imageModels: models })
              }
            />

            <ModelSelector
              label="Clip Models"
              availableModels={AVAILABLE_CLIP_MODELS}
              selectedModels={scene.generationOverride?.animationModels ?? projectConfig?.animationModels ?? []}
              onChange={(models) =>
                onSetGenerationOverride({ ...scene.generationOverride, animationModels: models })
              }
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
                  value={scene.generationOverride?.imagesPerScene ?? projectConfig?.imagesPerScene ?? 1}
                  onChange={(e) => {
                    const val = Math.max(1, Math.min(10, parseInt(e.target.value, 10) || 1));
                    onSetGenerationOverride({ ...scene.generationOverride, imagesPerScene: val });
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
                  value={scene.generationOverride?.clipsPerScene ?? projectConfig?.clipsPerScene ?? 1}
                  onChange={(e) => {
                    const val = Math.max(1, Math.min(10, parseInt(e.target.value, 10) || 1));
                    onSetGenerationOverride({ ...scene.generationOverride, clipsPerScene: val });
                  }}
                  className="w-20 px-2.5 py-1 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Text language */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Langue du texte (s'il y en a)
              </label>
              <select
                value={scene.generationOverride?.textLanguage ?? projectConfig?.textLanguage ?? "French"}
                onChange={(e) =>
                  onSetGenerationOverride({
                    ...scene.generationOverride,
                    textLanguage: e.target.value as TextLanguage,
                  })
                }
                className="px-2.5 py-1 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm focus:outline-none focus:border-blue-500"
              >
                {AVAILABLE_TEXT_LANGUAGES.map((lang) => (
                  <option key={lang.id} value={lang.id}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Image parameters */}
            <div className="border-t border-gray-700/50 pt-3 mt-1">
              <label className="block text-xs font-medium text-gray-400 mb-2">Image parameters</label>
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <label className="block text-[11px] text-gray-500 mb-1">Aspect ratio</label>
                  <select
                    value={scene.generationOverride?.imageParams?.aspectRatio ?? projectConfig?.format ?? "16:9"}
                    onChange={(e) =>
                      onSetGenerationOverride({
                        ...scene.generationOverride,
                        imageParams: { ...scene.generationOverride?.imageParams, aspectRatio: e.target.value as VideoFormat },
                      })
                    }
                    className="px-2.5 py-1 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="16:9">16:9</option>
                    <option value="9:16">9:16</option>
                    <option value="4:3">4:3</option>
                    <option value="3:4">3:4</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Clip parameters */}
            <div className="border-t border-gray-700/50 pt-3 mt-1">
              <label className="block text-xs font-medium text-gray-400 mb-2">Clip parameters</label>
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <label className="block text-[11px] text-gray-500 mb-1">Duration (s)</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={scene.generationOverride?.clipParams?.duration ?? 5}
                    onChange={(e) => {
                      const val = Math.max(1, Math.min(30, parseInt(e.target.value, 10) || 5));
                      onSetGenerationOverride({
                        ...scene.generationOverride,
                        clipParams: { ...scene.generationOverride?.clipParams, duration: val },
                      });
                    }}
                    className="w-20 px-2.5 py-1 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-500 mb-1">Aspect ratio</label>
                  <select
                    value={scene.generationOverride?.clipParams?.aspectRatio ?? projectConfig?.format ?? "16:9"}
                    onChange={(e) =>
                      onSetGenerationOverride({
                        ...scene.generationOverride,
                        clipParams: { ...scene.generationOverride?.clipParams, aspectRatio: e.target.value as VideoFormat },
                      })
                    }
                    className="px-2.5 py-1 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="16:9">16:9</option>
                    <option value="9:16">9:16</option>
                    <option value="4:3">4:3</option>
                    <option value="3:4">3:4</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-3.5">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={scene.generationOverride?.clipParams?.generateAudio ?? false}
                    onClick={() =>
                      onSetGenerationOverride({
                        ...scene.generationOverride,
                        clipParams: {
                          ...scene.generationOverride?.clipParams,
                          generateAudio: !(scene.generationOverride?.clipParams?.generateAudio ?? false),
                        },
                      })
                    }
                    className={`relative w-9 h-5 rounded-full transition-colors ${
                      scene.generationOverride?.clipParams?.generateAudio
                        ? "bg-blue-600"
                        : "bg-gray-700"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                        scene.generationOverride?.clipParams?.generateAudio ? "translate-x-4" : ""
                      }`}
                    />
                  </button>
                  <label className="text-[11px] text-gray-500">Audio</label>
                </div>
              </div>
            </div>

            {scene.generationOverride && (
              <div className="pt-1">
                <button
                  onClick={onClearGenerationOverride}
                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs font-medium transition-colors"
                >
                  Reset to project defaults
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {scene.audioUrl && (
        <div className="mt-3 flex items-center gap-3">
          <span className="text-xs text-gray-500">Narration</span>
          <audio
            controls
            src={mediaUrl(scene.audioUrl)}
            className="h-8"
            style={{ filter: "invert(1) hue-rotate(180deg)", opacity: 0.7 }}
          />
        </div>
      )}
    </div>
  );
}
