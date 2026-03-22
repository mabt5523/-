<template>
  <view class="page">
    <!-- 输入卡片 -->
    <view class="card">
      <view class="field">
        <text class="label">语言</text>
        <!-- ✅ 语言卡片选择 -->
        <view class="lang-grid">
          <view
            v-for="(item,index) in langOptions"
            :key="index"
            class="lang-item"
            :class="{active:langIndex===index}"
            @click="langIndex=index"
          >
            {{ item }}
          </view>
        </view>
      </view>

      <view class="field">
        <text class="label">需求描述</text>
        <textarea
          v-model="description"
          class="textarea"
          placeholder="例如：实现一个冒泡排序，包含 main 示例，打印排序前后数组"
          :maxlength="800"
        />
        <view class="counter">{{ (description || '').length }}/800</view>
      </view>

      <view class="actions">
        <view class="btn ghost" @click="fillDemo">填充示例</view>
        <view class="btn primary" :class="{ disabled: loading }" @click="submitGenerate">
          {{ loading ? '生成中…' : '开始生成' }}
        </view>
      </view>

      <text v-if="errorText" class="error-text">{{ errorText }}</text>
    </view>

    <!-- 结果 -->
    <view v-if="result" class="result-card">
      <view class="result-head">
        <text class="result-title">生成结果</text>
        <view class="pill pill-blue">{{ result.language || 'unknown' }}</view>
      </view>

      <!-- 操作区 -->
      <view class="code-head">
        <text class="code-title">代码</text>
        <view class="code-actions">
          <view class="mini-btn" @click="copyText(result.code)">复制代码</view>
          <view class="mini-btn ghost" @click="saveToFile">保存文件</view>
          <view class="mini-btn ghost" @click="clearResult">清空</view>
        </view>
      </view>

      <!-- 代码块（IDE风格 + 高亮） -->
      <view class="code-wrap">
        <view class="code-meta">
          <text class="meta-item">行数：{{ lineCount }}</text>
          <text class="meta-item">字符：{{ (result.code || '').length }}</text>
        </view>

        <scroll-view scroll-y class="code-scroll">
          <!-- 行号 + 高亮 -->
          <view class="code-line" v-for="(lineTokens, idx) in highlightedLines" :key="'ln_' + idx">
            <text class="ln">{{ idx + 1 }}</text>

            <!-- 每行 token -->
            <view class="tokens">
              <text
                v-for="(tk, j) in lineTokens"
                :key="'tk_' + idx + '_' + j"
                class="tk"
                :class="'tk-' + tk.type"
              >{{ tk.text }}</text>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <view class="bottom-space"></view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      langOptions: ['Java', 'Python', 'C', 'C++', 'JavaScript', 'TypeScript', 'Go', 'Rust'],
      langIndex: 0,

      description: '',
      constraints: '',

      loading: false,
      errorText: '',
      result: null
    }
  },

  computed: {
    selectedLang() {
      return String(this.langOptions[this.langIndex] || '').trim()
    },

    fileName() {
      const lang = this.selectedLang.toLowerCase()
      if (lang === 'java') return 'Main.java'
      if (lang === 'python') return 'main.py'
      if (lang === 'javascript') return 'main.js'
      if (lang === 'typescript') return 'main.ts'
      if (lang === 'go') return 'main.go'
      if (lang === 'rust') return 'main.rs'
      if (lang === 'c') return 'main.c'
      if (lang === 'c++' || lang === 'cpp') return 'main.cpp'
      return 'main.txt'
    },

    lineCount() {
      const s = String(this.result?.code || '')
      if (!s.trim()) return 0
      return s.split('\n').length
    },

    // ✅ 生成“每行 token 数组”，用于渲染 IDE 彩色高亮
    highlightedLines() {
      const code = String(this.result?.code || '')
      const lines = code.split('\n')
      const lang = this.selectedLang.toLowerCase()
      return lines.map(line => this.highlightLine(line, lang))
    }
  },

  methods: {
    onLangChange(e) {
      this.langIndex = Number(e.detail.value || 0)
    },

    fillDemo() {
      this.langIndex = 0
      this.description = '实现一个冒泡排序的代码'
      this.constraints = '单文件，可直接运行，包含 main 示例'
      this.result = null
      this.errorText = ''
    },

    clearResult() {
      this.result = null
      this.errorText = ''
    },

    copyText(text) {
      const t = String(text || '')
      if (!t.trim()) {
        uni.showToast({ title: '没有可复制内容', icon: 'none' })
        return
      }
      uni.setClipboardData({
        data: t,
        success: () => uni.showToast({ title: '已复制', icon: 'success' })
      })
    },

    async saveToFile() {
      const content = String(this.result?.code || '')
      if (!content.trim()) {
        uni.showToast({ title: '没有可保存的代码', icon: 'none' })
        return
      }

      // #ifdef H5
      try {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = this.fileName
        a.click()
        URL.revokeObjectURL(url)
        uni.showToast({ title: '已开始下载', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: '下载失败', icon: 'none' })
      }
      return
      // #endif

      // #ifndef H5
      try {
        const fs = uni.getFileSystemManager && uni.getFileSystemManager()
        if (!fs) {
          uni.showToast({ title: '当前环境不支持保存', icon: 'none' })
          return
        }
      
        const filePath = `${uni.env.USER_DATA_PATH}/${this.fileName}`
      
        fs.writeFile({
          filePath,
          data: content,
          encoding: 'utf8',
          success: () => {
            uni.showToast({ title: '已保存，可打开/分享', icon: 'success' })
      
            // ✅ App-Plus：直接打开文件（系统会弹出选择用哪个App打开）
            // #ifdef APP-PLUS
            plus.runtime.openFile(filePath, {}, (err) => {
              console.log('openFile err', err)
            })
            // #endif
      
            // ✅ 或者：打开分享面板（把文件分享出去/另存到文件管理）
            // uni.share({
            //   provider: 'system',
            //   type: 0,
            //   href: filePath,
            //   success: () => {},
            //   fail: () => {}
            // })
          },
          fail: () => uni.showToast({ title: '保存失败', icon: 'none' })
        })
      } catch (e) {
        uni.showToast({ title: '保存失败', icon: 'none' })
      }
      // #endif
    },

    // ===== 8081 请求工具 =====
    getBase8081() {
      return 'http://81.70.62.177:8081'
    },

    getBearerToken() {
      const token = String(uni.getStorageSync('token') || '').trim()
      if (!token) return ''
      return token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`
    },

    request8081({ path, method = 'GET', data = null }) {
      const url = this.getBase8081() + path
      const bearer = this.getBearerToken()

      return new Promise((resolve, reject) => {
        uni.request({
          url,
          method,
          data,
          timeout: 60000,
          header: {
            ...(bearer ? { Authorization: bearer } : {}),
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          success: (res) => {
            if (res.statusCode >= 200 && res.statusCode < 300) resolve(res.data || {})
            else reject(res)
          },
          fail: (err) => reject(err)
        })
      })
    },

    normalizeCodeFromData(d) {
      const lines = Array.isArray(d?.code_lines) ? d.code_lines : null
      if (lines && lines.length) return lines.map(x => (x == null ? '' : String(x))).join('\n')

      const lines2 = Array.isArray(d?.codeLines) ? d.codeLines : null
      if (lines2 && lines2.length) return lines2.map(x => (x == null ? '' : String(x))).join('\n')

      return String(d?.code || '')
    },

    async submitGenerate() {
      if (this.loading) return
      this.errorText = ''
      this.result = null

      const language = this.selectedLang
      const description = String(this.description || '').trim()
      const constraints = String(this.constraints || '').trim()

      if (!description) {
        this.errorText = '请先输入需求描述'
        return
      }

      try {
        this.loading = true
        const res = await this.request8081({
          path: '/api/ai/code/generate',
          method: 'POST',
          data: { language, description, constraints }
        })

        if (!res || typeof res !== 'object') {
          this.errorText = '服务端返回异常'
          return
        }
        if (res.code !== 0) {
          this.errorText = res.msg || '生成失败'
          return
        }

        const d = res.data || {}
        const codeText = this.normalizeCodeFromData(d)

        this.result = {
          language: d.language || language || 'unknown',
          message: d.message || '',
          code: codeText
        }

        if (!String(this.result.code || '').trim()) {
          this.errorText = '生成成功，但返回的 code_lines 为空'
        }
      } catch (e) {
        const msg =
          e?.data?.msg ||
          e?.data?.message ||
          e?.errMsg ||
          e?.message ||
          '网络错误，请稍后再试'
        this.errorText = String(msg)
      } finally {
        this.loading = false
      }
    },

    // =========================
    // ✅ 轻量“IDE风格”语法高亮（跨端）
    // 说明：不是完整解析器，但对 Java/C/JS/Python 足够像 IDE
    // =========================
    highlightLine(line, lang) {
      const tokens = []

      // 1) 先把注释切出来（简单处理：// 或 #）
      let commentIndex = -1
      if (lang === 'python') {
        commentIndex = line.indexOf('#')
      } else {
        commentIndex = line.indexOf('//')
      }

      let codePart = line
      let commentPart = ''
      if (commentIndex >= 0) {
        codePart = line.slice(0, commentIndex)
        commentPart = line.slice(commentIndex)
      }

      // 2) 对 codePart 做 token
      const codeTokens = this.tokenizeCode(codePart, lang)
      tokens.push(...codeTokens)

      // 3) commentPart 整段一个 token
      if (commentPart) tokens.push({ type: 'comment', text: commentPart })

      // 4) 保证空行还能占位（避免行高塌陷）
      if (tokens.length === 0) tokens.push({ type: 'plain', text: '' })

      return tokens
    },

    tokenizeCode(text, lang) {
      const out = []
      const s = String(text || '')

      // 关键字（按语言做一个集合）
      const kw = this.getKeywordSet(lang)

      // 简单状态机：扫描字符串/数字/标识符/符号/空白
      let i = 0
      while (i < s.length) {
        const ch = s[i]

        // whitespace
        if (ch === ' ' || ch === '\t') {
          let j = i
          while (j < s.length && (s[j] === ' ' || s[j] === '\t')) j++
          out.push({ type: 'ws', text: s.slice(i, j) })
          i = j
          continue
        }

        // string: "..." or '...'
        if (ch === '"' || ch === "'") {
          const quote = ch
          let j = i + 1
          while (j < s.length) {
            if (s[j] === '\\') { j += 2; continue }
            if (s[j] === quote) { j++; break }
            j++
          }
          out.push({ type: 'string', text: s.slice(i, j) })
          i = j
          continue
        }

        // number
        if (/[0-9]/.test(ch)) {
          let j = i
          while (j < s.length && /[0-9._]/.test(s[j])) j++
          out.push({ type: 'number', text: s.slice(i, j) })
          i = j
          continue
        }

        // identifier / keyword
        if (/[A-Za-z_]/.test(ch)) {
          let j = i
          while (j < s.length && /[A-Za-z0-9_]/.test(s[j])) j++
          const word = s.slice(i, j)
          if (kw.has(word)) out.push({ type: 'kw', text: word })
          else if (this.looksLikeType(word, lang)) out.push({ type: 'type', text: word })
          else out.push({ type: 'ident', text: word })
          i = j
          continue
        }

        // operators / punctuation
        // 合并一些常见双字符运算符
        const two = s.slice(i, i + 2)
        const twoOps = new Set(['==','!=','<=','>=','&&','||','++','--','->','=>','::','+=','-=','*=','/=','%='])
        if (twoOps.has(two)) {
          out.push({ type: 'op', text: two })
          i += 2
          continue
        }

        // single char
        out.push({ type: 'op', text: ch })
        i += 1
      }
      return out
    },

    getKeywordSet(lang) {
      const common = [
        'if','else','for','while','do','switch','case','break','continue','return','try','catch','finally','throw',
        'new','class','public','private','protected','static','final','void','import','package','extends','implements',
        'true','false','null','this','super','const','let','var','function','async','await','yield',
      ]

      const java = [
        'interface','enum','throws','synchronized','volatile','transient','abstract','native','strictfp',
        'instanceof'
      ]

      const py = [
        'def','lambda','elif','in','is','not','and','or','None','True','False','from','as','with','pass','raise',
        'global','nonlocal','assert','del','except'
      ]

      const go = ['func','struct','map','range','defer','go','select','chan','package','import','interface']
      const rs = ['fn','let','mut','impl','trait','enum','match','pub','crate','use','mod','where','self','Self']

      let list = common
      if (lang === 'java') list = common.concat(java)
      else if (lang === 'python') list = py
      else if (lang === 'go') list = common.concat(go)
      else if (lang === 'rust') list = common.concat(rs)

      return new Set(list)
    },

    looksLikeType(word, lang) {
      const w = String(word || '')
      const basic = new Set(['int','long','short','byte','float','double','char','boolean','String','Object','List','Map'])
      const py = new Set(['str','int','float','bool','list','dict','set','tuple'])
      const go = new Set(['int','int64','float64','string','bool','byte','rune','error'])
      const rs = new Set(['i32','i64','u32','u64','usize','String','bool','char','Vec'])

      if (lang === 'python') return py.has(w)
      if (lang === 'go') return go.has(w)
      if (lang === 'rust') return rs.has(w)
      return basic.has(w) || /^[A-Z][A-Za-z0-9_]*$/.test(w) // Java 类名/类型名
    }
  }
}
</script>

<style scoped>
.page{
  min-height: 100vh;
  background: linear-gradient(180deg, #f5f7ff 0%, #ffffff 100%);
  padding: 28rpx 24rpx;
}

/* input card */
.card{
  background:#fff;
  border-radius: 20rpx;
  padding: 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.05);
}
.field{ margin-bottom: 22rpx; }
.label{
  display:block;
  font-size: 26rpx;
  font-weight: 800;
  color:#334155;
  margin-bottom: 12rpx;
}
.picker{
  height: 84rpx;
  border-radius: 18rpx;
  border: 1rpx solid rgba(79,108,255,0.2);
  background: linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%);
  padding: 0 22rpx;
  display:flex;
  align-items:center;
  justify-content: space-between;
}
.picker-text{ font-size: 28rpx; color:#111827; }
.picker-arrow{ color:#94a3b8; font-size: 26rpx; }

.textarea{
  width: 100%;
  min-height: 140rpx;
  border-radius: 18rpx;
  border: 1rpx solid rgba(79,108,255,0.2);
  background: #fbfcff;
  padding: 18rpx 20rpx;
  font-size: 26rpx;
  line-height: 1.6;
  box-sizing: border-box;
}
.counter{
  margin-top: 10rpx;
  font-size: 22rpx;
  color:#94a3b8;
  text-align:right;
}

/* actions */
.actions{
  display:flex;
  gap: 16rpx;
  margin-top: 10rpx;
}
.btn{
  flex:1;
  height: 86rpx;
  border-radius: 18rpx;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size: 28rpx;
  font-weight: 800;
}
.btn.primary{
  background: linear-gradient(135deg, #4f6cff 0%, #6b86ff 100%);
  color:#fff;
  box-shadow: 0 10rpx 26rpx rgba(79,108,255,0.25);
}
.btn.ghost{
  background:#fff;
  color:#4f6cff;
  border: 2rpx solid #e5e9ff;
}
.btn.disabled{ opacity: .55; pointer-events:none; }

.error-text{
  margin-top: 18rpx;
  padding: 14rpx 16rpx;
  font-size: 24rpx;
  color:#ff4d4f;
  background: rgba(255,77,79,0.08);
  border: 1rpx solid rgba(255,77,79,0.25);
  border-radius: 16rpx;
}

/* result */
.result-card{
  margin-top: 18rpx;
  background:#fff;
  border-radius: 20rpx;
  padding: 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.05);
}
.result-head{
  display:flex;
  align-items:center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}
.result-title{
  font-size: 30rpx;
  font-weight: 900;
  color:#1d2129;
}
.pill{
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 900;
}
.pill-blue{ background: rgba(79,108,255,0.12); color:#4f6cff; }

/* code head */
.code-head{
  display:flex;
  align-items:center;
  justify-content: space-between;
  margin-bottom: 10rpx;
}
.code-title{
  font-size: 26rpx;
  font-weight: 900;
  color:#111827;
}
.code-actions{
  display:flex;
  gap: 12rpx;
}
.mini-btn{
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #4f6cff 0%, #6b86ff 100%);
  color:#fff;
  font-size: 22rpx;
  font-weight: 900;
}
.mini-btn.ghost{
  background:#fff;
  color:#4f6cff;
  border: 2rpx solid #e5e9ff;
}

/* IDE code block */
.code-wrap{
  border-radius: 18rpx;
  overflow: hidden;
  border: 1rpx solid rgba(79,108,255,0.2);
  background: #0b1020;
}
.code-meta{
  display:flex;
  justify-content: space-between;
  padding: 12rpx 16rpx;
  border-bottom: 1rpx solid rgba(255,255,255,0.06);
}
.meta-item{
  font-size: 22rpx;
  color: rgba(229,231,235,0.75);
}
.code-scroll{
  max-height: 56vh;
  padding: 10rpx 0;
}

/* line layout */
.code-line{
  display:flex;
  flex-direction: row;
  align-items:flex-start;
  padding: 0 18rpx;
}
.ln{
  width: 76rpx;
  text-align: right;
  padding-right: 16rpx;
  color: rgba(148,163,184,0.65);
  font-size: 22rpx;
  line-height: 1.8;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace;
  user-select: none;
}
.tokens{
  flex: 1;
  display:flex;
  flex-wrap: wrap;
  align-items:flex-start;
}
.tk{
  font-size: 24rpx;
  line-height: 1.8;
  white-space: pre;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace;
}

/* token colors (IDE-like) */
.tk-ws{ color: transparent; }          /* 空格用透明文字保留宽度 */
.tk-plain{ color: #e5e7eb; }
.tk-ident{ color: #e5e7eb; }
.tk-kw{ color: #8b5cf6; font-weight: 800; }      /* 关键字 紫 */
.tk-type{ color: #60a5fa; font-weight: 800; }    /* 类型 蓝 */
.tk-number{ color: #f59e0b; }                     /* 数字 橙 */
.tk-string{ color: #34d399; }                     /* 字符串 绿 */
.tk-comment{ color: rgba(148,163,184,0.8); font-style: italic; } /* 注释 灰 */
.tk-op{ color: #93c5fd; }                         /* 运算符 淡蓝 */

.bottom-space{ height: 40rpx; }
/* =========================
   语言选择（卡片式）
========================= */

.lang-grid{
  display:flex;
  flex-wrap:wrap;
  gap:14rpx;
}

.lang-item{
  padding:14rpx 24rpx;
  border-radius:999rpx;
  background:#eef2ff;
  font-size:24rpx;
  font-weight:700;
  color:#4f6cff;
  transition:all .2s ease;
}

.lang-item.active{
  background:linear-gradient(135deg,#4f6cff,#6b86ff);
  color:#fff;
  box-shadow:0 6rpx 18rpx rgba(79,108,255,.35);
}

.lang-item:active{
  transform:scale(.96);
}
</style>