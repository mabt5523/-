<template>
  <view class="page">
    <!-- 顶部栏 -->
    <view class="header">

      <text class="title">课后习题</text>

      <!-- 右上角：题目列表按钮 -->
      <view class="right" @click="goToQuestionList">
        <view class="list-btn">
          <text class="list-icon">📋</text>
          <view v-if="selectedIds.length" class="badge">{{ selectedIds.length }}</view>
        </view>
      </view>
    </view>


    <!-- ✅ 消息/题目区（中间滚动） -->
    <scroll-view class="list" scroll-y>
      <view v-for="(m, idx) in messages" :key="m.mid || idx" class="msg">
        <!-- 用户消息 -->
        <view v-if="m.role === 'user'" class="bubble user">
          <view class="bubble-head">
            <view class="tag-user">我</view>
            <text class="time" v-if="m.time">{{ m.time }}</text>
          </view>
          <text class="content">{{ m.content }}</text>
        </view>

        <!-- 普通 AI 文本（说明、解析等） -->
        <view v-else-if="!m.q" class="bubble">
          <view class="bubble-head">
            <view class="tag-ai">AI</view>
            <text class="time" v-if="m.time">{{ m.time }}</text>
          </view>
          <text class="content">{{ m.content }}</text>
        </view>

        <!-- ✅ 单题卡片（每道题=一张卡） -->
        <view v-else class="q-card">
          <view class="q-card-top">
            <!-- 左上角选择框 -->
            <view
              class="pick"
              :class="{ picked: isPicked(m.qid) }"
              @click.stop="togglePick(m)"
            >
              <text v-if="isPicked(m.qid)" class="pick-tick">✓</text>
            </view>

            <view class="q-meta">
              <view class="q-type">{{ m.q.typeText }}</view>
              <text class="q-hint">点击左上角可加入题目列表</text>
            </view>


          </view>

          <text class="q-stem">{{ m.q.stem }}</text>
		  <!-- ✅ 每题答案：显示在题干下、选项上 -->
		  <view v-if="m.q.answerKeys && m.q.answerKeys.length" class="answer-bar">
		    <text class="answer-label">答案：</text>
		    <text class="answer-value">{{ m.q.answerKeys.join('、') }}</text>
		  </view>


          <view
            v-for="opt in m.q.options"
            :key="opt.key"
            class="q-option"
            :class="{ correct: isCorrectOption(m.q, opt.key) }"
          >
            <text class="k" :class="{ correct: isCorrectOption(m.q, opt.key) }">{{ opt.key }}</text>
            <text class="t" :class="{ correct: isCorrectOption(m.q, opt.key) }">{{ opt.text }}</text>
          </view>


        </view>
      </view>

      <view v-if="!messages.length" class="empty">
        <text class="empty-text">暂无内容，先用下方输入框生成题目。</text>
      </view>
    </scroll-view>

    <!-- ✅ 输入区（固定底部） -->
    <view class="input-bar">
      <input
        v-model="inputText"
        class="input"
        placeholder="输入指令生成题目：如 出3道单选+1道判断"
        @confirm="sendMessage"
      />
      <button class="send-btn" :disabled="sending" @click="sendMessage">
        {{ sending ? '生成中…' : '生成' }}
      </button>
    </view>


  </view>
</template>

<script>
export default {
  data() {
    return {
	  optionPickMap: {}, // qid -> Set/Array of picked option keys

      courseId: '',
      sessionId: 0,

      inputText: '',
      sending: false,
      messages: [],

      // ✅ 选中的题目（暂存到本地的“题目列表”）
      selectedIds: [],
      selectedMap: {}
    }
  },

  onLoad(options) {
    this.courseId = options.courseId || options.id || ''
    this.sessionId = Number(options.sessionId || 0)

    this.restoreSelectedFromStorage()

    this.messages = [
      this.buildTextMessage(
        'ai',
        '你好！这里是课后习题模式。你可以输入“出3道单选+1道判断”等指令来生成题目。'
      )
    ]
  },

  onUnload() {
    this.persistSelectedToStorage()
  },

  methods: {
	parseGlobalAnswerMap(fullText) {
	  const map = {}
	  const m = String(fullText || '').match(/^\s*[\[【]\s*ANSWER_KEY\s*[\]】]\s*(.+)$/gim)
	  if (!m || !m.length) return map
	
	  const line = m[m.length - 1] // 取最后一条答案行
	  const body = line.replace(/^\s*[\[【]\s*ANSWER_KEY\s*[\]】]\s*/i, '').trim()
	
	  // 匹配：1:B 2:ABC 3:A（支持空格/中文冒号）
	  const reg = /(\d+)\s*[:：]\s*([A-H对错]+)\b/gi
	  let mm
	  while ((mm = reg.exec(body)) !== null) {
	    const idx = Number(mm[1])
	    const raw = (mm[2] || '').trim()
	
	    // ✅ 关键：把 ABC 拆成 [A,B,C]；对/错保持原样
	    const arr = []
	    for (const ch of raw) {
	      if (/[A-H]/i.test(ch)) arr.push(ch.toUpperCase())
	      else if (ch === '对' || ch === '错') arr.push(ch)
	    }
	    map[idx] = Array.from(new Set(arr))
	  }
	
	  return map
	},


	isOptionPicked(qid, key) {
	  qid = String(qid)
	  const arr = this.optionPickMap[qid] || []
	  return arr.includes(String(key))
	},
	
	toggleOption(qid, key) {
	  qid = String(qid)
	  key = String(key)
	
	  const qMsg = this.messages.find(x => String(x.qid) === qid)
	  const qType = qMsg?.q?.type // Q_SINGLE / Q_MULTI / Q_JUDGE
	
	  const current = new Set(this.optionPickMap[qid] || [])
	
	  if (qType === 'Q_SINGLE' || qType === 'Q_JUDGE') {
	    // ✅ 单选/判断：点谁就只保留谁（再点一次可取消）
	    if (current.has(key)) {
	      current.clear()
	    } else {
	      current.clear()
	      current.add(key)
	    }
	  } else {
	    // ✅ 多选：可多选
	    if (current.has(key)) current.delete(key)
	    else current.add(key)
	  }
	
	  this.$set(this.optionPickMap, qid, Array.from(current))
	},

    // =========================
    // ✅ 8081 专用请求（明确写明 8081）
    // =========================
    teacherAiRequest({ url, method = 'GET', data = {}, header = {} }) {
      const TEACHER_AI_BASE_URL = 'http://81.70.62.177:8081'

      let token =
        uni.getStorageSync('token') ||
        uni.getStorageSync('access_token') ||
        uni.getStorageSync('TOKEN') ||
        ''

      token = String(token || '').trim()
      const bearer =
        token ? (token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`) : ''

      const fullUrl = TEACHER_AI_BASE_URL + url

      return new Promise((resolve, reject) => {
        uni.request({
          url: fullUrl,
          method,
          data,

          // ✅ 如果后端用 cookie/session，这个必须开（H5 尤其）
          withCredentials: true,

          header: {
            'Content-Type': 'application/json',

            ...(bearer ? { Authorization: bearer } : {}),

            // ✅ 有些后端用 token / accessToken / X-Token，不认 Authorization
            ...(token ? { token } : {}),
            ...(token ? { accessToken: token } : {}),
            ...(token ? { 'X-Token': token } : {}),

            ...header
          },

          success: (res) => {
            console.log('[8081] status=', res.statusCode)
            console.log('[8081] req token len=', token ? token.length : 0)
            console.log('[8081] set-cookie=', res.header && (res.header['set-cookie'] || res.header['Set-Cookie']))
            console.log('[8081] body=', res.data)

            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(res.data)
              return
            }
            reject(res)
          },

          fail: (err) => reject(err)
        })
      })
    },

    // =========================
    // 导航
    // =========================
    goBack() {
      uni.navigateBack()
    },
	goToQuestionList() {
	  uni.navigateTo({
	    url: `/pages/teacher/question_list?courseId=${encodeURIComponent(this.courseId)}&sessionId=${encodeURIComponent(this.id || 0)}`
	  })
	},




    // =========================
    // 基础工具
    // =========================
    genMid() {
      return 'm_' + Date.now() + '_' + Math.random().toString(16).slice(2)
    },

    formatTime(ts) {
      const d = new Date(ts)
      const hh = String(d.getHours()).padStart(2, '0')
      const mm = String(d.getMinutes()).padStart(2, '0')
      return `${hh}:${mm}`
    },

    sanitizeAIMarkdown(text) {
      if (!text) return ''
      let s = String(text)
    
      s = s.replace(/\*\*(.+?)\*\*/g, '$1')
      s = s.replace(/^\s*[\[【](OK|WRONG)[\]】]\s*/i, '')
    
      return s.trim()
    },
	extractAnswerKey(blockText) {
	  const lines = String(blockText || '').split('\n')
	  let answerLine = ''
	  const kept = []
	
	  for (const line of lines) {
	    if (/^\s*[\[【]\s*ANSWER_KEY\s*[\]】]/i.test(line) || /^\s*(答案|参考答案)\s*[:：]/.test(line)) {
	      answerLine = line
	    } else {
	      kept.push(line)
	    }
	  }
	
	  const keys = []
	
	  if (answerLine) {
	    // ✅ 如果是“1:C 2:B 3:A”这种全局答案行：本题不要在这里解析（交给全局映射）
	    if (/\d+\s*[:：]\s*([A-H]|对|错)/i.test(answerLine)) {
	      return { cleanedText: kept.join('\n').trim(), answerKeys: [] }
	    }
	
	    // ✅ 单题答案：C / A,B / 对/错
	    const m = answerLine.match(/\b([A-H])\b/gi)
	    if (m && m.length) m.forEach(x => keys.push(x.toUpperCase()))
	    if (!keys.length) {
	      if (answerLine.includes('对')) keys.push('对')
	      if (answerLine.includes('错')) keys.push('错')
	    }
	  }
	
	  return { cleanedText: kept.join('\n').trim(), answerKeys: Array.from(new Set(keys)) }
	},





    // =========================
    // ✅ “多题拆分”核心
    // =========================
    splitAiReplyToChunks(reply) {
      const text = this.sanitizeAIMarkdown(reply || '')
      if (!text) return []

      // 统一成 \n
      const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

      // 找到每个题目标签出现的位置
      const reg = /(^|\n)\s*[\[【](Q_SINGLE|Q_MULTI|Q_JUDGE)[\]】]\s*/gi
      const matches = []
      let m
      while ((m = reg.exec(normalized)) !== null) {
        matches.push({ index: m.index + (m[1] ? m[1].length : 0) }) // 标签开头位置
      }

      // 没有题目标签：整段作为普通文本
      if (matches.length === 0) return [{ kind: 'text', text: normalized.trim() }]

      // 可能在第一题标签之前还有说明文字
      const chunks = []
      const firstIdx = matches[0].index
      const prefix = normalized.slice(0, firstIdx).trim()
      if (prefix) chunks.push({ kind: 'text', text: prefix })

      // 把每道题切出来
      for (let i = 0; i < matches.length; i++) {
        const start = matches[i].index
        const end = i === matches.length - 1 ? normalized.length : matches[i + 1].index
        const part = normalized.slice(start, end).trim()
        if (part) chunks.push({ kind: 'q_or_text', text: part })
      }

      return chunks
    },

    parseQuestion(textWithTag) {
      if (!textWithTag) return null
      const text = String(textWithTag).trim()
    
      const tagMatch = text.match(/^\s*[\[【](Q_SINGLE|Q_MULTI|Q_JUDGE)[\]】]\s*/i)
      if (!tagMatch) return null
    
      const tag = tagMatch[1].toUpperCase()
      let body = text.replace(tagMatch[0], '').trim()
    
      // ✅ 提取答案键 + 删除答案行（不展示）
      const { cleanedText, answerKeys } = this.extractAnswerKey(body)
      body = cleanedText
    
      const lines = body.split('\n').map(s => s.trim()).filter(Boolean)
    
      const optionLineReg = /^([A-H])[\.\、\)]\s*(.+)$/
      const stemLines = []
      const options = []
    
      for (const line of lines) {
        const mm = line.match(optionLineReg)
        if (mm) options.push({ key: mm[1].toUpperCase(), text: mm[2].trim() })
        else stemLines.push(line)
      }
    
      // ✅ 计算一个“可直接保存/展示”的 answer 字段
      let answer = ''
      if (tag === 'Q_MULTI') answer = (answerKeys || []).join('')              // 例如 ABC
      else answer = (answerKeys && answerKeys[0]) ? answerKeys[0] : ''         // 单选：B；判断：对/错
    
      if (tag === 'Q_JUDGE') {
        return {
          type: tag,
          typeText: '判断题',
          stem: stemLines.join('\n'),
          options: [
            { key: '对', text: '对' },
            { key: '错', text: '错' }
          ],
          answerKeys,
          answer
        }
      }
    
      if (options.length === 0) return null
    
      return {
        type: tag,
        typeText: tag === 'Q_SINGLE' ? '单选题' : '多选题',
        stem: stemLines.join('\n'),
        options,
        answerKeys,
        answer
      }
    },
	normalizeAnswerForList(q) {
	  if (!q) return ''
	
	  // 判断题：允许 A/B 或 对/错
	  if (q.type === 'Q_JUDGE') {
	    if (q.answer === 'A') return '对'
	    if (q.answer === 'B') return '错'
	    if (q.answer === '对' || q.answer === '错') return q.answer
	    // 兜底：如果 answerKeys 里有对/错
	    if (q.answerKeys && q.answerKeys.length) {
	      if (q.answerKeys.includes('对')) return '对'
	      if (q.answerKeys.includes('错')) return '错'
	    }
	    return ''
	  }
	
	  // 多选：ABC（去重排序）
	  if (q.type === 'Q_MULTI') {
	    let s = String(q.answer || (q.answerKeys || []).join('') || '').toUpperCase()
	    s = s.replace(/[^A-H]/g, '')
	    s = Array.from(new Set(s.split(''))).sort().join('')
	    return s
	  }
	
	  // 单选：A-H
	  const a = String(q.answer || (q.answerKeys && q.answerKeys[0]) || '').toUpperCase().trim()
	  return /^[A-H]$/.test(a) ? a : ''
	},


	isCorrectOption(q, key) {
	  if (!q) return false
	
	  const ans = this.normalizeAnswerForList(q)
	
	  // 判断题：key 是 “对/错”
	  if (q.type === 'Q_JUDGE') return ans && String(ans) === String(key)
	
	  // 多选：key 是 A/B/C...
	  if (q.type === 'Q_MULTI') return ans && String(ans).includes(String(key))
	
	  // 单选：key 是 A/B/C...
	  return ans && String(ans) === String(key)
	},



    genQid(qObj) {
      const base =
        `${qObj.type}|${qObj.stem}|` +
        (qObj.options || []).map(o => `${o.key}:${o.text}`).join('|')

      let hash = 0
      for (let i = 0; i < base.length; i++) {
        hash = (hash * 31 + base.charCodeAt(i)) >>> 0
      }
      return String(hash)
    },

    buildTextMessage(role, text) {
      return {
        mid: this.genMid(),
        role,
        content: String(text || '').trim(),
        time: this.formatTime(Date.now())
      }
    },

    buildQuestionMessage(qObj) {
      const qid = this.genQid(qObj)
      return {
        mid: this.genMid(),
        role: 'ai',
        content: '',
        q: qObj,
        qid,
        time: this.formatTime(Date.now())
      }
    },

    // 把 AI 一次回复拆成多条 messages（题目各自一个卡片）
    splitAiReplyToMessages(reply) {
      const full = String(reply || '')
    
      // ✅ 1) 先解析全局答案：1:C 2:B 3:A
      const globalMap = this.parseGlobalAnswerMap(full)
    
      // ✅ 2) 把全局 ANSWER_KEY 行从正文里删除，避免被“最后一题”吞掉
      const cleaned = full.replace(/^\s*[\[【]\s*ANSWER_KEY\s*[\]】].*$/gim, '').trim()
    
      // ✅ 3) 用清理后的文本去拆题
      const chunks = this.splitAiReplyToChunks(cleaned)
    
      const result = []
      let qIndex = 0
    
      for (const c of chunks) {
        if (c.kind === 'text') {
          if (c.text) result.push(this.buildTextMessage('ai', c.text))
          continue
        }
    
        const q = this.parseQuestion(c.text)
        if (q) {
          qIndex += 1
    
          // ✅ 4) 如果题内没有单题答案，就用全局答案分配
          if ((!q.answerKeys || !q.answerKeys.length) && globalMap && globalMap[qIndex]) {
            let ans = globalMap[qIndex] || []
          
            // ✅ 判断题：A=对，B=错（因为题干里是 A.对 B.错）
            if (q.type === 'Q_JUDGE') {
              ans = ans.map(x => (x === 'A' ? '对' : x === 'B' ? '错' : x))
            }
          
            q.answerKeys = ans
          }

    
          result.push(this.buildQuestionMessage(q))
        } else if (c.text) {
          result.push(this.buildTextMessage('ai', c.text))
        }
      }
    
      return result
    },



    // =========================
    // ✅ 题目选择（加入题目列表）
    // =========================
    storageKey() {
      return `TEACHER_QUESTION_DRAFT:${this.courseId || '0'}`
    },

    restoreSelectedFromStorage() {
      try {
        const raw = uni.getStorageSync(this.storageKey())
        if (!raw) return
        const data = JSON.parse(raw)
        this.selectedIds = Array.isArray(data.selectedIds) ? data.selectedIds : []
        this.selectedMap = data.selectedMap || {}
      } catch (e) {
        this.selectedIds = []
        this.selectedMap = {}
      }
    },

    persistSelectedToStorage() {
      try {
        uni.setStorageSync(
          this.storageKey(),
          JSON.stringify({
            selectedIds: this.selectedIds || [],
            selectedMap: this.selectedMap || {}
          })
        )
      } catch (e) {}
    },

    isPicked(qid) {
      return (this.selectedIds || []).includes(String(qid))
    },

    togglePick(msg) {
      if (!msg || !msg.q || !msg.qid) return
      const qid = String(msg.qid)

      const ids = new Set(this.selectedIds || [])
      if (ids.has(qid)) {
        ids.delete(qid)
        if (this.selectedMap) delete this.selectedMap[qid]
      } else {
        ids.add(qid)
        this.selectedMap = this.selectedMap || {}
        this.selectedMap[qid] = this.toEditableQuestion(msg)
      }

      this.selectedIds = Array.from(ids)
      this.persistSelectedToStorage()

      uni.showToast({
        title: this.isPicked(qid) ? '已加入题目列表' : '已移出题目列表',
        icon: 'none'
      })
    },

    toEditableQuestion(msg) {
      const q = msg.q
      return {
        qid: String(msg.qid),
        courseId: Number(this.courseId),
    
        // ✅ 关键：把会话ID带过去（从本页 this.sessionId）
        sessionId: Number(this.sessionId || 0),
    
        questionType: q.type,
        questionTypeText: q.typeText,
        stem: q.stem,
        options: (q.options || []).map(o => ({ key: o.key, text: o.text })),
        answer: this.normalizeAnswerForList(q),
        sourceText: '',
        addMethod: 'AI'
      }
    },



    // =========================
    // ✅ 生成题目（8081）
    // POST /api/teacher/ai/chat
    // =========================
    async sendMessage() {
      const msg = (this.inputText || '').trim()
      if (!msg) return
      if (!this.courseId) {
        uni.showToast({ title: '缺少 courseId', icon: 'none' })
        return
      }
      if (this.sending) return
      this.sending = true

      // 用户气泡
      this.messages.push(this.buildTextMessage('user', msg))
      this.inputText = ''

      // ✅ sessionId<=0 就不要传 sessionId 字段
      const payload = {
        courseId: Number(this.courseId),
        mode: 'QUESTION',
        message: msg
      }
      if (Number(this.sessionId) > 0) payload.sessionId = Number(this.sessionId)

      try {
        const res = await this.teacherAiRequest({
          url: '/api/teacher/ai/chat',
          method: 'POST',
          data: payload
        })

        const sid = res?.sessionId ?? res?.data?.sessionId
        if (sid) this.sessionId = Number(sid)

        const reply = res?.reply ?? res?.data?.reply
        const msgs = this.splitAiReplyToMessages(reply || '')
        this.messages.push(...msgs)
      } catch (e) {
        console.error('[8081] chat failed:', e)
        uni.showToast({ title: `请求失败：${e?.statusCode || ''}`, icon: 'none' })
      } finally {
        this.sending = false
      }
    },

    // =========================
    // ✅ 保存到后端题库（8081）
    // POST /api/teacher/question/ai/save
    // =========================
    async saveQuestionToBackend(msg) {
      if (!msg || !msg.q) return
      if (!this.courseId) {
        uni.showToast({ title: '缺少 courseId', icon: 'none' })
        return
      }

      const q = msg.q
      const payload = {
        teacherId: 0,
        courseId: Number(this.courseId),
        sessionId: Number(this.sessionId || 0),
        aiText: this.buildAiTextFromQ(q),
        questionType: this.mapQuestionType(q.type),
        addMethod: 'AI',
        sourceText: '',
        question: this.buildQuestionField(q),
        answer: ''
      }

      try {
        await this.teacherAiRequest({
          url: '/api/teacher/question/ai/save',
          method: 'POST',
          data: payload
        })
        uni.showToast({ title: '已保存到后端题库', icon: 'success' })
      } catch (e) {
        console.error('[8081] save ai question failed:', e)
        uni.showToast({ title: '保存失败（8081）', icon: 'none' })
      }
    },

    mapQuestionType(tag) {
      if (tag === 'Q_SINGLE') return 'SINGLE'
      if (tag === 'Q_MULTI') return 'MULTI'
      if (tag === 'Q_JUDGE') return 'JUDGE'
      return 'UNKNOWN'
    },

    buildAiTextFromQ(q) {
      const typeTag =
        q.type === 'Q_SINGLE' ? '[Q_SINGLE]' :
        q.type === 'Q_MULTI' ? '[Q_MULTI]' :
        q.type === 'Q_JUDGE' ? '[Q_JUDGE]' : '[Q]'

      const opts = (q.options || []).map(o => `${o.key}. ${o.text}`).join('\n')
      return `${typeTag}\n${q.stem}\n${opts}`.trim()
    },

    buildQuestionField(q) {
      const opts = (q.options || []).map(o => `${o.key}. ${o.text}`).join('\n')
      return `${q.stem}\n${opts}`.trim()
    }
  }
}
</script>

<style scoped>
page { 
  background: linear-gradient(180deg, #f8f9ff 0%, #edf2ff 100%); 
  background-attachment: fixed;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", sans-serif;
}
.page {
  min-height: 100vh;
  padding: 110rpx 0 0 0; /* 仅给顶部栏留空间，其他通过定位控制 */
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}


/* 顶部栏 - 优化视觉和交互 */
.header {
  position: fixed; 
  top: 0; /* 原来是 0，增加这个值让顶部栏整体下移，数值可根据需要调整 */
  left: 0; 
  right: 0;
  z-index: 99;
  height: 110rpx;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(12rpx);
  display: flex;
  align-items: center;
  padding: 0 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(79, 108, 255, 0.08);
  border-bottom: 1rpx solid rgba(79, 108, 255, 0.1);
  /* 适配状态栏 */
  padding-top: var(--status-bar-height, 0rpx);
  box-sizing: border-box;
}

/* 同时需要调整滚动列表的 top 值，保持和顶部栏的间距 */
.list {
  position: absolute;
  top: 110rpx; /* 原来的 110rpx + 顶部栏下移的 20rpx，保持列表在顶部栏下方 */
  left: 0; 
  right: 0;
  bottom: 100rpx;   
  padding: 24rpx;
  box-sizing: border-box;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  /* 优化滚动体验 */
  scrollbar-width: thin;
  scrollbar-color: rgba(79, 108, 255, 0.2) transparent;
}
.back {
  width: 60rpx; 
  height: 60rpx;
  border-radius: 50%;
  background: #ffffff;
  display: flex; 
  align-items: center; 
  justify-content: center;
  box-shadow: 0 4rpx 16rpx rgba(79, 108, 255, 0.15);
  transition: all 0.2s ease;
}
.back::before { 
  content: "←"; 
  color: #4f6cff; 
  font-size: 28rpx; 
  font-weight: 700;
}
.back:active {
  transform: scale(0.95);
  box-shadow: 0 2rpx 8rpx rgba(79, 108, 255, 0.15);
}

.title {
  margin: 0 auto;
  font-size: 34rpx;
  font-weight: 800;
  color: #1d2129;
  /* 渐变文字效果 */
  background: linear-gradient(90deg, #4f6cff, #6b86ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.right {
  position: absolute;
  right: 24rpx;
  width: 60rpx;
  height: 60rpx;
  display:flex;
  align-items:center;
  justify-content:center;
}
.list-btn {
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #4f6cff 0%, #6b86ff 100%);
  display:flex;
  align-items:center;
  justify-content:center;
  position: relative;
  box-shadow: 0 6rpx 20rpx rgba(79,108,255,0.25);
  transition: all 0.2s ease;
}
.list-btn:active {
  transform: scale(0.95);
  box-shadow: 0 3rpx 10rpx rgba(79,108,255,0.25);
}
.list-icon { 
  color:#fff; 
  font-size: 28rpx; 
}
.badge {
  position: absolute;
  top: -8rpx;
  right: -8rpx;
  min-width: 32rpx;
  height: 32rpx;
  padding: 0 8rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #ff4d4f 0%, #ff7a7a 100%);
  color: #fff;
  font-size: 20rpx;
  display:flex;
  align-items:center;
  justify-content:center;
  font-weight: 800;
  box-shadow: 0 4rpx 8rpx rgba(255, 77, 79, 0.2);
}

/* 列表区域 - 核心布局调整，确保初始内容在顶部 */
.list {
  position: absolute;
  top: 110rpx;      /* 紧贴顶部栏下方 */
  left: 0; 
  right: 0;
  bottom: 100rpx;   /* 给底部输入框留空间 */
  padding: 24rpx;
  box-sizing: border-box;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  /* 优化滚动体验 */
  scrollbar-width: thin;
  scrollbar-color: rgba(79, 108, 255, 0.2) transparent;
}
/* 滚动条美化 */
.list::-webkit-scrollbar {
  width: 4rpx;
}
.list::-webkit-scrollbar-thumb {
  background-color: rgba(79, 108, 255, 0.2);
  border-radius: 4rpx;
}
.list::-webkit-scrollbar-track {
  background: transparent;
}

.msg { 
  margin-bottom: 24rpx; 
  /* 消息渐入动画 */
  animation: msgFadeIn 0.3s ease forwards;
  opacity: 0;
}
/* 不同角色消息不同延迟 */
.msg:nth-child(odd) { animation-delay: 0.1s; }
.msg:nth-child(even) { animation-delay: 0.2s; }

@keyframes msgFadeIn {
  from { opacity: 0; transform: translateY(10rpx); }
  to { opacity: 1; transform: translateY(0); }
}

/* 普通气泡 - 视觉升级 */
.bubble {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 22rpx 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.06);
  border: 1rpx solid rgba(79, 108, 255, 0.1);
  position: relative;
  /* 轻微悬浮效果 */
  transition: transform 0.2s ease;
}
.bubble:hover {
  transform: translateY(-2rpx);
}
/* 用户气泡特殊样式 */
.bubble.user {
  background: linear-gradient(135deg, #4f6cff 0%, #6b86ff 100%);
  border: none;
  box-shadow: 0 8rpx 24rpx rgba(79, 108, 255, 0.2);
}
.bubble.user .content,
.bubble.user .time { 
  color: #fff; 
  text-shadow: 0 1rpx 2rpx rgba(0,0,0,0.1);
}
.bubble.user .tag-user {
  color: #fff;
  background: rgba(255,255,255,0.18);
}

.bubble-head {
  display:flex;
  align-items:center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}
.tag-ai {
  font-size: 22rpx;
  font-weight: 800;
  color: #10b981;
  background: rgba(16,185,129,0.12);
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  box-shadow: 0 2rpx 8rpx rgba(16,185,129,0.1);
}
.tag-user {
  font-size: 22rpx;
  font-weight: 800;
  color: #ffffff;
  background: rgba(255,255,255,0.12);
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
}
.time { 
  font-size: 22rpx; 
  color: #94a3b8; 
  letter-spacing: 0.5rpx;
}
.bubble.user .time {
  color: rgba(255,255,255,0.8);
}
.content {
  display:block;
  font-size: 26rpx;
  line-height: 1.7;
  color: #1d2129;
  white-space: pre-wrap;
  letter-spacing: 0.3rpx;
}

/* 题目卡片 - 大幅美化 */
.q-card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 24rpx;
  box-shadow: 0 10rpx 30rpx rgba(79,108,255,0.08);
  border: 1rpx solid rgba(79, 108, 255, 0.15);
  transition: all 0.2s ease;
}
.q-card:hover {
  transform: translateY(-4rpx);
  box-shadow: 0 12rpx 36rpx rgba(79,108,255,0.12);
}
.q-card-top {
  display:flex;
  align-items:flex-start;
  justify-content: space-between;
  gap: 12rpx;
  margin-bottom: 16rpx;
}
.pick {
  width: 40rpx;
  height: 40rpx;
  border-radius: 12rpx;
  border: 2rpx solid #c7d2fe;
  background: #f8f9ff;
  display:flex;
  align-items:center;
  justify-content:center;
  flex-shrink: 0;
  transition: all 0.2s ease;
  box-shadow: 0 2rpx 8rpx rgba(79,108,255,0.08);
}
.pick.picked {
  border-color: #4f6cff;
  background: linear-gradient(135deg, #eef2ff 0%, #dbe4ff 100%);
  box-shadow: 0 4rpx 12rpx rgba(79,108,255,0.15);
}
.pick-tick { 
  color: #4f6cff; 
  font-size: 24rpx; 
  font-weight: 900; 
}

.q-meta { flex: 1; }
.q-type {
  display:inline-flex;
  font-size: 22rpx;
  color: #4f6cff;
  font-weight: 900;
  background: linear-gradient(135deg, #eef2ff 0%, #dbe4ff 100%);
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  margin-bottom: 8rpx;
  box-shadow: 0 2rpx 8rpx rgba(79,108,255,0.1);
}
.q-hint {
  display:block;
  font-size: 22rpx;
  color: #94a3b8;
  letter-spacing: 0.3rpx;
}

.q-stem {
  display:block;
  font-size: 28rpx;
  color: #1d2129;
  line-height: 1.7;
  margin-bottom: 18rpx;
  white-space: pre-wrap;
  font-weight: 500;
}

/* 答案栏美化 */
.answer-bar{
  margin: 0 0 20rpx;
  padding: 12rpx 18rpx;
  border-radius: 16rpx;
  background: linear-gradient(135deg, rgba(79,108,255,0.10) 0%, rgba(79,108,255,0.15) 100%);
  border: 1rpx solid rgba(79,108,255,0.25);
  display:flex;
  align-items:center;
  gap: 12rpx;
  box-shadow: 0 2rpx 8rpx rgba(79,108,255,0.08);
}
.answer-label{
  font-size: 24rpx;
  font-weight: 800;
  color: #4f6cff;
}
.answer-value{
  font-size: 24rpx;
  color: #1d2129;
  font-weight: 700;
  letter-spacing: 0.5rpx;
}

/* 选项样式优化 */
.q-option{
  display:flex;
  align-items:flex-start;
  gap: 16rpx;
  padding: 18rpx;
  border-radius: 18rpx;
  border: 1rpx solid #e8ecff;
  background: #f8f9ff;
  margin-bottom: 12rpx;
  transition: all 0.2s ease;
}
.q-option:last-child {
  margin-bottom: 0;
}
.q-option:hover {
  transform: translateX(4rpx);
  box-shadow: 0 4rpx 12rpx rgba(79,108,255,0.08);
}
/* 正确答案选项高亮 */
.q-option.correct{
  border: 1rpx solid rgba(79,108,255,0.55);
  background: linear-gradient(135deg, rgba(79,108,255,0.16) 0%, rgba(79,108,255,0.08) 100%);
}

.k{
  width: 44rpx;
  height: 44rpx;
  border-radius: 12rpx;
  background: #e9eeff;
  color: #4f6cff;
  font-weight: 900;
  font-size: 24rpx;
  display:flex;
  align-items:center;
  justify-content:center;
  flex-shrink: 0;
  box-shadow: 0 2rpx 8rpx rgba(79,108,255,0.1);
}
/* 正确答案字母块高亮 */
.k.correct{
  background: linear-gradient(135deg, #4f6cff 0%, #6b86ff 100%);
  color: #ffffff;
  box-shadow: 0 4rpx 12rpx rgba(79,108,255,0.2);
}

.t{
  font-size: 26rpx;
  color: #1d2129;
  line-height: 1.6;
  flex: 1;
  letter-spacing: 0.3rpx;
}
.t.correct{
  color: #1a2b48;
  font-weight: 500;
}

/* 空状态美化 */
.empty { 
  padding: 80rpx 0; 
  text-align:center; 
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
}
.empty::before {
  content: '📝';
  font-size: 80rpx;
}
.empty-text { 
  color:#94a3b8; 
  font-size: 26rpx; 
  line-height: 1.6;
}

/* 输入框 - 固定在最底部，美化样式 */
.input-bar {
  position: fixed;
  left: 0; 
  right: 0;
  bottom: 0;          /* 完全固定在最底部 */
  z-index: 98;
  display:flex;
  align-items:center;
  gap: 16rpx;
  padding: 20rpx 24rpx;
  box-sizing: border-box;
  background: rgba(255,255,255,0.98);
  border-top: 1rpx solid rgba(79, 108, 255, 0.15);
  backdrop-filter: blur(12rpx);
  box-shadow: 0 -4rpx 20rpx rgba(79, 108, 255, 0.08);
}
.input {
  flex: 1;
  height: 88rpx;
  border-radius: 44rpx;
  padding: 0 28rpx;
  font-size: 26rpx;
  border: 1rpx solid rgba(79, 108, 255, 0.15);
  background: #ffffff;
  box-shadow: 0 4rpx 16rpx rgba(79, 108, 255, 0.08);
  transition: all 0.2s ease;
  outline: none;
}
.input:focus {
  border-color: #4f6cff;
  box-shadow: 0 0 0 6rpx rgba(79, 108, 255, 0.1);
}
.input::placeholder {
  color: #94a3b8;
  font-size: 24rpx;
  letter-spacing: 0.5rpx;
}
.send-btn {
  height: 88rpx;
  min-width: 140rpx;
  padding: 0 32rpx;
  border-radius: 44rpx;
  background: linear-gradient(135deg, #4f6cff 0%, #6b86ff 100%);
  color: #fff;
  font-size: 26rpx;
  font-weight: 700;
  box-shadow: 0 6rpx 20rpx rgba(79,108,255,0.25);
  transition: all 0.2s ease;
  border: none;
}
.send-btn:active {
  transform: scale(0.96);
  box-shadow: 0 3rpx 10rpx rgba(79,108,255,0.25);
}
.send-btn[disabled] { 
  opacity: 0.55; 
  transform: none;
  box-shadow: 0 3rpx 10rpx rgba(79,108,255,0.15);
}

/* 适配小屏设备 */
@media screen and (max-height: 667px) {
  .list {
    bottom: 90rpx !important;
  }
  .input-bar {
    padding: 16rpx 24rpx !important;
  }
  .input, .send-btn {
    height: 80rpx !important;
  }
  .q-card {
    padding: 20rpx !important;
  }
}

/* 暗黑模式适配（可选） */
@media (prefers-color-scheme: dark) {
  page {
    background: linear-gradient(180deg, #1e293b, #0f172a) !important;
  }
  .header, .input-bar {
    background: rgba(15, 23, 42, 0.98) !important;
    border-color: rgba(79, 108, 255, 0.25) !important;
  }
  .title {
    color: #f8fafc !important;
    -webkit-text-fill-color: #f8fafc !important;
  }
  .bubble, .q-card {
    background: #1e293b !important;
    border-color: rgba(79, 108, 255, 0.25) !important;
    color: #f8fafc !important;
  }
  .content, .q-stem, .t, .answer-value {
    color: #f8fafc !important;
  }
  .q-option {
    background: #1e293b !important;
    border-color: rgba(79, 108, 255, 0.2) !important;
  }
  .input {
    background: #1e293b !important;
    color: #f8fafc !important;
    border-color: rgba(79, 108, 255, 0.25) !important;
  }
  .input::placeholder {
    color: #94a3b8 !important;
  }
}
.page {
  min-height: 100vh;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;

  /* ✅ 顶部占位 = header基础高度 + 状态栏 */
  padding-top: calc(110rpx);
}

/* 顶部栏：总高度包含状态栏，内部内容不会被挤出去 */
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 99;

  /* ✅ 关键：别再让 padding-top 去“挤占”110rpx */
  height: calc(110rpx);


  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(12rpx);
  display: flex;
  align-items: center;

  padding-left: 24rpx;
  padding-right: 24rpx;

  box-shadow: 0 4rpx 20rpx rgba(79, 108, 255, 0.08);
  border-bottom: 1rpx solid rgba(79, 108, 255, 0.1);
  box-sizing: border-box;
}

/* ✅ 列表：top 必须跟 header 实际高度一致 */
.list {
  position: absolute;
  top: calc(110rpx);
  left: 0;
  right: 0;
  bottom: 100rpx;
  padding: 24rpx;
  box-sizing: border-box;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* 标题：如果你想“再上移一点点”，用 translate，不要改 top */
.title {
  margin: 0 auto;
  font-size: 34rpx;
  font-weight: 800;
  background: linear-gradient(90deg, #4f6cff, #6b86ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;

  /* ✅ 可选微调：让标题在 header 内更靠上/更居中 */
  transform: translateY(-8rpx);
}

/* 右侧按钮也可选微调 */
.right{
  position: absolute;
  right: 24rpx;

  /* ✅ 让它跟随状态栏，不会贴顶 */
  top: calc(20rpx);

  width: 60rpx;
  height: 60rpx;
  display:flex;
  align-items:center;
  justify-content:center;
}
</style>
