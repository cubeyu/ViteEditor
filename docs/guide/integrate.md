---
title: 接入已有项目
description: 把 ViteEditor 嵌入你已有的 VitePress 站点，六步完成集成
---

# 接入已有 VitePress 项目

本教程面向**已有 VitePress 站点**、想把 ViteEditor 嵌进去的用户。编辑器本体是一个自包含的 Vue 组件 `editor.vue`，核心运行时依赖只有两个：`md-editor-v3` 与 `vue3-toastify`。它与 VitePress 的耦合点（主题联动、`withBase()`、CSS 变量）都是 VitePress 默认主题天然具备的，因此接入成本很低。

想先了解全部功能再动手，见[编辑器使用教程](/guide/editor)；也可以先在[在线编辑器](/pages/editor)体验。

## 前置条件

| 项 | 要求 |
| --- | --- |
| VitePress | 1.x（使用默认主题） |
| Node.js | 18+ |
| GitHub 仓库 | 文章位于 `docs/posts/`（组件的写入白名单固定为该目录，其他位置需自行改源码常量） |
| GitHub Token | Fine-grained PAT，权限 Contents: Read and write |

组件基于以下版本开发：VitePress ^1.6.4、Vue ^3.5.45、md-editor-v3 ^7.1.0、vue3-toastify ^0.2.9。

## 第 1 步：安装依赖

```sh
npm install md-editor-v3 vue3-toastify
# 或
pnpm add md-editor-v3 vue3-toastify
```

- `md-editor-v3`：提供 `MdEditor` / `MdCatalog` 组件与样式（组件内部已 `import 'md-editor-v3/lib/style.css'`）；
- `vue3-toastify`：操作结果提示（连接成功、保存成功、草稿恢复等 toast，样式已随组件引入）。

## 第 2 步：复制组件文件

把本项目的 [`docs/.vitepress/theme/components/editor.vue`](https://github.com/cubeyu/ViteEditor/blob/main/docs/.vitepress/theme/components/editor.vue) 复制到你项目的 `docs/.vitepress/theme/components/editor.vue`（目录不存在则新建）。

组件与 VitePress 的耦合点只有三处，均为默认主题内置能力，无需额外安装：

| 耦合点 | 组件中的位置 | 说明 |
| --- | --- | --- |
| `useData().isDark` | `<script setup>` 顶部 | 编辑器明暗主题跟随站点，`useData` 只能在 VitePress 渲染的组件中使用——放在主题组件目录下天然满足 |
| `withBase('/guide/')` | 顶栏「教程」返回链接 | 链接会自动加上站点 base；如果你的文档不在 `/guide/`，改成自己的地址即可 |
| CSS 变量 `--vp-c-*` | 全部样式 | 组件颜色全部引用 VitePress 的品牌/背景/文字变量，默认主题自动注入并随明暗切换 |

组件没有其他外部配置：无 props、无 emits，GitHub 地址、草稿键、路径白名单等常量都写在文件顶部，可按需修改。

## 第 3 步：注册组件

两种方式任选其一。

**方式 A：全局注册**（任意页面可直接使用 `<Editor />`）。修改 `docs/.vitepress/theme/index.js`：

```js
import DefaultTheme from 'vitepress/theme'
import Editor from './components/editor.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('Editor', Editor)
  }
}
```

**方式 B：页面局部导入**（只在该页面可用，无需改 theme/index.js）：

```md
<script setup>
import Editor from '../.vitepress/theme/components/editor.vue'
</script>

<Editor />
```

md-editor-v3 的内部组件由 editor.vue 自行导入，不需要你注册。

## 第 4 步：创建编辑器页面

新建 `docs/pages/editor.md`（或你喜欢的任意路径）：

```md
---
page: true
title: 编辑器
description: 在线编辑器
aside: false
---
<script setup>
import Editor from '../.vitepress/theme/components/editor.vue'
</script>
<Editor />
```

front matter 说明：

- `page: true`：使用 VitePress 的 page 布局，页面内容不受文档容器约束；
- `aside: false`：关闭右侧大纲栏，避免与编辑器的目录面板重叠。

::: tip 记下页面路径
`page: true` 布局对应的 markdown 相对路径（这里是 `pages/editor.md`）在第 5 步的 body class 判断中要用到，路径不同请对应修改。
:::

## 第 5 步：全屏沉浸布局（推荐）

不做这一步编辑器也能用（嵌在普通文档布局中），做了才能获得 v3.0.0 的完整体验：隐藏 VitePress 导航与页脚，编辑器占满整个视口（`100dvh`）。需要两小段代码。

**第一段：动态 body class。** 新建 `docs/.vitepress/theme/Layout.vue`：

```vue
<template>
  <DefaultTheme.Layout />
</template>

<script setup>
import { watchEffect } from 'vue'
import DefaultTheme from 'vitepress/theme'
import { useRoute } from 'vitepress'

const route = useRoute()
watchEffect(() => {
  if (typeof document === 'undefined') return
  // 改成你自己的编辑器页面路径（相对 srcDir 的 markdown 路径）
  document.body.classList.toggle('vpe-fullscreen', route.data.relativePath === 'pages/editor.md')
})
</script>
```

然后在 `theme/index.js` 中挂载 Layout（若第 3 步用了方式 A，合并到同一个 `export default`）：

```js
import DefaultTheme from 'vitepress/theme'
import Layout from './Layout.vue'
import Editor from './components/editor.vue'

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('Editor', Editor)
  }
}
```

**第二段：全屏样式。** 在 `docs/.vitepress/theme/custom.css` 中追加：

```css
/* 编辑器页：沉浸式全屏布局（body class 由 Layout.vue 控制） */
body.vpe-fullscreen {
  overflow: hidden;
}

/* 隐藏导航、页脚、侧边遮罩 */
body.vpe-fullscreen .VPNav,
body.vpe-fullscreen .VPFooter,
body.vpe-fullscreen .VPBackdrop {
  display: none !important;
}

/* 内容区去掉所有内边距与宽度限制 */
body.vpe-fullscreen .VPContent {
  padding: 0 !important;
  padding-top: 0 !important;
  min-height: 0 !important;
}

body.vpe-fullscreen .VPDoc {
  padding: 0 !important;
}

body.vpe-fullscreen .VPDoc .container {
  max-width: none !important;
}

body.vpe-fullscreen .VPDoc .content {
  max-width: none !important;
  padding: 0 !important;
}

body.vpe-fullscreen .vp-page,
body.vpe-fullscreen .vp-doc,
body.vpe-fullscreen .VPPage {
  max-width: none !important;
  width: 100% !important;
  padding: 0 !important;
  margin: 0 !important;
}
```

`route.data.relativePath` 是相对 `srcDir`（默认 `docs/`）的 markdown 路径，不含 base，跨部署环境可靠。

## 第 6 步：品牌色与样式统一

编辑器组件的所有颜色都引用 VitePress 的 `--vp-c-*` 变量，改品牌色即整体换肤。在 `custom.css` 中定义（与本项目一致）：

```css
:root {
  --vp-c-brand-1: #3eaf7c;
  --vp-c-brand-2: #42d392;
  --vp-c-brand-3: #369f6b;
  --vp-c-brand-soft: rgba(62, 175, 124, 0.14);
}
```

- 编辑器内部（含 md-editor-v3）的背景色通过 `--md-bk-color: var(--vp-c-bg)` 映射，明暗模式自动适配，无需额外处理；
- 你站点现有的 `--vp-c-brand-*` 配置会直接生效，这一步只在想统一为绿色品牌色时需要。

至此集成完成。访问编辑器页面，在连接栏填入 Token、用户名、仓库名（分支可留空，自动使用 main）即可开始写作。

## 安全须知

- **Token 只在界面输入**：不要把 Token 写进任何源码或配置文件——纯静态站点中所有源码字符串都会进入公开的构建产物；
- **会话级存储**：Token 仅保存在 `sessionStorage`，关闭标签页即失效；用户名/仓库名/分支等非敏感配置存 `localStorage`；
- **最小权限**：使用 Fine-grained PAT，只授权目标仓库，权限仅 **Contents: Read and write**，并设置较短有效期定期轮换；
- **内置防护**：保存路径白名单（仅 `docs/posts/*.md`）、文件名消毒、请求路径逐段 `encodeURIComponent`、错误提示笼统化（详情进控制台）均已内置；
- **没有访问控制**：编辑器页面公开可访问，任何访客都能尝试连接自己的仓库。它定位是个人写作工具，请勿在公共设备上输入 Token。

更多原理与取舍的讨论见[使用教程的安全说明](/guide/editor#security)。

## 常见集成问题 FAQ

### 构建/SSR 报 `window is not defined` 或 `document is not defined`

VitePress 构建时会对页面做服务端预渲染。editor.vue 中的浏览器 API（`sessionStorage`、`localStorage`、`window.innerWidth`）都在 `onMounted` 或事件回调中调用，正常不会触发此错误；若你的项目中因其他依赖在模块顶层访问了浏览器 API 导致构建失败，标准解法是用 `<ClientOnly>` 包裹：

```md
<ClientOnly>
  <Editor />
</ClientOnly>
```

### 样式冲突

- editor.vue 的样式全部为 `scoped`，不会污染你的站点；
- md-editor-v3 的样式通过组件内的 `import 'md-editor-v3/lib/style.css'` 引入，作用域收敛在 `.md-editor` 内；
- 若你的站点全局 CSS 强改了 `pre`、`code`、`table`、`blockquote` 等元素样式，可能影响编辑器预览区，可在主题层用更精确的选择器或 `:deep()` 做隔离。

### md-editor-v3 版本要求

组件基于 **md-editor-v3 ^7.1.0** 开发，使用了 `onHtmlChanged`（导出 HTML）、`onUploadImg`（图片上传）、编辑器实例的 `insert()`（插入图片）、`MdCatalog` 的 `scroll-element`（目录滚动定位）等接口。低于 7.x 的版本接口不兼容，安装时请保持大版本一致。

### GitHub 仓库名与站点 base 的关系

- 编辑器写文件走 GitHub API，操作的是仓库里的真实路径（`docs/posts/...`、`docs/public/images/...`），与站点 `base` 无关；
- `base` 只影响站点 URL 与静态资源前缀。GitHub Pages 子路径部署时，Markdown 中的图片地址 `/images/...` 会在构建时自动加上 base，站点显示正常（编辑器内实时预览可能 404，属预期行为）；
- 唯一需要留意的是顶栏「教程」链接 `withBase('/guide/')`：站点没有 `/guide/` 页面时改成自己的文档地址。

## 下一步

- [编辑器使用教程](/guide/editor) —— 功能全景与常见问题
- [在线体验](/pages/editor) —— 先试试再集成
