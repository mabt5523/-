<template>
  <view class="page">
    <!-- 头部 -->
    <view class="header">
      <text class="title">第 27 关：图表魔法师 📊</text>
      <text class="tip">任务：根据数据选择正确图表，发现趋势</text>
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
        <view class="topic">本局重点：用图表表达数据｜发现趋势</view>
        <text class="hinttext">
          看到一堆数字别慌！选对图表就能看出规律：
          <text class="linebreak" />
          - 温度随时间变化 → 折线图（看趋势）
          <text class="linebreak" />
          - 成绩对比不同人 → 柱状图（看高低）
        </text>
      </view>

      <view class="content">
        <!-- 题目卡 -->
        <view class="quiz-card">
          <view class="quiz-head">
            <text class="quiz-title">题目 {{ currentIndex + 1 }}/{{ totalCount }}</text>
            <view class="type-pill">
              <text>{{ current.title }}</text>
            </view>
          </view>

          <view class="data-box">
            <text class="data-label">数据：</text>
            <view class="nums">
              <view class="num" v-for="(n, i) in current.numbers" :key="i">
                <text class="num-text">{{ n }}</text>
              </view>
            </view>
            <text class="data-hint">{{ current.hint }}</text>
          </view>

          <!-- 图表选择 -->
          <view class="pick-area">
            <text class="pick-title">选择最合适的图表：</text>

            <view class="chart-grid">
              <view
                class="chart-card"
                :class="{ picked: picked==='line', disabled: locked }"
                @click="pick('line')"
              >
                <view class="chart-icon">📈</view>
                <text class="chart-name">折线图</text>
                <text class="chart-desc">看“趋势 / 变化”</text>
              </view>

              <view
                class="chart-card"
                :class="{ picked: picked==='bar', disabled: locked }"
                @click="pick('bar')"
              >
                <view class="chart-icon">📊</view>
                <text class="chart-name">柱状图</text>
                <text class="chart-desc">看“对比 / 高低”</text>
              </view>

              <view
                class="chart-card"
                :class="{ picked: picked==='pie', disabled: locked }"
                @click="pick('pie')"
              >
                <view class="chart-icon">🥧</view>
                <text class="chart-name">饼图</text>
                <text class="chart-desc">看“占比 / 份额”</text>
              </view>

              <view
                class="chart-card"
                :class="{ picked: picked==='table', disabled: locked }"
                @click="pick('table')"
              >
                <view class="chart-icon">🧾</view>
                <text class="chart-name">表格</text>
                <text class="chart-desc">看“原始数值”</text>
              </view>
            </view>

            <view class="buttons">
              <view class="btn reset" @click="resetPick" :class="{ disabled: locked }">↩ 重选</view>
              <view class="btn check" @click="check" :class="{ disabled: locked || !picked }">✅ 提交</view>
            </view>
          </view>
        </view>

        <!-- 教学小卡 -->
        <view class="learn-card">
          <text class="learn-title">🪄 魔法口诀</text>
          <view class="learn-line">
            <text class="dot"></text>
            <text class="learn-text">随时间变：折线图（趋势）</text>
          </view>
          <view class="learn-line">
            <text class="dot"></text>
            <text class="learn-text">比高低：柱状图（对比）</text>
          </view>
          <view class="learn-line">
            <text class="dot"></text>
            <text class="learn-text">看占比：饼图（份额）</text>
          </view>
          <view class="learn-line">
            <text class="dot"></text>
            <text class="learn-text">看细节：表格（原始数据）</text>
          </view>

          <view class="stat">
            <text class="stat-item">错误：<text class="bad">{{ wrongTimes }}</text></text>
            <text class="stat-item">已完成：{{ doneCount }}/{{ totalCount }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 结果弹窗（每题） -->
    <view v-if="resultPopup.show" class="mini-popup" @touchmove.stop.prevent>
      <view class="mini-card">
        <text class="mini-title">{{ resultPopup.ok ? '✅ 选对了！' : '❌ 再想想' }}</text>
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
          你学会了：用图表表达数据、发现趋势！
          <text class="linebreak" />
          温度→折线图｜成绩→柱状图
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
      levelId: 27,

      levelProgress: { unlocked: true, stars: 0, bestSteps: null },
      reported: false,

      // 计时
      elapsedMs: 0,
      clock: null,
      startAt: 0,

      // 题库（温度=折线，成绩=柱状；另外加两个干扰题，教学更完整）
      quizzes: [
        {
          key: 'temp_week',
          title: '一周温度变化',
          numbers: ['周一 12℃', '周二 14℃', '周三 10℃', '周四 16℃', '周五 18℃'],
          hint: '温度是“随时间变化”的数据，重点看趋势。',
          answer: 'line',
          explainOk: '对！温度随时间变化，用折线图最容易看出上升/下降趋势。',
          explainBad: '更适合折线图：因为温度是随时间变化的“趋势数据”。'
        },
        {
          key: 'score_students',
          title: '四位同学成绩对比',
          numbers: ['小明 86', '小红 93', '小刚 78', '小美 90'],
          hint: '成绩是“不同人之间对比”的数据，重点看高低。',
          answer: 'bar',
          explainOk: '对！比较不同同学的成绩高低，用柱状图最清楚。',
          explainBad: '更适合柱状图：因为这里是“不同对象的对比”。'
        },
        {
          key: 'snack_share',
          title: '零食占比',
          numbers: ['薯片 30%', '饼干 25%', '水果 20%', '牛奶 25%'],
          hint: '这是“各部分占整体的比例”。',
          answer: 'pie',
          explainOk: '对！看占比最适合饼图。',
          explainBad: '更适合饼图：因为你要看“谁占的比例最大”。'
        },
        {
          key: 'raw_list',
          title: '图书借阅记录（原始数据）',
          numbers: ['A01 2025-12-01', 'A02 2025-12-02', 'A03 2025-12-03', 'A04 2025-12-04'],
          hint: '这里更需要看每条记录的细节。',
          answer: 'table',
          explainOk: '对！要看具体每条记录，表格最合适。',
          explainBad: '更适合表格：因为这是“逐条记录”的原始数据。'
        }
      ],

      currentIndex: 0,
      picked: '',
      locked: false,

      // 统计
      wrongTimes: 0,
      earnedStars: 0,
      success: false,

      // UI
      toast: { show: false, text: '' },
      resultPopup: { show: false, ok: true, msg: '' }
    }
  },

  computed: {
    totalCount() {
      return this.quizzes.length
    },
    doneCount() {
      return this.currentIndex
    },
    current() {
      return this.quizzes[this.currentIndex] || this.quizzes[this.quizzes.length - 1]
    }
  },

  onLoad() {
    this.loadLevelProgress()
    this.newRound()
  },

  onUnload() {
    this.stopClock()
    clearTimeout(this._t)
  },

  methods: {
    async loadLevelProgress() {
      try {
        const res = await request({ url: `/api/game/levels/${this.levelId}`, method: 'GET' })
        this.levelProgress = {
          unlocked: res.unlocked === 1 || res.unlocked === true,
          stars: Number(res.stars || 0),
          bestSteps: res.bestSteps ?? res.best_steps ?? null
        }
      } catch (e) {}
    },

    startClock() {
      this.stopClock()
      this.elapsedMs = 0
      this.startAt = Date.now()
      this.clock = setInterval(() => {
        this.elapsedMs = Date.now() - this.startAt
      }, 100)
    },
    stopClock() {
      if (this.clock) {
        clearInterval(this.clock)
        this.clock = null
      }
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

    calcStars({ usedMs, wrongTimes }) {
      const sec = usedMs / 1000
      if (sec <= 80 && wrongTimes <= 1) return 3
      if (sec <= 120) return 2
      return 1
    },

    async reportPass({ steps, usedMs, stars }) {
      if (this.reported) return
      this.reported = true
      try {
        await request({
          url: `/api/game/levels/${this.levelId}/complete`,
          method: 'POST',
          data: {
            stars,
            steps,
            usedTimeMs: usedMs,
            usedTimeSec: Math.round(usedMs / 1000),
            wrongTimes: this.wrongTimes
          }
        })
      } catch (e) {}
    },

    shuffle(arr) {
      const a = arr.slice()
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const t = a[i]
        a[i] = a[j]
        a[j] = t
      }
      return a
    },

    newRound() {
      this.reported = false
      this.success = false
      this.wrongTimes = 0
      this.earnedStars = 0
      this.locked = false
      this.picked = ''
      this.currentIndex = 0

      // 打乱题目顺序（可选）
      this.quizzes = this.shuffle(this.quizzes)

      this.stopClock()
      this.startClock()
      uni.vibrateShort({ type: 'light' })
      this.toastMini('📊 选对图表，数字就会“说话”！')
    },

    pick(type) {
      if (this.locked || this.success) return
      this.picked = type
      uni.vibrateShort({ type: 'light' })
    },

    resetPick() {
      if (this.locked || this.success) return
      this.picked = ''
      uni.vibrateShort({ type: 'light' })
      this.toastMini('已重选～')
    },

    check() {
      if (this.locked || this.success) return
      if (!this.picked) return

      this.locked = true
      const q = this.current
      const ok = this.picked === q.answer

      if (ok) {
        uni.vibrateShort({ type: 'light' })
        this.resultPopup = { show: true, ok: true, msg: q.explainOk }
      } else {
        this.wrongTimes += 1
        uni.vibrateShort({ type: 'light' })
        this.resultPopup = { show: true, ok: false, msg: q.explainBad }
      }
    },

    async closeResult() {
      this.resultPopup.show = false
      this.locked = false
      this.picked = ''

      if (this.currentIndex < this.totalCount - 1) {
        this.currentIndex += 1
        uni.vibrateShort({ type: 'light' })
        return
      }

      this.success = true
      this.stopClock()
      this.earnedStars = this.calcStars({ usedMs: this.elapsedMs, wrongTimes: this.wrongTimes })
      uni.vibrateLong()

      await this.reportPass({
        steps: this.totalCount,
        usedMs: this.elapsedMs,
        stars: this.earnedStars
      })
    },

    toastMini(text) {
      this.toast.text = text
      this.toast.show = true
      clearTimeout(this._t)
      this._t = setTimeout(() => (this.toast.show = false), 900)
    },

    goBack() {
      uni.navigateBack({ delta: 1 })
    },

    goNext() {
      uni.redirectTo({ url: '/pages/game/level/level28' })
    }
  }
}
</script>

<style scoped>
.page{
  height: 120vh;
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

/* quiz */
.quiz-card{
  flex: 1.25;
  min-height: 0;
  border-radius: 26rpx;
  background: rgba(255,255,255,0.92);
  border: 2rpx solid rgba(0,0,0,0.06);
  box-shadow: 0 10rpx 22rpx rgba(0,0,0,0.08);
  padding: 14rpx;
  overflow: hidden;
  display:flex;
  flex-direction: column;
}
.quiz-head{
  display:flex;
  align-items:center;
  justify-content: space-between;
  gap: 10rpx;
  margin-bottom: 10rpx;
}
.quiz-title{
  font-size: 24rpx;
  font-weight: 900;
  color:#2b3a66;
}
.type-pill{
  padding: 10rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(79,108,255,0.10);
  border: 2rpx solid rgba(79,108,255,0.16);
  font-size: 22rpx;
  font-weight: 900;
  color:#2b3a66;
}

/* data box */
.data-box{
  border-radius: 22rpx;
  background: rgba(79,108,255,0.06);
  border: 2rpx dashed rgba(79,108,255,0.14);
  padding: 14rpx;
}
.data-label{
  font-size: 22rpx;
  font-weight: 900;
  color:#2b3a66;
}
.nums{
  margin-top: 10rpx;
  display:flex;
  flex-wrap: wrap;
  gap: 10rpx;
}
.num{
  padding: 10rpx 12rpx;
  border-radius: 999rpx;
  background: rgba(255,255,255,0.92);
  border: 2rpx solid rgba(0,0,0,0.06);
}
.num-text{
  font-size: 22rpx;
  font-weight: 900;
  color:#2b3a66;
}
.data-hint{
  margin-top: 10rpx;
  display:block;
  font-size: 22rpx;
  font-weight: 800;
  color:#6b7280;
  line-height: 1.4;
}

/* pick area */
.pick-area{
  margin-top: 10rpx;
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
.chart-icon{ font-size: 34rpx; }
.chart-name{
  display:block;
  margin-top: 6rpx;
  font-size: 24rpx;
  font-weight: 900;
  color:#2b3a66;
}
.chart-desc{
  display:block;
  margin-top: 4rpx;
  font-size: 20rpx;
  font-weight: 800;
  color:#6b7280;
}

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

/* learn card */
.learn-card{
  flex: 0.9;
  min-height: 0;
  border-radius: 26rpx;
  background: rgba(255,255,255,0.92);
  border: 2rpx solid rgba(0,0,0,0.06);
  box-shadow: 0 10rpx 22rpx rgba(0,0,0,0.08);
  padding: 14rpx;
  overflow: hidden;
}
.learn-title{
  display:block;
  font-size: 24rpx;
  font-weight: 900;
  color:#2b3a66;
  margin-bottom: 10rpx;
}
.learn-line{
  display:flex;
  gap: 10rpx;
  align-items:flex-start;
  margin-bottom: 10rpx;
}
.dot{
  width: 10rpx;
  height: 10rpx;
  border-radius: 999rpx;
  background: rgba(79,108,255,0.75);
  margin-top: 10rpx;
}
.learn-text{
  font-size: 22rpx;
  font-weight: 800;
  color:#6b7280;
  line-height: 1.4;
}
.stat{
  margin-top: 10rpx;
  border-radius: 20rpx;
  background: rgba(79,108,255,0.06);
  border: 2rpx dashed rgba(79,108,255,0.14);
  padding: 12rpx;
  display:flex;
  justify-content: space-between;
}
.stat-item{
  font-size: 22rpx;
  font-weight: 900;
  color:#2b3a66;
}
.bad{ color:#ff6b6b; }

/* per-question popup */
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
