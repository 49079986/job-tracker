-- ============================================================
-- job-tracker 数据库：建表 + RLS + 白名单
-- 在 Supabase Dashboard → SQL Editor 中整段执行，可重复执行。
-- ============================================================

-- ---------- 1. 白名单（仅管理员在 Dashboard / SQL Editor 维护，默认为空） ----------
create table if not exists public.allowlist (
  user_id         uuid primary key,          -- Supabase Auth 用户 UUID（auth.users.id）
  github_username text,                      -- 仅作备注，不参与权限判断
  note            text,
  created_at      timestamptz not null default now()
);

alter table public.allowlist enable row level security;
-- 不创建任何 policy：anon / authenticated 角色都无法通过 API 读写白名单。
revoke all on public.allowlist from anon, authenticated;

-- ---------- 2. 判断当前登录用户是否在白名单 ----------
create or replace function public.is_allowed()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.allowlist a where a.user_id = auth.uid()
  );
$$;

revoke all on function public.is_allowed() from public, anon;
grant execute on function public.is_allowed() to authenticated;

-- 前端用来显示“已授权/未授权”，只返回当前用户自己的布尔值
create or replace function public.am_i_allowed()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$ select public.is_allowed(); $$;

revoke all on function public.am_i_allowed() from public, anon;
grant execute on function public.am_i_allowed() to authenticated;

-- ---------- 3. 投递记录 ----------
create table if not exists public.applications (
  id                     uuid primary key,   -- 稳定 ID：导入时沿用文件中的 id，重复导入会被主键拦截
  legacy_id              text,               -- 原表编号，如 Excel 申请编号
  company                text not null check (length(btrim(company)) > 0),
  position               text not null check (length(btrim(position)) > 0),
  status                 text not null default '已投递'
                         check (status in ('已投递','待完善投递','测评','面试中','等待结果','Offer','拒绝','撤回')),
  applied_date           date,
  next_action            text,
  last_progress_date     date,
  last_progress_summary  text,
  confirmed_event_at     text,
  event_type_and_timezone text,
  job_code               text,
  location               text,
  job_type               text,
  channel                text,
  job_url                text,
  job_url_label          text,
  source_doc_label       text,
  notes                  text,
  sources                text[] not null default array['manual'],
  source_refs            jsonb  not null default '[]'::jsonb,
  timeline               jsonb  not null default '[]'::jsonb,
  flags                  text[] not null default '{}',
  raw                    jsonb,
  created_by             uuid default auth.uid(),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- 同一来源的同一原表编号只能出现一次（防止 ID 不同但来源编号相同的重复导入）
create unique index if not exists applications_source_legacy_uidx
  on public.applications ((sources[1]), legacy_id)
  where legacy_id is not null;

create index if not exists applications_applied_date_idx on public.applications (applied_date desc nulls last);
create index if not exists applications_status_idx on public.applications (status);

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end; $$;

drop trigger if exists applications_touch on public.applications;
create trigger applications_touch before update on public.applications
  for each row execute function public.touch_updated_at();

-- ---------- 4. RLS：查询 / 新增 / 更新 / 删除 全部要求在白名单 ----------
alter table public.applications enable row level security;
alter table public.applications force row level security;

revoke all on public.applications from anon;
grant select, insert, update, delete on public.applications to authenticated;

drop policy if exists "allowlisted select" on public.applications;
drop policy if exists "allowlisted insert" on public.applications;
drop policy if exists "allowlisted update" on public.applications;
drop policy if exists "allowlisted delete" on public.applications;

create policy "allowlisted select" on public.applications
  for select to authenticated using ((select public.is_allowed()));
create policy "allowlisted insert" on public.applications
  for insert to authenticated with check ((select public.is_allowed()));
create policy "allowlisted update" on public.applications
  for update to authenticated using ((select public.is_allowed())) with check ((select public.is_allowed()));
create policy "allowlisted delete" on public.applications
  for delete to authenticated using ((select public.is_allowed()));

-- ============================================================
-- 管理员操作（在 SQL Editor 中手动执行，把 UUID 换成你自己的）：
--
--   insert into public.allowlist (user_id, github_username, note)
--   values ('00000000-0000-0000-0000-000000000000', 'your-github-name', '本人');
--
-- 查看白名单：  select * from public.allowlist;
-- 移除授权：    delete from public.allowlist where user_id = '...';
-- ============================================================
