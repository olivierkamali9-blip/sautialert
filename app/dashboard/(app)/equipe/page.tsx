"use client";

import { useEffect, useState } from "react";

type Membre = {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return "Jamais connecté";
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function EquipePage() {
  const [membres, setMembres] = useState<Membre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/team")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => setMembres(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="mb-7">
        <h1 className="font-serif text-2xl text-deep mb-1">Équipe</h1>
        <p className="text-[13.5px] text-[#6b6b64]">
          Comptes ayant accès au tableau de bord SautiAlert
        </p>
      </div>

      <div className="bg-white border border-deep/12">
        {loading ? (
          <div className="p-8 text-center text-sm text-[#8a8a82]">Chargement…</div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-[#8a8a82]">
            Impossible de charger la liste de l&apos;équipe.
          </div>
        ) : (
          <table className="w-full text-[13.5px]">
            <thead>
              <tr className="text-left border-b border-deep/12">
                {["Email", "Membre depuis", "Dernière connexion"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-[11.5px] uppercase tracking-wide text-[#8a8a82] font-medium"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {membres.map((m) => (
                <tr key={m.id} className="border-b border-deep/12 last:border-0 hover:bg-[#FAF9F5]">
                  <td className="px-4 py-3.5">{m.email}</td>
                  <td className="px-4 py-3.5 text-[#6b6b64]">{formatDate(m.created_at)}</td>
                  <td className="px-4 py-3.5 text-[#6b6b64]">{formatDate(m.last_sign_in_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-6 text-[12.5px] text-[#8a8a82] leading-relaxed max-w-lg">
        Pour ajouter un nouveau membre à l&apos;équipe, rendez-vous dans votre projet Supabase →
        Authentication → Users → &quot;Add user&quot;, avec l&apos;option &quot;Auto Confirm User&quot;
        cochée.
      </div>
    </>
  );
}
