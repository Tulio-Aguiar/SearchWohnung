-- Tabela de links guardados ("Nossas Seleções"). Rodar uma vez no SQL Editor do Supabase.
create table public.selecoes (
  id          uuid primary key default gen_random_uuid(),
  link        text not null check (link ~* '^https://' and char_length(link) <= 2000),
  comentario  text check (char_length(comentario) <= 500),
  autor_id    uuid not null default auth.uid() references auth.users(id),
  autor_email text not null default (auth.jwt() ->> 'email'),
  criado_em   timestamptz not null default now(),
  unique (link)
);

alter table public.selecoes enable row level security;

create policy "ler selecoes" on public.selecoes
  for select to authenticated using (true);

create policy "inserir selecoes" on public.selecoes
  for insert to authenticated with check (autor_id = auth.uid());

create policy "apagar selecoes" on public.selecoes
  for delete to authenticated using (true);