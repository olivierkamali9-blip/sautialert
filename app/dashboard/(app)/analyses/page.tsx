"use client";

import { useEffect, useState } from "react";

type Signalement = {
  id: string;
  categorie: string;
  urgence: "critique" | "elevee" | "moyenne" | "faible";
  statut: "nouveau" | "en_cours" | "resolu";
  langue: string;
  anonyme: boolean;
  created_at: string;
};

const CATEGORIE_LABELS: Record<string, string> = {
  demande_information: "Demande d'information",
  demande_assistance: "Demande d'assistance",
  insatisfaction_mineure: "Insatisfaction mineure",
  insatisfaction_majeure: "Insatisfaction majeure",
  violation_code_conduite: "Violation code de conduite",
  allegation_abus: "Allégation d'abus (PSEA)",
  commentaire_general: "Commentaire général",
};

const URGENCE_LABELS: Record<string, string> = {
  critique: "Critique",
  elevee: "Élevée",
  moyenne: "Moyenne",
  faible: "Faible",
};

function BarRow({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="mb-3">
      <div className="flex justify-between text-[13px] mb-1">
        <span className="text-ink">{label}</span>
        <span className="text-[#8a8a82]">{count}</span>
      </div>
      <div className="h-2 bg-deep/8 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export default function AnalysesPage() {
  const [tickets, setTickets] = useState<Signalement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tickets")
      .then((res) => res.json())
      .then((data) => setTickets(data))
      .finally(() => setLoading(false));
  }, []);

  const total = tickets.length;

  const parCategorie = Object.keys(CATEGORIE_LABELS).map((key) => ({
    key,
    label: CATEGORIE_LABELS[key],
    count: tickets.filter((t) => t.categorie === key).length,
  }));

  const parUrgence = (["critique", "elevee", "moyenne", "faible"] as const).map((key) => ({
    key,
    label: URGENCE_LABELS[key],
    count: tickets.filter((t) => t.urgence === key).length,
  }));

  const parLangue = Object.entries(
    tickets.reduce<Record<string, number>>((acc, t) => {
      acc[t.langue] = (acc[t.langue] || 0) + 1;
      return acc;
    }, {})
  );

  const tauxAnonymat = total > 0 ? Math.round((tickets.filter((t) => t.anonyme).length / total) * 100) : 0;
  const tauxResolution = total > 0 ? Math.round((tickets.filter((t) => t.statut === "resolu").length / total) * 100) : 0;

  // Signalements des 7 derniers jours, groupés par jour
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayStr = d.toISOString().slice(0, 10);
    const count = tickets.filter((t) => t.created_at.slice(0, 10) === dayStr).length;
    return { label: d.toLocaleDateString("fr-FR", { weekday: "short" }), count };
  });
  const maxDay = Math.max(1, ...last7Days.map((d) => d.count));

  if (loading) {
    return <div className="p-8 text-center text-sm text-[#8a8a82]">Chargement…</div>;
  }

  return (
    <>
      <div className="mb-7">
        <h1 className="font-serif text-2xl text-deep mb-1">Analyses</h1>
        <p className="text-[13.5px] text-[#6b6b64]">
          Vue d&apos;ensemble des {total} signalement{total !== 1 ? "s" : ""} enregistrés
        </p>
      </div>

      {/* Indicateurs clés */}
      <div className="grid grid-cols-3 gap-px bg-deep/12 border border-deep/12 mb-8">
        <div className="bg-[#FCFBF8] px-5 py-4">
          <div className="text-xs text-[#8a8a82] mb-1.5">Taux de résolution</div>
          <div className="font-serif text-[26px] text-deep">{tauxResolution}%</div>
        </div>
        <div className="bg-[#FCFBF8] px-5 py-4">
          <div className="text-xs text-[#8a8a82] mb-1.5">Signalements anonymes</div>
          <div className="font-serif text-[26px] text-deep">{tauxAnonymat}%</div>
        </div>
        <div className="bg-[#FCFBF8] px-5 py-4">
          <div className="text-xs text-[#8a8a82] mb-1.5">7 derniers jours</div>
          <div className="font-serif text-[26px] text-deep">
            {last7Days.reduce((sum, d) => sum + d.count, 0)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div className="bg-white border border-deep/12 p-6">
          <h2 className="text-sm font-medium text-deep mb-4">Par catégorie</h2>
          {parCategorie.map((c) => (
            <BarRow key={c.key} label={c.label} count={c.count} total={total} color="#5B7A6E" />
          ))}
        </div>

        <div className="bg-white border border-deep/12 p-6">
          <h2 className="text-sm font-medium text-deep mb-4">Par urgence</h2>
          {parUrgence.map((u) => (
            <BarRow
              key={u.key}
              label={u.label}
              count={u.count}
              total={total}
              color={u.key === "critique" || u.key === "elevee" ? "#C9603C" : "#5B7A6E"}
            />
          ))}

          <h2 className="text-sm font-medium text-deep mb-4 mt-7">Par langue</h2>
          {parLangue.map(([langue, count]) => (
            <BarRow key={langue} label={langue} count={count} total={total} color="#0F2E2B" />
          ))}
        </div>

        <div className="bg-white border border-deep/12 p-6 col-span-2">
          <h2 className="text-sm font-medium text-deep mb-4">Activité — 7 derniers jours</h2>
          <div className="flex items-end gap-3 h-32">
            {last7Days.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full bg-sage/70 rounded-t-sm transition-all"
                  style={{ height: `${(d.count / maxDay) * 100}%`, minHeight: d.count > 0 ? "4px" : "0" }}
                />
                <span className="text-[11px] text-[#8a8a82] capitalize">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
