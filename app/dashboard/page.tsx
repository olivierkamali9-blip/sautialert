"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

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
  const router = useRouter();
  const [tickets, setTickets] = useState<Signalement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("tous");
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const loadTickets = useCallback(async () => {
    const res = await fetch("/api/tickets");
    if (res.ok) {
      const data = await res.json();
      setTickets(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push("/dashboard/login");
        return;
      }
      setUserEmail(data.session.user.email ?? null);
      loadTickets();
    });
  }, [router, loadTickets]);

  const handleLogout = async () => {
    await supabaseBrowser.auth.signOut();
    router.push("/dashboard/login");
  };

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
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-[216px] bg-deep text-cream p-7 flex flex-col shrink-0">
        <div className="font-serif text-[17px] mb-10">
          Sauti<span className="text-[#E8896A]">Alert</span>
        </div>
        <nav className="flex flex-col gap-0.5 text-[13.5px]">
          <div className="px-3 py-2.5 rounded-md bg-cream/10 font-medium flex justify-between items-center">
            Signalements
            <span className="text-[11px] bg-brick text-white px-1.5 py-0.5 rounded-full">
              {stats.urgentsNonTraites}
            </span>
          </div>
        </nav>
        <div className="mt-auto text-xs text-cream/45 border-t border-cream/15 pt-4">
          {process.env.NEXT_PUBLIC_ORG_NAME || "Votre organisation"}
          <br />
          {userEmail}
          <button onClick={handleLogout} className="block mt-3 text-cream/70 hover:text-cream underline">
            Se déconnecter
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 px-10 py-8">
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
                  {["ID", "Résumé", "Catégorie", "Urgence", "Zone de santé", "Localité", "Langue", "Statut", "Reçu"].map((h) => (
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
                      <span
                        className={`text-xs font-medium ${
                          t.statut === "nouveau"
                            ? "text-brick"
                            : t.statut === "en_cours"
                            ? "text-sage"
                            : "text-[#8a8a82]"
                        }`}
                      >
                        {t.statut === "nouveau" ? "Nouveau" : t.statut === "en_cours" ? "En cours" : "Résolu"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[#6b6b64]">{timeAgo(t.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
