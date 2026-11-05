---
title: Introduction to VitePress Editor
description: VitePress Editor is a fullscreen online Markdown editor built on VitePress, supporting writing, publishing, and managing posts in your GitHub repository
---

# Introduction to VitePress Editor

VitePress Editor (formerly VitePress Online Editor) is an online Markdown editor built on VitePress, designed for VitePress blogs and documentation sites. Opening the page drops you straight into a fullscreen immersive editor: writing, previewing, managing repository posts, uploading images, and publishing to GitHub with one click — all in the browser, no local environment required.

## Key Features

### Editing & Browsing

- 🖥 **Fullscreen immersion**: The editor page fills the entire viewport, hiding site navigation and footer, and automatically adapts to light/dark themes
- 📝 **Markdown editing + live preview**: Powered by md-editor-v3, with toolbar support, image pasting, and drag-and-drop upload
- 📑 **TOC navigation**: A right-hand panel shows the post's heading hierarchy; click an entry to jump to it

### Repository Management

- 🗂 **File tree browsing**: Once connected to GitHub, all posts under `docs/posts/` load automatically; directories are collapsible and support keyword search by path
- 📂 **Click to load and edit**: Post content and file path are filled in with one click (the title comes from the front matter); saving updates the original file
- 🗑 **File deletion**: After a confirmation dialog, deletions are committed directly to the current branch and the file tree refreshes automatically
- 📸 **Image upload & insertion**: Upload multiple images (toolbar/paste/drag-and-drop) to the repo's image directory; click a thumbnail in the image directory to insert it into Markdown

### Content Flow

- 📥 **Import**: Local `.md` / `.markdown` / `.txt` files, with a confirmation before overwriting
- 📤 **Export**: Markdown (`.md`) or a web page (`.html`, with a built-in style template ready to share and read)
- 💾 **Automatic draft saving**: Content/path are written to localStorage with an 800ms debounce; the draft is restored automatically on refresh

### Security Design

- 🔐 **Session-scoped token storage**: The token is entered in the UI and stored only in sessionStorage, expiring when the tab closes
- 🛡 **Save path whitelist**: Only `.md` files under `docs/posts/` can be written, preventing overwrites of other repository files
- ✅ **Fine-grained token + least privilege**: Only Contents: Read and write is required

## Quick Start

1. Create a Fine-grained personal access token (only Contents: Read and write permission is needed) — see the [editor tutorial](/en/guide/editor#create-token) for the steps;
2. Open the [online editor](/pages/editor), fill in the token, username, and repository name in the connection bar (the branch can be left empty — main is used automatically), and click "Connect to GitHub". When the status badge turns green (a glowing green dot), you're connected;
3. Write your post (or load an existing one from the file tree on the left), then click "Save to GitHub" to publish!

No password injection, no source code changes — since v3.0.0 the token is entered directly in the UI.

## Tech Stack

- 🛠 Built on [VitePress](https://vitepress.dev/) ^1.6.4
- ⚡️ Developed with [Vue 3](https://vuejs.org/) ^3.5.45
- 📝 Integrated with [md-editor-v3](https://imzbf.github.io/md-editor-v3) ^7.1.0
- 🔔 Uses vue3-toastify ^0.2.9 to show operation result notifications

## Deployment Options

### GitHub Pages

Great for personal blogs and open source project docs:

- Set the Pages source to GitHub Actions in your repository settings, paired with a workflow for automatic deployment
- Zero-cost hosting with custom domain support
- For subpath deployments, set the `base` option correctly in `docs/.vitepress/config.js`

### Vercel / Netlify

Great for team collaboration and quick launches:

- Import your GitHub repository and pick the VitePress framework preset to deploy
- Automatically watches for repository changes and rebuilds on every push
- Global CDN acceleration

> 📝 Note: With subpath deployments (e.g., GitHub Pages), images in the editor's live preview may fail to load; the built site displays them fine. See [Image URLs and the base prefix](/en/guide/editor#image-base).

## What's Next

- [Editor tutorial](/en/guide/editor)
- [Integrating into an existing VitePress project](/en/guide/integrate)
- [Start using the online editor](/pages/editor)
- [Visit the GitHub repository](https://github.com/cubeyu/ViteEditor)

## Contributing

We welcome contributions of any kind:

- 🐛 Report bugs
- 💡 Suggest new features
- 📝 Improve documentation
- 🔧 Submit code fixes

## Support & Help

If you run into any problems while using the editor:

1. Check the [FAQ](/en/guide/editor#faq)
2. Ask on [GitHub Issues](https://github.com/cubeyu/ViteEditor/issues)
