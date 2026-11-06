# handoff.md — 项目交接文档

写给完全没有上下文的新会话：这是 **ViteEditor**（原名 VitePress Online Editor，基于 VitePress 的在线 Markdown 编辑器，浏览器直连 GitHub 仓库读写）。当前处于 **v3.1.0**（v3.0.0 大版本升级 + v3.1.0 博客页/双语/成品预览增强）。

## 在做什么

1. v3.1.0 增强（2026-11-06）：内置博客文章列表页（/posts/，createContentLoader 自动归档）、编辑器「成品预览」（MdPreview 模拟发布效果）、中英双语（VitePress locales zh root + en，自动检测浏览器语言 + 手动切换持久化）、导航栏赞赏按钮 + 移动端「...」收纳菜单、自定义页脚（品牌/快速链接/作者信息 https://github.com/cubeyu + 赞赏 https://donate.techisle.top/）、两篇示例文章；
2. 全部改动通过浏览器实测（博客列表/成品预览/移动端菜单/en 首页/编辑器回归）与 docs:build 构建验证。

## 关键技术决策与原因

- **Token 只存 sessionStorage（`github_token` 键）**：会话级生命周期，压缩泄露窗口；用户名/仓库/分支（非敏感）存 localStorage 自动回填；Token 通过连接栏 password 输入框提供（v2 曾缺失，v3 已补回）。
- **自定义保存路径白名单**（`isFilePathValid`）：仅允许 `docs/posts/` 下、仅字母数字中文连字符斜杠、必须 `.md` 结尾——防止覆盖仓库任意文件（如 `.github/workflows/*.yml`）。
- **纯前端密码层（旧版 123456）已删除**：DevTools 可绕过、无安全价值。
- **图片地址不带 base 前缀**（`/images/{时间戳}_{文件名}`）：VitePress 构建时自动加 base（实测验证）；编辑器内实时预览在子路径部署下可能 404（已知限制，文档 FAQ 已说明）；图片缩略图预览用 raw.githubusercontent.com（私有仓库显示不出，插入功能不受影响）。
- **全屏布局实现**：Layout.vue 用 `route.data.relativePath === 'pages/editor.md'` 切 body class（`vpe-fullscreen`），custom.css 据此隐藏 VPNav/VPFooter 并解除宽度约束。注意 `route.path` 带 base 前缀，不能直接用。
- **md-editor-v3 v7 要点**：暗色主题用 `data-theme` 属性（v4 的 `.md-editor-dark` 类已不存在）；`editorId` prop 已废弃、改用 `id`（MdCatalog 仍用 `editorId` prop）；无 exportHtml API，导出 HTML 用 `@onHtmlChanged` 事件捕获。
- **文件树用 Git Trees API**（`/git/trees/{branch}?recursive=1` 一次拉全树）：blob sha 直接可用于 DELETE Contents API，删除无需额外取 sha。
- **草稿**：watch 内容/标题/路径 → 800ms 防抖写 localStorage（`vpe_draft_v1`），onMounted 恢复。
- **依赖管理用 npm**（非 pnpm）：仓库使用 package-lock.json + CI 跑 `npm ci`，保持一致性。

## 已完成

- v2.1.0 安全重构：editor.vue 重写（sessionStorage/路径白名单/多图上传/TextEncoder Base64）、md-editor-v3 ^7.1.0（修复 CVE-2026-84992 XSS）、删除密码层与硬编码 Token 引导、dev 脚本移除 `--host 0.0.0.0`、deploy.yml 全部 Actions 固定 commit SHA、config.js favicon 修复。
- v3.0.0 功能升级（2026-11-06）：
  - editor.vue 全面重写：全屏布局、双栏头部（品牌/工具 + GitHub 连接栏）、文件树面板（Trees API、目录折叠、路径搜索、点击加载、front matter 标题回填、sha 删除）、图片目录网格（点击 insert 插入）、草稿自动保存、导入（.md/.markdown/.txt 带覆盖确认）导出（.md/.html）、MdCatalog 目录、确认弹窗组件；
  - 全站样式精修：custom.css 双主题（渐变 Hero/光晕背景/毛玻璃导航/卡片悬停动效/品牌渐变按钮/细滚动条）+ 全屏规则；
  - 项目改名 ViteEditor：package.json（@cubeyu/vitepress-editor 3.0.0）、config.js、全部 docs、README；
  - 新增教程 docs/guide/integrate.md（接入已有 VitePress 项目，含耦合点说明与 FAQ）；guide/editor.md 补齐全部新功能文档并核对行号；README 重写（新截图配图，截图在 .github/assets/）；
  - 新增 docs/public/favicon.svg（原 favicon.ico 链接 404）。

## 卡在哪里 / 已知问题（重要）

- **文件树/删除/保存未用真实 GitHub Token 做过端到端测试**：UI 状态与 API 调用逻辑已按官方 API 编写，但本环境无凭据。下次有 Token 时应实测：连接 → 文件树加载 → 加载文章 → 修改保存 → 删除 → 图片上传/插入。
- npm audit 剩余 3 条（vite/esbuild/vitepress 的 dev-only 漏洞）：被 vitepress 1.6.x 的 vite 5 peer 约束锁死，正式修复路径是等 vitepress 2.0 stable；风险已通过移除 `--host 0.0.0.0` 缓解，勿在生产跑 dev server 于不可信网络。
- 界面错误提示笼统（如"GitHub API 返回 422"），详情只在 console——有意设计。
- GitHub 仓库已改名为 `ViteEditor`（2026-11-06），`base` 与各处链接已同步。
- md-editor-v3 内置内容缓存（按 editorId 存 localStorage）与本项目草稿机制并存，暂无冲突，留意即可。

## 下一步计划

1. 用真实 Token 做一轮端到端冒烟测试（见上）；
2. 组件化改造（defineProps/defineEmits），见 guide/editor.md「进阶拓展」；
3. 等 vitepress 2.0 stable 后升级 vite 6/7，清掉剩余 dev-only 漏洞；
4. 可选：文件树支持图片文件管理（删除/重命名）、多分支切换缓存。

## 踩坑记录（不要再踩）

- 不要把真实 Token 写进源码——会进公开构建产物；
- 不要用 localStorage 存 Token；
- VitePress markdown 中 `/xxx` 开头图片路径构建时自动加 base，**手动写 `/{base}/xxx` 反而会让 Rollup 解析失败（构建报错）**——实测踩过；
- 测试 preview 产物时注意 IAB 浏览器 HTTP 缓存会拿到旧 chunk（现象：改动不生效、data-theme 卡在旧值），加 query 参数绕过或直接用 dev server；
- v7 的暗色主题是 `data-theme` 属性，查 `.md-editor-dark` 类会一无所获；
- `useData()`/`inject()` 必须在 setup 顶层同步调用（v2 曾写在 computed 里，属坏味道，已修）；
- docs/.vitepress/dist 是构建产物，搜索代码时注意排除；
- front matter 模板中的 `date` 是**页面加载时**生成的当天日期，不是保存时的日期。

## 变更记录（时间倒序）

### v3.1.3 — 2026-11-06 — 真实 Token 端到端测试修复（修复）

- 涉及文件：`editor.vue`。
- 摘要（用真实 GitHub Token 走通「连接 → 文件树 → 保存 → 删除」后发现并修复 3 个回归 bug）：
  1. **ghFetch 无限递归**：批量替换 `fetch` → `ghFetch` 时把封装内部的 `fetch` 也替换了，导致连接时报 `RangeError: Maximum call stack size exceeded`。已改回原生 `fetch` 并加注释；
  2. **保存报 `fileContent is not defined`**：删除 `ensureDirectoryExists` 时误删了 `fileContent` 变量声明，已补回；
  3. **确认弹窗/导出菜单在后台标签页关不掉**：Vue `<transition>` 的离开动画依赖 rAF（后台标签页被节流时永不完成，DOM 残留）。改用 CSS `animation` 入场 + 即时移除，不再依赖 rAF。
  - 附带：文件树排除 `docs/posts/index.md`（博客列表页不是文章）。
  - 实测结果：Token 验证 ✓、自动重连 ✓、文件树加载（2 篇文章 + 1 张图片）✓、保存新文章（自动归档到 docs/posts/2026/11/、路径回填）✓、删除文件（仓库 API 复核确认删除）✓、确认弹窗取消/Esc ✓。
- ⚠️ 测试期间用户提供的 Token 已出现在对话记录中，**必须撤销重建**。

### v3.1.2+sync — 2026-11-06 — 仓库改名同步（修复）

- GitHub 仓库已改名 **ViteEditor**（cubeyu/ViteEditor），全仓 24 处引用同步：config.js `base: '/ViteEditor/'`（站点新地址 https://cubeyu.github.io/ViteEditor/）、GitHub 链接（blob/issues）、Pages 站点链接、README clone 命令（`cd ViteEditor`）、git remote 已 set-url。构建产物验证：favicon/guide 链接均为新 base，零旧名残留。
- ⚠️ 提醒：推送后 GitHub Pages 会在新地址重新部署；仓库 Settings → Pages 保持 GitHub Actions 来源即可。本地文件夹名 `vitepress-online-editor` 未改（不影响任何功能，可自行改名）。

### v3.1.2 — 2026-11-06 — 全面复审修复（修复/重构）

- 涉及文件：`docs/.vitepress/theme/index.js`、`editor.vue`、`i18n.js`、`NavBarExtras.vue`、`SiteFooter.vue`、`Layout.vue`、`custom.css`、`package.json`、`package-lock.json`（3.1.2）。
- 摘要（三 agent 复审：安全 / 文档完整性 / 工程质量）：
  - **H1 打包边界**：theme/index.js 移除编辑器全局注册（页面级导入已覆盖），theme chunk **1012KB → 66KB（-93%）**，全站每页不再加载 1MB 编辑器依赖；
  - **H2 静默数据错误**：实时预览面板的 MdPreview 补 `@onHtmlChanged`，修复预览模式下导出 HTML 内容过期的 bug；
  - **H3 冗余逻辑**：删除 `ensureDirectoryExists`（GitHub Contents API 的 PUT 自动创建多级目录），消除多余 `.gitkeep` commit、API 配额浪费与保存竞态；
  - **M1-M4 清扫**：i18n 18 个死 key 删除（36 行）、`I18N` 取消导出、`markRaw` 误用清理、MdEditor 冗余已废弃 `editor-id` prop 删除、custom.css 死选择器（`.VPFooter`/`.vp-page`）删除；
  - **M8/L1**：`getFileSHA` 仅 404 返回 null（网络/权限错误向上抛，避免对已存在文件误判"新建"导致 422）；保存成功后把实际路径回填 `filePath`（防止改标题再保存生成重复文章）；
  - **M5/M6**：已连接状态显示「断开连接」按钮（清 sessionStorage + 重置状态）；新增 `ghFetch` 封装（15s 超时，网络挂起不再永久锁死 loading）；
  - **M10**：确认弹窗 `role="dialog"`/`aria-modal`/Esc 关闭；文件树行 `role="button"`/`tabindex`/回车键；导出菜单外点/Esc 关闭 + `aria-haspopup`；图标按钮补 `aria-label`；
  - **安全复审低危项**：预览封面拒绝协议相对 URL（`//host`）并过 `withBase`；删除前目录白名单复核（防御纵深）；插入图片文件名转义 Markdown 链接语法；外链补 `referrerpolicy="no-referrer"`；草稿恢复 filePath 类型校验；front matter 解析统一 2KB 限制；
  - **安全复审回归确认**：上一轮 7 项修复（H1-H3/M1-M4）全部保持修复状态，无回归；新增攻击面（草稿/实时预览/博客列表/语言跳转/文件树/删除/外链）均无可利用漏洞；npm audit 剩余 3 条均为 vitepress 1.x 锁死 vite 5 的 dev-only 项。
- 连接栏微调（用户反馈）：分支默认留空（请求回退 main）、文件路径移到分支后、Token/用户名/仓库名输入框缩窄、连接按钮移到保存左侧并改品牌色弱底、logo 旁「文档」徽章改「教程」。
- **第二轮三 agent 复审**（安全 / 文档完整性 68 分 / 工程质量 79 分）后的文档修复：zh+en 教程 12 类事实错误（标题回填/草稿含标题/连接栏顺序/「文档」→「教程」/分支留空语义等 20+ 处）、23 组行号引用全部删除（改为函数名引用，根治漂移）、新增「博客文章列表页 #blog」与「双语界面 #i18n」章节、成品预览补 2KB 剥离说明、更新日志补 v3.1.1/v3.1.2；链接与锚点体系经检查全部健康。

### v3.1.1 — 2026-11-06 — 导航/页脚体验修复（修复）

- 涉及文件：`custom.css`、`Layout.vue`、`NavBarExtras.vue`、`SiteFooter.vue`。
- 摘要：① 导航栏标题前加品牌 logo（nav-bar-title-before 插槽）；② 官方主题切换/GitHub 图标从 ≥1280px 提前到 ≥960px 显示（1230px 等宽度下曾消失）；③ 语言同步策略改为「UI 文案强制跟随页面语言树」（/pages/editor 双语共用页除外，由手动选择或浏览器语言决定），修复 en 页面出现中文「赞赏」的不一致；④ 页脚改为用户选定的简约单行式（品牌 · 链接 · 作者+赞赏，第二行版权）。
- 踩坑补充：VitePress 官方导航按钮断点（菜单 <768 隐藏、Extra/主题/GitHub ≥1280 显示）与自定义组件断点不一致会产生「链接+两个 ...」或「按钮消失」的错位，统一到 960px 并用 CSS 强制。

### v3.1.0 — 2026-11-06 — 博客页 + 双语 + 成品预览（新增）

- 涉及文件：`docs/posts.data.mts`（新建）、`docs/.vitepress/theme/components/PostList.vue`（新建）、`docs/posts/index.md`、`docs/en/posts/index.md`、`docs/posts/2026/11/`（两篇示例文章）、`docs/public/images/sample-editor-light.png`、`docs/.vitepress/theme/i18n.js`（新建，约 100 组双语文案）、`editor.vue`（文案双语化 + 主题/语言切换按钮 + 成品预览弹窗）、`NavBarExtras.vue`（新建：赞赏按钮/语言切换/移动端菜单）、`SiteFooter.vue`（新建：品牌+快速链接+作者+赞赏）、`Layout.vue`（nav-bar-content-after / layout-bottom 插槽 + 首访语言自动跳转）、`config.js`（locales zh root + en、nav 加「文章」、移除默认页脚）、`docs/en/**`（en 版首页与三篇教程，agent 翻译）、`custom.css`（隐藏内置语言切换器、全屏页隐藏页脚）、`package.json`（3.1.0）。
- 摘要：博客页用 createContentLoader 自动归档 docs/posts/**（排除列表页自身、按日期倒序）；成品预览解析 front matter 作页头（标题/日期/分类/标签/描述/封面），正文用 MdPreview 渲染（与编辑器同管线、内置 XSS 消毒）；双语体系：i18n.js 字典管自定义 UI，VitePress locales 管内容页与导航，en 文档由 agent 完整翻译（锚点一一对应）。
- 踩坑补充：VitePress 数据加载器在组件里要 `import { data as posts } from '...posts.data.mts'`（命名导入 data，不是默认导出）；locales 配置后 VitePress 自带「文A」语言下拉，与自定义按钮重复，用 CSS 隐藏 `.VPNavBarTranslations`；`useRoute` 从 'vitepress' 导入而非 'vitepress/theme'（两次踩）。

### v3.0.0 — 2026-11-06 — 大版本功能升级 + 改名（新增/重构）

- 涉及文件：`docs/.vitepress/theme/components/editor.vue`（全面重写 ~1000 行）、`docs/.vitepress/theme/custom.css`、`docs/.vitepress/theme/Layout.vue`、`docs/.vitepress/config.js`、`package.json`、`docs/guide/editor.md`、`docs/guide/integrate.md`（新建）、`docs/guide/index.md`、`docs/index.md`、`README.md`（重写）、`.github/assets/*`（5 张新截图）、`docs/public/favicon.svg`（新增）、删除 `zs.png`。
- 摘要：编辑器升级为全屏沉浸工作台（文件树/图片目录/目录导航三面板 + 双栏头部）；新增仓库文件管理（加载/删除）、草稿自动保存、导入导出；全站明暗双主题精修；项目改名 ViteEditor；新增"接入已有 VitePress 项目"教程；README 重构配图。浏览器实测通过（全屏、主题联动、目录实时更新、草稿保存/恢复、导出菜单、面板开关），docs:build 通过。

### v2.1.0 — 2026-11-06 — 安全审计修复 + 文档重写（修复/新增）

- 涉及文件：`editor.vue`、`package.json`、`package-lock.json`、`.github/workflows/deploy.yml`、`docs/.vitepress/config.js`、`docs/pages/editor.md`、`docs/guide/*`、`docs/index.md`、`docs/public/favicon.svg`。
- 摘要：三方审计（代码安全/依赖供应链/文档现状）→ 修复高危 3 项（md-editor-v3 XSS 升级 7.1.0、Token 改 sessionStorage、删除假密码层）、中危 4 项（dev 移除 0.0.0.0、路径消毒+白名单、Actions 固定 SHA、删除硬编码引导）、提示级多项（TextEncoder Base64、useData 顶层调用、aside 拼写、favicon、双 Date.now、中文 slug）；npm audit 12 漏洞包清零（剩 3 条 dev-only 受 vitepress 1.x peer 锁死）；教学文档全面重写并与代码逐行核对。
