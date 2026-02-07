import type { GeneratedClip } from "@video-generator/shared";
import ClipCard from "./ClipCard";

interface ClipGridProps {
  clips: GeneratedClip[];
  onSelect: (id: number) => void;
  onRegenerate: (id: number) => void;
  sceneLabel: string;
}

export default function ClipGrid({
  clips,
  onSelect,
  onRegenerate,
  sceneLabel,
}: ClipGridProps) {
  if (clips.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">
        No clips generated yet for this scene.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {clips.map((clip, index) => (
        <ClipCard
          key={clip.id}
          clip={clip}
          index={index}
          sceneLabel={sceneLabel}
          onSelect={onSelect}
          onRegenerate={onRegenerate}
          isSelected={clip.isSelected}
        />
      ))}
    </div>
  );
}
