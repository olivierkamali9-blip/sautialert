import { NextResponse } from "next/server";

// Génère un token temporaire AssemblyAI pour la connexion WebSocket côté navigateur.
// La clé API permanente reste côté serveur, jamais exposée au client.
export async function GET() {
  try {
    const res = await fetch("https://api.assemblyai.com/v1/token", {
      method: "GET",
      headers: {
        Authorization: process.env.ASSEMBLYAI_API_KEY!,
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
