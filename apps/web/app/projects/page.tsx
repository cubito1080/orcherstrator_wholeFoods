"use client";

import Link from "next/link";
import { FilePlus2 } from "lucide-react";
import { api } from "../lib/api-client";
import type { Project } from "../lib/types";
import { useAsyncData } from "../lib/use-async-data";
import { AppShell, Badge, ErrorPanel, RefreshButton, Toolbar } from "../components";

export default function ProjectsPage() {
  const { data: projects, error, refetch } = useAsyncData<Project[]>(() => api.listProjects());

  return (
    <AppShell>
      <Toolbar
        title="Projects"
        subtitle="Electrical drawing sets waiting for processing or review."
      >
        <RefreshButton onClick={() => void refetch()} />
        <Link className="btn" href="/projects/new">
          <FilePlus2 size={16} /> New
        </Link>
      </Toolbar>
      <ErrorPanel message={error} />
      <div className="grid project-grid">
        {(projects ?? []).map((project) => (
          <Link className="card" key={project.id} href={`/projects/${project.id}`}>
            <h3>{project.name}</h3>
            <p>
              <Badge>{project.status}</Badge>
            </p>
            <p className="muted">{new Date(project.createdAt).toLocaleString()}</p>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
