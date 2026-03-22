<template>
  <view class="page">
    <!-- 头部 -->
    <view class="header">
      <text class="title">第 28 关：多角度挑战 🔍</text>
      <text class="tip">任务：同一数据用不同图表解读 + 词云找关键词</text>
    </view>

    <!-- HUD -->
    <view class="hud">
      <text class="badge">✅ 进度：{{ doneCount }}/{{ totalCount }}</text>
      <text class="small">⏱ 用时：{{ formatTime(elapsedMs) }}</text>
    </view>

    <view class="board">
      <view class="board-bg" />

      <!-- 提示栏 -->
      <view class="hintbar">
        <view class="topic">本局重点：数据可多角度分析｜文本也能变成数据</view>
        <text class="hinttext">
          第一部分：同一数据集，用不同图表回答不同问题。
          <text class="linebreak" />
          第二部分：词云小游戏——从一堆词里找出“关键词”。
        </text>
      </view>

      <view class="content">
        <!-- 左：多角度图表解读 -->
        <view class="left">
          <view class="panel">
            <view class="panel-head">
              <text class="panel-title">Part A：同一数据，不同解读</text>
              <view class="mode-pills">
                <view class="pill" :class="{ on: aStep===0 }" @click="jumpA(0)" v-if="!success">趋势</view>
                <view class="pill" :class="{ on: aStep===1 }" @click="jumpA(1)" v-if="!success">对比</view>
                <view class="pill" :class="{ on: aStep===2 }" @click="jumpA(2)" v-if="!success">占比</view>
              </view>
            </view>

            <view class="dataset">
              <text class="ds-title">同一数据集：一周饮料销量（杯）</text>
              <view class="ds-grid">
                <view class="ds-item" v-for="(x,i) in dataset" :key="i">
                  <text class="ds-k">{{ x.day }}</text>
                  <text class="ds-v">{{ x.value }}</text>
                </view>
              </view>
            </view>

            <view class="question">
              <text class="q-title">问题 {{ aStep + 1 }}/3</text>
              <text class="q-text">{{ aQuestions[aStep].q }}</text>
            </view>

            <view class="chart-pick">
              <text class="pick-title">你会用哪种图表更容易回答？</text>
              <view class="chart-grid">
                <view class="chart-card" :class="{ picked: aPick==='line', disabled: aLocked }" @click="pickA('line')">
                  <text class="icon">📈</text>
                  <text class="name">折线图</text>
                  <text class="desc">看趋势</text>
                </view>
                <view class="chart-card" :class="{ picked: aPick==='bar', disabled: aLocked }" @click="pickA('bar')">
                  <text class="icon">📊</text>
                  <text class="name">柱状图</text>
                  <text class="desc">看对比</text>
                </view>
                <view class="chart-card" :class="{ picked: aPick==='pie', disabled: aLocked }" @click="pickA('pie')">
                  <text class="icon">🥧</text>
                  <text class="name">饼图</text>
                  <text class="desc">看占比</text>
                </view>
                <view class="chart-card" :class="{ picked: aPick==='table', disabled: aLocked }" @click="pickA('table')">
                  <text class="icon">🧾</text>
                  <text class="name">表格</text>
                  <text class="desc">看细节</text>
                </view>
              </view>

              <view class="buttons">
                <view class="btn reset" @click="resetA" :class="{ disabled: aLocked }">↩ 重选</view>
                <view class="btn check" @click="checkA" :class="{ disabled: aLocked || !aPick }">✅ 提交</view>
              </view>

              <view class="mini-tip">
                <text>提示：趋势→折线｜对比→柱状｜占比→饼图</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 右：词云找关键词 -->
        <view class="right">
          <view class="panel">
            <view class="panel-head">
              <text class="panel-title">Part B：词云小游戏（找关键词）</text>
              <view class="b-badge">已找到：{{ pickedWords.length }}/{{ needPick }}</view>
            </view>

            <view class="text-box">
              <text class="tb-title">一段文本（已变成词数据）</text>
              <text class="tb-text">
                今天我们讨论“环保”。环保可以从垃圾分类、节约用电、减少塑料、绿色出行开始。
                保护环境能让城市更干净，空气更清新。大家一起行动，环保就能变得更简单。
              </text>
            </view>

            <view class="cloud">
              <text class="cloud-title">点击词云里的“关键词”（出现次数多 / 更重要）</text>
              <view class="cloud-wrap">
                <view
                  v-for="w in cloudWords"
                  :key="w.word"
                  class="word"
                  :class="{
                    picked: pickedMap[w.word],
                    disabled: bLocked
                  }"
                  :style="{ fontSize: w.size + 'rpx' }"
                  @click="pickWord(w.word)"
                >
                  {{ w.word }}
                </view>
              </view>
            </view>

            <view class="buttons">
              <view class="btn reset" @click="resetB" :class="{ disabled: bLocked }">↩ 重选</view>
              <view class="btn check" @click="checkB" :class="{ disabled: bLocked || pickedWords.length!==needPick }">
                ✅ 提交
              </view>
            </view>

            <view class="mini-tip">
              <text>提示：更大的词通常更“关键”。</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 结果弹窗 -->
    <view v-if="resultPopup.show" class="mini-popup" @touchmove.stop.prevent>
      <view class="mini-card">
        <text class="mini-title">{{ resultPopup.ok ? '✅ 正确！' : '❌ 再试试' }}</text>
        <text class="mini-desc">{{ resultPopup.msg }}</text>
        <view class="mini-actions">
          <view class="mini-btn" @click="closeResult">继续</view>
        </view>
      </view>
    </view>

    <!-- 通关弹窗 -->
    <view v-if="success" class="popup" @touchmove.stop.prevent>
      <view class="popup-card">
        <text class="pop-title">🎉 通关成功！</text>
        <text class="pop-desc">
          你学会了：
          <text class="linebreak" />
          1）同一数据可以从趋势/对比/占比等多角度分析
          <text class="linebreak" />
          2）文本也能变成数据（词频/关键词/词云）
          <text class="linebreak" />
          用时：{{ formatTime(elapsedMs) }}｜错误：{{ wrongTimes }} 次｜星星：{{ earnedStars }}⭐
        </text>
        <view class="pop-actions">
          <view class="pop-btn" @click="newRound">再玩一次</view>
          <view class="pop-btn primary" @click="goNext">下一关 →</view>
        </view>
      </view>
    </view>

    <!-- 轻提示 -->
    <view v-if="toast.show" class="mini-toast">
      <text>{{ toast.text }}</text>
    </view>
  </view>
</template>

<script>
import request from '@/common/request.js'

export default {
  data() {
    return {
      levelId: 28,

      // ===== 计时 =====
      elapsedMs: 0,
      clock: null,
      startAt: 0,

      // ===== 通用统计 =====
      wrongTimes: 0,
      earnedStars: 0,
      success: false,

      // UI
      toast: { show: false, text: '' },

      // ✅ 结果弹窗（你模板里用的是 resultPopup）
      resultPopup: { show: false, ok: true, msg: '' },

      // ===== Part A：数据集 =====
      dataset: [
        { day: '周一', value: 120 },
        { day: '周二', value: 160 },
        { day: '周三', value: 140 },
        { day: '周四', value: 220 },
        { day: '周五', value: 180 },
        { day: '周六', value: 260 },
        { day: '周日', value: 200 }
      ],
      aQuestions: [
        { type: 'trend', q: '这周销量整体是上升还是下降？哪天变化最明显？' },
        { type: 'compare', q: '哪一天销量最高？哪一天最低？差多少？' },
        { type: 'share', q: '周末（周六+周日）的销量占一周大概多少比例？' }
      ],
      aStep: 0,
      aPick: '',
      aLocked: false,
      aDone: false,

      // ===== Part B：词云 =====
      needPick: 3,
      // 词云（size 越大越“关键”）
      cloudWords: [
        { word: '环保', size: 44 },
        { word: '环境', size: 38 },
        { word: '垃圾分类', size: 34 },
        { word: '减少塑料', size: 32 },
        { word: '节约用电', size: 30 },
        { word: '绿色出行', size: 30 },
        { word: '城市', size: 26 },
        { word: '空气', size: 26 },
        { word: '行动', size: 24 },
        { word: '简单', size: 22 }
      ],
      // 你可以按你教材想强调的“关键词”替换这里
      bCorrectWords: ['环保', '垃圾分类', '减少塑料'],
      pickedWords: [],
      pickedMap: {},
      bLocked: false,
      bDone: false,

      // ===== 上报（可选，不影响前端）=====
      reported: false
    }
  },

  computed: {
    totalCount() {
      // 两个任务：Part A + Part B
      return 2
    },
    doneCount() {
      return (this.aDone ? 1 : 0) + (this.bDone ? 1 : 0)
    }
  },

  async onLoad() {
    // 有后端就读一下进度；失败也不影响本关逻辑
    try {
      await request({ url: `/api/game/levels/${this.levelId}`, method: 'GET' })
    } catch (e) {}

    this.newRound()
  },

  onUnload() {
    this.stopClock()
    clearTimeout(this._t)
  },

  methods: {
    // ===== 基础 =====
    goBack() {
      uni.navigateBack({ delta: 1 })
    },
    goNext() {
      // 下一关按你工程实际路径改
      uni.redirectTo({ url: '/pages/game/level/level29' })
    },

    // ===== 计时 =====
    startClock() {
      this.stopClock()
      this.elapsedMs = 0
      this.startAt = Date.now()
      this.clock = setInterval(() => {
        this.elapsedMs = Date.now() - this.startAt
      }, 100)
    },
    stopClock() {
      if (this.clock) clearInterval(this.clock)
      this.clock = null
    },
    formatTime(ms) {
      const totalSec = Math.floor(ms / 1000)
      const m = Math.floor(totalSec / 60)
      const s = totalSec % 60
      const ms2 = Math.floor((ms % 1000) / 10)
      const mm = m < 10 ? '0' + m : '' + m
      const ss = s < 10 ? '0' + s : '' + s
      const msStr = ms2 < 10 ? '0' + ms2 : '' + ms2
      return `${mm}:${ss}.${msStr}`
    },

    // ===== 星星规则（可按你需要调整）=====
    calcStars({ usedMs, wrongTimes }) {
      const sec = usedMs / 1000
      if (wrongTimes === 0 && sec <= 90) return 3
      if (wrongTimes <= 2 && sec <= 150) return 2
      return 1
    },

    // ===== UI =====
    toastMini(text) {
      this.toast.text = text
      this.toast.show = true
      clearTimeout(this._t)
      this._t = setTimeout(() => (this.toast.show = false), 900)
    },

    showResult(ok, msg) {
      this.resultPopup = { show: true, ok, msg }
    },

    closeResult() {
      this.resultPopup.show = false

      // ✅ 如果 A 还没做完：正确就进入下一问；错误就留在本问
      if (!this.success && !this.aDone) {
        if (this._lastAction === 'A_OK_NEXT') {
          this._lastAction = ''
          // 下一问
          if (this.aStep < 2) {
            this.aStep += 1
            this.aPick = ''
            this.aLocked = false
            this.toastMini('继续下一问～')
          } else {
            // A 完成
            this.aDone = true
            this.aLocked = false
            this.toastMini('✅ Part A 完成！去右边做词云～')
          }
        } else if (this._lastAction === 'A_WRONG') {
          this._lastAction = ''
          this.aLocked = false
        }
        return
      }

      // ✅ 如果 B 还没做完：正确就完成 B；错误就允许重选
      if (!this.success && this.aDone && !this.bDone) {
        if (this._lastAction === 'B_OK_DONE') {
          this._lastAction = ''
          this.bDone = true
          this.bLocked = false
          this.tryFinish()
        } else if (this._lastAction === 'B_WRONG') {
          this._lastAction = ''
          this.bLocked = false
        }
      }
    },

    // ===== 初始化/重开 =====
    newRound() {
      this.reported = false
      this.success = false
      this.wrongTimes = 0
      this.earnedStars = 0

      // A
      this.aStep = 0
      this.aPick = ''
      this.aLocked = false
      this.aDone = false

      // B
      this.pickedWords = []
      this.pickedMap = {}
      this.bLocked = false
      this.bDone = false

      this.resultPopup = { show: false, ok: true, msg: '' }
      this._lastAction = ''

      this.startClock()
      uni.vibrateShort({ type: 'light' })
      this.toastMini('开始挑战：先做 Part A，再做 Part B！')
    },

    // ===== Part A：交互 =====
    jumpA(step) {
      if (this.success) return
      if (this.aLocked) return
      if (this.aDone) return
      this.aStep = step
      this.aPick = ''
      uni.vibrateShort({ type: 'light' })
    },

    pickA(kind) {
      if (this.aLocked || this.success || this.aDone) return
      this.aPick = kind
      uni.vibrateShort({ type: 'light' })
    },

    resetA() {
      if (this.aLocked || this.success || this.aDone) return
      this.aPick = ''
      uni.vibrateShort({ type: 'light' })
      this.toastMini('已重选～')
    },

    correctChartForType(type) {
      if (type === 'trend') return 'line'
      if (type === 'compare') return 'bar'
      if (type === 'share') return 'pie'
      return 'table'
    },

    checkA() {
      if (this.aLocked || this.success || this.aDone) return
      if (!this.aPick) {
        this.toastMini('先选一种图表～')
        return
      }

      this.aLocked = true
      const q = this.aQuestions[this.aStep]
      const correct = this.correctChartForType(q.type)

      if (this.aPick === correct) {
        this._lastAction = 'A_OK_NEXT'
        this.showResult(true, `答对啦！这一问更适合用「${this.chartName(correct)}」。`)
      } else {
        this._lastAction = 'A_WRONG'
        this.wrongTimes += 1
        this.showResult(false, `这题更推荐「${this.chartName(correct)}」。再想想：${this.hintForType(q.type)}`)
      }
    },

    chartName(kind) {
      return kind === 'line'
        ? '折线图'
        : kind === 'bar'
        ? '柱状图'
        : kind === 'pie'
        ? '饼图'
        : '表格'
    },

    hintForType(type) {
      if (type === 'trend') return '趋势变化用折线最直观。'
      if (type === 'compare') return '对比高低用柱状一眼看出来。'
      if (type === 'share') return '占比问题用饼图最适合。'
      return '看细节可以用表格。'
    },

    // ===== Part B：交互 =====
    pickWord(word) {
      if (this.bLocked || this.success) return
      if (!this.aDone) {
        this.toastMini('先完成 Part A 再来做词云～')
        return
      }

      const picked = !!this.pickedMap[word]
      if (picked) {
        // 取消
        this.pickedMap = { ...this.pickedMap, [word]: false }
        this.pickedWords = this.pickedWords.filter(x => x !== word)
      } else {
        // 选中（最多 needPick 个）
        if (this.pickedWords.length >= this.needPick) {
          this.toastMini(`最多选 ${this.needPick} 个关键词`)
          return
        }
        this.pickedMap = { ...this.pickedMap, [word]: true }
        this.pickedWords = [...this.pickedWords, word]
      }
      uni.vibrateShort({ type: 'light' })
    },

    resetB() {
      if (this.bLocked || this.success) return
      this.pickedWords = []
      this.pickedMap = {}
      uni.vibrateShort({ type: 'light' })
      this.toastMini('已重选～')
    },

    checkB() {
      if (this.bLocked || this.success) return
      if (!this.aDone) {
        this.toastMini('先完成 Part A～')
        return
      }
      if (this.pickedWords.length !== this.needPick) {
        this.toastMini(`请选满 ${this.needPick} 个关键词`)
        return
      }

      this.bLocked = true

      // 判定：必须完全匹配正确集合（顺序无关）
      const pickedSet = new Set(this.pickedWords)
      const correctSet = new Set(this.bCorrectWords)

      let ok = true
      // picked 中不能有错误词
      for (const w of pickedSet) {
        if (!correctSet.has(w)) ok = false
      }
      // correct 中不能漏选
      for (const w of correctSet) {
        if (!pickedSet.has(w)) ok = false
      }

      if (ok) {
        this._lastAction = 'B_OK_DONE'
        this.showResult(true, '找对啦！这些词出现频率高、也更能代表主题。')
      } else {
        this._lastAction = 'B_WRONG'
        this.wrongTimes += 1
        this.showResult(false, '还差一点点～提示：更大的词更可能是关键词。你也可以先“重选”。')
      }
    },

    // ===== 通关 =====
    async tryFinish() {
      if (this.aDone && this.bDone) {
        this.stopClock()
        this.earnedStars = this.calcStars({ usedMs: this.elapsedMs, wrongTimes: this.wrongTimes })
        this.success = true
        uni.vibrateLong()

        // ✅ 有后端就上报；失败不影响前端通关
        try {
          if (!this.reported) {
            this.reported = true
            await request({
              url: `/api/game/levels/${this.levelId}/complete`,
              method: 'POST',
              data: {
                stars: this.earnedStars,
                steps: 2,
                score: 0,
                usedTimeMs: this.elapsedMs,
                usedTimeSec: Math.round(this.elapsedMs / 1000),
                wrongTimes: this.wrongTimes
              }
            })
          }
        } catch (e) {}
      }
    }
  }
}
</script>

<style scoped>
.page{
  height: 150vh;
  overflow: hidden;
  padding: 40rpx 30rpx;
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 55%, #89f7fe 100%);
}

/* header */
.header{
  position: relative;
  text-align: center;
  color:#fff;
  margin-bottom: 12rpx;
}
.back-btn{
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 60rpx;
  height: 60rpx;
  border-radius: 999rpx;
  background: rgba(255,255,255,0.22);
  display:flex;
  align-items:center;
  justify-content:center;
  font-size: 32rpx;
  font-weight: 900;
}
.title{ font-size: 40rpx; font-weight: 900; }
.tip{ display:block; margin-top: 8rpx; font-size: 24rpx; opacity: 0.95; }

/* hud */
.hud{
  display:flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10rpx;
  gap: 12rpx;
}
.badge{
  display:inline-flex;
  align-items:center;
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255,255,255,0.22);
  color: #fff;
  font-size: 24rpx;
  font-weight: 900;
}
.small{
  color:#eaf2ff;
  font-size: 22rpx;
  opacity: 0.95;
}

/* board */
.board{
  position: relative;
  background: rgba(255,255,255,0.95);
  border-radius: 32rpx;
  padding: 18rpx;
  box-shadow: 0 18rpx 50rpx rgba(0,0,0,0.18);
  overflow: hidden;
  border: 2rpx solid rgba(255,255,255,0.8);

  height: calc(100vh - 40rpx - 30rpx - 0rpx);
  display:flex;
  flex-direction: column;
  gap: 10rpx;
  min-height: 0;
}
.board-bg{
  position:absolute;
  inset:0;
  background:
    radial-gradient(circle at 20% 20%, rgba(255, 234, 0, 0.10), transparent 40%),
    radial-gradient(circle at 80% 25%, rgba(0, 200, 255, 0.10), transparent 45%),
    radial-gradient(circle at 50% 80%, rgba(255, 0, 150, 0.08), transparent 50%);
  z-index:0;
}

/* hint */
.hintbar{
  position: relative;
  z-index: 1;
  padding: 14rpx 16rpx;
  border-radius: 22rpx;
  background: rgba(79,108,255,0.08);
  border: 2rpx solid rgba(79,108,255,0.14);
}
.hinttext{
  color:#2b3a66;
  font-size: 24rpx;
  line-height: 1.5;
  font-weight: 700;
}
.topic{
  margin: 10rpx 0;
  padding: 12rpx 18rpx;
  border-radius: 18rpx;
  background: rgba(255,159,67,0.15);
  color:#2b3a66;
  font-size: 26rpx;
  font-weight: 900;
  text-align:center;
}
.linebreak{ display:block; height: 10rpx; }

.content{
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  display:flex;
  gap: 10rpx;
  overflow: hidden;
}

/* columns */
.left{ flex: 1.1; min-height: 0; }
.right{ flex: 0.9; min-height: 0; }

.panel{
  height: 100%;
  border-radius: 26rpx;
  background: rgba(255,255,255,0.92);
  border: 2rpx solid rgba(0,0,0,0.06);
  box-shadow: 0 10rpx 22rpx rgba(0,0,0,0.08);
  padding: 14rpx;
  overflow: hidden;
  display:flex;
  flex-direction: column;
  gap: 10rpx;
}
.panel-head{
  display:flex;
  align-items:center;
  justify-content: space-between;
  gap: 10rpx;
}
.panel-title{
  font-size: 24rpx;
  font-weight: 900;
  color:#2b3a66;
}
.mode-pills{
  display:flex;
  gap: 8rpx;
}
.pill{
  padding: 10rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(79,108,255,0.10);
  border: 2rpx solid rgba(79,108,255,0.16);
  font-size: 20rpx;
  font-weight: 900;
  color:#2b3a66;
}
.pill.on{
  background: rgba(46,213,115,0.14);
  border-color: rgba(46,213,115,0.22);
}

.b-badge{
  padding: 10rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(255,159,67,0.14);
  border: 2rpx solid rgba(255,159,67,0.20);
  font-size: 20rpx;
  font-weight: 900;
  color:#2b3a66;
}

/* dataset */
.dataset{
  border-radius: 22rpx;
  background: rgba(79,108,255,0.06);
  border: 2rpx dashed rgba(79,108,255,0.14);
  padding: 14rpx;
}
.ds-title{
  display:block;
  font-size: 22rpx;
  font-weight: 900;
  color:#2b3a66;
  margin-bottom: 10rpx;
}
.ds-grid{
  display:grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 10rpx;
}
.ds-item{
  border-radius: 18rpx;
  background: rgba(255,255,255,0.92);
  border: 2rpx solid rgba(0,0,0,0.06);
  padding: 10rpx;
  text-align:center;
}
.ds-k{
  display:block;
  font-size: 20rpx;
  font-weight: 900;
  color:#6b7280;
}
.ds-v{
  display:block;
  margin-top: 4rpx;
  font-size: 24rpx;
  font-weight: 900;
  color:#2b3a66;
}

/* question */
.question{
  border-radius: 22rpx;
  background: rgba(255,159,67,0.08);
  border: 2rpx dashed rgba(255,159,67,0.18);
  padding: 14rpx;
}
.q-title{
  display:block;
  font-size: 22rpx;
  font-weight: 900;
  color:#2b3a66;
  margin-bottom: 6rpx;
}
.q-text{
  display:block;
  font-size: 24rpx;
  font-weight: 900;
  color:#2b3a66;
  line-height: 1.4;
}

/* chart pick */
.chart-pick{
  flex: 1;
  min-height: 0;
  display:flex;
  flex-direction: column;
}
.pick-title{
  font-size: 22rpx;
  font-weight: 900;
  color:#2b3a66;
  margin-bottom: 10rpx;
}
.chart-grid{
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap: 10rpx;
}
.chart-card{
  border-radius: 20rpx;
  background: rgba(255,255,255,0.92);
  border: 2rpx solid rgba(0,0,0,0.06);
  box-shadow: 0 10rpx 22rpx rgba(0,0,0,0.06);
  padding: 14rpx;
}
.chart-card:active{ transform: scale(0.99); }
.chart-card.picked{
  border-color: rgba(46,213,115,0.45);
  background: rgba(46,213,115,0.10);
}
.chart-card.disabled{ opacity: 0.6; pointer-events:none; box-shadow:none; }
.icon{ font-size: 34rpx; }
.name{
  display:block;
  margin-top: 6rpx;
  font-size: 24rpx;
  font-weight: 900;
  color:#2b3a66;
}
.desc{
  display:block;
  margin-top: 4rpx;
  font-size: 20rpx;
  font-weight: 800;
  color:#6b7280;
}

/* text */
.text-box{
  border-radius: 22rpx;
  background: rgba(79,108,255,0.06);
  border: 2rpx dashed rgba(79,108,255,0.14);
  padding: 14rpx;
}
.tb-title{
  display:block;
  font-size: 22rpx;
  font-weight: 900;
  color:#2b3a66;
  margin-bottom: 8rpx;
}
.tb-text{
  display:block;
  font-size: 22rpx;
  font-weight: 800;
  color:#6b7280;
  line-height: 1.55;
}

/* cloud */
.cloud{
  flex: 1;
  min-height: 0;
  border-radius: 22rpx;
  background: rgba(255,159,67,0.06);
  border: 2rpx dashed rgba(255,159,67,0.18);
  padding: 14rpx;
  overflow: hidden;
}
.cloud-title{
  display:block;
  font-size: 22rpx;
  font-weight: 900;
  color:#2b3a66;
  margin-bottom: 10rpx;
}
.cloud-wrap{
  display:flex;
  flex-wrap: wrap;
  gap: 10rpx;
  align-content:flex-start;
}
.word{
  padding: 10rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(255,255,255,0.92);
  border: 2rpx solid rgba(0,0,0,0.06);
  font-weight: 900;
  color:#2b3a66;
  line-height: 1;
}
.word:active{ transform: scale(0.99); }
.word.picked{
  border-color: rgba(46,213,115,0.45);
  background: rgba(46,213,115,0.10);
}
.word.disabled{ opacity: 0.6; pointer-events:none; }

/* buttons */
.buttons{
  margin-top: 10rpx;
  display:flex;
  gap: 12rpx;
}
.btn{
  flex: 1;
  padding: 18rpx 0;
  text-align:center;
  border-radius: 999rpx;
  font-size: 26rpx;
  font-weight: 900;
  box-shadow: 0 12rpx 24rpx rgba(0,0,0,0.12);
}
.btn:active{ transform: scale(0.98); }
.btn.disabled{ opacity: 0.55; pointer-events:none; box-shadow:none; }
.reset{ background: linear-gradient(90deg,#f5f5f5 0%,#e9e9e9 100%); color:#555; }
.check{ background: linear-gradient(90deg,#4f6cff 0%,#667eea 100%); color:#fff; }

.mini-tip{
  margin-top: 10rpx;
  padding: 12rpx 14rpx;
  border-radius: 18rpx;
  background: rgba(0,0,0,0.04);
  color:#6b7280;
  font-size: 22rpx;
  font-weight: 800;
  text-align:center;
}

/* result popup */
.mini-popup{
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  display:flex;
  align-items:center;
  justify-content:center;
  z-index: 98;
  backdrop-filter: blur(6rpx);
}
.mini-card{
  width: 82vw;
  background: rgba(255,255,255,0.96);
  border-radius: 28rpx;
  padding: 40rpx 30rpx 30rpx;
  box-shadow: 0 22rpx 60rpx rgba(0,0,0,0.22);
}
.mini-title{
  display:block;
  font-size: 38rpx;
  font-weight: 900;
  color:#2b3a66;
  margin-bottom: 12rpx;
  text-align:center;
}
.mini-desc{
  display:block;
  font-size: 24rpx;
  font-weight: 800;
  color:#555;
  line-height: 1.6;
  margin-bottom: 18rpx;
  text-align:center;
}
.mini-actions{
  display:flex;
  justify-content:center;
}
.mini-btn{
  width: 60%;
  padding: 16rpx 0;
  border-radius: 999rpx;
  text-align:center;
  font-size: 26rpx;
  font-weight: 900;
  background: linear-gradient(90deg,#4f6cff 0%,#667eea 100%);
  color:#fff;
  box-shadow: 0 12rpx 24rpx rgba(0,0,0,0.12);
}

/* success popup */
.popup{
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.55);
  display:flex;
  align-items:center;
  justify-content:center;
  z-index: 99;
  backdrop-filter: blur(8rpx);
}
.popup-card{
  width: 78vw;
  background: rgba(255,255,255,0.96);
  border-radius: 32rpx;
  padding: 54rpx 40rpx 40rpx;
  text-align:center;
  box-shadow: 0 22rpx 70rpx rgba(0,0,0,0.22);
}
.pop-title{
  display:block;
  font-size: 44rpx;
  font-weight: 900;
  color:#ff6b6b;
  margin-bottom: 16rpx;
}
.pop-desc{
  display:block;
  color:#555;
  font-size: 26rpx;
  line-height: 1.7;
  margin-bottom: 24rpx;
}
.pop-actions{
  display:flex;
  gap: 14rpx;
}
.pop-btn{
  flex: 1;
  padding: 18rpx 0;
  border-radius: 22rpx;
  font-size: 28rpx;
  font-weight: 900;
  background: linear-gradient(90deg,#eef2ff 0%,#dbe9ff 100%);
  color:#4f6cff;
  box-shadow: 0 10rpx 22rpx rgba(0,0,0,0.10);
}
.pop-btn.primary{
  background: linear-gradient(90deg,#4f6cff 0%,#667eea 100%);
  color:#fff;
}

/* toast */
.mini-toast{
  position: fixed;
  left: 50%;
  bottom: 140rpx;
  transform: translateX(-50%);
  padding: 16rpx 22rpx;
  border-radius: 999rpx;
  background: rgba(0,0,0,0.75);
  color:#fff;
  font-size: 24rpx;
  font-weight: 800;
  z-index: 120;
}
</style>