<template>
  <view class="page">
    <!-- 头部 -->
    <view class="header">
      <text class="title">第 21 关：嘀嗒密码 ⏱️</text>
      <text class="tip">任务：用短/长输入摩尔斯电码，拼出 SOS</text>
    </view>

    <!-- HUD -->
    <view class="hud">
      <text class="badge">✅ 状态：{{ morseSolved ? '已完成' : '进行中' }}</text>
      <text class="small">⏱ 用时：{{ formatTime(elapsedMs) }}</text>
    </view>

    <view class="board">
      <view class="board-bg" />

      <!-- 提示栏 -->
      <view class="hintbar">
        <view class="topic">本局重点：用简单符号表示复杂信息｜0/1 也能表示世界</view>
        <text class="hinttext">
          摩尔斯电码用“短/长”表示信息：短=“·”，长=“—”
          <text class="linebreak" />
          目标：拼出 SOS（... --- ...）
        </text>
      </view>

      <!-- 摩尔斯输入区 -->
      <view class="panel">
        <view class="panel-head">
          <text class="panel-title">摩尔斯电码：拼出 SOS</text>
          <text class="panel-sub">提示：SOS = ··· ——— ···（中间用空格分隔）</text>
        </view>

        <view class="morse-card">
          <view class="morse-display">
            <text class="morse-label">你的输入：</text>
            <text class="morse-text">{{ morseText || '（还没输入）' }}</text>
          </view>

          <view class="morse-actions">
            <view class="btn dot" @click="addMorse('.')"
                  :class="{ disabled: morseSolved || isMoving }">短 ·</view>
            <view class="btn dash" @click="addMorse('-')"
                  :class="{ disabled: morseSolved || isMoving }">长 —</view>
            <view class="btn space" @click="addMorse(' ')"
                  :class="{ disabled: morseSolved || isMoving }">分隔</view>
          </view>

          <view class="morse-actions2">
            <view class="btn back" @click="popMorse" :class="{ disabled: morseSolved || morseText.length===0 }">
              ⌫ 退格
            </view>
            <view class="btn clear" @click="clearMorse" :class="{ disabled: morseSolved }">↩ 清空</view>
            <view class="btn check" @click="checkMorse" :class="{ disabled: morseSolved }">✅ 检查</view>
          </view>

          <view v-if="morseChecked" class="feedback" :class="{ ok: morseSolved, bad: !morseSolved }">
            <text v-if="morseSolved">✅ 正确！SOS 发出求救信号啦～</text>
            <text v-else>❌ 不对哦～提示：SOS = ··· ——— ···（中间用空格分隔）</text>
          </view>
        </view>
      </view>

      <!-- 底部按钮 -->
      <view class="footer">
        <view class="btn reset" @click="resetAll">↩ 重新开始</view>
        <view class="btn finish" :class="{ disabled: !morseSolved }" @click="finish">
          🎉 通关
        </view>
      </view>
    </view>

    <!-- 成功弹窗 -->
    <view v-if="success" class="popup" @touchmove.stop.prevent>
      <view class="popup-card">
        <text class="pop-title">🎉 通关成功！</text>
        <text class="pop-desc">
          你学会了：
          <text class="linebreak" />
          1）用“短/长”这种简单符号表示信息（摩尔斯电码）；
          <text class="linebreak" />
          2）简单符号组合起来，就能表达复杂世界。
          <text class="linebreak" />
          用时：{{ formatTime(elapsedMs) }}｜错误：{{ wrongTimes }} 次｜星星：{{ earnedStars }}⭐
        </text>
        <view class="pop-actions">
          <view class="pop-btn" @click="resetAll">再玩一次</view>
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
      levelId: 21,

      levelProgress: { unlocked: true, stars: 0, bestSteps: null },
      reported: false,

      elapsedMs: 0,
      clock: null,
      startAt: 0,

      success: false,
      isMoving: false,

      wrongTimes: 0,
      earnedStars: 0,

      toast: { show: false, text: '' },

      // Morse
      morseText: '',
      morseChecked: false,
      morseSolved: false,
      targetMorse: '... --- ...'
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
      if (sec <= 45 && wrongTimes <= 1) return 3
      if (sec <= 70) return 2
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
            wrongTimes: this.wrongTimes
          }
        })

        this.levelProgress.stars = Math.max(this.levelProgress.stars || 0, stars)
        if (this.levelProgress.bestSteps == null) this.levelProgress.bestSteps = steps
        else this.levelProgress.bestSteps = Math.min(this.levelProgress.bestSteps, steps)
      } catch (e) {}
    },

    // ===== 初始化 =====
    newGame() {
      this.success = false
      this.isMoving = false
      this.reported = false
      this.wrongTimes = 0
      this.earnedStars = 0

      this.morseText = ''
      this.morseChecked = false
      this.morseSolved = false

      this.stopClock()
      this.startClock()
      uni.vibrateShort({ type: 'light' })
    },

    // ===== Morse 输入 =====
    addMorse(ch) {
      if (this.morseSolved) return
      if (this.morseText.length >= 24) {
        this.toastMini('输入太长啦，先检查或清空～')
        return
      }
      this.morseText += ch
      uni.vibrateShort({ type: 'light' })
    },
    popMorse() {
      if (this.morseSolved) return
      this.morseText = this.morseText.slice(0, -1)
      uni.vibrateShort({ type: 'light' })
    },
    clearMorse() {
      if (this.morseSolved) return
      this.morseText = ''
      this.morseChecked = false
      uni.vibrateShort({ type: 'light' })
    },
    normalizeMorse(s) {
      return (s || '').replace(/\s+/g, ' ').trim()
    },
    checkMorse() {
      if (this.morseSolved) return
      this.morseChecked = true
      const mine = this.normalizeMorse(this.morseText)
      const ok = mine === this.targetMorse

      if (!ok) this.wrongTimes += 1
      this.morseSolved = ok

      uni.vibrateShort({ type: 'light' })
      this.toastMini(ok ? '✅ SOS 正确！' : '❌ 再试试～')
    },

    // ===== 通关 =====
    async finish() {
      if (!this.morseSolved) {
        this.toastMini('先拼出 SOS 再通关～')
        return
      }

      this.success = true
      this.stopClock()
      this.earnedStars = this.calcStars({ usedMs: this.elapsedMs, wrongTimes: this.wrongTimes })

      await this.reportPass({
        steps: 1,
        usedMs: this.elapsedMs,
        stars: this.earnedStars
      })
    },

    resetAll() {
      this.newGame()
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
      uni.redirectTo({ url: '/pages/game/level/level22' })
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

  height: calc(100vh - 40rpx - 30rpx - 150rpx);
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

/* panel */
.panel{
  position: relative;
  z-index: 1;
  border-radius: 26rpx;
  background: rgba(79,108,255,0.06);
  border: 2rpx dashed rgba(79,108,255,0.18);
  padding: 12rpx;
  overflow: hidden;
  flex: 1;
  min-height: 0;
}
.panel-head{ margin-bottom: 10rpx; }
.panel-title{
  display:block;
  font-size: 26rpx;
  font-weight: 900;
  color:#2b3a66;
}
.panel-sub{
  display:block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color:#6b7280;
  font-weight: 800;
}

/* morse card */
.morse-card{
  border-radius: 22rpx;
  background: rgba(255,255,255,0.92);
  border: 2rpx solid rgba(0,0,0,0.06);
  box-shadow: 0 10rpx 22rpx rgba(0,0,0,0.08);
  padding: 14rpx;
}
.morse-display{
  display:flex;
  gap: 10rpx;
  margin-bottom: 12rpx;
}
.morse-label{
  font-size: 22rpx;
  font-weight: 900;
  color:#2b3a66;
}
.morse-text{
  flex: 1;
  font-size: 22rpx;
  color:#555;
  font-weight: 900;
  line-height: 1.4;
  word-break: break-all;
}
.morse-actions{
  display:flex;
  gap: 12rpx;
  margin-bottom: 10rpx;
}
.morse-actions2{
  display:flex;
  gap: 12rpx;
}

/* buttons */
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
.dot{ background: linear-gradient(90deg,#4f6cff 0%,#667eea 100%); color:#fff; }
.dash{ background: linear-gradient(90deg,#ff9f43 0%,#ff6b6b 100%); color:#fff; }
.space{ background: linear-gradient(90deg,#2ed573 0%,#1e90ff 100%); color:#fff; }
.check{ background: linear-gradient(90deg,#4f6cff 0%,#667eea 100%); color:#fff; }
.back{ background: linear-gradient(90deg,#eef2ff 0%,#dbe9ff 100%); color:#4f6cff; }
.clear{ background: linear-gradient(90deg,#f5f5f5 0%,#e9e9e9 100%); color:#555; }

/* feedback */
.feedback{
  margin-top: 12rpx;
  border-radius: 18rpx;
  padding: 12rpx;
  font-size: 22rpx;
  font-weight: 900;
}
.feedback.ok{ background: rgba(46,213,115,0.12); color:#167c3a; }
.feedback.bad{ background: rgba(255,107,107,0.12); color:#b42318; }

/* footer */
.footer{
  position: relative;
  z-index: 1;
  display:flex;
  gap: 12rpx;
}
.reset{ background: linear-gradient(90deg,#f5f5f5 0%,#e9e9e9 100%); color:#555; }
.finish{ background: linear-gradient(90deg,#4f6cff 0%,#667eea 100%); color:#fff; }

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
