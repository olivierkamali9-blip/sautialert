"use client";

import { useEffect, useState, useCallback } from "react";

type Signalement = {
  id: string;
  reference: string;
  categorie: string;
  urgence: "critique" | "elevee" | "moyenne" | "faible";
  statut: "nouveau" | "en_cours" | "resolu";
  localite: string | null;
  zone_sante: string | null;
  langue: string;
  anonyme: boolean;
  resume: string;
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

const LANGUE_LABELS: Record<string, string> = {
  francais: "Français",
  swahili: "Swahili",
  lingala: "Lingala",
};

function timeAgo(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Il y a ${hrs} h`;
  return new Date(dateStr).toLocaleDateString("fr-FR");
}

export default function DashboardPage() {
  const [tickets, setTickets] = useState<Signalement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("tous");

  const loadTickets = useCallback(async () => {
    const res = await fetch("/api/tickets");
    if (res.ok) {
      const data = await res.json();
      setTickets(data);
    }
    setLoading(false);
  }, []);

  const handleDelete = async (id: string, reference: string) => {
    const confirmed = window.confirm(
      `Supprimer définitivement le signalement ${reference} ? Cette action est irréversible.`
    );
    if (!confirmed) return;

    const res = await fetch(`/api/tickets/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTickets((prev) => prev.filter((t) => t.id !== id));
    } else {
      alert("Erreur lors de la suppression. Réessayez.");
    }
  };

  const handleStatusChange = async (id: string, statut: Signalement["statut"]) => {
    const previous = tickets;
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, statut } : t)));

    const res = await fetch(`/api/tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut }),
    });
    if (!res.ok) {
      setTickets(previous);
      alert("Erreur lors de la mise à jour du statut. Réessayez.");
    }
  };

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const filtered = tickets.filter((t) => {
    if (filter === "tous") return true;
    if (filter === "urgent") return t.urgence === "critique" || t.urgence === "elevee";
    if (filter === "anonymes") return t.anonyme;
    return t.categorie === filter;
  });

  const stats = {
    total: tickets.length,
    urgentsNonTraites: tickets.filter((t) => (t.urgence === "critique" || t.urgence === "elevee") && t.statut !== "resolu").length,
    enCours: tickets.filter((t) => t.statut === "en_cours").length,
    resolus: tickets.filter((t) => t.statut === "resolu").length,
  };

  return (
    <>
      <div className="flex justify-between items-start mb-7">
        <div>
          <h1 className="font-serif text-2xl text-deep mb-1">Signalements</h1>
          <p className="text-[13.5px] text-[#6b6b64]">
            {tickets.length} signalement{tickets.length !== 1 ? "s" : ""} au total
          </p>
        </div>
        <a
          href="/api/tickets/export"
          className="bg-white border border-deep/12 text-ink px-4 py-2.5 rounded-md text-[13px] font-medium hover:bg-deep/5 transition-colors"
        >
          ↓ Exporter en Excel
        </a>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-px bg-deep/12 border border-deep/12 mb-7">
        {[
          { label: "Total reçus", value: stats.total },
          { label: "Urgents non traités", value: stats.urgentsNonTraites, alert: true },
          { label: "En cours", value: stats.enCours },
          { label: "Résolus", value: stats.resolus },
        ].map((s) => (
          <div key={s.label} className="bg-[#FCFBF8] px-5 py-4">
            <div className="text-xs text-[#8a8a82] mb-1.5">{s.label}</div>
            <div className={`font-serif text-[26px] ${s.alert ? "text-brick" : "text-deep"}`}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {[
          { key: "tous", label: "Tous" },
          { key: "urgent", label: "Critique / Élevé" },
          { key: "allegation_abus", label: "Allégations d'abus" },
          { key: "insatisfaction_majeure", label: "Insatisfaction majeure" },
          { key: "anonymes", label: "Anonymes" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-[12.5px] px-3.5 py-1.5 rounded-full border transition-colors ${
              filter === f.key
                ? "bg-deep text-white border-deep"
                : "bg-white border-deep/12 text-[#565650]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-deep/12 overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-sm text-[#8a8a82]">Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#8a8a82]">Aucun signalement pour ce filtre.</div>
        ) : (
          <table className="w-full text-[13.5px]">
            <thead>
              <tr className="text-left border-b border-deep/12">
                {["ID", "Résumé", "Catégorie", "Urgence", "Zone de santé", "Localité", "Langue", "Statut", "Reçu", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-[11.5px] uppercase tracking-wide text-[#8a8a82] font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-b border-deep/12 last:border-0 hover:bg-[#FAF9F5]">
                  <td className="px-4 py-3.5 text-[#8a8a82] text-xs">{t.reference}</td>
                  <td className="px-4 py-3.5 min-w-[260px] max-w-[360px] whitespace-normal text-[#3a3a36] leading-relaxed">
                    {t.resume}
                  </td>
                  <td className="px-4 py-3.5">{CATEGORIE_LABELS[t.categorie] ?? t.categorie}</td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-medium ${
                        t.urgence === "critique"
                          ? "bg-brick/12 text-brick"
                          : t.urgence === "elevee"
                          ? "bg-brick/8 text-brick"
                          : t.urgence === "moyenne"
                          ? "bg-sage/15 text-sage"
                          : "bg-deep/7 text-deep"
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {URGENCE_LABELS[t.urgence] ?? t.urgence}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">{t.zone_sante || "—"}</td>
                  <td className="px-4 py-3.5">{t.localite || "—"}</td>
                  <td className="px-4 py-3.5">{LANGUE_LABELS[t.langue] ?? t.langue}</td>
                  <td className="px-4 py-3.5">
                    <select
                      value={t.statut}
                      onChange={(e) =>
                        handleStatusChange(t.id, e.target.value as Signalement["statut"])
                      }
                      className={`text-xs font-medium bg-transparent border-none outline-none cursor-pointer ${
                        t.statut === "nouveau"
                          ? "text-brick"
                          : t.statut === "en_cours"
                          ? "text-sage"
                          : "text-[#8a8a82]"
                      }`}
                    >
                      <option value="nouveau">Nouveau</option>
                      <option value="en_cours">En cours</option>
                      <option value="resolu">Résolu</option>
                    </select>
                  </td>
                  <td className="px-4 py-3.5 text-[#6b6b64]">{timeAgo(t.created_at)}</td>
                  <td className="px-4 py-3.5">
                    <button
                      onClick={() => handleDelete(t.id, t.reference)}
                      className="text-xs text-[#8a8a82] hover:text-brick transition-colors"
                      title="Supprimer ce signalement"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

