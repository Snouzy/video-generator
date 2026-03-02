import type { ModelDefinition } from "@video-generator/shared";

interface ModelSelectorProps {
  label: string;
  availableModels: ModelDefinition[];
  selectedModels: string[];
  onChange: (models: string[]) => void;
}

export default function ModelSelector({
  label,
  availableModels,
  selectedModels,
  onChange,
}: ModelSelectorProps) {
  function toggle(id: string) {
    if (selectedModels.includes(id)) {
      onChange(selectedModels.filter((m) => m !== id));
    } else {
      onChange([...selectedModels, id]);
    }
  }

  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1.5">
        {label}
      </label>
      <div className="flex flex-wrap gap-1.5">
        {availableModels.map((m) => {
          const active = selectedModels.includes(m.id);
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => toggle(m.id)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                active
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {m.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
