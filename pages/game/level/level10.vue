<template>
  <view class="page">
    <view class="header">
      <text class="title">第 10 关：触摸输入 · 顺序挑战 👆</text>
      <text class="tip">先记住亮起顺序，再按顺序点出来</text>
    </view>

    <view class="hud">
      <text class="badge">第 {{ round }}/{{ totalRounds }} 轮</text>
      <text class="badge">长度：{{ currentLength }}</text>
      <text class="badge">❤️ 机会：{{ lives }}</text>
      <text class="small">
        {{
          success
            ? '已完成本关'
            : isShowing
              ? '正在播放顺序，请认真看'
              : canInput
                ? `输入中：${inputIndex}/${sequence.length}`
                : '点击“开始挑战”'
        }}
      </text>
    </view>

    <view class="board">
      <view class="board-bg" />

      <view class="hintbar">
        <text class="hinttext">
          触摸不仅是“点一下”，还可以让程序识别“顺序”。你点的先后次序不同，程序的反应也会不同。
        </text>
      </view>

      <view class="status-box">
        <text class="status-text">用时：{{ formatTime(elapsedMs) }}</text>
        <text class="status-text">总点击：{{ totalTapCount }}</text>
        <text class="status-text">最好记住 {{ maxLengthReached }} 格</text>
      </view>

      <view class="tap-grid">
        <view
          v-for="(item, index) in cells"
          :key="index"
          class="grid-cell"
          :class="{
            active: highlightIndex === index,
            wrong: wrongFlashIndex === index,
            disabled: !canTapBoard
          }"
          @click="tapCell(index)"
        >
          <text class="cell-emoji">
            {{ highlightIndex === index ? '✨' : wrongFlashIndex === index ? '❌' : '🔘' }}
          </text>
          <text class="cell-text">
            {{ highlightIndex === index ? '记住' : '按钮' }}
          </text>
        </view>
      </view>

      <view class="mini-tip">
        <text>{{ guideText }}</text>
      </view>
    </view>

    <view class="actions">
      <view class="btn ghost" @click="startOrReplay" :class="{ disabled: success }">
        {{ hasStarted ? (isShowing ? '播放中...' : '再看一遍') : '开始挑战' }}
      </view>
      <view class="btn reset" @click="reset">↩ 重新开始</view>
      <view class="btn next" @click="goNext" :class="{ disabled: !success }">下一关 →</view>
    </view>

    <view v-if="success" class="popup" @touchmove.stop.prevent>
      <view class="popup-card">
        <text class="pop-title">🎉 通关成功！</text>
        <text class="pop-desc">
          你学会了：触摸输入不只是“有没有点击”，还包括“点击顺序”！
          <text class="linebreak" />
          程序会根据你点的位置和先后顺序，执行不同操作。
        </text>
        <view class="pop-actions">
          <view class="pop-btn" @click="reset">再玩一次</view>
          <view class="pop-btn primary" @click="goNext">下一关 →</view>
        </view>
      </view>
    </view>

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
      levelId: 10,

      levelProgress: { unlocked: true, stars: 0, bestSteps: null },
      reported: false,

      cells: Array.from({ length: 9 }, (_, i) => i),

      totalRounds: 3,
      round: 1,
      lives: 3,

      // 每轮长度：3, 4, 5
      baseLength: 3,
      currentLength: 3,
      maxLengthReached: 0,

      sequence: [],
      userInput: [],
      inputIndex: 0,

      highlightIndex: -1,
      wrongFlashIndex: -1,

      isShowing: false,
      canInput: false,
      hasStarted: false,
      success: false,

      totalTapCount: 0,
      correctTapCount: 0,

      guideText: '先看系统播放，再按同样顺序点击。',

      clock: null,
      startAt: 0,
      elapsedMs: 0,

      playTimers: [],
      toast: { show: false, text: '' }
    }
  },

  computed: {
    canTapBoard() {
      return this.canInput && !this.success && !this.isShowing
    }
  },

  onLoad() {
    this.loadLevelProgress()
  },

  onUnload() {
    this.stopClock()
    this.clearPlayTimers()
    clearTimeout(this._toastTimer)
    clearTimeout(this._wrongTimer)
  },

  methods: {
    async loadLevelProgress() {
      try {
        const res = await request({
          url: `/api/game/levels/${this.levelId}`,
          method: 'GET'
        })
        this.levelProgress = {
          unlocked: res.unlocked === 1 || res.unlocked === true,
          stars: Number(res.stars || 0),
          bestSteps: res.bestSteps ?? res.best_steps ?? null
        }

        if (!this.levelProgress.unlocked) {
          uni.showToast({ title: '该关卡未解锁', icon: 'none' })
          setTimeout(() => {
            uni.redirectTo({ url: '/pages/game/level-select' })
          }, 500)
        }
      } catch (e) {
        console.log('loadLevelProgress failed:', e)
      }
    },

    calcStarsByTime(ms) {
      const sec = ms / 1000
      if (sec <= 20) return 3
      if (sec <= 35) return 2
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
            usedTimeSec: Math.round(usedMs / 1000)
          }
        })

        this.levelProgress.stars = Math.max(this.levelProgress.stars || 0, stars)
        if (this.levelProgress.bestSteps == null) this.levelProgress.bestSteps = steps
        else this.levelProgress.bestSteps = Math.min(this.levelProgress.bestSteps, steps)
      } catch (e) {
        console.log('reportPass failed:', e)
      }
    },

    startClock() {
      if (this.clock) return
      this.startAt = Date.now() - this.elapsedMs
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

    startOrReplay() {
      if (this.success || this.isShowing) return

      if (!this.hasStarted) {
        this.hasStarted = true
        this.elapsedMs = 0
        this.startClock()
      }

      this.prepareRound()
      this.playSequence()
    },

    prepareRound() {
      this.clearPlayTimers()
      this.canInput = false
      this.userInput = []
      this.inputIndex = 0
      this.highlightIndex = -1
      this.wrongFlashIndex = -1
      this.currentLength = this.baseLength + (this.round - 1)
      this.maxLengthReached = Math.max(this.maxLengthReached, this.currentLength)
      this.sequence = this.generateSequence(this.currentLength)
      this.guideText = `第 ${this.round} 轮：认真看完 ${this.currentLength} 个亮起顺序。`
    },

    generateSequence(len) {
      const arr = []
      let prev = -1
      for (let i = 0; i < len; i++) {
        let next = Math.floor(Math.random() * 9)
        while (next === prev) {
          next = Math.floor(Math.random() * 9)
        }
        arr.push(next)
        prev = next
      }
      return arr
    },

    playSequence() {
      this.clearPlayTimers()
      this.isShowing = true
      this.canInput = false
      this.highlightIndex = -1

      const unit = 700

      this.sequence.forEach((idx, i) => {
        const onTimer = setTimeout(() => {
          this.highlightIndex = idx
          uni.vibrateShort({ type: 'light' })
        }, i * unit)

        const offTimer = setTimeout(() => {
          if (this.highlightIndex === idx) this.highlightIndex = -1
        }, i * unit + 360)

        this.playTimers.push(onTimer, offTimer)
      })

      const endTimer = setTimeout(() => {
        this.isShowing = false
        this.canInput = true
        this.highlightIndex = -1
        this.guideText = '现在轮到你了：按刚才的顺序点击。'
      }, this.sequence.length * unit + 200)

      this.playTimers.push(endTimer)
    },

    tapCell(index) {
      if (!this.canTapBoard) return

      this.totalTapCount += 1
      this.highlightIndex = index
      setTimeout(() => {
        if (this.highlightIndex === index && !this.isShowing) this.highlightIndex = -1
      }, 120)

      const target = this.sequence[this.inputIndex]

      if (index === target) {
        this.userInput.push(index)
        this.inputIndex += 1
        this.correctTapCount += 1
        uni.vibrateShort({ type: 'light' })

        if (this.inputIndex >= this.sequence.length) {
          this.finishRound()
        } else {
          this.guideText = `答对了，继续输入第 ${this.inputIndex + 1} 步。`
        }
      } else {
        this.handleWrong(index)
      }
    },

    handleWrong(index) {
      this.canInput = false
      this.lives -= 1
      this.wrongFlashIndex = index
      this.guideText = '顺序错了！认真再看一遍。'
      this.toastMini(this.lives > 0 ? `错了一个，还剩 ${this.lives} 次机会` : '机会用完了，重新开始')
      uni.vibrateLong()

      clearTimeout(this._wrongTimer)
      this._wrongTimer = setTimeout(() => {
        this.wrongFlashIndex = -1

        if (this.lives <= 0) {
          this.reset()
          return
        }

        this.userInput = []
        this.inputIndex = 0
        this.playSequence()
      }, 700)
    },

    finishRound() {
      this.canInput = false

      if (this.round >= this.totalRounds) {
        this.passLevel()
        return
      }

      this.toastMini(`第 ${this.round} 轮完成！进入下一轮`)
      this.round += 1
      this.guideText = `太棒了！准备开始第 ${this.round} 轮。`

      setTimeout(() => {
        this.prepareRound()
        this.playSequence()
      }, 900)
    },

    async passLevel() {
      this.success = true
      this.canInput = false
      this.isShowing = false
      this.stopClock()
      uni.vibrateLong()

      const usedMs = this.elapsedMs
      const stars = this.calcStarsByTime(usedMs)
      const steps = this.totalTapCount

      await this.reportPass({ steps, usedMs, stars })
    },

    clearPlayTimers() {
      this.playTimers.forEach(t => clearTimeout(t))
      this.playTimers = []
    },

    toastMini(text) {
      this.toast.text = text
      this.toast.show = true
      clearTimeout(this._toastTimer)
      this._toastTimer = setTimeout(() => {
        this.toast.show = false
      }, 1000)
    },

    reset() {
      this.clearPlayTimers()
      this.reported = false
      this.round = 1
      this.lives = 3
      this.currentLength = this.baseLength
      this.maxLengthReached = 0
      this.sequence = []
      this.userInput = []
      this.inputIndex = 0
      this.highlightIndex = -1
      this.wrongFlashIndex = -1
      this.isShowing = false
      this.canInput = false
      this.hasStarted = false
      this.success = false
      this.totalTapCount = 0
      this.correctTapCount = 0
      this.elapsedMs = 0
      this.guideText = '先看系统播放，再按同样顺序点击。'
      this.stopClock()
      uni.vibrateShort({ type: 'light' })
    },

    goNext() {
      if (!this.success) {
        uni.showToast({ title: '先完成这关再去下一关哦～', icon: 'none' })
        return
      }
      uni.redirectTo({ url: '/pages/game/level/level11' })
    }
  }
}
</script>

<style scoped>
.page{
  min-height: 100vh;
  padding: 40rpx 30rpx;
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 55%, #89f7fe 100%);
  box-sizing: border-box;
}

.header{
  text-align: center;
  color: #fff;
  margin-bottom: 18rpx;
}
.title{
  font-size: 40rpx;
  font-weight: 900;
}
.tip{
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  opacity: 0.95;
}

.hud{
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
  flex-wrap: wrap;
}
.badge{
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255,255,255,0.22);
  color: #fff;
  font-size: 24rpx;
  font-weight: 900;
}
.small{
  width: 100%;
  text-align: center;
  color: #eaf2ff;
  font-size: 22rpx;
  opacity: 0.95;
}

.board{
  position: relative;
  background: rgba(255,255,255,0.95);
  border-radius: 32rpx;
  padding: 22rpx;
  box-shadow: 0 18rpx 50rpx rgba(0,0,0,0.18);
  overflow: hidden;
  border: 2rpx solid rgba(255,255,255,0.8);
  min-height: 860rpx;
}

.board-bg{
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 20% 20%, rgba(255, 234, 0, 0.10), transparent 40%),
    radial-gradient(circle at 80% 25%, rgba(0, 200, 255, 0.10), transparent 45%),
    radial-gradient(circle at 50% 80%, rgba(255, 0, 150, 0.08), transparent 50%);
  z-index: 0;
}

.hintbar{
  position: relative;
  z-index: 1;
  margin-bottom: 16rpx;
  padding: 16rpx 18rpx;
  border-radius: 22rpx;
  background: rgba(79,108,255,0.08);
  border: 2rpx solid rgba(79,108,255,0.14);
}
.hinttext{
  color: #2b3a66;
  font-size: 24rpx;
  line-height: 1.6;
  font-weight: 800;
}

.status-box{
  position: relative;
  z-index: 1;
  margin-bottom: 18rpx;
  padding: 16rpx 18rpx;
  border-radius: 22rpx;
  background: rgba(255,255,255,0.78);
  border: 2rpx dashed rgba(79,108,255,0.18);
  display: flex;
  justify-content: space-between;
  gap: 12rpx;
  flex-wrap: wrap;
}
.status-text{
  font-size: 24rpx;
  font-weight: 900;
  color: #2b3a66;
}

.tap-grid{
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18rpx;
  margin-top: 10rpx;
}

.grid-cell{
  height: 180rpx;
  border-radius: 28rpx;
  background: linear-gradient(180deg, #f8fbff 0%, #e8f0ff 100%);
  border: 3rpx solid rgba(79,108,255,0.14);
  box-shadow: 0 10rpx 24rpx rgba(0,0,0,0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  transition: all 0.18s ease;
}

.grid-cell:active{
  transform: scale(0.96);
}

.grid-cell.active{
  background: linear-gradient(180deg, #ffd166 0%, #ff9f43 100%);
  border-color: rgba(255,159,67,0.7);
  box-shadow: 0 16rpx 34rpx rgba(255,159,67,0.28);
}

.grid-cell.wrong{
  background: linear-gradient(180deg, #ffb3b3 0%, #ff6b6b 100%);
  border-color: rgba(255,107,107,0.7);
  box-shadow: 0 16rpx 34rpx rgba(255,107,107,0.28);
}

.grid-cell.disabled{
  opacity: 0.95;
}

.cell-emoji{
  font-size: 48rpx;
}
.cell-text{
  font-size: 24rpx;
  font-weight: 900;
  color: #2b3a66;
}

.mini-tip{
  position: relative;
  z-index: 1;
  margin-top: 18rpx;
  padding: 16rpx 18rpx;
  border-radius: 20rpx;
  background: rgba(255,255,255,0.72);
  color: #6b4a12;
  font-size: 22rpx;
  font-weight: 800;
  line-height: 1.6;
}

.actions{
  margin-top: 18rpx;
  display: flex;
  gap: 14rpx;
}
.btn{
  flex: 1;
  padding: 22rpx 0;
  text-align: center;
  border-radius: 999rpx;
  font-size: 28rpx;
  font-weight: 900;
  box-shadow: 0 12rpx 26rpx rgba(0,0,0,0.14);
}
.btn.disabled{
  opacity: 0.55;
  pointer-events: none;
  box-shadow: none;
}
.ghost{
  background: linear-gradient(90deg,#fff1d6 0%,#ffe2a8 100%);
  color: #8a5300;
}
.reset{
  background: linear-gradient(90deg,#f5f5f5 0%,#e9e9e9 100%);
  color: #555;
}
.next{
  background: linear-gradient(90deg,#4f6cff 0%,#667eea 100%);
  color: #fff;
}

.popup{
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99;
  backdrop-filter: blur(8rpx);
}
.popup-card{
  width: 78vw;
  background: rgba(255,255,255,0.96);
  border-radius: 32rpx;
  padding: 54rpx 40rpx 40rpx;
  text-align: center;
  box-shadow: 0 22rpx 70rpx rgba(0,0,0,0.22);
}
.pop-title{
  display: block;
  font-size: 44rpx;
  font-weight: 900;
  color: #ff6b6b;
  margin-bottom: 16rpx;
}
.pop-desc{
  display: block;
  color: #555;
  font-size: 26rpx;
  line-height: 1.7;
  margin-bottom: 24rpx;
}
.linebreak{
  display: block;
  height: 10rpx;
}
.pop-actions{
  display: flex;
  gap: 14rpx;
}
.pop-btn{
  flex: 1;
  padding: 18rpx 0;
  border-radius: 22rpx;
  font-size: 28rpx;
  font-weight: 900;
  background: linear-gradient(90deg,#eef2ff 0%,#dbe9ff 100%);
  color: #4f6cff;
  box-shadow: 0 10rpx 22rpx rgba(0,0,0,0.10);
}
.pop-btn.primary{
  background: linear-gradient(90deg,#ff9f43 0%,#ff6b6b 100%);
  color: #fff;
}

.mini-toast{
  position: fixed;
  left: 50%;
  bottom: 140rpx;
  transform: translateX(-50%);
  padding: 16rpx 22rpx;
  border-radius: 999rpx;
  background: rgba(0,0,0,0.75);
  color: #fff;
  font-size: 24rpx;
  font-weight: 900;
  z-index: 120;
}

@media (max-width: 768px){
  .page{
    padding: 30rpx 20rpx;
  }

  .tap-grid{
    gap: 14rpx;
  }

  .grid-cell{
    height: 160rpx;
  }

  .popup-card{
    width: 86vw;
  }
}
</style>