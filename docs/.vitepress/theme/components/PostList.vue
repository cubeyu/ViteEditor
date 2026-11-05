<script setup>
// 博客文章列表：构建时由 posts.data.mts 注入全部文章数据，卡片式展示
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'
import { data as postsData } from '../../../posts.data.mts'
import { t } from '../i18n'

const posts = computed(() => postsData)

// 归一化文章数据：排除列表页自身、日期格式化、封面补 base、分类/标签取自 front matter
const items = computed(() =>
  posts.value
    .filter((p) => !/\/(index\.html)?$/.test(p.url))
    .map((p) => {
      const fm = p.frontmatter || {}
      const cover = typeof fm.cover === 'string' && /^(https?:\/\/|\/)/.test(fm.cover) ? fm.cover : ''
      return {
        url: p.url,
        title: fm.title || p.url.split('/').pop(),
        date: typeof fm.date === 'string' ? fm.date.slice(0, 10) : '',
        categories: Array.isArray(fm.categories) ? fm.categories : fm.categories ? [fm.categories] : [],
        tags: Array.isArray(fm.tags) ? fm.tags : fm.tags ? [fm.tags] : [],
        description: fm.description || '',
        cover: cover.startsWith('/') ? withBase(cover) : cover
      }
    })
)

// 封面占位渐变（按标题哈希取色，避免所有卡片一个颜色）
const placeholderGradient = (title) => {
  const gradients = [
    'linear-gradient(135deg, #42d392 0%, #3eaf7c 100%)',
    'linear-gradient(135deg, #6a8bff 0%, #4a6cf7 100%)',
    'linear-gradient(135deg, #ffb86b 0%, #ff7e5f 100%)',
    'linear-gradient(135deg, #b465da 0%, #8a4fbe 100%)',
    'linear-gradient(135deg, #43cbff 0%, #3e8ef7 100%)'
  ]
  let hash = 0
  for (const ch of String(title)) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return gradients[hash % gradients.length]
}

const { lang } = useData()
</script>

<template>
  <div class="post-list-page">
    <header class="post-list-head">
      <h1>{{ t('blogTitle') }}</h1>
      <p>{{ t('blogDescription') }}</p>
    </header>

    <div v-if="items.length" class="post-grid">
      <article v-for="post in items" :key="post.url" class="post-card">
        <a :href="withBase(post.url)" class="post-card-link">
          <div class="post-cover">
            <img v-if="post.cover" :src="post.cover" :alt="post.title" loading="lazy">
            <div v-else class="post-cover-placeholder" :style="{ background: placeholderGradient(post.title) }">
              <span>M</span>
            </div>
          </div>
          <div class="post-body">
            <div class="post-meta">
              <span v-if="post.date" class="post-date">{{ post.date }}</span>
              <span v-for="c in post.categories.slice(0, 2)" :key="'c-' + c" class="post-chip">{{ c }}</span>
            </div>
            <h2 class="post-title">{{ post.title }}</h2>
            <p v-if="post.description" class="post-desc">{{ post.description }}</p>
            <span class="post-more">{{ t('readMore') }} →</span>
          </div>
        </a>
      </article>
    </div>

    <div v-else class="post-empty">
      <p>{{ t('noPostsYet') }}</p>
      <a class="post-empty-btn" :href="withBase('/pages/editor')">{{ t('goEditor') }} →</a>
    </div>
  </div>
</template>

<style scoped>
.post-list-page {
  max-width: 1152px;
  margin: 0 auto;
  padding: 48px 24px 64px;
}

.post-list-head h1 {
  margin: 0 0 8px;
  font-size: 32px;
  letter-spacing: -0.3px;
}

.post-list-head p {
  margin: 0 0 32px;
  color: var(--vp-c-text-3);
  font-size: 14px;
}

.post-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.post-card {
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  overflow: hidden;
  background: var(--vp-c-bg);
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
}

.post-card:hover {
  transform: translateY(-4px);
  border-color: var(--vp-c-brand-1);
  box-shadow: var(--vpe-shadow-brand, 0 8px 32px rgba(62, 175, 124, 0.25));
}

.post-card-link {
  display: flex;
  flex-direction: column;
  height: 100%;
  text-decoration: none;
}

.post-cover {
  aspect-ratio: 16 / 7;
  overflow: hidden;
  background: var(--vp-c-bg-soft);
}

.post-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.4s ease;
}

.post-card:hover .post-cover img {
  transform: scale(1.04);
}

.post-cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.post-cover-placeholder span {
  font-size: 44px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.85);
  font-family: Georgia, serif;
}

.post-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 16px 18px 18px;
}

.post-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.post-date {
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.post-chip {
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 99px;
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-3);
}

.post-title {
  margin: 0 0 8px;
  font-size: 17px;
  line-height: 1.4;
  color: var(--vp-c-text-1);
  letter-spacing: -0.2px;
}

.post-desc {
  margin: 0 0 14px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--vp-c-text-3);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}

.post-more {
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-brand-1);
}

.post-empty {
  text-align: center;
  padding: 64px 0;
  color: var(--vp-c-text-3);
}

.post-empty p {
  margin: 0 0 16px;
  font-size: 14px;
}

.post-empty-btn {
  display: inline-block;
  padding: 8px 20px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, var(--vp-c-brand-1), var(--vp-c-brand-2));
  border-radius: 99px;
  text-decoration: none;
  box-shadow: var(--vpe-shadow-brand);
}
</style>
