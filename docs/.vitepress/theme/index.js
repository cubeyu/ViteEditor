import DefaultTheme from 'vitepress/theme'
import Layout from './Layout.vue'
import './custom.css'

// 注意：编辑器组件不在全局注册（避免 md-editor-v3 被打进全站主题 chunk）。
// pages/editor.md 通过页面级 <script setup> 局部导入使用；
// 接入自有项目的方式见 docs/guide/integrate.md。
export default {
  extends: DefaultTheme,
  Layout
}
