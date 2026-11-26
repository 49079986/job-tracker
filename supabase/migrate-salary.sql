-- ============================================================
-- 迁移：新增「薪资水平」列，并从备注中提取已有记录的薪资（可重复执行）
-- 备注里形如「薪资 1.2万-1.6万元·13薪」「页面薪资 8千-1.2万」的内容会被提取；
-- 只填写 salary 为空的记录，不会覆盖你在网页上改过的薪资。
-- ============================================================
alter table public.applications add column if not exists salary text;

update public.applications
set salary = nullif(btrim(substring(notes from '薪资[ ：:]*([^；;]+)')), '未显示')
where salary is null and notes ~ '薪资';

-- 检查：有薪资的记录数
select count(*) filter (where salary is not null) as 有薪资, count(*) as 总数 from public.applications;
