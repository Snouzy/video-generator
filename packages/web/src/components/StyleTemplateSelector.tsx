import { useState, useEffect } from "react";
import type { StyleTemplate, StyleTemplateValue } from "@video-generator/shared";
import { BUILTIN_STYLE_TEMPLATES } from "@video-generator/shared";
import {
  getStyleTemplates,
  createStyleTemplate,
  deleteStyleTemplate,
} from "../api/client";

interface StyleTemplateSelectorProps {
  value: StyleTemplateValue | null;
  onChange: (style: StyleTemplateValue) => void;
  onSave: () => void;
  onSaveAndRegenerate: () => void;
  loading?: boolean;
  showClearButton?: boolean;
  onClear?: () => void;
  compact?: boolean;
}

export default function StyleTemplateSelector({
  value,
  onChange,
  onSave,
  onSaveAndRegenerate,
  loading = false,
  showClearButton = false,
  onClear,
  compact = false,
}: StyleTemplateSelectorProps) {
  const [templates, setTemplates] = useState<StyleTemplate[]>(BUILTIN_STYLE_TEMPLATES);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getStyleTemplates().then(setTemplates).catch(() => {});
  }, []);

  const activeSourceId = value?.sourceId ?? "";

  function handleSelectTemplate(tpl: StyleTemplate) {
    onChange({
      sourceId: tpl.sourceId,
      stylePromptPrefix: tpl.stylePromptPrefix,
      llmSystemInstructions: tpl.llmSystemInstructions,
    });
  }

  function isModified(tpl: StyleTemplate) {
    if (activeSourceId !== tpl.sourceId) return false;
    return (
      value?.stylePromptPrefix !== tpl.stylePromptPrefix ||
      value?.llmSystemInstructions !== tpl.llmSystemInstructions
    );
  }

  async function handleSaveAsTemplate() {
    if (!newName.trim() || !value) return;
    setSaving(true);
    try {
      const created = await createStyleTemplate({
        name: newName.trim(),
        stylePromptPrefix: value.stylePromptPrefix,
        llmSystemInstructions: value.llmSystemInstructions,
      });
      setTemplates((prev) => [...prev, created]);
      onChange({ ...value, sourceId: created.sourceId });
      setShowSaveForm(false);
      setNewName("");
    } catch {
      // silently handle
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCustom(tpl: StyleTemplate) {
    const numId = parseInt(tpl.id.replace("custom:", ""), 10);
    if (isNaN(numId)) return;
    try {
      await deleteStyleTemplate(numId);
      setTemplates((prev) => prev.filter((t) => t.id !== tpl.id));
    } catch {
      // silently handle
    }
  }

  return (
    <div className="space-y-3">
      {/* Template pills */}
      <div className="flex flex-wrap gap-2">
        {templates.map((tpl) => {
          const isActive = activeSourceId === tpl.sourceId;
          const modified = isModified(tpl);
          return (
            <button
              key={tpl.id}
              onClick={() => handleSelectTemplate(tpl)}
              className={`group relative px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                isActive
                  ? "bg-blue-600 text-white ring-2 ring-blue-400/50"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
              }`}
              title={tpl.description}
            >
              {tpl.name}
              {modified && (
                <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-yellow-400" />
              )}
              {!tpl.isBuiltin && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCustom(tpl);
                  }}
                  className="ml-1.5 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 transition-opacity cursor-pointer"
                >
                  ×
                </span>
              )}
            </button>
          );
        })}

        {/* Save as template button */}
        {!showSaveForm && (
          <button
            onClick={() => setShowSaveForm(true)}
            className="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-800/50 text-gray-500 hover:text-gray-300 hover:bg-gray-700 border border-dashed border-gray-700 transition-all"
          >
            + Save as template
          </button>
        )}

        {showClearButton && value && (
          <button
            onClick={onClear}
            className="px-3 py-1.5 rounded-full text-xs font-medium text-red-400/70 hover:text-red-400 hover:bg-red-900/20 transition-all"
          >
            Clear override
          </button>
        )}
      </div>

      {/* Save as template inline form */}
      {showSaveForm && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Template name..."
            className="flex-1 bg-slate-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
            onKeyDown={(e) => e.key === "Enter" && handleSaveAsTemplate()}
            autoFocus
          />
          <button
            onClick={handleSaveAsTemplate}
            disabled={!newName.trim() || saving}
            className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={() => { setShowSaveForm(false); setNewName(""); }}
            className="px-2 py-1.5 text-xs text-gray-500 hover:text-gray-300"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Style prompt prefix textarea */}
      {value && (
        <>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-gray-500 mb-1 block">
              Style Prompt Prefix
            </label>
            <textarea
              value={value.stylePromptPrefix}
              onChange={(e) =>
                onChange({ ...value, stylePromptPrefix: e.target.value })
              }
              rows={compact ? 2 : 3}
              className="w-full bg-slate-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500 resize-y"
              placeholder="e.g. 3D render, mannequin-style characters, cinematic dark lighting..."
            />
          </div>

          {/* Advanced: LLM instructions */}
          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-[11px] uppercase tracking-wider text-gray-500 hover:text-gray-400 flex items-center gap-1"
            >
              <svg
                className={`w-3 h-3 transition-transform ${showAdvanced ? "rotate-90" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              LLM Instructions (advanced)
            </button>
            {showAdvanced && (
              <textarea
                value={value.llmSystemInstructions}
                onChange={(e) =>
                  onChange({ ...value, llmSystemInstructions: e.target.value })
                }
                rows={4}
                className="mt-1 w-full bg-slate-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500 resize-y"
                placeholder="Custom instructions for the LLM when generating image prompts..."
              />
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 justify-end">
            <button
              onClick={onSave}
              disabled={loading}
              className="px-3 py-1.5 text-xs border border-gray-600 rounded-lg text-gray-300 hover:text-white hover:border-gray-400 disabled:opacity-30 transition-colors"
            >
              {loading ? "Saving..." : "Save"}
            </button>
            <button
              onClick={onSaveAndRegenerate}
              disabled={loading}
              className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              {loading ? "Regenerating..." : "Save & Regenerate"}
            </button>
          </div>
        </>
      )}

      {/* No style selected hint (for scene override) */}
      {!value && showClearButton && (
        <p className="text-xs text-gray-600 italic">
          Using project default style. Select a template above to override for this scene.
        </p>
      )}
    </div>
  );
}
