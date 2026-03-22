<template>
  <view class="page">
    <!-- 头部 -->
    <view class="header">
      <text class="title">第 8 关：键盘输入 ⌨️</text>
      <text class="tip">任务：把屏幕上的“名字”输入到框里（键盘是输入工具）</text>
    </view>

    <!-- HUD -->
    <view class="hud">
      <view class="hud-left">
        <text class="badge">✅ 已完成：{{ correctCount }}/{{ needCorrect }}</text>
      </view>
      <view class="hud-right">
        <text class="badge2">⏱ {{ formatTime(elapsedMs) }}</text>
      </view>
    </view>

    <!-- 游戏区 -->
    <view class="card">
      <view class="card-bg" />

      <!-- 题目 -->
      <view class="question">
        <text class="q-title">请你输入：</text>
        <view class="q-chip">
          <text class="q-emoji">{{ current.emoji }}</text>
          <text class="q-text">{{ current.text }}</text>
        </view>
        <text class="q-hint">提示：看清楚每个字，再输入</text>
      </view>

      <!-- 输入区 -->
      <view class="input-area">
        <text class="label">你的输入：</text>

        <input
          class="ipt"
          v-model="userInput"
          :disabled="success || isChecking"
          placeholder="点这里，键盘会弹出来"
          confirm-type="done"
          @confirm="checkAnswer"
        />

        <view class="preview">
          <text class="preview-title">实时显示：</text>
          <text class="preview-text">{{ userInput || '（还没输入）' }}</text>
        </view>

        <view class="btns">
          <view class="btn gray" @click="clearInput" :class="{ disabled: isChecking || success }">
            清空
          </view>
          <view class="btn primary" @click="checkAnswer" :class="{ disabled: isChecking || success }">
            提交
          </view>
        </view>

        <view class="stats">
          <text class="stat">❌ 失误：{{ wrongCount }}</text>
          <text class="stat">🧠 小提示：键盘输入就是把信息“送进电脑”</text>
        </view>
      </view>
    </view>

    <!-- 底部按钮 -->
    <view class="actions">
      <view class="btn2 reset" @click="reset" :class="{ disabled: isChecking }">↩ 重新开始</view>
      <view class="btn2 next" @click="goNext" :class="{ disabled: !success }">下一关 →</view>
    </view>

    <!-- 成功弹窗 -->
    <view v-if="success" class="popup" @touchmove.stop.prevent>
      <view class="popup-card">
        <text class="pop-title">🎉 通关成功！</text>
        <text class="pop-desc">
          你学会了：键盘可以输入信息！
          <text class="linebreak" />
          你把“名字”输入到电脑里，电脑就能显示出来。
        </text>

        <view class="stars">
          <text class="star" v-for="i in stars" :key="'s'+i">⭐</text>
          <text class="star gray" v-for="i in (3 - stars)" :key="'g'+i">⭐</text>
        </view>

        <view class="pop-actions">
          <view class="pop-btn" @click="reset">再玩一次</view>
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
      levelId: 8,

      // 通关条件
      needCorrect: 5,
      correctCount: 0,
      wrongCount: 0,

      // 当前题目
      current: { id: '', text: '', emoji: '🙂' },
      userInput: '',
      isChecking: false,

      // 题库：实例多一些（你还可以继续加）
      pool: [
        { id: 'n1', text: '小明', emoji: '🧒' },
        { id: 'n2', text: '小红', emoji: '👧' },
        { id: 'n3', text: '小强', emoji: '🧑' },
        { id: 'n4', text: '小华', emoji: '👦' },
        { id: 'n5', text: '小美', emoji: '👧' },
        { id: 'n6', text: '小勇', emoji: '🧒' },
        { id: 'n7', text: '小雨', emoji: '🌧️' },
        { id: 'n8', text: '小风', emoji: '🍃' },
        { id: 'n9', text: '小星', emoji: '⭐' },
        { id: 'n10', text: '小月', emoji: '🌙' },
        { id: 'n11', text: '小太阳', emoji: '☀️' },
        { id: 'n12', text: '小海', emoji: '🌊' },
        { id: 'n13', text: '小山', emoji: '⛰️' },
        { id: 'n14', text: '小林', emoji: '🌳' },
        { id: 'n15', text: '小云', emoji: '☁️' },
        { id: 'n16', text: '小龙', emoji: '🐉' },
        { id: 'n17', text: '小虎', emoji: '🐯' },
        { id: 'n18', text: '小兔', emoji: '🐰' },
        { id: 'n19', text: '小猫', emoji: '🐱' },
        { id: 'n20', text: '小狗', emoji: '🐶' }
      ],

      // 随机用的“未出过列表”
      bag: [],

      // 后端进度
      levelProgress: { unlocked: true, stars: 0, bestSteps: null },
      reported: false,

      // 计时
      elapsedMs: 0,
      clock: null,
      startAt: 0,

      // 星星
      stars: 3,

      // toast
      toast: { show: false, text: '' },
      _t: null
    }
  },

  computed: {
    success() {
      return this.correctCount >= this.needCorrect
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
    // ======= 后端：拉取关卡进度 =======
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
      } catch (e) {
        console.log('loadLevelProgress failed:', e)
      }
    },

    // ======= 后端：通关上报 =======
    async reportPass({ steps, usedMs, stars }) {
      if (this.reported) return
      this.reported = true
      try {
        await request({
          url: `/api/game/levels/${this.levelId}/complete`,
          method: 'POST',
          data: {
            stars,
            steps, // 这里用“总尝试次数”当步数
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

    // ======= 计时 =======
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

    // ======= 星星规则（可改） =======
    calcStars(ms, wrong) {
      const sec = ms / 1000
      // 越快越好，错误越少越好
      if (sec <= 25 && wrong <= 1) return 3
      if (sec <= 40 && wrong <= 3) return 2
      return 1
    },

    // ======= 随机抽题（不重复直到用完） =======
    shuffle(arr) {
      const a = arr.slice()
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const t = a[i]; a[i] = a[j]; a[j] = t
      }
      return a
    },

    pickOne() {
      if (this.bag.length === 0) {
        this.bag = this.shuffle(this.pool)
      }
      return this.bag.pop()
    },

    // ======= 开一局 =======
    newRound() {
      this.correctCount = 0
      this.wrongCount = 0
      this.userInput = ''
      this.reported = false
      this.stars = 3

      this.bag = this.shuffle(this.pool)
      this.current = this.pickOne()

      this.startClock()
      uni.vibrateShort({ type: 'light' })
    },

    // ======= 出下一题 =======
    nextQuestion() {
      this.userInput = ''
      this.current = this.pickOne()
    },

    // ======= 检查答案 =======
    async checkAnswer() {
      if (this.isChecking || this.success) return
      const input = (this.userInput || '').trim()

      if (!input) {
        uni.vibrateShort({ type: 'light' })
        this.toastMsg('先输入再提交～')
        return
      }

      this.isChecking = true
      const ok = input === this.current.text

      if (ok) {
        this.correctCount += 1
        uni.vibrateLong()
        this.toastMsg('✅ 正确！你用键盘输入了信息！')

        if (this.success) {
          // 通关：停表 + 计算星星 + 上报
          this.stopClock()
          const usedMs = this.elapsedMs
          const stars = this.calcStars(usedMs, this.wrongCount)
          this.stars = stars

          const steps = this.correctCount + this.wrongCount // 总尝试次数
          await this.reportPass({ steps, usedMs, stars })
        } else {
          // 下一题
          setTimeout(() => this.nextQuestion(), 260)
        }
      } else {
        this.wrongCount += 1
        uni.vibrateShort({ type: 'light' })
        this.toastMsg('❌ 再看看：要和题目一模一样哦')
      }

      this.isChecking = false
    },

    clearInput() {
      if (this.isChecking || this.success) return
      this.userInput = ''
      uni.vibrateShort({ type: 'light' })
    },

    toastMsg(text) {
      this.toast.text = text
      this.toast.show = true
      clearTimeout(this._t)
      this._t = setTimeout(() => {
        this.toast.show = false
      }, 900)
    },

    reset() {
      this.stopClock()
      this.newRound()
    },

    goBack() {
      uni.navigateBack({ delta: 1 })
    },

    goNext() {
      if (!this.success) {
        uni.showToast({ title: '先答对 5 次再去下一关～', icon: 'none' })
        return
      }
      uni.redirectTo({ url: '/pages/game/level/level9' })
    }
  }
}
</script>

<style scoped>
.page{
  min-height: 100vh;
  padding: 40rpx 30rpx;
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 55%, #89f7fe 100%);
}

.header{
  position: relative;
  text-align: center;
  color:#fff;
  margin-bottom: 18rpx;
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
.tip{ display:block; margin-top: 10rpx; font-size: 24rpx; opacity: 0.95; }

.hud{
  display:flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
  gap: 12rpx;
}
.badge,.badge2{
  display:inline-flex;
  align-items:center;
  gap: 10rpx;
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255,255,255,0.22);
  color: #fff;
  font-size: 24rpx;
  font-weight: 900;
}

/* card */
.card{
  position: relative;
  background: rgba(255,255,255,0.95);
  border-radius: 32rpx;
  padding: 22rpx;
  box-shadow: 0 18rpx 50rpx rgba(0,0,0,0.18);
  overflow: hidden;
  border: 2rpx solid rgba(255,255,255,0.8);
  min-height: 820rpx;
}
.card-bg{
  position:absolute;
  inset:0;
  background:
    radial-gradient(circle at 20% 20%, rgba(255, 234, 0, 0.10), transparent 40%),
    radial-gradient(circle at 80% 25%, rgba(0, 200, 255, 0.10), transparent 45%),
    radial-gradient(circle at 50% 80%, rgba(255, 0, 150, 0.08), transparent 50%);
  z-index:0;
}

.question{
  position: relative;
  z-index:1;
  padding: 18rpx;
  border-radius: 24rpx;
  background: rgba(79,108,255,0.07);
  border: 2rpx solid rgba(79,108,255,0.14);
}
.q-title{
  font-size: 26rpx;
  font-weight: 900;
  color:#2b3a66;
}
.q-chip{
  margin-top: 12rpx;
  padding: 16rpx 14rpx;
  border-radius: 22rpx;
  background: rgba(255,255,255,0.82);
  border: 2rpx dashed rgba(79,108,255,0.20);
  display:flex;
  align-items:center;
  justify-content:center;
  gap: 12rpx;
}
.q-emoji{ font-size: 54rpx; }
.q-text{
  font-size: 34rpx;
  font-weight: 900;
  color:#4f6cff;
  letter-spacing: 2rpx;
}
.q-hint{
  display:block;
  margin-top: 10rpx;
  color:#556;
  font-size: 22rpx;
  opacity: 0.95;
}

.input-area{
  position: relative;
  z-index:1;
  margin-top: 16rpx;
  padding: 18rpx;
  border-radius: 24rpx;
  background: rgba(255,159,67,0.07);
  border: 2rpx solid rgba(255,159,67,0.14);
}
.label{
  font-size: 24rpx;
  font-weight: 900;
  color:#2b3a66;
  margin-bottom: 10rpx;
  display:block;
}
.ipt{
  width: 100%;
  box-sizing: border-box;
  padding: 18rpx 18rpx;
  border-radius: 22rpx;
  background: rgba(255,255,255,0.9);
  border: 2rpx solid rgba(0,0,0,0.08);
  font-size: 30rpx;
  font-weight: 900;
  color:#333;
}

.preview{
  margin-top: 14rpx;
  padding: 14rpx 16rpx;
  border-radius: 18rpx;
  background: rgba(255,255,255,0.65);
  border: 2rpx dashed rgba(0,0,0,0.10);
}
.preview-title{
  font-size: 22rpx;
  color:#666;
  font-weight: 800;
}
.preview-text{
  display:block;
  margin-top: 6rpx;
  font-size: 30rpx;
  font-weight: 900;
  color:#2b3a66;
}

.btns{
  margin-top: 14rpx;
  display:flex;
  gap: 14rpx;
}
.btn{
  flex:1;
  padding: 18rpx 0;
  border-radius: 999rpx;
  text-align:center;
  font-size: 28rpx;
  font-weight: 900;
  box-shadow: 0 10rpx 22rpx rgba(0,0,0,0.12);
}
.btn.disabled{
  opacity: 0.55;
  pointer-events: none;
  box-shadow: none;
}
.btn.gray{
  background: linear-gradient(90deg,#f5f5f5 0%,#e9e9e9 100%);
  color:#666;
}
.btn.primary{
  background: linear-gradient(90deg,#4f6cff 0%,#667eea 100%);
  color:#fff;
}

.stats{
  margin-top: 12rpx;
  display:flex;
  flex-direction: column;
  gap: 6rpx;
}
.stat{
  font-size: 22rpx;
  color:#555;
  font-weight: 800;
}

/* bottom actions */
.actions{
  margin-top: 18rpx;
  display:flex;
  gap: 14rpx;
}
.btn2{
  flex: 1;
  padding: 22rpx 0;
  text-align: center;
  border-radius: 999rpx;
  font-size: 28rpx;
  font-weight: 900;
  box-shadow: 0 12rpx 26rpx rgba(0,0,0,0.14);
}
.btn2.disabled{
  opacity: 0.55;
  pointer-events: none;
  box-shadow: none;
}
.btn2.reset{
  background: linear-gradient(90deg,#f5f5f5 0%,#e9e9e9 100%);
  color:#555;
}
.btn2.next{
  background: linear-gradient(90deg,#ff9f43 0%,#ff6b6b 100%);
  color:#fff;
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
  margin-bottom: 18rpx;
}
.linebreak{ display:block; height: 10rpx; }
.stars{ margin-bottom: 22rpx; }
.star{ font-size: 34rpx; }
.star.gray{ opacity: 0.25; }

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
  background: linear-gradient(90deg,#ff9f43 0%,#ff6b6b 100%);
  color:#fff;
}

/* mini toast */
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
