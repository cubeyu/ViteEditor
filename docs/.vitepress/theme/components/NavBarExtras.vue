<script setup>
// 顶部导航栏扩展：
// 桌面端（≥960px）：赞赏按钮 + 语言切换 + 主题切换；
// 移动端（<960px）：语言 + 主题 + GitHub 图标（依次排在汉堡按钮左侧），其余功能在汉堡全屏菜单内。
import { computed } from 'vue'
import { useData } from 'vitepress'
import { locale, switchLocaleRoute, t } from '../i18n'

const { theme, isDark } = useData()
const sponsorUrl = 'https://donate.techisle.top/'
const githubUrl = theme.value.socialLinks?.find((l) => l.icon === 'github')?.link || 'https://github.com/cubeyu'

// 语言切换按钮显示目标语言（当前中文时显示 EN）
const localeLabel = computed(() => (locale.value === 'zh' ? 'EN' : '中'))

// 主题切换（isDark 为可写 computed，切换全站生效）
const toggleTheme = () => { isDark.value = !isDark.value }
</script>

<template>
  <div class="nav-extras">
    <a class="vpe-sponsor" :href="sponsorUrl" target="_blank" rel="noopener" referrerpolicy="no-referrer" :title="t('sponsor')">
      <svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M12 21s-7.5-4.6-10-9.3C.6 8.6 2.6 5 6 5c2 0 3.4 1 4.5 2.5L12 9l1.5-1.5C14.6 6 16 5 18 5c3.4 0 5.4 3.6 4 6.7C19.5 16.4 12 21 12 21Z"/></svg>
      <span>{{ t('sponsor') }}</span>
    </a>
    <button class="vpe-lang" :title="t('language')" @click="switchLocaleRoute">{{ localeLabel }}</button>
    <!-- 移动端：语言 / 主题 / GitHub（依次排在汉堡按钮左侧；桌面端由官方按钮提供） -->
    <button class="vpe-mobile-icon vpe-mobile-lang" :title="t('language')" :aria-label="t('language')"
      @click="switchLocaleRoute">{{ localeLabel }}</button>
    <button class="vpe-mobile-icon" :title="t('theme')" :aria-label="t('theme')" @click="toggleTheme">
      <svg v-if="!isDark" viewBox="0 0 24 24" width="17" height="17"><path fill="currentColor" d="M12 18a6 6 0 1 1 0-12 6 6 0 0 1 0 12Zm0-14a1 1 0 0 1-1-1V1a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1Zm0 20a1 1 0 0 1-1-1v-2a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1ZM4.2 5.6 5.6 7A1 1 0 1 1 4.2 8.4L2.8 7A1 1 0 0 1 4.2 5.6Zm14.2 14.2 1.4 1.4a1 1 0 1 1-1.4 1.4l-1.4-1.4a1 1 0 1 1 1.4-1.4ZM1 12a1 1 0 0 1 1-1h2a1 1 0 1 1 0 2H2a1 1 0 0 1-1-1Zm19 0a1 1 0 0 1 1-1h2a1 1 0 1 1 0 2h-2a1 1 0 0 1-1-1ZM4.2 18.4A1 1 0 1 1 5.6 17l1.4 1.4a1 1 0 1 1-1.4 1.4l-1.4-1.4ZM18.4 4.2A1 1 0 1 1 17 5.6L15.6 4.2a1 1 0 1 1 1.4-1.4l1.4 1.4Z"/></svg>
      <svg v-else viewBox="0 0 24 24" width="17" height="17"><path fill="currentColor" d="M10.5 2.6a.7.7 0 0 0-1-.7A10 10 0 1 0 22.1 14.5a.7.7 0 0 0-.7-1A8 8 0 0 1 10.5 2.6Z"/></svg>
    </button>
    <!-- 移动端：GitHub 图标（桌面端由官方 SocialLinks 提供） -->
    <a class="vpe-gh-mobile" :href="githubUrl" target="_blank" rel="noopener" referrerpolicy="no-referrer" :title="t('github')">
      <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
    </a>
  </div>
</template>

<style scoped>
.nav-extras {
  display: flex;
  align-items: center;
  gap: 8px;
}

.vpe-sponsor {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 32px;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 500;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 99px;
  text-decoration: none;
  transition: all 0.2s;
}

.vpe-sponsor svg {
  color: #f56c6c;
}

.vpe-sponsor:hover {
  color: #f56c6c;
  border-color: #f56c6c;
  background: rgba(245, 108, 108, 0.08);
  transform: translateY(-1px);
}

.vpe-lang {
  height: 32px;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 700;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 99px;
  cursor: pointer;
  transition: all 0.2s;
}

.vpe-lang:hover {
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}

.vpe-gh-mobile {
  display: none;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  color: var(--vp-c-text-1);
  border-radius: 50%;
  transition: color 0.2s, background-color 0.2s;
}

.vpe-gh-mobile:hover {
  color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-soft);
}

/* 移动端图标按钮（语言/主题）：与 GitHub 图标统一尺寸与悬停样式 */
.vpe-mobile-icon {
  display: none;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  background: transparent;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: color 0.2s, background-color 0.2s;
}

.vpe-mobile-icon:hover {
  color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-soft);
}

/* 桌面端：隐藏所有移动端图标（官方按钮已提供） */
@media (min-width: 960px) {
  .vpe-gh-mobile,
  .vpe-mobile-icon {
    display: none;
  }
}

/* 移动端：隐藏桌面胶囊，显示 语言 / 主题 / GitHub 三个图标 */
@media (max-width: 959px) {
  .vpe-sponsor,
  .vpe-lang {
    display: none;
  }

  .vpe-gh-mobile,
  .vpe-mobile-icon {
    display: inline-flex;
  }
}
</style>
