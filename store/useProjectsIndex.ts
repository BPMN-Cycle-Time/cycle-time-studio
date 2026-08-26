"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuid } from "uuid";
import { BlockType, BlockMode, type Project, type ProjectSummary } from "@/types";

interface ProjectsIndexState {
  projects: ProjectSummary[];
  createProject: (name: string) => Project;
  renameProject: (id: string, name: string) => void;
  deleteProject: (id: string) => void;
  duplicateProject: (id: string) => Project | null;
  touch: (id: string, name?: string) => void;
}

const PROJECT_KEY = (id: string) => `cycletime:project:${id}`;

export function loadProject(id: string): Project | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(PROJECT_KEY(id));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Project;
  } catch {
    return null;
  }
}

export function saveProjectData(project: Project) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROJECT_KEY(project.id), JSON.stringify(project));
}

function deleteProjectData(id: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PROJECT_KEY(id));
}

export function emptyProject(name: string): Project {
  const now = Date.now();
  return {
    id: uuid(),
    name,
    unit: "hours",
    tasks: [],
    blocks: [{ id: uuid(), type: BlockType.SEQ, label: "Step 1", time: 1, mode: BlockMode.SIMPLE }],
    createdAt: now,
    updatedAt: now,
  };
}

export const useProjectsIndex = create<ProjectsIndexState>()(
  persist(
    (set) => ({
      projects: [],
      createProject: (name) => {
        const project = emptyProject(name || "Untitled process");
        saveProjectData(project);
        set((s) => ({
          projects: [
            { id: project.id, name: project.name, updatedAt: project.updatedAt },
            ...s.projects,
          ],
        }));
        return project;
      },
      renameProject: (id, name) => {
        set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, name } : p)) }));
        const proj = loadProject(id);
        if (proj) saveProjectData({ ...proj, name, updatedAt: Date.now() });
      },
      deleteProject: (id) => {
        deleteProjectData(id);
        set((s) => ({ projects: s.projects.filter((p) => p.id !== id) }));
      },
      duplicateProject: (id) => {
        const src = loadProject(id);
        if (!src) return null;
        const copy: Project = {
          ...src,
          id: uuid(),
          name: src.name + " (copy)",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        saveProjectData(copy);
        set((s) => ({
          projects: [{ id: copy.id, name: copy.name, updatedAt: copy.updatedAt }, ...s.projects],
        }));
        return copy;
      },
      touch: (id, name) => {
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id ? { ...p, name: name ?? p.name, updatedAt: Date.now() } : p,
          ),
        }));
      },
    }),
    { name: "cycletime:projects-index" },
  ),
);
