<template>
  <view class="page">
    <!-- 头部 -->
    <view class="header">
      <text class="title">第 11 关：图片输出 🖼️</text>
      <text class="tip">任务：点按钮 → 屏幕显示图片（这就是输出）</text>
    </view>

    <!-- HUD -->
    <view class="hud">
      <text class="badge">🖼️ 已显示：{{ shownCount }}/{{ needShow }}</text>
      <text class="small">{{ success ? '完成啦！' : '提示：点“显示图片”按钮' }}</text>
    </view>

    <!-- 游戏区 -->
    <view class="board">
      <view class="board-bg" />

      <!-- 提示条 -->
      <view class="hintbar">
        <text class="hinttext">
          屏幕是输出设备：它会把电脑的结果“显示出来”。
        </text>
      </view>

      <!-- 随机任务卡 -->
      <view class="task-card">
        <text class="task-title">本次任务</text>
        <text class="task-text">
          找到并显示：<text class="task-bold">{{ currentTask.name }}</text>
        </text>
        <text class="task-sub">（点按钮后，图片会出现在“屏幕”里）</text>
      </view>

      <!-- “屏幕”输出区 -->
      <view class="screen">
        <view class="screen-top">
          <text class="screen-title">📺 屏幕（输出区）</text>
          <text class="screen-state">{{ screenOn ? 'ON' : 'OFF' }}</text>
        </view>

        <view class="screen-body">
          <view v-if="!screenOn" class="screen-empty">
            <text class="empty-emoji">🕶️</text>
            <text class="empty-text">屏幕还没输出图片</text>
          </view>

          <view v-else class="screen-output">
            <view class="img-box">
              <!-- 用 emoji 当作“图片输出”，不用额外资源也能跑 -->
              <text class="img-emoji">{{ shownPic.emoji }}</text>
            </view>
            <text class="img-label">{{ shownPic.name }}</text>
          </view>
        </view>
      </view>

      <!-- 选图按钮区（实例多 + 随机抽取任务） -->
      <view class="btn-grid">
        <view
          v-for="p in options"
          :key="p.key"
          class="opt-btn"
          :class="{ picked: picked[p.key], correct: picked[p.key] && p.key === currentTask.key }"
          @click="showPicture(p.key)"
        >
          <text class="opt-emoji">{{ p.emoji }}</text>
          <text class="opt-name">{{ p.name }}</text>
        </view>
      </view>

      <!-- 小结 -->
      <view class="summary">
        <text class="summary-text">
          你点按钮（输入）→ 程序选择图片 → 屏幕显示（输出）。
        </text>
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="actions">
      <view class="btn reset" @click="reset" :class="{ disabled: isBusy }">↩ 重新开始</view>
      <view class="btn next" @click="goNext" :class="{ disabled: !success }">下一关 →</view>
    </view>

    <!-- 成功弹窗 -->
    <view v-if="success" class="popup" @touchmove.stop.prevent>
      <view class="popup-card">
        <text class="pop-title">🎉 通关成功！</text>
        <text class="pop-desc">
          你学会了：屏幕是输出设备！
          <text class="linebreak" />
          当你按下按钮，程序把“图片”输出到屏幕上显示。
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
  data() {
    return {
      levelId: 11,

      // 后端进度
      levelProgress: { unlocked: true, stars: 0, bestSteps: null },
      reported: false,

      // 关卡目标：正确显示指定图片 N 次
      needShow: 3,
      shownCount: 0,

      // 是否正在忙（防连点）
      isBusy: false,

      // “屏幕”状态
      screenOn: false,
      shownPic: { key: '', name: '', emoji: '❓' },

      // 本局随机任务（从题库抽）
      currentTask: { key: '', name: '', emoji: '' },

      // 本局按钮选项（从池子抽：实例多）
      options: [],
      picked: {},

      // 是否通关
      success: false,

      // Toast
      toast: { show: false, text: '' },

      // 题库（可以一直加，越多越有趣）
      poolPics: [
        { key: 'cat', name: '小猫', emoji: '🐱' },
        { key: 'dog', name: '小狗', emoji: '🐶' },
        { key: 'car', name: '汽车', emoji: '🚗' },
        { key: 'bus', name: '公交车', emoji: '🚌' },
        { key: 'train', name: '火车', emoji: '🚆' },
        { key: 'plane', name: '飞机', emoji: '✈️' },
        { key: 'apple', name: '苹果', emoji: '🍎' },
        { key: 'banana', name: '香蕉', emoji: '🍌' },
        { key: 'cake', name: '蛋糕', emoji: '🍰' },
        { key: 'book', name: '书本', emoji: '📚' },
        { key: 'pencil', name: '铅笔', emoji: '✏️' },
        { key: 'clock', name: '时钟', emoji: '🕒' },
        { key: 'sun', name: '太阳', emoji: '☀️' },
        { key: 'cloud', name: '云朵', emoji: '☁️' },
        { key: 'rain', name: '下雨', emoji: '🌧️' },
        { key: 'flower', name: '花朵', emoji: '🌸' },
        { key: 'tree', name: '大树', emoji: '🌳' },
        { key: 'star', name: '星星', emoji: '⭐' },
        { key: 'ball', name: '皮球', emoji: '⚽' },
        { key: 'music', name: '音乐', emoji: '🎵' }
      ]
    }
  },

  onLoad() {
    this.loadLevelProgress()
    this.newRound()
  },

  methods: {
    // ================= 后端：拉取关卡进度 =================
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

    // ================= 后端：上报通关 =================
    calcStarsByTries(tries) {
      if (tries <= 4) return 3
      if (tries <= 7) return 2
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
            usedTimeSec: usedMs ? Math.round(usedMs / 1000) : 0
          }
        })

        this.levelProgress.stars = Math.max(this.levelProgress.stars || 0, stars)
        if (this.levelProgress.bestSteps == null) this.levelProgress.bestSteps = steps
        else this.levelProgress.bestSteps = Math.min(this.levelProgress.bestSteps, steps)
      } catch (e) {
        console.log('reportPass failed:', e)
      }
    },

    // ================= 随机工具 =================
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

    // ================= 开新一局 =================
    newRound() {
      const SHOW_COUNT = 9 // 一次显示多少个“图片按钮”
      this.options = this.sample(this.poolPics, SHOW_COUNT)

      // 任务：从本局 options 里随机挑一个
      this.currentTask = this.sample(this.options, 1)[0]

      this.picked = this.options.reduce((m, p) => (m[p.key] = false, m), {})
      this.shownCount = 0
      this.success = false
      this.reported = false

      this.screenOn = false
      this.shownPic = { key: '', name: '', emoji: '❓' }

      uni.vibrateShort({ type: 'light' })
    },

    // ================= 核心：显示图片（输出） =================
    async showPicture(key) {
      if (this.isBusy) return
      if (this.success) return

      const p = this.options.find(x => x.key === key)
      if (!p) return

      this.isBusy = true
      this.$set(this.picked, key, true)

      // 输出到屏幕
      this.screenOn = true
      this.shownPic = p
      uni.vibrateShort({ type: 'light' })

      if (key === this.currentTask.key) {
        this.shownCount += 1
        this.toastMini('✅ 对啦！屏幕输出了正确图片')

        // 够次数通关
        if (this.shownCount >= this.needShow) {
          this.success = true
          uni.vibrateLong()

          // 用 steps 记录“点击次数”（本局点过的按钮总数）
          const steps = Object.values(this.picked).filter(Boolean).length
          const stars = this.calcStarsByTries(steps)

          await this.reportPass({ steps, usedMs: 0, stars })
        } else {
          // 继续下一次：换一个任务（从 options 里随机）
          const nextTask = this.sample(this.options, 1)[0]
          this.currentTask = nextTask
          // 重置 picked（让孩子可以反复点）
          this.picked = this.options.reduce((m, it) => (m[it.key] = false, m), {})
        }
      } else {
        this.toastMini('❌ 不是这个哦：再想想要显示哪张图片')
      }

      setTimeout(() => { this.isBusy = false }, 180)
    },

    // ================= UI：Toast =================
    toastMini(text) {
      this.toast.text = text
      this.toast.show = true
      clearTimeout(this._t)
      this._t = setTimeout(() => (this.toast.show = false), 900)
    },

    // ================= 重置/跳转 =================
    reset() {
      if (this.isBusy) return
      this.newRound()
    },

    goBack() {
      uni.navigateBack({ delta: 1 })
    },

    goNext() {
      if (!this.success) {
        uni.showToast({ title: '先完成“屏幕输出图片”的任务再去下一关～', icon: 'none' })
        return
      }
      uni.redirectTo({ url: '/pages/game/level/level12' })
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
.hud{
  display:flex; justify-content: space-between; align-items:center;
  margin-bottom: 16rpx; gap: 12rpx;
}
.badge{
  display:inline-flex; align-items:center; gap:10rpx;
  padding:10rpx 18rpx; border-radius:999rpx;
  background: rgba(255,255,255,0.22);
  color:#fff; font-size:24rpx; font-weight:900;
}
.small{ color:#eaf2ff; font-size:22rpx; opacity:0.95; }

/* board */
.board{
  position: relative;
  background: rgba(255,255,255,0.95);
  border-radius: 32rpx;
  padding: 22rpx;
  box-shadow: 0 18rpx 50rpx rgba(0,0,0,0.18);
  overflow: hidden;
  border: 2rpx solid rgba(255,255,255,0.8);
  min-height: 820rpx;
}
.board-bg{
  position:absolute; inset:0;
  background:
    radial-gradient(circle at 20% 20%, rgba(255, 234, 0, 0.10), transparent 40%),
    radial-gradient(circle at 80% 25%, rgba(0, 200, 255, 0.10), transparent 45%),
    radial-gradient(circle at 50% 80%, rgba(255, 0, 150, 0.08), transparent 50%);
  z-index:0;
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
  color:#2b3a66;
  font-size: 24rpx;
  line-height: 1.6;
  font-weight: 900;
}

/* task */
.task-card{
  position: relative;
  z-index: 1;
  margin-bottom: 16rpx;
  padding: 18rpx 18rpx;
  border-radius: 26rpx;
  background: rgba(255,245,230,0.75);
  border: 2rpx dashed rgba(255,159,67,0.30);
}
.task-title{ display:block; font-size:26rpx; font-weight:900; color:#6b4a12; margin-bottom:8rpx; }
.task-text{ display:block; font-size:26rpx; font-weight:900; color:#2b3a66; }
.task-bold{ font-weight: 900; color:#ff6b6b; }
.task-sub{ display:block; margin-top:8rpx; font-size:22rpx; color:#6b4a12; font-weight:800; }

/* screen */
.screen{
  position: relative;
  z-index: 1;
  border-radius: 26rpx;
  padding: 16rpx;
  background: rgba(255,255,255,0.86);
  border: 2rpx solid rgba(0,0,0,0.06);
  box-shadow: 0 10rpx 24rpx rgba(0,0,0,0.06);
  margin-bottom: 16rpx;
}
.screen-top{
  display:flex;
  justify-content: space-between;
  align-items:center;
  margin-bottom: 12rpx;
}
.screen-title{ font-size:24rpx; font-weight:900; color:#2b3a66; }
.screen-state{
  font-size:22rpx;
  font-weight: 900;
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(46,204,113,0.14);
  color:#1e7f4a;
}

.screen-body{
  height: 260rpx;
  border-radius: 22rpx;
  background: rgba(0,0,0,0.03);
  display:flex;
  align-items:center;
  justify-content:center;
  overflow: hidden;
}
.screen-empty{
  display:flex;
  flex-direction: column;
  align-items:center;
  gap: 10rpx;
  color:#8a8a8a;
}
.empty-emoji{ font-size: 70rpx; }
.empty-text{ font-size: 24rpx; font-weight: 900; }

.screen-output{
  display:flex;
  flex-direction: column;
  align-items:center;
  justify-content:center;
  gap: 10rpx;
}
.img-box{
  width: 160rpx;
  height: 160rpx;
  border-radius: 28rpx;
  background: rgba(79,108,255,0.10);
  border: 2rpx dashed rgba(79,108,255,0.20);
  display:flex;
  align-items:center;
  justify-content:center;
}
.img-emoji{ font-size: 90rpx; }
.img-label{ font-size: 24rpx; font-weight: 900; color:#2b3a66; }

/* options grid */
.btn-grid{
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14rpx;
  padding: 14rpx;
  border-radius: 26rpx;
  background: rgba(79,108,255,0.06);
  border: 2rpx dashed rgba(79,108,255,0.18);
}
.opt-btn{
  border-radius: 22rpx;
  background: rgba(255,255,255,0.82);
  border: 2rpx solid rgba(0,0,0,0.06);
  box-shadow: 0 10rpx 24rpx rgba(0,0,0,0.08);
  aspect-ratio: 1 / 1;
  display:flex;
  align-items:center;
  justify-content:center;
  flex-direction: column;
  gap: 8rpx;
}
.opt-btn:active{ transform: scale(0.98); }
.opt-emoji{ font-size: 56rpx; }
.opt-name{ font-size: 22rpx; font-weight: 900; color:#2b3a66; }

/* 被点过 */
.opt-btn.picked{
  opacity: 0.92;
  border-color: rgba(79,108,255,0.25);
}

/* 选对后也不要变蓝：这里不做强色块，只轻微发光 */
.opt-btn.correct{
  box-shadow: 0 0 0 8rpx rgba(46, 204, 113, 0.10), 0 10rpx 24rpx rgba(0,0,0,0.08);
  border-color: rgba(46, 204, 113, 0.35);
}

/* summary */
.summary{
  position: relative;
  z-index: 1;
  margin-top: 16rpx;
  padding: 16rpx 18rpx;
  border-radius: 22rpx;
  background: rgba(79,108,255,0.08);
  border: 2rpx solid rgba(79,108,255,0.14);
}
.summary-text{
  color:#2b3a66;
  font-size: 24rpx;
  line-height: 1.6;
  font-weight: 900;
}

/* actions */
.actions{ margin-top: 18rpx; display:flex; gap: 14rpx; }
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
  pointer-events:none;
  box-shadow:none;
}
.reset{ background: linear-gradient(90deg,#f5f5f5 0%,#e9e9e9 100%); color:#555; }
.next{ background: linear-gradient(90deg,#4f6cff 0%,#667eea 100%); color:#fff; }

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
