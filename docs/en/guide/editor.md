---
title: Editor Tutorial
description: From creating a GitHub token to publishing and managing posts — the complete VitePress Editor guide
---

# Editor Tutorial

This tutorial is for first-time VitePress Editor users: starting from creating a GitHub token, it walks through the full workflow of "connect a repository → write a post → browse and load existing posts → save and publish → upload images → import and export". Everything happens in the browser; no local development environment is required.

## Overview

The core of the editor is `docs/.vitepress/theme/components/editor.vue` (referred to as `editor.vue` below), a **self-contained** Vue component:

- No external interface: no props, no emits, no slots, no defineExpose — all configuration is either entered in the UI or changed in the source code;
- Pure frontend with a direct GitHub connection: the browser calls the GitHub REST API directly to read and write the repository, with no server in between — the site itself never stores any of your data;
- Tech stack: [md-editor-v3](https://imzbf.github.io/md-editor-v3) ^7.1.0 (editing and preview) + vue3-toastify ^0.2.9 (operation notifications).

::: tip Try It Online
Just open the [online editor](/pages/editor) page to try it out. Connect to your own repository with your own token — all configuration is stored only in your browser.
:::

## UI Overview {#layout}

The editor page uses an **immersive fullscreen layout**: VitePress navigation and footer are hidden, and the editor fills the entire viewport (see [Fullscreen layout](#fullscreen)). From top to bottom it is divided into three areas:

```text
┌──────────────────────────────────────────────────────────────┐
│ Top bar  Brand (logo + VitePress Editor + Guide)  │ File TOC Import Export Preview New │
├──────────────────────────────────────────────────────────────┤
│ Conn bar Status badge │ Token │ Username │ Repo │ Branch │ File path │ Connect │ Save │
├───────────┬─────────────────────────────────────┬────────────┤
│ File tree │                                     │  TOC panel │
│ (260px)   │            md-editor-v3             │  (230px)   │
│ Posts+Img │        Edit + live preview          │ (collapsed)│
└───────────┴─────────────────────────────────────┴────────────┘
```

| Area | Controls | Description |
| --- | --- | --- |
| Top bar · Brand | Gradient logo + "VitePress Editor" + "Guide" link | "Guide" links back to the docs site (`withBase('/guide/')`) |
| Top bar · Tools | File | Toggle for the left file tree panel (open by default) |
| Top bar · Tools | TOC | Toggle for the right TOC panel (collapsed by default) |
| Top bar · Tools | Import | Import local `.md` / `.markdown` / `.txt` files |
| Top bar · Tools | Export | Dropdown menu: export Markdown (.md) / export web page (.html) |
| Top bar · Tools | Preview | Toggle the blog-style live preview panel, see [Published Preview](#preview) |
| Top bar · Tools | New | Reset to the default template and clear the local draft (with a confirmation dialog) |
| Top bar · Tools | Theme / Language | Switch the light/dark theme and the zh/en interface |
| Connection bar | Status badge | Not connected (gray dot) / Connected (glowing green dot) / Connection failed (red dot) |
| Connection bar | Token / Username / Repository | GitHub connection info |
| Connection bar | Branch | The branch to operate on; leave it empty and requests automatically use `main`; non-`main` branches must be entered manually |
| Connection bar | File path (optional) | Custom save path; only `.md` files under `docs/posts/` are allowed |
| Connection bar | Connect to GitHub | Verifies the token (soft brand-colored button); on success the repository file tree loads automatically |
| Connection bar | Save to GitHub | Commits the current post to the repository (gradient primary button) |
| Main area | File tree panel (left, 260px) | Repository post directory tree + path search + image directory |
| Main area | md-editor-v3 editor (center) | Markdown editing + live preview; light/dark theme follows the site |
| Main area | TOC panel (right, 230px) | Post heading TOC, see [TOC navigation](#catalog) |

On small screens (≤900px), the left and right panels become overlays and the "File path" input is hidden.

## Preparation

### Create a Fine-grained Token {#create-token}

The editor reads and writes your repository through the GitHub REST API, which requires a personal access token with write permission:

1. Sign in to GitHub and go to **Settings → Developer settings → Personal access tokens → Fine-grained tokens**;
2. Click **Generate new token**, give the token a name, and set a short expiration (e.g., 30 or 90 days);
3. Under **Repository access**, choose **Only select repositories** and select only your blog repository;
4. Under **Permissions → Repository permissions → Contents**, choose **Read and write** — this is the only permission the component needs (reading/writing posts, deleting files, and uploading images all go through the Contents API);
5. Copy the token immediately after generating it (it starts with `github_pat_`); it cannot be viewed again once the page is closed.

<!-- Screenshot placeholder: the Fine-grained token's Repository permissions → Contents permission settings -->

::: warning Least Privilege
- Grant only **Contents: Read and write**; do not check Administration, Workflows, or other permissions;
- Do not use a classic token with broad scopes like `repo`;
- Set a short expiration and rotate regularly — the smaller the impact window of a leaked token, the better.
:::

### Confirm Repository and Branch {#repo-branch}

- **Username**: the GitHub username of the repository owner;
- **Repository name**: the target repository name (without the username prefix);
- **Branch**: the branch to operate on; leave it empty by default (`main` is used automatically in requests). If your default branch is named something else like `master`, enter it as-is.

### Enter the Token in the Connection Bar {#provide-token}

Since v3.0.0 the token is entered directly in the UI: the **GitHub Token** input in the connection bar (password type, masked while typing) → fill in the username and repository name → click **Connect to GitHub**.

- After the token is verified, it is written to `sessionStorage` (key `github_token`); refreshing the page within the same tab reconnects automatically, no need to re-enter it;
- sessionStorage is not shared across tabs, so **a newly opened tab requires re-entering the token** — a deliberate trade-off of convenience for security, see [Security notes](#security);
- Only enter your token on sites you deploy yourself or trust; verify the domain in the address bar first, and never paste it into pages of unknown origin.

## First-Time Walkthrough

### Step 1: Fill In the GitHub Configuration

Fill in the token, username, and repository name in the connection bar (the branch can be left empty — `main` is used automatically in requests). Clicking "Connect to GitHub" without a token shows "Please enter your GitHub token first"; a missing username or repository name shows "Please enter your GitHub username and repository name first". Username/repository/branch are non-sensitive settings, written to `localStorage` after a successful connection and auto-filled the next time you open the page.

### Step 2: Connect to GitHub

Click **Connect to GitHub** (it shows "Connecting..." and is disabled while connecting). The component sends the token to `GET https://api.github.com/user` to verify your identity (`verifyGithubToken` in `editor.vue`). The status badge on the left changes:

| Status | Style | Meaning |
| --- | --- | --- |
| Not connected | Gray dot | Not yet verified or connected |
| Connected | Glowing green dot with a green border | Token valid, configuration remembered |
| Connection failed | Red dot and border | An error toast is shown; details are in the browser console |

When the connection succeeds:

- The token is written to `sessionStorage`; refreshing the same tab reconnects automatically;
- Username / repository / branch are written to `localStorage` and auto-filled next time;
- **The repository file tree loads automatically**, and you can browse posts in the left panel (see [Browsing and loading repository files](#file-tree));
- When connected, a **"Disconnect" button** appears; clicking it clears the token (sessionStorage) and resets the state to not connected.

::: tip
The component only runs a format check on the token (a warning appears if it is shorter than 20 characters) and does not block verification — the verification result is what counts.
:::

### Step 3: Write the Post

**Meet the writing format (front matter).** When the page opens, the editor comes pre-loaded with a template containing front matter (`defaultTemplate` in `editor.vue`). All post metadata lives in the `---` block at the top of the content:

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

| Field | Purpose | Notes |
| --- | --- | --- |
| `post` | Marks the file as a blog post | Used by blog themes; keep it `true` |
| `title` | **The post title** | Required. Drives the file name slug, the commit message, the blog page display, and the preview header — replace the 「文章标题」 placeholder with your title |
| `date` | Publish date | Auto-filled with the current date on page load; editable |
| `cover` | Cover image URL | Use an address starting with `http(s)://` or `/`; the blog page and the published preview show the cover |
| `coveross` | Backup cover URL | Use according to your blog theme's conventions |
| `categories` | Categories (YAML list) | One `- name` per line |
| `tags` | Tags (YAML list) | One `- name` per line |
| `description` | Excerpt | Shown in post lists and the preview header |

> 📝 There is no separate title input — **edit the `title:` field in the front matter directly**; the file name, commit message, and preview header all follow. Saving with the default 「文章标题」 placeholder is blocked with a reminder.

The template can be customized by editing the source code, see [Customizing the post template](#custom-template).

**Learn the default path rules.** When "File path" is left empty, posts are saved according to the following rules (`generateFileName` in `editor.vue`):

- Directory: `docs/posts/{year}/{month}/`;
- File name: `{YYYY-MM-DD}-{slug}.md`;
- The slug is generated from the front matter `title`: lowercased, spaces replaced with `-`, illegal characters stripped, **Chinese characters are preserved** (as are letters, digits, underscores, and hyphens);
- If the title is empty or empty after stripping, it falls back to `untitled-{millisecond timestamp}`.

For example, with the Chinese title 「我的第一篇文章」 ("my first post") and today's date 2026-11-06, the post is saved to:

```
docs/posts/2026/11/2026-11-06-我的第一篇文章.md
```

**(Optional) Custom path.** The "File path" input in the connection bar lets you specify a save location, protected by whitelist validation (see [Path whitelist rules](#path-whitelist)); an invalid path blocks the save with the message "Invalid file path: only .md files under docs/posts/ are allowed".

**Don't worry about losing content while writing** — content and path are auto-saved as a local draft (see [Local drafts](#draft)) and restored automatically when you refresh the page.

### Step 4: Save to GitHub

Click **Save to GitHub** (the button shows "Saving..." and is disabled while saving). On success, a "Post saved to GitHub!" toast pops up, the file tree on the left refreshes automatically, and the actual saved path is filled into the "File path" input (to avoid duplicate posts on the next save). A new commit is added to the repository with the message format:

```
Add post: Your Post Title       # new file
Update post: Your Post Title    # file already exists, updated automatically
```

**Where does the post end up?** With the default path, new posts live under `docs/posts/2026/11/` in the repository:

- If the target directory doesn't exist, no preparation is needed — the GitHub Contents API's PUT request automatically creates nested directories (the manual directory creation and `.gitkeep` placeholder logic was removed in v3.1.2);
- If the target file already exists, the update flow runs automatically (carrying the original file's SHA) — no need to delete the old file manually;
- For posts loaded from the file tree, the path is auto-filled into the "File path" input, so saving updates the original file (see [Browsing and loading repository files](#file-tree)).

::: tip When will the new post appear on the site
A VitePress site is built from the repository content. After a post is pushed, the site must be rebuilt and redeployed (e.g., wait for the GitHub Actions workflow to finish) before the new content appears online and shows up in the [blog post list](#blog) automatically.
:::

## Browsing and Loading Repository Files {#file-tree}

After connecting to GitHub successfully, the left file tree panel loads the repository files automatically; you can also click the refresh button at the top of the panel to update manually.

### How Loading Works

The component calls the Git Trees API to **fetch the entire repository file tree in one request** (`loadRepoTree` in `editor.vue`):

```
GET /repos/{username}/{repo}/git/trees/{branch}?recursive=1
```

From the response, two categories of files are filtered out:

| Category | Match rule | Purpose |
| --- | --- | --- |
| Posts | All `.md` files under `docs/posts/` | Directory tree display, click to load |
| Images | `.png / .jpg / .jpeg / .gif / .webp / .svg / .ico / .avif` under `docs/public/images/` | Thumbnails in the image directory |

### Directory Tree Interactions

- **Collapsible directories**: Click a directory name to expand/collapse its subtree, with a rotating ▸ arrow animation;
- **Path search**: Type a keyword in the search box at the top of the panel (case-insensitive matching against paths) to switch to a flat list of matches; clearing the keyword restores the directory tree;
- **Current file highlight**: The file being edited is highlighted in the brand color;
- **Small screen adaptation**: When the viewport is narrower than 900px, the file panel auto-collapses after a file is loaded.

### Click to Load a Post

When you click a post file (`openRepoFile` in `editor.vue`):

1. The file content is read via the Contents API (`?ref={branch}`), Base64-decoded into UTF-8 text, and loaded into the editor;
2. **The title comes directly from the front matter `title:` of the loaded content**, shown in the published preview header — there is no separate title input to fill;
3. **The "File path" input is auto-filled with the file's repository path** — from then on, clicking Save updates the original file directly;
4. A "Loaded {file name}" toast is shown.

::: warning Saving Overwrites the Original File
Posts loaded from the file tree are saved by **directly updating the original file in the repository** (no new date-archived file is generated). To save as a new file, clear the "File path" input before saving.
:::

## Deleting Files {#delete-file}

Hover over a post in the file tree (or in the search results) and a **✕ delete button** appears:

1. Click ✕ → a confirmation dialog with red warning styling appears, clearly stating "This operation commits directly to the GitHub branch and cannot be automatically restored";
2. After confirmation, the component calls the Contents API **DELETE** method (with the file SHA and the target branch) to commit the deletion directly (`deleteRepoFile` in `editor.vue`), with the commit message `Delete file: {file path}`;
3. After a successful deletion the file tree refreshes automatically; if the deleted file is the one currently open, its highlight is cleared.

::: danger Deletion Cannot Be Undone in the UI
The deletion commits directly to the current branch; the editor provides no undo. To recover a mistakenly deleted file, restore it on the GitHub side — see the FAQ "[Can file deletion be undone?](#faq-restore-delete)".
:::

## Image Directory and Insertion {#image-gallery}

Below the file tree panel is a separate **image directory** section showing all images under the repository's `docs/public/images/` (a two-column thumbnail grid + file names, with the total image count shown in the heading).

- **Click an image** → inserts Markdown at the cursor in the editing area via md-editor-v3's `insert()` (`insertRepoImage` in `editor.vue`):

```markdown
![image filename](/images/image-filename)
```

- The inserted address is a site-root path with the `docs/public/` prefix stripped; VitePress automatically adds the base prefix at build time;
- Images uploaded through the editor appear here (the file tree refreshes automatically after a successful upload).

::: warning Private Repository Thumbnail Limitation
Thumbnails load directly from `raw.githubusercontent.com`, and that request cannot carry a token. **Thumbnails from private repositories will not display (broken images)**, but insertion still works — the inserted address and the built site display perfectly fine. Public repositories have no such limitation; see the FAQ "[Why don't image thumbnails show for private repositories?](#faq-private-thumb)".
:::

## Image Upload {#upload-image}

Image upload is implemented via md-editor-v3's `@onUploadImg` callback (`customUpload` in `editor.vue`).

### How to Upload

- **Toolbar**: Click the image button in the editor toolbar and choose local images;
- **Paste**: `Ctrl+V` to paste screenshots or copied images directly;
- **Drag-and-drop**: Drag image files into the editing area.

All three methods trigger the upload and support **multiple images at once** (multi-select, or paste/drag several at a time).

### Prerequisites and Results

- Prerequisite: connected to GitHub; otherwise you'll see "Please log in to GitHub first";
- Images are uploaded one by one to the repository's `docs/public/images/` directory, named `{millisecond timestamp}_{sanitized original file name}`;
- After a successful upload, the Markdown address is inserted into the editing area automatically:

```markdown
![alt](/images/1730000000000_screenshot.png)
```

- With multiple images, each uploads individually: one failure doesn't affect the rest — as many images succeed as get inserted, with a toast summary when finished; the image directory also refreshes automatically.

### File Name Sanitization

Original file names first pass through `sanitizeFileName` (`editor.vue`): consecutive dots are collapsed into a single `.`, characters other than letters, digits, underscores, dots, and hyphens are replaced with `_`, and a leading dot is replaced with `_` — preventing special characters from breaking requests or constructing path traversal.

### About Image URLs and the Base Prefix {#image-base}

::: warning Editor Preview May Not Show Images on Subpath Deployments
The inserted address is `/images/{timestamp}_{filename}`, **without the base prefix**. VitePress automatically adds the site base to image paths starting with `/` in Markdown at build time, so **images display correctly on the built site**.

However, the editor's live preview does not go through the build process. If the site is deployed under a subpath (e.g., `https://<user>.github.io/<repo>/`), image previews inside the editor may fail to load — this is expected behavior, not an upload failure. Always judge by the built site.
:::

## Local Drafts {#draft}

The editor has built-in **automatic local draft saving**; writing never depends on any server:

- **When saved**: Whenever the content or file path changes, it is written to `localStorage` with an **800ms debounce** (the draft watcher in `editor.vue`), stored under the key `vpe_draft_v1` as `{ filePath, content, at }` (no title);
- **Automatic restore**: When reopening the page, if the draft content is non-empty and differs from the default template, the content and file path are restored automatically with a "Restored your last local draft" toast (`onMounted` in `editor.vue`);
- **When cleared**: Clicking "New" clears the current content, restores the default template, and **deletes the draft**; importing a local file asks for confirmation before overwriting and notes that the current content still has a draft;
- **Storage location**: The draft exists only in the browser's local `localStorage`, isolated per "browser + site domain", and is never uploaded to any server.

## Published Preview {#preview}

Click "Preview" in the top bar and a **blog-style preview panel** mounts to the right of the editor, simulating how the post will look once published:

- **Live rendering**: the panel sits side by side with the editor; every keystroke is reflected in the preview immediately, no manual refresh needed (the `previewMarkdown` computed in `editor.vue`);
- **Blog header**: the front matter is parsed automatically to render the title, publish date, category and tag badges, and the description; if `cover` contains a valid image URL (starting with `http(s)://` or `/`), a cover image is shown as well;
- **Mutually exclusive with the built-in preview**: enabling the published preview collapses the editor's built-in preview column (via `togglePreview`) to make room; it is restored when you switch back;
- **Closing**: click the "Preview" button again to return to plain editing — all editing state is preserved.

> 📝 Note: the panel renders with md-editor-v3's `MdPreview` component (the same pipeline as the editor preview, with built-in XSS sanitization). Front matter parsing has a **2KB limit**; when the closing `---` is missing, the body is not swallowed — the preview matches the actual rendering. On subpath deployments images may not show inside the editor preview — see the [Image Upload](#image-base) section; always judge by the built site.

## Blog Post List Page {#blog}

The site ships with a built-in **blog post list page**: `/posts/` (and `/en/posts/` on the English side) automatically archives and displays every post under `docs/posts/`:

- **Archived at build time**: the list is generated by VitePress's `createContentLoader` at build time — no manual list maintenance required;
- **Card-style list**: each post is shown as a card; the cover comes from the front matter `cover`, with a gradient placeholder when it is absent;
- **Sorted by date, newest first**: posts are ordered by the front matter `date`, newest first;
- **One shared data source**: the English list at `/en/posts/` shows the same posts as the Chinese list (the posts themselves have no en versions);
- **Published means listed**: once a post is saved to GitHub and the site rebuilds, it appears in the list automatically — no extra steps needed.

## Import and Export {#import-export}

### Import a Local File

Click "Import" in the top bar and choose a local file; the `.md` / `.markdown` / `.txt` extensions are supported (`handleImportFile` in `editor.vue`):

- If the current content is not the default template (i.e., you have work in progress), a confirmation dialog appears first: "Importing will overwrite the content you are currently editing (the current content still has a local draft)";
- After importing: the body is replaced with the file content and "File path" is cleared — saving will then use the default date-archived path; the title follows the file's own front matter.

### Export Files

Click "Export" in the top bar to open a dropdown with two options:

| Option | Content | Description |
| --- | --- | --- |
| Export Markdown (.md) | The raw editor content | A standard Markdown file, importable into other editors |
| Export Web Page (.html) | The HTML rendered live by the editor | A standalone page that opens directly in a browser |

The exported file name comes from the post title (illegal characters replaced with `_`, spaces replaced with `-`, falling back to `post` when the title is empty).

**How web page export works**: The editor continuously captures the live-rendered HTML via `@onHtmlChanged`. On export, a built-in minimalist style template is applied (`exportHtmlFile` in `editor.vue`) — the body is centered with a max width of 800px and includes base styles for code blocks, blockquotes, tables, and images, producing a standalone HTML file ready to share and read.

## TOC Navigation {#catalog}

Click the "TOC" button in the top bar and a 230px **post TOC panel** expands on the right:

- Based on md-editor-v3's `MdCatalog` component, with `editorId` fixed to `vpe-editor` and the scroll container pointing to the editor's preview area `#vpe-editor-preview-wrapper`;
- Shows the full heading hierarchy of the current post; clicking an entry scrolls the preview area to the corresponding position;
- The light/dark theme follows the site.

## Fullscreen Layout {#fullscreen}

The editor page (`/pages/editor`) uses an immersive fullscreen layout, completely different from regular doc pages:

- `Layout.vue` watches the route and dynamically adds the `vpe-fullscreen` class to `body` when the page is `pages/editor.md`;
- In `custom.css`, `body.vpe-fullscreen` rules hide the VitePress navigation (`.VPNav`), footer (`.VPFooter`), and backdrop, and remove all padding and max-width constraints from the content area;
- The component's root container is `100dvh` tall, so the editor fills the entire viewport;
- The brand area on the left of the top bar (gradient logo + "VitePress Editor") provides a "Guide" link to return to the docs site at any time.

To replicate this layout in your own VitePress site, see [Integrating into an existing project](/en/guide/integrate).

## Bilingual Interface {#i18n}

The site offers a bilingual (zh/en) interface:

- **Manual switching**: click the language button on the right of the nav bar (inside the "..." menu on mobile) to toggle between Chinese and English; the choice persists;
- **First-visit auto matching**: on first visit, the browser language triggers an automatic redirect to the matching language version (only for the home page and the `/guide/` tutorial pages); once you have chosen a language manually, no more automatic redirects;
- **Shared bilingual editor page**: the editor page `/pages/editor` has no en version — Chinese and English users share the same page, and its UI language follows the manual choice (or the browser language on first visit).

## How It Works

This section briefly explains how the editor operates at the source code level, to aid understanding and troubleshooting.

### Token Verification

After clicking "Connect to GitHub" (or when the page loads and finds a token in sessionStorage and reconnects automatically), the component sends one authentication request to GitHub:

```
GET https://api.github.com/user
Authorization: token <your-token>
```

- `2xx`: authentication succeeded, written to storage (see [Storage keys reference](#storage-keys));
- `401`: "GitHub token is invalid or has expired, please check the token";
- `403`: "GitHub API access is restricted, possibly due to rate limiting";
- Other status codes: "GitHub authentication failed: {status code}".

### How Saving a Post Works

`handleSave` (`editor.vue`) executes in order:

1. **Get the file SHA**: Requests the target file; only 404 is treated as a new file, and any other error is thrown to abort the save; if the file exists, its SHA is taken — the Contents API requires the original file's SHA to update a file, acting like an optimistic lock;
2. **PUT commit**: The post content is encoded UTF-8 → Base64 (`utf8ToBase64` in `editor.vue`) and PUT to the Contents API together with the commit message and the target branch; GitHub automatically creates any missing levels of the target directory.

Image upload works the same way, with the path fixed to `docs/public/images/`. Usernames, repository names, and paths in all requests are encoded segment by segment with `encodeURIComponent` (`repoContentsUrl` in `editor.vue`), preventing special characters like `../`, `?`, and `#` from breaking requests or manipulating the write location; all requests to the GitHub API go through the `ghFetch` wrapper (a 15-second timeout), so a hung network never leaves the UI stuck in a loading state forever.

### File Tree and Deletion

- File tree: The Git Trees API `?recursive=1` fetches the whole tree in one request; the frontend filters posts and images (`loadRepoTree`), then `buildTree` / `treeToArray` build the collapsible nested directory;
- Reading a file: Contents API `GET ?ref={branch}`, Base64 → UTF-8 decoding (`base64ToUtf8`);
- Deleting a file: Contents API `DELETE` with the file SHA (`deleteRepoFile`).

### Storage Keys Reference {#storage-keys}

| Key | Storage | Content | Written | Expires |
| --- | --- | --- | --- | --- |
| `github_token` | sessionStorage | GitHub token | After successful verification | Cleared when the tab closes |
| `github_username` | localStorage | Username | After successful verification | Kept long-term; clear manually |
| `github_repo` | localStorage | Repository name | After successful verification | Kept long-term; clear manually |
| `github_branch` | localStorage | Branch name | After successful verification | Kept long-term; clear manually |
| `vpe_draft_v1` | localStorage | Local draft (path/content/timestamp) | 800ms after content changes | Cleared by "New" or manually |

::: tip
If you refresh the page without closing the tab, sessionStorage persists and the component auto-fills all settings and re-verifies the token. Note that sessionStorage is not shared across tabs — a newly opened tab requires re-entering the token.
:::

## Customization

The component is self-contained (no props or other external configuration entry points), so all of the following customizations require editing the source code.

### Customizing the Post Template {#custom-template}

Edit `defaultTemplate` in `docs/.vitepress/theme/components/editor.vue` to change the pre-loaded content shown when the page opens: front matter fields, initial body, and so on. The constants at the top of the component (the editor instance `editorId`, the draft key `DRAFT_KEY`, etc.) are also concentrated at the top of the file.

### Adjusting Editor Styles

Styles live in two places:

- The `<style scoped>` at the end of `editor.vue`: all component styles — the three-area layout, left/right panels, connection bar, confirmation dialog, transition animations, etc.;
- `docs/.vitepress/theme/custom.css`: brand color variables (`--vp-c-brand-*`), fullscreen layout rules (`body.vpe-fullscreen`), and site-level appearance.

The editor's internal background colors (including md-editor-v3's) are mapped to VitePress variables via `--md-bk-color: var(--vp-c-bg)` and adapt to light/dark mode automatically. The site's brand colors are adjusted through the `--vp-c-brand` variables at the top of `custom.css`.

### Path Whitelist Rules {#path-whitelist}

Custom save paths are validated by `isFilePathValid` (`editor.vue`):

```js
/^docs\/posts\/[\w\u4e00-\u9fa5\-/]+\.md$/.test(p)
```

| Rule | Description |
| --- | --- |
| Must be under `docs/posts/` | Prevents custom paths from overwriting other repository files (e.g., `.github/workflows/*.yml`) |
| Character whitelist | Only letters, digits, underscores, Chinese characters, hyphens, and slashes are allowed |
| No dots in the path | No `.` may appear except the trailing `.md` extension, which naturally rules out `../` and multiple extensions |
| Must end with `.md` | Only Markdown files can be written |

| Example | Result |
| --- | --- |
| `docs/posts/2026/11/note.md` | Pass |
| `docs/posts/我的笔记.md` | Pass |
| `docs/index.md` | Rejected: not under `docs/posts/` |
| `docs/posts/../config.js` | Rejected: contains a dot and illegal characters |
| `docs/posts/a/b.md.txt` | Rejected: does not end with `.md` |

## Security Notes {#security}

This project has been through a round of security auditing and refactoring (v2.1.0), and v3.0.0 carries forward all of the security design. The following decisions are worth understanding for every user.

### Why the Token Is Only Stored in sessionStorage

The token is a sensitive credential with write access to your repository, and the component deliberately keeps it in `sessionStorage` rather than `localStorage`:

- sessionStorage's lifetime matches the tab's — it is cleared when the tab closes, compressing the leak window to a single session;
- localStorage persists indefinitely; if any same-origin page ever has an XSS vulnerability, malicious scripts could steal repository write access long-term.

The cost is re-entering the token every time you open a new tab — a deliberate trade-off of convenience for security (see the source comments in `editor.vue`).

### Why the Token Must Not Be Hardcoded into Source Code

This site is a purely static site: any string in the source code ends up in the public build artifacts (JS bundles), visible to any visitor who opens DevTools. Older versions once instructed users to put the token into source code; v2.1.0 removed that code and documentation entirely. **Never commit a real token to a repository or write it into frontend code.**

### The Principle of Least Privilege

- Use a Fine-grained token that only grants access to the target repository;
- Grant only **Contents: Read and write** (everything needed for saving posts, deleting files, and uploading images);
- Set a short expiration and rotate regularly;
- Do not use classic tokens with broad scopes.

### Vague Error Messages

The UI only shows vague error messages (e.g., "GitHub API returned 422", "Failed to read file (HTTP 403)") and does not pass through GitHub's raw error details; detailed information is logged via `console.error` to the browser console, to avoid leaking repository internals to page visitors.

### The Auth Boundary of a Static Site

::: warning The Editor Page Itself Has No Access Control
The component has no server and cannot do login authentication — anyone who can open the editor page can try to connect their own repository. The real permission boundary is the GitHub token: without your token, no one can write to your repository. This component is therefore positioned as a **personal writing tool**, not a multi-user contribution platform; do not use it on public devices.
:::

### About the Removed Password Protection

An older version (v2.0.0) shipped a purely frontend access password (default `123456`). v2.1.0 **removed that layer entirely**, because:

- The validation logic ran in the browser and could be bypassed by anyone with DevTools;
- It constituted no real security boundary and only created a false sense of security;
- After removal, security responsibility clearly rests on the token's storage method and permission scope.

## Advanced Extensions (Not Currently Enabled)

The following capabilities come from the editor's underlying library [md-editor-v3](https://imzbf.github.io/md-editor-v3) (currently ^7.1.0). **The current component does not enable these capabilities**; they are listed only as reference for further development.

### Extensible Capabilities of md-editor-v3

- **Custom toolbars via `toolbars`**: Trim and reorder toolbar buttons through the `toolbars` prop; the current component does not pass this prop and uses the default toolbar;
- **MdPreview, a read-only preview component**: Useful for scenarios that only need to display Markdown without editing;
- **More extension points**: The callbacks currently wired up are `@onUploadImg` (image upload) and `@onHtmlChanged` (HTML export); TOC navigation is based on the built-in `MdCatalog` component.

### Componentization Ideas

If you want to reuse the component in your own site with flexible configuration, consider:

- Using `defineProps` to expose default username / repository / branch, post template, upload directory, and other settings;
- Using `defineEmits` to emit save success / failure events, wired into site-level notifications;
- Extracting the GitHub interactions into a composable, decoupled from the UI.

For the complete steps to embed the component as-is into an existing VitePress site, see [Integrating into an existing project](/en/guide/integrate). Discussion of improvement ideas is welcome on [GitHub Issues](https://github.com/cubeyu/ViteEditor/issues).

## FAQ {#faq}

::: tip General Troubleshooting Principle
The UI only shows vague error messages (e.g., "GitHub API returned 422"); detailed information is logged via `console.error` to the browser console. Press `F12` to open DevTools first when troubleshooting.
:::

### Token invalid or expired on connect (401)

- The token has expired or been revoked — generate a new one and enter it in the connection bar;
- Spaces or newlines got mixed in when copying;
- The new tab has not had a token entered yet (sessionStorage is empty), see [Enter the Token in the Connection Bar](#provide-token).

### "GitHub API access restricted" (403)

Usually rate limiting: the GitHub API allows 60 unauthenticated requests per hour (per IP) and 5,000 authenticated requests per hour. Wait for the limit to reset, or switch tokens and retry.

### Save fails with "GitHub API returned 422"

422 means the request content could not be processed. Common causes:

- The file actually exists, but the SHA fetch step failed due to rate limiting or the like, so it was submitted as a new file;
- The custom path or request parameters are not accepted by GitHub.

For specifics, check the console for the GitHub response details after "保存文章失败:" (save post failed).

### Why don't image thumbnails show for private repositories? {#faq-private-thumb}

Thumbnails in the image directory load from `raw.githubusercontent.com`; `<img>` requests made by the browser cannot carry an Authorization header, and private repository raw URLs require authentication, so **thumbnails from private repositories show as broken images**. This does not affect any functionality: clicking an image still inserts the correct `/images/...` address, and the site displays normally after push and build. Public repositories have no such limitation.

### Can file deletion be undone? {#faq-restore-delete}

**Not from the editor UI** — the deletion is a commit made directly to the current branch (commit message `Delete file: {file path}`). To recover a mistakenly deleted file:

1. Open the repository on GitHub → **Commits**, and find the `Delete file:` commit;
2. Revert it with `git revert`, or open the file content from the commit before the deletion and save it again.

### Where are drafts stored? {#faq-draft-where}

In the browser's local `localStorage`, under the key `vpe_draft_v1`, isolated per "browser + site domain", never uploaded to any server. Ways to clear it: click the "New" button, clear the site data in your browser, or run `localStorage.removeItem('vpe_draft_v1')` in the console.

### Images don't show in the editor preview (fine after build)

See [About image URLs and the base prefix](#image-base): on subpath deployments, the editor's live preview may 404 while the built site displays fine.

### When does the token expire?

Two layers:

- **Local storage**: The token lives in sessionStorage and is cleared when the tab closes; refreshing without closing the tab does not clear it (auto-reconnect);
- **GitHub side**: Once past its expiration or revoked in GitHub settings, all requests return 401.

### Do Chinese titles produce Chinese file names?

Yes. The slug rules preserve Chinese characters (e.g., `docs/posts/2026/11/2026-11-06-我的第一篇文章.md`), and both GitHub and Git support Chinese file names. If you prefer purely English file names, specify them manually in the "File path" input.

### Will saving to a directory that doesn't exist fail?

No. The PUT request of the GitHub Contents API automatically creates every missing level of the target path (since v3.1.2 the component no longer creates directories manually or generates `.gitkeep` placeholders) — just set "File path" to wherever you want.

## Changelog

### v3.1.2 (comprehensive review fixes)

- The theme entry no longer registers the editor globally (page-level import instead), shrinking the theme chunk from 1012KB to 66KB;
- Removed `ensureDirectoryExists`: the GitHub Contents API's PUT creates nested directories automatically — no more `.gitkeep` placeholder commits;
- `getFileSHA` treats only 404 as a new file and throws on any other error, avoiding false "new file" judgments on existing files that led to 422;
- New `ghFetch` request wrapper (15-second timeout); a "Disconnect" button appears while connected; the actual saved path is filled into "File path" after a successful save;
- Accessibility and interaction: the confirmation dialog closes with Esc, file tree rows are keyboard-operable, the export menu closes on outside click/Esc, and icon buttons got aria-labels;
- Preview covers reject protocol-relative URLs and go through `withBase`; front matter parsing is uniformly capped at 2KB;
- Connection bar tweaks: the branch defaults to empty (falling back to `main` automatically), the file path moved after the branch, and the brand badge copy was renamed to "Guide".

### v3.1.1 (navigation/footer polish)

- Brand logo added before the nav bar title;
- The display breakpoint for the official theme-toggle / GitHub icons moved up from ≥1280px to ≥960px (no longer disappearing at intermediate widths);
- Language sync changed to "UI copy strictly follows the page's language tree" (except the shared bilingual editor page), fixing Chinese copy appearing on en pages;
- The footer was simplified to a single-line style (brand · links · author + donate).

### v3.0.0 (major upgrade, renamed to VitePress Editor)

- Immersive fullscreen layout: the editor page fills the entire viewport, hiding VitePress navigation and footer;
- GitHub token entered directly in the UI (connection bar), with a connection status badge (not connected / connected / connection failed);
- New repository file tree: loads all posts under `docs/posts/` via the Git Trees API, with collapsible directories, path search, and click-to-load editing (the file path is filled in automatically; the title comes from the front matter);
- New file deletion: after a confirmation dialog, deletions are committed directly via the Contents API and the file tree refreshes;
- New image directory: a thumbnail grid for `docs/public/images/`; click to insert into Markdown;
- New import (.md/.markdown/.txt, with confirmation before overwriting) and export (Markdown .md / web page .html);
- New local drafts: 800ms debounced auto-save to localStorage, restored automatically on refresh;
- New right-hand post TOC (MdCatalog).

### v2.1.0 (security refactor)

- Removed the purely frontend password protection layer and the guidance to hardcode tokens in source code;
- Token storage switched to session-level sessionStorage;
- Added whitelist validation for custom save paths;
- Image upload now supports batch uploads of multiple images;
- md-editor-v3 upgraded to 7.1.0; UTF-8 Base64 encoding now implemented with TextEncoder.

### v2.0.0

- Added password protection (removed in v2.1.0);
- Improved the image upload experience; added custom file paths.

### v1.0.0

- Basic editor features, GitHub integration, and Markdown preview.
