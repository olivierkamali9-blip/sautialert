import { NextResponse } from "next/server";

// Génère un token temporaire AssemblyAI pour la connexion WebSocket côté navigateur.
// La clé API permanente reste côté serveur, jamais exposée au client.
export async function GET() {
  try {
    const url = new URL("https://agents.assemblyai.com/v1/token");
    url.searchParams.set("expires_in_seconds", "300");
    url.searchParams.set("max_session_duration_seconds", "8640");

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.ASSEMBLYAI_API_KEY}`,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: "assemblyai_token_failed", detail: errText },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: "internal_error", detail: String(err) },
      { status: 500 }
    );
  }
}
