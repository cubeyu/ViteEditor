import { createContentLoader } from 'vitepress'

// 构建时加载 docs/posts/ 下全部文章（排除列表页自身），
// createContentLoader 会按 front matter 的 date 字段倒序排列
export default createContentLoader('posts/**/*.md', {
  excerpt: false,
  globOptions: {
    ignore: ['posts/index.md']
  }
})
