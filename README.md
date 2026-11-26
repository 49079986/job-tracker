# job-tracker · 求职投递管理

中文求职投递管理网站。网页托管在 GitHub Pages，用 Supabase 负责 GitHub 登录和数据存储。

- **公开只读**：任何人打开网页都能浏览、搜索、筛选全部记录（含备注），不用登录。
- **编辑需登录**：新增、编辑、删除、改状态、导入、导出只有白名单里的 GitHub 账号登录后才能用；数据库层用 RLS 强制限制，绕开网页直接调用接口也写不进去。
- 支持搜索、按状态和职位行业筛选、按投递日期排序、新增、编辑、删除、快速改状态。
- 职位名后的 ☆ 可标为「精投」（再点取消），筛选栏「精投」按钮只看收藏的职位；访客只能看到收藏标记。
- 列表左侧显示序号，支持分页，每页 20 / 50 / 100 条或全部（选择会记在本机浏览器里）。
- 支持导入 JSON（导入前先预览）和导出全部记录（JSON / CSV）。
- 桌面端显示表格，手机端显示卡片。

技术栈：Vite + React + `@supabase/supabase-js`。

> 本仓库只包含代码、配置模板和虚构示例数据（`sample-data/`）。真实记录放在被 `.gitignore` 忽略的 `local-data/`，登录后从网页导入。
>
> 注意：记录对所有人公开可读，备注里的薪资等信息任何拿到网址的人都能看到。`index.html` 设置了 `noindex`，搜索引擎不会收录，但这不是访问控制。如需改回“仅白名单可读”，见 `supabase/migrate-public-read.sql` 末尾。

---

## 目录

```
job-tracker/
├─ src/                    前端代码
├─ supabase/schema.sql     建表 + RLS + 白名单（公开只读，编辑限白名单）
├─ supabase/migrate-public-read.sql  旧版（仅白名单可读）升级为公开只读的迁移
├─ supabase/migrate-industry.sql     旧版升级：新增「职位行业」列
├─ supabase/migrate-starred.sql      旧版升级：新增「精投」星标列
├─ scripts/check-release.mjs   发布前检查（真实数据 / 密钥）
├─ scripts/rls-anon-test.mjs   权限复测脚本
├─ .github/workflows/deploy.yml  GitHub Pages 部署流程（交付时在根目录 github-workflow-deploy.yml，见第 7 节）
├─ sample-data/demo-records.json 虚构示例数据
├─ .env.example            环境变量模板
└─ local-data/             真实数据（已忽略，不会提交）
```

---

## 1. 本地启动

需要 Node.js 20 或更新版本。

```powershell
cd C:\Users\yuyan\Desktop\ReYoung\求职\GitHub-投递记录\job-tracker
npm install
copy .env.example .env.local    # 然后编辑 .env.local，填入 Supabase URL 和 publishable key
npm run dev
```

打开 <http://localhost:5173/job-tracker/>。

`npm install` 会生成 `package-lock.json`，请把它一起提交，之后部署会用 `npm ci` 固定版本。

---

## 2. Supabase 项目配置

1. 在 <https://supabase.com/dashboard> 新建项目，记下 **Project URL**（`https://<project-ref>.supabase.co`）。
2. **建表和 RLS**：打开 **SQL Editor**，粘贴 `supabase/schema.sql` 的全部内容并运行。这个脚本可以重复执行。
   已经用旧版脚本建过表的项目，按需运行 `supabase/migrate-public-read.sql`（公开只读）、`supabase/migrate-industry.sql`（职位行业列）和 `supabase/migrate-starred.sql`（精投星标列）。
3. **API key**：打开 **Project Settings → API Keys**，复制 **Publishable key**（以 `sb_publishable_` 开头）。
   - 前端只用 publishable key。
   - `secret` / `service_role` key 不要放进 `.env.local`、GitHub Variables、代码或聊天记录。
4. **URL 配置**：打开 **Authentication → URL Configuration**。
   - **Site URL**：`https://<你的GitHub用户名>.github.io/job-tracker/`
   - **Redirect URLs** 添加两条：
     - `https://<你的GitHub用户名>.github.io/job-tracker/`
     - `http://localhost:5173/job-tracker/`
5. **GitHub 登录**：打开 **Authentication → Sign In / Providers → GitHub**，启用。页面上会显示 **Callback URL**（形如 `https://<project-ref>.supabase.co/auth/v1/callback`），先复制下来，下一步要用。

## 3. GitHub OAuth App 配置

1. GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**。
2. 填写：
   - **Application name**：`job-tracker`
   - **Homepage URL**：`https://<你的GitHub用户名>.github.io/job-tracker/`
   - **Authorization callback URL**：填上一步 Supabase 给出的 Callback URL（`https://<project-ref>.supabase.co/auth/v1/callback`），**不是** Pages 地址。
3. 创建后复制 **Client ID**，再点 **Generate a new client secret**。
4. 回到 Supabase 的 GitHub Provider 页面，填入 Client ID 和 Client Secret 并保存。
   **Client Secret 只填在 Supabase Dashboard**，不要写进仓库或 GitHub Variables。

## 4. 确认自己的 UUID 并加入白名单

白名单表 `allowlist` 默认为空，只能由管理员在 Dashboard 里维护。网页和数据库 API 都无法读写它。

1. 打开网站，点右上角「登录以编辑」。登录后页面顶部会出现黄色提示「该账号没有编辑权限」，并显示当前账号的 UUID。
2. 在 Supabase Dashboard → **Authentication → Users** 里找到 Provider 为 GitHub、用户名是你的那一行，核对 **UID** 和网页上显示的一致。
3. 打开 **SQL Editor** 运行（替换成你的 UID 和用户名）：

   ```sql
   insert into public.allowlist (user_id, github_username, note)
   values ('你的-UID', '你的GitHub用户名', '本人');
   ```

4. 刷新网页，右上角出现「新增」「导入 JSON」「导出全部记录」，记录行出现「编辑」「删除」和状态下拉框。

RLS 只用 `auth.uid()` 判断权限，GitHub 用户名只是备注。
如果要移除授权：`delete from public.allowlist where user_id = '...';`

## 5. 首次导入真实数据

真实数据在本地 `local-data/applications.json`（第一阶段整理结果，270 条）。

1. 登录后点「导入 JSON」，选择 `local-data/applications.json`。
2. 预览会显示：有效记录、新记录、确定重复（自动跳过）、疑似重复、无效条目。
3. 疑似重复要逐条选「仍然导入」或「跳过」，也可以用「全部仍然导入 / 全部跳过」。全部选完后，「确认写入」按钮才能点。
4. 写入后列表会自动刷新。

**重复导入保护**

- 每条记录都有稳定 `id`（UUID）。再次导入同一文件时，所有条目都会显示为「确定重复」并跳过。
- 即使跳过了预览，数据库主键也会拦下重复写入（`ON CONFLICT DO NOTHING`）。
- 「同一来源 + 原编号」还有唯一索引，作为第二道保护。

**其他说明**

- 导入文件里没有 `id` 的记录，会按「来源 + 原编号」或「公司 + 岗位 + 投递日期 + 链接」生成固定 ID，所以同一文件重复导入同样会被拦截。
- 以后补充飞书或其他来源时，整理成同样格式的 JSON，走同一个导入流程。

## 6. 备份与恢复

- **备份**：「导出全部记录 → JSON」。导出的文件包含 `id`、来源（`sources`、`sourceRefs`）、进展时间线等全部字段。建议定期导出，保存在 `local-data/` 或其他私密位置。
- **CSV**：用于在 Excel 查看，带 BOM，中文不会乱码，但不用于恢复。
- **恢复**：在网页上「导入 JSON」，选择备份文件。
  - 已存在的记录会按 ID 自动跳过。
  - 被删除的记录会按原 ID 重新写回。
  - 恢复不会覆盖数据库里已经修改过的记录。如果要整体回退到某个备份，先在 SQL Editor 执行 `delete from public.applications;`，再导入备份。

## 7. 部署到 GitHub Pages

1. 先把部署流程文件放到 GitHub Actions 要求的位置（交付时 `.github` 目录无法远程写入，所以放在了根目录）：

   ```powershell
   mkdir .github\workflows -Force
   move github-workflow-deploy.yml .github\workflows\deploy.yml
   ```

2. 在 GitHub 新建仓库 `job-tracker`，可以是公开仓库。本地执行：

   ```powershell
   git init
   git add .
   git status            # 确认没有 local-data/、.env.local、*.xlsx
   npm run build
   npm run check:release # 必须显示「发布检查通过」
   git commit -m "init job-tracker"
   git branch -M main
   git remote add origin https://github.com/<你的GitHub用户名>/job-tracker.git
   git push -u origin main
   ```

3. 仓库 **Settings → Pages → Build and deployment → Source** 选 **GitHub Actions**。
4. 仓库 **Settings → Secrets and variables → Actions → Variables** 新建两个变量：
   - `VITE_SUPABASE_URL` = `https://<project-ref>.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = `sb_publishable_...`
5. 之后每次推送到 `main` 都会自动构建并发布，也可以在 Actions 页面手动运行。发布地址：`https://<你的GitHub用户名>.github.io/job-tracker/`

部署流程会先检查变量，并拒绝 `sb_secret_` 开头的 key。构建后会运行 `npm run check:release`，扫描已跟踪文件、全部提交历史和 `dist/`。只要发现以下任意一项，就会中止发布：

- `local-data/`、`feishu-export/`、Excel 文件或 `.env` 文件
- secret key、service_role JWT
- 真实记录编号、本机文件路径

Vite 的 `base` 已设为 `/job-tracker/`。如果仓库改了名字，要同时修改 `vite.config.js` 和 Supabase 里的 Redirect URLs。

---

## 8. 验证与复测步骤

### 8.1 数据持久化

1. 登录后修改一条记录的状态或备注，刷新页面，修改仍在。
2. 打开一个全新的无痕窗口或其他设备，登录同一 GitHub 账号，能看到刚才的修改。

### 8.2 未登录访客只能读、不能写（命令行）

```powershell
$env:SUPABASE_URL="https://<project-ref>.supabase.co"
$env:SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
npm run test:rls
```

预期：读取记录一行显示 ℹ（公开只读，按设计允许）；新增、更新、删除和读取白名单全部显示 ✔（被拒绝或影响 0 行）。

### 8.3 其他 GitHub 账号只能读、不能写

1. 用无痕窗口打开网站，用**另一个** GitHub 账号点「登录以编辑」。页面应显示黄色提示「该账号没有编辑权限」，并且没有新增、编辑、删除按钮。
2. 在这个窗口按 F12 打开控制台，执行下面的命令拿到该账号的访问令牌：

   ```js
   JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.endsWith('-auth-token')))).access_token
   ```

3. 在 PowerShell 中，接着 8.2 的环境变量运行：

   ```powershell
   $env:TEST_ACCESS_TOKEN="<上一步得到的令牌>"
   npm run test:rls
   ```

   预期「已登录但未授权的账号」一组：读取为 ℹ，其余全部 ✔。
   脚本会先检查令牌是否属于白名单账号；如果是，脚本会直接停止，不会改动数据。

4. 测完后删除这个令牌，退出该账号。如果不再需要，也可以在 Supabase → Authentication → Users 删除这个测试用户。

### 8.4 发布前检查

```powershell
npm run build
npm run check:release
```

---

## 字段说明

| 网站字段 | 数据库列 | 含义 |
|---|---|---|
| id | id | 稳定 ID（UUID），导入、恢复都靠它去重 |
| legacyId | legacy_id | 原表编号（如 Excel 申请编号） |
| company / position | company / position | 公司 / 岗位（必填） |
| status | status | 已投递、待完善投递、测评、面试中、等待结果、Offer、拒绝、撤回 |
| appliedDate | applied_date | 投递日期，不确定时留空 |
| nextAction | next_action | 下一步行动 |
| lastProgressDate / lastProgressSummary | last_progress_* | 最近进展 |
| jobCode / location / jobType / channel | 同名蛇形 | 岗位编号、地点、类型、渠道 |
| starred | starred | 精投（星标收藏），true / false |
| industry | industry | 职位行业（预设 14 类，也可自填；为空时显示「未分类」） |
| jobUrl / jobUrlLabel | job_url / job_url_label | 招聘链接及显示文字 |
| confirmedEventAt / eventTypeAndTimezone | confirmed_event_at / event_type_and_timezone | 已确认的面试或截止时间，以及原始时区 |
| notes | notes | 备注 |
| sources / sourceRefs | sources / source_refs | 来源（excel / feishu / manual / import）及原文位置（工作表行号等） |
| timeline | timeline | 进展记录 |
| flags / raw | flags / raw | 待确认标记 / 导入时的原始值 |
