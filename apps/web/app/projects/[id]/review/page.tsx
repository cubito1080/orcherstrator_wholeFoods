"use client";

import { Check, Save, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../../lib/api-client";
import type { Detection } from "../../../lib/types";
import { useAsyncData } from "../../../lib/use-async-data";
import { useProjectId } from "../../../lib/use-project-id";
import { AppShell, Badge, ErrorPanel, RefreshButton, Toolbar } from "../../../components";

type PageProps = { params: Promise<{ id: string }> };

// The plan surface is a fixed-size placeholder. Worker bounding boxes are
// expressed in these logical units; dividing by units/100 maps them to CSS %.
const SURFACE_WIDTH_UNITS = 3456;
const SURFACE_HEIGHT_UNITS = 2592;
const X_SCALE = SURFACE_WIDTH_UNITS / 100;
const Y_SCALE = SURFACE_HEIGHT_UNITS / 100;

export default function ReviewPage({ params }: PageProps) {
  const id = useProjectId(params);
  const { data, error, refetch } = useAsyncData<Detection[]>(() => api.listDetections(id), [id], {
    enabled: Boolean(id),
  });

  // Local editable copy, seeded from the fetched detections.
  const [rows, setRows] = useState<Detection[]>([]);
  useEffect(() => {
    if (data) setRows(data);
  }, [data]);

  async function review(detectionId: string, command: "accept" | "reject") {
    await api.setDetectionStatus(id, detectionId, command);
    await refetch();
  }

  async function save(detection: Detection) {
    await api.updateDetection(id, detection.id, {
      label: detection.label,
      quantity: Number(detection.quantity),
      box: detection.box,
    });
    await refetch();
  }

  function patchRow(detectionId: string, patch: Partial<Detection>) {
    setRows((items) => items.map((item) => (item.id === detectionId ? { ...item, ...patch } : item)));
  }

  const pageZero = useMemo(() => rows.filter((detection) => detection.box.page === 0), [rows]);

  return (
    <AppShell>
      <Toolbar title="Review detections" subtitle={`${rows.length} symbols returned by the worker.`}>
        <RefreshButton onClick={() => void refetch()} />
      </Toolbar>
      <ErrorPanel message={error} />
      <div className="review-layout">
        <section className="plan-surface">
          {pageZero.map((detection) => (
            <div
              className={`box ${detection.reviewStatus === "rejected" ? "rejected" : ""}`}
              key={detection.id}
              title={`${detection.label} ${Math.round(detection.confidence * 100)}%`}
              style={{
                left: `${Math.max(0, detection.box.x / X_SCALE)}%`,
                top: `${Math.max(0, detection.box.y / Y_SCALE)}%`,
                width: `${Math.max(1, detection.box.width / X_SCALE)}%`,
                height: `${Math.max(1, detection.box.height / Y_SCALE)}%`,
              }}
            />
          ))}
        </section>
        <section className="panel">
          <table className="table">
            <thead>
              <tr>
                <th>Label</th>
                <th>Qty</th>
                <th>State</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((detection) => (
                <tr key={detection.id}>
                  <td>
                    <input
                      value={detection.label}
                      onChange={(event) => patchRow(detection.id, { label: event.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      min="0"
                      style={{ width: 64 }}
                      type="number"
                      value={detection.quantity}
                      onChange={(event) =>
                        patchRow(detection.id, { quantity: Number(event.target.value) })
                      }
                    />
                  </td>
                  <td>
                    <Badge>{detection.reviewStatus}</Badge>
                  </td>
                  <td>
                    <div className="button-row">
                      <button
                        className="btn secondary"
                        onClick={() => void save(detection)}
                        title="Save"
                      >
                        <Save size={14} />
                      </button>
                      <button
                        className="btn"
                        onClick={() => void review(detection.id, "accept")}
                        title="Accept"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        className="btn danger"
                        onClick={() => void review(detection.id, "reject")}
                        title="Reject"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </AppShell>
  );
}
