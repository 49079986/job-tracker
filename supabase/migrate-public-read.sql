-- ============================================================
-- 迁移：改为“公开只读，编辑仍需白名单登录”
-- 已经运行过旧版 schema.sql 的项目，在 SQL Editor 运行本文件即可（可重复执行）。
-- 新项目直接运行 schema.sql，不需要本文件。
-- ============================================================
grant select on public.applications to anon;

drop policy if exists "allowlisted select" on public.applications;
drop policy if exists "public select" on public.applications;
create policy "public select" on public.applications
  for select to anon, authenticated using (true);

-- 新增 / 更新 / 删除 的白名单策略保持不变；anon 仍没有写入权限。
-- 如需恢复“仅白名单可读”，运行：
--   drop policy if exists "public select" on public.applications;
--   revoke select on public.applications from anon;
--   create policy "allowlisted select" on public.applications
--     for select to authenticated using ((select public.is_allowed()));
