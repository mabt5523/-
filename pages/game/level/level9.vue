<template>
  <view class="page">
    <!-- 头部 -->
    <view class="header">
      <text class="title">第 9 关：鼠标控制 🖱️</text>
      <text class="tip">任务：拖动物体进箱子（按住拖动）</text>
    </view>

    <!-- HUD -->
    <view class="hud">
      <text class="badge">📦 已放入：{{ doneCount }}/{{ needCount }}</text>
      <text class="small">提示：按住物体拖动，看到箱子高亮再放手</text>
    </view>

    <!-- 游戏区 -->
    <view class="stage" ref="stage">
      <view class="stage-bg" />

      <!-- 箱子 -->
      <view
        class="box"
        :class="{ hot: boxHot }"
        :style="{ left: box.x + 'px', top: box.y + 'px', width: box.w + 'px', height: box.h + 'px' }"
      >
        <text class="box-title">箱子</text>
        <text class="box-sub">把物体拖进来</text>
      </view>

      <!-- 物体 -->
      <view
        v-for="it in items"
        :key="it.id"
        class="thing"
        :class="{ in: it.inBox, dragging: draggingId === it.id }"
        :style="{ left: it.x + 'px', top: it.y + 'px' }"
        @touchstart.stop.prevent="onThingStart($event, it.id)"
        @touchmove.stop.prevent="onThingMove($event)"
        @touchend.stop.prevent="onThingEnd($event)"
      >
        <text class="emoji">{{ it.emoji }}</text>
        <text class="label">{{ it.name }}</text>
      </view>

      <!-- 假鼠标指针（跟随手指） -->
      <view
        v-if="cursor.show"
        class="cursor"
        :class="{ down: cursor.down }"
        :style="{ left: cursor.x + 'px', top: cursor.y + 'px' }"
      >
        <text class="cursor-emoji">🖱️</text>
      </view>

      <!-- 底部提示条 -->
      <view class="hintbar">
        <text class="hinttext">你在用“指针”控制物体移动：这就是鼠标/触控的工作方式！</text>
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="actions">
      <view class="btn reset" @click="reset" :class="{ disabled: isMoving }">↩ 重新开始</view>
      <view class="btn next" @click="goNext" :class="{ disabled: !success }">下一关 →</view>
    </view>

    <!-- 成功弹窗 -->
    <view v-if="success" class="popup" @touchmove.stop.prevent>
      <view class="popup-card">
        <text class="pop-title">🎉 通关成功！</text>
        <text class="pop-desc">
          你学会了：鼠标/指针可以控制屏幕上的物体移动！
          <text class="linebreak" />
          （在手机上用手指，在电脑上用鼠标）
        </text>

        <view class="pop-actions">
          <view class="pop-btn" @click="reset">再玩一次</view>
          <view class="pop-btn primary" @click="goNext">下一关 →</view>
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
      levelId: 9,

      // 后端进度
      levelProgress: { unlocked: true, stars: 0, bestSteps: null },
      reported: false,

      // 本关配置
      needCount: 4,

      // 场景尺寸
      stageRect: null,

      // 箱子区域（像素）
      box: { x: 0, y: 0, w: 0, h: 0 },
      boxHot: false,

      // 物体
      items: [],
      pool: [
        { name: '苹果', emoji: '🍎' },
        { name: '足球', emoji: '⚽' },
        { name: '书本', emoji: '📚' },
        { name: '铅笔', emoji: '✏️' },
        { name: '小猫', emoji: '🐱' },
        { name: '玩具熊', emoji: '🧸' },
        { name: '礼物', emoji: '🎁' },
        { name: '饼干', emoji: '🍪' },
        { name: '气球', emoji: '🎈' },
        { name: '花朵', emoji: '🌸' },
        { name: '小车', emoji: '🚗' },
        { name: '积木', emoji: '🧱' }
      ],

      // 拖拽状态
      draggingId: null,
      dragOffset: { dx: 0, dy: 0 },
      isMoving: false, // 用来禁按钮（可选）

      // 假鼠标指针
      cursor: { show: false, x: 0, y: 0, down: false },

      // 计时
      clock: null,
      startAt: 0,
      elapsedMs: 0,

      // 成功
      success: false
    }
  },

  computed: {
    doneCount() {
      return this.items.filter(x => x.inBox).length
    }
  },

  onLoad() {
    this.loadLevelProgress()
  },

  onReady() {
    this.initStage().then(() => this.newRound())
  },

  onUnload() {
    this.stopClock()
  },

  methods: {
    // ============ 后端：拉取进度 ============
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

    // ============ 后端：上报通关 ============
    calcStarsByTime(ms) {
      const sec = ms / 1000
      if (sec <= 10) return 3
      if (sec <= 18) return 2
      return 1
    },

    async reportPass({ steps, usedMs, stars }) {
      if (this.reported) return
      this.reported = true
      try {
        await request({
          url: `/api/game/levels/${this.levelId}/complete`,
          method: 'POST',
          data: { stars, steps, usedTimeMs: usedMs, usedTimeSec: Math.round(usedMs / 1000) }
        })

        this.levelProgress.stars = Math.max(this.levelProgress.stars || 0, stars)
        if (this.levelProgress.bestSteps == null) this.levelProgress.bestSteps = steps
        else this.levelProgress.bestSteps = Math.min(this.levelProgress.bestSteps, steps)
      } catch (e) {
        console.log('reportPass failed:', e)
      }
    },

    // ============ 计时 ============
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

    // ============ 场景初始化 ============
    initStage() {
      return new Promise(resolve => {
        const q = uni.createSelectorQuery().in(this)
        q.select('.stage').boundingClientRect(rect => {
          this.stageRect = rect
          // 箱子放右下角
          const pad = 14
          const bw = Math.max(140, rect.width * 0.36)
          const bh = Math.max(120, rect.height * 0.28)
          this.box = {
            w: bw,
            h: bh,
            x: rect.width - bw - pad,
            y: rect.height - bh - pad
          }
          resolve()
        }).exec()
      })
    },

    // ============ 随机出题 ============
    shuffle(arr) {
      const a = arr.slice()
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const t = a[i]; a[i] = a[j]; a[j] = t
      }
      return a
    },

    newRound() {
      if (!this.stageRect) return
      this.success = false
      this.reported = false
      this.boxHot = false
      this.draggingId = null
      this.cursor = { show: false, x: 0, y: 0, down: false }

      // 开始计时
      this.startClock()

      // 随机选 needCount 个物体
      const chosen = this.shuffle(this.pool).slice(0, this.needCount)

      // 物体初始位置：左侧区域随机散开，不重叠（简单版）
      const rect = this.stageRect
      const leftAreaW = rect.width * 0.55
      const topMin = 90
      const bottomMax = rect.height - 160
      const safeBottom = Math.max(topMin + 80, bottomMax)

      this.items = chosen.map((p, idx) => {
        const x = 16 + (idx % 2) * (leftAreaW / 2) + Math.random() * 30
        const y = topMin + Math.random() * (safeBottom - topMin)
        return {
          id: 'it_' + Date.now() + '_' + idx,
          name: p.name,
          emoji: p.emoji,
          x,
          y,
          inBox: false
        }
      })

      uni.vibrateShort({ type: 'light' })
    },

    // ============ 拖拽 ============
    getLocalPoint(touch) {
      // touch: e.touches[0] / e.changedTouches[0]
      const x = touch.clientX - this.stageRect.left
      const y = touch.clientY - this.stageRect.top
      return { x, y }
    },

    hitBox(px, py) {
      const b = this.box
      return px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h
    },

    onThingStart(e, id) {
      const it = this.items.find(x => x.id === id)
      if (!it || it.inBox) return

      // 首次操作：显示假鼠标
      this.cursor.show = true
      this.cursor.down = true

      const t = e.touches[0]
      const p = this.getLocalPoint(t)

      this.draggingId = id
      this.dragOffset.dx = p.x - it.x
      this.dragOffset.dy = p.y - it.y

      // 光标稍微偏移，模拟鼠标“尖尖”
      this.cursor.x = p.x + 10
      this.cursor.y = p.y + 10

      uni.vibrateShort({ type: 'light' })
    },

    onThingMove(e) {
      if (!this.draggingId) return
      const t = e.touches[0]
      const p = this.getLocalPoint(t)

      // 更新假鼠标位置
      this.cursor.x = p.x + 10
      this.cursor.y = p.y + 10

      // 更新物体位置（限制在舞台内）
      const idx = this.items.findIndex(x => x.id === this.draggingId)
      if (idx < 0) return
      const it = { ...this.items[idx] }

      let nx = p.x - this.dragOffset.dx
      let ny = p.y - this.dragOffset.dy

      // 边界限制
      nx = Math.max(8, Math.min(nx, this.stageRect.width - 90))
      ny = Math.max(70, Math.min(ny, this.stageRect.height - 120))

      it.x = nx
      it.y = ny
      this.items.splice(idx, 1, it)

      // 箱子高亮：用物体中心点判断
      const centerX = nx + 40
      const centerY = ny + 40
      this.boxHot = this.hitBox(centerX, centerY)
    },

    async onThingEnd(e) {
      if (!this.draggingId) {
        this.cursor.down = false
        return
      }
      const id = this.draggingId
      this.draggingId = null

      this.cursor.down = false

      const idx = this.items.findIndex(x => x.id === id)
      if (idx < 0) return
      const it = { ...this.items[idx] }

      // 判断是否放入箱子（用物体中心）
      const centerX = it.x + 40
      const centerY = it.y + 40

      if (this.hitBox(centerX, centerY)) {
        it.inBox = true

        // 吸附到箱子里一个随机位置
        const bx = this.box.x + 18 + Math.random() * Math.max(10, this.box.w - 110)
        const by = this.box.y + 48 + Math.random() * Math.max(10, this.box.h - 120)
        it.x = bx
        it.y = by

        this.items.splice(idx, 1, it)
        this.boxHot = false

        uni.vibrateLong()
        uni.showToast({ title: '✅ 放进箱子啦！', icon: 'none' })
      } else {
        this.boxHot = false
        uni.vibrateShort({ type: 'light' })
      }

      // 通关判断
      if (!this.success && this.doneCount >= this.needCount) {
        this.success = true
        this.stopClock()

        const usedMs = this.elapsedMs
        const stars = this.calcStarsByTime(usedMs)
        const steps = this.items.length // 这里用“物体数”当步数，你也可以改成拖拽次数

        await this.reportPass({ steps, usedMs, stars })
      }
    },

    // ============ 按钮 ============
    reset() {
      if (this.isMoving) return
      this.stopClock()
      this.newRound()
    },

    goBack() {
      uni.navigateBack({ delta: 1 })
    },

    goNext() {
      if (!this.success) {
        uni.showToast({ title: '先把物体都放进箱子再去下一关～', icon: 'none' })
        return
      }
      uni.redirectTo({ url: '/pages/game/level/level10' })
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
  display:flex; justify-content:space-between; align-items:center;
  margin-bottom: 16rpx; gap: 12rpx;
}
.badge{
  display:inline-flex; align-items:center; gap:10rpx;
  padding:10rpx 18rpx; border-radius:999rpx;
  background: rgba(255,255,255,0.22);
  color:#fff; font-size:24rpx; font-weight:900;
}
.small{ color:#eaf2ff; font-size:22rpx; opacity:0.95; }

/* stage */
.stage{
  position: relative;
  height: 760rpx;
  background: rgba(255,255,255,0.95);
  border-radius: 32rpx;
  padding: 18rpx;
  box-shadow: 0 18rpx 50rpx rgba(0,0,0,0.18);
  overflow: hidden;
  border: 2rpx solid rgba(255,255,255,0.8);
}
.stage-bg{
  position:absolute; inset:0;
  background:
    radial-gradient(circle at 20% 20%, rgba(255, 234, 0, 0.10), transparent 40%),
    radial-gradient(circle at 80% 25%, rgba(0, 200, 255, 0.10), transparent 45%),
    radial-gradient(circle at 50% 80%, rgba(255, 0, 150, 0.08), transparent 50%);
  z-index:0;
}

/* box */
.box{
  position:absolute;
  z-index:1;
  border-radius: 26rpx;
  background: rgba(255, 245, 230, 0.75);
  border: 2rpx dashed rgba(255,159,67,0.35);
  display:flex;
  flex-direction: column;
  align-items:center;
  justify-content:center;
  gap: 10rpx;
  box-shadow: 0 10rpx 24rpx rgba(0,0,0,0.08);
}
.box.hot{
  border-style: solid;
  border-color: rgba(46, 204, 113, 0.65);
  box-shadow: 0 0 0 10rpx rgba(46,204,113,0.12), 0 10rpx 24rpx rgba(0,0,0,0.08);
}
.box-title{ font-size: 30rpx; font-weight: 900; color:#6b4a12; }
.box-sub{ font-size: 22rpx; font-weight: 700; color:#8a6a3a; }

/* thing */
.thing{
  position:absolute;
  z-index:2;
  width: 170rpx;
  height: 170rpx;
  border-radius: 26rpx;
  background: rgba(255,255,255,0.86);
  border: 2rpx solid rgba(0,0,0,0.06);
  display:flex;
  flex-direction: column;
  align-items:center;
  justify-content:center;
  gap: 10rpx;
  box-shadow: 0 12rpx 26rpx rgba(0,0,0,0.10);
  transform: translateZ(0);
}
.thing.dragging{
  transform: scale(1.03);
  box-shadow: 0 18rpx 40rpx rgba(0,0,0,0.14);
}
.thing.in{
  opacity: 0.95;
  border-color: rgba(46, 204, 113, 0.55);
}
.emoji{ font-size: 56rpx; }
.label{ font-size: 24rpx; font-weight: 900; color:#2b3a66; }

/* fake cursor */
.cursor{
  position:absolute;
  z-index:3;
  transform: translate(-10%, -10%);
  pointer-events: none;
  opacity: 0.95;
  filter: drop-shadow(0 8rpx 16rpx rgba(0,0,0,0.20));
}
.cursor.down{ transform: translate(-10%, -10%) scale(0.96); opacity: 1; }
.cursor-emoji{ font-size: 48rpx; }

/* hint */
.hintbar{
  position:absolute;
  left: 18rpx;
  right: 18rpx;
  bottom: 18rpx;
  z-index:1;
  padding: 14rpx 16rpx;
  border-radius: 20rpx;
  background: rgba(79,108,255,0.08);
  border: 2rpx solid rgba(79,108,255,0.14);
}
.hinttext{
  color:#2b3a66;
  font-size: 24rpx;
  line-height: 1.6;
  font-weight: 700;
}

/* actions */
.actions{ margin-top: 18rpx; display:flex; gap: 14rpx; }
.btn{
  flex:1;
  padding: 22rpx 0;
  text-align:center;
  border-radius: 999rpx;
  font-size: 28rpx;
  font-weight: 900;
  box-shadow: 0 12rpx 26rpx rgba(0,0,0,0.14);
}
.btn.disabled{ opacity:0.55; pointer-events:none; box-shadow:none; }
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
</style>
