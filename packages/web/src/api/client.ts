import type {
  Project,
  Scene,
  GeneratedImage,
  GeneratedClip,
  CreateProjectRequest,
  UpdateSceneRequest,
  ElevenLabsVoice,
  StyleTemplate,
  StyleTemplateValue,
  SceneGenerationOverride,
} from "@video-generator/shared";

const API_BASE = "http://localhost:3001";

/** Resolve a media URL — local paths get prefixed with API_BASE */
export function mediaUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${API_BASE}${url}`;
}

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "API error");
  return json.data;
}

export function getProjects(): Promise<Project[]> {
  return fetchApi<Project[]>("/api/projects");
}

export function getProject(id: number): Promise<Project> {
  return fetchApi<Project>(`/api/projects/${id}`);
}

export function createProject(data: CreateProjectRequest): Promise<Project> {
  return fetchApi<Project>("/api/projects", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function splitProject(id: number): Promise<Scene[]> {
  return fetchApi<Scene[]>(`/api/projects/${id}/split`, { method: "POST" });
}

export function generateAllImages(id: number): Promise<void> {
  return fetchApi<void>(`/api/projects/${id}/generate-all-images`, {
    method: "POST",
  });
}

export function getScenes(projectId: number): Promise<Scene[]> {
  return fetchApi<Scene[]>(`/api/projects/${projectId}/scenes`);
}

export function updateScene(
  id: number,
  data: UpdateSceneRequest
): Promise<Scene> {
  return fetchApi<Scene>(`/api/scenes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function generateSceneImages(sceneId: number): Promise<void> {
  return fetchApi<void>(`/api/scenes/${sceneId}/generate-images`, {
    method: "POST",
  });
}

export function generateSceneClips(sceneId: number): Promise<void> {
  return fetchApi<void>(`/api/scenes/${sceneId}/generate-clips`, {
    method: "POST",
  });
}

export function getSceneImages(sceneId: number): Promise<GeneratedImage[]> {
  return fetchApi<GeneratedImage[]>(`/api/scenes/${sceneId}/images`);
}

export function selectImage(imageId: number): Promise<GeneratedImage> {
  return fetchApi<GeneratedImage>(`/api/images/${imageId}/select`, {
    method: "PATCH",
  });
}

export function getSceneClips(sceneId: number): Promise<GeneratedClip[]> {
  return fetchApi<GeneratedClip[]>(`/api/scenes/${sceneId}/clips`);
}

export function selectClip(clipId: number): Promise<GeneratedClip> {
  return fetchApi<GeneratedClip>(`/api/clips/${clipId}/select`, {
    method: "PATCH",
  });
}

export function regenerateImage(imageId: number): Promise<void> {
  return fetchApi<void>(`/api/images/${imageId}/regenerate`, {
    method: "POST",
  });
}

export function regenerateClip(clipId: number): Promise<void> {
  return fetchApi<void>(`/api/clips/${clipId}/regenerate`, {
    method: "POST",
  });
}

export function generateAllClips(projectId: number): Promise<void> {
  return fetchApi<void>(`/api/projects/${projectId}/generate-all-clips`, {
    method: "POST",
  });
}

export function renderProject(projectId: number): Promise<{ message: string; clipCount: number }> {
  return fetchApi<{ message: string; clipCount: number }>(
    `/api/projects/${projectId}/render`,
    { method: "POST" }
  );
}

import type { ProjectConfig } from "@video-generator/shared";

export function updateProjectConfig(projectId: number, config: Partial<ProjectConfig>): Promise<Project> {
  return fetchApi<Project>(`/api/projects/${projectId}/config`, {
    method: "PATCH",
    body: JSON.stringify(config),
  });
}

export function getVoices(): Promise<ElevenLabsVoice[]> {
  return fetchApi<ElevenLabsVoice[]>("/api/voices");
}

export function generateNarration(projectId: number): Promise<void> {
  return fetchApi<void>(`/api/projects/${projectId}/generate-narration`, {
    method: "POST",
  });
}

export function regeneratePrompts(projectId: number): Promise<void> {
  return fetchApi<void>(`/api/projects/${projectId}/regenerate-prompts`, {
    method: "POST",
  });
}

// --- Style Templates ---

export function getStyleTemplates(): Promise<StyleTemplate[]> {
  return fetchApi<StyleTemplate[]>("/api/style-templates");
}

export function createStyleTemplate(data: {
  name: string;
  description?: string;
  stylePromptPrefix: string;
  llmSystemInstructions: string;
}): Promise<StyleTemplate> {
  return fetchApi<StyleTemplate>("/api/style-templates", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateStyleTemplate(
  id: number,
  data: Partial<{ name: string; description: string; stylePromptPrefix: string; llmSystemInstructions: string }>
): Promise<StyleTemplate> {
  return fetchApi<StyleTemplate>(`/api/style-templates/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteStyleTemplate(id: number): Promise<void> {
  return fetchApi<void>(`/api/style-templates/${id}`, { method: "DELETE" });
}

export function regenerateScenePrompt(sceneId: number): Promise<Scene> {
  return fetchApi<Scene>(`/api/scenes/${sceneId}/regenerate-prompt`, {
    method: "POST",
  });
}

export function updateSceneStyleOverride(
  sceneId: number,
  styleOverride: StyleTemplateValue | null
): Promise<Scene> {
  return fetchApi<Scene>(`/api/scenes/${sceneId}`, {
    method: "PATCH",
    body: JSON.stringify({ styleOverride }),
  });
}

export function updateSceneGenerationOverride(
  sceneId: number,
  generationOverride: SceneGenerationOverride | null
): Promise<Scene> {
  return fetchApi<Scene>(`/api/scenes/${sceneId}`, {
    method: "PATCH",
    body: JSON.stringify({ generationOverride }),
  });
}
