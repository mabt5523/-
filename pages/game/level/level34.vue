<template>
  <view class="page">
    <!-- 顶部提示 -->
    <view class="header">
      <text class="title">第 34 关：用「重复」更省力</text>
      <text class="tip">先选重复次数 → 加指令 → 运行</text>
    </view>

    <!-- 游戏区 -->
    <view class="game-area">
      <!-- 竖向虚线网格：cols=8，画 cols-1 条内部线 -->
      <view class="grid-bg">
        <view
          class="grid-line"
          v-for="i in (cols - 1)"
          :key="i"
          :style="{ left: lineToX(i) + 'px' }"
        ></view>
      </view>

      <!-- 机器人（在线上/格点上） -->
      <view class="robot" :class="{ moving: isMoving }" :style="{ left: robotX + 'px' }">
        🤖
        <view class="arrow" :style="{ transform: `rotate(${dirDeg}deg)` }">➤</view>
      </view>

      <!-- 星星（在线上/格点上） -->
      <view class="target" :style="{ left: targetX + 'px' }">
        <view class="star">⭐</view>
      </view>

      <!-- 目标圈（视觉辅助） -->
      <view class="target-area" :style="{ left: targetX + 'px' }"></view>
    </view>

    <!-- 指令区 -->
    <view class="panel">
      <view class="panel-title">循环指令</view>

      <!-- 循环设置 -->
      <view class="loop-box">
        <view class="loop-row">
          <text class="loop-label">重复次数：</text>
          <view class="loop-stepper">
            <view class="step-btn" :class="{ disabled: loopTimes <= 2 }" @click="decLoop">−</view>
            <view class="step-num">{{ loopTimes }}</view>
            <view class="step-btn" :class="{ disabled: loopTimes >= 6 }" @click="incLoop">+</view>
          </view>
          <text class="loop-hint">（建议 2~6 次）</text>
        </view>

        <view class="loop-row loop-preview">
          <text class="loop-badge">重复 {{ loopTimes }} 次：</text>
          <view class="cmd-list">
            <view
              class="cmd"
              v-for="(cmd, index) in loopCommands"
              :key="index"
              @click="removeLoopCommand(index)"
            >
              <text>{{ cmdText(cmd) }}</text>
              <text class="cmd-close">×</text>
            </view>
            <view class="cmd-placeholder" v-if="loopCommands.length === 0">
              点击下方按钮添加循环里的指令
            </view>
          </view>
        </view>
      </view>

      <!-- 按钮 -->
      <view class="buttons">
        <view class="btn add" @click="addLoopCommand('move')" :class="{ disabled: loopCommands.length >= 4 }">
          ➕ 前进
        </view>
        <view class="btn turn" @click="addLoopCommand('turnRight')" :class="{ disabled: loopCommands.length >= 4 }">
          ↻ 右转
        </view>
        <view class="btn run" @click="run" :class="{ disabled: loopCommands.length === 0 || isMoving }">
          ▶ 运行
        </view>
        <view class="btn reset" @click="reset" :class="{ disabled: isMoving }">
          ↩ 重来
        </view>
      </view>

      <!-- 小提示 -->
      <view class="note">
        <text>目标：把指令变短！比如「前进」放到循环里，重复多次就能到 ⭐。</text>
      </view>
    </view>

    <!-- 通关提示 -->
    <view v-if="success" class="success-popup" @touchmove.stop.prevent>
      <view class="success-content">
        <text class="success-text">🎉 通关成功！</text>
        <view class="popup-actions">
          <view class="popup-btn back" @click="goLevelSelect">回到选关</view>
          <view class="popup-btn next" @click="goNext">下一关 →</view>
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
      levelId: 34, // ✅ 修改为第四关
      
      // 关卡进度（后端返回）
      levelProgress: {
        unlocked: true,
        stars: 0,
        bestSteps: null
      },
      
      // 防止重复上报
      reported: false,
      
      // 原第四关的数据
      cols: 8,
      paddingPx: 24,
      cellW: 0,
      gameW: 0,
      gridReady: false,

      robotLine: 0,
      targetLine: 6,
      robotX: 0,
      targetX: 0,

      robotDir: 1,
      loopTimes: 3,
      loopCommands: [],

      success: false,
      isMoving: false,
      timer: null
    };
  },

  computed: {
    dirDeg() {
      return (this.robotDir - 1) * 90;
    }
  },

  onLoad() {
    this.loadLevelProgress(); // ✅ 加载关卡进度
  },

  onReady() {
    this.initGrid();
  },

  onUnload() {
    clearTimeout(this.timer);
  },

  methods: {
    // ============ 进入关卡：拉取单关进度 ============
    async loadLevelProgress() {
      try {
        const res = await request({
          url: `/api/game/levels/${this.levelId}`,
          method: 'GET'
        });
    
        // 兼容不同字段命名
        this.levelProgress = {
          unlocked: res.unlocked === 1 || res.unlocked === true,
          stars: Number(res.stars || 0),
          bestSteps: res.bestSteps ?? res.best_steps ?? null
        };
    
        if (!this.levelProgress.unlocked) {
          uni.showToast({ title: '该关卡未解锁', icon: 'none' });
          setTimeout(() => {
            uni.redirectTo({ url: '/pages/game/level-select' });
          }, 500);
        }
      } catch (e) {
        console.log('loadLevelProgress failed:', e);
        // 拉不到也不阻塞体验：默认可玩
      }
    },

    // ============ 通关上报 ============
    async reportPass({ steps }) {
      if (this.reported) return;
      this.reported = true;

      try {
        // ✅ 固定给3颗星星
        const stars = 3;
        
        await request({
          url: `/api/game/levels/${this.levelId}/complete`,
          method: 'POST',
          data: {
            stars,               // 固定3星
            steps,               // 步数（指令数）
            usedTimeMs: 0,       // 第四关不需要计时器，传0
            usedTimeSec: 0
          }
        });

        // 本地同步
        this.levelProgress.stars = Math.max(this.levelProgress.stars || 0, stars);
        if (this.levelProgress.bestSteps == null) this.levelProgress.bestSteps = steps;
        else this.levelProgress.bestSteps = Math.min(this.levelProgress.bestSteps, steps);

      } catch (e) {
        console.log('reportPass failed:', e);
      }
    },

    // ---------- 原第四关的方法 ----------
    clamp(v, min, max) {
      return Math.max(min, Math.min(v, max));
    },

    initGrid() {
      return new Promise((resolve) => {
        const q = uni.createSelectorQuery().in(this);
        q.select(".game-area")
          .boundingClientRect((rect) => {
            if (!rect) return resolve();

            this.gameW = rect.width;
            this.cellW = (this.gameW - this.paddingPx * 2) / this.cols;

            // 初始化位置
            this.robotLine = 0;
            this.robotDir = 1;
            this.robotX = this.lineToX(this.robotLine);

            this.targetLine = this.clamp(this.targetLine, 0, this.cols - 1);
            this.targetX = this.lineToX(this.targetLine);

            this.gridReady = true;
            resolve();
          })
          .exec();
      });
    },

    lineToX(lineIndex) {
      return this.paddingPx + this.cellW * lineIndex;
    },

    incLoop() {
      if (this.loopTimes >= 6) return;
      this.loopTimes++;
      uni.vibrateShort({ type: "light" });
    },
    
    decLoop() {
      if (this.loopTimes <= 2) return;
      this.loopTimes--;
      uni.vibrateShort({ type: "light" });
    },

    cmdText(cmd) {
      if (cmd === "move") return "前进";
      if (cmd === "turnRight") return "右转";
      return cmd;
    },

    addLoopCommand(cmd) {
      if (this.isMoving) return;
      if (this.loopCommands.length >= 4) return;
      this.loopCommands.push(cmd);
      uni.vibrateShort({ type: "light" });
    },

    removeLoopCommand(index) {
      if (this.isMoving) return;
      this.loopCommands.splice(index, 1);
      uni.vibrateShort({ type: "light" });
    },

    stepForward() {
      // 只让"朝右"可以前进
      if (this.robotDir === 1) {
        this.robotLine = this.clamp(this.robotLine + 1, 0, this.cols - 1);
      }
      this.robotX = this.lineToX(this.robotLine);
    },

    turnRight() {
      this.robotDir = (this.robotDir + 1) % 4;
    },

    async run() {
      if (this.isMoving) return;
      if (!this.gridReady) await this.initGrid();
      if (this.loopCommands.length === 0) return;

      this.isMoving = true;
      this.success = false;
      this.reported = false;

      // 每次运行回到起点
      this.robotLine = 0;
      this.robotDir = 1;
      this.robotX = this.lineToX(this.robotLine);

      let steps = 0; // 记录实际执行的指令数
      let foundTarget = false;

      // 执行：重复 loopTimes 次
      for (let t = 0; t < this.loopTimes; t++) {
        for (let i = 0; i < this.loopCommands.length; i++) {
          const cmd = this.loopCommands[i];
          steps++;

          if (cmd === "move") this.stepForward();
          if (cmd === "turnRight") this.turnRight();

          // 等待动画
          await this.sleep(380);

          // 判定：格点重合
          if (this.robotLine === this.targetLine) {
            this.success = true;
            uni.vibrateLong();
            
            // ✅ 通关上报（固定3星）
            await this.reportPass({ steps });
            
            foundTarget = true;
            break;
          }
        }
        if (foundTarget) break;
      }

      this.isMoving = false;
      
      // 小提示：没到终点
      if (!this.success) {
        uni.showToast({ title: "还没到⭐，再试试！", icon: "none" });
      }
    },

    reset() {
      if (this.isMoving) return;
      this.robotLine = 0;
      this.robotDir = 1;
      this.robotX = this.lineToX(this.robotLine);
      this.loopCommands = [];
      this.loopTimes = 3;
      this.success = false;
      this.reported = false;
      
      uni.vibrateShort({ type: "light" });
    },

    sleep(ms) {
      return new Promise((resolve) => {
        this.timer = setTimeout(resolve, ms);
      });
    },

    // ---------- 跳转 ----------
    goBack() {
      uni.navigateBack({ delta: 1 });
    },
    
    goLevelSelect() {
      uni.redirectTo({ url: "/pages/game/level-select" });
    },
    
    goNext() {
      uni.redirectTo({ url: `/pages/game/level/level${this.levelId + 1}` });
    }
  }
};
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #89f7fe 100%);
  padding: 40rpx 30rpx;
  position: relative;
  overflow-x: hidden;
}

/* 顶部 */
.header {
  text-align: center;
  color: #fff;
  position: relative;
  margin-bottom: 30rpx;
}
.back-btn {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
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
}
.back-btn:active {
  transform: translateY(-50%) scale(0.95);
  background: rgba(255, 255, 255, 0.3);
}
.title {
  font-size: 40rpx;
  font-weight: 800;
  text-shadow: 0 4rpx 8rpx rgba(0, 0, 0, 0.2);
}
.tip {
  font-size: 26rpx;
  opacity: 0.95;
  margin-top: 12rpx;
  text-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.1);
  display: block;
}

/* 游戏区 */
.game-area {
  position: relative;
  height: 220rpx;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 32rpx;
  margin: 30rpx 0;
  box-shadow: 0 16rpx 40rpx rgba(0, 0, 0, 0.18);
  overflow: hidden;
  border: 2rpx solid rgba(255, 255, 255, 0.8);
}
.grid-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
}
.grid-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 0;
  border-left: 1px dashed rgba(150, 150, 150, 0.35);
}

/* 机器人 + 箭头 */
.robot {
  position: absolute;
  bottom: 20rpx;
  font-size: 56rpx;
  transform: translateX(-50%);
  transition: left 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  z-index: 2;
  filter: drop-shadow(0 4rpx 8rpx rgba(0, 0, 0, 0.2));
}
.robot.moving {
  animation: bounce 0.35s infinite alternate;
}
@keyframes bounce {
  0% { transform: translateX(-50%) translateY(0); }
  100% { transform: translateX(-50%) translateY(-8rpx); }
}
.arrow {
  position: absolute;
  right: -26rpx;
  top: 16rpx;
  font-size: 30rpx;
  opacity: 0.9;
  transition: transform 0.18s ease;
}

/* 星星 */
.target {
  position: absolute;
  bottom: 20rpx;
  transform: translateX(-50%);
  z-index: 1;
}
.star {
  font-size: 56rpx;
  animation: pulse 1.5s infinite ease-in-out;
  filter: drop-shadow(0 4rpx 12rpx rgba(255, 235, 59, 0.5));
}
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

/* 目标圈 */
.target-area {
  position: absolute;
  bottom: 10rpx;
  transform: translateX(-50%);
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: rgba(255, 235, 59, 0.1);
  border: 2rpx dashed rgba(255, 235, 59, 0.5);
  z-index: 0;
}

/* 面板 */
.panel {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 32rpx;
  padding: 30rpx;
  box-shadow: 0 16rpx 40rpx rgba(0, 0, 0, 0.18);
  border: 2rpx solid rgba(255, 255, 255, 0.8);
}
.panel-title {
  font-size: 28rpx;
  font-weight: 800;
  color: #333;
  margin-bottom: 18rpx;
}

.loop-box {
  border-radius: 24rpx;
  background: rgba(248, 249, 250, 0.9);
  padding: 18rpx;
  margin-bottom: 18rpx;
}
.loop-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 14rpx;
}
.loop-row:last-child {
  margin-bottom: 0;
}
.loop-label {
  font-size: 26rpx;
  color: #333;
  font-weight: 700;
}
.loop-hint {
  font-size: 22rpx;
  color: #888;
}
.loop-stepper {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 999rpx;
  overflow: hidden;
  border: 2rpx solid rgba(79,108,255,0.15);
}
.step-btn {
  width: 72rpx;
  height: 52rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34rpx;
  color: #4f6cff;
  background: linear-gradient(90deg, #eef2ff 0%, #dbe9ff 100%);
}
.step-btn.disabled {
  opacity: 0.45;
  pointer-events: none;
}
.step-num {
  width: 86rpx;
  text-align: center;
  font-size: 28rpx;
  font-weight: 800;
  color: #333;
}

.loop-preview .loop-badge{
  font-size: 24rpx;
  color: #4f6cff;
  font-weight: 800;
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(79,108,255,0.10);
}

.cmd-list {
  flex: 1;
  min-height: 90rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
  align-items: center;
  padding: 10rpx;
  border-radius: 18rpx;
  background: rgba(255,255,255,0.9);
}
.cmd {
  background: linear-gradient(90deg, #e5f0ff 0%, #d1e0ff 100%);
  color: #4f6cff;
  padding: 14rpx 22rpx;
  border-radius: 22rpx;
  font-size: 26rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8rpx;
  box-shadow: 0 4rpx 8rpx rgba(79, 108, 255, 0.08);
}
.cmd:active {
  transform: scale(0.97);
}
.cmd-close {
  font-size: 20rpx;
  opacity: 0.7;
}
.cmd-placeholder {
  width: 100%;
  text-align: center;
  color: #999;
  font-size: 24rpx;
  padding: 14rpx 0;
}

/* 按钮 */
.buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.btn {
  flex: 1;
  min-width: 200rpx;
  padding: 20rpx 0;
  text-align: center;
  border-radius: 999rpx;
  font-size: 28rpx;
  font-weight: 800;
  box-shadow: 0 6rpx 12rpx rgba(0, 0, 0, 0.10);
  transition: transform 0.15s ease;
}
.btn:active { transform: scale(0.97); }
.btn.disabled {
  opacity: 0.6;
  pointer-events: none;
  box-shadow: none;
}
.add {
  background: linear-gradient(90deg, #edf2ff 0%, #dbe9ff 100%);
  color: #4f6cff;
}
.turn {
  background: linear-gradient(90deg, #fff3d6 0%, #ffe0b2 100%);
  color: #c26a00;
}
.run {
  background: linear-gradient(90deg, #ff9f43 0%, #ff6b6b 100%);
  color: #fff;
}
.reset {
  background: linear-gradient(90deg, #f5f5f5 0%, #e9e9e9 100%);
  color: #666;
}

.note{
  margin-top: 14rpx;
  color: rgba(0,0,0,0.55);
  font-size: 24rpx;
  line-height: 1.5;
}

/* 通关弹窗 */
.success-popup {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(5rpx);
  animation: fadeIn 0.25s ease;
}
.success-content {
  width: 78vw;
  background: rgba(255,255,255,0.96);
  border-radius: 32rpx;
  padding: 60rpx 40rpx 44rpx;
  text-align: center;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.2);
  border: 2rpx solid rgba(255,255,255,0.8);
  animation: pop 0.4s ease;
}
.success-text {
  font-size: 48rpx;
  color: #ff6b6b;
  font-weight: 900;
  display: block;
  margin-bottom: 32rpx;
}
.popup-actions{
  display: flex;
  gap: 18rpx;
}
.popup-btn{
  flex: 1;
  padding: 18rpx 0;
  border-radius: 26rpx;
  font-size: 28rpx;
  font-weight: 900;
  box-shadow: 0 10rpx 22rpx rgba(0,0,0,0.12);
}
.popup-btn:active{ transform: scale(0.98); }
.popup-btn.back{
  background: linear-gradient(90deg, #eef2ff 0%, #dbe9ff 100%);
  color: #4f6cff;
  border: 2rpx solid rgba(79,108,255,0.18);
}
.popup-btn.next{
  background: linear-gradient(90deg, #4f6cff 0%, #667eea 100%);
  color: #fff;
}

@keyframes fadeIn { from{opacity:0} to{opacity:1} }
@keyframes pop { 0%{transform:scale(0.88);opacity:0} 100%{transform:scale(1);opacity:1} }
</style>
