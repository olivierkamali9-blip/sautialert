import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { Resend } from "resend";

function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

// Génère une référence lisible type SA-0142
async function nextReference(): Promise<string> {
  const { count } = await supabaseServer
    .from("signalements")
    .select("*", { count: "exact", head: true });
  const n = (count ?? 0) + 1;
  return `SA-${String(n).padStart(4, "0")}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      categorie,
      urgence,
      localite,
      zone_sante,
      langue,
      anonyme,
      nom_contact,
      sexe,
      age,
      contact_telephone,
      resume,
      transcript_complet,
    } = body;

    if (!categorie || !urgence || !langue || !resume) {
      return NextResponse.json(
        { error: "missing_fields" },
        { status: 400 }
      );
    }

    const reference = await nextReference();

    const { data: ticket, error } = await supabaseServer
      .from("signalements")
      .insert({
        reference,
        categorie,
        urgence,
        localite: localite ?? null,
        zone_sante: zone_sante ?? null,
        langue,
        anonyme: anonyme ?? true,
        nom_contact: anonyme ? null : nom_contact ?? null,
        sexe: sexe ?? null,
        age: age ?? null,
        contact_telephone: anonyme ? null : contact_telephone ?? null,
        resume,
        voie_depot: "agent_vocal",
        transcript_complet: transcript_complet ?? null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "db_insert_failed", detail: error.message }, { status: 500 });
    }

    // Alerte automatique si urgence critique (violation code de conduite / abus, toujours critique)
    let alerteEnvoyee = false;
    const alertRecipient = process.env.MEAL_ALERT_EMAIL;
    const resend = getResendClient();
    if (urgence === "critique" && alertRecipient && resend) {
      try {
        await resend.emails.send({
          from: process.env.ALERT_FROM_EMAIL || "SautiAlert <alerts@resend.dev>",
          to: alertRecipient,
          subject: `🔴 Signalement critique — ${reference}`,
          text: `Un signalement critique vient d'être enregistré.\n\nRéférence: ${reference}\nCatégorie: ${categorie}\nLieu: ${localite || "non précisé"}\nZone de santé: ${zone_sante || "non précisée"}\nLangue: ${langue}\n\nDélai de réponse requis: 1 à 3 jours (priorité 1 - Critique)\n\nRésumé:\n${resume}\n\nConsultez le tableau de bord SautiAlert pour plus de détails.`,
        });
        alerteEnvoyee = true;
        await supabaseServer
          .from("signalements")
          .update({ alerte_envoyee: true, alerte_destinataire: alertRecipient })
          .eq("id", ticket.id);
      } catch (mailErr) {
        console.error("alert_email_failed", mailErr);
      }
    }

    return NextResponse.json({ reference, alerte_envoyee: alerteEnvoyee });
  } catch (err) {
    return NextResponse.json({ error: "internal_error", detail: String(err) }, { status: 500 });
  }
}

// Liste des tickets pour le dashboard (protégé par Supabase Auth côté client via RLS)
export async function GET() {
  const { data, error } = await supabaseServer
    .from("signalements")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
