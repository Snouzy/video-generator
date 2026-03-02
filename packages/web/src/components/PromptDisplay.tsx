import { useState } from "react";
import Skeleton from "./Skeleton";

interface PromptDisplayProps {
  prompt: string;
  loading?: boolean;
  truncateAt?: number;
}

export default function PromptDisplay({
  prompt,
  loading = false,
  truncateAt = 150,
}: PromptDisplayProps) {
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return <Skeleton lines={2} className="my-1" />;
  }

  if (!prompt) return null;

  const needsTruncation = prompt.length > truncateAt;
  const displayText = expanded || !needsTruncation ? prompt : prompt.slice(0, truncateAt) + "...";

  return (
    <p className="text-sm text-gray-400 leading-relaxed transition-opacity duration-300 animate-in fade-in">
      &quot;{displayText}&quot;
      {needsTruncation && (
        <button
          className="ml-2 text-blue-400 hover:text-blue-300 text-sm"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </p>
  );
}
