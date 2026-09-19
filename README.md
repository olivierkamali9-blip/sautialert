# SautiAlert

**A voice-first accountability channel for humanitarian teams — built on AssemblyAI's Voice Agent API.**

> *"Sauti"* means *voice* in Swahili. SautiAlert gives a voice to people who often have none in the systems meant to serve them.

---

## The problem

Humanitarian organizations are required to run Community Feedback Mechanisms — channels where the people they serve can ask questions, request assistance, or report a problem, including serious ones like staff misconduct or abuse (PSEA). In practice, these mechanisms are usually text-based: suggestion boxes, SMS lines, web forms.

That excludes exactly the people most likely to need them: beneficiaries with low literacy, no smartphone, or no time to fill out a form. In eastern DR Congo, where this project comes from, that's a large share of the population field teams serve every day.

## The solution

SautiAlert is a voice agent that **listens, understands, and acts** — no reading or typing required. A beneficiary presses one button, speaks freely about their situation, and the conversation does the rest:

1. **Listens** in real time (AssemblyAI Universal-3.5 Pro streaming transcription)
2. **Understands** the intent — category, urgency, location — without ever asking the person to navigate a menu or pick a category themselves
3. **Acts**, via tool calling: creates a structured, timestamped record and, for critical cases (code-of-conduct violations, abuse allegations), fires an **automatic email alert** to the accountability team
4. **Confirms** out loud that the report was registered, then hangs up on its own — the entire interaction requires exactly one tap

On the other side, a staff dashboard lets the accountability team triage, update status, and export everything to Excel for reporting.

## Why this matters beyond the hackathon

This isn't a hackathon toy. The categorization used here mirrors the real complaint-classification standards used in the humanitarian sector (priority levels with defined response-time SLAs, PSEA-specific escalation). It's built to be piloted with a real NGO's accountability team, not just demoed once and shelved.

## Built on AssemblyAI's Voice Agent API

The entire conversational loop — speech-to-text, reasoning, text-to-speech, and turn-taking — runs through a single WebSocket connection to `wss://agents.assemblyai.com/v1/ws`. No separate STT/LLM/TTS providers to orchestrate, no glue code between vendors.

What SautiAlert uses from the API:
- **Real-time streaming transcription** (Universal-3.5 Pro) for natural, low-latency conversation
- **Tool calling** — the agent decides on its own when it has enough information and calls `create_ticket` with structured fields (category, urgency, location, summary), never asking the beneficiary to fill out anything
- **Server-side turn detection (VAD)** — the agent knows when the person has finished speaking without any button-pressing
- **Streamed TTS playback** — the agent's spoken replies are scheduled gaplessly on the client for natural-sounding audio
- **Ephemeral token authentication** — the permanent API key never reaches the browser

## Architecture

```
Beneficiary's browser (AudioWorklet mic capture, 24kHz PCM)
        │
        ▼
  wss://agents.assemblyai.com/v1/ws   ←── AssemblyAI Voice Agent API
        │  (STT + reasoning + TTS + tool calling, single connection)
        ▼
  Next.js API routes (Vercel)
        │
        ├──► Supabase (Postgres) — structured ticket storage
        └──► Resend — automatic email alert on critical-priority tickets

Staff dashboard (Next.js + Supabase Auth)
  → Signalements (triage, status, delete, Excel export)
  → Analyses (category / urgency / language breakdowns, 7-day activity)
  → Équipe (team access list)
  → Paramètres (active/inactive categories)
```

## Tech stack

- **Next.js 16** (App Router, TypeScript, Turbopack)
- **AssemblyAI Voice Agent API** — the core of the product
- **Supabase** — Postgres database, authentication, row-level security
- **Resend** — transactional email for critical alerts
- **Tailwind CSS** — design system
- **Vercel** — hosting and deployment

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your API keys
npm run dev
```

Run the SQL in `supabase/schema.sql` against a Supabase project to set up the database, then create at least one team member under Authentication → Users (with "Auto Confirm User" checked) to access the staff dashboard.

Required environment variables are listed in `.env.example`: an AssemblyAI API key, Supabase project credentials, and (optionally) a Resend API key + alert recipient email for critical-ticket notifications.

## Current limitations & roadmap

- **Language support**: currently French only. AssemblyAI's streaming STT and Voice Agent don't yet cover Swahili or Lingala, which are essential for the target region — the interface is intentionally honest about this rather than offering a language switch that silently fails. A hybrid fallback (routing non-covered languages to a secondary STT model) is the planned next step.
- **Team management**: currently added manually via the Supabase dashboard; an in-app invite flow is a natural next step.
- **Voice-triggered case lookup**: a returning caller checking on the status of a past report is on the roadmap.

## About

SautiAlert is part of the [G-Tech](https://github.com/olivierkamali9-blip) portfolio, built by Olivier Kamali — a MEAL (Monitoring, Evaluation, Accountability, Learning) practitioner in Bunia, DR Congo, and solopreneur building tech for the humanitarian sector he works in every day.

Built for the **AssemblyAI Voice Agent Hackathon**.
