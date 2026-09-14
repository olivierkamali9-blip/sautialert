-- SautiAlert — Schéma de base de données Supabase
-- Table principale : signalements (tickets de feedback/plainte)

create table if not exists signalements (
  id uuid primary key default gen_random_uuid(),
  reference text unique not null, -- ex: SA-0142, généré côté app
  categorie text not null, -- configurable, calibré plus tard sur la taxonomie FECONDE réelle
  urgence text not null check (urgence in ('faible', 'moyenne', 'critique')),
  statut text not null default 'nouveau' check (statut in ('nouveau', 'en_cours', 'resolu')),
  lieu text,
  langue text not null check (langue in ('francais', 'swahili', 'lingala')),
  anonyme boolean not null default true,
  nom_contact text, -- rempli seulement si anonyme = false
  contact_telephone text, -- optionnel
  resume text not null, -- résumé généré par le LLM
  transcript_complet text, -- transcription intégrale de l'appel
  audio_url text, -- lien vers l'enregistrement audio (Supabase Storage)
  alerte_envoyee boolean not null default false,
  alerte_destinataire text, -- email du destinataire si alerte envoyée
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index pour les filtres fréquents du dashboard
create index if not exists idx_signalements_urgence on signalements(urgence);
create index if not exists idx_signalements_statut on signalements(statut);
create index if not exists idx_signalements_categorie on signalements(categorie);
create index if not exists idx_signalements_created_at on signalements(created_at desc);

-- Table de configuration des catégories (pour permettre la calibration FECONDE sans toucher au code)
create table if not exists categories_config (
  id uuid primary key default gen_random_uuid(),
  cle text unique not null, -- ex: "distribution_incomplete"
  libelle_fr text not null,
  libelle_sw text,
  libelle_ln text,
  urgence_defaut text not null default 'moyenne' check (urgence_defaut in ('faible', 'moyenne', 'critique')),
  actif boolean not null default true,
  ordre integer default 0
);

-- Catégories de départ (génériques, standard CHS — à remplacer/compléter par la taxonomie FECONDE)
insert into categories_config (cle, libelle_fr, urgence_defaut, ordre) values
  ('distribution_incomplete', 'Distribution incomplète ou non reçue', 'moyenne', 1),
  ('conduite_staff', 'Conduite du staff / abus (PSEA)', 'critique', 2),
  ('besoin_urgent', 'Besoin urgent non couvert (santé, sécurité)', 'critique', 3),
  ('question_generale', 'Question générale', 'faible', 4),
  ('autre', 'Autre', 'faible', 5)
on conflict (cle) do nothing;

-- Table utilisateurs équipe MEAL (accès dashboard)
-- Note: on utilise Supabase Auth pour la gestion des comptes, cette table stocke le profil/rôle
create table if not exists equipe_membres (
  id uuid primary key references auth.users(id) on delete cascade,
  nom_complet text not null,
  role text not null default 'membre' check (role in ('membre', 'admin')),
  email_alertes text, -- email pour recevoir les notifications d'urgence
  created_at timestamptz not null default now()
);

-- Row Level Security : seuls les membres authentifiés de l'équipe peuvent lire/écrire
alter table signalements enable row level security;
alter table categories_config enable row level security;
alter table equipe_membres enable row level security;

-- Le canal public peut uniquement INSÉRER un signalement (pas lire les autres)
create policy "public_insert_signalement" on signalements
  for insert
  to anon
  with check (true);

-- Les membres authentifiés peuvent tout lire et modifier
create policy "equipe_read_all" on signalements
  for select
  to authenticated
  using (true);

create policy "equipe_update_all" on signalements
  for update
  to authenticated
  using (true);

create policy "public_read_categories" on categories_config
  for select
  to anon, authenticated
  using (actif = true);

create policy "equipe_read_self" on equipe_membres
  for select
  to authenticated
  using (true);

-- Trigger pour updated_at automatique
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at
  before update on signalements
  for each row
  execute function update_updated_at();
