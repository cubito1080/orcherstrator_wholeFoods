"use client";

import { Download, RefreshCw } from "lucide-react";
import { api } from "../../../lib/api-client";
import type { BudgetResponse } from "../../../lib/types";
import { useAsyncData } from "../../../lib/use-async-data";
import { useProjectId } from "../../../lib/use-project-id";
import { AppShell, ErrorPanel, RefreshButton, Toolbar } from "../../../components";

type PageProps = { params: Promise<{ id: string }> };

export default function BudgetPage({ params }: PageProps) {
  const id = useProjectId(params);
  const { data: budget, error, refetch } = useAsyncData<BudgetResponse>(() => api.getBudget(id), [id], {
    enabled: Boolean(id),
  });

  async function recalculate() {
    await api.recalculateBudget(id);
    await refetch();
  }

  return (
    <AppShell>
      <Toolbar title="Budget" subtitle="Reviewed symbols priced into line items.">
        <RefreshButton onClick={() => void refetch()} />
        <button className="btn" onClick={() => void recalculate()}>
          <RefreshCw size={16} /> Recalculate
        </button>
        <a className="btn secondary" href={api.exportCsvUrl(id)}>
          <Download size={16} /> CSV
        </a>
      </Toolbar>
      <ErrorPanel message={error} />
      <section className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Quantity</th>
              <th>Unit price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {(budget?.lineItems ?? []).map((item) => (
              <tr key={item.id}>
                <td>{item.description}</td>
                <td>{item.quantity}</td>
                <td>${item.unitPrice.toFixed(2)}</td>
                <td>${item.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h2>Total ${budget?.budget?.total.toFixed(2) ?? "0.00"}</h2>
      </section>
    </AppShell>
  );
}
