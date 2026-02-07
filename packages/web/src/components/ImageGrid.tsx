import type { GeneratedImage, VideoFormat } from "@video-generator/shared";
import ImageCard from "./ImageCard";

interface ImageGridProps {
  images: GeneratedImage[];
  onSelect: (id: number) => void;
  onRegenerate: (id: number) => void;
  sceneLabel: string;
  format?: VideoFormat;
}

export default function ImageGrid({
  images,
  onSelect,
  onRegenerate,
  sceneLabel,
  format = "16:9",
}: ImageGridProps) {
  if (images.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">
        No images generated yet for this scene.
      </div>
    );
  }

  return (
    <div className={`grid gap-4 ${format === "9:16" ? "grid-cols-4" : "grid-cols-2"}`}>
      {images.map((image, index) => (
        <ImageCard
          key={image.id}
          image={image}
          index={index}
          sceneLabel={sceneLabel}
          onSelect={onSelect}
          onRegenerate={onRegenerate}
          isSelected={image.isSelected}
          format={format}
        />
      ))}
    </div>
  );
}
