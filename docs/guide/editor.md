---
title: 编辑器使用教程
description: 从创建 GitHub Token 到发布与管理文章，完整使用 VitePress Editor
---

# 编辑器使用教程

本教程面向第一次使用 VitePress Editor 的用户：从创建 GitHub Token 开始，完整走通「连接仓库 → 编写文章 → 浏览与加载已有文章 → 保存发布 → 图片上传 → 导入导出」的全流程。所有操作都在浏览器中完成，不需要本地开发环境。

## 概述

编辑器的核心是 `docs/.vitepress/theme/components/editor.vue`（下文简称 `editor.vue`），一个**自包含**的 Vue 组件：

- 没有对外接口：无 props、无 emits、无插槽、无 defineExpose，所有配置要么在界面中输入，要么修改源码；
- 纯前端直连 GitHub：浏览器直接调用 GitHub REST API 读写仓库，不经过任何服务器中转，站点本身不存储你的任何数据；
- 技术栈：[md-editor-v3](https://imzbf.github.io/md-editor-v3) ^7.1.0（编辑与预览）+ vue3-toastify ^0.2.9（操作提示）。

::: tip 在线体验
直接打开 [在线编辑器](/pages/editor) 页面即可试用。使用你自己的 Token 连接你自己的仓库，所有配置只保存在你的浏览器里。
:::

## 界面总览 {#layout}

编辑器页面采用**全屏沉浸布局**：隐藏 VitePress 导航与页脚，编辑器占满整个视口（详见[全屏沉浸布局](#fullscreen)）。整体自上而下分为三个区域：

```text
┌──────────────────────────────────────────────────────────────┐
│ 顶栏   品牌区（logo + VitePress Editor + 教程）  │ 文件 目录 导入 导出 成品预览 新建 │
├──────────────────────────────────────────────────────────────┤
│ 连接栏 状态徽标 │ Token │ 用户名 │ 仓库名 │ 分支 │ 文件路径 │ 连接 GitHub │ 保存 │
├───────────┬─────────────────────────────────────┬────────────┤
│ 文件树面板  │                                     │  目录面板   │
│ (260px)   │            md-editor-v3             │  (230px)   │
│ 文章+图片  │           编辑 + 实时预览            │  默认收起   │
└───────────┴─────────────────────────────────────┴────────────┘
```

| 区域 | 控件 | 说明 |
| --- | --- | --- |
| 顶栏·品牌区 | 渐变 logo + "VitePress Editor" + 「教程」链接 | 「教程」返回文档站（`withBase('/guide/')`） |
| 顶栏·工具 | 文件 | 左侧文件树面板开关（默认展开） |
| 顶栏·工具 | 目录 | 右侧目录面板开关（默认收起） |
| 顶栏·工具 | 导入 | 导入本地 `.md` / `.markdown` / `.txt` 文件 |
| 顶栏·工具 | 导出 | 下拉菜单：导出 Markdown (.md) / 导出网页 (.html) |
| 顶栏·工具 | 成品预览 | 开启右侧博客样式实时预览，见[成品预览](#preview) |
| 顶栏·工具 | 新建 | 重置为默认模板并清空本地草稿（带确认弹窗） |
| 顶栏·工具 | 主题 / 语言 | 切换明暗主题与中英文界面 |
| 连接栏 | 状态徽标 | 未连接（灰点）/ 已连接（绿点发光）/ 连接失败（红点） |
| 连接栏 | Token / 用户名 / 仓库名 | GitHub 连接信息 |
| 连接栏 | 分支 | 要操作的分支，留空时请求自动使用 `main`；非 `main` 分支需手动填写 |
| 连接栏 | 文件路径（可选） | 自定义保存路径，仅允许 `docs/posts/` 目录下的 `.md` 文件 |
| 连接栏 | 连接 GitHub | 验证 Token（品牌色弱底按钮），成功后自动加载仓库文件树 |
| 连接栏 | 保存到 GitHub | 将当前文章提交到仓库（渐变主按钮） |
| 主区 | 文件树面板（左，260px） | 仓库文章目录树 + 路径搜索 + 图片目录 |
| 主区 | md-editor-v3 编辑器（中） | Markdown 编辑 + 实时预览，明暗主题跟随站点 |
| 主区 | 目录面板（右，230px） | 文章标题目录，见[目录导航](#catalog) |

小屏（≤900px）下左右面板变为浮层，「文件路径」输入框隐藏。

## 准备工作

### 创建 Fine-grained Token {#create-token}

编辑器通过 GitHub REST API 读写你的仓库，需要一个具备写权限的个人访问令牌：

1. 登录 GitHub，进入 **Settings → Developer settings → Personal access tokens → Fine-grained tokens**；
2. 点击 **Generate new token**，填写令牌名称，建议设置较短的有效期（如 30 或 90 天）；
3. **Repository access** 中选择 **Only select repositories**，只勾选你的博客仓库；
4. 在 **Permissions → Repository permissions → Contents** 中选择 **Read and write**——这是本组件唯一需要的权限（读写文章、删除文件与上传图片都走 Contents API）；
5. 生成后立即复制 Token（`github_pat_` 开头），页面关闭后无法再次查看。

<!-- 截图位：Fine-grained token 的 Repository permissions → Contents 权限设置界面 -->

::: warning 权限最小化
- 只授予 **Contents: Read and write**，不要勾选 Administration、Workflows 等其他权限；
- 不要使用 classic token 并勾选 `repo` 这类大范围 scope；
- 设置较短有效期并定期轮换，令牌泄露的影响窗口越小越好。
:::

### 确认仓库与分支 {#repo-branch}

- **用户名**：仓库所有者的 GitHub 用户名；
- **仓库名**：目标仓库名称（不含用户名前缀）；
- **分支名称**：要操作的分支，默认留空（请求时自动使用 `main`）。如果你的默认分支是 `master` 等其他名称，请如实填写。

### 在连接栏输入 Token {#provide-token}

v3.0.0 起 Token 直接在界面输入：连接栏的 **GitHub Token** 输入框（password 类型，粘贴时内容打码）→ 填写用户名与仓库名 → 点击 **连接 GitHub**。

- Token 验证成功后写入 `sessionStorage`（`github_token` 键），本标签页内刷新页面自动重连，无需重复输入；
- sessionStorage 不跨标签页共享，**新开标签页需要重新输入 Token**——这是用便利换安全的刻意取舍，见[安全说明](#security)；
- 只在本人部署或信任的站点上输入 Token，先确认地址栏域名，不要在来路不明的页面粘贴。

## 首次使用全流程

### 第 1 步：填写 GitHub 配置

在连接栏依次填入 Token、用户名、仓库名（分支默认留空，请求时自动使用 main）。缺 Token 时点击「连接 GitHub」提示「请先填写 GitHub Token」，缺用户名或仓库名时提示「请先填写 GitHub 用户名与仓库名」。用户名/仓库名/分支为非敏感配置，连接成功后写入 `localStorage`，下次打开页面自动填入。

### 第 2 步：连接 GitHub

点击 **连接 GitHub**（连接期间显示「连接中...」并禁用），组件携带 Token 请求 `GET https://api.github.com/user` 验证身份（`editor.vue` 的 `verifyGithubToken`）。左侧状态徽标变化：

| 状态 | 样式 | 含义 |
| --- | --- | --- |
| 未连接 | 灰色圆点 | 尚未验证或未连接 |
| 已连接 | 绿色圆点发光，绿色边框 | Token 有效，配置已记住 |
| 连接失败 | 红色圆点与边框 | 显示具体错误 toast，详细原因在浏览器控制台 |

连接成功时：

- Token 写入 `sessionStorage`，本标签页刷新自动重连；
- 用户名 / 仓库名 / 分支写入 `localStorage`，下次打开自动填入；
- **自动加载仓库文件树**，左侧面板即可浏览文章（见[仓库文件浏览与加载编辑](#file-tree)）；
- 已连接状态出现**「断开连接」按钮**，点击会清除 Token（sessionStorage）并重置为未连接状态。

::: tip
组件只对 Token 做格式提醒（长度少于 20 个字符时弹提示），不会拦截验证——一切以验证结果为准。
:::

### 第 3 步：编辑文章

**认识写作格式（front matter）。** 打开页面时编辑器已预置一份带 front matter 的模板（`editor.vue` 的 `defaultTemplate`）。文章的元信息全部写在正文开头的 `---` 块中：

```markdown
---
post: true
title: 文章标题
date: 2026-11-06
cover: 图片连接
coveross: 备用连接
categories:
 - 分类
tags:
 - 标签
description: 在此处添加文章描述，会显示在文章列表中。
---
文章内容
```

| 字段 | 作用 | 说明 |
| --- | --- | --- |
| `post` | 标记为博客文章 | 供博客主题识别，保持 `true` |
| `title` | **文章标题** | 必填。决定文件名 slug、commit 信息、博客页展示与预览页头——把「文章标题」改成你的标题 |
| `date` | 发布日期 | 页面加载时自动填为当天，可手动修改 |
| `cover` | 封面图地址 | 填 `http(s)://` 或 `/` 开头的图片地址，博客页与成品预览会显示封面 |
| `coveross` | 封面备用地址 | 按你的博客主题约定使用 |
| `categories` | 分类（YAML 列表） | 每行一个 `- 分类名` |
| `tags` | 标签（YAML 列表） | 每行一个 `- 标签名` |
| `description` | 摘要 | 显示在文章列表与预览页头 |

> 📝 标题没有单独的输入框——**直接修改 front matter 里的 `title:` 即可**，文件名、commit 信息和预览页头都会跟着变。保存时若仍是默认的「文章标题」占位，会被拦截提醒。

模板可通过修改源码自定义，见[修改文章模板](#custom-template)。

**了解默认路径规则。** 不填写「文件路径」时，文章按以下规则保存（`editor.vue` 的 `generateFileName`）：

- 目录：`docs/posts/{年}/{月}/`；
- 文件名：`{YYYY-MM-DD}-{slug}.md`；
- slug 由 front matter 的 `title` 生成：转小写、空格替换为 `-`、剔除非法字符，**保留中文**（也保留字母、数字、下划线、连字符）；
- 标题为空或剔除后为空时，回退为 `untitled-{毫秒时间戳}`。

例如标题「我的第一篇文章」、当天为 2026-11-06，保存路径为：

```
docs/posts/2026/11/2026-11-06-我的第一篇文章.md
```

**（可选）自定义路径。** 连接栏中的「文件路径」输入框允许指定保存位置，但受白名单校验保护（详见[路径白名单规则](#path-whitelist)），不合法时保存被拦截，提示「文件路径不合法：仅允许 docs/posts/ 目录下的 .md 文件」。

**编写过程中无需担心丢失内容**——内容与路径会自动保存为本地草稿（见[本地草稿](#draft)），刷新页面自动恢复。

### 第 4 步：保存到 GitHub

点击 **保存到 GitHub**（保存期间按钮显示「保存中...」并禁用）。成功后弹出「文章已成功保存到GitHub!」，左侧文件树自动刷新，实际保存路径会自动填入「文件路径」输入框（避免下次保存生成重复文章）。仓库中会多一条 commit，提交信息格式为：

```
Add post: 你的文章标题       # 新建文件
Update post: 你的文章标题     # 文件已存在，自动更新
```

**文章出现在哪里？** 按默认路径，新文章位于仓库的 `docs/posts/2026/11/` 目录下：

- 目标目录不存在时无需任何准备——GitHub Contents API 的 PUT 请求会自动创建多级目录（v3.1.2 起组件已移除手动建目录与 `.gitkeep` 占位逻辑）；
- 目标文件已存在时自动走更新流程（携带原文件 SHA），无需手动删除旧文件；
- 从文件树加载的文章，其路径会自动填入「文件路径」输入框，保存即更新原文件（见[仓库文件浏览与加载编辑](#file-tree)）。

::: tip 何时能在站点上看到新文章
VitePress 站点由仓库内容构建。文章推送后需要等站点重新构建部署（例如 GitHub Actions 工作流运行完成），线上才会出现新内容，并自动出现在[博客文章列表页](#blog)。
:::

## 仓库文件浏览与加载编辑 {#file-tree}

连接 GitHub 成功后，左侧文件树面板自动加载仓库文件，也可以点击面板顶部的刷新按钮手动更新。

### 加载原理

组件调用 Git Trees API **一次性拉取整棵仓库文件树**（`editor.vue` 的 `loadRepoTree`）：

```
GET /repos/{用户名}/{仓库名}/git/trees/{分支}?recursive=1
```

从返回结果中过滤出两类文件：

| 类别 | 匹配规则 | 用途 |
| --- | --- | --- |
| 文章 | `docs/posts/` 下所有 `.md` | 目录树展示、点击加载 |
| 图片 | `docs/public/images/` 下的 `.png / .jpg / .jpeg / .gif / .webp / .svg / .ico / .avif` | 图片目录缩略图 |

### 目录树交互

- **目录折叠**：点击目录名展开/收起子树，▸ 箭头带旋转动画；
- **路径搜索**：面板顶部搜索框输入关键字（不区分大小写匹配路径），此时切换为扁平匹配列表展示；清空关键字恢复目录树；
- **当前文件高亮**：正在编辑的文件以品牌色高亮；
- **小屏适配**：视口宽度小于 900px 时，加载文件后文件面板自动收起。

### 点击加载文章

点击文章文件后（`editor.vue` 的 `openRepoFile`）：

1. 通过 Contents API（`?ref={分支}`）读取文件内容，Base64 解码为 UTF-8 文本载入编辑器；
2. **标题直接取自加载内容的 front matter `title:`**，显示在成品预览页头，没有单独的标题输入环节；
3. **「文件路径」输入框自动填入该文件的仓库路径**——此后点击保存即直接更新原文件；
4. 提示「已加载 {文件名}」。

::: warning 保存即覆盖原文件
从文件树加载的文章保存时会**直接更新仓库中的原文件**（不再按日期归档生成新文件）。想另存新文件，请清空「文件路径」输入框后再保存。
:::

## 删除文件 {#delete-file}

在文件树（或搜索结果）中将鼠标悬停在文章上，会出现 **✕ 删除按钮**：

1. 点击 ✕ → 弹出红色警示样式的确认弹窗，明确提示「此操作会直接提交到 GitHub 分支，不可自动恢复」；
2. 确认后组件调用 Contents API 的 **DELETE** 方法（携带文件 SHA 与目标分支）直接提交删除（`editor.vue` 的 `deleteRepoFile`），提交信息为 `Delete file: {文件路径}`；
3. 删除成功后文件树自动刷新；如果删除的是当前打开的文件，高亮状态会被清除。

::: danger 删除不可在界面内撤销
删除会直接提交到当前分支，编辑器不提供撤销功能。误删后需要在 GitHub 端恢复，见 FAQ「[删除文件能撤销吗](#faq-restore-delete)」。
:::

## 图片目录与插入 {#image-gallery}

文件树面板下方是独立的**图片目录**区块，展示仓库 `docs/public/images/` 下的全部图片（两列缩略图网格 + 文件名，标题处显示图片总数）。

- **点击图片** → 通过 md-editor-v3 的 `insert()` 在编辑区光标处插入 Markdown（`editor.vue` 的 `insertRepoImage`）：

```markdown
![图片文件名](/images/图片文件名)
```

- 插入的地址是去掉 `docs/public/` 前缀的站点根路径，VitePress 构建时会自动补上 base 前缀；
- 通过编辑器上传的图片会出现在这里（上传成功后文件树自动刷新）。

::: warning 私有仓库的缩略图显示限制
缩略图通过 `raw.githubusercontent.com` 直接加载，该请求无法携带 Token。**私有仓库的缩略图会显示不出来（裂图）**，但不影响插入功能——插入的地址与构建后的站点显示完全正常。公开仓库无此限制，详见 FAQ「[图片缩略图在私有仓库不显示怎么办](#faq-private-thumb)」。
:::

## 图片上传 {#upload-image}

图片上传通过 md-editor-v3 的 `@onUploadImg` 回调实现（`editor.vue` 的 `customUpload`）。

### 操作方式

- **工具栏**：点击编辑器工具栏的图片按钮，选择本地图片；
- **粘贴**：`Ctrl+V` 直接粘贴截图或复制的图片；
- **拖拽**：把图片文件拖入编辑区。

三种方式都会触发上传，且支持**一次多张**（文件多选、一次粘贴或拖入多张）。

### 前提与结果

- 前提：已连接 GitHub，否则提示「请先登录GitHub」；
- 图片逐张上传到仓库的 `docs/public/images/` 目录，文件名为 `{毫秒时间戳}_{安全化后的原文件名}`；
- 上传成功后自动在编辑区插入 Markdown 地址：

```markdown
![alt](/images/1730000000000_screenshot.png)
```

- 多图时逐张上传：某张失败不影响其余图片，成功几张就插入几张，完成后有 toast 统计提示，同时图片目录自动刷新。

### 文件名安全化

原文件名会先经过 `sanitizeFileName` 处理（`editor.vue`）：连续点号压缩为单个 `.`、除字母数字下划线点连字符以外的字符替换为 `_`、开头的点号替换为 `_`，防止特殊字符破坏请求或构造路径遍历。

### 关于图片地址与 base 前缀 {#image-base}

::: warning 子路径部署下编辑器预览可能看不到图片
插入的地址是 `/images/{时间戳}_{文件名}`，**不带 base 前缀**。VitePress 构建时会自动为 Markdown 中以 `/` 开头的图片路径加上站点 base，因此**构建后的站点图片显示正常**。

但编辑器内的实时预览不经过构建流程，如果站点部署在子路径（如 `https://<user>.github.io/<repo>/`），编辑器里的图片预览可能加载失败——这是预期行为，不是上传失败，请以构建后的站点为准。
:::

## 本地草稿 {#draft}

编辑器内置**本地草稿自动保存**，编写过程不依赖任何服务器：

- **保存时机**：内容、文件路径任一变化后 **800ms 防抖**写入 `localStorage`（`editor.vue` 的草稿 watch），存储键为 `vpe_draft_v1`，内容为 `{ filePath, content, at }`（不含 title）；
- **自动恢复**：重新打开页面时，若草稿内容非空且与默认模板不同，自动恢复内容与文件路径并提示「已恢复上次编辑的本地草稿」（`editor.vue` 的 `onMounted`）；
- **清除时机**：点击「新建」会清空当前内容、恢复默认模板并**删除草稿**；导入本地文件覆盖前会确认，并提示当前内容仍有草稿；
- **存储位置**：草稿只存在于浏览器本地的 `localStorage`，按「浏览器 + 站点域名」隔离，不会上传到任何服务器。

## 成品预览 {#preview}

点击顶栏「成品预览」，编辑区右侧会挂载一个**博客样式预览面板**，模拟文章发布后的真实页面效果：

- **实时渲染**：面板与编辑器并排，输入内容**即时**反映到预览中，无需手动刷新（`editor.vue` 的 `previewMarkdown` computed）；
- **博客页头**：自动解析 front matter，渲染标题、发布日期、分类与标签徽标、摘要描述；`cover` 填写了合法图片地址（`http(s)://` 或 `/` 开头）时还会显示封面图；
- **与内置预览互斥**：开启成品预览时，编辑器自带的预览栏自动收起（调用 `togglePreview`），腾出空间给博客预览；关闭后恢复；
- **关闭方式**：再次点击「成品预览」按钮即可返回纯编辑模式，编辑状态全程保留。

> 📝 注意：预览面板使用 md-editor-v3 的 `MdPreview` 组件渲染（与编辑器预览同一管线，内置 XSS 消毒）。front matter 解析有 **2KB 上限**，缺失闭合 `---` 时不会吞掉正文，预览与实际渲染保持一致。子路径部署下图片在编辑器内预览可能不显示，原因见[图片上传](#image-base)章节的说明——以构建后的站点为准。

## 博客文章列表页 {#blog}

站点内置**博客文章列表页**，`/posts/`（英文站为 `/en/posts/`）会自动归档展示 `docs/posts/` 下的全部文章：

- **构建期自动归档**：列表由 VitePress 的 `createContentLoader` 在构建时生成，无需手动维护列表；
- **卡片式列表**：每篇文章以卡片展示，封面取自 front matter 的 `cover`，未填写时使用渐变占位图；
- **按日期倒序**：文章按 front matter 的 `date` 从新到旧排列；
- **双语共用数据源**：英文列表 `/en/posts/` 与中文列表展示同一批文章（文章本身没有 en 版本）；
- **发布即上架**：文章保存到 GitHub 并触发站点重新构建后自动出现在列表，无需任何额外操作。

## 导入与导出 {#import-export}

### 导入本地文件

点击顶栏「导入」选择本地文件，支持 `.md` / `.markdown` / `.txt` 三种扩展名（`editor.vue` 的 `handleImportFile`）：

- 当前内容不是默认模板时（即有正在编辑的内容），先弹确认框提示「导入将覆盖当前正在编辑的内容（当前内容仍有本地草稿）」；
- 导入后：正文替换为文件内容，「文件路径」清空——保存时将走默认的按日期归档路径；标题以文件自身的 front matter 为准。

### 导出文件

点击顶栏「导出」弹出下拉菜单，两个选项：

| 选项 | 内容 | 说明 |
| --- | --- | --- |
| 导出 Markdown (.md) | 编辑区原文 | 标准 Markdown 文件，可直接导入其他编辑器 |
| 导出网页 (.html) | 编辑器实时渲染的 HTML | 可直接在浏览器打开的独立网页 |

导出文件名取自文章标题（非法字符替换为 `_`、空格替换为 `-`，标题为空时回退 `post`）。

**导出网页的原理**：编辑器通过 `@onHtmlChanged` 持续捕获实时渲染的 HTML，导出时套用内置的极简样式模板（`editor.vue` 的 `exportHtmlFile`）——正文最大宽 800px 居中，内含代码块、引用、表格、图片的基础样式，导出即为可直接分享阅读的独立 HTML 文件。

## 目录导航 {#catalog}

点击顶栏「目录」按钮，右侧展开 230px 的**文章目录面板**：

- 基于 md-editor-v3 的 `MdCatalog` 组件，`editorId` 固定为 `vpe-editor`，滚动容器指向编辑器预览区 `#vpe-editor-preview-wrapper`；
- 展示当前文章的全部标题层级，点击条目预览区滚动到对应位置；
- 明暗主题跟随站点。

## 全屏沉浸布局 {#fullscreen}

编辑器页面（`/pages/editor`）采用全屏沉浸布局，与普通文档页完全不同：

- `Layout.vue` 监听路由，当页面为 `pages/editor.md` 时给 `body` 动态添加 `vpe-fullscreen` class；
- `custom.css` 中 `body.vpe-fullscreen` 规则隐藏 VitePress 导航（`.VPNav`）、页脚（`.VPFooter`）与遮罩层，并清除内容区的全部内边距与最大宽度限制；
- 组件根容器高度为 `100dvh`，编辑器占满整个视口；
- 顶栏左侧的品牌区（渐变 logo + "VitePress Editor"）提供「教程」链接，随时返回文档站。

想在自己的 VitePress 站点复刻这套布局，见[接入已有项目](/guide/integrate)。

## 双语界面 {#i18n}

站点提供中英双语界面：

- **手动切换**：点击导航栏右侧的语言按钮（移动端在「...」菜单内）可在中文 ↔ English 之间切换，选择会持久保存；
- **首次访问自动匹配**：首次访问时按浏览器语言自动跳转到对应语言版本（仅对首页与 `/guide/` 教程页生效）；手动选择过语言后不再自动跳转；
- **编辑器页双语共用**：编辑器页面 `/pages/editor` 没有 en 版本，中英用户共用同一页面，界面语言跟随手动选择（首次访问时为浏览器语言）。

## 工作原理

本节从源码层面简要说明编辑器的运作机制，便于理解与排查问题。

### Token 验证

点击「连接 GitHub」（或页面加载时检测到 sessionStorage 中已有 Token 自动重连）后，组件向 GitHub 发起一次身份验证：

```
GET https://api.github.com/user
Authorization: token <你的Token>
```

- `2xx`：认证成功，写入存储（见[存储键一览](#storage-keys)）；
- `401`：提示「GitHub Token无效或已过期，请检查Token是否正确」；
- `403`：提示「GitHub API访问受限，可能是请求次数超限」；
- 其他状态码：提示「GitHub认证失败: {状态码}」。

### 保存文章的流程

`handleSave`（`editor.vue`）依次执行：

1. **获取文件 SHA**：请求目标文件，仅 404 视为新文件，其余错误直接抛出终止保存；文件已存在则取其 SHA——Contents API 更新文件必须携带原文件 SHA，相当于乐观锁；
2. **PUT 提交**：文章内容经 UTF-8 → Base64 编码（`editor.vue` 的 `utf8ToBase64`），连同 commit 信息与目标分支一起 `PUT` 到 Contents API；目标目录不存在时 GitHub 会自动创建多级目录。

图片上传同理，只是路径固定为 `docs/public/images/`。所有请求中的用户名、仓库名、路径均逐段 `encodeURIComponent` 编码（`editor.vue` 的 `repoContentsUrl`），防止 `../`、`?`、`#` 等特殊字符破坏请求或操纵写入位置；所有对 GitHub API 的请求都经 `ghFetch` 封装（15 秒超时），网络挂起时不会永久卡在加载状态。

### 文件树与删除

- 文件树：Git Trees API `?recursive=1` 一次拉取整棵树，前端过滤文章与图片（`loadRepoTree`），再由 `buildTree` / `treeToArray` 构建可折叠的嵌套目录；
- 读取文件：Contents API `GET ?ref={分支}`，Base64 → UTF-8 解码（`base64ToUtf8`）；
- 删除文件：Contents API `DELETE`，携带文件 SHA（`deleteRepoFile`）。

### 存储键一览 {#storage-keys}

| 键名 | 存储位置 | 内容 | 写入时机 | 何时失效 |
| --- | --- | --- | --- | --- |
| `github_token` | sessionStorage | GitHub Token | 验证成功后 | 关闭标签页即失效 |
| `github_username` | localStorage | 用户名 | 验证成功后 | 长期保留，需手动清除 |
| `github_repo` | localStorage | 仓库名 | 验证成功后 | 长期保留，需手动清除 |
| `github_branch` | localStorage | 分支名 | 验证成功后 | 长期保留，需手动清除 |
| `vpe_draft_v1` | localStorage | 本地草稿（路径/内容/时间戳） | 内容变化 800ms 后 | 「新建」清空或手动清除 |

::: tip
标签页不关闭时刷新页面，sessionStorage 保留，组件会自动填入全部配置并重新验证 Token。注意 sessionStorage 不跨标签页共享，新开标签页需要重新输入 Token。
:::

## 配置自定义

组件是自包含的（没有 props 等对外配置入口），以下自定义都需要修改源码。

### 修改文章模板 {#custom-template}

编辑 `docs/.vitepress/theme/components/editor.vue` 中的 `defaultTemplate`，即可更换打开页面时的预置内容：front matter 字段、初始正文等。组件顶部的常量（编辑器实例 `editorId`、草稿键 `DRAFT_KEY` 等）也集中在文件顶部。

### 调整编辑器样式

样式集中在两处：

- `editor.vue` 末尾的 `<style scoped>`：三区布局、左右面板、连接栏、确认弹窗、过渡动画等全部组件样式；
- `docs/.vitepress/theme/custom.css`：品牌色变量（`--vp-c-brand-*`）、全屏沉浸布局规则（`body.vpe-fullscreen`）、站点级外观。

编辑器内部（含 md-editor-v3）的背景色通过 `--md-bk-color: var(--vp-c-bg)` 映射到 VitePress 变量，明暗模式自动适配。站点品牌色通过 `custom.css` 顶部的 `--vp-c-brand` 系列变量调整。

### 路径白名单规则 {#path-whitelist}

自定义保存路径由 `isFilePathValid`（`editor.vue`）校验：

```js
/^docs\/posts\/[\w\u4e00-\u9fa5\-/]+\.md$/.test(p)
```

| 规则 | 说明 |
| --- | --- |
| 必须位于 `docs/posts/` 下 | 防止通过自定义路径覆盖仓库其他文件（如 `.github/workflows/*.yml`） |
| 字符白名单 | 仅允许字母、数字、下划线、中文、连字符、斜杠 |
| 路径中不允许出现点号 | 除结尾的 `.md` 扩展名外不能出现 `.`，天然杜绝 `../` 与多扩展名 |
| 必须 `.md` 结尾 | 只能写 Markdown 文件 |

| 示例 | 结果 |
| --- | --- |
| `docs/posts/2026/11/note.md` | 通过 |
| `docs/posts/我的笔记.md` | 通过 |
| `docs/index.md` | 拒绝：不在 `docs/posts/` 下 |
| `docs/posts/../config.js` | 拒绝：含点号与非法字符 |
| `docs/posts/a/b.md.txt` | 拒绝：不是 `.md` 结尾 |

## 安全说明 {#security}

本项目经历过一轮安全审计与重构（v2.1.0），v3.0.0 延续了全部安全设计。以下决策值得每位使用者了解。

### Token 为什么只存 sessionStorage

Token 是拥有仓库写权限的敏感凭证，组件刻意把它放在 `sessionStorage` 而非 `localStorage`：

- sessionStorage 的生命周期与标签页一致，关闭即清空，把泄露窗口压缩到单次会话；
- localStorage 永久保留，一旦同源页面出现 XSS 漏洞，恶意脚本可长期窃取仓库写权限。

代价是每次新开标签页都要重新输入 Token——这是用便利换安全的刻意取舍（见 `editor.vue` 源码注释）。

### 为什么不能把 Token 硬编码进源码

本站点是纯静态站点，源码中的任何字符串都会进入公开的构建产物（JS 包），任何访问者打开 DevTools 即可看到。旧版本曾引导把 Token 写进源码，v2.1.0 已彻底移除相关代码与文档。**永远不要把真实 Token 提交进仓库或写进前端代码。**

### 最小权限原则

- 使用 Fine-grained token，只授权目标仓库；
- 权限只给 **Contents: Read and write**（保存文章、删除文件与上传图片的全部所需）；
- 设置较短有效期并定期轮换；
- 不使用 classic token + 大范围 scope。

### 错误提示笼统化

界面只显示笼统的错误信息（如「GitHub API 返回 422」「读取文件失败（HTTP 403）」），不透传 GitHub 返回的原始错误详情；详细信息通过 `console.error` 输出到浏览器控制台，避免向页面访客泄露仓库内部信息。

### 静态站点的鉴权边界

::: warning 编辑器页面本身没有访问控制
组件没有任何服务端，无法做登录鉴权——任何能打开编辑器页面的人都可以尝试连接自己的仓库。真正的权限边界在 GitHub Token：没有你的 Token，任何人都无法写入你的仓库。因此本组件定位是**个人写作工具**，而非多用户投稿平台；请勿在公共设备上使用。
:::

### 关于已移除的密码保护

旧版本（v2.0.0）内置过一个纯前端的访问密码（默认 `123456`）。v2.1.0 将其**整层移除**，原因：

- 校验逻辑运行在浏览器里，任何人打开 DevTools 即可绕过；
- 它不构成任何真实的安全边界，只会制造虚假安全感；
- 移除后，安全责任清晰落在 Token 的存储方式与权限范围上。

## 进阶拓展（当前未启用）

以下能力来自编辑器底层库 [md-editor-v3](https://imzbf.github.io/md-editor-v3)（当前版本 ^7.1.0）。**当前组件未启用这些能力**，列出仅作二次开发方向参考。

### md-editor-v3 的可拓展能力

- **toolbars 自定义工具栏**：通过 `toolbars` 属性裁剪、排序工具栏按钮；当前组件未传入该属性，使用默认工具栏；
- **MdPreview 只读预览组件**：适用于仅需展示 Markdown 而不需要编辑的场景；
- **更多扩展点**：当前已接入的回调为 `@onUploadImg`（图片上传）与 `@onHtmlChanged`（导出 HTML），目录导航基于内置的 `MdCatalog` 组件。

### 组件化改造方向

如果想在自己的站点中复用并灵活配置，可以考虑：

- 用 `defineProps` 暴露默认用户名 / 仓库 / 分支、文章模板、上传目录等配置；
- 用 `defineEmits` 抛出保存成功 / 失败事件，接入站点级通知；
- 把 GitHub 交互抽离为 composable，与 UI 解耦。

不做改造、直接把组件嵌入已有 VitePress 站点的完整步骤见[接入已有项目](/guide/integrate)。欢迎在 [GitHub Issues](https://github.com/cubeyu/ViteEditor/issues) 讨论改造方案。

## 常见问题 FAQ {#faq}

::: tip 排查通用原则
界面只显示笼统的错误信息（如「GitHub API 返回 422」），详细信息都会通过 `console.error` 输出到浏览器控制台。排查问题时先按 `F12` 打开 DevTools 查看。
:::

### 连接时提示 Token 无效或已过期（401）

- Token 已到达有效期或已被撤销——重新生成并在连接栏输入；
- 复制时混入了空格或换行；
- 新标签页尚未输入 Token（sessionStorage 为空），见[在连接栏输入 Token](#provide-token)。

### 提示 GitHub API 访问受限（403）

通常是请求次数超限：GitHub API 对未认证请求限制为每小时 60 次（按 IP 计），认证后为每小时 5000 次。等待限额恢复或更换 Token 后重试。

### 保存失败，提示 GitHub API 返回 422

422 表示请求内容无法被处理，常见原因：

- 文件其实已存在，但获取 SHA 的一步因限流等原因失败，被当作新文件提交；
- 自定义路径或请求参数不被 GitHub 接受。

具体原因请看控制台中「保存文章失败:」之后的 GitHub 返回详情。

### 图片缩略图在私有仓库不显示怎么办？ {#faq-private-thumb}

图片目录的缩略图通过 `raw.githubusercontent.com` 加载，浏览器发起的 `<img>` 请求无法携带 Authorization 头，而私有仓库的 raw 地址需要鉴权，因此**私有仓库的缩略图会显示为裂图**。这不影响任何功能：点击图片仍会插入正确的 `/images/...` 地址，推送并构建后的站点显示正常。公开仓库无此限制。

### 删除文件能撤销吗？ {#faq-restore-delete}

编辑器界面内**不能撤销**——删除是直接提交到当前分支的一次 commit（提交信息为 `Delete file: {文件路径}`）。误删后的恢复方式：

1. 在 GitHub 上打开仓库 → **Commits**，找到 `Delete file:` 那条提交；
2. 通过 `git revert` 撤销该提交，或打开删除前一个 commit 中的文件内容，重新保存即可。

### 草稿存在哪里？ {#faq-draft-where}

浏览器本地的 `localStorage`，键名 `vpe_draft_v1`，按「浏览器 + 站点域名」隔离，不会上传到任何服务器。清除方式：点击「新建」按钮、在浏览器站点数据中清除，或控制台执行 `localStorage.removeItem('vpe_draft_v1')`。

### 编辑器预览里图片显示不出来（构建后正常）

见[关于图片地址与 base 前缀](#image-base)：子路径部署下编辑器实时预览可能 404，构建后的站点显示正常。

### Token 什么时候失效？

分两层：

- **本地存储**：Token 存在 sessionStorage，关闭标签页即清除；标签页不关、仅刷新页面不会清除（自动重连）；
- **GitHub 侧**：到达有效期或在 GitHub 后台撤销后，所有请求返回 401。

### 中文标题会生成中文文件名吗？

会。slug 规则保留中文（如 `docs/posts/2026/11/2026-11-06-我的第一篇文章.md`），GitHub 与 Git 均支持中文文件名。希望文件名保持纯英文时，可以在「文件路径」输入框中手动指定。

### 保存到不存在的目录会失败吗？

不会。GitHub Contents API 的 PUT 请求会自动创建目标路径中缺失的多级目录（v3.1.2 起组件不再手动建目录，也不再生成 `.gitkeep` 占位文件），直接把「文件路径」写成想要的位置即可。

## 更新日志

### v3.1.2（全面复审修复）

- 主题入口不再全局注册编辑器（改为页面级导入），主题 chunk 从 1012KB 精简至 66KB；
- 删除 `ensureDirectoryExists`：GitHub Contents API 的 PUT 自动创建多级目录，不再生成 `.gitkeep` 占位文件；
- `getFileSHA` 仅 404 视为新文件，其余错误向上抛出，避免对已存在文件误判导致 422；
- 新增 `ghFetch` 请求封装（15 秒超时）；已连接状态新增「断开连接」按钮；保存成功后实际路径自动填入「文件路径」；
- 无障碍与交互：确认弹窗支持 Esc 关闭、文件树行支持键盘操作、导出菜单外点/Esc 关闭、图标按钮补充 aria-label；
- 成品预览封面拒绝协议相对地址并统一过 `withBase`；front matter 解析统一 2KB 上限；
- 连接栏微调：分支默认留空（请求自动回退 main）、文件路径移至分支后，品牌区徽章文案改为「教程」。

### v3.1.1（导航/页脚体验修复）

- 导航栏标题前新增品牌 logo；
- 官方主题切换 / GitHub 图标的显示断点从 ≥1280px 提前到 ≥960px（中等宽度下不再消失）；
- 语言同步策略改为「UI 文案强制跟随页面语言树」（编辑器双语共用页除外），修复 en 页面出现中文文案的不一致；
- 页脚改为简约单行式（品牌 · 快捷链接 · 作者 + 赞赏）。

### v3.0.0（大版本升级，项目更名为 VitePress Editor）

- 全屏沉浸布局：编辑器页占满整个视口，隐藏 VitePress 导航与页脚；
- 界面内直接输入 GitHub Token（连接栏），连接状态徽标（未连接/已连接/连接失败）；
- 新增仓库文件树：Git Trees API 加载 `docs/posts/` 全部文章，目录折叠、路径搜索、点击加载编辑（文件路径自动填入，标题取自 front matter）；
- 新增删除文件：确认弹窗后经 Contents API 直接提交删除并刷新文件树；
- 新增图片目录：`docs/public/images/` 缩略图网格，点击插入 Markdown；
- 新增导入（.md/.markdown/.txt，覆盖前确认）与导出（Markdown .md / 网页 .html）；
- 新增本地草稿：800ms 防抖自动保存 localStorage，刷新自动恢复；
- 新增右侧文章目录（MdCatalog）。

### v2.1.0（安全重构）

- 移除纯前端密码保护层与源码内置 Token 的引导；
- Token 改为 sessionStorage 会话级存储；
- 新增自定义保存路径白名单校验；
- 图片上传支持多图批量；
- md-editor-v3 升级至 7.1.0，UTF-8 Base64 编码改用 TextEncoder 实现。

### v2.0.0

- 新增密码保护（已在 v2.1.0 移除）；
- 优化图片上传体验，支持自定义文件路径。

### v1.0.0

- 基础编辑器功能、GitHub 集成与 Markdown 预览。
