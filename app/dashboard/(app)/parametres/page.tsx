"use client";

import { useEffect, useState } from "react";

type CategorieConfig = {
  id: string;
  cle: string;
  libelle_fr: string;
  urgence_defaut: string;
  actif: boolean;
  ordre: number;
};

export default function ParametresPage() {
  const [categories, setCategories] = useState<CategorieConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => setCategories(data))
      .finally(() => setLoading(false));
  }, []);

  const toggleActif = async (cat: CategorieConfig) => {
    const newActif = !cat.actif;
    setCategories((prev) =>
      prev.map((c) => (c.id === cat.id ? { ...c, actif: newActif } : c))
    );
    const res = await fetch("/api/categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: cat.id, actif: newActif }),
    });
    if (!res.ok) {
      // Rollback en cas d'échec
      setCategories((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, actif: cat.actif } : c))
      );
    }
  };

  return (
    <>
      <div className="mb-7">
        <h1 className="font-serif text-2xl text-deep mb-1">Paramètres</h1>
        <p className="text-[13.5px] text-[#6b6b64]">
          Configuration de l&apos;organisation et des catégories de signalement
        </p>
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* Catégories */}
        <div className="bg-white border border-deep/12 p-6">
          <h2 className="text-sm font-medium text-deep mb-1">Catégories de signalement</h2>
          <p className="text-xs text-[#8a8a82] mb-5">
            Désactivez une catégorie pour qu&apos;elle ne soit plus proposée par l&apos;agent vocal.
          </p>
          {loading ? (
            <div className="text-sm text-[#8a8a82]">Chargement…</div>
          ) : (
            <div className="flex flex-col gap-1">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between py-2.5 border-b border-deep/8 last:border-0"
                >
                  <div>
                    <div className="text-[13.5px] text-ink">{cat.libelle_fr}</div>
                    <div className="text-[11px] text-[#8a8a82]">
                      Urgence par défaut : {cat.urgence_defaut}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleActif(cat)}
                    className={`w-10 h-6 rounded-full relative transition-colors shrink-0 ${
                      cat.actif ? "bg-deep" : "bg-deep/15"
                    }`}
                    aria-label={cat.actif ? "Désactiver" : "Activer"}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        cat.actif ? "translate-x-5" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Configuration organisation */}
        <div className="bg-white border border-deep/12 p-6">
          <h2 className="text-sm font-medium text-deep mb-1">Organisation</h2>
          <p className="text-xs text-[#8a8a82] mb-5">
            Ces réglages sont définis via les variables d&apos;environnement sur Vercel.
          </p>
          <div className="flex flex-col gap-4 text-[13.5px]">
            <div>
              <div className="text-[11px] text-[#8a8a82] mb-1">Nom affiché</div>
              <div className="text-ink">{process.env.NEXT_PUBLIC_ORG_NAME || "Votre organisation"}</div>
            </div>
            <div className="pt-3 border-t border-deep/8 text-[12.5px] text-[#8a8a82] leading-relaxed">
              Pour modifier le nom de l&apos;organisation ou l&apos;email de réception des alertes
              critiques, rendez-vous dans votre projet Vercel → Settings → Environment Variables
              (<code className="text-[11px] bg-deep/5 px-1 py-0.5 rounded">NEXT_PUBLIC_ORG_NAME</code>,{" "}
              <code className="text-[11px] bg-deep/5 px-1 py-0.5 rounded">MEAL_ALERT_EMAIL</code>), puis
              redéployez.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
