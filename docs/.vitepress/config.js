import { defineConfig } from 'vitepress'

// 站点 base：与仓库名保持一致（GitHub Pages 子路径部署）
const base = '/ViteEditor/'

export default defineConfig({
  title: 'VitePress Editor',
  description: 'VitePress 在线 Markdown 编辑器：编写、图片直传、一键发布到 GitHub',
  base,
  lang: 'zh-CN',
  head: [
    // head 中的资源不会自动添加 base，需要手动拼接
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${base}favicon.svg` }]
  ],
  // 双语站点：zh 为根区域（简体中文），en 为英文区域
  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
      themeConfig: {
        nav: [
          { text: '首页', link: '/' },
          { text: '在线编辑器', link: '/pages/editor' },
          { text: '文章', link: '/posts/' },
          { text: '文档', link: '/guide/' }
        ],
        sidebar: {
          '/guide/': [
            {
              text: '指南',
              items: [
                { text: '介绍', link: '/guide/' },
                { text: '编辑器使用教程', link: '/guide/editor' },
                { text: '接入已有项目', link: '/guide/integrate' }
              ]
            }
          ]
        },
        socialLinks: [
          { icon: 'github', link: 'https://github.com/cubeyu/ViteEditor' }
        ],
        // 国际化配置
        docFooter: {
          prev: '上一页',
          next: '下一页'
        },
        outline: {
          label: '页面导航'
        },
        returnToTopLabel: '返回顶部',
        sidebarMenuLabel: '菜单',
        darkModeSwitchLabel: '主题',
        lightModeSwitchTitle: '切换到浅色模式',
        darkModeSwitchTitle: '切换到深色模式'
      }
    },
    en: {
      label: 'English',
      lang: 'en-US',
      themeConfig: {
        nav: [
          { text: 'Home', link: '/en/' },
          { text: 'Editor', link: '/pages/editor' },
          { text: 'Posts', link: '/en/posts/' },
          { text: 'Docs', link: '/en/guide/' }
        ],
        sidebar: {
          '/en/guide/': [
            {
              text: 'Guide',
              items: [
                { text: 'Introduction', link: '/en/guide/' },
                { text: 'Editor Tutorial', link: '/en/guide/editor' },
                { text: 'Integrate into Your Project', link: '/en/guide/integrate' }
              ]
            }
          ]
        },
        socialLinks: [
          { icon: 'github', link: 'https://github.com/cubeyu/ViteEditor' }
        ],
        docFooter: {
          prev: 'Previous',
          next: 'Next'
        },
        outline: {
          label: 'On this page'
        },
        returnToTopLabel: 'Back to top',
        sidebarMenuLabel: 'Menu',
        darkModeSwitchLabel: 'Theme',
        lightModeSwitchTitle: 'Switch to light theme',
        darkModeSwitchTitle: 'Switch to dark theme'
      }
    }
  }
})
