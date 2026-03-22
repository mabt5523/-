<template>
  <view class="page">


    <!-- 右上角按钮 -->
    <view class="top-right-actions">
      <view class="top-btn" @click="openRecordPopup">抽奖记录</view>
      <view class="top-btn" @click="openGalleryPopup">图鉴</view>
    </view>

    <!-- 背景 -->
    <view class="bg-decoration">
      <view
        class="star"
        v-for="i in 40"
        :key="i"
        :style="{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 5}s`
        }"
      ></view>
    </view>

    <!-- 标题 -->
    <view class="hero">
      <text class="title">幸运盲盒</text>
      <text class="sub-title">攒星星，抽芝麻糖伙伴！</text>
    </view>

    <!-- 信息卡 -->
    <view class="card info-card">
      <view class="info-row">
        <text class="info-label">我的星星</text>
        <text class="info-value">{{ totalStars }}</text>
      </view>
      <view class="info-row">
        <text class="info-label">每次星星抽奖消耗</text>
        <text class="info-value">{{ STAR_COST }} 颗</text>
      </view>
      <view class="info-row">
        <text class="info-label">按星星累计可抽</text>
        <text class="info-value">{{ totalStarDrawCount }} 次</text>
      </view>
      <view class="info-row">
        <text class="info-label">已经用星星抽了</text>
        <text class="info-value">{{ usedStarDrawCount }} 次</text>
      </view>
      <view class="info-row">
        <text class="info-label">当前还可用星星抽</text>
        <text class="info-value highlight">{{ starDrawAvailable }} 次</text>
      </view>
      <view class="info-row">
        <text class="info-label">今日免费抽奖</text>
        <text class="info-value">{{ dailyAvailable ? '可抽 1 次' : '今日已抽过' }}</text>
      </view>
    </view>

    <!-- 盲盒动画区 -->
    <view class="card machine-card">
      <view class="box-stage">
        <image
          v-if="isAnimating"
          class="box-image"
          :src="currentBoxFrame"
          mode="aspectFit"
        />
        <image
          v-else-if="currentPrizeImage"
          class="box-image"
          :src="currentPrizeImage"
          mode="aspectFit"
        />
        <view v-else class="placeholder">
          <text class="placeholder-text">点击下方按钮开始抽盲盒</text>
        </view>
      </view>

      <view class="draw-buttons">
        <button
          class="draw-btn daily-btn"
          :disabled="isAnimating || !dailyAvailable"
          @click="drawBlindBox('daily')"
        >
          {{ dailyAvailable ? '🎁 每日免费抽一次' : '今日免费已用完' }}
        </button>

        <button
          class="draw-btn star-btn"
          :disabled="isAnimating || starDrawAvailable <= 0"
          @click="drawBlindBox('star')"
        >
          {{ starDrawAvailable > 0 ? `⭐ 星星抽奖（剩余 ${starDrawAvailable} 次）` : '星星抽奖次数不足' }}
        </button>
      </view>
    </view>

    <!-- 本次结果 -->
    <view v-if="lastResult" class="card result-card">
      <view class="result-title">本次获得</view>
      <image class="result-image" :src="lastResult.image" mode="aspectFit" />
      <view class="result-name">{{ lastResult.name }}</view>
      <view class="result-tag" :class="lastResult.tagClass">{{ lastResult.tag }}</view>
    </view>

    <!-- 图鉴弹窗 -->
    <view v-if="showGalleryModal" class="modal-mask" @click="closeGalleryPopup">
      <view class="modal-card gallery-modal" @click.stop>
        <view class="modal-head">
          <text class="modal-title">芝麻糖图鉴</text>
          <text class="modal-close" @click="closeGalleryPopup">✕</text>
        </view>

        <view class="gallery-single">
          <view class="gallery-arrow left" @click="prevGallery">‹</view>

          <view class="gallery-center">
            <view class="gallery-image-wrap">
              <image
                class="gallery-big-image"
                :src="currentGalleryItem.image"
                mode="aspectFit"
              />
              <view
                v-if="!obtainedPrizeIds.has(currentGalleryItem.id)"
                class="gallery-mask"
              >
                <text class="gallery-mask-text">未获得</text>
              </view>
            </view>

            <text
              class="gallery-big-name"
              :class="{ lockedText: !obtainedPrizeIds.has(currentGalleryItem.id) }"
            >
              {{ currentGalleryItem.name }}
            </text>

            <text
              class="gallery-big-tag"
              :class="[currentGalleryItem.tagClass, { lockedText: !obtainedPrizeIds.has(currentGalleryItem.id) }]"
            >
              {{ currentGalleryItem.tag }}
            </text>

            <text class="gallery-page">
              {{ galleryIndex + 1 }} / {{ prizeConfig.length }}
            </text>
          </view>

          <view class="gallery-arrow right" @click="nextGallery">›</view>
        </view>
      </view>
    </view>

    <!-- 记录弹窗 -->
    <view v-if="showRecordModal" class="modal-mask" @click="closeRecordPopup">
      <view class="modal-card record-modal" @click.stop>
        <view class="modal-head">
          <text class="modal-title">抽奖记录</text>
          <text class="modal-close" @click="closeRecordPopup">✕</text>
        </view>

        <view class="record-summary">
          <text>总记录：{{ records.length }} 条</text>
        </view>

        <scroll-view scroll-y class="record-scroll">
          <view v-if="records.length === 0" class="empty-history">
            还没有抽奖记录哦
          </view>

          <view v-else>
            <view class="history-item" v-for="item in records" :key="item.id">
              <image class="history-image" :src="item.image" mode="aspectFit" />
              <view class="history-main">
                <text class="history-name">{{ item.name }}</text>
                <text class="history-meta">
                  {{ item.drawType === 'daily' ? '每日免费' : '星星抽奖' }}
                </text>
                <text class="history-meta">{{ item.drawTime }}</text>
              </view>
              <text class="history-tag" :class="item.tagClass">{{ item.tag }}</text>
            </view>
          </view>
        </scroll-view>

        <view class="record-footer">
          <view class="clear-btn" @click="clearHistory">清空记录</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import request from '@/common/request.js'

const STORAGE_KEY = 'blind_box_state_v2'
const STAR_COST = 10
const BOX_FRAME_COUNT = 51
const FRAME_FPS = 12

export default {
  data() {
    return {
      STAR_COST,

      totalStars: 0,

      isAnimating: false,
      currentBoxFrame: '',
      currentPrizeImage: '',
      currentFrameIndex: 1,
      animationTimer: null,

      lastResult: null,

      records: [],
      usedStarDrawCount: 0,
      lastDailyDrawDate: '',

      showGalleryModal: false,
      showRecordModal: false,
      galleryIndex: 0,

      prizeConfig: [
        { id: 1, name: '芝麻糖·奶香云朵', image: '/static/1.png', tag: '普通', tagClass: 'normal' },
        { id: 2, name: '芝麻糖·桂花月光', image: '/static/2.png', tag: '普通', tagClass: 'normal' },
        { id: 3, name: '芝麻糖·花生脆脆', image: '/static/3.png', tag: '普通', tagClass: 'normal' },
        { id: 4, name: '芝麻糖·蜜桃软软', image: '/static/4.png', tag: '普通', tagClass: 'normal' },
        { id: 5, name: '芝麻糖·可可暖暖', image: '/static/5.png', tag: '普通', tagClass: 'normal' },
        { id: 6, name: '芝麻糖·麦芽晴晴', image: '/static/6.png', tag: '普通', tagClass: 'normal' },
        { id: 7, name: '芝麻糖·琥珀星愿', image: '/static/7.png', tag: '小隐藏', tagClass: 'rare' },
        { id: 8, name: '芝麻糖·鎏金天选', image: '/static/8.png', tag: '大隐藏', tagClass: 'super-rare' }
      ]
    }
  },

  computed: {
    totalStarDrawCount() {
      return Math.floor(this.totalStars / this.STAR_COST)
    },

    starDrawAvailable() {
      return Math.max(0, this.totalStarDrawCount - this.usedStarDrawCount)
    },

    dailyAvailable() {
      return this.lastDailyDrawDate !== this.todayStr()
    },

    currentGalleryItem() {
      return this.prizeConfig[this.galleryIndex] || this.prizeConfig[0]
    },

    obtainedPrizeIds() {
      const set = new Set()
      this.records.forEach(item => {
        if (item && item.prizeId != null) {
          set.add(Number(item.prizeId))
        }
      })
      return set
    }
  },

  onLoad() {
    this.currentBoxFrame = this.getBoxFramePath(1)
    this.loadLocalState()
    this.loadHomeProgress()
  },

  onShow() {
    this.loadLocalState()
    this.loadHomeProgress()
  },

  onUnload() {
    this.clearAnimationTimer()
  },

  methods: {
    goBack() {
      uni.navigateBack({
        fail: () => {
          uni.reLaunch({ url: '/pages/game/game-home' })
        }
      })
    },

    loadHomeProgress() {
      request({
        url: '/api/game/home',
        method: 'GET',
        data: { total: 60 }
      }).then(res => {
        this.totalStars = Number(res.totalStars ?? 0)
      }).catch(() => {
        uni.showToast({
          title: '加载星星失败',
          icon: 'none'
        })
      })
    },

    loadLocalState() {
      const state = uni.getStorageSync(STORAGE_KEY)
      if (state && typeof state === 'object') {
        this.records = Array.isArray(state.records) ? state.records : []
        this.usedStarDrawCount = Number(state.usedStarDrawCount || 0)
        this.lastDailyDrawDate = state.lastDailyDrawDate || ''
      } else {
        this.records = []
        this.usedStarDrawCount = 0
        this.lastDailyDrawDate = ''
      }
    },

    saveLocalState() {
      uni.setStorageSync(STORAGE_KEY, {
        records: this.records,
        usedStarDrawCount: this.usedStarDrawCount,
        lastDailyDrawDate: this.lastDailyDrawDate
      })
    },

    todayStr() {
      const d = new Date()
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    },

    nowTimeStr() {
      const d = new Date()
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const hh = String(d.getHours()).padStart(2, '0')
      const mm = String(d.getMinutes()).padStart(2, '0')
      const ss = String(d.getSeconds()).padStart(2, '0')
      return `${y}-${m}-${day} ${hh}:${mm}:${ss}`
    },

    getBoxFramePath(index) {
      const num = String(index).padStart(3, '0')
      return `/static/box/ezgif-frame-${num}.png`
    },

    clearAnimationTimer() {
      if (this.animationTimer) {
        clearInterval(this.animationTimer)
        this.animationTimer = null
      }
    },

    openGalleryPopup() {
      this.showGalleryModal = true
    },

    closeGalleryPopup() {
      this.showGalleryModal = false
    },

    openRecordPopup() {
      this.loadLocalState()
      this.showRecordModal = true
    },

    closeRecordPopup() {
      this.showRecordModal = false
    },

    prevGallery() {
      if (this.galleryIndex <= 0) {
        this.galleryIndex = this.prizeConfig.length - 1
      } else {
        this.galleryIndex--
      }
    },

    nextGallery() {
      if (this.galleryIndex >= this.prizeConfig.length - 1) {
        this.galleryIndex = 0
      } else {
        this.galleryIndex++
      }
    },

    pickPrize() {
      const weights = [
        { id: 1, weight: 100 },
        { id: 2, weight: 100 },
        { id: 3, weight: 100 },
        { id: 4, weight: 100 },
        { id: 5, weight: 100 },
        { id: 6, weight: 100 },
        { id: 7, weight: 10 },
        { id: 8, weight: 1 }
      ]

      const totalWeight = weights.reduce((sum, item) => sum + item.weight, 0)
      let random = Math.random() * totalWeight

      for (let i = 0; i < weights.length; i++) {
        random -= weights[i].weight
        if (random < 0) {
          return this.prizeConfig.find(p => p.id === weights[i].id)
        }
      }

      return this.prizeConfig[0]
    },

    canDraw(type) {
      if (this.isAnimating) return false
      if (type === 'daily') return this.dailyAvailable
      if (type === 'star') return this.starDrawAvailable > 0
      return false
    },

    consumeChance(type) {
      if (type === 'daily') {
        this.lastDailyDrawDate = this.todayStr()
      } else if (type === 'star') {
        this.usedStarDrawCount += 1
      }
      this.saveLocalState()
    },

    drawBlindBox(type) {
      if (!this.canDraw(type)) {
        uni.showToast({
          title: type === 'daily' ? '今天已经抽过啦' : '星星抽奖次数不足',
          icon: 'none'
        })
        return
      }

      const prize = this.pickPrize()
      this.consumeChance(type)
      this.lastResult = null
      this.currentPrizeImage = ''
      this.playBoxAnimation(prize, type)
    },

    playBoxAnimation(prize, drawType) {
      this.isAnimating = true
      this.currentFrameIndex = 1
      this.currentBoxFrame = this.getBoxFramePath(1)

      let ticks = 0
      const interval = Math.round(1000 / FRAME_FPS)

      this.clearAnimationTimer()

      this.animationTimer = setInterval(() => {
        ticks++
        const frame = Math.min(ticks, BOX_FRAME_COUNT)
        this.currentFrameIndex = frame
        this.currentBoxFrame = this.getBoxFramePath(frame)

        if (ticks >= BOX_FRAME_COUNT) {
          this.clearAnimationTimer()
          this.isAnimating = false
          this.revealPrize(prize, drawType)
        }
      }, interval)
    },

    revealPrize(prize, drawType) {
      this.currentPrizeImage = prize.image
      this.lastResult = { ...prize }

      const record = {
        id: `${Date.now()}_${Math.floor(Math.random() * 100000)}`,
        prizeId: prize.id,
        name: prize.name,
        image: prize.image,
        tag: prize.tag,
        tagClass: prize.tagClass,
        drawType,
        drawTime: this.nowTimeStr()
      }

      this.records.unshift(record)
      this.saveLocalState()

      uni.showModal({
        title: '抽奖结果',
        content: `恭喜你获得：${prize.name}`,
        showCancel: false
      })
    },

    clearHistory() {
      uni.showModal({
        title: '提示',
        content: '确定清空所有本地抽奖记录吗？',
        success: (res) => {
          if (!res.confirm) return
          this.records = []
          this.saveLocalState()
          uni.showToast({
            title: '记录已清空',
            icon: 'none'
          })
        }
      })
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #89f7fe 100%);
  padding: 24rpx 24rpx 40rpx;
  box-sizing: border-box;
  position: relative;
  overflow: hidden;
}

.back-btn {
  position: fixed;
  left: 20rpx;
  top: 20rpx;
  width: 60rpx;
  height: 60rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  font-weight: bold;
  backdrop-filter: blur(10rpx);
  color: #fff;
  z-index: 100;
}

.top-right-actions {
  position: fixed;
  right: 20rpx;
  top: 20rpx;
  display: flex;
  gap: 16rpx;
  z-index: 100;
}

.top-btn {
  padding: 14rpx 24rpx;
  border-radius: 999rpx;
  background: rgba(255,255,255,0.22);
  color: #fff;
  font-size: 24rpx;
  backdrop-filter: blur(10rpx);
  box-shadow: 0 6rpx 16rpx rgba(0,0,0,0.12);
}

.bg-decoration {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.star {
  position: absolute;
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
  background: rgba(255,255,255,0.9);
  box-shadow: 0 0 12rpx rgba(255,255,255,0.8);
  animation: twinkle 3s infinite ease-in-out;
}

@keyframes twinkle {
  0%, 100% { opacity: 0.2; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}

.hero {
  margin-top: 100rpx;
  text-align: center;
  color: #fff;
  position: relative;
  z-index: 1;
}

.title {
  display: block;
  font-size: 56rpx;
  font-weight: 800;
  text-shadow: 0 4rpx 8rpx rgba(0,0,0,0.2);
}

.sub-title {
  display: block;
  margin-top: 10rpx;
  font-size: 28rpx;
  opacity: 0.95;
}

.card {
  position: relative;
  z-index: 1;
  background: rgba(255,255,255,0.95);
  border-radius: 28rpx;
  padding: 28rpx;
  margin-top: 28rpx;
  box-shadow: 0 18rpx 48rpx rgba(0,0,0,0.12);
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18rpx;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-label {
  font-size: 28rpx;
  color: #555;
}

.info-value {
  font-size: 30rpx;
  font-weight: bold;
  color: #5a67d8;
}

.highlight {
  color: #ff6b6b;
}

.machine-title,
.modal-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #333;
}

.box-stage {
  margin-top: 24rpx;
  width: 100%;
  height: 420rpx;
  border-radius: 24rpx;
  background: linear-gradient(180deg, #f8fbff, #eef4ff);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.box-image {
  width: 320rpx;
  height: 320rpx;
}

.placeholder-text {
  color: #888;
  font-size: 26rpx;
}

.draw-buttons {
  margin-top: 24rpx;
}

.draw-btn {
  width: 100%;
  border: none;
  border-radius: 999rpx;
  padding: 24rpx 0;
  font-size: 28rpx;
  font-weight: 700;
  margin-bottom: 20rpx;
  color: #fff;
}

.draw-btn[disabled] {
  opacity: 0.55;
}

.daily-btn {
  background: linear-gradient(90deg, #36d1dc, #5b86e5);
}

.star-btn {
  background: linear-gradient(90deg, #ff9f43, #ff6b6b);
}

.result-card {
  text-align: center;
}

.result-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #444;
}

.result-image {
  width: 260rpx;
  height: 260rpx;
  margin: 18rpx auto;
  display: block;
}

.result-name {
  font-size: 34rpx;
  font-weight: 800;
  color: #222;
}

.result-tag {
  display: inline-block;
  margin-top: 14rpx;
  padding: 8rpx 20rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  color: #fff;
}

.normal {
  background: #7c8aa5;
}

.rare {
  background: linear-gradient(90deg, #8e44ad, #c471ed);
}

.super-rare {
  background: linear-gradient(90deg, #ffb347, #ff416c);
}

.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.modal-card {
  width: 86%;
  background: #fff;
  border-radius: 28rpx;
  padding: 24rpx;
  box-sizing: border-box;
}

.modal-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.modal-close {
  font-size: 32rpx;
  color: #666;
}

.gallery-modal {
  min-height: 700rpx;
}

.gallery-single {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 560rpx;
}

.gallery-arrow {
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  background: #eef3ff;
  color: #5a67d8;
  font-size: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gallery-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.gallery-image-wrap {
  position: relative;
  width: 320rpx;
  height: 320rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gallery-big-image {
  width: 320rpx;
  height: 320rpx;
}

.gallery-mask {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gallery-mask-text {
  font-size: 28rpx;
  color: #888;
  font-weight: 600;
}

.gallery-big-name {
  margin-top: 20rpx;
  font-size: 34rpx;
  color: #333;
  font-weight: 700;
  text-align: center;
}

.gallery-big-tag {
  margin-top: 14rpx;
  padding: 8rpx 20rpx;
  border-radius: 999rpx;
  color: #fff;
  font-size: 24rpx;
}

.gallery-page {
  margin-top: 20rpx;
  font-size: 24rpx;
  color: #888;
}

.lockedText {
  opacity: 0.5;
}

.record-modal {
  height: 76vh;
  display: flex;
  flex-direction: column;
}

.record-summary {
  font-size: 24rpx;
  color: #666;
  margin-bottom: 16rpx;
}

.record-scroll {
  flex: 1;
  height: 0;
}

.empty-history {
  text-align: center;
  color: #999;
  font-size: 26rpx;
  padding: 80rpx 0;
}

.history-item {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.history-item:last-child {
  border-bottom: none;
}

.history-image {
  width: 100rpx;
  height: 100rpx;
  border-radius: 18rpx;
  background: #f8faff;
}

.history-main {
  flex: 1;
  margin-left: 18rpx;
  display: flex;
  flex-direction: column;
}

.history-name {
  font-size: 28rpx;
  color: #333;
  font-weight: 700;
}

.history-meta {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #888;
}

.history-tag {
  font-size: 22rpx;
  color: #fff;
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
}

.record-footer {
  padding-top: 20rpx;
  display: flex;
  justify-content: center;
}

.clear-btn {
  padding: 14rpx 30rpx;
  border-radius: 999rpx;
  background: #fff1f1;
  color: #ff5c5c;
  font-size: 24rpx;
}
</style>