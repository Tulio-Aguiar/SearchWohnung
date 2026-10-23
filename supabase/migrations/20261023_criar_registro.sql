create table public.registro (
  id            uuid primary key default gen_random_uuid(),
  data          date not null default current_date,
  portal        text check (char_length(portal) <= 80),
  endereco      text check (char_length(endereco) <= 200),
  zimmer        numeric(3,1) check (zimmer >= 0 and zimmer <= 20),
  warmmiete     numeric(8,2) check (warmmiete >= 0),
  kaution       numeric(8,2) check (kaution >= 0),
  visita        date,
  situacao      text check (char_length(situacao) <= 40),
  autor_id      uuid not null default auth.uid() references auth.users(id),
  autor_email   text not null default (auth.jwt() ->> 'email'),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.registro enable row level security;

create policy "ler registro" on public.registro
  for select to authenticated using (true);
create policy "inserir registro" on public.registro
  for insert to authenticated with check (autor_id = auth.uid());
create policy "editar registro" on public.registro
  for update to authenticated using (true) with check (true);
create policy "apagar registro" on public.registro
  for delete to authenticated using (true);

create function public.set_atualizado_em()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

create trigger registro_atualizado before update on public.registro
  for each row execute function public.set_atualizado_em();
