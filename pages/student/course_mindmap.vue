<template>
  <view class="page">
    <!-- 顶部栏 -->
    <view class="header">

      <text class="title">课后习题</text>
      <view class="right">
        <text class="badge">{{ displayIndex }}/{{ displayTotal }}</text>
      </view>
    </view>

    <!-- 状态区 -->
    <view v-if="loading" class="card muted">题目加载中…</view>

    <view v-else-if="errorMsg" class="card error">
      <text>加载失败：{{ errorMsg }}</text>
      <view class="retry" @click="loadQuestions">重试</view>
    </view>

    <view v-else-if="questions.length === 0" class="card muted">
      暂无题目（请确认该课程已配置题库）
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
        </view>

        <view class="ov-right" v-if="submitted">
          <view class="filter-tabs">
            <view class="filter-tab" :class="{ active: viewMode === 'all' }" @click="setViewMode('all')">全部题</view>
            <view class="filter-tab" :class="{ active: viewMode === 'wrong' }" @click="setViewMode('wrong')">只看错题</view>
          </view>
        </view>

        <view class="ov-right" v-else>
          <view class="hint">答完后可提交查看成绩/错题</view>
        </view>
      </view>

      <!-- 题卡：提交前（单题作答） -->
      <view v-if="!submitted" class="card q-card">
        <view class="q-top">
          <view class="q-type">{{ typeLabel(current.questionType) }}</view>
          <view class="q-no">第 {{ displayIndex }} 题</view>
        </view>
      
        <view class="q-stem">
          <text class="stem-text">{{ current.stem }}</text>
        </view>
      
        <!-- 单选 -->
        <view v-if="current.uiType === 'single'" class="options">
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
        <view v-else-if="current.uiType === 'multi'" class="options">
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
        </view>
      
        <!-- 判断 -->
        <view v-else-if="current.uiType === 'judge'" class="options">
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
          暂不支持的题型：{{ current.questionType }}
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
              <text class="paper-type">· {{ typeLabel(q.questionType) }}</text>
            </view>
      
            <view class="paper-stem">
              <text class="stem-text">{{ q.stem }}</text>
            </view>
      
            <!-- ✅ 选项：纯文本展示 -->
            <view v-if="q.uiType !== 'judge'" class="plain-options">
              <text
                v-for="opt in q.options"
                :key="opt.key"
                class="plain-opt"
              >{{ opt.key }}. {{ opt.text }}</text>
            </view>
      
            <!-- 判断题选项：纯文本 -->
            <view v-else class="plain-options">
              <text class="plain-opt">A. 对</text>
              <text class="plain-opt">B. 错</text>
            </view>
      
            <!-- 答案区 -->
            <view class="plain-result" v-if="answerMap[q.__originIndex]">
              <text class="plain-line">
                你的答案：{{ formatAnswer(answerMap[q.__originIndex].picked) }}
              </text>
              <text class="plain-line">
                正确答案：{{ formatAnswer(q.answer) }}
              </text>
              <text class="plain-line">
                结果：{{ answerMap[q.__originIndex].right ? '正确' : '错误' }}
              </text>
      
              <view v-if="q.explain" class="plain-explain">
                <text class="plain-ex-title">解析：</text>
                <text class="plain-ex-text">{{ q.explain }}</text>
              </view>
            </view>
      
            <view class="divider"></view>
          </view>
        </view>
      </view>


      <!-- 底部按钮 -->
      <view class="actions" v-if="!submitted">
        <view class="btn outline" @click="prev" :class="{ disabled: cursor === 0 }">上一题</view>
        <view class="btn primary" @click="next">
          {{ isLast ? '完成作答' : '下一题' }}
        </view>
      </view>


      <!-- ✅ 提交区 -->
      <view class="card submit-card" v-if="canSubmit && !submitted">
        <view class="submit-tip">已完成全部作答，可以提交查看成绩与错题。</view>
        <view class="submit-btn" @click="submitAll">提交并查看成绩</view>
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
      </view>
    </view>
  </view>
</template>

<script>
import request from '@/common/request.js'

export default {
  data() {
    return {
      courseId: null,
      loading: false,
      errorMsg: '',
      questions: [],
      cursor: 0,
      answerMap: {},
      submitted: false,
      viewMode: 'all'
    }
  },

  computed: {
    filteredQuestions() {
      if (!this.submitted) return this.questions
      if (this.viewMode === 'all') return this.questions

      const wrongIds = new Set(
        Object.keys(this.answerMap)
          .map(k => Number(k))
          .filter(i => this.answerMap[i] && this.answerMap[i].right === false)
      )
      return this.questions.filter((q, idx) => wrongIds.has(idx))
    },

    current() {
      return this.filteredQuestions[this.cursor] || {}
    },

    currentOriginIndex() {
      return Number(this.current.__originIndex ?? 0)
    },

    currentAnswered() {
      return this.answerMap[this.currentOriginIndex] || null
    },

    displayIndex() {
      return this.filteredQuestions.length ? (this.cursor + 1) : 0
    },

    displayTotal() {
      return this.filteredQuestions.length || 0
    },

    isLast() {
      return this.cursor >= this.filteredQuestions.length - 1
    },

    answeredCount() {
      return Object.keys(this.answerMap).length
    },

    correctCount() {
      return Object.values(this.answerMap).filter(x => x.right).length
    },

    wrongCount() {
      return Object.values(this.answerMap).filter(x => x.right === false).length
    },

    canSubmit() {
      return this.questions.length > 0 && this.answeredCount === this.questions.length
    },

    score() {
      if (!this.submitted || !this.questions.length) return 0
      return Math.round((this.correctCount / this.questions.length) * 100)
    }
  },

  onLoad(options) {
    this.courseId = options.courseId || options.course_id || options.id
    this.loadQuestions()
  },

  methods: {
    goBack() {
      uni.navigateBack()
    },

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

    // ✅ 把答案统一格式化（多选显示 A,B,C）
    formatAnswer(ans) {
      if (ans == null) return '-'
      if (Array.isArray(ans)) return ans.join(',')
      const s = String(ans).trim()
      return s || '-'
    },

    // ✅ 提交前：选中态；提交后：对错态
    optClass(key) {
      const originIdx = this.currentOriginIndex
      const rec = this.answerMap[originIdx]

      if (!this.submitted) {
        const picked = rec?.picked
        const pickedArr = Array.isArray(picked) ? picked : (picked ? [picked] : [])
        return { active: pickedArr.includes(key) }
      }

      const correct = this.normalizeCorrectAnswer(this.current.answer)
      const picked = this.normalizePicked(rec?.picked)

      return {
        active: picked.includes(key),
        right: correct.includes(key),
        wrong: picked.includes(key) && !correct.includes(key)
      }
    },

    normalizeCorrectAnswer(answer) {
      // 后端多选可能会给 "AC" / "A,C" / "A C"
      const s = (answer || '').toString().toUpperCase().trim()
      if (!s) return []
      if (s.includes(',') || s.includes(' ')) {
        return s.split(/[, ]+/).map(x => x.trim()).filter(Boolean).sort()
      }
      // "AC" -> ["A","C"]
      if (s.length > 1) return s.split('').filter(Boolean).sort()
      return [s]
    },

    normalizePicked(picked) {
      if (Array.isArray(picked)) return picked.slice().sort()
      const s = (picked || '').toString().toUpperCase().trim()
      if (!s) return []
      if (s.includes(',') || s.includes(' ')) return s.split(/[, ]+/).map(x => x.trim()).filter(Boolean).sort()
      if (s.length > 1) return s.split('').filter(Boolean).sort()
      return [s]
    },

    // ✅ 单选/判断：点一次就写入（允许改：再点会覆盖）
    pickSingle(key) {
      if (this.submitted) return
    
      const originIdx = this.currentOriginIndex
      const correctArr = this.normalizeCorrectAnswer(this.current.answer)
      const right = correctArr.length === 1 && correctArr[0] === key
    
      const snapshot = {
        questionType: this.current.questionType,
        question: this.buildQuestionTextForStore(this.current),
        answer: (this.current.answer || '').toString().trim() // ✅ 标准答案
      }
    
      this.$set(this.answerMap, originIdx, {
        picked: key,
        right,
        questionSnapshot: snapshot
      })
    },

    // ✅ 多选：点击切换勾选（不立刻判对错；提交时统一判）
    toggleMulti(key) {
      if (this.submitted) return
    
      const originIdx = this.currentOriginIndex
      const prev = this.answerMap[originIdx]?.picked
      const arr = Array.isArray(prev) ? prev.slice() : (prev ? [prev] : [])
    
      const i = arr.indexOf(key)
      if (i >= 0) arr.splice(i, 1)
      else arr.push(key)
    
      arr.sort()
    
      const snapshot = {
        questionType: this.current.questionType,
        question: this.buildQuestionTextForStore(this.current),
        answer: (this.current.answer || '').toString().trim() // ✅ 标准答案
      }
    
      this.$set(this.answerMap, originIdx, {
        picked: arr,
        right: null,
        questionSnapshot: snapshot
      })
    },


    prev() {
      if (this.cursor === 0) return
      this.cursor--
    },

    next() {
      if (this.filteredQuestions.length === 0) return

      if (!this.submitted && this.isLast) {
        if (!this.canSubmit) {
          uni.showToast({ title: '还有题目未作答', icon: 'none' })
          return
        }
        uni.showToast({ title: '已完成作答，请点击提交', icon: 'none' })
        return
      }

      if (this.submitted && this.isLast) {
        this.cursor = 0
        return
      }

      this.cursor++
    },

    // ✅ 提交：统一判题（特别是 multi）
    async submitAll() {
      if (!this.canSubmit) {
        uni.showToast({ title: '请先完成全部题目', icon: 'none' })
        return
      }

      // 统一判题（multi）
      this.judgeAll()

      const wrongPayload = this.buildWrongPayload()

      this.submitted = true
      this.viewMode = this.wrongCount > 0 ? 'wrong' : 'all'
      this.cursor = 0

      // 你有接口就开；没有就先注释
      try {
        if (wrongPayload.items.length > 0) {
          await request({
            url: '/api/student/mistakes/batch',
            method: 'POST',
            data: wrongPayload
          })
        }
      } catch (e) {
        console.warn('[mindmap] save mistakes failed:', e)
        uni.showToast({ title: '错题保存失败（不影响成绩）', icon: 'none' })
      }

      uni.showModal({
        title: '提交成功',
        content: `正确 ${this.correctCount}/${this.questions.length}，得分 ${this.score} 分`,
        showCancel: false
      })
    },

    judgeAll() {
      // 把 answerMap 里 right === null 的 multi 判出来
      Object.keys(this.answerMap).forEach(k => {
        const idx = Number(k)
        const rec = this.answerMap[idx]
        const q = this.questions[idx]
        if (!rec || !q) return

        const uiType = q.uiType
        if (uiType !== 'multi') return

        const correct = this.normalizeCorrectAnswer(q.answer)
        const picked = this.normalizePicked(rec.picked)

        const right =
          correct.length === picked.length &&
          correct.every((x, i2) => x === picked[i2])

        this.$set(this.answerMap, idx, {
          ...rec,
          right
        })
      })
    },

    buildWrongPayload() {
      const items = []
      const courseId = Number(this.courseId)
    
      Object.keys(this.answerMap).forEach(k => {
        const idx = Number(k)
        const rec = this.answerMap[idx]
        if (!rec || rec.right !== false) return
    
        const snap = rec.questionSnapshot || {}
        const q = this.questions[idx] || {}
    
        // ✅ 题型（后端枚举是 single/multi/judge）
        const qt = (snap.questionType || q.questionType || q.uiType || 'single')
        const questionType =
          qt === 'multi' ? 'multi' :
          qt === 'judge' ? 'judge' : 'single'
    
        // ✅ 标准答案 + 学生答案（都变成字符串）
        const answer = (snap.answer ?? q.answer ?? '').toString().trim()
        const studentAnswer = this.formatAnswer(rec.picked) // 例如 "A,B" 或 "B"
    
        items.push({
          courseId,
          source: 'exercise',
          questionType,          // ✅ single/multi/judge
          exerciseNo: idx + 1,   // ✅ 题号（你后端用它做唯一键）
          question: (snap.question || q.question || q.stem || '').toString(),
    
          // ✅ 新增：传给后端存入表
          answer,
          studentAnswer,
    
          difficulty: 'easy',
          wrongCount: 1,
          status: 'active',
          masteryLevel: 0
        })
      })
    
      return { courseId, items }
    },


    buildQuestionTextForStore(q) {
      const stem = (q.stem || '').toString().trim()
      const opts = Array.isArray(q.options) ? q.options : []
      if (!opts.length) return stem
      const lines = opts.map(o => `${o.key}. ${o.text}`)
      return `${stem}\n${lines.join('\n')}`
    },

    async loadQuestions() {
      if (!this.courseId) {
        this.errorMsg = '缺少 courseId 参数'
        return
      }

      this.loading = true
      this.errorMsg = ''
      this.questions = []
      this.cursor = 0
      this.answerMap = {}
      this.submitted = false
      this.viewMode = 'all'

      try {
        const res = await request({
          url: '/api/student/questions',
          method: 'GET',
          params: { course_id: this.courseId },
          data: { course_id: this.courseId }
        })

        const arr = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : [])
        this.questions = arr.map((q, idx) => {
          const nq = this.normalizeQuestion(q, idx)
          nq.__originIndex = idx
          return nq
        })
      } catch (e) {
        console.error('[mindmap] load questions failed:', e)
        this.errorMsg = e?.data?.message || e?.message || e?.errMsg || e?.data?.error || '接口异常'
      } finally {
        this.loading = false
      }
    },

    normalizeQuestion(q, idx) {
      const rawType = (q?.questionType || '').toString().trim()
      const rawQuestion = (q?.question || '').toString()
      const rawAnswer = (q?.answer || '').toString().trim()

      const text = rawQuestion.replace(/\r\n/g, '\n')
      const parsed = this.parseStemAndOptions(text)

      let uiType = rawType
      if (rawType === 'judge') uiType = 'judge'
      else if (rawType === 'multi') uiType = 'multi'
      else if (parsed.options.length >= 2) uiType = 'single'
      else uiType = 'single'

      return {
        id: q?.id || idx,
        questionType: rawType || 'single',
        uiType,
        stem: parsed.stem,
        options: parsed.options,
        answer: rawAnswer,
        explain: q?.explain || ''
      }
    },

    parseStemAndOptions(text) {
      const lines = text.split('\n').map(s => s.trim()).filter(Boolean)
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
.muted{ font-size: 24rpx; color:#86909c; }
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
.mini{ font-size: 22rpx; margin-left: 6rpx; }

.q-stem{
  padding: 14rpx 14rpx; border-radius: 16rpx;
  background:#f8f9ff; border: 1rpx solid #eef1ff;
}
.stem-text{ font-size: 26rpx; color:#1d2129; font-weight: 800; line-height: 1.7; }

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
.opt-text{ font-size: 24rpx; color:#1d2129; font-weight: 800; line-height: 1.6; }

.opt.active{ border-color:#4f6cff; background:#f8f9ff; }
.opt.right{ border-color: rgba(82,196,26,0.5); background: rgba(82,196,26,0.08); }
.opt.wrong{ border-color: rgba(245,34,45,0.5); background: rgba(245,34,45,0.08); }

/* ✅ result layout fixed */
.result{ margin-top: 16rpx; padding-top: 14rpx; border-top: 1rpx solid #f0f2f5; }
.result-row{ margin-top: 10rpx; }
.tag{
  padding: 8rpx 12rpx; border-radius: 999rpx;
  font-size: 22rpx; font-weight: 900; display:inline-flex;
}
.tag-ok{ background: rgba(82,196,26,0.12); color:#389e0d; border: 1rpx solid rgba(82,196,26,0.25); }
.tag-bad{ background: rgba(245,34,45,0.12); color:#cf1322; border: 1rpx solid rgba(245,34,45,0.25); }

.ans-line{
  font-size: 22rpx; color:#4e5969; font-weight: 800;
  display:flex; flex-wrap: wrap; line-height: 1.7;
}
.ans-label{ color:#86909c; font-weight: 800; margin-right: 6rpx; }
.ans-val{ color:#1d2129; font-weight: 900; word-break: break-all; }

/* explain */
.explain{
  margin-top: 12rpx; padding: 12rpx 12rpx; border-radius: 16rpx;
  background:#fff; border: 1rpx solid #f0f2f5;
}
.ex-title{ font-size: 22rpx; font-weight: 900; color:#1d2129; }
.ex-text{ display:block; margin-top: 6rpx; font-size: 22rpx; color:#4e5969; line-height: 1.7; }

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
.btn.disabled{ opacity: 0.45; }

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

/* final */
.final-title{ font-size: 28rpx; font-weight: 900; color:#1d2129; margin-bottom: 12rpx; }
.final-row{ display:flex; justify-content: space-between; padding: 10rpx 0; border-bottom: 1rpx dashed #eef1ff; }
.final-row:last-child{ border-bottom: none; }
.final-label{ font-size: 24rpx; color:#86909c; font-weight: 800; }
.final-val{ font-size: 26rpx; color:#1d2129; font-weight: 900; }
.final-val.ok{ color:#4f6cff; }
.final-val.bad{ color:#cf1322; }
.final-val.score{ color:#ff7a45; }
.final-actions{ margin-top: 14rpx; display:flex; gap: 12rpx; }
.mini-btn{
  flex: 1; padding: 12rpx 0; border-radius: 999rpx;
  background:#fff; border: 1rpx solid #e5e9ff;
  color:#4f6cff; text-align:center; font-size: 24rpx; font-weight: 900;
}
.mini-btn.active{
  background: linear-gradient(90deg, #4f6cff 0%, #6b86ff 100%);
  color:#fff; border-color: transparent;
}
/* 提交后：整套题目纯文本样式 */
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

.plain-explain { margin-top: 8rpx; }
.plain-ex-title { font-size: 22rpx; font-weight: 900; color:#1d2129; }
.plain-ex-text { display:block; margin-top: 4rpx; font-size: 22rpx; color:#4e5969; line-height: 1.7; }

.divider { margin-top: 14rpx; height: 1rpx; background: #f0f2f5; }

</style>
