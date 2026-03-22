<template>
  <view class="page">
    <!-- 头部 -->
    <view class="header">
      <text class="title">第 22 关：彩色编码师 🎨</text>
      <text class="tip">任务：用 RGB 编码调出目标颜色</text>
    </view>

    <!-- HUD -->
    <view class="hud">
      <text class="badge">✅ 完成：{{ solved ? 1 : 0 }}/1</text>
      <text class="small">⏱ 用时：{{ formatTime(elapsedMs) }}</text>
    </view>

    <view class="board">
      <view class="board-bg" />

      <!-- 提示栏 -->
      <view class="hintbar">
        <view class="topic">本局重点：颜色也能被编码！RGB = 红绿蓝三种数字</view>
        <text class="hinttext">
          拖动滑杆改变 R / G / B（0–255），让“我的颜色”尽量变成“目标颜色”。
          <text class="linebreak" />
          当差距足够小就算通关～
        </text>
      </view>

      <view class="content">
        <!-- 颜色对比 -->
        <view class="swatches">
          <view class="swatch">
            <text class="swatch-title">目标颜色</text>
            <view class="colorbox" :style="{ backgroundColor: targetCss }" />
            <text class="rgbtext">{{ targetText }}</text>
          </view>

          <view class="swatch">
            <text class="swatch-title">我的颜色</text>
            <view class="colorbox" :style="{ backgroundColor: mineCss }" />
            <text class="rgbtext">{{ mineText }}</text>
          </view>
        </view>

        <!-- 差距提示 -->
        <view class="score-card">
          <view class="score-row">
            <text class="score-label">差距：</text>
            <text class="score-value">{{ distance }}</text>
            <text class="score-tip">（越小越像）</text>
          </view>
          <view class="bar">
            <view class="bar-fill" :style="{ width: barWidth }" />
          </view>
          <text class="score-hint">
            小技巧：先把“最像的那一项”调到接近，再调另外两项。
          </text>
        </view>

        <!-- RGB 调色器 -->
        <view class="mixer">
          <view class="mixer-title">RGB 调色台</view>

          <view class="slider-row">
            <view class="slider-head">
              <text class="c-dot r"></text>
              <text class="c-name">R（红）</text>
              <text class="c-val">{{ r }}</text>
            </view>
            <slider
              :value="r"
              min="0"
              max="255"
              step="1"
              @changing="onSlide('r', $event)"
              @change="onSlide('r', $event)"
              :disabled="solved"
            />
          </view>

          <view class="slider-row">
            <view class="slider-head">
              <text class="c-dot g"></text>
              <text class="c-name">G（绿）</text>
              <text class="c-val">{{ g }}</text>
            </view>
            <slider
              :value="g"
              min="0"
              max="255"
              step="1"
              @changing="onSlide('g', $event)"
              @change="onSlide('g', $event)"
              :disabled="solved"
            />
          </view>

          <view class="slider-row">
            <view class="slider-head">
              <text class="c-dot b"></text>
              <text class="c-name">B（蓝）</text>
              <text class="c-val">{{ b }}</text>
            </view>
            <slider
              :value="b"
              min="0"
              max="255"
              step="1"
              @changing="onSlide('b', $event)"
              @change="onSlide('b', $event)"
              :disabled="solved"
            />
          </view>

          <view class="mixer-actions">
            <view class="btn reset" @click="reset" :class="{ disabled: solved }">↩ 重来</view>
            <view class="btn hint" @click="giveHint" :class="{ disabled: solved }">💡 提示</view>
            <view class="btn check" @click="check" :class="{ disabled: solved }">✅ 检查</view>
          </view>
        </view>
      </view>
    </view>

    <!-- 成功弹窗 -->
    <view v-if="success" class="popup" @touchmove.stop.prevent>
      <view class="popup-card">
        <text class="pop-title">🎉 通关成功！</text>
        <text class="pop-desc">
          你学会了：颜色也能用数字编码！
          <text class="linebreak" />
          RGB 三个数字就能表示几乎所有屏幕颜色。
          <text class="linebreak" />
          用时：{{ formatTime(elapsedMs) }}｜错误：{{ wrongTimes }} 次｜星星：{{ earnedStars }}⭐
        </text>
        <view class="pop-actions">
          <view class="pop-btn" @click="newGame">再玩一次</view>
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
      levelId: 22,

      levelProgress: { unlocked: true, stars: 0, bestSteps: null },
      reported: false,

      // 计时
      elapsedMs: 0,
      clock: null,
      startAt: 0,

      // 统计
      wrongTimes: 0,
      earnedStars: 0,

      // 状态
      solved: false,
      success: false,

      // RGB（我的）
      r: 120,
      g: 120,
      b: 120,

      // 目标颜色
      target: { r: 0, g: 0, b: 0 },

      // 通过阈值（越小越难）
      passThreshold: 25,

      // UI
      toast: { show: false, text: '' }
    }
  },

  computed: {
    targetCss() {
      const t = this.target
      return `rgb(${t.r},${t.g},${t.b})`
    },
    mineCss() {
      return `rgb(${this.r},${this.g},${this.b})`
    },
    targetText() {
      const t = this.target
      return `RGB(${t.r}, ${t.g}, ${t.b})`
    },
    mineText() {
      return `RGB(${this.r}, ${this.g}, ${this.b})`
    },
    distance() {
      const t = this.target
      const dr = Math.abs(this.r - t.r)
      const dg = Math.abs(this.g - t.g)
      const db = Math.abs(this.b - t.b)
      return dr + dg + db
    },
    barWidth() {
      // 把差距映射到 0~100%（差距最大大约 765）
      const d = Math.min(this.distance, 765)
      const pct = Math.max(0, 100 - Math.round((d / 765) * 100))
      return pct + '%'
    }
  },

  onLoad() {
    this.loadLevelProgress()
    this.newGame()
  },

  onUnload() {
    this.stopClock()
    clearTimeout(this._t)
  },

  methods: {
    // ===== 后端：读取进度 =====
    async loadLevelProgress() {
      try {
        const res = await request({ url: `/api/game/levels/${this.levelId}`, method: 'GET' })
        this.levelProgress = {
          unlocked: res.unlocked === 1 || res.unlocked === true,
          stars: Number(res.stars || 0),
          bestSteps: res.bestSteps ?? res.best_steps ?? null
        }

        if (!this.levelProgress.unlocked) {
          uni.showToast({ title: '该关卡未解锁', icon: 'none' })
          setTimeout(() => uni.redirectTo({ url: '/pages/game/level-select' }), 500)
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

    // ===== 星星规则 =====
    calcStars({ usedMs, wrongTimes }) {
      const sec = usedMs / 1000
      if (sec <= 60 && wrongTimes <= 1) return 3
      if (sec <= 90) return 2
      return 1
    },

    // ===== 上报通关 =====
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
            wrongTimes: this.wrongTimes,
            target: this.target
          }
        })

        this.levelProgress.stars = Math.max(this.levelProgress.stars || 0, stars)
        if (this.levelProgress.bestSteps == null) this.levelProgress.bestSteps = steps
        else this.levelProgress.bestSteps = Math.min(this.levelProgress.bestSteps, steps)
      } catch (e) {}
    },

    // ===== 新局 =====
    newGame() {
      this.success = false
      this.solved = false
      this.reported = false
      this.wrongTimes = 0
      this.earnedStars = 0

      // 随机目标（避免太灰/太接近白色，看起来更明显）
      this.target = this.randomTarget()
      // 随机初始（让玩家有调整空间）
      this.r = this.rand(0, 255)
      this.g = this.rand(0, 255)
      this.b = this.rand(0, 255)

      this.stopClock()
      this.startClock()

      uni.vibrateShort({ type: 'light' })
      this.toastMini('🎯 调出目标颜色吧！')
    },

    rand(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min
    },

    randomTarget() {
      // 让目标颜色“更有颜色感”，避免太接近灰：至少一个通道高，一个通道低
      let r = this.rand(0, 255)
      let g = this.rand(0, 255)
      let b = this.rand(0, 255)

      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      if (max - min < 80) {
        // 强化对比
        const channel = ['r', 'g', 'b'][this.rand(0, 2)]
        if (channel === 'r') { r = 230; g = this.rand(0,120); b = this.rand(0,120) }
        if (channel === 'g') { g = 230; r = this.rand(0,120); b = this.rand(0,120) }
        if (channel === 'b') { b = 230; r = this.rand(0,120); g = this.rand(0,120) }
      }
      return { r, g, b }
    },

    onSlide(key, e) {
      if (this.solved) return
      const v = Number(e.detail.value)
      if (key === 'r') this.r = v
      if (key === 'g') this.g = v
      if (key === 'b') this.b = v
    },

    reset() {
      if (this.solved) return
      this.r = 120
      this.g = 120
      this.b = 120
      uni.vibrateShort({ type: 'light' })
      this.toastMini('已重置到中间值～')
    },

    giveHint() {
      if (this.solved) return
      const t = this.target
      const dr = Math.abs(this.r - t.r)
      const dg = Math.abs(this.g - t.g)
      const db = Math.abs(this.b - t.b)

      // 提示差距最大的通道
      let msg = ''
      if (dr >= dg && dr >= db) msg = `💡 先调 R（红）更接近 ${t.r}`
      else if (dg >= dr && dg >= db) msg = `💡 先调 G（绿）更接近 ${t.g}`
      else msg = `💡 先调 B（蓝）更接近 ${t.b}`

      uni.vibrateShort({ type: 'light' })
      this.toastMini(msg)
    },

    async check() {
      if (this.solved) return
      const ok = this.distance <= this.passThreshold

      if (ok) {
        this.solved = true
        this.success = true
        this.stopClock()
        this.earnedStars = this.calcStars({ usedMs: this.elapsedMs, wrongTimes: this.wrongTimes })
        uni.vibrateLong()
        this.toastMini('✅ 太像了！通关～')

        await this.reportPass({
          steps: 1,
          usedMs: this.elapsedMs,
          stars: this.earnedStars
        })
      } else {
        this.wrongTimes += 1
        uni.vibrateShort({ type: 'light' })
        this.toastMini('❌ 还不够像，再调一调～')
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
      uni.redirectTo({ url: '/pages/game/level/level23' })
    }
  }
}
</script>

<style scoped>
.page{
  height: 140vh;
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

  height: calc(100vh - 40rpx - 0rpx - 0rpx);
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

/* swatches */
.swatches{
  display:flex;
  gap: 12rpx;
}
.swatch{
  flex: 1;
  border-radius: 22rpx;
  background: rgba(255,255,255,0.92);
  border: 2rpx solid rgba(0,0,0,0.06);
  box-shadow: 0 10rpx 22rpx rgba(0,0,0,0.08);
  padding: 14rpx;
}
.swatch-title{
  display:block;
  font-size: 24rpx;
  font-weight: 900;
  color:#2b3a66;
  margin-bottom: 10rpx;
}
.colorbox{
  height: 140rpx;
  border-radius: 18rpx;
  border: 2rpx solid rgba(0,0,0,0.08);
  box-shadow: inset 0 0 0 2rpx rgba(255,255,255,0.2);
}
.rgbtext{
  display:block;
  margin-top: 10rpx;
  font-size: 22rpx;
  font-weight: 900;
  color:#555;
  text-align:center;
}

/* score card */
.score-card{
  border-radius: 22rpx;
  background: rgba(255,255,255,0.92);
  border: 2rpx solid rgba(0,0,0,0.06);
  box-shadow: 0 10rpx 22rpx rgba(0,0,0,0.08);
  padding: 14rpx;
}
.score-row{
  display:flex;
  align-items: baseline;
  gap: 10rpx;
  margin-bottom: 10rpx;
}
.score-label{
  font-size: 24rpx;
  font-weight: 900;
  color:#2b3a66;
}
.score-value{
  font-size: 34rpx;
  font-weight: 900;
  color:#ff6b6b;
}
.score-tip{
  font-size: 22rpx;
  font-weight: 800;
  color:#6b7280;
}
.bar{
  height: 18rpx;
  border-radius: 999rpx;
  background: rgba(0,0,0,0.06);
  overflow: hidden;
  border: 2rpx solid rgba(0,0,0,0.06);
}
.bar-fill{
  height: 100%;
  border-radius: 999rpx;
  background: linear-gradient(90deg,#2ed573 0%,#1e90ff 50%,#ff6b6b 100%);
}
.score-hint{
  display:block;
  margin-top: 10rpx;
  font-size: 22rpx;
  font-weight: 800;
  color:#6b7280;
  line-height: 1.4;
}

/* mixer */
.mixer{
  flex: 1;
  min-height: 0;
  border-radius: 26rpx;
  background: rgba(79,108,255,0.06);
  border: 2rpx dashed rgba(79,108,255,0.18);
  padding: 12rpx;
  overflow: hidden;
}
.mixer-title{
  font-size: 24rpx;
  font-weight: 900;
  color:#2b3a66;
  margin-bottom: 10rpx;
}
.slider-row{
  border-radius: 22rpx;
  background: rgba(255,255,255,0.92);
  border: 2rpx solid rgba(0,0,0,0.06);
  box-shadow: 0 10rpx 22rpx rgba(0,0,0,0.08);
  padding: 14rpx;
  margin-bottom: 10rpx;
}
.slider-head{
  display:flex;
  align-items:center;
  gap: 10rpx;
  margin-bottom: 8rpx;
}
.c-dot{
  width: 18rpx;
  height: 18rpx;
  border-radius: 999rpx;
  display:inline-block;
}
.c-dot.r{ background: #ff4757; }
.c-dot.g{ background: #2ed573; }
.c-dot.b{ background: #1e90ff; }
.c-name{
  font-size: 24rpx;
  font-weight: 900;
  color:#2b3a66;
}
.c-val{
  margin-left: auto;
  font-size: 24rpx;
  font-weight: 900;
  color:#4f6cff;
}

/* mixer actions */
.mixer-actions{
  display:flex;
  gap: 12rpx;
  margin-top: 6rpx;
}
.btn{
  flex: 1;
  padding: 16rpx 0;
  text-align:center;
  border-radius: 999rpx;
  font-size: 26rpx;
  font-weight: 900;
  box-shadow: 0 12rpx 24rpx rgba(0,0,0,0.12);
}
.btn:active{ transform: scale(0.98); }
.btn.disabled{
  opacity: 0.55;
  pointer-events:none;
  box-shadow:none;
}
.reset{ background: linear-gradient(90deg,#f5f5f5 0%,#e9e9e9 100%); color:#555; }
.hint{ background: linear-gradient(90deg,#ff9f43 0%,#ff6b6b 100%); color:#fff; }
.check{ background: linear-gradient(90deg,#4f6cff 0%,#667eea 100%); color:#fff; }

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
.linebreak{ display:block; height: 10rpx; }
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
