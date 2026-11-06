---
post: true
title: 你好，ViteEditor
date: 2026-11-06
cover: /images/sample-editor-light.png
coveross: 备用连接
categories:
 - 公告
tags:
 - VitePress
 - Editor
description: 这是通过 ViteEditor 在线编辑并一键发布到 GitHub 的第一篇文章，全文展示编辑器的工作流程。
---

这篇文章本身就是最好的示例：它是在浏览器里打开「在线编辑器」，写完点击「保存到 GitHub」，由 GitHub Actions 自动构建部署上线的。全程没有碰本地终端。

## 工作流程只有三步

1. 在编辑器顶部连接栏填入 GitHub Token、用户名、仓库名与分支；
2. 写文章（标题必填，正文支持全部 Markdown 语法，图片可以直接粘贴上传）；
3. 点击「保存到 GitHub」，文章会归档到 `docs/posts/{年}/{月}/` 目录。

## 编辑器自带的能力

- **文件树管理**：浏览仓库里已有的文章，点击即可加载编辑，也支持删除；
- **图片目录**：仓库图片一目了然，点击缩略图直接插入文章；
- **成品预览**：发布前可以预览文章在博客页的真实效果；
- **草稿自动保存**：刷新页面、断网都不怕丢稿；
- **导入导出**：本地 `.md` 文件可以直接导入，也能导出 Markdown 或网页。

> 提示：Token 只保存在浏览器的 sessionStorage 中，关闭标签页立即失效。建议使用仅含 `Contents: Read and write` 权限的 Fine-grained Token。

## 试试接入你自己的站点

如果你已经有一个 VitePress 博客，只需要把 `editor.vue` 组件复制到你的项目里并安装两个依赖，几步就能获得同款编辑体验。详见文档中的「接入已有项目」章节。
