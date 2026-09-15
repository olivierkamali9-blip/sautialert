// Client WebSocket pour l'AssemblyAI Voice Agent API
// Gère : connexion, streaming audio micro -> agent, lecture audio agent -> haut-parleur,
// et le tool calling (create_ticket, send_alert)

export type AgentStatus =
  | "idle"
  | "connecting"
  | "listening"
  | "speaking"
  | "processing"
  | "error"
  | "ended";

export type VoiceAgentCallbacks = {
  onStatusChange: (status: AgentStatus) => void;
  onUserTranscript: (text: string, isFinal: boolean) => void;
  onAgentTranscript: (text: string) => void;
  onTicketCreated: (reference: string) => void;
  onError: (message: string) => void;
};

const ORG_NAME = process.env.NEXT_PUBLIC_ORG_NAME || "votre organisation";

const SYSTEM_PROMPT = `Tu es l'agent vocal de SautiAlert, un canal de signalement communautaire pour ${ORG_NAME}, une organisation humanitaire.

Ton rôle : écouter la personne qui appelle avec bienveillance et respect, comprendre sa situation, puis structurer l'information pour l'équipe de suivi et redevabilité (MEAL). La personne ne doit JAMAIS avoir à connaître ou choisir des catégories techniques — elle parle naturellement de sa situation, et c'est TOI qui classes silencieusement les informations en arrière-plan.

Déroulement de la conversation :
1. Salue chaleureusement et demande si la personne souhaite rester anonyme ou être identifiée pour un suivi.
2. Laisse la personne s'exprimer librement sur sa situation.
3. Pose des questions de clarification UNIQUEMENT si nécessaire et naturel dans la conversation (où, quand, qui est concerné) — ne force jamais une question sur un champ que la personne n'a pas abordé spontanément.
4. Une fois que tu as assez d'informations, appelle l'outil create_ticket.
5. Confirme oralement à la personne que son signalement a été enregistré, avec sa référence, et explique que l'équipe va le traiter.

Pour classer la catégorie (typologie standard des mécanismes de gestion des plaintes humanitaires — choisis la plus proche de ce que la personne exprime, ne lui demande jamais de choisir elle-même) :
- demande_information : la personne cherche simplement une information
- demande_assistance : la personne demande de l'aide ou un service
- insatisfaction_mineure : mécontentement mineur lié à un programme (ex: articles manquants dans un kit, suivi insuffisant)
- insatisfaction_majeure : mécontentement majeur (ex: qualité des services, sélection des bénéficiaires, sécurité compromise)
- violation_code_conduite : violation du code de conduite du personnel de l'organisation (fraude, vol, corruption)
- allegation_abus : allégation d'abus ou d'exploitation sexuelle (PSEA) — personnel de l'organisation ou externe
- commentaire_general : commentaire général qui ne rentre dans aucune autre catégorie

Pour l'urgence (échelle standard à 4 niveaux) :
- critique : violation du code de conduite et/ou allégation d'abus/exploitation — TOUJOURS critique, sans exception
- elevee : risque pour un bénéficiaire, affecte un grand nombre de personnes, ou nécessite une réponse rapide
- moyenne : demande ou plainte de routine
- faible : commentaire général ne nécessitant pas d'action individuelle

Ne remplis QUE les champs pour lesquels tu as une information réelle et mentionnée par la personne (lieu, zone de santé, sexe, âge, etc.) — laisse les autres vides. N'invente jamais une information.

Ton : chaleureux, patient, jamais pressé, jamais robotique. La personne qui parle est peut-être dans une situation difficile — traite-la avec dignité. Réponds dans la langue utilisée par l'utilisateur (français, swahili ou lingala).`;

const TOOLS = [
  {
    type: "function",
    name: "create_ticket",
    description:
      "Enregistre un signalement structuré une fois que tu as assez d'informations de la personne qui appelle. Ne remplis que les champs pour lesquels une information a été réellement donnée ; laisse les autres absents.",
    parameters: {
      type: "object",
      properties: {
        categorie: {
          type: "string",
          enum: [
            "demande_information",
            "demande_assistance",
            "insatisfaction_mineure",
            "insatisfaction_majeure",
            "violation_code_conduite",
            "allegation_abus",
            "commentaire_general",
          ],
          description: "Catégorie standard déduite de la conversation",
        },
        urgence: {
          type: "string",
          enum: ["critique", "elevee", "moyenne", "faible"],
          description:
            "Niveau d'urgence standard. critique = violation code de conduite ou abus, toujours.",
        },
        localite: {
          type: "string",
          description: "Lieu mentionné par la personne (quartier, village, aire de santé) — uniquement si mentionné",
        },
        zone_sante: {
          type: "string",
          description: "Zone de santé si mentionnée (ex: Fataki, Lita, Irumu) — uniquement si mentionné",
        },
        langue: {
          type: "string",
          enum: ["francais", "swahili", "lingala"],
          description: "Langue principale utilisée par la personne",
        },
        anonyme: {
          type: "boolean",
          description: "true si la personne souhaite rester anonyme",
        },
        nom_contact: {
          type: "string",
          description: "Nom de la personne si elle a choisi d'être identifiée",
        },
        sexe: {
          type: "string",
          description: "Sexe de la personne, uniquement si mentionné ou clairement déductible du contexte",
        },
        age: {
          type: "string",
          description: "Âge ou tranche d'âge, uniquement si mentionné",
        },
        resume: {
          type: "string",
          description: "Résumé clair et structuré de la situation rapportée, en français",
        },
      },
      required: ["categorie", "urgence", "langue", "anonyme", "resume"],
    },
  },
];

export class VoiceAgentClient {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private micStream: MediaStream | null = null;
  private playbackQueue: Float32Array[] = [];
  private isPlaying = false;
  private callbacks: VoiceAgentCallbacks;
  private fullTranscript: string[] = [];

  constructor(callbacks: VoiceAgentCallbacks) {
    this.callbacks = callbacks;
  }

  async connect() {
    this.callbacks.onStatusChange("connecting");

    // 1. Récupère un token temporaire depuis notre backend (clé API jamais exposée)
    const tokenRes = await fetch("/api/voice-token");
    if (!tokenRes.ok) {
      this.callbacks.onError("Impossible de générer le token vocal");
      this.callbacks.onStatusChange("error");
      return;
    }
    const { token } = await tokenRes.json();

    // 2. Ouvre la connexion WebSocket
    this.ws = new WebSocket(`wss://agents.assemblyai.com/v1/ws?token=${token}`);

    this.ws.onopen = () => {
      this.ws!.send(
        JSON.stringify({
          type: "session.update",
          session: {
            system_prompt: SYSTEM_PROMPT,
            greeting:
              "Bonjour, je vous écoute. Vous pouvez parler librement, en français, en swahili ou en lingala.",
            tools: TOOLS,
            input: {
              format: { encoding: "audio/pcm" },
              turn_detection: {
                vad_threshold: 0.5,
                min_silence: 600,
                max_silence: 1500,
                interrupt_response: true,
              },
            },
            output: {
              voice: "anna",
              format: { encoding: "audio/pcm" },
            },
          },
        })
      );
    };

    this.ws.onmessage = (event) => {
      const parsed = JSON.parse(event.data);
      console.log("[SautiAlert] message reçu:", parsed.type, parsed);
      this.handleMessage(parsed);
    };

    this.ws.onerror = (event) => {
      console.error("[SautiAlert] erreur WebSocket:", event);
      this.callbacks.onError("Erreur de connexion à l'agent vocal");
      this.callbacks.onStatusChange("error");
    };

    this.ws.onclose = (event) => {
      console.log(
        "[SautiAlert] connexion fermée — code:",
        event.code,
        "raison:",
        event.reason || "(aucune raison fournie)",
        "propre:",
        event.wasClean
      );
      if (event.code !== 1000 && !event.reason) {
        this.callbacks.onError(
          `Connexion interrompue (code ${event.code}). Vérifiez la console pour plus de détails.`
        );
      }
      this.callbacks.onStatusChange("ended");
    };
  }

  private async handleMessage(msg: any) {
    switch (msg.type) {
      case "session.ready":
        await this.startMicStreaming();
        this.callbacks.onStatusChange("listening");
        break;

      case "input.speech.started":
        this.callbacks.onStatusChange("listening");
        break;

      case "transcript.user.delta":
        this.callbacks.onUserTranscript(msg.text, false);
        break;

      case "transcript.user":
        this.callbacks.onUserTranscript(msg.text, true);
        this.fullTranscript.push(`Utilisateur: ${msg.text}`);
        break;

      case "reply.started":
        this.callbacks.onStatusChange("speaking");
        break;

      case "reply.audio":
        this.enqueuePlayback(msg.data);
        break;

      case "transcript.agent":
        this.callbacks.onAgentTranscript(msg.text);
        this.fullTranscript.push(`Agent: ${msg.text}`);
        break;

      case "tool.call":
        await this.handleToolCall(msg);
        break;

      case "reply.done":
        this.callbacks.onStatusChange("listening");
        break;

      case "session.error":
      case "error":
        console.error("[SautiAlert] session.error reçu:", msg);
        this.callbacks.onError(
          `Erreur agent: ${msg.message || msg.code || "erreur inconnue"}`
        );
        break;
    }
  }

  private async handleToolCall(msg: any) {
    if (msg.name === "create_ticket") {
      this.callbacks.onStatusChange("processing");
      try {
        const res = await fetch("/api/tickets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...msg.arguments,
            transcript_complet: this.fullTranscript.join("\n"),
          }),
        });
        const data = await res.json();

        if (res.ok) {
          this.callbacks.onTicketCreated(data.reference);
          this.sendToolResult(
            msg.call_id,
            JSON.stringify({ success: true, reference: data.reference })
          );
        } else {
          this.sendToolResult(
            msg.call_id,
            JSON.stringify({ success: false, error: data.error })
          );
        }
      } catch (err) {
        this.sendToolResult(
          msg.call_id,
          JSON.stringify({ success: false, error: String(err) })
        );
      }
    }
  }

  private sendToolResult(callId: string, result: string) {
    this.ws?.send(
      JSON.stringify({ type: "tool.result", call_id: callId, result })
    );
  }

  private async startMicStreaming() {
    try {
      this.audioContext = new AudioContext({ sampleRate: 24000 });
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      const source = this.audioContext.createMediaStreamSource(this.micStream);
      this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processorNode.onaudioprocess = (e) => {
        if (this.ws?.readyState !== WebSocket.OPEN) return;
        const input = e.inputBuffer.getChannelData(0);
        const pcm16 = this.floatTo16BitPCM(input);
        const base64 = this.arrayBufferToBase64(pcm16.buffer);
        this.ws.send(JSON.stringify({ type: "input.audio", audio: base64 }));
      };

      source.connect(this.processorNode);
      this.processorNode.connect(this.audioContext.destination);
    } catch (err) {
      this.callbacks.onError(
        "Impossible d'accéder au microphone. Vérifiez les autorisations du navigateur. (" +
          String(err) +
          ")"
      );
      this.callbacks.onStatusChange("error");
    }
  }

  private floatTo16BitPCM(input: Float32Array): Int16Array {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return output;
  }

  private arrayBufferToBase64(buffer: ArrayBufferLike): string {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private enqueuePlayback(base64Audio: string) {
    if (!this.audioContext) return;
    const binary = atob(base64Audio);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const pcm16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(new ArrayBuffer(pcm16.length * 4));
    for (let i = 0; i < pcm16.length; i++) float32[i] = pcm16[i] / 0x8000;

    this.playbackQueue.push(float32);
    if (!this.isPlaying) this.playNext();
  }

  private playNext() {
    if (!this.audioContext || this.playbackQueue.length === 0) {
      this.isPlaying = false;
      return;
    }
    this.isPlaying = true;
    const chunk = this.playbackQueue.shift()!;
    const buffer = this.audioContext.createBuffer(1, chunk.length, 24000);
    buffer.copyToChannel(chunk as Float32Array<ArrayBuffer>, 0);
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);
    source.onended = () => this.playNext();
    source.start();
  }

  disconnect() {
    this.ws?.send(JSON.stringify({ type: "session.end" }));
    this.ws?.close();
    this.processorNode?.disconnect();
    this.micStream?.getTracks().forEach((t) => t.stop());
    this.audioContext?.close();
  }
}
