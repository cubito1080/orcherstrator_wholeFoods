"use client";

import { Save } from "lucide-react";
import { FormEvent, useState } from "react";
import { api } from "../lib/api-client";
import type { PriceItem } from "../lib/types";
import { useAsyncData } from "../lib/use-async-data";
import { AppShell, ErrorPanel, RefreshButton, Toolbar } from "../components";

export default function PriceCatalogPage() {
  const { data: items, error, refetch } = useAsyncData<PriceItem[]>(() => api.listPrices());
  const [label, setLabel] = useState("");
  const [unitPrice, setUnitPrice] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await api.upsertPrice({ label, unitPrice, unit: "each" });
      setLabel("");
      setUnitPrice(0);
      setFormError(null);
      await refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "failed to save price");
    }
  }

  return (
    <AppShell>
      <Toolbar
        title="Price catalog"
        subtitle="Labels must match worker detection labels for automatic pricing."
      >
        <RefreshButton onClick={() => void refetch()} />
      </Toolbar>
      <ErrorPanel message={error} />
      <form className="panel" onSubmit={(event) => void submit(event)}>
        <label className="field">
          Label
          <input value={label} onChange={(event) => setLabel(event.target.value)} required />
        </label>
        <label className="field">
          Unit price
          <input
            min="0"
            step="0.01"
            type="number"
            value={unitPrice}
            onChange={(event) => setUnitPrice(Number(event.target.value))}
            required
          />
        </label>
        <ErrorPanel message={formError} />
        <button className="btn">
          <Save size={16} /> Save
        </button>
      </form>
      <section className="panel" style={{ marginTop: 16 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Label</th>
              <th>Unit</th>
              <th>Price</th>
            </tr>
          </thead>
          <tbody>
            {(items ?? []).map((item) => (
              <tr key={item.id}>
                <td>{item.label}</td>
                <td>{item.unit}</td>
                <td>${item.unitPrice.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
