"use client";

import { UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { api } from "../../lib/api-client";
import { AppShell, ErrorPanel, Toolbar } from "../../components";

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      setError("Choose an electrical PDF first.");
      return;
    }
    setBusy(true);
    try {
      const project = await api.createProject(name);
      await api.uploadPdf(project.id, file);
      router.push(`/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "project creation failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <Toolbar title="New project" subtitle="Upload one electrical drawing set PDF." />
      <form className="panel" onSubmit={(event) => void submit(event)}>
        <label className="field">
          Project name
          <input value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
        <label className="field">
          Electrical PDF
          <input
            accept="application/pdf"
            type="file"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            required
          />
        </label>
        <ErrorPanel message={error} />
        <button className="btn" disabled={busy}>
          <UploadCloud size={16} /> {busy ? "Uploading" : "Create project"}
        </button>
      </form>
    </AppShell>
  );
}
