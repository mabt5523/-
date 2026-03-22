<template>
  <view class="page">
    <!-- 头部 -->
    <view class="header">
      <text class="title">第 25 关：排序工厂 🏭</text>
      <text class="tip">任务：把数据卡片按规则排序（身高 / 成绩）</text>
    </view>

    <!-- HUD -->
    <view class="hud">
      <text class="badge">✅ 进度：{{ solved ? 2 : solvedCount }}/2</text>
      <text class="small">⏱ 用时：{{ formatTime(elapsedMs) }}</text>
    </view>

    <view class="board">
      <view class="board-bg" />

      <!-- 提示栏 -->
      <view class="hintbar">
        <view class="topic">本局重点：排序让数据更有价值</view>
        <text class="hinttext">
          你将完成两次排序：
          <text class="linebreak" />
          ① 按身高从矮到高
          <text class="linebreak" />
          ② 按成绩从高到低
          <text class="linebreak" />
          排序后更容易比较和分析！
        </text>
      </view>

      <view class="content">
        <!-- 选择任务 -->
        <view class="mode-card">
          <view class="mode-left">
            <text class="mode-title">当前任务</text>
            <text class="mode-desc">{{ modeDesc }}</text>
          </view>

          <view class="mode-right">
            <view class="pill" :class="{ on: mode==='height' }" @click="switchMode('height')">
              身高排序
              <text class="mini-ok" v-if="done.height">✅</text>
            </view>
            <view class="pill" :class="{ on: mode==='score' }" @click="switchMode('score')">
              成绩排序
              <text class="mini-ok" v-if="done.score">✅</text>
            </view>
          </view>
        </view>

        <!-- 排序区 -->
        <view class="sort-area">
          <view class="sort-title">
            <text>拖动卡片调整顺序</text>
            <text class="sort-rule">规则：{{ ruleText }}</text>
          </view>

          <view class="cards">
            <view
              v-for="(c, idx) in cards"
              :key="c.id"
              class="card"
              :class="{ dragging: draggingId===c.id }"
              draggable="true"
              @touchstart="onDragStart(idx)"
              @touchmove.prevent="onDragMove"
              @touchend="onDragEnd"
              @longpress="onLongPress(idx)"
            >
              <view class="card-left">
                <text class="name">{{ c.name }}</text>
                <text class="meta">身高 {{ c.height }}cm｜成绩 {{ c.score }}</text>
              </view>

              <view class="card-right">
                <view class="tag" v-if="mode==='height'">
                  {{ c.height }}
                </view>
                <view class="tag" v-else>
                  {{ c.score }}
                </view>
                <text class="handle">≡</text>
              </view>

              <!-- 上下移动按钮（兼容：不用真正拖拽也能玩） -->
              <view class="move-btns">
                <view class="mbtn" @click.stop="moveUp(idx)" :class="{ disabled: idx===0 || solved }">↑</view>
                <view class="mbtn" @click.stop="moveDown(idx)" :class="{ disabled: idx===cards.length-1 || solved }">↓</view>
              </view>
            </view>
          </view>

          <view class="actions">
            <view class="btn reset" @click="resetRound">↩ 重置顺序</view>
            <view class="btn check" @click="check">✅ 检查排序</view>
          </view>
        </view>

        <!-- 排序价值分析 -->
        <view class="analysis">
          <text class="analysis-title">📈 排序前后更好在哪里？</text>
          <view class="analysis-box">
            <text class="analysis-text">
              ✔ 排序后，一眼就能看到“最大/最小”和整体趋势；
              <text class="linebreak" />
              ✔ 更容易比较谁更高、谁分数更高；
              <text class="linebreak" />
              ✔ 也方便做排名、分组、找前几名等分析。
            </text>
          </view>
        </view>
      </view>
    </view>

    <!-- 成功弹窗 -->
    <view v-if="success" class="popup" @touchmove.stop.prevent>
      <view class="popup-card">
        <text class="pop-title">🎉 通关成功！</text>
        <text class="pop-desc">
          你完成了两种排序：
          <text class="linebreak" />
          ① 身高从矮到高
          <text class="linebreak" />
          ② 成绩从高到低
          <text class="linebreak" />
          排序让数据更有价值、更容易分析！
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
      levelId: 25,

      levelProgress: { unlocked: true, stars: 0, bestSteps: null },
      reported: false,

      // 计时
      elapsedMs: 0,
      clock: null,
      startAt: 0,

      // 状态
      mode: 'height', // height | score
      done: { height: false, score: false },
      success: false,
      wrongTimes: 0,
      earnedStars: 0,
      solved: false,

      // 数据
      baseCards: [
        { id: 's1', name: '小明', height: 142, score: 86 },
        { id: 's2', name: '小红', height: 150, score: 93 },
        { id: 's3', name: '小刚', height: 147, score: 78 },
        { id: 's4', name: '小美', height: 155, score: 90 },
        { id: 's5', name: '小强', height: 160, score: 65 }
      ],
      cards: [],
      originOrder: [],

      // 伪拖拽（记录拖拽起点，尽量兼容 H5/小程序/APP）
      dragFromIndex: null,
      draggingId: '',
      _lpTimer: null,

      // UI
      toast: { show: false, text: '' }
    }
  },

  computed: {
    solvedCount() {
      return (this.done.height ? 1 : 0) + (this.done.score ? 1 : 0)
    },
    modeDesc() {
      return this.mode === 'height'
        ? '把卡片按身高从矮到高排好'
        : '把卡片按成绩从高到低排好'
    },
    ruleText() {
      return this.mode === 'height' ? '身高：从矮到高（升序）' : '成绩：从高到低（降序）'
    }
  },

  onLoad() {
    this.loadLevelProgress()
    this.newRound()
  },

  onUnload() {
    this.stopClock()
    clearTimeout(this._t)
    clearTimeout(this._lpTimer)
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

    // ===== 工具 =====
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

    // ===== 初始化 =====
    newRound() {
      this.reported = false
      this.success = false
      this.wrongTimes = 0
      this.earnedStars = 0
      this.solved = false
      this.done = { height: false, score: false }
      this.mode = 'height'

      this.cards = this.shuffle(this.baseCards)
      this.originOrder = this.cards.map(x => x.id)

      this.stopClock()
      this.startClock()
      this.toastMini('🏭 把卡片按规则排好吧！')
      uni.vibrateShort({ type: 'light' })
    },

    resetRound() {
      if (this.success) return
      // 回到本次初始打乱顺序
      const map = {}
      this.baseCards.forEach(x => (map[x.id] = x))
      this.cards = this.originOrder.map(id => map[id])
      uni.vibrateShort({ type: 'light' })
      this.toastMini('已重置到初始顺序～')
    },

    switchMode(m) {
      if (this.success) return
      this.mode = m
      uni.vibrateShort({ type: 'light' })
    },

    // ===== 上下移动（稳定可用）=====
    swap(i, j) {
      const a = this.cards.slice()
      const t = a[i]
      a[i] = a[j]
      a[j] = t
      this.cards = a
    },
    moveUp(idx) {
      if (this.success) return
      if (idx <= 0) return
      this.swap(idx, idx - 1)
      uni.vibrateShort({ type: 'light' })
    },
    moveDown(idx) {
      if (this.success) return
      if (idx >= this.cards.length - 1) return
      this.swap(idx, idx + 1)
      uni.vibrateShort({ type: 'light' })
    },

    // ===== 简化“拖拽”（长按开始 -> 松开结束）
    onLongPress(idx) {
      if (this.success) return
      this.dragFromIndex = idx
      this.draggingId = this.cards[idx]?.id || ''
      this.toastMini('拖动不方便的话，可用 ↑↓ 调整～')
      uni.vibrateShort({ type: 'light' })
    },
    onDragStart(idx) {
      // H5 会触发；小程序/APP 可能不稳定，所以只是兜底
      if (this.success) return
      this.dragFromIndex = idx
      this.draggingId = this.cards[idx]?.id || ''
    },
    onDragMove() {},
    onDragEnd() {
      // 由于跨端差异，这里不做真实坐标换位，主要依赖 ↑↓。
      this.dragFromIndex = null
      this.draggingId = ''
    },

    // ===== 检查排序 =====
    isCorrect() {
      if (this.mode === 'height') {
        for (let i = 1; i < this.cards.length; i++) {
          if (this.cards[i - 1].height > this.cards[i].height) return false
        }
        return true
      } else {
        for (let i = 1; i < this.cards.length; i++) {
          if (this.cards[i - 1].score < this.cards[i].score) return false
        }
        return true
      }
    },

    async check() {
      if (this.success) return

      const ok = this.isCorrect()
      if (!ok) {
        this.wrongTimes += 1
        uni.vibrateShort({ type: 'light' })
        this.toastMini('❌ 还没排对，再调整一下～')
        return
      }

      // 该模式完成
      if (this.mode === 'height') this.done.height = true
      if (this.mode === 'score') this.done.score = true

      uni.vibrateShort({ type: 'light' })
      this.toastMini('✅ 这个排序完成！')

      // 两个都完成 -> 通关
      if (this.done.height && this.done.score) {
        this.success = true
        this.solved = true
        this.stopClock()
        this.earnedStars = this.calcStars({ usedMs: this.elapsedMs, wrongTimes: this.wrongTimes })
        uni.vibrateLong()

        await this.reportPass({
          steps: 2,
          usedMs: this.elapsedMs,
          stars: this.earnedStars
        })
      } else {
        // 还差一个任务，引导切换
        this.mode = this.done.height ? 'score' : 'height'
      }
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
      uni.redirectTo({ url: '/pages/game/level/level26' })
    }
  }
}
</script>

<style scoped>
.page{
  height: 100vh;
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

/* content */
.content{
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  display:flex;
  flex-direction: column;
  gap: 10rpx;
  overflow: hidden;
}

/* mode card */
.mode-card{
  border-radius: 22rpx;
  background: rgba(255,255,255,0.92);
  border: 2rpx solid rgba(0,0,0,0.06);
  box-shadow: 0 10rpx 22rpx rgba(0,0,0,0.08);
  padding: 14rpx;
  display:flex;
  align-items:center;
  justify-content: space-between;
  gap: 12rpx;
}
.mode-left{ flex: 1; }
.mode-title{
  display:block;
  font-size: 24rpx;
  font-weight: 900;
  color:#2b3a66;
}
.mode-desc{
  display:block;
  margin-top: 6rpx;
  font-size: 22rpx;
  font-weight: 800;
  color:#6b7280;
}
.mode-right{
  display:flex;
  gap: 10rpx;
}
.pill{
  padding: 12rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(79,108,255,0.10);
  border: 2rpx solid rgba(79,108,255,0.16);
  font-size: 22rpx;
  font-weight: 900;
  color:#2b3a66;
  white-space: nowrap;
}
.pill.on{
  background: rgba(46,213,115,0.14);
  border-color: rgba(46,213,115,0.22);
}
.mini-ok{
  margin-left: 6rpx;
  font-size: 20rpx;
}

/* sort area */
.sort-area{
  flex: 1;
  min-height: 0;
  border-radius: 26rpx;
  background: rgba(79,108,255,0.06);
  border: 2rpx dashed rgba(79,108,255,0.18);
  padding: 12rpx;
  overflow: hidden;
}
.sort-title{
  display:flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 10rpx;
  color:#2b3a66;
  font-weight: 900;
}
.sort-rule{
  font-size: 22rpx;
  color:#6b7280;
  font-weight: 900;
}
.cards{
  height: calc(100% - 98rpx);
  overflow: hidden;
}
.card{
  position: relative;
  border-radius: 20rpx;
  background: rgba(255,255,255,0.92);
  border: 2rpx solid rgba(0,0,0,0.06);
  box-shadow: 0 10rpx 22rpx rgba(0,0,0,0.08);
  padding: 14rpx;
  margin-bottom: 10rpx;
  display:flex;
  align-items:center;
  justify-content: space-between;
  gap: 12rpx;
}
.card.dragging{
  opacity: 0.85;
  transform: scale(0.99);
}
.card-left{ flex: 1; }
.name{
  display:block;
  font-size: 26rpx;
  font-weight: 900;
  color:#2b3a66;
}
.meta{
  display:block;
  margin-top: 6rpx;
  font-size: 22rpx;
  font-weight: 800;
  color:#6b7280;
}
.card-right{
  display:flex;
  align-items:center;
  gap: 10rpx;
}
.tag{
  min-width: 84rpx;
  padding: 10rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(255,159,67,0.14);
  color:#2b3a66;
  font-weight: 900;
  text-align:center;
}
.handle{
  font-size: 30rpx;
  font-weight: 900;
  color:#4f6cff;
  opacity: 0.9;
}

/* move buttons */
.move-btns{
  position:absolute;
  right: 12rpx;
  bottom: 12rpx;
  display:flex;
  gap: 8rpx;
}
.mbtn{
  width: 54rpx;
  height: 46rpx;
  border-radius: 14rpx;
  background: rgba(79,108,255,0.10);
  border: 2rpx solid rgba(79,108,255,0.14);
  display:flex;
  align-items:center;
  justify-content:center;
  font-weight: 900;
  color:#4f6cff;
}
.mbtn.disabled{
  opacity: 0.35;
  pointer-events:none;
}

/* actions */
.actions{
  display:flex;
  gap: 12rpx;
  margin-top: 10rpx;
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
.reset{ background: linear-gradient(90deg,#f5f5f5 0%,#e9e9e9 100%); color:#555; }
.check{ background: linear-gradient(90deg,#4f6cff 0%,#667eea 100%); color:#fff; }

/* analysis */
.analysis{
  border-radius: 22rpx;
  background: rgba(255,255,255,0.92);
  border: 2rpx solid rgba(0,0,0,0.06);
  box-shadow: 0 10rpx 22rpx rgba(0,0,0,0.08);
  padding: 14rpx;
}
.analysis-title{
  display:block;
  font-size: 24rpx;
  font-weight: 900;
  color:#2b3a66;
  margin-bottom: 8rpx;
}
.analysis-box{
  border-radius: 18rpx;
  background: rgba(79,108,255,0.06);
  border: 2rpx dashed rgba(79,108,255,0.14);
  padding: 12rpx;
}
.analysis-text{
  font-size: 22rpx;
  font-weight: 800;
  color:#6b7280;
  line-height: 1.5;
}

/* popup */
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
