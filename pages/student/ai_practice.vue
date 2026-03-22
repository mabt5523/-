<template>
  <view class="page">
    <!-- 顶部栏 -->
    <view class="header">
      <text class="title">AI练习</text>
      <view class="right">
        <text class="badge">{{ displayIndex }}/{{ displayTotal }}</text>
      </view>
    </view>

    <!-- 状态区 -->
    <view v-if="loading" class="card muted">题目加载中…</view>

    <view v-else-if="errorMsg" class="card error">
      <text>加载失败：{{ errorMsg }}</text>
      <view class="retry" @click="init">重试</view>
    </view>

    <view v-else-if="questions.length === 0" class="card muted">
      暂无题目（请先在错题集里点击“AI出题”生成）
    </view>

    <!-- 内容区 -->
    <view v-else class="content">
      <!-- 概览 -->
      <view class="card overview">
        <view class="ov-left">
          <view class="ov-row">
            <text class="ov-label">已答：</text>
            <text class="ov-value">{{ answeredCount }}</text>
            <text class="ov-split">/</text>
            <text class="ov-value">{{ questions.length }}</text>
          </view>

          <view class="ov-row">
            <text class="ov-label">正确：</text>
            <text class="ov-value ok">{{ correctCount }}</text>
          </view>

          <view class="ov-row" v-if="submitted">
            <text class="ov-label">得分：</text>
            <text class="ov-value score">{{ score }}</text>
          </view>

          <view class="ov-row">
            <text class="ov-label">课程：</text>
            <text class="ov-value">{{ courseId || '-' }}</text>
          </view>
        </view>

        <view class="ov-right" v-if="submitted">
          <view class="filter-tabs">
            <view class="filter-tab" :class="{ active: viewMode === 'all' }" @click="setViewMode('all')">全部题</view>
            <view class="filter-tab" :class="{ active: viewMode === 'wrong' }" @click="setViewMode('wrong')">只看错题</view>
          </view>
        </view>

        <view class="ov-right" v-else>
          <view class="hint">全部答完后可提交查看成绩/错题</view>
        </view>
      </view>

      <!-- 题卡：提交前（单题作答） -->
      <view v-if="!submitted" class="card q-card">
        <view class="q-top">
          <view class="q-type">{{ typeLabel(current.type) }}</view>
          <view class="q-no">第 {{ displayIndex }} 题</view>
        </view>

        <view class="q-stem">
          <text class="stem-text">{{ current.stem }}</text>
        </view>

        <!-- 单选 -->
        <view v-if="current.type === 'single'" class="options">
          <view
            v-for="opt in current.options"
            :key="opt.key"
            class="opt"
            :class="optClass(opt.key)"
            @click="pickSingle(opt.key)"
          >
            <view class="opt-key">{{ opt.key }}</view>
            <view class="opt-text">{{ opt.text }}</view>
          </view>
        </view>

        <!-- 多选 -->
        <view v-else-if="current.type === 'multi'" class="options">
          <view
            v-for="opt in current.options"
            :key="opt.key"
            class="opt"
            :class="optClass(opt.key)"
            @click="toggleMulti(opt.key)"
          >
            <view class="opt-key">{{ opt.key }}</view>
            <view class="opt-text">{{ opt.text }}</view>
          </view>

          <view class="muted small mt8">
            多选题可点选多个选项，完成后点击底部“下一题/完成作答”继续。
          </view>

          <view class="pick-preview">
            <text class="pick-label">已选</text>
            <text class="pick-val">{{ formatAnswer(currentAnswered?.picked) || '（未选择）' }}</text>
          </view>
        </view>

        <!-- 判断 -->
        <view v-else-if="current.type === 'judge'" class="options">
          <view class="opt" :class="optClass('A')" @click="pickSingle('A')">
            <view class="opt-key">A</view>
            <view class="opt-text">对</view>
          </view>
          <view class="opt" :class="optClass('B')" @click="pickSingle('B')">
            <view class="opt-key">B</view>
            <view class="opt-text">错</view>
          </view>
        </view>

        <view v-else class="muted small">
          暂不支持的题型：{{ current.type }}
        </view>
      </view>

      <!-- ✅ 提交后：整套题目（纯文本选项，无颜色） -->
      <view v-else class="card q-card">
        <view class="q-top">
          <view class="q-type">整套题目</view>
          <view class="q-no">{{ questions.length }} 题</view>
        </view>

        <view class="paper">
          <view
            v-for="(q, i) in filteredQuestions"
            :key="q.id || i"
            class="paper-item"
          >
            <view class="paper-head">
              <text class="paper-no">第 {{ q.__originIndex + 1 }} 题</text>
              <text class="paper-type">· {{ typeLabel(q.type) }}</text>
            </view>

            <view class="paper-stem">
              <text class="stem-text">{{ q.stem }}</text>
            </view>

            <!-- ✅ 选项：纯文本展示 -->
            <view v-if="q.type !== 'judge'" class="plain-options">
              <text v-for="opt in q.options" :key="opt.key" class="plain-opt">
                {{ opt.key }}. {{ opt.text }}
              </text>
            </view>

            <view v-else class="plain-options">
              <text class="plain-opt">A. 对</text>
              <text class="plain-opt">B. 错</text>
            </view>

            <!-- ✅ 答案区 -->
            <view class="plain-result" v-if="answerMap[q.__originIndex]">
              <text class="plain-line">
                你的答案：{{ formatAnswer(answerMap[q.__originIndex].picked) }}
              </text>
              <text class="plain-line">
                正确答案：{{ formatAnswer(q.answerKey) }}
              </text>
              <text class="plain-line">
                结果：{{ answerMap[q.__originIndex].right ? '正确' : '错误' }}
              </text>
            </view>

            <view class="divider"></view>
          </view>
        </view>
      </view>

      <!-- 底部按钮（提交前） -->
      <view class="actions" v-if="!submitted">
        <view class="btn outline" @click="prev" :class="{ disabled: cursor === 0 }">上一题</view>

        <view class="btn primary" @click="nextOrFinish">
          {{ isLast ? '完成作答' : '下一题' }}
        </view>
      </view>

      <!-- ✅ 提交区 -->
      <view class="card submit-card" v-if="canSubmit && !submitted">
        <view class="submit-tip">已完成全部作答，可以提交查看成绩与错题。</view>
        <view class="submit-btn" @click="submitAll" :class="{ disabled: submitting }">
          {{ submitting ? '提交中…' : '提交并查看成绩' }}
        </view>
      </view>

      <!-- ✅ 提交后：总览 -->
      <view class="card final-card" v-if="submitted">
        <view class="final-title">本次成绩</view>
        <view class="final-row"><text class="final-label">总题数</text><text class="final-val">{{ questions.length }}</text></view>
        <view class="final-row"><text class="final-label">正确题数</text><text class="final-val ok">{{ correctCount }}</text></view>
        <view class="final-row"><text class="final-label">错误题数</text><text class="final-val bad">{{ wrongCount }}</text></view>
        <view class="final-row"><text class="final-label">得分</text><text class="final-val score">{{ score }}</text></view>

        <view class="final-actions">
          <view class="mini-btn" @click="setViewMode('wrong')" :class="{ active: viewMode==='wrong' }">只看错题</view>
          <view class="mini-btn" @click="setViewMode('all')" :class="{ active: viewMode==='all' }">查看全部</view>
        </view>

        <view class="actions" style="margin-top: 12rpx;">
          <view class="btn danger ghost" @click="finish">结束并返回</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import request from '@/common/request.js'

let uidSeed = 1
function genId() { return `aiq_${Date.now()}_${uidSeed++}` }

export default {
  data() {
    return {
      loading: true,
      errorMsg: '',

      courseId: null,
      questions: [],
      cursor: 0,

      // { [originIndex]: { picked: 'A' | ['A','C'], right:true/false } }
      answerMap: {},

      submitted: false,
      viewMode: 'all',
      submitting: false
    }
  },

  computed: {
    filteredQuestions() {
      if (!this.submitted) return this.questions
      if (this.viewMode === 'all') return this.questions

      const wrongIdx = new Set(
        Object.keys(this.answerMap)
          .map(k => Number(k))
          .filter(i => this.answerMap[i] && this.answerMap[i].right === false)
      )
      return this.questions.filter((q, idx) => wrongIdx.has(idx))
    },

    current() {
      return this.questions[this.cursor] || {}
    },

    currentOriginIndex() {
      return Number(this.current.__originIndex ?? this.cursor)
    },

    currentAnswered() {
      return this.answerMap[this.currentOriginIndex] || null
    },

    displayIndex() {
      return this.questions.length ? (this.cursor + 1) : 0
    },

    displayTotal() {
      return this.questions.length || 0
    },

    isLast() {
      return this.cursor >= this.questions.length - 1
    },

    answeredCount() {
      return Object.keys(this.answerMap).filter(k => {
        const r = this.answerMap[Number(k)]
        if (!r) return false
        if (Array.isArray(r.picked)) return r.picked.length > 0
        return !!r.picked
      }).length
    },

    correctCount() {
      return Object.values(this.answerMap).filter(x => x && x.right === true).length
    },

    wrongCount() {
      return Object.values(this.answerMap).filter(x => x && x.right === false).length
    },

    canSubmit() {
      return this.questions.length > 0 && this.answeredCount === this.questions.length
    },

    score() {
      if (!this.submitted || !this.questions.length) return 0
      return Math.round((this.correctCount / this.questions.length) * 100)
    }
  },

  onLoad() {
    this.init()
  },

  methods: {
    goBack() { uni.navigateBack() },

    setViewMode(m) {
      if (!this.submitted) return
      this.viewMode = m
      this.$nextTick(() => {
        if (this.filteredQuestions.length === 0) this.cursor = 0
        else if (this.cursor > this.filteredQuestions.length - 1) this.cursor = 0
      })
    },

    typeLabel(t) {
      if (t === 'judge') return '判断题'
      if (t === 'single') return '单选题'
      if (t === 'multi') return '多选题'
      return t || '题目'
    },

    formatAnswer(ans) {
      if (ans == null) return '-'
      if (Array.isArray(ans)) return ans.join(',')
      const s = String(ans).trim()
      return s || '-'
    },

    // ========= 初始化：从本地 payload 读取 =========
    init() {
      this.loading = true
      this.errorMsg = ''
      this.questions = []
      this.cursor = 0
      this.answerMap = {}
      this.submitted = false
      this.viewMode = 'all'
      this.submitting = false

      try {
        const payload = uni.getStorageSync('AI_PRACTICE_PAYLOAD')
        const courseId = payload?.courseId
        const rawQuestions = payload?.questions || []

        this.courseId = courseId ? Number(courseId) : null

        this.questions = rawQuestions
          .map(q => this.parseQuestion(q))
          .filter(Boolean)
          .map((q, idx) => ({ ...q, __originIndex: idx }))
      } catch (e) {
        this.errorMsg = '读取AI题目失败'
      } finally {
        this.loading = false
      }
    },

    // ========= 解析题字符串 =========
    cleanText(raw = '') {
      let s = String(raw)
      s = s.replace(/【[^】]*】\s*/g, '')
      s = s.replace(/\[[^\]]*\]\s*/g, '')
      s = s.replace(/（\s*可多选\s*）/g, '')
      s = s.replace(/\(\s*可多选\s*\)/g, '')
      s = s.replace(/（\s*多选\s*）/g, '')
      s = s.replace(/\(\s*多选\s*\)/g, '')
      s = s.replace(/（\s*单选\s*）/g, '')
      s = s.replace(/\(\s*单选\s*\)/g, '')
      s = s.replace(/（\s*判断\s*）/g, '')
      s = s.replace(/\(\s*判断\s*\)/g, '')
      s = s.replace(/\n{3,}/g, '\n\n').trim()
      return s
    },

    parseQuestion(raw = '') {
      const id = genId()
      const src = String(raw || '').replace(/\r\n/g, '\n')

      let type = 'single'
      if (src.includes('【Q_SINGLE】') || src.includes('[Q_SINGLE]')) type = 'single'
      else if (src.includes('【Q_MULTI】') || src.includes('[Q_MULTI]')) type = 'multi'
      else if (src.includes('【Q_JUDGE】') || src.includes('[Q_JUDGE]')) type = 'judge'

      const ansMatch =
        src.match(/【ANSWER_KEY】\s*([A-D]+)\s*/i) ||
        src.match(/\[ANSWER_KEY\]\s*([A-D]+)\s*/i)
      const answerKey = (ansMatch?.[1] || '').trim().toUpperCase()

      const display = this.cleanText(
        src
          .replace(/【ANSWER_KEY】[\s\S]*?(?=(【SOURCE】|$))/g, '')
          .replace(/【SOURCE】[\s\S]*$/g, '')
      )

      const lines = display.split('\n').map(x => x.trim()).filter(Boolean)
      const options = []
      const stemLines = []

      for (const line of lines) {
        const m = line.match(/^([A-D])[\.\、]\s*(.+)$/)
        if (m) options.push({ key: m[1], text: m[2] })
        else stemLines.push(line)
      }

      const stem = stemLines.join('\n').trim()

      if (type === 'judge' && options.length < 2) {
        return {
          id, type,
          stem: stem || display,
          options: [{ key:'A', text:'对' }, { key:'B', text:'错' }],
          answerKey: answerKey || 'B'
        }
      }

      return { id, type, stem: stem || display, options, answerKey }
    },

    // ========= 选项态样式 =========
    optClass(key) {
      const idx = this.currentOriginIndex
      const rec = this.answerMap[idx]
      const picked = rec?.picked
      const pickedArr = Array.isArray(picked) ? picked : (picked ? [picked] : [])
      return { active: pickedArr.includes(key) }
    },

    // ========= 作答 =========
    pickSingle(key) {
      if (this.submitted) return
      const idx = this.currentOriginIndex
      this.$set(this.answerMap, idx, { ...(this.answerMap[idx] || {}), picked: key })
    },

    toggleMulti(key) {
      if (this.submitted) return
      const idx = this.currentOriginIndex
      const prev = this.answerMap[idx]?.picked
      const arr = Array.isArray(prev) ? prev.slice() : (prev ? [prev] : [])

      const i = arr.indexOf(key)
      if (i >= 0) arr.splice(i, 1)
      else arr.push(key)

      arr.sort()
      this.$set(this.answerMap, idx, { ...(this.answerMap[idx] || {}), picked: arr })
    },

    prev() {
      if (this.cursor === 0) return
      this.cursor--
    },

    nextOrFinish() {
      if (this.questions.length === 0) return

      if (this.isLast) {
        if (!this.canSubmit) {
          uni.showToast({ title: '还有题目未作答', icon: 'none' })
          return
        }
        uni.showToast({ title: '已完成作答，请点击提交', icon: 'none' })
        return
      }
      this.cursor++
    },

    // ====== 判题：对齐课后习题（多选支持 AC / A,C / A C）======
    normalizeCorrectAnswer(answer) {
      const s = (answer || '').toString().toUpperCase().trim()
      if (!s) return []
      if (s.includes(',') || s.includes(' ')) {
        return s.split(/[, ]+/).map(x => x.trim()).filter(Boolean).sort()
      }
      if (s.length > 1) return s.split('').filter(Boolean).sort()
      return [s]
    },

    normalizePicked(picked) {
      if (Array.isArray(picked)) return picked.slice().map(x => String(x).toUpperCase()).sort()
      const s = (picked || '').toString().toUpperCase().trim()
      if (!s) return []
      if (s.includes(',') || s.includes(' ')) return s.split(/[, ]+/).map(x => x.trim()).filter(Boolean).sort()
      if (s.length > 1) return s.split('').filter(Boolean).sort()
      return [s]
    },

    judgeAll() {
      this.questions.forEach((q, idx) => {
        const rec = this.answerMap[idx] || {}
        const correctArr = this.normalizeCorrectAnswer(q.answerKey)
        const pickedArr = this.normalizePicked(rec.picked)

        const right =
          correctArr.length > 0 &&
          correctArr.length === pickedArr.length &&
          correctArr.every((x, i2) => x === pickedArr[i2])

        this.$set(this.answerMap, idx, { ...rec, right })
      })
    },

    // ✅ 跟课后习题一样：把题干+选项拼成纯文本存库（更稳）
    buildQuestionTextForStore(q) {
      const stem = (q.stem || '').toString().trim()
      const opts = Array.isArray(q.options) ? q.options : []
      if (!opts.length) return stem
      const lines = opts.map(o => `${o.key}. ${o.text}`)
      return `${stem}\n${lines.join('\n')}`
    },

    buildWrongPayload() {
      const items = []
      const courseId = Number(this.courseId)

      this.questions.forEach((q, idx) => {
        const rec = this.answerMap[idx]
        if (!rec || rec.right !== false) return

        const questionType =
          q.type === 'multi' ? 'multi' :
          q.type === 'judge' ? 'judge' : 'single'

        // ✅ studentAnswer 用课后习题同款：A,B（多选）
        const studentAnswer = this.formatAnswer(rec.picked)

        items.push({
          courseId,
          source: 'ai_chat',
          questionType,
          exerciseNo: idx + 1,
          question: this.buildQuestionTextForStore(q),
          answer: String(q.answerKey || '').trim(),
          studentAnswer: String(studentAnswer || '').trim(),
          difficulty: 'easy',
          wrongCount: 1,
          status: 'active',
          masteryLevel: 0
        })
      })

      return { courseId, items }
    },

    async submitAll() {
      if (this.submitting) return
      if (!this.canSubmit) {
        uni.showToast({ title: '请先完成全部题目', icon: 'none' })
        return
      }

      this.submitting = true
      try {
        // 1) 判题
        this.judgeAll()

        // 2) 组装错题
        const wrongPayload = this.buildWrongPayload()

        // 3) 入库（走你 common/request.js 的 8080）
        if (wrongPayload.items.length > 0) {
          await request({
            url: '/api/student/mistakes/batch',
            method: 'POST',
            data: wrongPayload
          })
        }

        // 4) 切视图
        this.submitted = true
        this.viewMode = this.wrongCount > 0 ? 'wrong' : 'all'
        this.cursor = 0

        uni.showModal({
          title: '提交成功',
          content: `正确 ${this.correctCount}/${this.questions.length}，得分 ${this.score} 分`,
          showCancel: false
        })
      } catch (e) {
        console.warn('[ai_practice] save mistakes failed:', e)
        uni.showToast({ title: e?.message || '提交失败', icon: 'none' })
      } finally {
        this.submitting = false
      }
    },

    finish() {
      uni.navigateBack()
    }
  }
}
</script>

<style scoped>
page { background: linear-gradient(180deg, #f8f9ff 0%, #edf2ff 100%); }
.page { min-height: 100vh; padding: 24rpx; box-sizing: border-box; }

/* header */
.header{ display:flex; align-items:center; position: relative; margin-bottom: 18rpx; }
.back{
  width: 60rpx; height: 60rpx; border-radius: 50%;
  background: #fff; display:flex; align-items:center; justify-content:center;
  color:#4f6cff; box-shadow: 0 4rpx 12rpx rgba(79,108,255,0.15);
}
.title{ margin: 0 auto; font-size: 34rpx; font-weight: 900; color:#1d2129; }
.right{ position:absolute; right:0; }
.badge{
  padding: 10rpx 14rpx; border-radius: 999rpx;
  background:#fff; border: 1rpx solid #e5e9ff;
  color:#4f6cff; font-size: 22rpx; font-weight: 900;
}

/* cards */
.card{
  background:#fff; border-radius: 22rpx; padding: 22rpx; margin-bottom: 18rpx;
  box-shadow: 0 12rpx 32rpx rgba(79,108,255,0.08);
  border: 1rpx solid #f0f2f5;
}
.muted{ font-size: 24rpx; color:#86909c; text-align:center; padding: 18rpx 0; font-weight: 700; }
.small{ font-size: 22rpx; color:#86909c; }
.mt8{ margin-top: 8rpx; }
.error{ background:#fff2f2; border: 1rpx solid rgba(245,34,45,0.18); color:#f5222d; }
.retry{
  margin-top: 12rpx; padding: 10rpx 14rpx; display:inline-flex;
  border-radius: 14rpx; background:#fff;
  border: 1rpx solid rgba(245,34,45,0.25);
  color:#f5222d; font-size: 22rpx; font-weight: 900;
}

/* overview */
.overview{ display:flex; justify-content: space-between; gap: 16rpx; }
.ov-left{ display:flex; flex-direction: column; gap: 10rpx; }
.ov-right{ display:flex; align-items:flex-start; justify-content: flex-end; }
.ov-row{ display:flex; align-items: baseline; gap: 8rpx; }
.ov-label{ font-size: 22rpx; color:#86909c; font-weight: 700; }
.ov-value{ font-size: 30rpx; color:#1d2129; font-weight: 900; }
.ok{ color:#4f6cff; }
.score{ color:#ff7a45; }
.ov-split{ color:#86909c; }
.hint{ font-size: 22rpx; color:#86909c; font-weight: 700; }

/* filter */
.filter-tabs{ display:flex; gap: 10rpx; }
.filter-tab{
  padding: 10rpx 14rpx; border-radius: 999rpx;
  background:#fff; border: 1rpx solid #e5e9ff;
  color:#4f6cff; font-size: 22rpx; font-weight: 900;
}
.filter-tab.active{
  background: linear-gradient(90deg, #4f6cff 0%, #6b86ff 100%);
  color:#fff; border-color: transparent;
}

/* question */
.q-top{ display:flex; justify-content: space-between; align-items:center; margin-bottom: 14rpx; }
.q-type{
  padding: 8rpx 12rpx; border-radius: 999rpx;
  background:#f8f9ff; border: 1rpx solid #e5e9ff;
  color:#4f6cff; font-size: 22rpx; font-weight: 900;
}
.q-no{ font-size: 22rpx; color:#86909c; font-weight: 900; }

.q-stem{
  padding: 14rpx 14rpx; border-radius: 16rpx;
  background:#f8f9ff; border: 1rpx solid #eef1ff;
}
.stem-text{ font-size: 26rpx; color:#1d2129; font-weight: 800; line-height: 1.7; white-space: pre-wrap; }

/* options */
.options{ margin-top: 16rpx; display:flex; flex-direction: column; gap: 12rpx; }
.opt{
  display:flex; align-items:flex-start; gap: 12rpx;
  padding: 14rpx 12rpx; border-radius: 18rpx;
  background:#fff; border: 1rpx solid #f0f2f5;
}
.opt-key{
  width: 44rpx; height: 44rpx; border-radius: 50%;
  background:#f5f7ff; color:#4f6cff;
  display:flex; align-items:center; justify-content:center;
  font-size: 22rpx; font-weight: 900; flex: 0 0 auto;
}
.opt-text{ font-size: 24rpx; color:#1d2129; font-weight: 800; line-height: 1.6; white-space: pre-wrap; }
.opt.active{ border-color:#4f6cff; background:#f8f9ff; }

.pick-preview{
  margin-top:16rpx; display:flex; justify-content:space-between; align-items:center;
  background:#fff; border:1rpx solid #eef1ff; padding:16rpx 18rpx; border-radius:16rpx;
}
.pick-label{ color:#86909c; font-size:24rpx; }
.pick-val{ color:#1d2129; font-size:26rpx; font-weight:800; }

/* actions */
.actions{ display:flex; gap: 14rpx; }
.btn{
  flex: 1; height: 84rpx; border-radius: 20rpx;
  display:flex; align-items:center; justify-content:center;
  font-size: 26rpx; font-weight: 900;
  box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.06);
}
.primary{ background: linear-gradient(90deg, #4f6cff 0%, #6b86ff 100%); color:#fff; }
.outline{ background:#fff; color:#4f6cff; border: 2rpx solid #4f6cff; }
.btn.disabled{ opacity: 0.45; pointer-events: none; }
.btn.ghost{ background:#f0f3ff; color:#4f6cff; border: 2rpx solid #e5e9ff; }
.btn.danger.ghost{ background:#fff1f0; color:#cf1322; border: 2rpx solid #ffc1b8; }

/* submit */
.submit-card{ text-align:center; }
.submit-tip{ font-size: 24rpx; color:#4e5969; font-weight: 800; }
.submit-btn{
  margin-top: 12rpx; height: 84rpx; border-radius: 20rpx;
  display:flex; align-items:center; justify-content:center;
  background: linear-gradient(90deg, #ff7a45 0%, #ff9566 100%);
  color:#fff; font-size: 28rpx; font-weight: 900;
  box-shadow: 0 10rpx 26rpx rgba(255,122,69,0.25);
}
.submit-btn.disabled{ opacity: .6; pointer-events: none; }

/* paper */
.paper { display: flex; flex-direction: column; gap: 18rpx; }
.paper-item { padding: 10rpx 4rpx; }
.paper-head { font-size: 24rpx; font-weight: 900; color:#1d2129; margin-bottom: 10rpx; }
.paper-no { font-weight: 900; }
.paper-type { color:#86909c; font-weight: 800; margin-left: 6rpx; }
.paper-stem { margin-bottom: 10rpx; }
.plain-options { display: flex; flex-direction: column; gap: 6rpx; margin-top: 6rpx; }
.plain-opt { font-size: 24rpx; color:#1d2129; line-height: 1.7; }
.plain-result { margin-top: 10rpx; }
.plain-line { display:block; font-size: 22rpx; color:#4e5969; line-height: 1.7; }
.divider { margin-top: 14rpx; height: 1rpx; background: #f0f2f5; }
</style>
