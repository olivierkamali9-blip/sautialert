import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import * as XLSX from "xlsx";

export async function GET() {
  const { data, error } = await supabaseServer
    .from("signalements")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []).map((t) => ({
    Référence: t.reference,
    Catégorie: t.categorie,
    Urgence: t.urgence,
    Statut: t.statut,
    Lieu: t.lieu ?? "",
    Langue: t.langue,
    Anonyme: t.anonyme ? "Oui" : "Non",
    "Nom du contact": t.nom_contact ?? "",
    Téléphone: t.contact_telephone ?? "",
    Résumé: t.resume,
    "Alerte envoyée": t.alerte_envoyee ? "Oui" : "Non",
    "Reçu le": new Date(t.created_at).toLocaleString("fr-FR"),
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Signalements");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="sautialert-signalements-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
