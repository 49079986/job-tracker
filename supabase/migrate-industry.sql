-- ============================================================
-- 迁移：新增「职位行业」列（可重复执行）
-- 已有项目在 SQL Editor 运行本文件；新项目直接运行 schema.sql 即可。
-- 为已有记录批量填写行业，请用本地 local-data 中生成的 SQL（含真实公司名，不进仓库）。
-- ============================================================
alter table public.applications add column if not exists industry text;
create index if not exists applications_industry_idx on public.applications (industry);
