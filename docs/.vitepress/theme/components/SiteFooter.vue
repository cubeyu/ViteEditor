<script setup>
// 全站自定义页脚：简约单行式（品牌 · 快速链接 · 作者与赞赏）
import { ref } from 'vue'
import { useData, withBase } from 'vitepress'
import { t } from '../i18n'

const authorGithub = 'https://github.com/cubeyu'
const authorAvatar = 'https://github.com/cubeyu.png'
const sponsorUrl = 'https://donate.techisle.top/'

// 头像加载失败（如网络受限）时回退为字母占位
const avatarBroken = ref(false)
</script>

<template>
  <footer class="vpe-footer">
    <div class="vpe-footer-line">
      <a class="vpe-footer-brand" :href="withBase('/')">
        <svg viewBox="0 0 64 64" width="18" height="18" aria-hidden="true">
          <rect x="4" y="4" width="56" height="56" rx="14" fill="url(#vpeFooterGrad)" />
          <path d="M18 44V20h5l9 13 9-13h5v24h-6V30.5L32 42l-8-11.5V44z" fill="#fff" />
          <defs>
            <linearGradient id="vpeFooterGrad" x1="0" y1="0" x2="64" y2="64">
              <stop offset="0" stop-color="#42d392" />
              <stop offset="1" stop-color="#3eaf7c" />
            </linearGradient>
          </defs>
        </svg>
        <strong>ViteEditor</strong>
      </a>

      <div class="vpe-footer-right">
        <a class="vpe-footer-author" :href="authorGithub" target="_blank" rel="noopener" referrerpolicy="no-referrer">
          <span class="vpe-footer-avatar-wrap">
            <img v-if="!avatarBroken" class="vpe-footer-avatar" :src="authorAvatar" alt="cubeyu" loading="lazy" @error="avatarBroken = true">
            <span v-else class="vpe-footer-avatar-fallback">C</span>
          </span>
          <span>cubeyu</span>
        </a>
        <span class="vpe-footer-dot">·</span>
        <a class="vpe-footer-sponsor" :href="sponsorUrl" target="_blank" rel="noopener" referrerpolicy="no-referrer">
          <svg viewBox="0 0 24 24" width="12" height="12"><path fill="currentColor" d="M12 21s-7.5-4.6-10-9.3C.6 8.6 2.6 5 6 5c2 0 3.4 1 4.5 2.5L12 9l1.5-1.5C14.6 6 16 5 18 5c3.4 0 5.4 3.6 4 6.7C19.5 16.4 12 21 12 21Z"/></svg>
          {{ t('sponsor') }}
        </a>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.vpe-footer {
  border-top: 1px solid var(--vp-c-divider);
  padding: 16px 24px 14px;
  margin-top: auto;
}

.vpe-footer-line {
  max-width: 1152px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px 20px;
}

.vpe-footer-brand {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
}

.vpe-footer-brand strong {
  font-size: 13px;
  letter-spacing: 0.2px;
  color: var(--vp-c-text-1);
}


.vpe-footer-dot {
  color: var(--vp-c-divider);
  font-size: 12px;
}

.vpe-footer-right {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.vpe-footer-author,
.vpe-footer-sponsor {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--vp-c-text-2);
  text-decoration: none;
  transition: color 0.2s;
}

.vpe-footer-author:hover {
  color: var(--vp-c-brand-1);
}

.vpe-footer-sponsor {
  color: #f56c6c;
}

.vpe-footer-sponsor:hover {
  color: #ff8a8a;
}

.vpe-footer-avatar-wrap {
  display: inline-flex;
  width: 18px;
  height: 18px;
}

.vpe-footer-avatar {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1px solid var(--vp-c-divider);
}

.vpe-footer-avatar-fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  font-size: 10px;
  font-weight: 700;
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  border-radius: 50%;
}

@media (max-width: 767px) {
  /* 移动端保持一行：品牌左、作者与赞赏右，字号略缩 */
  .vpe-footer-line {
    gap: 8px 12px;
  }

  .vpe-footer-brand strong {
    font-size: 12px;
  }

  .vpe-footer-author,
  .vpe-footer-sponsor {
    font-size: 11px;
  }
}
</style>
