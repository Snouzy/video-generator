import { useMemo } from "react";
import {
  calculateSceneCost,
  AVAILABLE_IMAGE_MODELS,
  AVAILABLE_CLIP_MODELS,
} from "@video-generator/shared";

interface CostEstimateProps {
  imageModels: string[];
  imagesPerScene: number;
  imageResolutions?: Record<string, string>;
  animationModels: string[];
  clipsPerScene: number;
  clipDuration?: number;
  generateAudio?: boolean;
}

function formatCost(amount: number): string {
  if (amount === 0) return "$0.00";
  if (amount < 0.01) return `$${amount.toFixed(4)}`;
  if (amount < 1) return `$${amount.toFixed(3)}`;
  return `$${amount.toFixed(2)}`;
}

function getModelLabel(modelId: string): string {
  const img = AVAILABLE_IMAGE_MODELS.find((m) => m.id === modelId);
  if (img) return img.label;
  const clip = AVAILABLE_CLIP_MODELS.find((m) => m.id === modelId);
  if (clip) return clip.label;
  return modelId;
}

export default function CostEstimate({
  imageModels,
  imagesPerScene,
  imageResolutions,
  animationModels,
  clipsPerScene,
  clipDuration = 5,
  generateAudio = false,
}: CostEstimateProps) {
  const cost = useMemo(
    () =>
      calculateSceneCost({
        imageModels,
        imagesPerScene,
        imageResolutions,
        animationModels,
        clipsPerScene,
        clipDuration,
        generateAudio,
      }),
    [imageModels, imagesPerScene, imageResolutions, animationModels, clipsPerScene, clipDuration, generateAudio]
  );

  if (cost.breakdown.length === 0) return null;

  const imageItems = cost.breakdown.filter((b) => b.type === "image");
  const clipItems = cost.breakdown.filter((b) => b.type === "clip");

  return (
    <div className="border-t border-gray-700/50 pt-3 mt-3">
      <label className="block text-xs font-medium text-gray-400 mb-2">
        Estimated cost per scene
      </label>
      <div className="space-y-1.5 text-[11px]">
        {imageItems.length > 0 && (
          <div>
            <span className="text-gray-500 font-medium">Images</span>
            {imageItems.map((item) => (
              <div key={item.model} className="flex justify-between text-gray-400 pl-2">
                <span>
                  {getModelLabel(item.model)}{" "}
                  <span className="text-gray-600">
                    ({formatCost(item.unitCost)} × {item.quantity})
                  </span>
                </span>
                <span>{formatCost(item.subtotal)}</span>
              </div>
            ))}
          </div>
        )}
        {clipItems.length > 0 && (
          <div>
            <span className="text-gray-500 font-medium">Clips</span>
            {clipItems.map((item) => (
              <div key={item.model} className="flex justify-between text-gray-400 pl-2">
                <span>
                  {getModelLabel(item.model)}{" "}
                  <span className="text-gray-600">
                    ({formatCost(item.unitCost)} × {item.quantity})
                  </span>
                </span>
                <span>{formatCost(item.subtotal)}</span>
              </div>
            ))}
          </div>
        )}
        <div className="pt-1 border-t border-gray-700/30 space-y-0.5">
          {imageItems.length > 0 && (
            <div className="flex justify-between text-gray-400">
              <span>Total images</span>
              <span>{formatCost(cost.imageCost)}</span>
            </div>
          )}
          {clipItems.length > 0 && (
            <div className="flex justify-between text-gray-400">
              <span>Total clips</span>
              <span>{formatCost(cost.clipCost)}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-300 font-medium">
            <span>Total</span>
            <span>{formatCost(cost.totalCost)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
