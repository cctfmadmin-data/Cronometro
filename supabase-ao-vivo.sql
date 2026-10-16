-- =====================================================================
--  CRONÓMETRO — "EM PROVA" AO VIVO
--  Corre UMA vez no Supabase → SQL Editor → New query → colar → Run
--  (complementa o supabase.sql que já correste; não apaga nada)
-- =====================================================================

-- Estado atual de cada pista (A/B) de cada prova
create table if not exists public.ao_vivo (
  prova        text        not null,
  pista        text        not null,
  atleta       text        not null default '',
  estado       text        not null default 'pronto',  -- pronto | a_correr | parado
  decorrido_ms integer     not null default 0,         -- tempo decorrido no momento do envio
  servidor_em  timestamptz not null default now(),     -- hora do servidor nesse envio
  primary key (prova, pista)
);

alter table public.ao_vivo enable row level security;
drop policy if exists "leitura publica ao vivo" on public.ao_vivo;
create policy "leitura publica ao vivo" on public.ao_vivo for select using (true);

-- O operador (com PIN) atualiza o estado da pista
create or replace function public.atualizar_pista(
  p_pin text, p_prova text, p_pista text, p_atleta text, p_estado text, p_decorrido_ms integer
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not verificar_pin(p_pin) then raise exception 'PIN inválido'; end if;
  if p_estado not in ('pronto', 'a_correr', 'parado') then raise exception 'Estado inválido'; end if;
  insert into ao_vivo (prova, pista, atleta, estado, decorrido_ms, servidor_em)
  values (coalesce(nullif(trim(p_prova), ''), 'Geral'), p_pista, coalesce(trim(p_atleta), ''),
          p_estado, greatest(coalesce(p_decorrido_ms, 0), 0), now())
  on conflict (prova, pista) do update
    set atleta = excluded.atleta, estado = excluded.estado,
        decorrido_ms = excluded.decorrido_ms, servidor_em = excluded.servidor_em;
end $$;

-- Hora do servidor (para todos os ecrãs mostrarem o mesmo tempo)
create or replace function public.agora_ms()
returns bigint language sql stable as $$
  select (extract(epoch from now()) * 1000)::bigint;
$$;

grant execute on function public.atualizar_pista(text, text, text, text, text, integer) to anon;
grant execute on function public.agora_ms() to anon;

do $$ begin
  alter publication supabase_realtime add table public.ao_vivo;
exception when duplicate_object then null; end $$;
