<template>
  <view class="loading-page">
    <view class="content">
      <!-- 逐帧动画图片 -->
      <image
        :src="currentImage"
        class="logo"
        mode="widthFix"
      />

      <!-- 标题 -->
      <view class="title">智码堂</view>
      <!-- 副标题 -->
      <view class="subtitle">芝麻糖 · 完美踩中你所有需求</view>

      <!-- 加载动画 -->
      <view class="dots">
        <view class="dot"></view>
        <view class="dot"></view>
        <view class="dot"></view>
      </view>
    </view>
    
    <!-- 底部版权信息 -->
    <view class="copyright">© 2026 智码堂 版权所有</view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      imageList: [], // 存储51张图片的路径
      currentIndex: 0, // 当前显示的图片索引
      currentImage: '', // 当前显示的图片路径
      frameTimer: null, // 逐帧动画定时器
      frameInterval: 1000 / 15, // 每张图片显示时长（约66.67毫秒）
      totalFrames: 51 // 总帧数
    }
  },
  onLoad() {
    // 1. 批量生成51张图片的路径
    this.generateImageList()
    
    // 2. 初始化显示第一张图片
    this.currentImage = this.imageList[0]
    
    // 3. 启动逐帧动画
    this.startFrameAnimation()

    // 4. 保留原有逻辑：1.8秒后跳转登录页
    setTimeout(() => {
      // 清除定时器，避免内存泄漏
      clearInterval(this.frameTimer)
      uni.redirectTo({
        url: '/pages/login/login'
      })
    }, 1800)
  },
  onUnload() {
    // 页面卸载时清除定时器
    clearInterval(this.frameTimer)
  },
  methods: {
    // 批量生成图片路径（001-051）
    generateImageList() {
      for (let i = 1; i <= this.totalFrames; i++) {
        // 补零处理：1 → 001，10 → 010，保证文件名格式统一
        const frameNum = i.toString().padStart(3, '0')
        const imagePath = `/static/hello/ezgif-frame-${frameNum}.png`
        this.imageList.push(imagePath)
      }
    },
    // 启动逐帧动画
    startFrameAnimation() {
      this.frameTimer = setInterval(() => {
        // 切换到下一张，到最后一张则回到第一张循环
        this.currentIndex = (this.currentIndex + 1) % this.imageList.length
        this.currentImage = this.imageList[this.currentIndex]
      }, this.frameInterval)
    }
  }
}
</script>

<style>
/* 整体页面样式不变 */
.loading-page {
  height: 100vh;
  background: linear-gradient(135deg, #4f6cff 0%, #8094ff 50%, #9aaeff 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.loading-page::before {
  content: "";
  position: absolute;
  width: 80%;
  height: 80%;
  background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 70%);
  border-radius: 50%;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1;
}

.content {
  text-align: center;
  color: #ffffff;
  position: relative;
  z-index: 2;
}

/* LOGO样式优化：增加动画流畅度 */
.logo {
  width: 180px;
  margin-bottom: 32px;
  filter: drop-shadow(0 8px 16px rgba(0,0,0,0.1));
  /* 移除原有缩放动画，避免和逐帧动画冲突 */
  /* animation: logoScale 1s ease-in-out; */
  /* 图片切换无过渡，保证逐帧动画的精准性 */
  transition: none;
}

.title {
  font-size: 32px;
  font-weight: 700;
  letter-spacing: 6px;
  margin-bottom: 8px;
  animation: fadeInUp 0.8s ease-out;
}

.subtitle {
  font-size: 14px;
  color: rgba(255,255,255,0.85);
  letter-spacing: 2px;
  margin-bottom: 32px;
  animation: fadeInUp 0.8s ease-out 0.2s both;
}

.dots {
  display: flex;
  justify-content: center;
  gap: 10px;
  animation: fadeInUp 0.8s ease-out 0.4s both;
}

.dot {
  width: 10px;
  height: 10px;
  background: rgba(255,255,255,0.95);
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  animation: dotBlink 1.4s infinite ease-in-out both;
}

.dot:nth-child(2) {
  animation-delay: 0.2s;
}
.dot:nth-child(3) {
  animation-delay: 0.4s;
}

.copyright {
  position: absolute;
  bottom: 30px;
  font-size: 12px;
  color: rgba(255,255,255,0.7);
  letter-spacing: 1px;
  z-index: 2;
  animation: fadeIn 1s ease-out 0.6s both;
}

/* 动画定义 */
@keyframes fadeInUp {
  0% { transform: translateY(20px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}

@keyframes dotBlink {
  0% { transform: scale(0.8); opacity: 0.3; }
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(0.8); opacity: 0.3; }
}

@keyframes fadeIn {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
</style>