"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Signalements" },
  { href: "/dashboard/analyses", label: "Analyses" },
  { href: "/dashboard/equipe", label: "Équipe" },
  { href: "/dashboard/parametres", label: "Paramètres" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push("/dashboard/login");
        return;
      }
      setUserEmail(data.session.user.email ?? null);
      setChecked(true);
    });
  }, [router]);

  const handleLogout = async () => {
    await supabaseBrowser.auth.signOut();
    router.push("/dashboard/login");
  };

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-[#8a8a82]">
        Chargement…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-[216px] bg-deep text-cream p-7 flex flex-col shrink-0">
        <div className="font-serif text-[17px] mb-10">
          Sauti<span className="text-[#E8896A]">Alert</span>
        </div>
        <nav className="flex flex-col gap-0.5 text-[13.5px]">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2.5 rounded-md transition-colors ${
                pathname === item.href
                  ? "bg-cream/10 font-medium text-cream"
                  : "text-cream/65 hover:text-cream hover:bg-cream/5"
              }`}
            >
              {item.label}
            </Link>
          ))}
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

      <main className="flex-1 px-10 py-8 overflow-x-auto">{children}</main>
    </div>
  );
}
