import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Project } from "@video-generator/shared";
import { getProjects } from "../api/client";

export default function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    getProjects()
      .then(setProjects)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const statusColor: Record<string, string> = {
    draft: "text-gray-400",
    splitting: "text-yellow-400",
    scenes_ready: "text-blue-400",
    generating_images: "text-yellow-400",
    images_ready: "text-green-400",
    generating_clips: "text-yellow-400",
    clips_ready: "text-green-400",
    completed: "text-green-500",
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Projects</h1>
          <button
            onClick={() => navigate("/projects/new")}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            + New Project
          </button>
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-gray-700 border-t-green-400 rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-400">
            {error}
          </div>
        )}

        {!loading && !error && projects.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            <p className="text-lg mb-2">No projects yet</p>
            <p className="text-sm">Create your first project to get started.</p>
          </div>
        )}

        <div className="grid gap-4">
          {projects.map((project) => (
            <div
              key={project.id}
              onClick={() => navigate(`/projects/${project.id}`)}
              className="bg-slate-900 border border-gray-800 rounded-lg p-5 cursor-pointer hover:border-gray-600 transition-colors"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{project.title}</h2>
                <span
                  className={`text-xs font-medium uppercase tracking-wider ${statusColor[project.status] || "text-gray-400"}`}
                >
                  {project.status.replace(/_/g, " ")}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <span>
                  {project.scenes?.length ?? 0} scene
                  {(project.scenes?.length ?? 0) !== 1 ? "s" : ""}
                </span>
                <span>
                  Created{" "}
                  {new Date(project.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
