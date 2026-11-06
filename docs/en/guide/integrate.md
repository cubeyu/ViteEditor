---
title: Integrating into an Existing Project
description: Embed ViteEditor into your existing VitePress site — integration complete in six steps
---

# Integrating into an Existing VitePress Project

This tutorial is for users who **already have a VitePress site** and want to embed ViteEditor into it. The editor itself is a self-contained Vue component, `editor.vue`, whose core runtime dependencies are just two packages: `md-editor-v3` and `vue3-toastify`. Its coupling points with VitePress (theme syncing, `withBase()`, CSS variables) are all natively provided by VitePress's default theme, so the integration cost is low.

To learn all the features before getting started, see the [editor tutorial](/en/guide/editor); you can also try it first in the [online editor](/pages/editor).

## Prerequisites

| Item | Requirement |
| --- | --- |
| VitePress | 1.x (using the default theme) |
| Node.js | 18+ |
| GitHub repository | Posts located in `docs/posts/` (the component's write whitelist is fixed to that directory; other locations require changing the source constant yourself) |
| GitHub token | Fine-grained PAT with Contents: Read and write permission |

The component was developed against the following versions: VitePress ^1.6.4, Vue ^3.5.45, md-editor-v3 ^7.1.0, vue3-toastify ^0.2.9.

## Step 1: Install Dependencies

```sh
npm install md-editor-v3 vue3-toastify
# or
pnpm add md-editor-v3 vue3-toastify
```

- `md-editor-v3`: provides the `MdEditor` / `MdCatalog` components and styles (the component already runs `import 'md-editor-v3/lib/style.css'` internally);
- `vue3-toastify`: operation result notifications (toasts for successful connection, successful save, draft restored, etc.; styles are imported along with the component).

## Step 2: Copy the Component File

Copy this project's [`docs/.vitepress/theme/components/editor.vue`](https://github.com/cubeyu/ViteEditor/blob/main/docs/.vitepress/theme/components/editor.vue) into your project at `docs/.vitepress/theme/components/editor.vue` (create the directory if it doesn't exist).

The component has only three coupling points with VitePress, all built into the default theme — nothing extra to install:

| Coupling point | Where in the component | Description |
| --- | --- | --- |
| `useData().isDark` | Top of `<script setup>` | The editor's light/dark theme follows the site; `useData` only works in components rendered by VitePress — placing it in the theme components directory satisfies this naturally |
| `withBase('/guide/')` | The "Guide" link in the top bar | The link automatically gets the site base prepended; if your docs aren't at `/guide/`, change it to your own address |
| CSS variables `--vp-c-*` | All styles | The component's colors all reference VitePress's brand/background/text variables, injected automatically by the default theme and switching with light/dark |

The component has no other external configuration: no props, no emits — constants such as the GitHub URL, the draft key, and the path whitelist all sit at the top of the file and can be modified as needed.

## Step 3: Register the Component

Choose either of two approaches.

**Option A: global registration** (`<Editor />` then works on any page). Modify `docs/.vitepress/theme/index.js`:

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

**Option B: per-page import** (usable only on that page, no change to theme/index.js needed):

```md
<script setup>
import Editor from '../.vitepress/theme/components/editor.vue'
</script>

<Editor />
```

md-editor-v3's internal components are imported by editor.vue itself; you don't need to register them.

## Step 4: Create the Editor Page

Create a new `docs/pages/editor.md` (or any path you prefer):

```md
---
page: true
title: Editor
description: Online Editor
aside: false
---
<script setup>
import Editor from '../.vitepress/theme/components/editor.vue'
</script>
<Editor />
```

front matter notes:

- `page: true`: uses VitePress's page layout, so the page content isn't constrained by the doc container;
- `aside: false`: turns off the right-hand outline bar, avoiding overlap with the editor's TOC panel.

::: tip Note the Page Path
The markdown relative path of the `page: true` layout (here `pages/editor.md`) is used in the body class check in Step 5; adjust it accordingly if your path differs.
:::

## Step 5: Immersive Fullscreen Layout (Recommended)

The editor works without this step (embedded in the normal doc layout), but doing it unlocks the full v3.0.0 experience: VitePress navigation and footer are hidden, and the editor fills the entire viewport (`100dvh`). Two small snippets are needed.

**Snippet one: dynamic body class.** Create `docs/.vitepress/theme/Layout.vue`:

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
  // Change this to your own editor page path (markdown path relative to srcDir)
  document.body.classList.toggle('vpe-fullscreen', route.data.relativePath === 'pages/editor.md')
})
</script>
```

Then mount Layout in `theme/index.js` (if you used Option A in Step 3, merge them into a single `export default`):

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

**Snippet two: fullscreen styles.** Append the following to `docs/.vitepress/theme/custom.css`:

```css
/* Editor page: immersive fullscreen layout (body class controlled by Layout.vue) */
body.vpe-fullscreen {
  overflow: hidden;
}

/* Hide navigation, footer, and backdrop */
body.vpe-fullscreen .VPNav,
body.vpe-fullscreen .VPFooter,
body.vpe-fullscreen .VPBackdrop {
  display: none !important;
}

/* Remove all padding and width constraints from the content area */
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

`route.data.relativePath` is the markdown path relative to `srcDir` (default `docs/`), without the base — reliable across deployment environments.

## Step 6: Brand Colors and Style Unification

All of the editor component's colors reference VitePress's `--vp-c-*` variables, so changing the brand color reskins everything. Define them in `custom.css` (matching this project):

```css
:root {
  --vp-c-brand-1: #3eaf7c;
  --vp-c-brand-2: #42d392;
  --vp-c-brand-3: #369f6b;
  --vp-c-brand-soft: rgba(62, 175, 124, 0.14);
}
```

- The editor's internal background colors (including md-editor-v3's) are mapped via `--md-bk-color: var(--vp-c-bg)` and adapt to light/dark mode automatically — no extra handling needed;
- Your site's existing `--vp-c-brand-*` settings take effect directly; this step is only needed if you want to unify on the green brand color.

That completes the integration. Visit the editor page, fill in the token, username, and repository name in the connection bar (the branch can be left empty — main is used automatically), and start writing.

## Security Notes

- **Token entered only in the UI**: Never write the token into any source or config file — in a purely static site, every source string ends up in the public build artifacts;
- **Session-level storage**: The token is stored only in `sessionStorage` and expires when the tab closes; non-sensitive settings like username/repository/branch go in `localStorage`;
- **Least privilege**: Use a Fine-grained PAT that only grants the target repository, with only **Contents: Read and write**, and set a short expiration with regular rotation;
- **Built-in protections**: Save path whitelist (only `docs/posts/*.md`), file name sanitization, per-segment `encodeURIComponent` on request paths, and vague error messages (details go to the console) are all built in;
- **No access control**: The editor page is publicly accessible — any visitor can try to connect their own repository. It is positioned as a personal writing tool; do not enter your token on public devices.

For more discussion of the reasoning and trade-offs, see the [security notes in the tutorial](/en/guide/editor#security).

## Integration FAQ

### Build/SSR errors with `window is not defined` or `document is not defined`

VitePress pre-renders pages on the server at build time. The browser APIs in editor.vue (`sessionStorage`, `localStorage`, `window.innerWidth`) are all called inside `onMounted` or event callbacks, so this error normally won't occur; if a build failure in your project is caused by other dependencies accessing browser APIs at the module top level, the standard fix is to wrap with `<ClientOnly>`:

```md
<ClientOnly>
  <Editor />
</ClientOnly>
```

### Style Conflicts

- editor.vue's styles are all `scoped` and won't pollute your site;
- md-editor-v3's styles are imported inside the component via `import 'md-editor-v3/lib/style.css'`, scoped within `.md-editor`;
- If your site's global CSS aggressively restyles elements like `pre`, `code`, `table`, and `blockquote`, it may affect the editor's preview area; isolate it at the theme level with more precise selectors or `:deep()`.

### md-editor-v3 Version Requirements

The component is developed against **md-editor-v3 ^7.1.0** and uses `onHtmlChanged` (HTML export), `onUploadImg` (image upload), the editor instance's `insert()` (image insertion), `MdCatalog`'s `scroll-element` (TOC scroll positioning), and similar APIs. Versions below 7.x are API-incompatible; keep the same major version when installing.

### How the GitHub Repository Name Relates to the Site Base

- The editor writes files through the GitHub API, operating on real paths in the repository (`docs/posts/...`, `docs/public/images/...`) — independent of the site `base`;
- `base` only affects site URLs and static asset prefixes. In GitHub Pages subpath deployments, image addresses like `/images/...` in Markdown get the base added automatically at build time, so the site displays fine (the editor's live preview may 404 — expected behavior);
- The only thing to watch is the top bar's "Guide" link, `withBase('/guide/')`: if your site has no `/guide/` pages, change it to your own docs address.

## What's Next

- [Editor tutorial](/en/guide/editor) — full feature overview and FAQ
- [Try it online](/pages/editor) — try it before you integrate
