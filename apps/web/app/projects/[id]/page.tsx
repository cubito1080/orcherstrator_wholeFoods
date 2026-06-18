"use client";

import Link from "next/link";
import { Calculator, Play, ScanSearch } from "lucide-react";
import { useState } from "react";
import { api } from "../../lib/api-client";
import { useAsyncData } from "../../lib/use-async-data";
import { useProjectId } from "../../lib/use-project-id";
import { AppShell, Badge, ErrorPanel, RefreshButton, Toolbar } from "../../components";

type PageProps = { params: Promise<{ id: string }> };

export default function ProjectPage({ params }: PageProps) {
  const id = useProjectId(params);
  const [actionError, setActionError] = useState<string | null>(null);
  const { data, error, refetch } = useAsyncData(
    async () => {
      const [project, status] = await Promise.all([api.getProject(id), api.getStatus(id)]);
      return { project, status };
    },
    [id],
    { enabled: Boolean(id) },
  );

  async function process() {
    try {
      await api.process(id);
      await refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "processing failed");
    }
  }

  const project = data?.project ?? null;
  const status = data?.status ?? null;

  return (
    <AppShell>
      <Toolbar
        title={project?.name ?? "Project"}
        subtitle={`Status: ${status?.status ?? project?.status ?? "loading"}`}
      >
        <RefreshButton onClick={() => void refetch()} />
        <button className="btn" onClick={() => void process()}>
          <Play size={16} /> Process
        </button>
      </Toolbar>
      <ErrorPanel message={actionError ?? error} />
      <div className="grid project-grid">
        <Link className="card" href={`/projects/${id}/review`}>
          <ScanSearch size={24} />
          <h3>Review detections</h3>
          <p className="muted">Validate symbols and correct quantities.</p>
        </Link>
        <Link className="card" href={`/projects/${id}/budget`}>
          <Calculator size={24} />
          <h3>Budget</h3>
          <p className="muted">Review priced line items and exports.</p>
        </Link>
      </div>
      {status?.job ? (
        <div className="panel" style={{ marginTop: 16 }}>
          <h3>Latest job</h3>
          <p>
            <Badge>{status.job.status}</Badge>
          </p>
          {status.job.error ? <p className="muted">{status.job.error}</p> : null}
        </div>
      ) : null}
    </AppShell>
  );
}
