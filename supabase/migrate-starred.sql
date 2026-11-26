-- ============================================================
-- 迁移：新增「精投」星标列（可重复执行）
-- 已有项目在 SQL Editor 运行本文件；新项目直接运行 schema.sql 即可。
-- 读写权限沿用现有 RLS：所有人可看到星标，只有白名单账号能修改。
-- ============================================================
alter table public.applications add column if not exists starred boolean not null default false;
create index if not exists applications_starred_idx on public.applications (starred) where starred;
