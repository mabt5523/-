<template>
  <view class="page">
    <!-- 背景装饰（云朵+星星） -->
    <view class="bg-decoration">
      <!-- 云朵 -->
      <view class="cloud cloud-1"></view>
      <view class="cloud cloud-2"></view>
      <view class="cloud cloud-3"></view>
      <!-- 星星点点 -->
      <view class="star" v-for="i in 80" :key="i" :style="{
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 5}s`,
        width: `${2 + Math.random() * 6}rpx`,
        height: `${2 + Math.random() * 6}rpx`
      }"></view>
    </view>
    

    <!-- 路径两侧装饰（花草） -->
    <view class="path-side-decor" v-for="(item, idx) in sideDecorList" :key="idx" :style="{
      top: `${item.top}%`,
      left: `${item.left}%`,
      transform: `scale(${item.scale}) rotate(${item.rotate}deg)`
    }">
      <view class="flower" :class="`flower-${item.type}`"></view>
    </view>

    <view class="levels-container">
      <canvas
        class="path-canvas"
        canvas-id="pathCanvas"
        :width="canvasW"
        :height="canvasH"
      ></canvas>
    
      <view
        v-for="level in currentLevels"
        :key="level.id"
        class="level-node"
        :class="{ unlocked: level.unlocked }"
        :style="{ top: `${level.top}%`, left: `${level.left}%` }"
        @click="enterLevel(level)"
      >
        <view class="dot" :class="{ unlocked: level.unlocked }">
          <text class="level-num">{{ level.id }}</text>
        </view>
    
        <view class="stars" v-if="level.stars > 0">
          <text v-for="i in level.stars" :key="i">⭐</text>
        </view>
      </view>
    </view>

    <!-- 翻页按钮 -->
    <view class="pagination">
      <view class="btn prev" :class="{ disabled: currentPage === 1 }" @click="prevPage">
        <text class="btn-icon">←</text>
        <text class="btn-text">上一页</text>
      </view>
      <view class="page-indicator">
        <text class="indicator-text">{{ currentPage }} / {{ totalPages }}</text>
      </view>
      <view class="btn next" :class="{ disabled: currentPage === totalPages }" @click="nextPage">
        <text class="btn-text">下一页</text>
        <text class="btn-icon">→</text>
      </view>
    </view>
	<!-- ✅ 全部通关提示（只在最后一页显示） -->
	<view v-if="showFinishTip" class="finish-tip">
	  <text class="finish-title">🎉你太厉害啦！</text>
	  <text class="finish-text">
	    50 关全部通关！你已经正式进入计算机的世界啦～
	  </text>
	
	  <text class="finish-text">现在可以去更大的舞台继续玩编程：</text>
	
	  <text class="finish-link" @click="openUrl('https://mindplus.dfrobot.com.cn')">
	    ✅ Mind+：https://mindplus.dfrobot.com.cn
	  </text>
	  <text class="finish-link" @click="openUrl('https://code.org/en-US')">
	    ✅ Code.org：https://code.org/en-US
	  </text>
	
	  <text class="finish-text">加油，小小程序员！🚀✨</text>
	</view>

  </view>
</template>

<script>
import request from '@/common/request.js'

export default {
  data() {
    return {
      levels: [],
      currentPage: 1,
      levelsPerPage: 15,
      sideDecorList: [],
      canvasW: 0,
      canvasH: 0,
      totalLevels: 50 // ✅ 从后端可覆盖
    };
  },

  onLoad() {
    // ✅ 先画一个"骨架"(防止页面空白)，再拉后端进度覆盖
    this.levels = this.generateLevelPositions(this.totalLevels);
    this.generateSideDecor();

    this.$nextTick(() => {
      this.updateCanvasSizeAndRedraw();
    });

    // ✅ 拉后端进度
    this.loadLevelsFromBackend();
  },

  onReady() {
    this.$nextTick(() => {
      this.updateCanvasSizeAndRedraw();
    });
  },

  computed: {
	showFinishTip() {
	  // 1) 必须在最后一页
	  if (this.currentPage !== this.totalPages) return false;
	
	  // 2) 必须所有关卡都通关（这里用：全部 unlocked = true）
	  return this.levels.length > 0 && this.levels.every(lv => lv.unlocked);
	},

    totalPages() {
      return Math.ceil(this.levels.length / this.levelsPerPage);
    },
    currentLevels() {
      const start = (this.currentPage - 1) * this.levelsPerPage;
      return this.levels.slice(start, start + this.levelsPerPage);
    }
  },

  watch: {
    currentPage() {
      this.generateSideDecor();
      this.$nextTick(() => this.updateCanvasSizeAndRedraw());
    }
  },

  methods: {
	openUrl(url) {
	  // H5/小程序都通用：复制到剪贴板 + 提示
	  uni.setClipboardData({
	    data: url,
	    success: () => {
	      uni.showToast({ title: '链接已复制，去浏览器打开～', icon: 'none' });
	    }
	  });
	},

    // ✅ 修复返回功能：使用 navigateBack 而不是 reLaunch
    goBack() {
      uni.navigateTo({ url: `/pages/game/index` });
    },
    
    // ================== 后端数据 ==================
    async loadLevelsFromBackend() {
      try {
        const res = await request({
          url: '/api/game/levels',
          method: 'GET',
          data: { total: this.totalLevels }
        });

        // 兼容：res.levels 或直接是数组
        const list = Array.isArray(res?.levels) ? res.levels : (Array.isArray(res) ? res : []);
        const total = res?.total || this.totalLevels;
        this.totalLevels = total;

        // levelId => progress
        const map = {};
        list.forEach(it => {
          const id = Number(it.levelId || it.id);
          if (!id) return;
          map[id] = it;
        });

        // ✅ 重新生成位置 + 合并后端进度
        const positioned = this.generateLevelPositions(this.totalLevels).map(lv => {
          const p = map[lv.id];
          if (!p) return lv;
          return {
            ...lv,
            unlocked: p.unlocked === 1 || p.unlocked === true,
            stars: Number(p.stars || 0),
            bestSteps: p.bestSteps ?? null
          };
        });

        this.levels = positioned;

        // ✅ 后端返回后，刷新装饰和路径
        this.generateSideDecor();
        this.$nextTick(() => this.updateCanvasSizeAndRedraw());
      } catch (e) {
        console.log('loadLevelsFromBackend failed:', e);
        // 失败就用本地骨架，不影响体验
      }
    },

    // ================== 你原来的工具函数 ==================
    clamp(v, min, max) {
      return Math.max(min, Math.min(v, max));
    },

    updateCanvasSizeAndRedraw() {
      const q = uni.createSelectorQuery().in(this);
      q.select(".levels-container").boundingClientRect(rect => {
        if (!rect) return;
        this.canvasW = Math.round(rect.width);
        this.canvasH = Math.round(rect.height);
        this.$nextTick(() => this.drawPath());
      }).exec();
    },

    // ✅ 只负责生成蛇形坐标（展示用），进度由后端覆盖
    generateLevelPositions(totalLevels) {
      const perPage = this.levelsPerPage;

      const topMin = 8;
      const topMax = 92;

      const leftMin = 12;
      const leftMax = 84;

      const amp = 32;
      const waves = 1.55;

      const levels = [];
      for (let i = 1; i <= totalLevels; i++) {
        const pageIndex = Math.floor((i - 1) / perPage);
        const indexInPage = (i - 1) % perPage;
        const t = indexInPage / (perPage - 1);

        const top = topMin + t * (topMax - topMin);

        const phase = pageIndex * Math.PI * 0.65;
        let left = 50 + amp * Math.sin(Math.PI * 2 * waves * t + phase);
        left = this.clamp(left, leftMin, leftMax);

        levels.push({
          id: i,
          // 默认骨架：第 1 关解锁，其余未解锁（后端回来会覆盖）
          unlocked: i === 1,
          stars: 0,
          bestSteps: null,
          top,
          left,
          page: pageIndex + 1
        });
      }
      return levels;
    },

    // 生成路径两侧装饰（花草）
    generateSideDecor() {
      const decorList = [];
      const currentPts = this.currentLevels;
      if (!currentPts || currentPts.length === 0) {
        this.sideDecorList = [];
        return;
      }

      const decorCount = 15 + Math.floor(Math.random() * 5);
      for (let i = 0; i < decorCount; i++) {
        const randomPt = currentPts[Math.floor(Math.random() * currentPts.length)];
        const offsetDir = Math.random() > 0.5 ? 1 : -1;
        const offset = 10 + Math.random() * 10;
        const yOffset = -5 + Math.random() * 10;

        decorList.push({
          top: this.clamp(randomPt.top + yOffset, 5, 90),
          left: this.clamp(randomPt.left + (offsetDir * offset), 5, 95),
          type: Math.floor(Math.random() * 3) + 1,
          scale: 0.8 + Math.random() * 0.4,
          rotate: -15 + Math.random() * 30
        });
      }
      this.sideDecorList = decorList;
    },

    percentToPxPoints(levels) {
      return levels.map(p => ({
        x: (p.left / 100) * this.canvasW,
        y: (p.top / 100) * this.canvasH
      }));
    },

    strokePolyline(ctx, pts) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
    },

    drawPebbles(ctx, pts, roadHalfWidthPx) {
      const perSeg = 3;
      const pebbleCount = (pts.length - 1) * perSeg;
      const rMin = 2.0;
      const rMax = 4.8;

      for (let k = 0; k < pebbleCount; k++) {
        const s = k / (pebbleCount - 1);
        const f = s * (pts.length - 1);
        const i = Math.floor(f);
        const t = f - i;

        const a = pts[i];
        const b = pts[Math.min(i + 1, pts.length - 1)];

        const x = a.x + (b.x - a.x) * t;
        const y = a.y + (b.y - a.y) * t;

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;

        const seed = k + 13;
        const u = (Math.sin(seed * 12.9898) * 43758.5453) % 1;
        const v = (Math.cos(seed * 78.233) * 12345.6789) % 1;

        const uu = (u - Math.floor(u)) * 2 - 1;
        const vv = (v - Math.floor(v)) * 2 - 1;

        const offset = uu * (roadHalfWidthPx * 0.78);
        const tang = vv * 6;

        const tx = dx / len;
        const ty = dy / len;

        const px = x + nx * offset + tx * tang;
        const py = y + ny * offset + ty * tang;

        const rr = rMin + (Math.abs(uu) * (rMax - rMin));
        const alpha = 0.08 + (Math.abs(vv) * 0.10);

        ctx.beginPath();
        ctx.setFillStyle(`rgba(255,255,255,${alpha})`);
        ctx.arc(px, py, rr, 0, Math.PI * 2);
        ctx.fill();
      }
    },

    drawPath() {
      const ctx = uni.createCanvasContext("pathCanvas", this);
      ctx.clearRect(0, 0, this.canvasW, this.canvasH);

      const pts = this.percentToPxPoints(this.currentLevels);
      if (pts.length < 2) {
        ctx.draw();
        return;
      }

      const roadWidth = 22;
      const roadHalf = roadWidth / 2;

      ctx.setLineCap("round");
      ctx.setLineJoin("round");
      ctx.setStrokeStyle("rgba(0,0,0,0.12)");
      ctx.setLineWidth(roadWidth + 10);
      this.strokePolyline(ctx, pts);

      ctx.setStrokeStyle("rgba(255,255,255,0.35)");
      ctx.setLineWidth(roadWidth);
      this.strokePolyline(ctx, pts);

      this.drawPebbles(ctx, pts, roadHalf + 4);

      ctx.setStrokeStyle("rgba(255,255,255,0.7)");
      ctx.setLineWidth(3.5);
      if (ctx.setLineDash) ctx.setLineDash([10, 10], 0);
      this.strokePolyline(ctx, pts);
      if (ctx.setLineDash) ctx.setLineDash([], 0);

      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        ctx.beginPath();
        ctx.setFillStyle("rgba(0,0,0,0.08)");
        ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.setFillStyle("rgba(255,255,255,0.25)");
        ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.draw();
    },

    enterLevel(level) {
      if (!level.unlocked) {
        uni.showToast({ title: "先完成前一关哦", icon: "none" });
        return;
      }
      uni.navigateTo({ url: `/pages/game/level/level${level.id}` });
    },

    prevPage() {
      if (this.currentPage > 1) this.currentPage--;
    },
    nextPage() {
      if (this.currentPage < this.totalPages) this.currentPage++;
    }
  }
};
</script>

<style scoped>
/* 页面基础样式 - 升级渐变质感 */
.page {
  position: relative;
  min-height: 100vh;
  background: linear-gradient(135deg, #8e44ad 0%, #3498db 60%, #2ecc71 100%);
  overflow: hidden;
  /* 全局抗锯齿 */
  -webkit-font-smoothing: antialiased;
  font-smoothing: antialiased;
}

/* 背景装饰（云朵+星星）- 优化质感 */
.bg-decoration {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}
/* 云朵样式 - 增加层次感 */
.cloud {
  position: absolute;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 100rpx;
  box-shadow: 0 8rpx 30rpx rgba(255, 255, 255, 0.6);
  /* 云朵动画 */
  animation: cloudFloat 20s infinite alternate ease-in-out;
}
.cloud-1 {
  width: 200rpx;
  height: 80rpx;
  top: 20%;
  left: 10%;
  animation-delay: 0s;
}
.cloud-2 {
  width: 150rpx;
  height: 60rpx;
  top: 70%;
  left: 80%;
  animation-delay: 5s;
}
.cloud-3 {
  width: 180rpx;
  height: 70rpx;
  top: 40%;
  left: 70%;
  animation-delay: 2s;
}
/* 云朵伪元素优化 */
.cloud::before, .cloud::after {
  content: '';
  position: absolute;
  background: inherit;
  border-radius: inherit;
}
.cloud-1::before {
  width: 80rpx;
  height: 80rpx;
  top: -40rpx;
  left: 40rpx;
}
.cloud-1::after {
  width: 60rpx;
  height: 60rpx;
  top: -20rpx;
  right: 40rpx;
}
.cloud-2::before {
  width: 60rpx;
  height: 60rpx;
  top: -30rpx;
  left: 30rpx;
}
.cloud-2::after {
  width: 50rpx;
  height: 50rpx;
  top: -20rpx;
  right: 30rpx;
}
.cloud-3::before {
  width: 70rpx;
  height: 70rpx;
  top: -35rpx;
  left: 35rpx;
}
.cloud-3::after {
  width: 55rpx;
  height: 55rpx;
  top: -25rpx;
  right: 35rpx;
}
/* 星星样式 - 优化动画 */
.star {
  position: absolute;
  background: #ffffff;
  border-radius: 50%;
  opacity: 0;
  animation: twinkle 4s infinite ease-in-out;
  box-shadow: 0 0 12rpx rgba(255, 255, 255, 0.9);
}
@keyframes twinkle {
  0%, 100% { opacity: 0; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}
/* 云朵漂浮动画 */
@keyframes cloudFloat {
  0% { transform: translateX(0) translateY(0); }
  100% { transform: translateX(20rpx) translateY(-10rpx); }
}

/* 花草装饰样式优化 */
.stem {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 120rpx;
  height: 100%;
  background: linear-gradient(90deg, #56ab2f 0%, #a8e063 100%);
  border-radius: 60rpx;
  box-shadow: inset 0 0 20rpx rgba(0, 0, 0, 0.2);
}
.leaf {
  position: absolute;
  width: 80rpx;
  height: 120rpx;
  background: linear-gradient(45deg, #4CAF50 0%, #8BC34A 100%);
  border-radius: 0 80rpx 80rpx 0;
  box-shadow: 0 4rpx 8rpx rgba(0, 0, 0, 0.2);
}
.leaf-1 { top: 20%; left: 0; transform: rotate(20deg); }
.leaf-2 { top: 35%; right: 0; transform: rotate(-20deg) scaleX(-1); }
.leaf-3 { top: 50%; left: 0; transform: rotate(15deg); }
.leaf-4 { top: 65%; right: 0; transform: rotate(-15deg) scaleX(-1); }
.leaf-5 { top: 80%; left: 0; transform: rotate(25deg); }
.leaf::before {
  content: '';
  position: absolute;
  top: 20rpx;
  left: 10rpx;
  width: 60rpx;
  height: 80rpx;
  border-radius: 0 60rpx 60rpx 0;
  background: rgba(255, 255, 255, 0.2);
}

/* 路径装饰元素基础样式 */
.path-decoration {
  position: absolute;
  z-index: 2;
  transform: translate(-50%, -50%);
}
.start-icon {
  font-size: 60rpx;
  animation: pulse 2s infinite ease-in-out;
}
.end-icon {
  font-size: 60rpx;
  animation: float 3s infinite ease-in-out;
}
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10rpx); }
}
/* 路径两侧花草装饰 - 增加动画 */
.path-side-decor {
  position: absolute;
  z-index: 1;
  pointer-events: none;
  animation: flowerSway 8s infinite alternate ease-in-out;
}
/* 花草摇摆动画 */
@keyframes flowerSway {
  0% { transform: scale(var(--scale)) rotate(var(--rotate)deg) translateX(0); }
  100% { transform: scale(var(--scale)) rotate(var(--rotate)deg) translateX(5rpx); }
}
.flower {
  width: 40rpx;
  height: 60rpx;
  border-radius: 50%;
  position: relative;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.15);
}
/* 花草样式1 */
.flower-1 {
  background: linear-gradient(45deg, #e74c3c 0%, #ff9ff3 100%);
}
.flower-1::before {
  content: '';
  position: absolute;
  bottom: -20rpx;
  left: 50%;
  transform: translateX(-50%);
  width: 6rpx;
  height: 30rpx;
  background: #2ecc71;
  border-radius: 3rpx;
  box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.1);
}
/* 花草样式2 */
.flower-2 {
  background: linear-gradient(45deg, #f39c12 0%, #f1c40f 100%);
}
.flower-2::before {
  content: '';
  position: absolute;
  bottom: -20rpx;
  left: 50%;
  transform: translateX(-50%);
  width: 6rpx;
  height: 30rpx;
  background: #2ecc71;
  border-radius: 3rpx;
  box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.1);
}
/* 花草样式3 */
.flower-3 {
  background: linear-gradient(45deg, #3498db 0%, #9b59b6 100%);
}
.flower-3::before {
  content: '';
  position: absolute;
  bottom: -20rpx;
  left: 50%;
  transform: translateX(-50%);
  width: 6rpx;
  height: 30rpx;
  background: #2ecc71;
  border-radius: 3rpx;
  box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.1);
}

/* 关卡容器样式 */
.levels-container{
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

/* 小路画布 */
.path-canvas {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

/* 关卡节点样式优化 */
.level-node{
  position: absolute;
  width: 60rpx;
  height: 60rpx;
  text-align: center;
  z-index: 3;
  transform: translate(-50%, -50%);
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.level-node:active{
  transform: translate(-50%, -50%) scale(0.95);
}
.level-node:hover {
  transform: translate(-50%, -50%) scale(1.05);
}

.level-node .dot {
  width: 50rpx;
  height: 50rpx;
  margin: 10rpx;
  background: #ff7979;
  border-radius: 50%;
  box-shadow: 0 8rpx 20rpx rgba(0, 0, 0, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  /* 增加内发光 */
  box-shadow: 0 6rpx 12rpx rgba(0, 0, 0, 0.2),
              inset 0 0 10rpx rgba(255, 255, 255, 0.3);
}
.level-node .dot.unlocked {
  background: #2ecc71;
  animation: pulse 2s infinite ease-in-out;
  /* 解锁状态增加外发光 */
  box-shadow: 0 6rpx 20rpx rgba(46, 204, 113, 0.4),
              inset 0 0 10rpx rgba(255, 255, 255, 0.3);
}
.level-node .level-num {
  color: #fff;
  font-size: 18rpx;
  font-weight: bold;
  text-shadow: 0 1rpx 3rpx rgba(0, 0, 0, 0.4);
}
/* 星星样式优化 */
.stars {
  margin-top: 4rpx;
  font-size: 14rpx;
  color: #ffeb3b;
  text-shadow: 0 1rpx 3rpx rgba(0, 0, 0, 0.3);
  animation: starTwinkle 3s infinite alternate ease-in-out;
}
@keyframes starTwinkle {
  0% { transform: scale(1); }
  100% { transform: scale(1.1); }
}

/* 翻页按钮容器 - 优化布局 */
.pagination {
  position: absolute;
  bottom: 20rpx;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0;
  z-index: 3;
  gap: 20rpx;
}
/* 页码指示器 - 优化样式 */
.page-indicator {
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10rpx);
  padding: 12rpx 24rpx;
  border-radius: 50rpx;
  box-shadow: 0 4rpx 15rpx rgba(0, 0, 0, 0.1);
  border: 1rpx solid rgba(255, 255, 255, 0.3);
}
.indicator-text {
  color: rgba(255, 255, 255, 0.95);
  font-size: 24rpx;
  font-weight: 600;
  text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.2);
}

/* ✅ 返回按钮样式 - 与翻页按钮保持一致 */
.back-btn {
  position: absolute;
  top: 30rpx;
  left: 0rpx;
  z-index: 100;
  background: linear-gradient(135deg, #ff9800 0%, #ff5722 100%);
  padding: 16rpx 40rpx;
  border-radius: 50rpx;
  color: white;
  font-size: 22rpx;
  font-weight: 600;
  box-shadow: 0 8rpx 20rpx rgba(255, 152, 0, 0.3);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  border: 1rpx solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
}
.back-btn:active {
  transform: scale(0.95);
  box-shadow: 0 4rpx 10rpx rgba(255, 152, 0, 0.2);
}

/* ✅ 统一按钮样式 */
.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  background: linear-gradient(135deg, #ff9800 0%, #ff5722 100%);
  padding: 16rpx 40rpx;
  border-radius: 50rpx;
  color: white;
  font-size: 22rpx;
  font-weight: 600;
  box-shadow: 0 8rpx 20rpx rgba(255, 152, 0, 0.3);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  border: 1rpx solid rgba(255, 255, 255, 0.2);
  min-width: 140rpx;
  /* 翻页按钮的特殊边距 */
  margin: 0 -40rpx;
}
/* 按钮图标样式 */
.btn-icon {
  font-size: 24rpx;
  font-weight: bold;
}
/* 按钮文字样式 */
.btn-text {
  font-size: 22rpx;
}
/* 禁用状态样式优化 */
.btn.disabled {
  background: linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%);
  opacity: 0.7;
  pointer-events: none;
  box-shadow: 0 4rpx 10rpx rgba(0, 0, 0, 0.1);
  transform: none !important;
}
/* 按钮点击/hover效果 */
.btn:active {
  transform: scale(0.95);
  box-shadow: 0 4rpx 10rpx rgba(255, 152, 0, 0.2);
}
.btn:not(.disabled):hover {
  transform: translateY(-4rpx);
  box-shadow: 0 10rpx 25rpx rgba(255, 152, 0, 0.4);
}

/* 通用动画 */
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}
.finish-tip{
  position: absolute;
  left: 50%;
  bottom: 120rpx; /* 不挡分页按钮，可按需调大/调小 */
  transform: translateX(-50%);
  width: 86%;
  z-index: 5;
  padding: 22rpx 26rpx;
  border-radius: 22rpx;
  background: rgba(255,255,255,0.18);
  backdrop-filter: blur(12rpx);
  border: 1rpx solid rgba(255,255,255,0.25);
  box-shadow: 0 10rpx 30rpx rgba(0,0,0,0.12);
}

.finish-title{
  display: block;
  font-size: 30rpx;
  font-weight: 800;
  color: rgba(255,255,255,0.98);
  margin-bottom: 10rpx;
}

.finish-text{
  display: block;
  font-size: 24rpx;
  color: rgba(255,255,255,0.95);
  line-height: 36rpx;
  margin-top: 6rpx;
}

.finish-link{
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  font-weight: 700;
  color: #fff;
  text-decoration: underline;
}

</style>