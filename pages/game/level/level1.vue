<template>
  <view class="page">
    <!-- 头部 -->
    <view class="header">
      <text class="title">第 1 关：找信息小侦探 🔍</text>
      <text class="tip">任务：找出“能告诉我们信息”的东西（点一点击）</text>
    </view>

    <!-- 进度条/得分 -->
    <view class="hud">
      <view class="hud-left">
        <text class="badge">⭐ 已找到：{{ score }}/{{ needScore }}</text>
      </view>
      <view class="hud-right">
        <text class="small">提示：信息就在生活里</text>
      </view>
    </view>

    <!-- 房间场景（点击物品） -->
    <view class="room">
      <view class="wallpaper" />

      <!-- 物品区（随机摆放） -->
      <view class="items">
        <view
          v-for="it in items"
          :key="it.key"
          class="item"
          :class="[
            it.isInfo ? 'info' : '',
            picked[it.key] ? 'done' : ''
          ]"
          @click="pick(it.key)"
        >
          <text class="emoji">{{ it.emoji }}</text>
          <text class="label">{{ it.name }}</text>

        </view>
      </view>

      <!-- 底部提示条 -->
      <view class="hintbar">
        <text class="hinttext">小提示：能“告诉我们事情”的，就是信息哦～</text>
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="actions">
      <view class="btn reset" @click="reset">↩ 重新开始</view>
      <view class="btn next" :class="{ disabled: !success }" @click="goNext">
        下一关 →
      </view>
    </view>

    <!-- 成功弹窗 -->
    <view v-if="success" class="popup" @touchmove.stop.prevent>
      <view class="popup-card">
        <text class="pop-title">🎉 通关成功！</text>
        <text class="pop-desc">
          你发现了：信息就在我们身边！
          <text class="linebreak" />
          （时钟/红绿灯/天气/书本 都在告诉你事情）
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
  async onLoad() {
    await this.loadLevelProgress()
    this.newRound()
  },

  data() {
    return {
      levelId: 1,

      needScore: 4,
      score: 0,
      success: false,

      // ✅ 当前局展示的物品（会随机生成）
      items: [],

      // ✅ 点过标记（动态生成）
      picked: {},

      // ✅ 关卡进度（后端返回）
      levelProgress: { unlocked: true, stars: 0, bestSteps: null },

      // 防止重复上报
      reported: false,

      // ✅ 物品池：你可以继续加
      pool: [
        { key: 'clock',    name: '时钟',   emoji: '🕒', canBeInfo: true },
        { key: 'traffic',  name: '红绿灯', emoji: '🚦', canBeInfo: true },
        { key: 'weather',  name: '天气',   emoji: '🌤', canBeInfo: true },
        { key: 'book',     name: '书本',   emoji: '📚', canBeInfo: true },
        { key: 'calendar', name: '日历',   emoji: '📅', canBeInfo: true },
        { key: 'map',      name: '地图',   emoji: '🗺️', canBeInfo: true },
        { key: 'sign',     name: '路牌',   emoji: '🪧', canBeInfo: true },
        { key: 'news',     name: '新闻',   emoji: '📰', canBeInfo: true },

        { key: 'teddy',    name: '玩具熊', emoji: '🧸', canBeInfo: false },
        { key: 'apple',    name: '苹果',   emoji: '🍎', canBeInfo: false },
        { key: 'ball',     name: '皮球',   emoji: '⚽', canBeInfo: false },
        { key: 'cake',     name: '蛋糕',   emoji: '🍰', canBeInfo: false },
        { key: 'cat',      name: '小猫',   emoji: '🐱', canBeInfo: false },
        { key: 'flower',   name: '花朵',   emoji: '🌸', canBeInfo: false }
      ]
    }
  },

  methods: {
    // ============ 进入关卡：拉取单关进度 ============
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
          setTimeout(() => uni.redirectTo({ url: '/pages/game/level-select' }), 500)
        }
      } catch (e) {
        console.log('loadLevelProgress failed:', e)
        // 拉不到也不阻塞体验：默认可玩
      }
    },

    // ============ 通关星级规则（你可调整） ============
    // 第1关建议：完成就给3星（低门槛）
    calcStars({ clicks }) {
      // 也可以按误点惩罚：
      // if (clicks <= this.needScore) return 3
      // if (clicks <= this.needScore + 2) return 2
      // return 1
      return 3
    },

    // ============ 通关上报 ============
    async reportPass({ steps, stars }) {
      if (this.reported) return
      this.reported = true

      try {
        await request({
          url: `/api/game/levels/${this.levelId}/complete`,
          method: 'POST',
          data: {
            stars,
            steps,
            usedTimeMs: 0,
            usedTimeSec: 0
          }
        })

        // 本地同步（可选）
        this.levelProgress.stars = Math.max(this.levelProgress.stars || 0, stars)
        if (this.levelProgress.bestSteps == null) this.levelProgress.bestSteps = steps
        else this.levelProgress.bestSteps = Math.min(this.levelProgress.bestSteps, steps)
      } catch (e) {
        console.log('reportPass failed:', e)
      }
    },

    // ============ 工具：洗牌/抽样 ============
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

    // ============ 开新一局 ============
    newRound() {
      const SHOW_COUNT = 9 // ✅ 一局展示多少个物品

      const infoPool = this.pool.filter(x => x.canBeInfo)
      const correct = this.sample(infoPool, this.needScore).map(x => ({ ...x, isInfo: true }))

      const wrongPool = this.pool.filter(x => !x.canBeInfo)
      const wrongCount = Math.max(0, SHOW_COUNT - this.needScore)
      const wrong = this.sample(wrongPool, wrongCount).map(x => ({ ...x, isInfo: false }))

      this.items = this.shuffle([...correct, ...wrong])

      this.score = 0
      this.success = false
      this.reported = false // ✅ 每局允许再上报一次
      this.picked = this.items.reduce((m, it) => (m[it.key] = false, m), {})
    },

    // ============ 点击物品 ============
    async pick(key) {
      if (this.picked[key]) {
        uni.vibrateShort({ type: 'light' })
        uni.showToast({ title: '你已经点过它啦～', icon: 'none' })
        return
      }

      this.$set(this.picked, key, true)
      uni.vibrateShort({ type: 'light' })

      const it = this.items.find(x => x.key === key)
      const isInfo = !!it?.isInfo

      // 这里把“总点击次数”当 steps（更贴合低年级：点了几次）
      const clicks = Object.values(this.picked).filter(Boolean).length

      if (isInfo) {
        this.score += 1
        uni.showToast({ title: '✅ 对！它能告诉我们信息', icon: 'none' })
      } else {
        uni.showToast({ title: '❌ 这个不太像“信息”哦', icon: 'none' })
      }

      // ✅ 第一次达成通关：弹窗 + 上报
      if (!this.success && this.score >= this.needScore) {
        this.success = true
        uni.vibrateLong()

        const stars = this.calcStars({ clicks })
        await this.reportPass({ steps: clicks, stars })
      }
    },

    reset() {
      this.newRound()
      uni.vibrateShort({ type: 'light' })
    },

    goBack() {
      uni.navigateBack({ delta: 1 })
    },

    goNext() {
      if (!this.success) {
        uni.showToast({ title: '先找到 4 个“信息物品”再去下一关～', icon: 'none' })
        return
      }
      uni.redirectTo({ url: '/pages/game/level/level2' })
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
.title{
  font-size: 40rpx;
  font-weight: 900;
}
.tip{
  display:block;
  margin-top: 10rpx;
  font-size: 24rpx;
  opacity: 0.95;
}

/* hud */
.hud{
  display:flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
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

/* room */
.room{
  position: relative;
  background: rgba(255,255,255,0.95);
  border-radius: 32rpx;
  padding: 22rpx;
  box-shadow: 0 18rpx 50rpx rgba(0,0,0,0.18);
  overflow: hidden;
  border: 2rpx solid rgba(255,255,255,0.8);
  min-height: 820rpx;
}
.wallpaper{
  position:absolute;
  inset:0;
  background:
    radial-gradient(circle at 20% 20%, rgba(255, 234, 0, 0.12), transparent 40%),
    radial-gradient(circle at 80% 25%, rgba(0, 200, 255, 0.12), transparent 45%),
    radial-gradient(circle at 50% 80%, rgba(255, 0, 150, 0.10), transparent 50%);
  z-index:0;
}

.items{
  position: relative;
  z-index: 1;

  display: grid;
  grid-template-columns: repeat(3, 1fr); /* ✅ 每行4个 */
  gap: 16rpx;

  padding: 16rpx;
  border-radius: 26rpx;
  background: rgba(79,108,255,0.06);
  border: 2rpx dashed rgba(79,108,255,0.18);
}

.item{
  position: relative;

  /* ✅ 每个格子都一样大：正方形 */
  aspect-ratio: 1 / 1;

  border-radius: 22rpx;
  background: rgba(255,255,255,0.82);
  border: 2rpx solid rgba(0,0,0,0.06);

  display:flex;
  align-items:center;
  justify-content:center;
  flex-direction: column;

  gap: 8rpx;
  box-shadow: 0 10rpx 24rpx rgba(0,0,0,0.08);
}




.item:active{
  transform: scale(0.98);
}
.emoji{
  font-size: 60rpx;
}
.label{
  font-size: 24rpx;
  font-weight: 900;
  color:#2b3a66;
}
.tag{
  position: absolute;
  right: 12rpx;
  top: 10rpx;
  font-size: 28rpx;
}
.tag.wrong{ opacity: 0.9; }

.item.done{
  opacity: 0.92;
  border-color: rgba(79,108,255,0.25);
}
.item.info.done{
  box-shadow: 0 0 0 8rpx rgba(79,108,255,0.08), 0 10rpx 24rpx rgba(0,0,0,0.08);
}

/* hint */
.hintbar{
  position: relative;
  z-index: 1;
  margin-top: 18rpx;
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
.next.disabled{
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
</style>
