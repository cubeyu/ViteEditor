// 站点 UI 双语字典与切换逻辑
// 覆盖范围：编辑器组件、导航栏扩展、页脚、博客列表等自定义 UI 的文案；
// markdown 内容页面的双语由 VitePress locales（zh root + en）负责。
import { ref } from 'vue'

export const LOCALE_KEY = 'vpe-locale'

// 初始化语言：手动选择 > 浏览器语言自动检测 > 默认中文
function initLocale() {
  if (typeof window === 'undefined') return 'zh'
  try {
    const stored = localStorage.getItem(LOCALE_KEY)
    if (stored === 'zh' || stored === 'en') return stored
  } catch (e) { /* 隐私模式等场景读取失败时走自动检测 */ }
  return navigator.language?.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

export const locale = ref(initLocale())

// 切换语言并持久化（手动选择后不再自动检测）
export function setLocale(l) {
  locale.value = l
  try { localStorage.setItem(LOCALE_KEY, l) } catch (e) { /* ignore */ }
}

// 语言树间跳转（导航栏按钮与汉堡抽屉共用）：
// 除编辑器页（/pages/editor，双语共用）外，在 zh 根树与 en 树之间对等跳转；
// 文章详情没有 en 版本，跳到 en 博客列表
export function switchLocaleRoute() {
  const target = locale.value === 'zh' ? 'en' : 'zh'
  setLocale(target)
  const base = import.meta.env.BASE_URL || '/'
  let rel = window.location.pathname.startsWith(base)
    ? window.location.pathname.slice(base.length)
    : window.location.pathname
  rel = rel.replace(/\.html$/, '').replace(/\/+$/, '')
  // 剥离 en 前缀：'en'（英文首页，无尾斜杠）与 'en/xxx' 两种形态都要处理
  if (rel === 'en') rel = ''
  else if (rel.startsWith('en/')) rel = rel.slice(3)

  let dest = null
  if (target === 'en') {
    if (rel === '' || rel.startsWith('guide/')) dest = 'en/' + rel
    else if (rel.startsWith('posts')) dest = 'en/posts'
  } else {
    dest = rel
  }

  if (dest !== null) {
    const url = dest ? base + dest.replace(/\/+$/, '') + '/' : base
    window.location.assign(url)
  }
}

// 取词：当前语言缺失的 key 回退到中文
export function t(key) {
  return I18N[locale.value]?.[key] ?? I18N.zh[key] ?? key
}

const I18N = {
  zh: {
    // 通用
    sponsor: '赞赏',
    github: 'GitHub',
    language: '语言',
    theme: '主题',
    cancel: '取消',
    ok: '确定',
    tutorial: '教程',
    branchDefault: 'main',
    // 编辑器顶栏
    postTitle: '文章标题',
    filePath: '文件路径 (可选)',
    filePathTip: '自定义保存路径，仅支持 docs/posts/ 目录下的 .md 文件',
    files: '文件',
    catalog: '目录',
    import: '导入',
    export: '导出',
    newDoc: '新建',
    preview: '成品预览',
    token: 'GitHub Token',
    username: '用户名',
    repo: '仓库名',
    branch: '分支',
    connect: '连接 GitHub',
    connecting: '连接中...',
    connected: '已连接',
    disconnect: '断开连接',
    disconnected: '已断开连接',
    requestTimeout: '请求超时，请检查网络后重试',
    connectFailed: '连接失败',
    notConnected: '未连接',
    save: '保存到 GitHub',
    saving: '保存中...',
    repoFiles: '仓库文件',
    searchPlaceholder: '搜索文章路径...',
    noMatch: '没有匹配的文章',
    noLogin: '连接 GitHub 后可浏览仓库文件',
    noPosts: 'docs/posts/ 下暂无文章',
    imageGallery: '图片目录',
    noImages: '仓库暂无图片，上传后显示在这里',
    insertImageTip: '（点击插入到文章）',
    refresh: '刷新文件列表',
    collapse: '收起',
    repoFetchFailed: '获取仓库文件失败',
    // 编辑器交互提示
    draftRestored: '已恢复上次编辑的本地草稿',
    connectSuccess: 'GitHub认证成功!',
    tokenInvalid: 'GitHub Token无效或已过期，请检查Token是否正确',
    rateLimited: 'GitHub API访问受限，可能是请求次数超限',
    authFailed: 'GitHub认证失败',
    tokenFormatWarn: 'GitHub Token格式可能不正确，请确认是否为有效的个人访问令牌',
    fillToken: '请先填写 GitHub Token',
    fillRepo: '请先填写 GitHub 用户名与仓库名',
    needLogin: '请先登录GitHub',
    fillTitle: '请先在正文 front matter 中填写 title（不要保留默认的「文章标题」占位）',
    invalidPath: '文件路径不合法：仅允许 docs/posts/ 目录下的 .md 文件',
    saved: '文章已成功保存到GitHub!',
    saveFailed: '保存失败',
    uploaded: '成功上传',
    images: '张图片',
    imgUploadFailed: '图片上传失败',
    loaded: '已加载',
    readFailed: '读取文件失败',
    deleteTitle: '删除文件',
    deleteConfirm: '确定删除仓库中的',
    deleteConfirm2: '吗？此操作会直接提交到 GitHub 分支「',
    deleteConfirm3: '」，不可自动恢复。',
    deleted: '已删除',
    deleteFailed: '删除失败',
    newDocTitle: '新建文章',
    newDocConfirm: '将清空当前内容并恢复为默认模板，本地草稿也会被清除。确定继续吗？',
    newDocDone: '已新建空白文章',
    imported: '已导入',
    importTitle: '导入本地文件',
    importConfirm: '导入「',
    importConfirm2: '」将覆盖当前正在编辑的内容（当前内容仍有本地草稿）。确定继续吗？',
    importTypeError: '仅支持导入 .md / .markdown / .txt 文件',
    readLocalFailed: '读取本地文件失败',
    exported: '已导出',
    exportMd: '导出 Markdown (.md)',
    exportHtml: '导出网页 (.html)',
    emptyContent: '（内容为空）',
    startWriting: '开始编写你的文章...',
    insertImageOk: '已插入图片',
    // 成品预览
    publishedIn: '发布于',
    // 页脚
    // 博客
    blogTitle: '全部文章',
    blogDescription: '由 ViteEditor 在线编辑发布的文章，按时间归档',
    readMore: '阅读全文',
    noPostsYet: '还没有文章，去编辑器发布第一篇吧！',
    goEditor: '去发布'
  },
  en: {
    // Common
    sponsor: 'Sponsor',
    github: 'GitHub',
    language: 'Language',
    theme: 'Theme',
    cancel: 'Cancel',
    ok: 'OK',
    tutorial: 'Guide',
    branchDefault: 'main',
    // Editor topbar
    postTitle: 'Post title',
    filePath: 'File path (optional)',
    filePathTip: 'Custom save path. Only .md files under docs/posts/ are allowed',
    files: 'Files',
    catalog: 'Outline',
    import: 'Import',
    export: 'Export',
    newDoc: 'New',
    preview: 'Preview',
    token: 'GitHub Token',
    username: 'Username',
    repo: 'Repository',
    branch: 'Branch',
    connect: 'Connect GitHub',
    connecting: 'Connecting...',
    connected: 'Connected',
    disconnect: 'Disconnect',
    disconnected: 'Disconnected',
    requestTimeout: 'Request timed out. Check your network and try again',
    connectFailed: 'Failed',
    notConnected: 'Offline',
    save: 'Save to GitHub',
    saving: 'Saving...',
    repoFiles: 'Repository files',
    searchPlaceholder: 'Search post paths...',
    noMatch: 'No matching posts',
    noLogin: 'Connect GitHub to browse repository files',
    noPosts: 'No posts under docs/posts/ yet',
    imageGallery: 'Images',
    noImages: 'No images in the repository yet',
    insertImageTip: '(click to insert into post)',
    refresh: 'Refresh file list',
    collapse: 'Collapse',
    repoFetchFailed: 'Failed to fetch repository files',
    // Editor toasts
    draftRestored: 'Local draft restored',
    connectSuccess: 'GitHub connected!',
    tokenInvalid: 'GitHub Token is invalid or expired. Please check it',
    rateLimited: 'GitHub API rate limited. Please try again later',
    authFailed: 'GitHub authentication failed',
    tokenFormatWarn: 'The GitHub Token format looks incorrect. Please verify it',
    fillToken: 'Please enter your GitHub Token first',
    fillRepo: 'Please fill in the GitHub username and repository first',
    needLogin: 'Please connect GitHub first',
    fillTitle: 'Please set the title in the front matter first (do not keep the default placeholder)',
    invalidPath: 'Invalid path: only .md files under docs/posts/ are allowed',
    saved: 'Post saved to GitHub!',
    saveFailed: 'Save failed',
    uploaded: 'Uploaded',
    images: 'image(s)',
    imgUploadFailed: 'Image upload failed',
    loaded: 'Loaded',
    readFailed: 'Failed to read file',
    deleteTitle: 'Delete file',
    deleteConfirm: 'Delete ',
    deleteConfirm2: ' from the repository? This commits directly to branch "',
    deleteConfirm3: '" and cannot be undone.',
    deleted: 'Deleted',
    deleteFailed: 'Delete failed',
    newDocTitle: 'New post',
    newDocConfirm: 'This clears the current content, restores the default template and removes the local draft. Continue?',
    newDocDone: 'New post created',
    imported: 'Imported',
    importTitle: 'Import local file',
    importConfirm: 'Importing "',
    importConfirm2: '" will overwrite the current content (a local draft still exists). Continue?',
    importTypeError: 'Only .md / .markdown / .txt files are supported',
    readLocalFailed: 'Failed to read the local file',
    exported: 'Exported',
    exportMd: 'Export Markdown (.md)',
    exportHtml: 'Export web page (.html)',
    emptyContent: '(empty content)',
    startWriting: 'Start writing your post...',
    insertImageOk: 'Image inserted',
    // Preview
    publishedIn: 'Published',
    // Footer
    // Blog
    blogTitle: 'All posts',
    blogDescription: 'Posts written and published online with ViteEditor, archived by date',
    readMore: 'Read more',
    noPostsYet: 'No posts yet — publish your first one from the editor!',
    goEditor: 'Publish now'
  }
}
