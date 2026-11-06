<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, shallowRef } from 'vue';
import { MdEditor, MdCatalog, MdPreview } from 'md-editor-v3';
import 'md-editor-v3/lib/style.css';
import { useData, withBase } from 'vitepress'
import { toast } from 'vue3-toastify';
import 'vue3-toastify/dist/index.css';
import { locale, setLocale, t } from '../i18n'

// ============ 基础常量 ============
// GitHub API 地址
const githubApiUrl = 'https://api.github.com'
// 编辑器实例 id（MdEditor 的 id 与 MdCatalog 的 editorId 必须一致）
const editorId = 'vpe-editor'
// 本地草稿存储键
const DRAFT_KEY = 'vpe_draft_v1'

// 主题跟随 VitePress 明暗模式（useData 必须在 setup 顶层同步调用）
// isDark 是可写 computed，直接赋值即可切换全站主题（vueuse useDark 通道）
const { isDark } = useData()
const theme = computed(() => (isDark.value ? 'dark' : 'light'))
const toggleTheme = () => { isDark.value = !isDark.value }

// 语言切换（中/英），文案由 ../i18n 提供
const localeLabel = computed(() => (locale.value === 'zh' ? 'EN' : '中'))
const toggleLocale = () => setLocale(locale.value === 'zh' ? 'en' : 'zh')

// ============ GitHub 认证状态 ============
// 安全说明：Token 属于敏感凭证，仅保存在 sessionStorage（关闭标签页即失效），
// 不写入 localStorage，避免同源脚本长期窃取仓库写权限；
// 用户名/仓库/分支为非敏感配置，持久化到 localStorage 以便下次自动回填
const githubToken = ref('')
const username = ref('')
const repoName = ref('')
const branch = ref('') // 默认留空，请求时自动回退 main
const loginLoading = ref(false)
const isLogin = ref(0) // 0 未连接 / 1 已连接 / 2 连接失败

// 实际生效的分支：输入为空时回退 main
const effectiveBranch = computed(() => branch.value.trim() || 'main')

// 登录状态文案与样式
const loginStatusText = computed(() =>
  isLogin.value === 1 ? t('connected') : isLogin.value === 2 ? t('connectFailed') : t('notConnected')
)

// 从存储恢复配置，存在有效 Token 时自动重连
onMounted(() => {
  const savedToken = sessionStorage.getItem('github_token')
  username.value = localStorage.getItem('github_username') || ''
  repoName.value = localStorage.getItem('github_repo') || ''
  branch.value = localStorage.getItem('github_branch') || ''

  // 恢复本地草稿（与默认模板不同才恢复）
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (raw) {
      const draft = JSON.parse(raw)
      if (draft && typeof draft.content === 'string' && draft.content && draft.content !== defaultTemplate) {
        content.value = draft.content
        filePath.value = typeof draft.filePath === 'string' ? draft.filePath : ''
        toast.info(t('draftRestored'))
      }
    }
  } catch (e) {
    console.warn('草稿恢复失败:', e)
  }

  if (savedToken) {
    githubToken.value = savedToken
    verifyGithubToken()
  }
})

// 将 UTF-8 字符串安全编码为 Base64（替代已废弃的 unescape 方案）
const utf8ToBase64 = (str) => {
  const bytes = new TextEncoder().encode(str)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

// 将 GitHub Contents API 返回的 Base64 解码为 UTF-8 文本
const base64ToUtf8 = (b64) => {
  const bytes = Uint8Array.from(atob(b64.replace(/\n/g, '')), (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

// 构造 GitHub Contents API 地址：
// 用户名/仓库名/路径逐段 encodeURIComponent，防止特殊字符（../、?、# 等）
// 破坏请求或操纵写入位置（路径遍历）
const repoContentsUrl = (path = '') => {
  const encodedPath = path
    ? '/' + path.split('/').map(encodeURIComponent).join('/')
    : ''
  return `${githubApiUrl}/repos/${encodeURIComponent(username.value)}/${encodeURIComponent(repoName.value)}/contents${encodedPath}`
}

// 统一的 GitHub API 请求封装：15s 超时，避免网络挂起时 loading 态永久锁死
const ghFetch = async (url, options = {}) => {
  try {
    return await ghFetch(url, { ...options, signal: AbortSignal.timeout(15000) })
  } catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      throw new Error(t('requestTimeout'))
    }
    throw error
  }
}

// 断开连接：清除会话凭证并重置界面状态
const handleDisconnect = () => {
  sessionStorage.removeItem('github_token')
  githubToken.value = ''
  isLogin.value = 0
  loginLoading.value = false
  repoFiles.value = { posts: [], images: [] }
  openPath.value = ''
  toast.success(t('disconnected'))
}

// 文件名白名单化：防止路径遍历（../）与特殊字符破坏请求
const sanitizeFileName = (name) =>
  name
    .replace(/\.{2,}/g, '.')
    .replace(/[^\w.-]/g, '_')
    .replace(/^\.+/, '_')

// 自定义保存路径白名单：仅允许 docs/posts/ 目录下的 .md 文件，
// 防止通过自定义路径覆盖仓库任意文件（如 .github/workflows/*.yml）
const isFilePathValid = (p) => /^docs\/posts\/[\w\u4e00-\u9fa5\-/]+\.md$/.test(p)

// ============ 面板与界面状态 ============
const showFiles = ref(true)     // 左侧文件树面板
const showCatalog = ref(false)  // 右侧目录面板
const fileFilter = ref('')      // 文件搜索关键字

// ============ 文章内容状态 ============
// 获取当前日期，格式为YYYY-MM-DD
const getCurrentDate = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 文章模板
const defaultTemplate = `---
post: true
title: 文章标题
date: ${getCurrentDate()}
cover: 图片连接
coveross: 备用连接
categories:
 - 分类
tags:
 - 标签
description: 在此处添加文章描述，会显示在文章列表中。
---
文章内容
`;
const content = shallowRef(defaultTemplate);
const filePath = ref('')
const saveLoading = ref(false)
const openPath = ref('') // 当前已加载的仓库文件路径（用于文件树高亮）
const latestHtml = ref('') // 最近一次渲染的 HTML（导出用）

// ============ 成品预览（实时博客预览模式） ============
// 开启后：编辑器自带的预览栏收起，编辑区右侧挂载博客样式预览面板，
// 输入内容实时渲染；再次点击返回编辑模式
const previewMode = ref(false)
const togglePreviewMode = () => { previewMode.value = !previewMode.value }

// 预览模式与编辑器内置预览栏互斥：实时预览时收起内置预览，腾出空间
watch(previewMode, (on) => {
  editorRef.value?.togglePreview(!on)
})

// 解析 front matter 中的页头信息（标题/日期/分类/标签/描述/封面）
const previewMeta = computed(() => {
  const meta = { title: '', date: '', categories: [], tags: [], description: '', cover: '' }
  const m = (content.value || '').match(/^---\r?\n([\s\S]{0,2000}?)\r?\n---/)
  if (!m) return meta
  const fm = m[1]
  const pick = (key) => {
    const r = fm.match(new RegExp('^' + key + ':\\s*(.*)$', 'm'))
    return r ? r[1].trim().replace(/^["']|["']$/g, '') : ''
  }
  meta.title = pick('title')
  meta.date = pick('date')
  meta.description = pick('description')
  meta.cover = pick('cover')
  // 解析 YAML 列表（- 项）
  const list = (key) => {
    const out = []
    const idx = fm.search(new RegExp('^' + key + ':\\s*$', 'm'))
    if (idx === -1) return out
    const rest = fm.slice(fm.indexOf('\n', idx) + 1)
    for (const line of rest.split('\n')) {
      const lm = line.match(/^\s*-\s+(.+)$/)
      if (!lm) break
      out.push(lm[1].trim().replace(/^["']|["']$/g, ''))
    }
    return out
  }
  meta.categories = list('categories')
  meta.tags = list('tags')
  return meta
})

// 封面是否为可用图片地址：仅放行 http(s) 与站点根路径，
// 拒绝协议相对 URL（//host，防止第三方跟踪）与 javascript:/data: 等危险协议
const previewCoverValid = computed(() => /^(https?:\/\/(?!\/)|\/(?!\/))/.test(previewMeta.value.cover || ''))

// 预览封面最终地址：站点根路径自动补 base（与 PostList 行为一致）
const previewCoverSrc = computed(() => {
  const cover = previewMeta.value.cover || ''
  if (!previewCoverValid.value) return ''
  return cover.startsWith('/') ? withBase(cover) : cover
})

// 文章标题：以正文 front matter 的 title 字段为唯一来源
// （决定文件名 slug、commit 信息、博客展示与预览页头），不再单独提供输入框
const postTitle = computed(() => previewMeta.value.title.trim())

// 预览正文：去掉 front matter 后的 Markdown，
// 用 md-editor-v3 的 MdPreview 渲染（与编辑器预览同一管线，内置 XSS 消毒）
// 说明：限制 front matter 匹配长度（2KB），内容缺失闭合 --- 时不会吞掉正文；
// 250ms 防抖，避免大文档逐键重解析
const previewMarkdown = ref('')
let previewMarkdownTimer = null
watch(content, (text) => {
  clearTimeout(previewMarkdownTimer)
  previewMarkdownTimer = setTimeout(() => {
    const value = text || ''
    const m = value.match(/^---\r?\n[\s\S]{0,2000}?\r?\n---(\r?\n)?/)
    previewMarkdown.value = m ? value.slice(m[0].length) : value
  }, 250)
}, { immediate: true })

// 编辑器实例引用（用于插入图片等）
const editorRef = shallowRef(null)

// ============ 本地草稿自动保存 ============
let draftTimer = null
watch([content, filePath], () => {
  clearTimeout(draftTimer)
  draftTimer = setTimeout(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        filePath: filePath.value,
        content: content.value,
        at: Date.now()
      }))
    } catch (e) {
      console.warn('草稿保存失败:', e)
    }
  }, 800)
})

// 新建文章：重置为模板并清空草稿
const handleNewDoc = () => {
  showConfirm({
    title: t('newDocTitle'),
    text: t('newDocConfirm'),
    danger: false,
    onConfirm: () => {
      content.value = defaultTemplate
      filePath.value = ''
      openPath.value = ''
      localStorage.removeItem(DRAFT_KEY)
      toast.success(t('newDocDone'))
    }
  })
}

// ============ GitHub 登录 ============
// 验证 GitHub Token
const verifyGithubToken = () => {
  loginLoading.value = true
  ghFetch(`${githubApiUrl}/user`, {
    method: 'GET',
    headers: {
      'Authorization': `token ${githubToken.value}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  }).then(async response => {
    if (response.ok) {
      return response.json()
    }
    // 401/403 的提示语由本地定义，不透传 GitHub 返回的原始错误信息
    if (response.status === 401) {
      throw new Error(t('tokenInvalid'))
    }
    if (response.status === 403) {
      throw new Error(t('rateLimited'))
    }
    throw new Error(`${t('authFailed')}: ${response.status}`)
  })
  .then(() => {
    isLogin.value = 1
    loginLoading.value = false
    toast.success(t('connectSuccess'))
    // Token 存 sessionStorage（关闭标签页即失效）；其余为非敏感配置存 localStorage
    sessionStorage.setItem('github_token', githubToken.value)
    localStorage.setItem('github_username', username.value)
    localStorage.setItem('github_repo', repoName.value)
    localStorage.setItem('github_branch', branch.value)
    // 连接成功后自动加载仓库文件树
    loadRepoTree()
  })
  .catch(error => {
    isLogin.value = 2
    loginLoading.value = false
    toast.error(error.message)
    console.error('GitHub认证错误:', error)
  })
}

// GitHub 登录处理
const handleLogin = () => {
  if (!githubToken.value) {
    toast.error(t('fillToken'))
    return
  }
  if (!username.value || !repoName.value) {
    toast.warning(t('fillRepo'))
    return
  }
  // 简单校验 Token 格式（不拦截，仅提醒；经典令牌 ghp_ 与细粒度令牌 github_pat_ 均为有效格式）
  if (githubToken.value.length < 20) {
    toast.warning(t('tokenFormatWarn'))
  }
  verifyGithubToken()
}

// ============ 仓库文件树 ============
const filesLoading = ref(false)
const repoFiles = ref({ posts: [], images: [] }) // 扁平文件列表
const collapsedDirs = ref(new Set()) // 已折叠的目录 key

// 从 Git Trees API 一次性拉取整棵仓库文件树
const loadRepoTree = async () => {
  if (isLogin.value !== 1) return
  filesLoading.value = true
  try {
    const res = await ghFetch(`${githubApiUrl}/repos/${encodeURIComponent(username.value)}/${encodeURIComponent(repoName.value)}/git/trees/${encodeURIComponent(effectiveBranch.value)}?recursive=1`, {
      headers: {
        'Authorization': `token ${githubToken.value}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    })
    if (!res.ok) {
      console.error('获取文件树失败:', await res.json().catch(() => ({})))
      toast.error(`${t('repoFetchFailed')} (HTTP ${res.status})`)
      return
    }
    const data = await res.json()
    const posts = (data.tree || [])
      .filter(t => t.type === 'blob' && /^docs\/posts\/.+\.md$/.test(t.path))
      .map(t => ({ path: t.path, name: t.path.split('/').pop(), sha: t.sha }))
    const images = (data.tree || [])
      .filter(t => t.type === 'blob' && /^docs\/public\/images\/.+\.(png|jpe?g|gif|webp|svg|ico|avif)$/i.test(t.path))
      .map(t => ({ path: t.path, name: t.path.split('/').pop(), sha: t.sha }))
    repoFiles.value = { posts, images }
  } catch (error) {
    console.error('获取文件树出错:', error)
    toast.error(t('repoFetchFailed'))
  } finally {
    filesLoading.value = false
  }
}

// 由扁平文件列表构建嵌套树（目录节点 + 文件节点）
const postsTree = computed(() => buildTree(repoFiles.value.posts))
// 按关键字过滤后的文章列表（过滤时直接展示扁平匹配结果）
const filteredPosts = computed(() => {
  const kw = fileFilter.value.trim().toLowerCase()
  if (!kw) return null
  return repoFiles.value.posts.filter(f => f.path.toLowerCase().includes(kw))
})

// 构建嵌套树结构：{ name, path, isFile, sha, children }
function buildTree(files) {
  const root = { name: '', path: '', isFile: false, children: new Map() }
  for (const f of files) {
    const segs = f.path.split('/')
    let node = root
    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i]
      const isLast = i === segs.length - 1
      if (isLast) {
        node.children.set(seg, { name: seg, path: f.path, isFile: true, sha: f.sha, children: null })
      } else {
        const dirPath = segs.slice(0, i + 1).join('/')
        if (!node.children.has(seg)) {
          node.children.set(seg, { name: seg, path: dirPath, isFile: false, sha: null, children: new Map() })
        }
        node = node.children.get(seg)
      }
    }
  }
  return treeToArray(root, 0)
}

// 树结构扁平化为带缩进层级的渲染数组（跳过已折叠目录的子树）
function treeToArray(node, depth) {
  const out = []
  const sortedDirs = []
  const sortedFiles = []
  for (const child of node.children.values()) {
    if (child.isFile) sortedFiles.push(child)
    else sortedDirs.push(child)
  }
  sortedDirs.sort((a, b) => a.name.localeCompare(b.name))
  sortedFiles.sort((a, b) => a.name.localeCompare(b.name))
  for (const dir of sortedDirs) {
    const collapsed = collapsedDirs.value.has(dir.path)
    out.push({ ...dir, depth, collapsed })
    if (!collapsed) {
      out.push(...treeToArray(dir, depth + 1))
    }
  }
  for (const f of sortedFiles) {
    out.push({ ...f, depth: depth + 1, collapsed: false })
  }
  return out
}

// 展开/折叠目录
const toggleDir = (node) => {
  const set = new Set(collapsedDirs.value)
  if (set.has(node.path)) set.delete(node.path)
  else set.add(node.path)
  collapsedDirs.value = set
}

// 加载仓库文章到编辑器
const openRepoFile = async (node) => {
  if (!node.isFile) {
    toggleDir(node)
    return
  }
  try {
    const res = await ghFetch(`${repoContentsUrl(node.path)}?ref=${encodeURIComponent(effectiveBranch.value)}`, {
      headers: {
        'Authorization': `token ${githubToken.value}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    })
    if (!res.ok) {
      console.error('读取文件失败:', await res.json().catch(() => ({})))
      toast.error(`${t('readFailed')} (HTTP ${res.status})`)
      return
    }
    const data = await res.json()
    const text = base64ToUtf8(data.content || '')
    content.value = text
    filePath.value = node.path
    openPath.value = node.path
    // 标题以正文的 front matter title 为准，无需单独回填
    toast.success(`${t('loaded')} ${node.name}`)
    // 小屏时加载后自动收起文件面板
    if (window.innerWidth < 900) showFiles.value = false
  } catch (error) {
    console.error('读取文件出错:', error)
    toast.error(t('readFailed'))
  }
}

// ============ 仓库文件删除 ============
// 通用确认弹窗状态
const confirmState = ref({ show: false, title: '', text: '', danger: false, onConfirm: null })
const showConfirm = (opts) => {
  confirmState.value = { show: true, ...opts }
}
const closeConfirm = () => {
  confirmState.value.show = false
}
const handleConfirmOk = async () => {
  const fn = confirmState.value.onConfirm
  closeConfirm()
  if (fn) await fn()
}

// 请求删除文件（先弹确认框）
const requestDeleteFile = (node) => {
  if (!node.isFile) return
  showConfirm({
    title: t('deleteTitle'),
    text: `${t('deleteConfirm')}${node.path}${t('deleteConfirm2')}${effectiveBranch.value}${t('deleteConfirm3')}`,
    danger: true,
    onConfirm: () => deleteRepoFile(node)
  })
}

// 调用 GitHub API 删除文件
const deleteRepoFile = async (node) => {
  // 防御纵深：复核路径属于允许删除的目录（文章或图片）
  if (!/^(docs\/posts\/.+\.md|docs\/public\/images\/.+)$/.test(node.path)) {
    toast.error(t('deleteFailed'))
    return
  }
  try {
    const res = await ghFetch(repoContentsUrl(node.path), {
      method: 'DELETE',
      headers: {
        'Authorization': `token ${githubToken.value}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Delete file: ${node.path}`,
        sha: node.sha,
        branch: effectiveBranch.value
      })
    })
    if (!res.ok) {
      console.error('删除文件失败:', await res.json().catch(() => ({})))
      toast.error(`${t('deleteFailed')} (HTTP ${res.status})`)
      return
    }
    toast.success(`${t('deleted')} ${node.name}`)
    if (openPath.value === node.path) openPath.value = ''
    loadRepoTree()
  } catch (error) {
    console.error('删除文件出错:', error)
    toast.error(t('deleteFailed'))
  }
}

// ============ 图片：预览 / 插入 / 上传 ============
// 从仓库图片路径得到站点图片 URL（去掉 docs/public 前缀，构建时 VitePress 自动补 base）
const repoImageToUrl = (path) => '/' + path.replace(/^docs\/public\//, '')
// 预览缩略图地址（公开仓库可直接用 raw 地址；私有仓库会显示不出来，不影响插入）
const repoImageToRawUrl = (path) =>
  `https://raw.githubusercontent.com/${encodeURIComponent(username.value)}/${encodeURIComponent(repoName.value)}/${encodeURIComponent(effectiveBranch.value)}/${path.split('/').map(encodeURIComponent).join('/')}`

  // 点击图片：插入 Markdown 到光标处
const insertRepoImage = (img) => {
  const url = repoImageToUrl(img.path)
  editorRef.value?.insert(() => ({
    targetValue: `\n![${img.name.replace(/[\[\]()]/g, " ")}](${url})\n`,
    select: false,
    deviationStart: 0
  }))
  toast.success(`${t('insertImageOk')} ${img.name}`)
}

// 上传单张图片到仓库 docs/public/images/，返回可在 Markdown 中使用的地址
// 说明：使用 /images/ 开头的站点根路径（不带 base 前缀），
// VitePress 构建时会自动为 Markdown 中的图片地址添加 base
function uploadImageToRepo(imageFile) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = async (e) => {
      try {
        const base64Content = String(e.target.result).split(',')[1] // 移除data:image/jpeg;base64,前缀
        const timestamp = Date.now()
        const safeName = sanitizeFileName(imageFile.name)
        const imagePath = `docs/public/images/${timestamp}_${safeName}`

        // 上传图片到GitHub
        const response = await ghFetch(repoContentsUrl(imagePath), {
          method: 'PUT',
          headers: {
            'Authorization': `token ${githubToken.value}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: `Upload image: ${safeName}`,
            content: base64Content,
            branch: effectiveBranch.value
          })
        })

        if (!response.ok) {
          const detail = await response.json().catch(() => ({}))
          console.error('上传图片失败:', detail)
          reject(new Error(`GitHub API ${response.status}`))
          return
        }

        // 上传与展示使用同一个时间戳，保证路径一致
        resolve(`/images/${timestamp}_${safeName}`)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => reject(new Error('File read error'))
    reader.readAsDataURL(imageFile)
  })
}

// 支持多图上传：逐张上传后统一回调
async function customUpload(files, callback) {
  if (isLogin.value !== 1) {
    toast.error(t('needLogin'))
    return
  }

  const urls = []
  for (const imageFile of files) {
    try {
      urls.push(await uploadImageToRepo(imageFile))
    } catch (error) {
      toast.error(`${t('imgUploadFailed')} ${sanitizeFileName(imageFile.name)}`)
      console.error('上传图片失败:', error)
    }
  }

  if (urls.length > 0) {
    callback(urls)
    toast.success(`${t('uploaded')} ${urls.length} ${t('images')}!`)
    loadRepoTree()
  }
}

// ============ 导入 / 导出 ============
const importInputRef = ref(null)
const triggerImport = () => importInputRef.value?.click()

// 从本地 .md 文件导入内容
const handleImportFile = (e) => {
  const file = e.target.files && e.target.files[0]
  e.target.value = ''
  if (!file) return
  if (!/\.(md|markdown|txt)$/i.test(file.name)) {
    toast.error(t('importTypeError'))
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    const text = String(reader.result || '')
    const apply = () => {
      content.value = text
      filePath.value = ''
      openPath.value = ''
      toast.success(`${t('imported')} ${file.name}`)
    }
    if (content.value && content.value !== defaultTemplate) {
      showConfirm({
        title: t('importTitle'),
        text: `${t('importConfirm')}${file.name}${t('importConfirm2')}`,
        danger: false,
        onConfirm: apply
      })
    } else {
      apply()
    }
  }
  reader.onerror = () => toast.error(t('readLocalFailed'))
  reader.readAsText(file, 'utf-8')
}

// 触发浏览器下载
const downloadBlob = (filename, blob) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// 当前内容对应的下载文件名（取 front matter 标题）
const exportBaseName = () => {
  const base = (postTitle.value || 'post').trim().replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '-')
  return base || 'post'
}

// 导出 Markdown
const exportMarkdown = () => {
  downloadBlob(`${exportBaseName()}.md`, new Blob([content.value], { type: 'text/markdown;charset=utf-8' }))
  toast.success(`${t('exported')} Markdown`)
}

// 导出 HTML（使用编辑器实时渲染的最新 HTML）
const exportHtmlFile = () => {
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${exportBaseName()}</title>
<style>
  body { max-width: 800px; margin: 40px auto; padding: 0 20px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif; line-height: 1.7; color: #24292f; }
  pre { background: #f6f8fa; padding: 16px; border-radius: 8px; overflow: auto; }
  code { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; }
  img { max-width: 100%; }
  blockquote { border-left: 4px solid #d0d7de; margin: 0; padding: 0 16px; color: #57606a; }
  table { border-collapse: collapse; }
  th, td { border: 1px solid #d0d7de; padding: 6px 12px; }
</style>
</head>
<body>
${latestHtml.value || `<p>${t('emptyContent')}</p>`}
</body>
</html>`
  downloadBlob(`${exportBaseName()}.html`, new Blob([html], { type: 'text/html;charset=utf-8' }))
  toast.success(`${t('exported')} HTML`)
}

// 导出下拉菜单
const showExportMenu = ref(false)
const toggleExportMenu = () => { showExportMenu.value = !showExportMenu.value }
const closeExportMenu = () => { showExportMenu.value = false }

// 菜单外点击或按 Esc 时关闭（触屏与键盘可达）；Esc 同时关闭确认弹窗
const exportWrapRef = ref(null)
const onDocClickForExport = (e) => {
  if (showExportMenu.value && exportWrapRef.value && !exportWrapRef.value.contains(e.target)) {
    closeExportMenu()
  }
}
const onGlobalKeydown = (e) => {
  if (e.key !== 'Escape') return
  if (showExportMenu.value) closeExportMenu()
  if (confirmState.value.show) closeConfirm()
}
onMounted(() => {
  document.addEventListener('click', onDocClickForExport)
  document.addEventListener('keydown', onGlobalKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClickForExport)
  document.removeEventListener('keydown', onGlobalKeydown)
})

// 捕获编辑器实时渲染的 HTML（导出用）
const onHtmlChanged = (h) => { latestHtml.value = h }

// ============ 保存到 GitHub ============
// 生成文件名：front matter 标题转 slug（保留中文），slug 为空时回退到时间戳
const generateFileName = () => {
  const now = new Date()
  const year = now.getFullYear().toString()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const date = getCurrentDate()
  const slug = postTitle.value
    ? postTitle.value.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\u4e00-\u9fa5-]/g, '') || `untitled-${Date.now()}`
    : 'untitled-' + Date.now()

  return `docs/posts/${year}/${month}/${date}-${slug}.md`
}

// 获取文件的SHA（已存在则更新，否则新建）
// 注意：仅 404 返回 null（文件不存在）；网络/权限等异常向上抛出，
// 避免误判为「新建」而对已存在文件做无 sha 的 PUT（GitHub 会返回 422）
const getFileSHA = async (path) => {
  const response = await ghFetch(`${repoContentsUrl(path)}?ref=${encodeURIComponent(effectiveBranch.value)}`, {
    method: 'GET',
    headers: {
      'Authorization': `token ${githubToken.value}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  })

  if (response.status === 404) {
    return null // 文件不存在
  }

  if (!response.ok) {
    throw new Error(`GitHub API ${response.status}`)
  }

  const data = await response.json()
  return data.sha
}

// 说明：GitHub Contents API 的 PUT 请求会自动创建多级路径中的中间目录，
// 无需（也不应）手工建目录——旧版的递归 .gitkeep 方案会污染提交历史并浪费 API 配额

// 保存到GitHub
const handleSave = async () => {
  if (isLogin.value !== 1) {
    toast.error(t('needLogin'))
    return
  }

  if (!postTitle.value || postTitle.value === '文章标题') {
    toast.error(t('fillTitle'))
    return
  }

  // 自定义路径白名单校验，防止写入仓库任意位置
  if (filePath.value && !isFilePathValid(filePath.value.trim())) {
    toast.error(t('invalidPath'))
    return
  }

  saveLoading.value = true
  const fileName = filePath.value ? filePath.value.trim() : generateFileName()

  try {
    // 检查文件是否已存在（GitHub Contents API 的 PUT 会自动创建多级目录）
    const sha = await getFileSHA(fileName)

    // 准备请求体
    const requestBody = {
      message: `${sha ? 'Update' : 'Add'} post: ${postTitle.value}`,
      content: utf8ToBase64(fileContent), // Base64编码
      branch: effectiveBranch.value
    }

    // 如果文件已存在，添加SHA
    if (sha) {
      requestBody.sha = sha
    }

    // 提交到GitHub
    const response = await ghFetch(repoContentsUrl(fileName), {
      method: 'PUT',
      headers: {
        'Authorization': `token ${githubToken.value}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const detail = await response.json().catch(() => ({}))
      console.error('保存文章失败:', detail)
      throw new Error(`GitHub API ${response.status}`)
    }

    toast.success(t('saved'))
    // 回填实际保存路径：避免之后改标题再保存时生成第二个文件
    filePath.value = fileName
    openPath.value = fileName
    loadRepoTree()
  } catch (error) {
    toast.error(`${t('saveFailed')}: ${error.message}`)
    console.error('保存失败:', error)
  } finally {
    saveLoading.value = false
  }
}
</script>

<template>
  <div class="editor">
    <!-- 顶栏：品牌 + 工具（文章标题直接在正文 front matter 的 title 字段中编辑） -->
    <header class="ed-topbar">
      <div class="ed-brand">
        <svg class="ed-logo" viewBox="0 0 64 64" width="22" height="22" aria-hidden="true">
          <rect x="4" y="4" width="56" height="56" rx="14" fill="url(#vpeGrad)" />
          <path d="M18 44V20h5l9 13 9-13h5v24h-6V30.5L32 42l-8-11.5V44z" fill="#fff" />
          <defs>
            <linearGradient id="vpeGrad" x1="0" y1="0" x2="64" y2="64">
              <stop offset="0" stop-color="#42d392" />
              <stop offset="1" stop-color="#3eaf7c" />
            </linearGradient>
          </defs>
        </svg>
        <span class="ed-name">ViteEditor</span>
        <a class="ed-back" :href="withBase('/guide/')" :title="t('tutorial')">{{ t('tutorial') }}</a>
      </div>
      <div class="ed-actions">
        <button class="ed-tool-btn" :class="{ active: showFiles }" @click="showFiles = !showFiles" :title="t('files')">
          <svg viewBox="0 0 24 24" width="15" height="15"><path fill="currentColor" d="M3 5h6v2H3V5m7 0h11v2H10V5M3 11h13v2H3v-2m14 0h4v2h-4v-2M3 17h6v2H3v-2m7 0h11v2H10v-2Z"/></svg>
          <span>{{ t('files') }}</span>
        </button>
        <button class="ed-tool-btn" :class="{ active: showCatalog }" @click="showCatalog = !showCatalog" :title="t('catalog')">
          <svg viewBox="0 0 24 24" width="15" height="15"><path fill="currentColor" d="M4 5h16v2H4V5m0 6h10v2H4v-2m0 6h16v2H4v-2Z"/></svg>
          <span>{{ t('catalog') }}</span>
        </button>
        <button class="ed-tool-btn" @click="triggerImport" :title="t('import')">
          <svg viewBox="0 0 24 24" width="15" height="15"><path fill="currentColor" d="M12 3a1 1 0 0 1 1 1v8.6l2.3-2.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L11 12.6V4a1 1 0 0 1 1-1ZM4 17a1 1 0 0 1 1 1v1h14v-1a1 1 0 1 1 2 0v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1a1 1 0 0 1 1-1Z"/></svg>
          <span>{{ t('import') }}</span>
        </button>
        <div class="ed-export-wrap" ref="exportWrapRef">
          <button class="ed-tool-btn" @click="toggleExportMenu" :title="t('export')"
            aria-haspopup="menu" :aria-expanded="showExportMenu">
            <svg viewBox="0 0 24 24" width="15" height="15"><path fill="currentColor" d="M12 16a1 1 0 0 1-.7-.3l-4-4a1 1 0 1 1 1.4-1.4L11 12.6V4a1 1 0 1 1 2 0v8.6l2.3-2.3a1 1 0 1 1 1.4 1.4l-4 4A1 1 0 0 1 12 16ZM4 17a1 1 0 0 1 1 1v1h14v-1a1 1 0 1 1 2 0v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1a1 1 0 0 1 1-1Z"/></svg>
            <span>{{ t('export') }}</span>
          </button>
          <transition name="ed-fade">
            <div v-if="showExportMenu" class="ed-export-menu">
              <button @click="exportMarkdown(); closeExportMenu()">{{ t('exportMd') }}</button>
              <button @click="exportHtmlFile(); closeExportMenu()">{{ t('exportHtml') }}</button>
            </div>
          </transition>
        </div>
        <button class="ed-tool-btn" :class="{ active: previewMode }" @click="togglePreviewMode" :title="t('preview')">
          <svg viewBox="0 0 24 24" width="15" height="15"><path fill="currentColor" d="M12 5c5 0 9.3 3 11 7-1.7 4-6 7-11 7s-9.3-3-11-7c1.7-4 6-7 11-7Zm0 2c-3.8 0-7.2 2.1-8.8 5 1.6 2.9 5 5 8.8 5s7.2-2.1 8.8-5c-1.6-2.9-5-5-8.8-5Zm0 1.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Zm0 2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"/></svg>
          <span>{{ t('preview') }}</span>
        </button>
        <button class="ed-tool-btn" @click="handleNewDoc" :title="t('newDoc')">
          <svg viewBox="0 0 24 24" width="15" height="15"><path fill="currentColor" d="M12 4a1 1 0 0 1 1 1v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 1 1 0-2h6V5a1 1 0 0 1 1-1Z"/></svg>
          <span>{{ t('newDoc') }}</span>
        </button>
        <div class="ed-sep"></div>
        <button class="ed-tool-btn icon-only" @click="toggleTheme" :title="t('theme')" :aria-label="t('theme')">
          <svg v-if="!isDark" viewBox="0 0 24 24" width="15" height="15"><path fill="currentColor" d="M12 18a6 6 0 1 1 0-12 6 6 0 0 1 0 12Zm0-14a1 1 0 0 1-1-1V1a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1Zm0 20a1 1 0 0 1-1-1v-2a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1ZM4.2 5.6 5.6 7A1 1 0 1 1 4.2 8.4L2.8 7A1 1 0 0 1 4.2 5.6Zm14.2 14.2 1.4 1.4a1 1 0 1 1-1.4 1.4l-1.4-1.4a1 1 0 1 1 1.4-1.4ZM1 12a1 1 0 0 1 1-1h2a1 1 0 1 1 0 2H2a1 1 0 0 1-1-1Zm19 0a1 1 0 0 1 1-1h2a1 1 0 1 1 0 2h-2a1 1 0 0 1-1-1ZM4.2 18.4A1 1 0 1 1 5.6 17l1.4 1.4a1 1 0 1 1-1.4 1.4l-1.4-1.4ZM18.4 4.2A1 1 0 1 1 17 5.6L15.6 4.2a1 1 0 1 1 1.4-1.4l1.4 1.4Z"/></svg>
          <svg v-else viewBox="0 0 24 24" width="15" height="15"><path fill="currentColor" d="M10.5 2.6a.7.7 0 0 0-1-.7A10 10 0 1 0 22.1 14.5a.7.7 0 0 0-.7-1A8 8 0 0 1 10.5 2.6Z"/></svg>
        </button>
        <button class="ed-tool-btn icon-only lang-btn" @click="toggleLocale" :title="t('language')" :aria-label="t('language')">
          <span>{{ localeLabel }}</span>
        </button>
      </div>
    </header>

    <!-- 第二行：GitHub 连接区 -->
    <div class="ed-ghbar">
      <div class="ed-gh-status" :class="['st' + isLogin]">
        <span class="ed-dot"></span>
        <span>{{ loginStatusText }}</span>
      </div>
      <button v-if="isLogin === 1" class="ed-gh-disconnect" :title="t('disconnect')" @click="handleDisconnect">
        {{ t('disconnect') }}
      </button>
      <input type="password" class="ed-gh-input ed-token" :placeholder="t('token')" v-model="githubToken"
        :title="t('token') + '（sessionStorage）'" autocomplete="off">
      <input type="text" class="ed-gh-input" :placeholder="t('username')" v-model="username" :title="t('username')">
      <input type="text" class="ed-gh-input" :placeholder="t('repo')" v-model="repoName" :title="t('repo')">
      <input type="text" class="ed-gh-input ed-branch" :placeholder="t('branchDefault')" v-model="branch" :title="t('branch')">
      <input type="text" class="ed-gh-input ed-gh-path" :placeholder="t('filePath')" v-model="filePath"
        :title="t('filePathTip')">
      <div class="ed-gh-spacer"></div>
      <button class="ed-btn connect-btn" @click="handleLogin" :disabled="loginLoading">
        <span v-if="!loginLoading">{{ t('connect') }}</span>
        <span v-else>{{ t('connecting') }}</span>
      </button>
      <button class="ed-save-btn" @click="handleSave" :disabled="saveLoading">
        <svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M5 3h11l3 3v15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm2 2v4h8V5H7Zm5 6a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"/></svg>
        <span v-if="!saveLoading">{{ t('save') }}</span>
        <span v-else>{{ t('saving') }}</span>
      </button>
    </div>

    <!-- 主区域：文件树 + 编辑器 + 目录 -->
    <div class="ed-main">
      <transition name="ed-slide">
        <aside v-show="showFiles" class="ed-side">
          <div class="ed-side-head">
            <span class="ed-side-title">{{ t('repoFiles') }}</span>
            <div class="ed-side-tools">
              <button class="ed-icon-btn" @click="loadRepoTree" :title="t('refresh')" :aria-label="t('refresh')"
                :class="{ spinning: filesLoading }">
                <svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7Z"/></svg>
              </button>
              <button class="ed-icon-btn" @click="showFiles = false" :title="t('collapse')" :aria-label="t('collapse')">
                <svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="m10.7 12 3.6 3.6-1.4 1.4L7.9 12l5-5 1.4 1.4-3.6 3.6Z"/></svg>
              </button>
            </div>
          </div>
          <div class="ed-side-filter">
            <input type="text" v-model="fileFilter" :placeholder="t('searchPlaceholder')">
          </div>
          <div class="ed-side-body">
            <!-- 搜索结果（扁平） -->
            <template v-if="filteredPosts">
              <div v-for="f in filteredPosts" :key="f.path" class="ed-file" role="button" tabindex="0"
                :class="{ current: openPath === f.path }" :title="f.path"
                @click="openRepoFile(f)" @keydown.enter.prevent="openRepoFile(f)">
                <span class="ed-file-icon">📄</span>
                <span class="ed-file-name">{{ f.name }}</span>
                <span class="ed-file-path">{{ f.path }}</span>
                <button class="ed-file-del" :title="t('deleteTitle')" :aria-label="t('deleteTitle')" @click.stop="requestDeleteFile(f)">✕</button>
              </div>
              <div v-if="!filteredPosts.length" class="ed-empty">{{ t('noMatch') }}</div>
            </template>
            <!-- 目录树 -->
            <template v-else>
              <div v-for="node in postsTree" :key="node.path" class="ed-tree-row" :style="{ paddingLeft: 8 + node.depth * 14 + 'px' }">
                <div v-if="!node.isFile" class="ed-dir" role="button" tabindex="0"
                  @click="toggleDir(node)" @keydown.enter.prevent="toggleDir(node)">
                  <span class="ed-caret" :class="{ open: !node.collapsed }">▸</span>
                  <span class="ed-dir-icon">📁</span>
                  <span class="ed-file-name">{{ node.name }}</span>
                </div>
                <div v-else class="ed-file" role="button" tabindex="0"
                  :class="{ current: openPath === node.path }" :title="node.path"
                  @click="openRepoFile(node)" @keydown.enter.prevent="openRepoFile(node)">
                  <span class="ed-file-icon">📄</span>
                  <span class="ed-file-name">{{ node.name }}</span>
                  <button class="ed-file-del" :title="t('deleteTitle')" :aria-label="t('deleteTitle')" @click.stop="requestDeleteFile(node)">✕</button>
                </div>
              </div>
              <div v-if="!postsTree.length" class="ed-empty">
                {{ isLogin === 1 ? t('noPosts') : t('noLogin') }}
              </div>

              <!-- 图片目录 -->
              <div class="ed-img-head">
                <span class="ed-side-title">{{ t('imageGallery') }}</span>
                <span class="ed-img-count">{{ repoFiles.images.length }}</span>
              </div>
              <div v-if="repoFiles.images.length" class="ed-img-grid">
                <button v-for="img in repoFiles.images" :key="img.path" class="ed-img-item"
                  :title="`${img.name} ${t('insertImageTip')}`" @click="insertRepoImage(img)">
                  <img :src="repoImageToRawUrl(img.path)" :alt="img.name" loading="lazy">
                  <span class="ed-img-name">{{ img.name }}</span>
                </button>
              </div>
              <div v-else class="ed-empty">{{ t('noImages') }}</div>
            </template>
          </div>
        </aside>
      </transition>

      <div class="ed-editor-area">
        <MdEditor ref="editorRef" :id="editorId" v-model="content" :theme="theme"
          :placeholder="t('startWriting')" @onUploadImg="customUpload" @onHtmlChanged="onHtmlChanged" />
      </div>

      <!-- 实时成品预览：跟随输入实时渲染发布后的博客页面效果 -->
      <transition name="ed-slide-left">
        <div v-show="previewMode" class="ed-live-preview">
          <div class="ed-live-preview-head">
            <h1 class="ed-preview-title">{{ postTitle || t('postTitle') }}</h1>
            <div class="ed-preview-meta">
              <span v-if="previewMeta.date" class="ed-chip date">{{ t('publishedIn') }} · {{ previewMeta.date }}</span>
              <span v-for="c in previewMeta.categories" :key="'c-' + c" class="ed-chip">{{ c }}</span>
              <span v-for="tg in previewMeta.tags" :key="'t-' + tg" class="ed-chip tag">#{{ tg }}</span>
            </div>
            <p v-if="previewMeta.description" class="ed-preview-desc">{{ previewMeta.description }}</p>
          </div>
          <div v-if="previewCoverValid" class="ed-preview-cover">
            <img :src="previewCoverSrc" :alt="previewMeta.title">
          </div>
          <div class="ed-live-preview-body">
            <div class="vp-doc ed-preview-doc">
              <!-- onHtmlChanged：预览模式下编辑器内置预览已收起，由本组件接管 HTML 快照（导出用） -->
              <MdPreview :model-value="previewMarkdown" :theme="theme" @onHtmlChanged="onHtmlChanged" />
            </div>
          </div>
        </div>
      </transition>

      <transition name="ed-slide">
        <aside v-show="showCatalog" class="ed-catalog-panel">
          <div class="ed-side-head">
            <span class="ed-side-title">{{ t('catalog') }}</span>
            <div class="ed-side-tools">
              <button class="ed-icon-btn" @click="showCatalog = false" :title="t('collapse')" :aria-label="t('collapse')">
                <svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="m13.3 12-3.6-3.6 1.4-1.4 5 5-5 5-1.4-1.4 3.6-3.6Z"/></svg>
              </button>
            </div>
          </div>
          <div class="ed-catalog-body">
            <MdCatalog :editor-id="editorId" :theme="theme" :scroll-element="`#${editorId}-preview-wrapper`" />
          </div>
        </aside>
      </transition>
    </div>

    <!-- 隐藏的导入输入框 -->
    <input type="file" accept=".md,.markdown,.txt" ref="importInputRef" style="display: none" @change="handleImportFile">

    <!-- 通用确认弹窗 -->
    <transition name="ed-fade">
      <div v-if="confirmState.show" class="ed-modal-mask" @click.self="closeConfirm">
        <div class="ed-modal" role="dialog" aria-modal="true" :class="{ danger: confirmState.danger }">
          <h3>{{ confirmState.title }}</h3>
          <p>{{ confirmState.text }}</p>
          <div class="ed-modal-actions">
            <button class="ed-btn" @click="closeConfirm">{{ t('cancel') }}</button>
            <button class="ed-btn primary" :class="{ danger: confirmState.danger }" @click="handleConfirmOk">{{ t('ok') }}</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
/* ===== 整体布局：占满全屏（配合 custom.css 中 body.vpe-fullscreen 规则） ===== */
.editor {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  overflow: hidden;
}

/* ===== 顶栏 ===== */
.ed-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 14px;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  flex-wrap: wrap;
}

.ed-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.ed-name {
  font-weight: 700;
  font-size: 15px;
  letter-spacing: 0.2px;
  background: linear-gradient(120deg, var(--vp-c-brand-1), var(--vp-c-brand-2, var(--vp-c-brand-light)));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.ed-back {
  font-size: 12px;
  color: var(--vp-c-text-3);
  text-decoration: none;
  border: 1px solid var(--vp-c-divider);
  border-radius: 99px;
  padding: 2px 10px;
  transition: all 0.2s;
}

.ed-back:hover {
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}

.ed-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.ed-tool-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 30px;
  padding: 0 10px;
  font-size: 13px;
  color: var(--vp-c-text-2);
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.ed-tool-btn:hover {
  color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-soft);
}

.ed-tool-btn.active {
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}

.ed-tool-btn.icon-only {
  padding: 0 8px;
}

.ed-tool-btn.lang-btn span {
  font-size: 12px;
  font-weight: 700;
}

.ed-sep {
  width: 1px;
  height: 18px;
  background: var(--vp-c-divider);
  margin: 0 4px;
}

.ed-export-wrap {
  position: relative;
}

.ed-export-menu {
  position: absolute;
  top: 34px;
  right: 0;
  min-width: 170px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  box-shadow: var(--vp-shadow-3, 0 8px 24px rgba(0, 0, 0, 0.15));
  padding: 4px;
  z-index: 60;
}

.ed-export-menu button {
  display: block;
  width: 100%;
  text-align: left;
  padding: 8px 12px;
  font-size: 13px;
  color: var(--vp-c-text-1);
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.ed-export-menu button:hover {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-brand-1);
}

/* ===== GitHub 连接栏 ===== */
.ed-ghbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  flex-wrap: wrap;
}

.ed-gh-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 99px;
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-3);
  flex-shrink: 0;
}

.ed-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--vp-c-text-3);
}

.ed-gh-status.st1 {
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}

.ed-gh-status.st1 .ed-dot {
  background: var(--vp-c-brand-1);
  box-shadow: 0 0 6px var(--vp-c-brand-1);
}

.ed-gh-status.st2 {
  color: #f56c6c;
  border-color: #f56c6c;
}

.ed-gh-status.st2 .ed-dot {
  background: #f56c6c;
}

.ed-gh-disconnect {
  height: 24px;
  padding: 0 8px;
  font-size: 11px;
  color: var(--vp-c-text-3);
  background: transparent;
  border: 1px solid var(--vp-c-divider);
  border-radius: 99px;
  cursor: pointer;
  transition: all 0.15s;
}

.ed-gh-disconnect:hover {
  color: #f56c6c;
  border-color: #f56c6c;
}

.ed-gh-input {
  font-size: 13px;
  height: 30px;
  width: 110px;
  padding: 0 10px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  color: var(--vp-c-text-1);
  outline: none;
  transition: border-color 0.2s;
}

.ed-gh-input:focus {
  border-color: var(--vp-c-brand-1);
}

.ed-gh-path {
  width: 180px;
}

.ed-token {
  width: 180px;
}

.ed-branch {
  width: 74px;
}

.ed-btn {
  height: 30px;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 500;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

/* 连接 GitHub：品牌色弱底次级按钮，与右侧实心渐变的保存按钮区分 */
.ed-btn.connect-btn {
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  border-color: transparent;
}

.ed-btn.connect-btn:hover:not(:disabled) {
  color: #fff;
  background: var(--vp-c-brand-1);
}

.ed-btn:hover:not(:disabled) {
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}

.ed-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.ed-gh-spacer {
  flex: 1;
}

.ed-save-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 16px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, var(--vp-c-brand-1), var(--vp-c-brand-2, var(--vp-c-brand-light)));
  border: none;
  border-radius: 6px;
  cursor: pointer;
  box-shadow: 0 2px 8px var(--vp-c-brand-soft);
  transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
}

.ed-save-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px var(--vp-c-brand-soft);
}

.ed-save-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* ===== 主区域 ===== */
.ed-main {
  display: flex;
  flex: 1;
  min-height: 0;
}

/* 左侧文件树 */
.ed-side {
  width: 260px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  min-height: 0;
}

.ed-side-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px 4px;
}

.ed-side-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-3);
  letter-spacing: 0.5px;
}

.ed-side-tools {
  display: flex;
  gap: 2px;
}

.ed-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: var(--vp-c-text-3);
  background: transparent;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.15s;
}

.ed-icon-btn:hover {
  color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-soft);
}

.ed-icon-btn.spinning svg {
  animation: vpe-spin 1s linear infinite;
}

@keyframes vpe-spin {
  to { transform: rotate(360deg); }
}

.ed-side-filter {
  padding: 4px 10px 8px;
}

.ed-side-filter input {
  width: 100%;
  height: 28px;
  font-size: 12px;
  padding: 0 10px;
  background: var(--vp-c-bg-soft);
  border: 1px solid transparent;
  border-radius: 6px;
  color: var(--vp-c-text-1);
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.ed-side-filter input:focus {
  border-color: var(--vp-c-brand-1);
}

.ed-side-body {
  flex: 1;
  overflow-y: auto;
  padding: 0 6px 12px;
}

.ed-tree-row {
  min-width: 0;
}

.ed-dir {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  font-size: 13px;
  color: var(--vp-c-text-2);
  border-radius: 5px;
  cursor: pointer;
  user-select: none;
}

.ed-dir:hover {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}

.ed-caret {
  display: inline-block;
  transition: transform 0.15s;
  color: var(--vp-c-text-3);
  font-size: 11px;
}

.ed-caret.open {
  transform: rotate(90deg);
}

.ed-file {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  font-size: 13px;
  color: var(--vp-c-text-1);
  border-radius: 5px;
  cursor: pointer;
  min-width: 0;
}

.ed-file:hover {
  background: var(--vp-c-bg-soft);
}

.ed-file.current {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}

.ed-file-icon {
  font-size: 11px;
  flex-shrink: 0;
}

.ed-file-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ed-file-path {
  flex: 1;
  font-size: 11px;
  color: var(--vp-c-text-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: right;
}

.ed-file-del {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  display: none;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: var(--vp-c-text-3);
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.ed-file:hover .ed-file-del {
  display: inline-flex;
}

.ed-file-del:hover {
  color: #f56c6c;
  background: rgba(245, 108, 108, 0.12);
}

.ed-empty {
  padding: 16px 10px;
  font-size: 12px;
  color: var(--vp-c-text-3);
  text-align: center;
}

/* 图片区 */
.ed-img-head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 10px 4px;
  border-top: 1px solid var(--vp-c-divider);
  margin-top: 10px;
}

.ed-img-count {
  font-size: 11px;
  color: var(--vp-c-text-3);
  background: var(--vp-c-bg-soft);
  border-radius: 99px;
  padding: 0 8px;
}

.ed-img-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
  padding: 6px 4px;
}

.ed-img-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px;
  background: var(--vp-c-bg-soft);
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.15s, transform 0.15s;
}

.ed-img-item:hover {
  border-color: var(--vp-c-brand-1);
  transform: translateY(-1px);
}

.ed-img-item img {
  width: 100%;
  height: 44px;
  object-fit: cover;
  border-radius: 4px;
  background: var(--vp-c-bg);
}

.ed-img-name {
  font-size: 10px;
  color: var(--vp-c-text-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 编辑器主体（column 布局让 md-editor 撑满剩余高度；预览面板为 ed-main 的并列子项） */
.ed-editor-area {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: var(--vp-c-bg);
}

.ed-editor-area :deep(.md-editor) {
  flex: 1;
  min-height: 0;
  --md-bk-color: var(--vp-c-bg);
}

.ed-editor-area :deep(.md-editor[data-theme='dark']) {
  --md-bk-color: var(--vp-c-bg);
}

/* 右侧目录 */
.ed-catalog-panel {
  width: 230px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  min-height: 0;
}

.ed-catalog-body {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px 12px;
}

.ed-catalog-body :deep(.md-editor-catalog) {
  --md-bk-color: var(--vp-c-bg);
}

/* ===== 确认弹窗 ===== */
.ed-modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
}

.ed-modal {
  width: 90%;
  max-width: 400px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
}

.ed-modal h3 {
  margin: 0 0 10px;
  font-size: 16px;
  color: var(--vp-c-text-1);
}

.ed-modal.danger h3 {
  color: #f56c6c;
}

.ed-modal p {
  margin: 0 0 18px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
  word-break: break-all;
}

.ed-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.ed-btn.primary {
  color: #fff;
  background: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}

.ed-btn.primary.danger {
  background: #f56c6c;
  border-color: #f56c6c;
}

/* ===== 实时成品预览面板（ed-main 的并列子项，高度自动撑满） ===== */
.ed-live-preview {
  width: 420px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  min-height: 0;
  overflow-y: auto;
}

.ed-live-preview-head {
  padding: 18px 20px 12px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.ed-preview-title {
  margin: 0 0 10px;
  font-size: 22px;
  line-height: 1.3;
  letter-spacing: -0.3px;
  color: var(--vp-c-text-1);
}

.ed-preview-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.ed-chip {
  font-size: 11px;
  padding: 2px 10px;
  border-radius: 99px;
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-soft);
}

.ed-chip.tag {
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-soft);
  background: var(--vp-c-brand-soft);
}

.ed-preview-desc {
  margin: 10px 0 0;
  font-size: 13px;
  color: var(--vp-c-text-3);
  line-height: 1.6;
}

.ed-preview-cover {
  margin: 14px 20px 0;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--vp-c-divider);
}

.ed-preview-cover img {
  display: block;
  width: 100%;
  max-height: 260px;
  object-fit: cover;
}

.ed-live-preview-body {
  flex: 1;
  padding: 8px 20px 32px;
}

/* MdPreview 融入面板：背景透明、使用站点文档排版 */
.ed-live-preview-body :deep(.md-editor-previewOnly) {
  --md-bk-color: transparent;
  background: transparent;
}

.ed-live-preview-body :deep(.md-editor-previewOnly[data-theme='dark']) {
  --md-bk-color: transparent;
  background: transparent;
}

.ed-preview-doc {
  max-width: none;
}

.ed-slide-left-enter-active,
.ed-slide-left-leave-active {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.ed-slide-left-enter-from,
.ed-slide-left-leave-to {
  transform: translateX(12px);
  opacity: 0;
}

@media (max-width: 900px) {
  .ed-live-preview {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 86%;
    z-index: 50;
    box-shadow: 0 0 24px rgba(0, 0, 0, 0.2);
  }

  .ed-main {
    position: relative;
  }
}

/* ===== 过渡动画 ===== */
.ed-fade-enter-active,
.ed-fade-leave-active {
  transition: opacity 0.18s ease;
}

.ed-fade-enter-from,
.ed-fade-leave-to {
  opacity: 0;
}

.ed-slide-enter-active,
.ed-slide-leave-active {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.ed-slide-enter-from,
.ed-slide-leave-to {
  transform: translateX(-12px);
  opacity: 0;
}

/* ===== 小屏适配 ===== */
@media (max-width: 900px) {
  .ed-side,
  .ed-catalog-panel {
    position: absolute;
    top: 0;
    bottom: 0;
    z-index: 50;
    box-shadow: 0 0 24px rgba(0, 0, 0, 0.2);
  }

  .ed-side {
    left: 0;
  }

  .ed-catalog-panel {
    right: 0;
  }

  .ed-main {
    position: relative;
  }

  .ed-gh-path {
    display: none;
  }

  .ed-token {
    width: 160px;
  }
}
</style>
