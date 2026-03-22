<template>
  <view class="page">
    <!-- 顶部栏 -->
    <view class="header">
      <text class="title">题目列表</text>

      <view class="right">
        <view class="top-actions">
          <!-- 手动新增按钮 - 改为加号图标 -->
          <button class="ghost-btn" @click="addManualQuestion" :title="'手动新增'">
            <text class="icon">➕</text>
          </button>
          
          <!-- 上传全部按钮 - 改为上传图标，上传中显示加载状态 -->
          <button class="saveall-btn" :disabled="savingAll || !list.length" @click="saveAllToBackend" :title="savingAll ? '上传中…' : '上传全部'">
            <text class="icon">{{ savingAll ? '⏳' : '📤' }}</text>
          </button>
        </view>
      </view>
    </view>

    <!-- 顶部信息 -->
    <view class="info-card">
      
      <view class="hint">
        <text>默认只读，点“修改”进入编辑，点“完成”保存本地。</text>
      </view>
    </view>

    <!-- 列表 -->
    <scroll-view class="list" scroll-y>
      <view v-if="!list.length" class="empty">
        <text class="empty-text">暂无题目。请回到上一页选择题目，或点击右上角“手动新增”。</text>
      </view>

      <view
        v-for="(q, idx) in list"
        :key="q.qid"
        class="q-card"
        :style="cardStyle(idx)"
        @touchstart.stop="onDragStart($event, idx)"
        @touchmove.stop="onDragMove($event, idx)"
        @touchend.stop="onDragEnd($event, idx)"
      >
        <!-- 顶部：拖拽 + 类型 + 操作 -->
        <view class="q-top">
          <view class="drag-handle">≡</view>

          <view class="q-meta">
            <view class="type-row">
              <text class="type-pill">{{ typeText(q.questionType) }}</text>

              <!-- 仅编辑态允许切换题型 -->
              <picker
                v-if="q.editing"
                class="type-picker"
                :range="typePickerRange"
                range-key="label"
                :value="typePickerIndex(q.questionType)"
                @change="e => changeType(idx, e.detail.value)"
              >
                <view class="type-change">切换题型 ▾</view>
              </picker>
            </view>

            <text class="sub">
              来源：{{ q.addMethod || 'MANUAL' }}
              <text v-if="q.saved" class="saved-tag">已保存</text>
              <text v-else class="unsaved-tag">未保存</text>
            </text>
          </view>

          <view class="q-actions">
            <button class="mini-btn ghost" @click.stop="toggleEdit(idx)">
              {{ q.editing ? '取消' : '修改' }}
            </button>

            <button v-if="q.editing" class="mini-btn" @click.stop="finishEdit(idx)">
              完成
            </button>


            <button class="mini-btn danger" @click.stop="removeOne(idx)">
              删除
            </button>
          </view>
        </view>

        <!-- 题干 -->
        <view class="block">
          <text class="block-title">题干</text>

          <!-- 只读 -->
          <view v-if="!q.editing" class="readonly-text">
            <text>{{ q.stem || '（未填写题干）' }}</text>
          </view>

          <!-- 编辑 -->
          <textarea
            v-else
            class="textarea"
            v-model="q.stem"
            placeholder="请输入题干…"
            auto-height
            @input="markDirty(idx)"
          />
        </view>

        <!-- 选项 -->
        <view class="block">
          <view class="block-head">
            <text class="block-title">选项</text>
            <button v-if="q.editing" class="tiny-btn" @click.stop="addOption(idx)">+ 选项</button>
          </view>

          <!-- 只读 -->
          <view v-if="!q.editing">
            <view v-for="(opt, oi) in q.options" :key="opt.key + '_' + oi" class="opt-read">
              <text class="opt-read-k">{{ opt.key }}</text>
              <text class="opt-read-t">{{ opt.text }}</text>
            </view>
          </view>

          <!-- 编辑 -->
          <view v-else>
            <view v-for="(opt, oi) in q.options" :key="opt.key + '_' + oi" class="opt-row">
              <view class="opt-key">{{ opt.key }}</view>
              <input
                class="opt-input"
                v-model="opt.text"
                placeholder="选项内容…"
                @input="markDirty(idx)"
              />
              <button class="opt-del" @click.stop="removeOption(idx, oi)">删</button>
            </view>
          </view>

          <view v-if="!q.options || !q.options.length" class="opt-empty">
            <text>暂无选项（判断题会自动使用 对/错）。</text>
          </view>
        </view>

        <!-- 答案 -->
        <view class="block">
          <text class="block-title">答案</text>

          <!-- 只读 -->
          <view v-if="!q.editing" class="readonly-answer">
            <text class="readonly-answer-text">
              {{ q.answer ? `正确答案：${q.answer}` : '（未设置答案）' }}
            </text>
          </view>

          <!-- 编辑：单选 -->
          <view v-else-if="q.questionType === 'Q_SINGLE'" class="answer-wrap">
            <picker
              :range="q.options.map(o => o.key)"
              :value="singleAnswerIndex(q)"
              @change="e => setSingleAnswer(idx, e.detail.value)"
            >
              <view class="answer-picker">
                <text class="ans-label">正确选项：</text>
                <text class="ans-value">{{ q.answer || '请选择' }}</text>
                <text class="ans-arrow">▾</text>
              </view>
            </picker>
          </view>

          <!-- 编辑：多选（可多选选择） -->
          <view v-else-if="q.questionType === 'Q_MULTI'" class="answer-wrap">
            <view class="multi-choices">
              <checkbox-group
                :value="multiAnswerArray(q)"
                @change="e => setMultiAnswer(idx, e.detail.value)"
              >
                <label
                  v-for="opt in q.options"
                  :key="opt.key"
                  class="multi-choice"
                >
                  <checkbox
                    :value="opt.key"
                    :checked="multiAnswerArray(q).includes(opt.key)"
                  />
                  <text class="multi-choice-text">{{ opt.key }}</text>
                </label>
              </checkbox-group>
            </view>
          
            <text class="ans-tip">已选：{{ q.answer || '（未选择）' }}</text>
          </view>


          <!-- 编辑：判断 -->
          <view v-else-if="q.questionType === 'Q_JUDGE'" class="answer-wrap">
            <picker
              :range="['对', '错']"
              :value="judgeAnswerIndex(q)"
              @change="e => setJudgeAnswer(idx, e.detail.value)"
            >
              <view class="answer-picker">
                <text class="ans-label">正确答案：</text>
                <text class="ans-value">{{ q.answer || '请选择' }}</text>
                <text class="ans-arrow">▾</text>
              </view>
            </picker>
          </view>

          <!-- 编辑：其他 -->
          <view v-else class="answer-wrap">
            <input class="answer-input" v-model="q.answer" placeholder="答案…" @input="markDirty(idx)" />
          </view>
        </view>
      </view>

      <view style="height: 40rpx;"></view>
    </scroll-view>
  </view>
</template>

<script>
import request from '@/common/request.js'
export default {
  data() {
    return {
      courseId: '',
      sessionId: 0,
	  list: [],
	  savingAll: false,
	        
	  loading: false,
	  errorMsg: '',


      
            

      // drag state
      draggingIndex: -1,
      dragStartY: 0,
      dragOffsetY: 0,
      itemH: 0,
      lastTouchY: 0,

      typePickerRange: [
        { value: 'Q_SINGLE', label: '单选题' },
        { value: 'Q_MULTI', label: '多选题' },
        { value: 'Q_JUDGE', label: '判断题' }
      ]
    }
  },

  onLoad(options) {
    this.courseId = options.courseId || options.id || ''
    this.sessionId = Number(options.sessionId || 0)
  
    if (!this.sessionId && this.courseId) {
      const sid = uni.getStorageSync(`AI_SESSION:${this.courseId}`)
      this.sessionId = Number(sid || 0)
    }
  
    this.itemH = uni.upx2px(420)
  
    // ✅ 先把草稿读出来（这是“选中的题”来源）
    const draft = this.readDraftFromStorage()
  
    this.loadQuestionsFromBackend()
      .then(() => {
        // 1) 本地 dirty 覆盖后端（你已有）
        this.mergeLocalDraft(draft)
  
        // 2) 把后端没有的“本地选题”追加显示（你要的效果）
        this.mergeBackendWithLocalSelected(draft)
  
        // 3) 可选：缓存到 LIST_CACHE（别写回 DRAFT）
        this.persistToStorage()
      })
      .catch(() => {
        // 后端失败：也要能看到本地选题
        this.list = []
        this.mergeBackendWithLocalSelected(draft)
        this.persistToStorage()
      })
  },


  onUnload() {
    this.persistToStorage()
  },

  methods: {
	draftKey() {
	  return `TEACHER_QUESTION_DRAFT:${this.courseId || '0'}`
	},
	cacheKey() {
	  return `TEACHER_QUESTION_LIST_CACHE:${this.courseId || '0'}`
	},

	storageKey() {
	  return `TEACHER_QUESTION_DRAFT:${this.courseId || '0'}`
	},
	
	readDraftFromStorage() {
	  try {
	    const raw = uni.getStorageSync(this.draftKey())
	    if (!raw) return { selectedIds: [], selectedMap: {} }
	    const data = JSON.parse(raw)
	    return {
	      selectedIds: Array.isArray(data.selectedIds) ? data.selectedIds : [],
	      selectedMap: data.selectedMap || {}
	    }
	  } catch (e) {
	    return { selectedIds: [], selectedMap: {} }
	  }
	},

	mergeLocalDraft(draft) {
	  try {
	    const ids = draft.selectedIds || []
	    const map = draft.selectedMap || {}
	
	    const localDirtyMap = {}
	    ids.forEach(id => {
	      const q = map[String(id)]
	      if (q && q.dirty) localDirtyMap[String(q.qid)] = q
	    })
	
	    this.list = this.list.map(q => {
	      const local = localDirtyMap[String(q.qid)]
	      return local ? { ...this.normalizeQuestionForList(local), editing: false } : q
	    })
	  } catch (e) {}
	},
	
	mergeBackendWithLocalSelected(draft) {
	  const { selectedIds, selectedMap } = draft
	
	  const backendIndex = new Map()
	  this.list.forEach((q, i) => backendIndex.set(String(q.qid), i))
	
	  const appended = []
	
	  for (const id of selectedIds) {
	    const localRaw = selectedMap[String(id)]
	    if (!localRaw) continue
	
	    const localQ = this.normalizeQuestionForList(localRaw)
	    const key = String(localQ.qid)
	
	    if (backendIndex.has(key)) {
	      const idx = backendIndex.get(key)
	      if (localQ.dirty) {
	        this.list[idx] = { ...this.list[idx], ...localQ, editing: false }
	      }
	    } else {
	      appended.push({
	        ...localQ,
	        saved: false,
	        dirty: true,
	        editing: false
	      })
	    }
	  }
	
	  // 想让本地选的排前面
	  this.list = [...appended, ...this.list]
	},

	async loadQuestionsFromBackend() {
	  if (!this.courseId) {
	    this.errorMsg = '缺少 courseId'
	    return
	  }
	
	  this.loading = true
	  this.errorMsg = ''
	
	  try {
	    // ✅ 接口写法完全对齐你下面那份：GET + params.course_id
	    const res = await request({
	      url: '/api/student/questions',   // ⬅️ 你后端实际接口如果不是这个，改成你的
	      method: 'GET',
	      params: { course_id: this.courseId },
	      data: { course_id: this.courseId }
	    })
	
	    const arr =
	      Array.isArray(res) ? res :
	      (Array.isArray(res?.data) ? res.data :
	      (Array.isArray(res?.list) ? res.list : []))
	
	    // ✅ 把后端题目转换成你现在 list 需要的结构
	    this.list = arr.map((item, idx) => this.normalizeBackendQuestion(item, idx))
	

	  } catch (e) {
	    console.error('[loadQuestionsFromBackend] failed:', e)
	    this.errorMsg = e?.data?.message || e?.message || e?.errMsg || '接口异常'
	    throw e
	  } finally {
	    this.loading = false
	  }
	},
	normalizeBackendQuestion(item, idx) {
	  // 后端一般是 single/multi/judge（你下方课后习题就是这样）
	  const rawType = String(item?.questionType || '').trim()
	
	  const uiType =
	    rawType === 'multi' ? 'Q_MULTI' :
	    rawType === 'judge' ? 'Q_JUDGE' : 'Q_SINGLE'
	
	  const questionText = String(item?.question || item?.stem || '').replace(/\r\n/g, '\n')
	  const parsed = this.parseStemAndOptions(questionText)
	
	  // judge 题：强制 A/B=对/错
	  let options = parsed.options
	  let answer = String(item?.answer || '').trim()
	
	  if (uiType === 'Q_JUDGE') {
	    options = [
	      { key: 'A', text: '对' },
	      { key: 'B', text: '错' }
	    ]
	    // 你的编辑页里判断题展示用“对/错”，所以这里转一下
	    if (answer === 'A') answer = '对'
	    if (answer === 'B') answer = '错'
	  }
	
	  // 生成稳定 qid：优先用后端 id（最稳）
	  const qid = String(item?.id || item?.qid || this.genQid({ questionType: uiType, stem: parsed.stem, options }))
	
	  return {
	    qid,
	    id: item?.id, // 可留着（以后删/更新用）
	    courseId: Number(this.courseId || item?.courseId || 0),
	    sessionId: Number(this.sessionId || item?.sessionId || 0),
	
	    questionType: uiType,
	    stem: parsed.stem || '',
	    options: options || [],
	    answer: answer || '',
	
	    addMethod: item?.addMethod || 'MANUAL',
	    sourceText: item?.sourceText || '',
	    aiText: item?.aiText || '',
	
	    // ✅ 数据库拉下来的默认认为“已保存”
	    saved: true,
	    dirty: false,
	    editing: false
	  }
	},
	parseStemAndOptions(text) {
	  const lines = String(text || '').split('\n').map(s => s.trim()).filter(Boolean)
	  const optRe = /^([A-H])[\.\、\)\:]?\s*(.+)$/
	  const options = []
	  const stemLines = []
	
	  for (const line of lines) {
	    const m = line.match(optRe)
	    if (m && m[1] && m[2]) options.push({ key: m[1], text: m[2] })
	    else stemLines.push(line)
	  }
	
	  const stem = (stemLines.length ? stemLines.join('\n') : text).trim()
	  options.sort((a, b) => a.key.localeCompare(b.key))
	  return { stem, options }
	},
	




	// 把 "ABC" => ["A","B","C"]
	multiAnswerArray(q) {
	  const s = String(q.answer || '').toUpperCase().replace(/[^A-H]/g, '')
	  return Array.from(new Set(s.split(''))).sort()
	},
	
	// checkbox-group change 回调：value 是数组 ["A","C"]
	setMultiAnswer(idx, arr) {
	  const q = this.list[idx]
	  const s = Array.isArray(arr) ? arr.join('') : ''
	  q.answer = s
	  this.markDirty(idx)
	  this.persistToStorage()
	},

    // =========================
    // 本地暂存
    // =========================
    storageKey() {
      return `TEACHER_QUESTION_DRAFT:${this.courseId || '0'}`
    },

    restoreFromStorage() {
      try {
        const raw = uni.getStorageSync(this.storageKey())
        if (!raw) {
          this.list = []
          return
        }
        const data = JSON.parse(raw)
        const ids = Array.isArray(data.selectedIds) ? data.selectedIds : []
        const map = data.selectedMap || {}

        const arr = []
        ids.forEach(id => {
          const q = map[String(id)]
          if (q) arr.push(this.normalizeQuestionForList(q))
        })

        this.list = arr.map(x => ({
          ...x,
          saved: !!x.saved,
          dirty: !!x.dirty,     // ✅ 不要硬清掉
          editing: false
        }))

      } catch (e) {
        this.list = []
      }
    },

    persistToStorage() {
      // ✅ 只缓存“题目列表页的展示数据”，不要覆盖选题草稿
      const cache = {
        list: this.list || [],
        ts: Date.now()
      }
      try {
        uni.setStorageSync(this.cacheKey(), JSON.stringify(cache))
      } catch (e) {}
    },


    normalizeQuestionForList(q) {
      const questionType = q.questionType || q.type || 'Q_SINGLE'
      let options = Array.isArray(q.options) ? q.options.map(o => ({ key: o.key, text: o.text })) : []

      if (questionType === 'Q_JUDGE') {
        options = [
          { key: 'A', text: '对' },
          { key: 'B', text: '错' }
        ]
        if (q.answer === 'A') q.answer = '对'
        if (q.answer === 'B') q.answer = '错'
      }

      const qid = q.qid ? String(q.qid) : this.genQid({ questionType, stem: q.stem || '', options })

      return {
        qid,
        courseId: Number(this.courseId || q.courseId || 0),
        sessionId: Number(q.sessionId || this.sessionId || 0),
      
        questionType,
        stem: q.stem || '',
        options,
        answer: q.answer || '',
      
        addMethod: q.addMethod || 'AI',
        sourceText: q.sourceText || '',
        aiText: q.aiText || '',
      
        // ✅ 保留本地状态
        saved: !!q.saved,
        dirty: !!q.dirty,
        editing: false
      }

    },

    genQid(obj) {
      const base =
        `${obj.questionType}|${obj.stem}|` +
        (obj.options || []).map(o => `${o.key}:${o.text}`).join('|')
      let hash = 0
      for (let i = 0; i < base.length; i++) hash = (hash * 31 + base.charCodeAt(i)) >>> 0
      return String(hash)
    },

    // =========================
    // 编辑开关
    // =========================
    toggleEdit(idx) {
      const q = this.list[idx]
      q.editing = !q.editing
      this.persistToStorage()
    },

    finishEdit(idx) {
      const q = this.list[idx]
      q.editing = false
      q.dirty = true
      q.saved = false
      this.persistToStorage()
      uni.showToast({ title: '已保存修改（本地）', icon: 'none' })
    },

    // =========================
    // 8081 请求：统一封装
    // =========================
    getBaseUrl() {
      return 'http://81.70.62.177:8081'
    },

    getBearerToken() {
      const token = String(uni.getStorageSync('token') || '').trim()
      if (!token) return ''
      return token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`
    },

    pingBackend() {
      const bearer = this.getBearerToken()
      console.log('[PING]', {
        courseId: this.courseId,
        sessionId: this.sessionId,
        token: bearer ? 'YES' : 'NO'
      })

      if (!bearer) return Promise.reject(new Error('token missing'))
      if (!this.courseId) return Promise.reject(new Error('courseId missing'))

      // ✅ 方案A：sessionId 可以没有；这里只提醒，不拦截
      if (!this.sessionId) console.warn('[PING] sessionId missing (OK for Plan A)')
      return Promise.resolve(true)
    },

    request8081({ url, method = 'GET', data = {}, header = {} }) {
      const BASE = this.getBaseUrl()
      const fullUrl = BASE + url
      const bearer = this.getBearerToken()

      return new Promise((resolve, reject) => {
        uni.request({
          url: fullUrl,
          method,
          data,
          timeout: 15000,
          withCredentials: false,
          header: {
            'Content-Type': 'application/json',
            ...(bearer ? { Authorization: bearer } : {}),
            ...header
          },
          success: (res) => {
            if (!(res.statusCode >= 200 && res.statusCode < 300)) {
              reject(res)
              return
            }

            const body = res.data || {}
            if (typeof body.code !== 'undefined' && body.code !== 0 && body.code !== 200) {
              reject({ ...res, businessError: true })
              return
            }

            resolve(body)
          },
          fail: (err) => reject(err)
        })
      })
    },

    // =========================
    // UI：题型/答案
    // =========================
    typeText(t) {
      if (t === 'Q_SINGLE') return '单选题'
      if (t === 'Q_MULTI') return '多选题'
      if (t === 'Q_JUDGE') return '判断题'
      return t || '-'
    },

    typePickerIndex(t) {
      const i = this.typePickerRange.findIndex(x => x.value === t)
      return i < 0 ? 0 : i
    },

    changeType(idx, pickerIndex) {
      const next = this.typePickerRange[Number(pickerIndex)]?.value || 'Q_SINGLE'
      const q = this.list[idx]
      q.questionType = next

      if (next === 'Q_JUDGE') {
        q.options = [
          { key: 'A', text: '对' },
          { key: 'B', text: '错' }
        ]
        if (q.answer === 'A') q.answer = '对'
        if (q.answer === 'B') q.answer = '错'
        if (q.answer !== '对' && q.answer !== '错') q.answer = ''
      } else {
        if (!q.options || q.options.length < 2) {
          q.options = [
            { key: 'A', text: '' },
            { key: 'B', text: '' },
            { key: 'C', text: '' },
            { key: 'D', text: '' }
          ]
        }
        if (next === 'Q_SINGLE') {
          q.answer = (q.answer || '').toString().trim().slice(0, 1).toUpperCase()
          if (!/^[A-H]$/.test(q.answer)) q.answer = ''
        }
        if (next === 'Q_MULTI') {
          this.normalizeMultiAnswer(idx)
        }
      }

      this.markDirty(idx)
      this.persistToStorage()
    },

    singleAnswerIndex(q) {
      const keys = (q.options || []).map(o => o.key)
      const i = keys.indexOf(q.answer)
      return i < 0 ? 0 : i
    },

    setSingleAnswer(idx, pickerIndex) {
      const q = this.list[idx]
      const keys = (q.options || []).map(o => o.key)
      q.answer = keys[Number(pickerIndex)] || ''
      this.markDirty(idx)
      this.persistToStorage()
    },

    judgeAnswerIndex(q) {
      const i = ['对', '错'].indexOf(q.answer)
      return i < 0 ? 0 : i
    },

    setJudgeAnswer(idx, pickerIndex) {
      const q = this.list[idx]
      q.answer = Number(pickerIndex) === 0 ? '对' : '错'
      this.markDirty(idx)
      this.persistToStorage()
    },

    normalizeMultiAnswer(idx) {
      const q = this.list[idx]
      let s = String(q.answer || '').toUpperCase()
      s = s.replace(/[^A-H]/g, '')
      s = Array.from(new Set(s.split(''))).sort().join('')
      q.answer = s
      this.markDirty(idx)
      this.persistToStorage()
    },

    // =========================
    // 选项操作
    // =========================
    addOption(idx) {
      const q = this.list[idx]
      if (q.questionType === 'Q_JUDGE') {
        uni.showToast({ title: '判断题不需要新增选项', icon: 'none' })
        return
      }
      const letters = 'ABCDEFGH'.split('')
      const used = new Set((q.options || []).map(o => o.key))
      const nextKey = letters.find(k => !used.has(k)) || letters[Math.min(q.options.length, 7)]
      q.options.push({ key: nextKey, text: '' })
      this.markDirty(idx)
      this.persistToStorage()
    },

    removeOption(idx, optIndex) {
      const q = this.list[idx]
      if (q.questionType === 'Q_JUDGE') return
      q.options.splice(optIndex, 1)

      if (q.questionType === 'Q_SINGLE') {
        const exist = new Set(q.options.map(o => o.key))
        if (!exist.has(q.answer)) q.answer = ''
      } else if (q.questionType === 'Q_MULTI') {
        const exist = new Set(q.options.map(o => o.key))
        q.answer = (q.answer || '').split('').filter(ch => exist.has(ch)).join('')
      }

      this.markDirty(idx)
      this.persistToStorage()
    },

    // =========================
    // 题目操作：新增/删除
    // =========================
    addManualQuestion() {
      const q = {
        qid: this.genQid({ questionType: 'Q_SINGLE', stem: `手动题 ${Date.now()}`, options: [] }),
        courseId: Number(this.courseId || 0),
        sessionId: Number(this.sessionId || 0),

        questionType: 'Q_SINGLE',
        stem: '',
        options: [
          { key: 'A', text: '' },
          { key: 'B', text: '' },
          { key: 'C', text: '' },
          { key: 'D', text: '' }
        ],
        answer: '',
        addMethod: 'MANUAL',
        sourceText: '',
        aiText: '',
        saved: false,
        dirty: true,
        editing: true
      }
      this.list.unshift(q)
      this.persistToStorage()
      uni.showToast({ title: '已新增一题', icon: 'none' })
    },

    removeOne(idx) {
      this.list.splice(idx, 1)
      this.persistToStorage()
      uni.showToast({ title: '已删除', icon: 'none' })
    },

    markDirty(idx) {
      const q = this.list[idx]
      q.dirty = true
      q.saved = false
    },

    // =========================
    // 保存到后端（8081）
    // =========================
    buildQuestionText(q) {
      const opts = (q.options || []).map(o => `${o.key}. ${o.text}`).join('\n')
      return `${(q.stem || '').trim()}\n${opts}`.trim()
    },

    buildAiText(q) {
      const tag =
        q.questionType === 'Q_SINGLE' ? '【Q_SINGLE】' :
        q.questionType === 'Q_MULTI' ? '【Q_MULTI】' :
        q.questionType === 'Q_JUDGE' ? '【Q_JUDGE】' : '【Q】'
      const opts = (q.options || []).map(o => `${o.key}. ${o.text}`).join('\n')
      return `${tag}\n${(q.stem || '').trim()}\n${opts}`.trim()
    },

    normalizeAnswerForBackend(q) {
      if (q.questionType === 'Q_JUDGE') {
        if (q.answer === '对') return 'A'
        if (q.answer === '错') return 'B'
        if (q.answer === 'A' || q.answer === 'B') return q.answer
        return ''
      }
      if (q.questionType === 'Q_SINGLE') {
        const a = String(q.answer || '').toUpperCase().trim()
        return /^[A-H]$/.test(a) ? a : ''
      }
      if (q.questionType === 'Q_MULTI') {
        let s = String(q.answer || '').toUpperCase()
        s = s.replace(/[^A-H]/g, '')
        s = Array.from(new Set(s.split(''))).sort().join('')
        return s
      }
      return String(q.answer || '')
    },

    mapQuestionTypeForBackend(qType) {
      if (qType === 'Q_SINGLE') return 'single'
      if (qType === 'Q_MULTI') return 'multi'
      if (qType === 'Q_JUDGE') return 'judge'
      return 'unknown'
    },

    validateQuestion(q) {
      if (!q.stem || !q.stem.trim()) return '题干不能为空'
      if (q.questionType !== 'Q_JUDGE') {
        if (!q.options || q.options.length < 2) return '选项至少 2 个'
        const hasEmpty = q.options.some(o => !String(o.text || '').trim())
        if (hasEmpty) return '选项内容不能为空'
      }
      const ans = this.normalizeAnswerForBackend(q)
      if (!ans) return '答案不能为空'
      return ''
    },

    async saveOneToBackend(idx) {
      const q = this.list[idx]
      const err = this.validateQuestion(q)
      if (err) {
        uni.showToast({ title: err, icon: 'none' })
        throw new Error(err)
      }

      // ✅ token 必须有
      const bearer = this.getBearerToken()
      if (!bearer) {
        const msg = '未登录：本地未找到 token（uni.getStorageSync("token") 为空）'
        uni.showToast({ title: msg, icon: 'none' })
        throw new Error(msg)
      }

      // ✅ Plan A：sid<=0 也可以上传（后端会当作没传）
      const sid = Number(this.sessionId || q.sessionId || 0)

      try {
        let ret

        if ((q.addMethod || '').toUpperCase() === 'AI') {
          const payload = {
            // ✅ 不传 teacherId，让后端从 token 取当前用户
            courseId: Number(this.courseId),
            aiText: q.aiText || this.buildAiText(q),
            questionType: this.mapQuestionTypeForBackend(q.questionType),
            addMethod: 'AI',
            sourceText: q.sourceText || '',
            question: this.buildQuestionText(q),
            answer: this.normalizeAnswerForBackend(q)
          }
          // ✅ 只有 sid>0 才带 sessionId（即“不传 sessionId”）
          if (sid > 0) payload.sessionId = sid

          ret = await this.request8081({
            url: '/api/teacher/question/ai/save',
            method: 'POST',
            data: payload
          })
        } else {
          ret = await this.request8081({
            url: '/api/teacher/question/add',
            method: 'POST',
            data: {
              courseId: Number(this.courseId),
              questionType: this.mapQuestionTypeForBackend(q.questionType),
              question: this.buildQuestionText(q),
              sourceText: q.sourceText || '',
              addMethod: 'MANUAL',
              answer: this.normalizeAnswerForBackend(q)
            }
          })
        }

        q.saved = true
        q.dirty = false
        this.persistToStorage()
        uni.showToast({ title: '上传成功', icon: 'success' })
        return ret
      } catch (e) {
        console.error('[8081] save one failed:', e)
        const msg =
          e?.data?.msg ||
          e?.data?.data?.msg ||
          e?.msg ||
          (e?.businessError ? '业务失败' : '') ||
          '上传失败'
        uni.showToast({ title: msg, icon: 'none' })
        throw e
      }
    },

    async saveAllToBackend() {
      if (!this.list.length) return
    
      const payload = {
        courseId: Number(this.courseId),
        questions: this.list.map(q => ({
          questionType: this.mapQuestionTypeForBackend(q.questionType),
          question: this.buildQuestionText(q),
          answer: this.normalizeAnswerForBackend(q),
          sourceText: q.sourceText || '',
          addMethod: q.addMethod || 'MANUAL'
        }))
      }
    
      await this.request8081({
        url: '/api/teacher/question/api/teacher/question/replace',
        method: 'POST',
        data: payload
      })
    
      this.list.forEach(q => {
        q.saved = true
        q.dirty = false
      })
    
      this.persistToStorage()
    
      uni.showToast({
        title: '上传成功',
        icon: 'success'
      })
    },


    // =========================
    // 顶部导航
    // =========================
    goBack() {
      this.persistToStorage()
      uni.navigateBack()
    },

    // =========================
    // 拖拽排序
    // =========================
    cardStyle(idx) {
      if (idx !== this.draggingIndex) return {}
      return { transform: `translateY(${this.dragOffsetY}px)`, zIndex: 9 }
    },

    onDragStart(e, idx) {
      const touch = e.touches && e.touches[0]
      if (!touch) return
      const x = touch.clientX
      if (x > 80) return

      this.draggingIndex = idx
      this.dragStartY = touch.clientY
      this.lastTouchY = touch.clientY
      this.dragOffsetY = 0
    },

    onDragMove(e, idx) {
      if (this.draggingIndex !== idx) return
      const touch = e.touches && e.touches[0]
      if (!touch) return
      const dy = touch.clientY - this.dragStartY
      this.dragOffsetY = dy
      this.lastTouchY = touch.clientY
    },

    onDragEnd(e, idx) {
      if (this.draggingIndex !== idx) return

      const dy = this.dragOffsetY
      const step = this.itemH || uni.upx2px(420)
      const move = Math.round(dy / step)

      if (move !== 0) {
        const from = idx
        let to = idx + move
        if (to < 0) to = 0
        if (to > this.list.length - 1) to = this.list.length - 1

        const item = this.list.splice(from, 1)[0]
        this.list.splice(to, 0, item)
        this.persistToStorage()
      }

      this.draggingIndex = -1
      this.dragStartY = 0
      this.dragOffsetY = 0
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
  padding: 110rpx 24rpx 30rpx;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

/* 顶部栏 - 图标按钮改造 */
.header {
  position: fixed; 
  top: 0; 
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
  /* 渐变文字效果 */
  background: linear-gradient(90deg, #4f6cff, #6b86ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.right { 
  position: absolute; 
  right: 24rpx; 
}

/* 右上角图标按钮组 */
.top-actions{
  display:flex;
  align-items:center;
  gap: 16rpx;
}
.ghost-btn{
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #eef2ff 0%, #dbe4ff 100%);
  color: #2f54eb;
  font-weight: 600;
  box-shadow: 0 2rpx 8rpx rgba(79, 108, 255, 0.1);
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  /* 替换为加号图标 */
  content: "+";
}
.ghost-btn::before {
  content: "+";
}
.ghost-btn:active {
  transform: scale(0.95);
  box-shadow: 0 1rpx 4rpx rgba(79, 108, 255, 0.1);
}
.saveall-btn{
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #4f6cff 0%, #6b86ff 100%);
  color:#fff;
  font-weight: 600;
  box-shadow: 0 6rpx 16rpx rgba(79,108,255,0.22);
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  /* 替换为上传图标 */
  content: "↑";
}
.saveall-btn::before {
  content: "↑";
}
.saveall-btn[disabled] { 
  opacity: .55; 
  transform: none;
  box-shadow: 0 3rpx 8rpx rgba(79,108,255,0.15);
}
.saveall-btn:active {
  transform: scale(0.95);
  box-shadow: 0 3rpx 8rpx rgba(79,108,255,0.22);
}

/* 顶部信息卡片 */
.info-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 24rpx;
  padding: 24rpx;
  box-shadow: 0 10rpx 30rpx rgba(79,108,255,0.08);
  border: 1rpx solid rgba(79, 108, 255, 0.15);
  margin-bottom: 24rpx;
  backdrop-filter: blur(8rpx);
}
.info-row {
  display:flex;
  align-items:center;
  justify-content: space-between;
  padding: 8rpx 0;
}
.label { 
  font-size: 24rpx; 
  color: #718096; 
  letter-spacing: 0.3rpx;
}
.value { 
  font-size: 24rpx; 
  color: #2d3748; 
  font-weight: 700; 
}
.pill {
  font-size: 22rpx;
  color: #4f6cff;
  background: linear-gradient(135deg, #eef2ff 0%, #dbe4ff 100%);
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  font-weight: 900;
  box-shadow: 0 2rpx 8rpx rgba(79, 108, 255, 0.1);
}
.hint{
  margin-top: 12rpx;
  color:#94a3b8;
  font-size: 22rpx;
  line-height: 1.6;
  letter-spacing: 0.3rpx;
}

/* 列表区域 */
.list{
  height: calc(100vh - 110rpx - 240rpx);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  /* 滚动条美化 */
  scrollbar-width: thin;
  scrollbar-color: rgba(79, 108, 255, 0.2) transparent;
}
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

.empty{
  padding: 80rpx 10rpx;
  text-align:center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
}
.empty::before {
  content: '📋';
  font-size: 80rpx;
}
.empty-text{
  color:#94a3b8;
  font-size: 26rpx;
  line-height: 1.6;
}

/* 题卡 - 核心美化 */
.q-card{
  background: rgba(255, 255, 255, 0.95);
  border-radius: 24rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  border: 1rpx solid rgba(79, 108, 255, 0.15);
  box-shadow: 0 10rpx 30rpx rgba(79,108,255,0.08);
  transition: all 0.2s ease;
  backdrop-filter: blur(8rpx);
}
.q-card:hover {
  transform: translateY(-4rpx);
  box-shadow: 0 12rpx 36rpx rgba(79,108,255,0.12);
}

/* 题卡顶部 - 按钮改为横向排列 */
.q-top{
  display:flex;
  align-items:flex-start;
  gap: 16rpx;
  margin-bottom: 20rpx;
  justify-content: space-between;
}
.drag-handle{
  width: 56rpx;
  height: 56rpx;
  border-radius: 16rpx;
  background: linear-gradient(135deg, #f2f4ff 0%, #eef2ff 100%);
  color:#4f6cff;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size: 30rpx;
  font-weight: 900;
  flex-shrink: 0;
  box-shadow: 0 4rpx 12rpx rgba(79, 108, 255, 0.1);
  transition: all 0.2s ease;
}
.drag-handle:active {
  transform: scale(0.95);
  box-shadow: 0 2rpx 8rpx rgba(79, 108, 255, 0.1);
}
.q-meta{ flex:1; }
.type-row{
  display:flex;
  align-items:center;
  gap: 16rpx;
}
.type-pill{
  display:inline-flex;
  font-size: 22rpx;
  color:#4f6cff;
  background:linear-gradient(135deg, #eef2ff 0%, #dbe4ff 100%);
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  font-weight: 900;
  box-shadow: 0 2rpx 8rpx rgba(79, 108, 255, 0.1);
}
.type-change{
  font-size: 22rpx;
  color:#2d3748;
  background:linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%);
  border: 1rpx solid rgba(79, 108, 255, 0.15);
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  transition: all 0.2s ease;
}
.type-change:active {
  background:linear-gradient(135deg, #eef2ff 0%, #dbe4ff 100%);
}
.sub{
  display:block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color:#94a3b8;
  letter-spacing: 0.3rpx;
}
.saved-tag{
  margin-left: 10rpx;
  color:#10b981;
  background: rgba(16,185,129,0.12);
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
  font-weight: 800;
  font-size: 20rpx;
}
.unsaved-tag{
  margin-left: 10rpx;
  color:#ff7a45;
  background: rgba(255,122,69,0.12);
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
  font-weight: 800;
  font-size: 20rpx;
}

/* 操作按钮改为横向排列 */
.q-actions{
  display:flex;
  flex-direction: row; /* 改为横向 */
  gap: 12rpx;
  flex-shrink: 0;
  align-items: center;
}
.mini-btn{
  font-size: 22rpx;
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #4f6cff 0%, #6b86ff 100%);
  color:#fff;
  font-weight: 600;
  box-shadow: 0 4rpx 12rpx rgba(79,108,255,0.2);
  transition: all 0.2s ease;
  white-space: nowrap;
}
.mini-btn[disabled]{ 
  opacity: .55; 
  transform: none;
  box-shadow: 0 2rpx 8rpx rgba(79,108,255,0.15);
}
.mini-btn:active {
  transform: scale(0.95);
  box-shadow: 0 2rpx 8rpx rgba(79,108,255,0.2);
}

/* 修改按钮的浅色样式 */
.mini-btn.ghost{
  background: linear-gradient(135deg, #eef2ff 0%, #dbe4ff 100%);
  color: #2f54eb;
  box-shadow: 0 2rpx 8rpx rgba(79, 108, 255, 0.1);
}

.mini-btn.danger{
  background: linear-gradient(135deg, #fff0f0 0%, #ffe8e8 100%);
  color:#ff4d4f;
  border: 1rpx solid rgba(255,77,79,0.28);
  box-shadow: 0 2rpx 8rpx rgba(255, 77, 79, 0.1);
}

/* 内容区块 */
.block{
  margin-top: 20rpx;
}
.block-title{
  display:block;
  font-size: 26rpx;
  font-weight: 900;
  color:#1d2129;
  margin-bottom: 12rpx;
  letter-spacing: 0.5rpx;
}
.block-head{
  display:flex;
  align-items:center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}
.tiny-btn{
  font-size: 22rpx;
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  background:linear-gradient(135deg, #eef2ff 0%, #dbe4ff 100%);
  color:#2f54eb;
  font-weight: 600;
  box-shadow: 0 2rpx 8rpx rgba(79, 108, 255, 0.1);
  transition: all 0.2s ease;
}
.tiny-btn:active {
  transform: scale(0.95);
  box-shadow: 0 1rpx 4rpx rgba(79, 108, 255, 0.1);
}

.textarea{
  width: 100%;
  min-height: 100rpx;
  padding: 18rpx;
  border-radius: 20rpx;
  border: 1rpx solid rgba(79, 108, 255, 0.15);
  background: rgba(248, 249, 255, 0.9);
  font-size: 26rpx;
  box-sizing:border-box;
  transition: all 0.2s ease;
  outline: none;
  line-height: 1.7;
}
.textarea:focus {
  border-color: #4f6cff;
  box-shadow: 0 0 0 6rpx rgba(79, 108, 255, 0.1);
}

/* 只读题干 */
.readonly-text{
  padding: 18rpx;
  border-radius: 20rpx;
  border: 1rpx solid rgba(79, 108, 255, 0.15);
  background: rgba(255, 255, 255, 0.8);
  font-size: 26rpx;
  color:#1d2129;
  line-height: 1.7;
  letter-spacing: 0.3rpx;
}

/* 选项（编辑态） */
.opt-row{
  display:flex;
  align-items:center;
  gap: 12rpx;
  padding: 14rpx 18rpx;
  border-radius: 18rpx;
  border: 1rpx solid rgba(79, 108, 255, 0.15);
  background: rgba(255, 255, 255, 0.8);
  margin-bottom: 12rpx;
  transition: all 0.2s ease;
}
.opt-row:hover {
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 2rpx 8rpx rgba(79, 108, 255, 0.08);
}
.opt-key{
  width: 48rpx;
  height: 48rpx;
  border-radius: 14rpx;
  background:linear-gradient(135deg, #eef2ff 0%, #dbe4ff 100%);
  color:#4f6cff;
  font-weight: 900;
  display:flex;
  align-items:center;
  justify-content:center;
  flex-shrink: 0;
  box-shadow: 0 2rpx 8rpx rgba(79, 108, 255, 0.1);
}
.opt-input{
  flex:1;
  font-size: 26rpx;
  line-height: 1.6;
  border: none;
  outline: none;
  background: transparent;
}
.opt-del{
  font-size: 22rpx;
  padding: 8rpx 12rpx;
  border-radius: 999rpx;
  background:linear-gradient(135deg, #fff0f0 0%, #ffe8e8 100%);
  color:#ff4d4f;
  font-weight: 600;
  transition: all 0.2s ease;
}
.opt-del:active {
  transform: scale(0.95);
}

/* 选项（只读态） */
.opt-read{
  display:flex;
  gap: 12rpx;
  padding: 14rpx 18rpx;
  border-radius: 18rpx;
  border: 1rpx solid rgba(79, 108, 255, 0.15);
  background: rgba(255, 255, 255, 0.8);
  margin-bottom: 12rpx;
}
.opt-read-k{
  width: 48rpx;
  height: 48rpx;
  border-radius: 14rpx;
  background:linear-gradient(135deg, #eef2ff 0%, #dbe4ff 100%);
  color:#4f6cff;
  font-weight: 900;
  display:flex;
  align-items:center;
  justify-content:center;
  flex-shrink: 0;
  box-shadow: 0 2rpx 8rpx rgba(79, 108, 255, 0.1);
}
.opt-read-t{
  flex:1;
  font-size: 26rpx;
  color:#1d2129;
  line-height: 1.7;
  letter-spacing: 0.3rpx;
}

.opt-empty{
  color:#94a3b8;
  font-size: 24rpx;
  padding: 16rpx 0;
  line-height: 1.6;
  text-align: center;
}

/* 答案区域 */
.answer-wrap{ 
  margin-top: 8rpx; 
}
.answer-picker{
  display:flex;
  align-items:center;
  justify-content: space-between;
  padding: 18rpx;
  border-radius: 20rpx;
  border: 1rpx solid rgba(79, 108, 255, 0.15);
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%);
  transition: all 0.2s ease;
}
.answer-picker:active {
  background: linear-gradient(135deg, #eef2ff 0%, #dbe4ff 100%);
}
.ans-label{
  color:#64748b;
  font-size: 24rpx;
  font-weight: 800;
}
.ans-value{
  color:#1d2129;
  font-size: 26rpx;
  font-weight: 900;
  letter-spacing: 0.5rpx;
}
.ans-arrow{
  color:#94a3b8;
  font-size: 24rpx;
}
.answer-input{
  width: 100%;
  padding: 18rpx;
  border-radius: 20rpx;
  border: 1rpx solid rgba(79, 108, 255, 0.15);
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%);
  font-size: 26rpx;
  box-sizing:border-box;
  transition: all 0.2s ease;
  outline: none;
}
.answer-input:focus {
  border-color: #4f6cff;
  box-shadow: 0 0 0 6rpx rgba(79, 108, 255, 0.1);
}
.ans-tip{
  display:block;
  margin-top: 8rpx;
  color:#94a3b8;
  font-size: 22rpx;
  letter-spacing: 0.3rpx;
}

/* 只读答案 */
.readonly-answer{
  padding: 18rpx;
  border-radius: 20rpx;
  border: 1rpx solid rgba(79, 108, 255, 0.15);
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%);
}
.readonly-answer-text{
  font-size: 26rpx;
  color:#1d2129;
  font-weight: 900;
  letter-spacing: 0.5rpx;
}

/* 适配小屏设备 */
@media screen and (max-height: 667px) {
  .list {
    height: calc(100vh - 110rpx - 200rpx) !important;
  }
  .q-card {
    padding: 20rpx !important;
  }
  .opt-row, .answer-picker {
    padding: 14rpx !important;
  }
  .q-actions {
    gap: 8rpx !important;
  }
  .mini-btn {
    padding: 8rpx 14rpx !important;
    font-size: 20rpx !important;
  }
}

/* 暗黑模式适配（可选） */
@media (prefers-color-scheme: dark) {
  page {
    background: linear-gradient(180deg, #1e293b, #0f172a) !important;
  }
  .header, .info-card, .q-card {
    background: rgba(15, 23, 42, 0.95) !important;
    border-color: rgba(79, 108, 255, 0.25) !important;
  }
  .title {
    -webkit-text-fill-color: #f8fafc !important;
  }
  .readonly-text, .opt-row, .opt-read {
    background: rgba(30, 41, 59, 0.8) !important;
    border-color: rgba(79, 108, 255, 0.25) !important;
    color: #f8fafc !important;
  }
  .textarea, .answer-input, .opt-input {
    background: rgba(15, 23, 42, 0.8) !important;
    border-color: rgba(79, 108, 255, 0.25) !important;
    color: #f8fafc !important;
  }
  .answer-picker, .readonly-answer {
    background: linear-gradient(135deg, #1e293b, #0f172a) !important;
    border-color: rgba(79, 108, 255, 0.25) !important;
  }
  .block-title, .ans-value, .opt-read-t, .readonly-text, .readonly-answer-text {
    color: #f8fafc !important;
  }
}
/* 顶部图标按钮容器 */
.top-actions {
  display:flex;
  align-items:center;
  gap: 16rpx;
}

/* 通用图标按钮样式 */
.ghost-btn, .saveall-btn {
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-size: 0; /* 清除默认文字空间 */
}

/* 手动新增按钮样式 */
.ghost-btn {
  background: linear-gradient(135deg, #eef2ff 0%, #dbe4ff 100%);
  color: #2f54eb;
}

/* 上传全部按钮样式 */
.saveall-btn {
  background: linear-gradient(135deg, #4f6cff 0%, #6b86ff 100%);
  color: #fff;
}

/* 禁用状态 */
.saveall-btn[disabled] {
  opacity: .55;
}

/* 图标样式 */
.icon {
  font-size: 28rpx;
  line-height: 1;
}
.multi-choices{
  padding: 12rpx 0;
}
.multi-choice{
  display: inline-flex;
  align-items: center;
  gap: 10rpx;
  padding: 10rpx 14rpx;
  margin-right: 12rpx;
  margin-bottom: 12rpx;
  border-radius: 999rpx;
  border: 1rpx solid rgba(79,108,255,0.18);
  background: rgba(248,249,255,0.9);
}
.multi-choice-text{
  font-size: 26rpx;
  font-weight: 900;
  color: #1d2129;
}
.page {
  min-height: 100vh;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;

  /* ✅ 顶部占位 = header基础高度 + 状态栏高度 */

  padding-left: 24rpx;
  padding-right: 24rpx;
  padding-bottom: 30rpx;
  padding-top: calc(110rpx + var(--status-bar-height, 0rpx));
}

/* ✅ header：总高度包含状态栏，不要让 padding-top 去“挤占”110rpx */
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 99;


    height: calc(110rpx + var(--status-bar-height, 0rpx));
    padding-top: 0;


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

/* ✅ list：不要再用固定 height 减 110rpx；把状态栏也算进去 */
.list{
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;

  /* 如果你觉得列表和 info-card 之间还要更贴一点，可以把这里的 margin-top 调小 */
}
</style>
