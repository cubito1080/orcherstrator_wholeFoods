import Link from "next/link";
import { RefreshCw } from "lucide-react";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">Auto Estimator</div>
        <nav className="nav">
          <Link href="/projects">Projects</Link>
          <Link href="/projects/new">New project</Link>
          <Link href="/price-catalog">Price catalog</Link>
        </nav>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}

/** Page header with a title, optional subtitle, and a right-aligned action row. */
export function Toolbar({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="toolbar">
      <div>
        <h1>{title}</h1>
        {subtitle ? <p className="muted">{subtitle}</p> : null}
      </div>
      {children ? <div className="button-row">{children}</div> : null}
    </div>
  );
}

/** Renders an error banner, or nothing when there is no message. */
export function ErrorPanel({ message }: { message: string | null }) {
  if (!message) return null;
  return <div className="panel">{message}</div>;
}

export function Badge({ children }: { children: ReactNode }) {
  return <span className="badge">{children}</span>;
}

export function RefreshButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="btn secondary" onClick={onClick}>
      <RefreshCw size={16} /> Refresh
    </button>
  );
}
