import type { GeneratedImage } from "@video-generator/shared";
import ImageCard from "./ImageCard";

interface ImageGridProps {
  images: GeneratedImage[];
  onSelect: (id: number) => void;
  onRegenerate: (id: number) => void;
  sceneLabel: string;
}

export default function ImageGrid({
  images,
  onSelect,
  onRegenerate,
  sceneLabel,
}: ImageGridProps) {
  if (images.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">
        No images generated yet for this scene.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {images.map((image, index) => (
        <ImageCard
          key={image.id}
          image={image}
          index={index}
          sceneLabel={sceneLabel}
          onSelect={onSelect}
          onRegenerate={onRegenerate}
          isSelected={image.isSelected}
        />
      ))}
    </div>
  );
}
