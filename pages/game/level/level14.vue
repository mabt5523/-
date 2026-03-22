<template>
  <view class="page">
    <!-- 头部 -->
    <view class="header">
      <text class="title">第 14 关：动物分类 🐾</text>
      <text class="tip">任务：把动物拖到正确的地方（天上飞 / 地上跑 / 水里游）</text>
    </view>

    <!-- HUD -->
    <view class="hud">
      <text class="badge">✅ 已分类：{{ doneCount }}/{{ needCount }}</text>
      <text class="small">⏱ 用时：{{ formatTime(elapsedMs) }}</text>
    </view>

    <!-- 游戏区 -->
    <view class="board">
      <view class="board-bg" />

      <!-- 顶部提示条 -->
      <view class="hintbar">
        <text class="hinttext">拖动动物到对应区域：🪽天上飞｜🐾地上跑｜🐟水里游</text>
      </view>

      <!-- 动物区 -->
      <view class="animal-area" id="animal-area">
        <view
          v-for="it in animals"
          :key="it.key"
		  :id="'animal-' + it.key"
          class="animal"
          :class="{
            done: doneMap[it.key],
            dragging: draggingKey === it.key
          }"
          :style="draggingKey === it.key ? { left: it.fx + 'px', top: it.fy + 'px' } : {}"

          @touchstart="startDrag(it.key, $event)"
          @touchmove="onDrag(it.key, $event)"
          @touchend="endDrag(it.key)"
        >

          <text class="emoji">{{ it.emoji }}</text>
          <text class="label">{{ it.name }}</text>
        </view>
      </view>

      <!-- 分类区（垃圾桶轮廓风格） -->
      <view class="zones">
        <view class="zone sky" id="zone-sky">
          <text class="zone-title">🪽 天上飞</text>
          <text class="zone-sub">会飞的动物</text>
        </view>
        <view class="zone land" id="zone-land">
          <text class="zone-title">🐾 地上跑</text>
          <text class="zone-sub">在地上走/跑</text>
        </view>
        <view class="zone water" id="zone-water">
          <text class="zone-title">🐟 水里游</text>
          <text class="zone-sub">在水里游泳</text>
        </view>
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="actions">
      <view class="btn reset" @click="reset" :class="{ disabled: isMoving }">↩ 重新开始</view>
      <view class="btn next" :class="{ disabled: !success }" @click="goNext">下一关 →</view>
    </view>

    <!-- 成功弹窗 -->
    <view v-if="success" class="popup" @touchmove.stop.prevent>
      <view class="popup-card">
        <text class="pop-title">🎉 通关成功！</text>
        <text class="pop-desc">
          你学会了：分类就是把信息放进不同的“类别”里！
          <text class="linebreak" />
          本次用时：{{ formatTime(elapsedMs) }}，星星：{{ earnedStars }}⭐
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
      levelId: 14,

      // 后端进度
      levelProgress: { unlocked: true, stars: 0, bestSteps: null },
      reported: false,

      // 本关数据
      needCount: 6,
      animals: [],
      doneMap: {},

      // 拖拽
      draggingKey: null,
      offsetX: 0,
      offsetY: 0,

      // 计时
      elapsedMs: 0,
      clock: null,
      startAt: 0,

      // 统计
      wrongDrops: 0,
      earnedStars: 0,

      // UI
      toast: { show: false, text: '' },
      isMoving: false,

      // 题库（实例多一些）
      pool: [
        // 天上飞
        { key: 'bird', name: '小鸟', emoji: '🐦', type: 'sky' },
        { key: 'eagle', name: '老鹰', emoji: '🦅', type: 'sky' },
        { key: 'duck', name: '鸭子', emoji: '🦆', type: 'sky' }, // 会飞（也会游）
        { key: 'butterfly', name: '蝴蝶', emoji: '🦋', type: 'sky' },
        { key: 'bee', name: '蜜蜂', emoji: '🐝', type: 'sky' },
        { key: 'parrot', name: '鹦鹉', emoji: '🦜', type: 'sky' },

        // 地上跑
        { key: 'dog', name: '小狗', emoji: '🐶', type: 'land' },
        { key: 'cat', name: '小猫', emoji: '🐱', type: 'land' },
        { key: 'horse', name: '马', emoji: '🐴', type: 'land' },
        { key: 'tiger', name: '老虎', emoji: '🐯', type: 'land' },
        { key: 'rabbit', name: '兔子', emoji: '🐰', type: 'land' },
        { key: 'elephant', name: '大象', emoji: '🐘', type: 'land' },

        // 水里游
        { key: 'fish', name: '小鱼', emoji: '🐟', type: 'water' },
        { key: 'whale', name: '鲸鱼', emoji: '🐳', type: 'water' },
        { key: 'octopus', name: '章鱼', emoji: '🐙', type: 'water' },
        { key: 'crab', name: '螃蟹', emoji: '🦀', type: 'water' },
        { key: 'dolphin', name: '海豚', emoji: '🐬', type: 'water' },
        { key: 'turtle', name: '海龟', emoji: '🐢', type: 'water' }
      ]
    }
  },

  computed: {
    doneCount() {
      return Object.values(this.doneMap).filter(Boolean).length
    },
    success() {
      return this.needCount > 0 && this.doneCount >= this.needCount
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
      } catch (e) {
        // 拉不到也不阻塞
      }
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

    // ===== 星星规则（可自行改） =====
    calcStars({ usedMs, wrongDrops }) {
      const sec = usedMs / 1000
      // 3星：用时<=25秒 且 错误拖放<=1次
      if (sec <= 25 && wrongDrops <= 1) return 3
      // 2星：用时<=40秒
      if (sec <= 40) return 2
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
            wrongDrops: this.wrongDrops
          }
        })

        // 本地同步
        this.levelProgress.stars = Math.max(this.levelProgress.stars || 0, stars)
        if (this.levelProgress.bestSteps == null) this.levelProgress.bestSteps = steps
        else this.levelProgress.bestSteps = Math.min(this.levelProgress.bestSteps, steps)
      } catch (e) {
        // 忽略上报失败，不影响体验
      }
    },

    // ===== 工具：随机 =====
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

    // ===== 新一局：随机抽取 =====
    newRound() {
      // 每类至少来 2 个，避免全是某一类
      const sky = this.shuffle(this.pool.filter(x => x.type === 'sky')).slice(0, 2)
      const land = this.shuffle(this.pool.filter(x => x.type === 'land')).slice(0, 3)
      const water = this.shuffle(this.pool.filter(x => x.type === 'water')).slice(0, 3)

      let picked = this.shuffle([...sky, ...land, ...water])

      // needCount <= picked.length
      if (this.needCount > picked.length) this.needCount = picked.length
      picked = picked.slice(0, this.needCount)

      // 初始布局（px，稳定）
      const COLS = 4
      const START_X = 16
      const START_Y = 16
      const GAP_X = 88
      const GAP_Y = 92

      this.animals = picked.map((it, i) => ({
        ...it,
        x: START_X + (i % COLS) * GAP_X,
        y: START_Y + Math.floor(i / COLS) * GAP_Y
      }))

      this.doneMap = {}
      this.animals.forEach(it => (this.doneMap[it.key] = false))

      this.draggingKey = null
      this.offsetX = 0
      this.offsetY = 0
      this.wrongDrops = 0
      this.earnedStars = 0
      this.reported = false
      this.toast = { show: false, text: '' }

      // 重置计时
      this.stopClock()
      this.elapsedMs = 0
      this.startClock()

      uni.vibrateShort({ type: 'light' })
	  this.$nextTick(() => {
	    // 记录每个卡片的 DOM 位置，拖动开始时用来算 offset
	    const q = uni.createSelectorQuery().in(this)
	    this.animals.forEach(a => {
	      q.select(`#animal-${a.key}`).boundingClientRect(r => {
	        a._rect = r || { left: 0, top: 0 }
	      })
	    })
	    q.exec()
	  })

    },

    // ===== 拖拽 =====
    startDrag(key, e) {
      if (this.doneMap[key]) return
      const it = this.animals.find(x => x.key === key)
      if (!it || !e?.touches?.[0]) return
    
      this.draggingKey = key
    
      // 当前手指点在卡片内部的偏移
      const t = e.touches[0]
      const rect = it._rect || { left: 0, top: 0 }
      this.offsetX = t.clientX - rect.left
      this.offsetY = t.clientY - rect.top
    
      // 初始化 fixed 坐标
      it.fx = t.clientX - this.offsetX
      it.fy = t.clientY - this.offsetY
    },
    
    onDrag(key, e) {
      if (this.draggingKey !== key) return
      const it = this.animals.find(x => x.key === key)
      if (!it || !e?.touches?.[0]) return
    
      const t = e.touches[0]
      it.fx = t.clientX - this.offsetX
      it.fy = t.clientY - this.offsetY
    },
    
    async endDrag(key) {
      if (this.draggingKey !== key) return
      const it = this.animals.find(x => x.key === key)
      this.draggingKey = null
      if (!it) return
    
      const hitType = await this.checkHitFixed(it)
      if (!hitType) return
    
      if (hitType === it.type) {
        this.doneMap[it.key] = true
        uni.vibrateLong()
        this.toastMini('✅ 分对了！')
    
        if (this.doneCount >= this.needCount) {
          this.stopClock()
          this.earnedStars = this.calcStars({ usedMs: this.elapsedMs, wrongDrops: this.wrongDrops })
          await this.reportPass({
            steps: this.doneCount,
            usedMs: this.elapsedMs,
            stars: this.earnedStars
          })
        }
      } else {
        this.wrongDrops += 1
        uni.vibrateShort({ type: 'light' })
        this.toastMini('❌ 再想想：它应该去哪一类？')
      }
    },
    
    async checkHitFixed(it) {
      const zones = [
        { type: 'sky', selector: '#zone-sky' },
        { type: 'land', selector: '#zone-land' },
        { type: 'water', selector: '#zone-water' }
      ]
    
      // 卡片尺寸 72px（下面 CSS）
      const cx = (it.fx ?? 0) + 36
      const cy = (it.fy ?? 0) + 36
    
      for (const z of zones) {
        const rect = await this.getRectBySelector(z.selector)
        if (!rect) continue
        if (cx >= rect.left && cx <= rect.right && cy >= rect.top && cy <= rect.bottom) {
          return z.type
        }
      }
      return null
    },


    getRectBySelector(selector) {
      return new Promise(resolve => {
        const q = uni.createSelectorQuery().in(this)
        q.select(selector).boundingClientRect(res => resolve(res)).exec()
      })
    },

    // ===== UI =====
    toastMini(text) {
      this.toast.text = text
      this.toast.show = true
      clearTimeout(this._t)
      this._t = setTimeout(() => (this.toast.show = false), 900)
    },

    reset() {
      this.newRound()
    },

    goBack() {
      uni.navigateBack({ delta: 1 })
    },

    goNext() {
      if (!this.success) {
        uni.showToast({ title: '先把动物都分好类再去下一关～', icon: 'none' })
        return
      }
      uni.redirectTo({ url: '/pages/game/level/level15' })
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

/* hud */
.hud{
  display:flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14rpx;
  gap: 12rpx;
}
.badge{
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
.small{
  color:#eaf2ff;
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

  height: calc(100vh - 40rpx - 30rpx - 170rpx - 120rpx);
  display:flex;
  flex-direction: column;
  gap: 12rpx;
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
  margin-bottom: 14rpx;
  padding: 16rpx 18rpx;
  border-radius: 22rpx;
  background: rgba(79,108,255,0.08);
  border: 2rpx solid rgba(79,108,255,0.14);
}
.hinttext{
  color:#2b3a66;
  font-size: 24rpx;
  line-height: 1.6;
  font-weight: 700;
}

.animal-area{
  position: relative;
  z-index: 10;
  flex: 1;                 /* ✅ 占用剩余空间 */
  border-radius: 26rpx;
  background: rgba(79,108,255,0.06);
  border: 2rpx dashed rgba(79,108,255,0.18);
  padding: 10rpx;

  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10rpx;

  overflow: hidden;        /* ✅ 一屏内网格可以裁剪背景，但拖动用 fixed 不受影响 */
}


.animal{
  position: relative;      /* ✅ grid 内元素 */
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 18px;
  background: rgba(255,255,255,0.90);
  border: 2px solid rgba(0,0,0,0.06);
  box-shadow: 0 10rpx 24rpx rgba(0,0,0,0.08);
  display:flex;
  align-items:center;
  justify-content:center;
  flex-direction: column;
  gap: 2px;
}
.animal.done{ opacity: 0.40; }

/* ✅ 拖动时脱离布局，不会被挡、不受裁剪 */
.animal.dragging{
  position: fixed !important;
  width: 72px !important;
  height: 72px !important;
  z-index: 9999 !important;
  transform: scale(1.05);
}

.animal:active{ transform: scale(0.98); }

.emoji{ font-size: 34px; }
.label{ font-size: 12px; font-weight: 900; color:#2b3a66; }

.zones{
  position: relative;
  z-index: 1;
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: 1fr;
  gap: 10rpx;
}
.zone{
  min-height: 96rpx;   /* ✅ 压缩高度 */
  padding: 14rpx 14rpx;
  border-radius: 22rpx;
  border: 3rpx dashed rgba(0,0,0,0.22);
  box-shadow: 0 10rpx 24rpx rgba(0,0,0,0.08);
  overflow: hidden;
}


.zone::after{
  content:'';
  position:absolute;
  top: 16rpx;
  right: 16rpx;
  width: 120rpx;
  height: 22rpx;
  border-radius: 999rpx;
  border: 3rpx solid rgba(0,0,0,0.14);
  background: rgba(255,255,255,0.35);
}

.zone-title{
  display:block;
  font-size: 28rpx;
  font-weight: 900;
  color:#2b3a66;
}
.zone-sub{
  display:block;
  margin-top: 6rpx;
  font-size: 22rpx;
  font-weight: 700;
  opacity: 0.85;
  color:#2b3a66;
}

.sky{ background: rgba(116,185,255,0.18); }
.land{ background: rgba(85,239,196,0.18); }
.water{ background: rgba(162,155,254,0.18); }

/* actions */
.actions{
  margin-top: 18rpx;
  display:flex;
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
.reset{
  background: linear-gradient(90deg,#f5f5f5 0%,#e9e9e9 100%);
  color:#555;
}
.next{
  background: linear-gradient(90deg,#4f6cff 0%,#667eea 100%);
  color:#fff;
}
.btn.disabled{
  opacity: 0.55;
  pointer-events: none;
  box-shadow: none;
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
