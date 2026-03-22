<template>
  <view class="page">


    <!-- 背景装饰元素 -->
    <view class="bg-decoration">
      <view class="star" v-for="i in 50" :key="i" :style="{
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 5}s`,
        width: `${4 + Math.random() * 8}rpx`,
        height: `${4 + Math.random() * 8}rpx`
      }"></view>
      <view class="circle circle-1"></view>
      <view class="circle circle-2"></view>
      <view class="circle circle-3"></view>
    </view>

    <!-- 顶部机器人区 -->
    <view class="hero">
      <view class="halo"></view>

      <image
        class="robot dance"
        src="/static/robot.png"
      />

      <text class="title">编程小冒险</text>
      <text class="sub-title">像玩游戏一样学编程</text>
    </view>

    <!-- 信息卡片 -->
    <view class="card float">
      <view class="card-header">
        <text class="card-title">我的成长</text>
        <view class="level-badge">Lv.{{ finishedLevels }}</view>
      </view>
      <view class="info-grid">
        <view class="info-item">
          <view class="info-icon">🎯</view>
          <text class="label">已完成关卡</text>
          <text class="value">{{ finishedLevels }}</text>
        </view>
        <view class="info-item">
          <view class="info-icon">⭐</view>
          <text class="label">星星奖励</text>
          <text class="value">{{ totalStars }}</text>
        </view>
        <view class="info-item">
          <view class="info-icon">🔥</view>
          <text class="label">连续打卡</text>
          <text class="value">{{ streakDays }} 天</text>
        </view>
      </view>
    </view>

    <!-- 按钮 -->
    <view class="actions">
      <view class="btn start pulse" @click="startGame">
        🚀 开始闯关
      </view>
      <view class="btn secondary hover-effect" @click="goRank">
        📘 排行榜
      </view>

    </view>
  </view>
</template>

<script>
import request from '@/common/request.js'

export default {
  data() {
    return {
      finishedLevels: 0,
      totalStars: 0,
      streakDays: 0
    }
  },
  onLoad() {
    this.loadHomeProgress()
  },
  methods: {
	goRank() {
	  uni.reLaunch({
	    url: '/pages/game/leaderboard'
	  })
	},

    goBack() {
      // ✅ 返回学生主页
      uni.reLaunch({
        url: '/pages/student/student_homepage'
      })
    },
    
    loadHomeProgress() {
      request({
        url: '/api/game/home',
        method: 'GET',
        data: { total: 60 }
      }).then(res => {
        this.finishedLevels = res.finishedLevels ?? 0
        this.totalStars = res.totalStars ?? 0
        this.streakDays = res.streakDays ?? 0
      })
    },

    startGame() {
      uni.navigateTo({ url: '/pages/game/level-select' })
    }
  }
}
</script>

<style scoped>
/* 页面背景 */
.page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #89f7fe 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  overflow: hidden;
}

/* ✅ 修改这部分：调整返回按钮到左上方 */
.back-btn {
  position: fixed;  /* 改为 fixed 定位，固定在左上角 */
  left: 20rpx;
  top: 20rpx;       /* 调整 top 值到左上角 */
  transform: none;  /* 移除垂直居中变换 */
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
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
  z-index: 100;
  /* 移除原来的 margin-left */
}
.back-btn:active {
  transform: scale(0.95); /* 修改为 scale 变换 */
  background: rgba(255, 255, 255, 0.3);
}

/* 背景装饰 - 星空和圆形元素 */
.bg-decoration {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}

.star {
  position: absolute;
  background: #ffffff;
  border-radius: 50%;
  opacity: 0;
  animation: twinkle 3s infinite ease-in-out;
  box-shadow: 0 0 10rpx rgba(255, 255, 255, 0.8);
}

@keyframes twinkle {
  0%, 100% { opacity: 0; }
  50% { opacity: 1; }
}

.circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(50rpx);
  border: 1rpx solid rgba(255, 255, 255, 0.1);
}

.circle-1 {
  width: 600rpx;
  height: 600rpx;
  top: -200rpx;
  right: -200rpx;
  animation: float-slow 20s infinite ease-in-out;
}

.circle-2 {
  width: 400rpx;
  height: 400rpx;
  bottom: -100rpx;
  left: -100rpx;
  animation: float-slow 15s infinite ease-in-out reverse;
}

.circle-3 {
  width: 200rpx;
  height: 200rpx;
  top: 40%;
  left: -100rpx;
  animation: float-slow 18s infinite ease-in-out;
}

@keyframes float-slow {
  0%, 100% { transform: translateY(0) translateX(0); }
  50% { transform: translateY(-30rpx) translateX(20rpx); }
}

/* 顶部区域 */
.hero {
  margin-top: 120rpx;
  text-align: center;
  color: #fff;
  position: relative;
  z-index: 1;
}

/* 光晕 */
.halo {
  position: absolute;
  top: 30rpx;
  left: 50%;
  transform: translateX(-50%);
  width: 220rpx;
  height: 220rpx;
  background: radial-gradient(circle, rgba(255,255,255,0.6), transparent);
  border-radius: 50%;
  filter: blur(15rpx);
  animation: halo-pulse 3s infinite ease-in-out;
}

@keyframes halo-pulse {
  0%, 100% { transform: translateX(-50%) scale(1); }
  50% { transform: translateX(-50%) scale(1.05); }
}

/* 机器人 */
.robot {
  width: 140rpx;
  height: 140rpx;
  position: relative;
  z-index: 2;
  filter: drop-shadow(0 8rpx 16rpx rgba(0,0,0,0.2));
}

/* 跳舞动画 */
.dance {
  animation: dance 2.5s ease-in-out infinite;
}

@keyframes dance {
  0% {
    transform: translateY(0) rotate(0deg);
  }
  25% {
    transform: translateY(-20rpx) rotate(-5deg);
  }
  50% {
    transform: translateY(0) rotate(5deg);
  }
  75% {
    transform: translateY(-15rpx) rotate(-3deg);
  }
  100% {
    transform: translateY(0) rotate(0deg);
  }
}

.title {
  display: block;
  font-size: 56rpx;
  font-weight: 800;
  margin-top: 20rpx;
  text-shadow: 0 4rpx 8rpx rgba(0,0,0,0.2);
  letter-spacing: 2rpx;
}

.sub-title {
  display: block;
  font-size: 28rpx;
  opacity: 0.95;
  margin-top: 12rpx;
  text-shadow: 0 2rpx 4rpx rgba(0,0,0,0.1);
}

/* 卡片 */
.card {
  width: 85%;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 32rpx;
  margin-top: 70rpx;
  padding: 36rpx;
  box-shadow: 0 24rpx 60rpx rgba(0,0,0,0.15);
  backdrop-filter: blur(10rpx);
  border: 1rpx solid rgba(255, 255, 255, 0.8);
  position: relative;
  z-index: 1;
}

/* 悬浮感 */
.float {
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0% { transform: translateY(0); }
  50% { transform: translateY(-12rpx); }
  100% { transform: translateY(0); }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.card-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #333;
}

.level-badge {
  background: linear-gradient(90deg, #667eea, #89f7fe);
  color: white;
  padding: 8rpx 16rpx;
  border-radius: 20rpx;
  font-size: 24rpx;
  font-weight: 600;
  box-shadow: 0 4rpx 8rpx rgba(102, 126, 234, 0.3);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20rpx;
}

.info-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16rpx 8rpx;
  border-radius: 16rpx;
  background: rgba(248, 249, 250, 0.8);
  transition: transform 0.2s ease;
}

.info-item:active {
  transform: scale(0.95);
}

.info-icon {
  font-size: 32rpx;
  margin-bottom: 8rpx;
}

.label {
  font-size: 24rpx;
  color: #666;
  margin-bottom: 4rpx;
}

.value {
  font-size: 28rpx;
  font-weight: bold;
  color: #667eea;
}

/* 按钮区 */
.actions {
  width: 85%;
  margin-top: 70rpx;
  position: relative;
  z-index: 1;
}

.btn {
  border-radius: 60rpx;
  padding: 28rpx 0;
  font-size: 30rpx;
  text-align: center;
  margin-bottom: 30rpx;
  box-shadow: 0 14rpx 32rpx rgba(0,0,0,0.18);
  transition: all 0.3s ease;
}

.start {
  background: linear-gradient(90deg, #ff9f43, #ff6b6b);
  color: #fff;
  font-size: 34rpx;
  font-weight: 600;
  position: relative;
  overflow: hidden;
}

.start::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  animation: shine 2s infinite;
}

@keyframes shine {
  100% { left: 100%; }
}

/* 呼吸按钮 */
.pulse {
  animation: pulse 1.8s infinite;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

.secondary {
  background: rgba(255, 255, 255, 0.9);
  color: #667eea;
  font-weight: 600;
}

.hover-effect:active {
  transform: scale(0.98);
  box-shadow: 0 8rpx 20rpx rgba(0,0,0,0.12);
  background: rgba(255, 255, 255, 1);
}

/* 底部 */
.footer {
  margin-top: auto;
  padding: 30rpx 0;
  font-size: 22rpx;
  color: rgba(255,255,255,0.85);
  text-shadow: 0 1rpx 2rpx rgba(0,0,0,0.1);
  position: relative;
  z-index: 1;
}
</style>