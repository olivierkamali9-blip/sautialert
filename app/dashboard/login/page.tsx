"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabaseBrowser.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      setError("Identifiants incorrects. Vérifiez votre email et mot de passe.");
      return;
    }
    router.push("/dashboard");
  };

  return (
    <main className="flex-1 flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="font-serif text-lg text-deep mb-10 text-center">
          Sauti<span className="text-brick">Alert</span>
        </div>
        <h1 className="font-serif text-2xl text-deep mb-2 text-center">Espace équipe</h1>
        <p className="text-sm text-[#6b6b64] text-center mb-8">
          Connexion réservée à l'équipe MEAL
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-[#6b6b64] block mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-md border border-deep/15 bg-white text-sm outline-none focus:border-deep"
            />
          </div>
          <div>
            <label className="text-xs text-[#6b6b64] block mb-1.5">Mot de passe</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-md border border-deep/15 bg-white text-sm outline-none focus:border-deep"
            />
          </div>

          {error && <p className="text-sm text-brick">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 bg-deep text-cream text-sm font-medium py-2.5 rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>
      </div>
    </main>
  );
}
