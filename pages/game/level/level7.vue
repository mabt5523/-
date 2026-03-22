<template>
  <view class="page">
    <!-- 头部 -->
    <view class="header">
      <text class="title">第 7 关：点我一下 👆</text>
      <text class="tip">任务：点按钮，让设备“亮起来/动起来”</text>
    </view>

    <!-- HUD -->
    <view class="hud">
      <view class="hud-left">
        <text class="badge">⭐ 进度：{{ solved }}/{{ rounds }}</text>
      </view>
      <view class="hud-right">
        <text class="small">⏱ {{ formatTime(elapsedMs) }}　点击：{{ steps }}</text>
      </view>
    </view>

    <!-- 游戏区 -->
    <view class="board">
      <view class="board-bg" />

      <!-- 场景卡 -->
      <view class="scene-card">
        <text class="scene-title">场景</text>
        <text class="scene-desc">{{ currentSceneText }}</text>
      </view>

      <!-- 设备展示 -->
      <view class="device-card" :class="{ on: deviceOn, flash: flash }">
        <view class="device-top">
          <text class="device-emoji">{{ currentDevice.emoji }}</text>
          <view class="device-info">
            <text class="device-name">{{ currentDevice.name }}</text>
            <text class="device-state">
              状态：<text :class="{ ok: deviceOn }">{{ deviceOn ? currentDevice.onText : currentDevice.offText }}</text>
            </text>
          </view>
        </view>

        <!-- 灯泡效果（简单直观） -->
        <view class="lamp">
          <view class="lamp-bulb" :class="{ on: deviceOn }"></view>
          <text class="lamp-text">{{ deviceOn ? '亮了！' : '还没亮～' }}</text>
        </view>

        <!-- 本题提示 -->
        <view class="hint">
          <text>提示：点击正确的按钮（这是“输入”），设备会有反应（这是“输出”）</text>
        </view>
      </view>

      <!-- 按钮区：每题随机一组 -->
      <view class="btn-area">
        <view
          v-for="b in buttons"
          :key="b.id"
          class="big-btn"
          :class="[b.style, btnStateClass(b)]"
          @click="tapButton(b)"
        >
          <text class="btn-emoji">{{ b.emoji }}</text>
          <text class="btn-text">{{ b.text }}</text>
        </view>
      </view>

      <view class="statusbar">
        <text class="status">
          <template v-if="success">🎉 通关成功！你学会了：输入 → 电脑反应</template>
          <template v-else>找到“能让它亮起来”的按钮～</template>
        </text>
        <text class="stat-mini">✅ 正确：{{ correctCount }}　❌ 错误：{{ wrongCount }}</text>
      </view>
    </view>

    <!-- 操作 -->
    <view class="actions">
      <view class="btn reset" @click="reset">↩ 重新开始</view>
      <view class="btn next" :class="{ disabled: !success }" @click="goNext">下一关 →</view>
    </view>

    <!-- 通关弹窗 -->
    <view v-if="success" class="popup" @touchmove.stop.prevent>
      <view class="popup-card">
        <text class="pop-title">🎉 通关成功！</text>
        <text class="pop-desc">
          你学会了：当你点按钮（输入）时，电脑会让设备变化（输出）。
          <text class="linebreak" />
          这就是“输入 → 反应”的过程！
        </text>
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
  async onLoad() {
    await this.loadLevelProgress()
    this.newGame()
  },
  onUnload() {
    this.stopClock()
  },

  data() {
    return {
      levelId: 7,

      // 后端进度
      levelProgress: { unlocked: true, stars: 0, bestSteps: null },
      reported: false,

      // 配置
      rounds: 4,        // ✅ 一次通关需要完成几题
      perRoundButtons: 3, // ✅ 每题给几个按钮选项

      // 状态
      solved: 0,
      steps: 0,
      correctCount: 0,
      wrongCount: 0,
      success: false,

      // 本题
      current: null,
      currentDevice: { name: '', emoji: '💡', onText: '开', offText: '关' },
      currentSceneText: '',
      buttons: [],
      deviceOn: false,
      flash: false,
      pickedDisabled: false,

      // 计时
      elapsedMs: 0,
      clock: null,
      startAt: 0,

      toast: { show: false, text: '' },

      // ✅ 题库：多实例（输入→反应）
      // 每个 item：设备、场景文字、正确按钮、干扰按钮池
      pool: [
        {
          key: 'lamp',
          device: { name: '台灯', emoji: '💡', onText: '亮', offText: '灭' },
          scene: '晚上写作业，有点暗～把台灯打开吧！',
          correct: { id: 'on', text: '开灯', emoji: '✅', style: 'gray' },
          wrongs: [
            { id: 'w1', text: '关灯', emoji: '🙈', style: 'ghost' },
            { id: 'w2', text: '拍桌子', emoji: '🫳', style: 'gray' },
            { id: 'w3', text: '摇一摇', emoji: '🫨', style: 'gray' }
          ]
        },
        {
          key: 'traffic',
          device: { name: '红绿灯', emoji: '🚦', onText: '变绿', offText: '还没变' },
          scene: '要过马路了，等它变成“绿灯”～',
          correct: { id: 'wait', text: '按行人按钮', emoji: '🟢', style: 'gray' },
          wrongs: [
            { id: 'w1', text: '直接冲', emoji: '🏃', style: 'danger' },
            { id: 'w2', text: '关掉红绿灯', emoji: '⛔', style: 'ghost' },
            { id: 'w3', text: '大喊一声', emoji: '🗣️', style: 'gray' }
          ]
        },
        {
          key: 'door',
          device: { name: '自动门', emoji: '🚪', onText: '打开', offText: '关闭' },
          scene: '你走到门前，想让门打开～',
          correct: { id: 'sensor', text: '靠近感应区', emoji: '👣', style: 'gray' },
          wrongs: [
            { id: 'w1', text: '远远站着', emoji: '🧍', style: 'gray' },
            { id: 'w2', text: '反向跑开', emoji: '🏃‍♂️', style: 'ghost' },
            { id: 'w3', text: '假装没看到', emoji: '🙄', style: 'gray' }
          ]
        },
        {
          key: 'speaker',
          device: { name: '小音箱', emoji: '🔊', onText: '播放', offText: '静音' },
          scene: '想听一段音乐，让音箱播放吧！',
          correct: { id: 'play', text: '播放', emoji: '▶️', style: 'gray' },
          wrongs: [
            { id: 'w1', text: '暂停', emoji: '⏸', style: 'ghost' },
            { id: 'w2', text: '拔电源', emoji: '🔌', style: 'danger' },
            { id: 'w3', text: '敲一敲', emoji: '🔨', style: 'gray' }
          ]
        },
        {
          key: 'fan',
          device: { name: '小风扇', emoji: '🌀', onText: '转起来', offText: '不转' },
          scene: '有点热，想让风扇转起来～',
          correct: { id: 'fan_on', text: '打开风扇', emoji: '🟢', style: 'gray' },
          wrongs: [
            { id: 'w1', text: '关风扇', emoji: '🔴', style: 'ghost' },
            { id: 'w2', text: '用力吹气', emoji: '💨', style: 'gray' },
            { id: 'w3', text: '转一转按钮（乱转）', emoji: '🎛️', style: 'gray' }
          ]
        },
        {
          key: 'screen',
          device: { name: '电脑屏幕', emoji: '🖥️', onText: '亮起', offText: '黑屏' },
          scene: '电脑休眠了，让屏幕亮起来～',
          correct: { id: 'wake', text: '按电源键', emoji: '⏻', style: 'gray' },
          wrongs: [
            { id: 'w1', text: '把键盘拿走', emoji: '⌨️', style: 'gray' },
            { id: 'w2', text: '关显示器', emoji: '🙅', style: 'ghost' },
            { id: 'w3', text: '敲桌子', emoji: '🫳', style: 'gray' }
          ]
        }
      ]
    }
  },

  methods: {
    // ====== 后端 ======
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

    async reportPass({ steps, usedMs, stars, correct, wrong }) {
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
            correctCount: correct,
            wrongCount: wrong
          }
        })

        this.levelProgress.stars = Math.max(this.levelProgress.stars || 0, stars)
        if (this.levelProgress.bestSteps == null) this.levelProgress.bestSteps = steps
        else this.levelProgress.bestSteps = Math.min(this.levelProgress.bestSteps, steps)
      } catch (e) {
        console.log('reportPass failed:', e)
      }
    },

    // ====== 计时 ======
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
      const mm = m < 10 ? '0' + m : '' + m
      const ss = s < 10 ? '0' + s : '' + s
      return `${mm}:${ss}`
    },

    // ====== 工具 ======
    shuffle(arr) {
      const a = arr.slice()
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const t = a[i]; a[i] = a[j]; a[j] = t
      }
      return a
    },
    sample(arr, n) {
      return this.shuffle(arr).slice(0, n)
    },
    pickOne(arr) {
      return arr[Math.floor(Math.random() * arr.length)]
    },
    toastMsg(text) {
      this.toast.text = text
      this.toast.show = true
      clearTimeout(this._t)
      this._t = setTimeout(() => (this.toast.show = false), 900)
    },

    // ====== 游戏逻辑 ======
    newGame() {
      this.solved = 0
      this.steps = 0
      this.correctCount = 0
      this.wrongCount = 0
      this.success = false
      this.reported = false

      this.startClock()
      this.nextRound()
      uni.vibrateShort({ type: 'light' })
    },

    nextRound() {
      this.deviceOn = false
      this.flash = false
      this.pickedDisabled = false

      const q = this.pickOne(this.pool)
      this.current = q
      this.currentDevice = q.device
      this.currentSceneText = q.scene

      const wrongs = this.sample(q.wrongs, Math.max(0, this.perRoundButtons - 1))
      this.buttons = this.shuffle([q.correct, ...wrongs])
    },

    async tapButton(b) {
      if (this.success) return
      if (this.pickedDisabled) return

      this.steps++
      uni.vibrateShort({ type: 'light' })

      const isCorrect = b.id === this.current.correct.id

      if (isCorrect) {
        this.correctCount++
        this.deviceOn = true
        this.flash = true
        this.toastMsg('✅ 输入成功！设备有反应啦～')
        uni.vibrateLong()

        this.pickedDisabled = true
        setTimeout(() => (this.flash = false), 260)

        // 进入下一题或通关
        setTimeout(async () => {
          this.solved++
          if (this.solved >= this.rounds) {
            this.success = true
            this.stopClock()
            const stars = this.calcStars()
            await this.reportPass({
              steps: this.steps,
              usedMs: this.elapsedMs,
              stars,
              correct: this.correctCount,
              wrong: this.wrongCount
            })
          } else {
            this.nextRound()
          }
        }, 520)
      } else {
        this.wrongCount++
        this.toastMsg('❌ 这个输入不对，设备没反应～')
      }
    },

    // 星星：点击更少 + 时间更短更高
    calcStars() {
      const sec = this.elapsedMs / 1000
      // 3星：30秒内 且 错误<=1
      if (sec <= 30 && this.wrongCount <= 1) return 3
      // 2星：55秒内 且 错误<=3
      if (sec <= 55 && this.wrongCount <= 3) return 2
      return 1
    },

    btnStateClass(b) {
      // 你想要“点过就变淡”也可以在这里扩展
      return {}
    },

    reset() {
      this.stopClock()
      this.newGame()
    },

    goBack() {
      uni.navigateBack({ delta: 1 })
    },
    goNext() {
      if (!this.success) {
        uni.showToast({ title: '先完成所有任务再去下一关～', icon: 'none' })
        return
      }
      uni.redirectTo({ url: '/pages/game/level/level8' })
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

/* header */
.header{ position:relative; text-align:center; color:#fff; margin-bottom:18rpx; }
.back-btn{
  position:absolute; left:0; top:50%; transform:translateY(-50%);
  width:60rpx; height:60rpx; border-radius:999rpx;
  background:rgba(255,255,255,0.22);
  display:flex; align-items:center; justify-content:center;
  font-size:32rpx; font-weight:900;
}
.title{ font-size:40rpx; font-weight:900; }
.tip{ display:block; margin-top:10rpx; font-size:24rpx; opacity:0.95; }

/* hud */
.hud{ display:flex; justify-content:space-between; align-items:center; margin-bottom:16rpx; gap:12rpx; }
.badge{
  display:inline-flex; align-items:center; gap:10rpx;
  padding:10rpx 18rpx; border-radius:999rpx;
  background:rgba(255,255,255,0.22); color:#fff;
  font-size:24rpx; font-weight:900;
}
.small{ color:#eaf2ff; font-size:22rpx; opacity:0.95; }

/* board */
.board{
  position:relative;
  background:rgba(255,255,255,0.95);
  border-radius:32rpx;
  padding:22rpx;
  box-shadow:0 18rpx 50rpx rgba(0,0,0,0.18);
  overflow:hidden;
  border:2rpx solid rgba(255,255,255,0.8);
  min-height: 900rpx;
}
.board-bg{
  position:absolute; inset:0;
  background:
    radial-gradient(circle at 20% 20%, rgba(255, 234, 0, 0.10), transparent 40%),
    radial-gradient(circle at 80% 25%, rgba(0, 200, 255, 0.10), transparent 45%),
    radial-gradient(circle at 50% 80%, rgba(255, 0, 150, 0.08), transparent 50%);
  z-index:0;
}

/* scene */
.scene-card{
  position:relative; z-index:1;
  padding: 18rpx 18rpx;
  border-radius: 24rpx;
  background: rgba(79,108,255,0.08);
  border: 2rpx solid rgba(79,108,255,0.14);
  margin-bottom: 16rpx;
}
.scene-title{
  display:block; font-size:24rpx; font-weight:900; color:#2b3a66; margin-bottom: 8rpx;
}
.scene-desc{
  display:block; font-size:28rpx; line-height:1.6; font-weight:900; color:#1f2a55;
}

/* device */
.device-card{
  position:relative; z-index:1;
  border-radius: 26rpx;
  padding: 18rpx;
  background: rgba(255,255,255,0.88);
  border: 2rpx solid rgba(0,0,0,0.06);
  box-shadow: 0 10rpx 24rpx rgba(0,0,0,0.08);
  margin-bottom: 16rpx;
}
.device-card.on{
  border-color: rgba(46, 204, 113, 0.55);
  box-shadow: 0 0 0 8rpx rgba(46,204,113,0.10), 0 10rpx 24rpx rgba(0,0,0,0.08);
}
.device-card.flash{
  animation: flash 0.25s ease;
}
@keyframes flash{
  0%{ transform: scale(1); }
  50%{ transform: scale(1.01); }
  100%{ transform: scale(1); }
}

.device-top{
  display:flex;
  gap: 14rpx;
  align-items:center;
}
.device-emoji{ font-size: 64rpx; }
.device-info{ flex:1; }
.device-name{ display:block; font-size: 30rpx; font-weight: 900; color:#2b3a66; }
.device-state{ display:block; margin-top: 6rpx; font-size: 24rpx; font-weight: 800; color:#555; }
.device-state .ok{ color: #2ecc71; font-weight: 900; }

/* lamp */
.lamp{
  margin-top: 14rpx;
  padding: 16rpx;
  border-radius: 22rpx;
  background: rgba(255,159,67,0.08);
  border: 2rpx dashed rgba(255,159,67,0.22);
  display:flex;
  align-items:center;
  justify-content: space-between;
  gap: 12rpx;
}
.lamp-bulb{
  width: 58rpx;
  height: 58rpx;
  border-radius: 50%;
  background: rgba(0,0,0,0.10);
  border: 2rpx solid rgba(0,0,0,0.12);
  box-shadow: inset 0 0 0 10rpx rgba(255,255,255,0.35);
}
.lamp-bulb.on{
  background: rgba(255, 235, 59, 0.9);
  border-color: rgba(255, 235, 59, 0.9);
  box-shadow: 0 0 18rpx rgba(255,235,59,0.65), inset 0 0 0 10rpx rgba(255,255,255,0.35);
}
.lamp-text{ font-size: 26rpx; font-weight: 900; color:#6b4a12; }

.hint{
  margin-top: 12rpx;
  padding: 12rpx 14rpx;
  border-radius: 18rpx;
  background: rgba(0,0,0,0.04);
  color:#2b3a66;
  font-size: 22rpx;
  font-weight: 800;
}

/* buttons */
.btn-area{
  position:relative; z-index:1;
  display:flex;
  gap: 14rpx;
}
.big-btn{
  flex:1;
  padding: 20rpx 0;
  border-radius: 26rpx;
  display:flex;
  flex-direction: column;
  align-items:center;
  justify-content:center;
  gap: 10rpx;
  box-shadow: 0 12rpx 26rpx rgba(0,0,0,0.12);
}
.big-btn:active{ transform: scale(0.98); }
.btn-emoji{ font-size: 40rpx; }
.btn-text{ font-size: 26rpx; font-weight: 900; }

.big-btn.primary{
  background: linear-gradient(90deg,#4f6cff 0%, #667eea 100%);
  color:#fff;
}
.big-btn.ghost{
  background: linear-gradient(90deg,#eef2ff 0%, #dbe9ff 100%);
  color:#4f6cff;
}
.big-btn.gray{
  background: linear-gradient(90deg,#f5f5f5 0%, #e9e9e9 100%);
  color:#666;
}
.big-btn.danger{
  background: linear-gradient(90deg,#ff9f43 0%, #ff6b6b 100%);
  color:#fff;
}

/* status */
.statusbar{
  position:relative; z-index:1;
  margin-top: 16rpx;
  padding: 14rpx 16rpx;
  border-radius: 22rpx;
  background: rgba(0,0,0,0.04);
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap: 12rpx;
}
.status{ color:#2b3a66; font-size: 22rpx; font-weight: 900; }
.stat-mini{ color:#6b7cff; font-size: 22rpx; font-weight: 900; }

/* actions */
.actions{ margin-top:18rpx; display:flex; gap:14rpx; }
.btn{
  flex:1;
  padding:22rpx 0;
  text-align:center;
  border-radius:999rpx;
  font-size:28rpx;
  font-weight:900;
  box-shadow:0 12rpx 26rpx rgba(0,0,0,0.14);
}
.btn.disabled{ opacity: 0.55; pointer-events:none; box-shadow:none; }
.reset{ background: linear-gradient(90deg,#f5f5f5 0%,#e9e9e9 100%); color:#555; }
.next{ background: linear-gradient(90deg,#4f6cff 0%,#667eea 100%); color:#fff; }

/* popup */
.popup{
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.55);
  display:flex; align-items:center; justify-content:center;
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
.pop-actions{ display:flex; gap: 14rpx; }
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
  font-weight: 900;
  z-index: 120;
}
</style>
