---
title: VitePress Editor 介绍
description: VitePress Editor 是一个基于 VitePress 的全屏在线 Markdown 编辑器，支持编写、发布与管理 GitHub 仓库文章
---

# VitePress Editor 介绍

VitePress Editor（原名 VitePress Online Editor）是一个基于 VitePress 的在线 Markdown 编辑器，专为 VitePress 博客和文档站点设计。打开页面即是全屏沉浸编辑器：编写、预览、管理仓库文章、上传图片、一键发布到 GitHub，全程在浏览器中完成，无需本地环境。

## 核心特性

### 编辑与浏览

- 🖥 **全屏沉浸**：编辑器页占满整个视口，隐藏站点导航与页脚，明暗主题自动适配
- 📝 **Markdown 编辑 + 实时预览**：基于 md-editor-v3，支持工具栏、粘贴图片、拖拽上传
- 📑 **目录导航**：右侧面板展示文章标题层级，点击跳转对应位置

### 仓库管理

- 🗂 **文件树浏览**：连接 GitHub 后自动加载 `docs/posts/` 下的全部文章，目录可折叠、支持路径关键字搜索
- 📂 **点击加载编辑**：文章内容与文件路径一键填入（标题取自 front matter），保存即更新原文件
- 🗑 **删除文件**：确认弹窗后直接提交删除到当前分支，文件树自动刷新
- 📸 **图片直传与插入**：多图上传（工具栏/粘贴/拖拽）到仓库图片目录；图片目录缩略图点击即插入 Markdown

### 内容流转

- 📥 **导入**：本地 `.md` / `.markdown` / `.txt` 文件，覆盖前有确认
- 📤 **导出**：Markdown（`.md`）或网页（`.html`，内置样式模板可直接分享阅读）
- 💾 **草稿自动保存**：内容/路径 800ms 防抖写入 localStorage，刷新页面自动恢复

### 安全设计

- 🔐 **Token 会话级存储**：Token 在界面输入，仅保存在 sessionStorage，关闭标签页即失效
- 🛡 **保存路径白名单**：仅允许写入 `docs/posts/` 目录下的 `.md` 文件，防止覆盖仓库其他文件
- ✅ **Fine-grained Token + 最小权限**：仅需 Contents: Read and write

## 快速上手

1. 创建 Fine-grained 个人访问令牌（仅需 Contents: Read and write 权限），步骤见[编辑器使用教程](/guide/editor#create-token)；
2. 打开[在线编辑器](/pages/editor)，在连接栏填入 Token、用户名、仓库名（分支可留空，自动使用 main），点击「连接 GitHub」，状态徽标变绿（绿点发光）即连接成功；
3. 编写文章（或从左侧文件树加载已有文章），点击「保存到 GitHub」完成发布！

无需注入密码、无需改源码——v3.0.0 起 Token 直接在界面输入。

## 技术栈

- 🛠 基于 [VitePress](https://vitepress.dev/) ^1.6.4 构建
- ⚡️ 使用 [Vue 3](https://vuejs.org/) ^3.5.45 开发
- 📝 集成 [md-editor-v3](https://imzbf.github.io/md-editor-v3) ^7.1.0
- 🔔 使用 vue3-toastify ^0.2.9 展示操作结果提示

## 部署选项

### GitHub Pages

适合个人博客和开源项目文档：

- 在仓库设置中将 Pages 来源设为 GitHub Actions，配合工作流自动部署
- 零成本托管，支持自定义域名
- 子路径部署需在 `docs/.vitepress/config.js` 中正确设置 `base` 选项

### Vercel / Netlify

适合团队协作和快速上线：

- 导入 GitHub 仓库，选择 VitePress 框架预设即可部署
- 自动监听仓库变化，推送后自动重新构建
- 全球 CDN 加速

> 📝 注意：子路径部署（如 GitHub Pages）下，编辑器实时预览中的图片可能显示不出来，构建后的站点显示正常，详见[图片地址与 base 前缀](/guide/editor#image-base)。

## 下一步

- [编辑器使用教程](/guide/editor)
- [接入已有 VitePress 项目](/guide/integrate)
- [开始使用在线编辑器](/pages/editor)
- [访问 GitHub 仓库](https://github.com/cubeyu/ViteEditor)

## 贡献指南

我们欢迎任何形式的贡献：

- 🐛 报告 Bug
- 💡 提出新功能建议
- 📝 改进文档
- 🔧 提交代码修复

## 支持与帮助

如果您在使用过程中遇到任何问题：

1. 查看[常见问题 FAQ](/guide/editor#faq)
2. 在 [GitHub Issues](https://github.com/cubeyu/ViteEditor/issues) 提问
