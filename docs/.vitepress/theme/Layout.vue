<template>
  <DefaultTheme.Layout>
    <template #nav-bar-title-before>
      <!-- 导航栏品牌 logo（主题文字标题之前） -->
      <svg class="vpe-nav-logo" viewBox="0 0 64 64" width="24" height="24" aria-hidden="true">
        <rect x="4" y="4" width="56" height="56" rx="14" fill="url(#vpeNavGrad)" />
        <path d="M18 44V20h5l9 13 9-13h5v24h-6V30.5L32 42l-8-11.5V44z" fill="#fff" />
        <defs>
          <linearGradient id="vpeNavGrad" x1="0" y1="0" x2="64" y2="64">
            <stop offset="0" stop-color="#42d392" />
            <stop offset="1" stop-color="#3eaf7c" />
          </linearGradient>
        </defs>
      </svg>
    </template>
    <template #nav-bar-content-after>
      <NavBarExtras />
    </template>
    <!-- 移动端汉堡全屏菜单（VPNavScreen）底部追加赞赏入口；其余功能用官方原生项 -->
    <template #nav-screen-content-after>
      <a class="vpe-screen-sponsor" href="https://donate.techisle.top/" target="_blank" rel="noopener" referrerpolicy="no-referrer">
        <svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M12 21s-7.5-4.6-10-9.3C.6 8.6 2.6 5 6 5c2 0 3.4 1 4.5 2.5L12 9l1.5-1.5C14.6 6 16 5 18 5c3.4 0 5.4 3.6 4 6.7C19.5 16.4 12 21 12 21Z"/></svg>
        {{ t('sponsor') }}
      </a>
    </template>
    <template #layout-bottom>
      <SiteFooter />
    </template>
  </DefaultTheme.Layout>
</template>

<script setup>
import { watchEffect, onMounted } from 'vue'
import DefaultTheme from 'vitepress/theme'
import { useRoute, useData } from 'vitepress'
import NavBarExtras from './components/NavBarExtras.vue'
import SiteFooter from './components/SiteFooter.vue'
import { LOCALE_KEY, locale, t } from './i18n'

// 编辑器页面进入沉浸式全屏布局（通过 body class 控制，配合 custom.css）
// 注意：relativePath 是相对 srcDir 的 markdown 路径（不含 base），跨部署环境更可靠
const route = useRoute()
watchEffect(() => {
  if (typeof document === 'undefined') return
  document.body.classList.toggle('vpe-fullscreen', route.data.relativePath === 'pages/editor.md')
})

const { lang } = useData()

// UI 文案语言始终跟随当前页面所在语言树（en 树 = 英文 UI，root 树 = 中文 UI）。
// 例外：/pages/editor 编辑器页为双语共用，语言由手动选择（localStorage）或浏览器语言决定。
watchEffect(() => {
  if (typeof document === 'undefined') return
  if (route.data.relativePath === 'pages/editor.md') return
  locale.value = (lang.value || '').toLowerCase().startsWith('en') ? 'en' : 'zh'
})

// 首次访问时按浏览器语言自动跳转（手动切换过则尊重用户选择）
// 仅对两种语言都有对应页面的路径生效：首页与 /guide/
onMounted(() => {
  try {
    if (localStorage.getItem(LOCALE_KEY)) return // 用户手动选择过
  } catch (e) {
    return
  }
  if (!navigator.language?.toLowerCase().startsWith('en')) return
  if (lang.value?.startsWith('en')) return // 已在英文区

  const base = import.meta.env.BASE_URL || '/'
  let rel = location.pathname.startsWith(base) ? location.pathname.slice(base.length) : location.pathname
  rel = rel.replace(/\.html$/, '').replace(/\/+$/, '')
  if (rel === '' || rel.startsWith('guide')) {
    const dest = rel === '' ? 'en' : 'en/' + rel
    location.assign(base + dest + '/')
  }
})
</script>
