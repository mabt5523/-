<template>
  <view class="page">
    <!-- 顶部栏 -->
    <view class="header">
		<view class="empty-placeholder"></view>
      <text class="title">错题集</text>
      <view class="right">
        <text class="badge">{{ displayList.length }}</text>
      </view>
    </view>

    <!-- 筛选栏 -->
    <view class="filters card">
      <view class="filter-row">
        <text class="label">来源</text>
        <view class="tabs">
          <view class="tab" :class="{active: fSource === ''}" @click="setSource('')">全部</view>
          <view class="tab" :class="{active: fSource === 'exercise'}" @click="setSource('exercise')">练习</view>
          <view class="tab" :class="{active: fSource === 'ai_chat'}" @click="setSource('ai_chat')">AI</view>
        </view>
      </view>

      <view class="filter-row">
        <text class="label">状态</text>
        <view class="tabs">
          <view class="tab" :class="{active: fStatus === ''}" @click="setStatus('')">全部</view>
          <view class="tab" :class="{active: fStatus === 'active'}" @click="setStatus('active')">未掌握</view>
          <view class="tab" :class="{active: fStatus === 'resolved'}" @click="setStatus('resolved')">已解决</view>
        </view>
      </view>

      <view class="filter-row">
        <text class="label">课程</text>
        <picker mode="selector" :range="courseOptions" :value="coursePickerIndex" @change="onCoursePick">
          <view class="picker">
            <text class="picker-text">{{ currentCourseLabel }}</text>
            <text class="picker-arrow">▾</text>
          </view>
        </picker>
      </view>

      <!-- 正确答案显示开关 -->
      <view class="filter-row">
        <text class="label">答案</text>
        <view class="tabs">
          <view class="tab" :class="{active: showAnswer}" @click="showAnswer=true">显示</view>
          <view class="tab" :class="{active: !showAnswer}" @click="showAnswer=false">隐藏</view>
        </view>
      </view>

      <view class="filter-actions">


        <!-- ✅ AI出题按钮：放在重置旁边 -->
        <view class="btn ghost" @click="toggleAiMode">
          {{ mode==='ai' ? '退出AI出题' : 'AI出题' }}
        </view>

        <!-- 重做模式开关 -->
        <view class="btn ghost" @click="toggleRedoMode">
          {{ mode==='redo' ? '退出重做' : '重做' }}
        </view>

        <view class="btn" @click="loadList">刷新</view>
      </view>
    </view>

    <!-- ✅ 选择操作栏：重做 / AI 出题 都复用同一套UI -->
    <view class="ops card" v-if="mode!=='none' && displayList.length > 0">
      <view class="left">
        <view class="check" @click="toggleSelectAll">
          <view class="box" :class="{on: isAllSelected}">✓</view>
          <text>全选</text>
        </view>
        <text class="selected">已选 {{ selectedIds.length }}</text>
      </view>

      <view class="right">
        <!-- 重做：开始重做 -->
        <view
          v-if="mode==='redo'"
          class="btn mini"
          :class="{disabled: selectedIds.length===0}"
          @click="startRedoSelected"
        >
          开始重做
        </view>

        <!-- 重做：移除已答对 -->
        <view
          v-if="mode==='redo'"
          class="btn mini danger ghost"
          :class="{disabled: selectedCorrectIds.length===0}"
          @click="removeSelectedCorrect"
        >
          移除已答对
        </view>

        <!-- AI：下一步 -->
        <view
          v-if="mode==='ai'"
          class="btn mini"
          :class="{disabled: selectedIds.length===0}"
          @click="openAiCountModal"
        >
          下一步
        </view>

        <!-- AI：清空选择 -->
        <view
          v-if="mode==='ai'"
          class="btn mini ghost"
          :class="{disabled: selectedIds.length===0}"
          @click="clearSelected"
        >
          清空
        </view>
      </view>
    </view>

    <!-- 列表状态 -->
    <view v-if="loading" class="card muted">加载中…</view>

    <view v-else-if="errorMsg" class="card error">
      <text>加载失败：{{ errorMsg }}</text>
      <view class="btn" style="margin-top:16rpx" @click="loadList">重试</view>
    </view>

    <view v-else-if="displayList.length === 0" class="card muted">
      暂无错题（换个筛选试试）
    </view>

    <!-- 列表 -->
    <view v-else class="list">
      <view class="mistake card" v-for="item in displayList" :key="item.id">
        <!-- 顶部：可选勾选 + 信息 -->
        <view class="mistake-top">
          <!-- ✅ 只有在 mode=redo 或 mode=ai 才允许选 -->
          <view class="check" v-if="mode!=='none'" @click="toggleSelect(item.id)">
            <view class="box" :class="{on: selectedMap[item.id]}">✓</view>
          </view>

          <view class="top-info">
            <view class="line1">
              <text class="course">{{ item.courseName || ('课程' + item.courseId) }}</text>

              <text class="pill" :class="item.source === 'ai_chat' ? 'ai' : 'ex'">
                {{ item.source === 'ai_chat' ? 'AI' : '练习' }}
              </text>

              <text class="pill" :class="item.status === 'resolved' ? 'ok' : 'warn'">
                {{ item.status === 'resolved' ? '已解决' : '未掌握' }}
              </text>
            </view>

            <view class="line2">
              <text class="meta">错题次数 {{ item.wrongCount || 1 }}</text>
              <text class="dot">·</text>
              <text class="meta">最近 {{ formatTime(item.lastWrongTime) }}</text>
            </view>
          </view>
        </view>

        <!-- 题干 -->
        <view class="q">
          <text class="q-label">题目</text>
          <text class="q-text">{{ displayQuestion(item) }}</text>

        </view>

        <!-- ✅ 答案（可隐藏）+ 重做弹窗开启时强制隐藏 -->
        <view class="ans" v-if="showAnswer && !redoVisible">
          <view class="ans-row">
            <text class="ans-label">正确答案</text>
            <text class="ans-val ok">{{ item.answer || '（未提供）' }}</text>
          </view>
          <view class="ans-row">
            <text class="ans-label">我的答案</text>
            <text class="ans-val bad">{{ item.studentAnswer || '（未记录）' }}</text>
          </view>
        </view>

        <!-- 操作 -->
        <view class="actions">
          <!-- ✅ 只有重做模式才允许重做 -->
          <view class="btn mini" v-if="mode==='redo'" @click="openRedo(item)">重做此题</view>

          <!-- ✅ 只允许移除：已答对（本次重做答对 or status 已 resolved） -->
          <view
            class="btn mini danger ghost"
            v-if="canRemove(item)"
            @click="removeOne(item.id)"
          >
            移除
          </view>
        </view>
      </view>
    </view>

    <!-- ===== 重做弹窗（答题 UI） ===== -->
    <view class="modal-mask" v-if="redoVisible" @click.self="closeRedo">
      <view class="modal">
        <view class="modal-title">
          重做错题
          <text v-if="redoQueue.length > 0" class="modal-sub">
            （{{ redoQueueIndex + 1 }}/{{ redoQueue.length }}）
          </text>
        </view>

        <view class="modal-q">
          <text class="modal-q-label">题目</text>
          <text class="modal-q-text">{{ redoStem }}</text>
        </view>

        <!-- 单选 / 多选 -->
        <view v-if="redoType==='single' || redoType==='multi'" class="opt-wrap">
          <view
            v-for="opt in redoOptions"
            :key="opt.key"
            class="opt"
            :class="{
              on: redoType==='single'
                ? redoSingle === opt.key
                : redoMulti.includes(opt.key)
            }"
            @click="onPickOption(opt.key)"
          >
            <view class="opt-left">
              <view class="opt-badge" :class="{on: isPicked(opt.key)}">{{ opt.key }}</view>
            </view>
            <view class="opt-right">
              <text class="opt-text">{{ opt.text }}</text>
            </view>
          </view>
        </view>

        <!-- 判断题 -->
        <view v-if="redoType==='judge'" class="opt-wrap">
          <view class="opt" :class="{on: redoSingle==='A'}" @click="redoSingle='A'">
            <view class="opt-left"><view class="opt-badge" :class="{on: redoSingle==='A'}">A</view></view>
            <view class="opt-right"><text class="opt-text">对</text></view>
          </view>
          <view class="opt" :class="{on: redoSingle==='B'}" @click="redoSingle='B'">
            <view class="opt-left"><view class="opt-badge" :class="{on: redoSingle==='B'}">B</view></view>
            <view class="opt-right"><text class="opt-text">错</text></view>
          </view>
        </view>

        <view class="modal-actions">
          <view class="btn ghost" @click="closeRedo">取消</view>
          <view class="btn" @click="submitRedo()">提交</view>
        </view>
      </view>
    </view>
	<!-- ===== AI出题：课程选择弹窗（当勾选题来自多个课程时出现） ===== -->
	<view class="modal-mask" v-if="aiCourseVisible" @click.self="aiCourseVisible=false">
	  <view class="modal">
	    <view class="modal-title">先选择课程</view>
	
	    <view class="modal-q">
	      <text class="modal-q-label">你选择的错题来自多个课程</text>
	      <text class="modal-q-text">请选择本次 AI 出题所属课程</text>
	    </view>
	
	    <picker
	      mode="selector"
	      :range="selectedCourseCandidates.map(x=>x.name)"
	      :value="aiCoursePickerIndex"
	      @change="onAiCoursePick"
	    >
	      <view class="picker">
	        <text class="picker-text">
	          {{ selectedCourseCandidates[aiCoursePickerIndex]?.name || '请选择课程' }}
	        </text>
	        <text class="picker-arrow">▾</text>
	      </view>
	    </picker>
	
	    <view class="modal-actions">
	      <view class="btn ghost" @click="aiCourseVisible=false">取消</view>
	      <view class="btn" @click="confirmAiCourse">下一步</view>
	    </view>
	  </view>
	</view>


    <!-- ===== AI出题数量弹窗（第二步） ===== -->
    <view class="modal-mask" v-if="aiCountVisible" @click.self="closeAiCountModal">
      <view class="modal">
        <view class="modal-title">AI出题设置</view>

        <view class="modal-q">
          <text class="modal-q-label">你已选择 {{ selectedIds.length }} 道参考错题</text>
          <text class="modal-q-text">请选择要生成的题目数量（按题型）</text>
        </view>

        <view class="ai-count">
          <view class="ai-row">
            <text class="ai-label">单选题</text>
            <view class="ai-step">
              <view class="ai-btn" @click="dec('single')">-</view>
              <text class="ai-num">{{ aiCount.single }}</text>
              <view class="ai-btn" @click="inc('single')">+</view>
            </view>
          </view>

          <view class="ai-row">
            <text class="ai-label">多选题</text>
            <view class="ai-step">
              <view class="ai-btn" @click="dec('multi')">-</view>
              <text class="ai-num">{{ aiCount.multi }}</text>
              <view class="ai-btn" @click="inc('multi')">+</view>
            </view>
          </view>

          <view class="ai-row">
            <text class="ai-label">判断题</text>
            <view class="ai-step">
              <view class="ai-btn" @click="dec('judge')">-</view>
              <text class="ai-num">{{ aiCount.judge }}</text>
              <view class="ai-btn" @click="inc('judge')">+</view>
            </view>
          </view>

          <view class="ai-tip">
            总计：{{ aiCount.single + aiCount.multi + aiCount.judge }} 题
          </view>
        </view>

        <view class="modal-actions">
          <view class="btn ghost" @click="closeAiCountModal">返回选择</view>
          <view class="btn" @click="submitAiGenerate">生成题目</view>
        </view>
      </view>
    </view>

  </view>
</template>

<script>
import request from '@/common/request.js'

export default {
  data() {
    return {
	  // ✅ AI：课程选择（从已选错题推断/选择）
	  aiCourseVisible: false,
	  aiCourseId: null,
	  aiCoursePickerIndex: 0,

      loading: false,
      errorMsg: '',

      // 筛选
      fSource: '',
      fStatus: '',
      fCourseId: null,

      // 答案显示
      showAnswer: true,

      // 列表
      list: [],

      // 课程 picker
      courseOptions: ['全部课程'],
      courseMap: [{ id: null, name: '全部课程' }],
      coursePickerIndex: 0,

      // ✅ 模式：none | redo | ai
      mode: 'none',

      // 选择
      selectedMap: {},

      // 重做结果
      resultMap: {},

      // 重做队列
      redoQueue: [],
      redoQueueIndex: 0,

      // 重做弹窗
      redoVisible: false,
      redoItem: null,
      redoSingle: '',
      redoMulti: [],

      // ✅ AI 数量弹窗
      aiCountVisible: false,
      aiCount: {
        single: 2,
        multi: 2,
        judge: 1
      }
    }
  },

  computed: {
	// 已选参考错题
	selectedItems() {
	  const ids = new Set(this.selectedIds)
	  return this.displayList.filter(it => ids.has(it.id))
	},
	
	// 已选错题涉及的课程集合 [{id,name}]
	selectedCourseCandidates() {
	  const map = new Map()
	  this.selectedItems.forEach(it => {
	    if (it.courseId == null) return
	    map.set(it.courseId, it.courseName || ('课程' + it.courseId))
	  })
	  return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
	},

    selectedIds() {
      return Object.keys(this.selectedMap)
        .filter(k => this.selectedMap[k])
        .map(k => Number(k))
    },

    selectedCorrectIds() {
      return this.selectedIds.filter(id => {
        const item = this.list.find(x => x.id === id)
        const resolved = item?.status === 'resolved'
        const r = this.resultMap[id]
        return resolved || (r && r.correct)
      })
    },

    isAllSelected() {
      if (!this.displayList.length) return false
      return this.displayList.every(it => this.selectedMap[it.id])
    },

    currentCourseLabel() {
      const cur = this.courseMap[this.coursePickerIndex]
      return cur ? cur.name : '全部课程'
    },

    displayList() {
      return this.list
    },

    // ====== 重做弹窗题型相关 ======
    redoType() {
      return this.redoItem?.questionType || ''
    },

    redoStem() {
      if (!this.redoItem?.question) return ''
    
      // ✅ 先清洗（去掉【Q_SINGLE】等）
      const cleaned = this.cleanQuestionText(this.redoItem.question)
    
      // 再去掉选项行，只保留题干
      const lines = String(cleaned).split('\n')
      const kept = []
      for (const line of lines) {
        const t = String(line).trim()
        if (/^[A-D][\.\、]/.test(t)) continue
        kept.push(line)
      }
      const s = kept.join('\n').trim()
      return s ? s : cleaned
    },


    redoOptions() {
      if (!this.redoItem?.question) return []
    
      const cleaned = this.cleanQuestionText(this.redoItem.question)
      const lines = String(cleaned).split('\n')
      const opts = []
    
      for (const line of lines) {
        const t = String(line).trim()
        const m = t.match(/^([A-D])[\.\、]\s*(.+)$/)
        if (m) opts.push({ key: m[1], text: m[2] })
      }
      return opts
    },


    redoAnswer() {
      if (this.redoType === 'multi') {
        return [...this.redoMulti].filter(Boolean).sort().join('')
      }
      return this.redoSingle
    }
  },

  onLoad() {
    this.loadList()
  },

  methods: {
	onAiCoursePick(e) {
	  const idx = Number(e.detail.value)
	  this.aiCoursePickerIndex = idx
	  this.aiCourseId = this.selectedCourseCandidates[idx]?.id ?? null
	},
	
	confirmAiCourse() {
	  if (!this.aiCourseId) {
	    uni.showToast({ title: '请选择课程', icon: 'none' })
	    return
	  }
	  this.aiCourseVisible = false
	  this.aiCountVisible = true
	},

	// ✅ 清洗 AI 题目中的标记：去掉 【...】、[Q_SINGLE]、(可多选)/(单选) 等提示括号
	cleanQuestionText(raw = '') {
	  let s = String(raw)
	
	  // 1) 去掉中文全角【...】（比如 【Q_SINGLE】）
	  s = s.replace(/【[^】]*】\s*/g, '')
	
	  // 2) 去掉英文方括号 [...]（比如 [Q_SINGLE]）
	  s = s.replace(/\[[^\]]*\]\s*/g, '')
	
	  // 3) 去掉常见题型提示括号（只删这些固定文案，避免误伤正常括号）
	  s = s.replace(/（\s*可多选\s*）/g, '')
	  s = s.replace(/\(\s*可多选\s*\)/g, '')
	  s = s.replace(/（\s*多选\s*）/g, '')
	  s = s.replace(/\(\s*多选\s*\)/g, '')
	  s = s.replace(/（\s*单选\s*）/g, '')
	  s = s.replace(/\(\s*单选\s*\)/g, '')
	  s = s.replace(/（\s*判断\s*）/g, '')
	  s = s.replace(/\(\s*判断\s*\)/g, '')
	
	  // 4) 连续空行压缩一下
	  s = s.replace(/\n{3,}/g, '\n\n').trim()
	  return s
	},
	
	// ✅ 页面展示用：AI 题走清洗，练习题保持原样（你也可以两者都清洗）
	displayQuestion(item) {
	  const q = item?.question || ''
	  if (item?.source === 'ai_chat') return this.cleanQuestionText(q)
	  return q
	},

    goBack() { uni.navigateBack() },

    setSource(v) { this.fSource = v; this.loadList() },
    setStatus(v) { this.fStatus = v; this.loadList() },

    resetFilters() {
      this.fSource = ''
      this.fStatus = ''
      this.fCourseId = null
      this.coursePickerIndex = 0
      this.mode = 'none'
      this.selectedMap = {}
      this.loadList()
    },

    toggleRedoMode() {
      if (this.mode === 'redo') {
        this.mode = 'none'
        this.selectedMap = {}
        return
      }
      this.mode = 'redo'
      this.selectedMap = {}
    },

    toggleAiMode() {
      if (this.mode === 'ai') {
        this.mode = 'none'
        this.selectedMap = {}
        return
      }
      this.mode = 'ai'
      this.selectedMap = {}
    },

    clearSelected() {
      this.selectedMap = {}
    },

    onCoursePick(e) {
      const idx = Number(e.detail.value)
      this.coursePickerIndex = idx
      this.fCourseId = this.courseMap[idx]?.id ?? null
      this.loadList()
    },

    buildCoursePicker(list) {
      const map = new Map()
      list.forEach(it => {
        const cid = it.courseId
        const cname = it.courseName || ('课程' + cid)
        if (!map.has(cid)) map.set(cid, cname)
      })

      const arr = [{ id: null, name: '全部课程' }]
      for (const [id, name] of map.entries()) arr.push({ id, name })

      this.courseMap = arr
      this.courseOptions = arr.map(x => x.name)

      const curId = this.fCourseId
      const foundIdx = arr.findIndex(x => x.id === curId)
      if (foundIdx === -1) {
        this.coursePickerIndex = 0
        this.fCourseId = null
      } else {
        this.coursePickerIndex = foundIdx
      }
    },

    async loadList() {
      this.loading = true
      this.errorMsg = ''
      try {
        const res = await request({
          url: '/api/student/mistakes',
          method: 'GET',
          data: {
            courseId: this.fCourseId,
            source: this.fSource || null,
            status: this.fStatus || null
          }
        })

        const data = Array.isArray(res.data) ? res.data : []
        this.list = data
        this.buildCoursePicker(data)

        // 清理已选中但列表里不存在的
        const keep = new Set(data.map(x => x.id))
        Object.keys(this.selectedMap).forEach(k => {
          if (!keep.has(Number(k))) delete this.selectedMap[k]
        })
      } catch (e) {
        console.log('【mistake load error】', e)
        this.errorMsg = e?.message || e?.msg || '未知错误'
      } finally {
        this.loading = false
      }
    },

    toggleSelect(id) {
      if (this.mode === 'none') return
      this.$set(this.selectedMap, id, !this.selectedMap[id])
    },

    toggleSelectAll() {
      if (this.mode === 'none') return
      const to = !this.isAllSelected
      const next = {}
      this.displayList.forEach(it => { next[it.id] = to })
      this.selectedMap = next
    },

    // ========== 重做 ==========
    startRedoSelected() {
      const ids = this.selectedIds
      if (!ids.length) return
      this.redoQueue = this.displayList.filter(it => ids.includes(it.id))
      this.redoQueueIndex = 0
      this.openRedo(this.redoQueue[0])
    },

    openRedo(item) {
      this.redoItem = item
      this.redoVisible = true
      this.redoSingle = ''
      this.redoMulti = []
    },

    closeRedo() {
      this.redoVisible = false
      this.redoItem = null
      this.redoSingle = ''
      this.redoMulti = []
    },

    isPicked(key) {
      if (this.redoType === 'multi') return this.redoMulti.includes(key)
      return this.redoSingle === key
    },

    onPickOption(key) {
      if (this.redoType === 'single') {
        this.redoSingle = key
        return
      }
      if (this.redoType === 'multi') {
        const idx = this.redoMulti.indexOf(key)
        if (idx >= 0) this.redoMulti.splice(idx, 1)
        else this.redoMulti.push(key)
      }
    },

    async submitRedo() {
      if (!this.redoItem?.id) return
      if (!this.redoAnswer) {
        uni.showToast({ title: '请选择答案', icon: 'none' })
        return
      }

      try {
        const res = await request({
          url: `/api/student/mistakes/${this.redoItem.id}/check`,
          method: 'POST',
          data: {
            studentAnswer: this.redoAnswer,
            removeIfCorrect: false
          }
        })

        const data = res.data || {}
        this.$set(this.resultMap, this.redoItem.id, {
          correct: !!data.correct,
          answer: this.redoAnswer,
          ts: Date.now()
        })

        await this.loadList()

        if (this.redoQueue.length > 0) {
          this.redoQueueIndex++
          if (this.redoQueueIndex < this.redoQueue.length) {
            uni.showToast({ title: data.correct ? '答对 ✅' : '答错 ❌', icon: 'none' })
            this.openRedo(this.redoQueue[this.redoQueueIndex])
            return
          }
        }

        uni.showToast({ title: '重做完成', icon: 'success' })
        this.closeRedo()
      } catch (e) {
        uni.showToast({ title: '提交失败', icon: 'none' })
      }
    },

    canRemove(item) {
      if (item.status === 'resolved') return true
      const r = this.resultMap[item.id]
      return !!(r && r.correct)
    },

    async removeOne(id) {
      uni.showModal({
        title: '确认移除',
        content: '确定要从错题集中移除这道题吗？',
        success: async (r) => {
          if (!r.confirm) return
          try {
            await request({ url: `/api/student/mistakes/${id}`, method: 'DELETE' })
            this.$delete(this.selectedMap, id)
            this.$delete(this.resultMap, id)
            await this.loadList()
            uni.showToast({ title: '已移除', icon: 'success' })
          } catch (e) {
            uni.showToast({ title: '移除失败', icon: 'none' })
          }
        }
      })
    },

    async removeSelectedCorrect() {
      const ids = this.selectedCorrectIds
      if (!ids.length) {
        uni.showToast({ title: '请选择已答对/已解决的题', icon: 'none' })
        return
      }

      uni.showModal({
        title: '一键移除',
        content: `确定移除已选中且已答对/已解决的 ${ids.length} 道题吗？`,
        success: async (r) => {
          if (!r.confirm) return
          try {
            await request({
              url: '/api/student/mistakes/batch',
              method: 'DELETE',
              data: { ids }
            })

            ids.forEach(id => {
              this.$delete(this.selectedMap, id)
              this.$delete(this.resultMap, id)
            })

            await this.loadList()
            uni.showToast({ title: '已移除', icon: 'success' })
          } catch (e) {
            uni.showToast({ title: '移除失败', icon: 'none' })
          }
        }
      })
    },

    // ========== AI 出题：第二步数量弹窗 ==========
    openAiCountModal() {
      if (this.mode !== 'ai') return
      if (!this.selectedIds.length) {
        uni.showToast({ title: '请先选择参考错题', icon: 'none' })
        return
      }
    
      const courses = this.selectedCourseCandidates
      if (courses.length === 0) {
        uni.showToast({ title: '所选题目没有 courseId', icon: 'none' })
        return
      }
    
      // ✅ 只有一个课程：自动确定
      if (courses.length === 1) {
        this.aiCourseId = courses[0].id
        this.aiCourseVisible = false
        this.aiCountVisible = true
        return
      }
    
      // ✅ 多个课程：先弹出课程选择
      this.aiCourseId = courses[0].id
      this.aiCoursePickerIndex = 0
      this.aiCourseVisible = true
    },


    closeAiCountModal() {
      this.aiCountVisible = false
    },

    inc(type) {
      this.aiCount[type] = Math.min(20, (this.aiCount[type] || 0) + 1)
    },
    dec(type) {
      this.aiCount[type] = Math.max(0, (this.aiCount[type] || 0) - 1)
    },
	request8081(options = {}) {
	  const BASE_8081 = 'http://81.70.62.177:8081'
	  const token = uni.getStorageSync('token')
	
	  return new Promise((resolve, reject) => {
	    uni.request({
	      url: BASE_8081 + (options.url || ''),
	      method: options.method || 'GET',
	      data: options.data || {},
	      header: {
	        'Content-Type': 'application/json',
	        ...(token ? { Authorization: 'Bearer ' + token } : {}),
	        ...(options.header || {})
	      },
	      success: (res) => {
	        resolve(res.data) // ✅ 原样返回后端 body
	      },
	      fail: (err) => reject(err)
	    })
	  })
	},


    async submitAiGenerate() {
      const total = (this.aiCount.single || 0) + (this.aiCount.multi || 0) + (this.aiCount.judge || 0)
      if (total <= 0) {
        uni.showToast({ title: '题目数量不能为 0', icon: 'none' })
        return
      }
    
      // ✅ 参考错题：按勾选（selectedIds）取题目原始字符串
      const selectedWrongQuestions = this.displayList
        .filter(it => this.selectedIds.includes(it.id))
        .map(it => it.question)
        .filter(Boolean)
    
      if (!selectedWrongQuestions.length) {
        uni.showToast({ title: '请先选择参考错题', icon: 'none' })
        return
      }
    
      // ✅ courseId 来自你上一步推断/选择的 aiCourseId
      if (!this.aiCourseId) {
        uni.showToast({ title: '请先选择课程', icon: 'none' })
        return
      }
    
      // ✅ 不改 request.js：这里单独走 8081
      const BASE_8081 = 'http://81.70.62.177:8081'
      const token = uni.getStorageSync('token')
    
      try {
        const body = await new Promise((resolve, reject) => {
          uni.request({
            url: BASE_8081 + '/api/student/wrongbook/generate',
            method: 'POST',
            data: {
              courseId: this.aiCourseId,
              selectedWrongQuestions,
              total,
              singleCount: this.aiCount.single,
              multiCount: this.aiCount.multi,
              judgeCount: this.aiCount.judge,
              extraRequirement: '题目难度适中，尽量覆盖错因：概念混淆与审题遗漏。'
            },
            header: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: 'Bearer ' + token } : {})
            },
            success: (res) => resolve(res.data),
            fail: (err) => reject(err)
          })
        })
    
        // ✅ 后端格式：{ msg:'ok', code:0, data:{ questions:[...] } }
        if (!body || typeof body !== 'object') {
          uni.showToast({ title: '生成失败：返回格式异常', icon: 'none' })
          return
        }
        if (body.code !== 0) {
          uni.showToast({ title: body.msg || '生成失败', icon: 'none' })
          return
        }
    
        const questions = body?.data?.questions || []
        if (!questions.length) {
          uni.showToast({ title: '生成失败：未返回题目', icon: 'none' })
          return
        }
    
        // ✅ 存到本地，AI练习页读取（注意用 aiCourseId，不要用 fCourseId）
        uni.setStorageSync('AI_PRACTICE_PAYLOAD', {
          courseId: this.aiCourseId,
          questions
        })
    
        uni.showToast({ title: 'AI题目已生成', icon: 'success' })
    
        // ✅ 关闭弹窗 + 退出AI模式 + 清空选择
        this.aiCountVisible = false
        this.aiCourseVisible = false
        this.mode = 'none'
        this.selectedMap = {}
    
        // ✅ 跳转到AI练习页
        uni.navigateTo({ url: '/pages/student/ai_practice' })
      } catch (e) {
        uni.showToast({ title: e?.message || '生成失败', icon: 'none' })
      }
    },



    formatTime(t) {
      if (!t) return '暂无'
      return String(t).replace('T', ' ')
    }
  }
}
</script>

<style scoped>
page {
  background: linear-gradient(180deg, #f5f9ff 0%, #eaf4ff 100%);
  font-family: "PingFang SC", "Microsoft YaHei", Arial, sans-serif;
}

.page {
  min-height: 100vh;
  padding: 40rpx 24rpx 160rpx;
  box-sizing: border-box;
}

/* 顶部导航栏 */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
  position: relative;
}
.back {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4f6cff;
  box-shadow: 0 8rpx 20rpx rgba(79,108,255,0.1);
  font-size: 32rpx;
  font-weight: 600;
  transition: all 0.2s ease;
}
.back:hover {
  transform: scale(1.05);
  box-shadow: 0 10rpx 24rpx rgba(79,108,255,0.15);
}
.title {
  font-size: 36rpx;
  font-weight: 700;
  color: #1a2b48;
  letter-spacing: 1rpx;
}
.right .badge {
  background: linear-gradient(135deg, #f0f3ff 0%, #e8ecff 100%);
  color: #4f6cff;
  padding: 10rpx 20rpx;
  border-radius: 999rpx;
  font-weight: 600;
  font-size: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(79,108,255,0.08);
}

/* 通用卡片样式 */
.card {
  background: #fff;
  border-radius: 32rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 12rpx 32rpx rgba(79, 108, 255, 0.06);
  border: 1rpx solid #f0f5ff;
  transition: all 0.3s ease;
}
.card:hover {
  box-shadow: 0 16rpx 40rpx rgba(79, 108, 255, 0.1);
}

/* 筛选栏样式 */
.filters .filter-row {
  display: flex;
  align-items: center;
  margin-bottom: 24rpx;
}
.filters .filter-row:last-child:not(.filter-actions) {
  margin-bottom: 0;
}
.label {
  width: 90rpx;
  font-size: 26rpx;
  color: #4e5969;
  font-weight: 600;
}
.tabs {
  display: flex;
  gap: 16rpx;
  flex: 1;
  flex-wrap: wrap;
}
.tab {
  font-size: 24rpx;
  color: #86909c;
  background: linear-gradient(135deg, #f8f9ff 0%, #f5f8ff 100%);
  padding: 12rpx 22rpx;
  border-radius: 999rpx;
  border: 1rpx solid #e8ecff;
  transition: all 0.2s ease;
}
.tab:hover {
  border-color: #c9d1ff;
  color: #4f6cff;
}
.tab.active {
  color: #fff;
  background: linear-gradient(90deg, #4f6cff 0%, #6b86ff 100%);
  font-weight: 600;
  box-shadow: 0 4rpx 12rpx rgba(79,108,255,0.15);
  border-color: transparent;
}
.picker {
  flex: 1;
  padding: 14rpx 20rpx;
  border-radius: 18rpx;
  background: linear-gradient(135deg, #f8f9ff 0%, #f5f8ff 100%);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1rpx solid #e8ecff;
}
.picker-text { 
  color: #1a2b48; 
  font-size: 26rpx; 
  font-weight: 500;
}
.picker-arrow { 
  color: #86909c; 
  font-size: 20rpx;
  transition: transform 0.2s ease;
}
.picker:active .picker-arrow {
  transform: rotate(180deg);
}

.filter-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16rpx;
  margin-top: 16rpx;
  flex-wrap: wrap;
}

/* 操作栏样式 */
.ops {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 24rpx;
}
.ops .left {
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.check {
  display: flex;
  align-items: center;
  gap: 12rpx;
  cursor: pointer;
}
.box {
  width: 36rpx;
  height: 36rpx;
  border-radius: 12rpx;
  border: 2rpx solid #c9d1ff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: transparent;
  background: #fff;
  transition: all 0.2s ease;
  font-weight: 700;
  font-size: 20rpx;
}
.box.on {
  background: linear-gradient(135deg, #4f6cff 0%, #6b86ff 100%);
  border-color: #4f6cff;
  color: #fff;
  box-shadow: 0 2rpx 8rpx rgba(79,108,255,0.2);
}
.selected { 
  color: #86909c; 
  font-size: 24rpx; 
  font-weight: 500;
}

/* 错题列表项样式 */
.mistake-top {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  margin-bottom: 20rpx;
}
.top-info { flex: 1; }
.line1 {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-wrap: wrap;
  margin-bottom: 12rpx;
}
.course {
  font-size: 30rpx;
  font-weight: 700;
  color: #1a2b48;
  line-height: 1.2;
}
.pill {
  font-size: 22rpx;
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  font-weight: 500;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.05);
}
.pill.ex { 
  background: linear-gradient(135deg, #f0f3ff 0%, #e8ecff 100%); 
  color: #4f6cff; 
}
.pill.ai { 
  background: linear-gradient(135deg, #fff3e6 0%, #ffe8cc 100%); 
  color: #ff7a00; 
}
.pill.ok { 
  background: linear-gradient(135deg, #e9fff1 0%, #d4f8e2 100%); 
  color: #1f9d55; 
}
.pill.warn { 
  background: linear-gradient(135deg, #fff1f0 0%, #ffecea 100%); 
  color: #cf1322; 
}

.line2 { 
  display: flex; 
  gap: 10rpx; 
  align-items: center; 
  flex-wrap: wrap;
}
.meta { 
  color: #86909c; 
  font-size: 24rpx; 
  font-weight: 500;
}
.dot { 
  color: #c0c4cc; 
  font-size: 20rpx;
}

.q { 
  margin-bottom: 20rpx;
}
.q-label { 
  color: #4e5969; 
  font-size: 24rpx; 
  font-weight: 600; 
  display: block;
  margin-bottom: 8rpx;
}
.q-text { 
  color: #1a2b48; 
  font-size: 26rpx; 
  line-height: 1.7; 
  white-space: pre-wrap;
}

.ans { 
  background:linear-gradient(135deg, #f8f9ff 0%, #f5f8ff 100%); 
  padding: 20rpx; 
  border-radius: 20rpx; 
  border: 1rpx solid #e8ecff;
  margin-bottom: 20rpx;
}
.ans-row { 
  display:flex; 
  justify-content: space-between; 
  align-items:center; 
  margin-bottom: 12rpx; 
}
.ans-row:last-child { 
  margin-bottom: 0; 
}
.ans-label { 
  color:#86909c; 
  font-size: 24rpx; 
  font-weight: 500;
}
.ans-val { 
  font-size: 26rpx; 
  font-weight: 600; 
}
.ans-val.ok { 
  color:#1f9d55; 
}
.ans-val.bad { 
  color:#cf1322; 
}

.actions { 
  display:flex; 
  justify-content:flex-end; 
  gap: 16rpx; 
  flex-wrap: wrap;
}

/* 按钮通用样式 */
.btn {
  background: linear-gradient(90deg, #4f6cff 0%, #6b86ff 100%);
  color: #fff;
  padding: 14rpx 24rpx;
  border-radius: 18rpx;
  font-size: 26rpx;
  font-weight: 600;
  transition: all 0.2s ease;
  box-shadow: 0 4rpx 12rpx rgba(79,108,255,0.15);
}
.btn:hover {
  transform: translateY(-2rpx);
  box-shadow: 0 6rpx 18rpx rgba(79,108,255,0.2);
}
.btn.ghost {
  background: linear-gradient(135deg, #f0f3ff 0%, #e8ecff 100%);
  color: #4f6cff;
  box-shadow: none;
  border: 1rpx solid #c9d1ff;
}
.btn.ghost:hover {
  background: linear-gradient(135deg, #e8ecff 0%, #e0e8ff 100%);
  box-shadow: 0 4rpx 12rpx rgba(79,108,255,0.1);
}
.btn.danger { 
  background: linear-gradient(90deg, #cf1322 0%, #e52e3d 100%); 
}
.btn.danger.ghost { 
  background: linear-gradient(135deg, #fff1f0 0%, #ffecea 100%); 
  color: #cf1322;
  border-color: #ffc1b8;
}
.btn.danger.ghost:hover {
  background: linear-gradient(135deg, #ffecea 0%, #ffdfda 100%);
}
.btn.mini { 
  padding: 10rpx 18rpx; 
  font-size: 24rpx; 
  border-radius: 16rpx; 
}
.btn.disabled { 
  opacity: .5; 
  pointer-events: none; 
  transform: none !important;
  box-shadow: none !important;
}

/* 状态提示文本 */
.muted { 
  color:#86909c; 
  font-size: 28rpx; 
  text-align:center; 
  padding: 40rpx 0;
  font-weight: 500;
}
.error { 
  color:#cf1322; 
  font-size: 26rpx;
  padding: 20rpx;
  border-radius: 18rpx;
  background: linear-gradient(135deg, #fff1f0 0%, #ffecea 100%);
  border: 1rpx solid #ffc1b8;
  line-height: 1.6;
}

/* 弹窗遮罩层 */
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24rpx;
  z-index: 999;
  backdrop-filter: blur(8rpx);
}
.modal {
  width: 100%;
  max-width: 820rpx;
  max-height: 85vh;
  overflow-y: auto;
  background: #fff;
  border-radius: 32rpx;
  padding: 40rpx;
  box-shadow: 0 20rpx 60rpx rgba(0,0,0,0.15);
  border: 1rpx solid #f0f5ff;
}
.modal-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #1a2b48;
  margin-bottom: 24rpx;
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #f5f8ff;
}
.modal-sub {
  font-size: 24rpx;
  color: #86909c;
  font-weight: 500;
}
.modal-q {
  background:linear-gradient(135deg, #f8f9ff 0%, #f5f8ff 100%);
  padding: 24rpx;
  border-radius: 20rpx;
  border: 1rpx solid #e8ecff;
  margin-bottom: 24rpx;
}
.modal-q-label { 
  color:#4e5969; 
  font-size: 24rpx; 
  font-weight: 600; 
  display: block;
}
.modal-q-text { 
  display:block; 
  margin-top: 12rpx; 
  color:#1a2b48; 
  font-size: 28rpx; 
  line-height: 1.7; 
  white-space: pre-wrap;
}

/* 答题选项样式 */
.opt-wrap { 
  margin-bottom: 24rpx;
}
.opt {
  display:flex;
  gap: 16rpx;
  align-items: flex-start;
  padding: 20rpx;
  border-radius: 20rpx;
  background: linear-gradient(135deg, #f8f9ff 0%, #f5f8ff 100%);
  margin-top: 16rpx;
  border: 2rpx solid transparent;
  transition: all 0.2s ease;
}
.opt:first-child {
  margin-top: 0;
}
.opt:hover {
  border-color: #e8ecff;
}
.opt.on {
  background: linear-gradient(135deg, #f0f3ff 0%, #e8ecff 100%);
  border-color: #c9d1ff;
  box-shadow: 0 4rpx 12rpx rgba(79,108,255,0.08);
}
.opt-left { 
  width: 64rpx; 
  display:flex; 
  justify-content:center; 
  flex-shrink: 0;
}
.opt-badge {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  border: 2rpx solid #c9d1ff;
  display:flex;
  align-items:center;
  justify-content:center;
  font-weight: 600;
  color: #4f6cff;
  background: #fff;
  transition: all 0.2s ease;
}
.opt-badge.on {
  background:linear-gradient(135deg, #4f6cff 0%, #6b86ff 100%);
  color:#fff;
  border-color:#4f6cff;
  box-shadow: 0 2rpx 8rpx rgba(79,108,255,0.2);
}
.opt-right { flex: 1; }
.opt-text { 
  color:#1a2b48; 
  font-size: 26rpx; 
  line-height: 1.7; 
  white-space: pre-wrap;
}

/* 弹窗按钮栏 */
.modal-actions {
  display:flex;
  gap: 16rpx;
  justify-content: flex-end;
  margin-top: 24rpx;
  flex-wrap: wrap;
  padding-top: 16rpx;
  border-top: 1rpx solid #f5f8ff;
}

/* AI 出题数量设置 */
.ai-count{ 
  margin-bottom: 24rpx;
}
.ai-row{
  display:flex;
  align-items:center;
  justify-content: space-between;
  background:linear-gradient(135deg, #f8f9ff 0%, #f5f8ff 100%);
  padding: 20rpx;
  border-radius: 20rpx;
  margin-top: 16rpx;
  border: 1rpx solid #e8ecff;
}
.ai-row:first-child {
  margin-top: 0;
}
.ai-label{ 
  font-size: 28rpx; 
  color:#1a2b48; 
  font-weight: 600; 
}
.ai-step{ 
  display:flex; 
  align-items:center; 
  gap: 20rpx; 
}
.ai-btn{
  width: 56rpx;
  height: 56rpx;
  border-radius: 16rpx;
  background:linear-gradient(135deg, #f0f3ff 0%, #e8ecff 100%);
  color:#4f6cff;
  display:flex;
  align-items:center;
  justify-content:center;
  font-weight: 700;
  font-size: 34rpx;
  border: 1rpx solid #c9d1ff;
  transition: all 0.2s ease;
}
.ai-btn:hover {
  background: linear-gradient(135deg, #e8ecff 0%, #e0e8ff 100%);
  transform: scale(1.05);
}
.ai-num{ 
  min-width: 60rpx; 
  text-align:center; 
  font-size: 30rpx; 
  font-weight: 700; 
  color:#1a2b48;
}
.ai-tip{ 
  margin-top: 16rpx; 
  color:#86909c; 
  font-size: 24rpx; 
  text-align:right; 
  font-weight: 500;
}
</style>
