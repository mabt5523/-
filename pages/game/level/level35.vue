<template>
  <view class="page">
    <!-- 顶部提示 -->
    <view class="header">
      <text class="title">第 35 关：避开障碍到 ⭐</text>
      <text class="tip">提示：遇到⛔不能前进，试试先右转再前进</text>
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

      <!-- “轨道线”（上/下两条） -->
      <view class="track track-top"></view>
      <view class="track track-bottom"></view>

      <!-- 障碍物（放在某条线/某条轨道上） -->
      <view
        v-for="(b, idx) in blocks"
        :key="idx"
        class="block"
        :class="{ hit: hitBlock }"
        :style="{ left: lineToX(b.line) + 'px', top: b.row === 0 ? trackTopPx + 'px' : trackBottomPx + 'px' }"
      >
        ⛔
      </view>

      <!-- 机器人 -->
      <view
        class="robot"
        :class="{ moving: isMoving, bump: bumpAnim }"
        :style="{ left: robotX + 'px', top: robotRow === 0 ? trackTopPx + 'px' : trackBottomPx + 'px' }"
      >
        🤖
        <view class="arrow" :style="{ transform: `rotate(${dirDeg}deg)` }">➤</view>
      </view>

      <!-- 目标星星 -->
      <view
        class="target"
        :style="{ left: targetX + 'px', top: targetRow === 0 ? trackTopPx + 'px' : trackBottomPx + 'px' }"
      >
        ⭐
      </view>

      <!-- 目标圈（辅助） -->
      <view
        class="target-area"
        :style="{ left: targetX + 'px', top: targetRow === 0 ? trackTopPx + 'px' : trackBottomPx + 'px' }"
      ></view>
    </view>

    <!-- 指令区 -->
    <view class="panel">
      <view class="panel-title">指令序列</view>

      <view class="cmd-list">
        <view
          class="cmd"
          v-for="(cmd, index) in commands"
          :key="index"
          @click="removeCommand(index)"
        >
          <text>{{ cmdText(cmd) }}</text>
          <text class="cmd-close">×</text>
        </view>
        <view class="cmd-placeholder" v-if="commands.length === 0">
          点击下方按钮添加指令
        </view>
      </view>

      <view class="buttons">
        <view class="btn add" @click="addCommand('move')" :class="{ disabled: commands.length >= maxCmd }">
          ➕ 前进
        </view>
      
        <view class="btn turn-left" @click="addCommand('turnLeft')" :class="{ disabled: commands.length >= maxCmd }">
          ↺ 左转
        </view>
      
        <view class="btn turn-right" @click="addCommand('turnRight')" :class="{ disabled: commands.length >= maxCmd }">
          ↻ 右转
        </view>
      
        <view class="btn run" @click="run" :class="{ disabled: commands.length === 0 || isMoving }">
          ▶ 运行
        </view>
        <view class="btn reset" @click="reset" :class="{ disabled: isMoving }">
          ↩ 重来
        </view>
      </view>


      <view class="note">
        <text>规则：如果前面有 ⛔，机器人不能前进，会停下并提示你改指令。</text>
      </view>
    </view>

    <!-- 通关弹窗 -->
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
      levelId: 35, // ✅ 修改为第五关
      
      // 关卡进度（后端返回）
      levelProgress: {
        unlocked: true,
        stars: 0,
        bestSteps: null
      },
      
      // 防止重复上报
      reported: false,
      
      // 原第五关的数据
      cols: 8,
      paddingPx: 24,
      cellW: 0,
      gameW: 0,
      gridReady: false,

      trackTopPx: 0,
      trackBottomPx: 0,

      robotLine: 0,
      robotRow: 0,
      robotDir: 1,
      robotX: 0,

      targetLine: 7,
      targetRow: 1,
      targetX: 0,

      blocks: [
        { line: 3, row: 0 },
        { line: 5, row: 1 }
      ],

      commands: [],
      maxCmd: 20,

      success: false,
      isMoving: false,
      timer: null,

      hitBlock: false,
      bumpAnim: false
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
            usedTimeMs: 0,       // 第五关不需要计时器，传0
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

    // ---------- 原第五关的方法 ----------
    clamp(v, min, max) {
      return Math.max(min, Math.min(v, max));
    },

    initGrid() {
      return new Promise((resolve) => {
        const q = uni.createSelectorQuery().in(this);
        q.select(".game-area").boundingClientRect((rect) => {
          if (!rect) return resolve();

          this.gameW = rect.width;
          this.cellW = (this.gameW - this.paddingPx * 2) / this.cols;

          // 轨道纵向位置
          this.trackTopPx = Math.round(rect.height * 0.38);
          this.trackBottomPx = Math.round(rect.height * 0.68);

          // 初始化位置
          this.robotLine = 0;
          this.robotRow = 0;
          this.robotDir = 1;
          this.robotX = this.lineToX(this.robotLine);

          this.targetLine = this.clamp(this.targetLine, 0, this.cols - 1);
          this.targetX = this.lineToX(this.targetLine);

          this.gridReady = true;
          resolve();
        }).exec();
      });
    },

    lineToX(lineIndex) {
      return this.paddingPx + this.cellW * lineIndex;
    },

    cmdText(cmd) {
      if (cmd === "move") return "前进";
      if (cmd === "turnLeft") return "左转";
      if (cmd === "turnRight") return "右转";
      return cmd;
    },

    addCommand(cmd) {
      if (this.isMoving) return;
      if (this.commands.length >= this.maxCmd) return;
      this.commands.push(cmd);
      uni.vibrateShort({ type: "light" });
    },

    removeCommand(index) {
      if (this.isMoving) return;
      this.commands.splice(index, 1);
      uni.vibrateShort({ type: "light" });
    },

    hasBlock(line, row) {
      return this.blocks.some((b) => b.line === line && b.row === row);
    },

    tryStep() {
      let nextLine = this.robotLine;
      let nextRow = this.robotRow;

      if (this.robotDir === 1) nextLine = this.robotLine + 1;
      if (this.robotDir === 3) nextLine = this.robotLine - 1;
      if (this.robotDir === 2) nextRow = 1;
      if (this.robotDir === 0) nextRow = 0;

      nextLine = this.clamp(nextLine, 0, this.cols - 1);

      if (this.hasBlock(nextLine, nextRow)) {
        this.hitBlock = true;
        this.bumpAnim = true;
        uni.vibrateLong();
        setTimeout(() => (this.bumpAnim = false), 260);
        return false;
      }

      this.robotLine = nextLine;
      this.robotRow = nextRow;
      this.robotX = this.lineToX(this.robotLine);
      return true;
    },

    turnRight() {
      this.robotDir = (this.robotDir + 1) % 4;
    },
    
    turnLeft() {
      this.robotDir = (this.robotDir + 3) % 4;
    },

    checkSuccess() {
      return this.robotLine === this.targetLine && this.robotRow === this.targetRow;
    },

    async run() {
      if (this.isMoving) return;
      if (!this.gridReady) await this.initGrid();
      if (this.commands.length === 0) return;

      this.isMoving = true;
      this.success = false;
      this.hitBlock = false;
      this.reported = false;

      // 每次运行回到起点
      this.robotLine = 0;
      this.robotRow = 0;
      this.robotDir = 1;
      this.robotX = this.lineToX(this.robotLine);

      let steps = 0; // 记录实际执行的指令数
      let foundTarget = false;

      // 逐条执行
      for (let i = 0; i < this.commands.length; i++) {
        const cmd = this.commands[i];
        steps++;

        if (cmd === "turnLeft") {
          this.turnLeft();
          await this.sleep(260);
        }

        if (cmd === "turnRight") {
          this.turnRight();
          await this.sleep(260);
        }

        if (cmd === "move") {
          const moved = this.tryStep();
          await this.sleep(380);

          // 撞到就直接结束，让孩子修改指令
          if (!moved) {
            uni.showToast({ title: "前面有⛔！换个方向试试", icon: "none" });
            this.isMoving = false;
            return;
          }
        }

        if (this.checkSuccess()) {
          this.success = true;
          uni.vibrateLong();
          
          // ✅ 通关上报（固定3星）
          await this.reportPass({ steps });
          
          this.isMoving = false;
          return;
        }
      }

      // 没成功也结束
      this.isMoving = false;
      if (!this.success) {
        uni.showToast({ title: "还差一点点，再试试～", icon: "none" });
      }
    },

    reset() {
      if (this.isMoving) return;
      this.robotLine = 0;
      this.robotRow = 0;
      this.robotDir = 1;
      this.robotX = this.lineToX(this.robotLine);
      this.commands = [];
      this.success = false;
      this.hitBlock = false;
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
  height: 260rpx;
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

/* 轨道 */
.track {
  position: absolute;
  left: 0;
  right: 0;
  height: 6rpx;
  background: rgba(79, 108, 255, 0.12);
  z-index: 0;
  border-radius: 999rpx;
}
.track-top { top: 38%; }
.track-bottom { top: 68%; }

/* 障碍 */
.block {
  position: absolute;
  transform: translate(-50%, -50%);
  font-size: 52rpx;
  z-index: 2;
  filter: drop-shadow(0 4rpx 10rpx rgba(0,0,0,0.15));
}
.block.hit {
  animation: shake 0.25s ease;
}
@keyframes shake {
  0% { transform: translate(-50%,-50%) rotate(0deg); }
  25% { transform: translate(-50%,-50%) rotate(-10deg); }
  50% { transform: translate(-50%,-50%) rotate(10deg); }
  75% { transform: translate(-50%,-50%) rotate(-6deg); }
  100% { transform: translate(-50%,-50%) rotate(0deg); }
}

/* 机器人 */
.robot {
  position: absolute;
  transform: translate(-50%, -50%);
  font-size: 56rpx;
  transition: left 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  z-index: 3;
  filter: drop-shadow(0 4rpx 10rpx rgba(0, 0, 0, 0.18));
}
.robot.moving {
  animation: bounce 0.35s infinite alternate;
}
@keyframes bounce {
  0% { transform: translate(-50%,-50%) translateY(0); }
  100% { transform: translate(-50%,-50%) translateY(-8rpx); }
}
.robot.bump {
  animation: bump 0.25s ease;
}
@keyframes bump {
  0% { transform: translate(-50%,-50%) scale(1); }
  50% { transform: translate(-50%,-50%) scale(1.06); }
  100% { transform: translate(-50%,-50%) scale(1); }
}
.arrow {
  position: absolute;
  right: -26rpx;
  top: 14rpx;
  font-size: 30rpx;
  opacity: 0.9;
  transition: transform 0.18s ease;
}

/* 星星 */
.target {
  position: absolute;
  transform: translate(-50%, -50%);
  font-size: 56rpx;
  z-index: 2;
  filter: drop-shadow(0 4rpx 12rpx rgba(255, 235, 59, 0.5));
  animation: pulse 1.5s infinite ease-in-out;
}
@keyframes pulse {
  0%, 100% { transform: translate(-50%,-50%) scale(1); }
  50% { transform: translate(-50%,-50%) scale(1.08); }
}
.target-area {
  position: absolute;
  transform: translate(-50%, -50%);
  width: 86rpx;
  height: 86rpx;
  border-radius: 50%;
  background: rgba(255, 235, 59, 0.10);
  border: 2rpx dashed rgba(255, 235, 59, 0.55);
  z-index: 1;
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
.cmd-list {
  min-height: 90rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
  align-items: center;
  padding: 10rpx;
  border-radius: 18rpx;
  background: rgba(248, 249, 250, 0.85);
  margin-bottom: 18rpx;
}
.cmd {
  background: linear-gradient(90deg, #e5f0ff 0%, #d1e0ff 100%);
  color: #4f6cff;
  padding: 14rpx 22rpx;
  border-radius: 22rpx;
  font-size: 26rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 8rpx;
  box-shadow: 0 4rpx 8rpx rgba(79, 108, 255, 0.08);
}
.cmd:active { transform: scale(0.97); }
.cmd-close { font-size: 20rpx; opacity: 0.7; }
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
  font-weight: 900;
  box-shadow: 0 6rpx 12rpx rgba(0, 0, 0, 0.10);
  transition: transform 0.15s ease;
}
.btn:active { transform: scale(0.97); }
.btn.disabled { opacity: 0.6; pointer-events: none; box-shadow: none; }
.add { background: linear-gradient(90deg, #edf2ff 0%, #dbe9ff 100%); color: #4f6cff; }
.turn { background: linear-gradient(90deg, #fff3d6 0%, #ffe0b2 100%); color: #c26a00; }
.run { background: linear-gradient(90deg, #ff9f43 0%, #ff6b6b 100%); color: #fff; }
.reset { background: linear-gradient(90deg, #f5f5f5 0%, #e9e9e9 100%); color: #666; }

.note {
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
.turn-left{
  background: linear-gradient(90deg, #fff3d6 0%, #ffe0b2 100%);
  color: #c26a00;
}
@keyframes fadeIn { from{opacity:0} to{opacity:1} }
@keyframes pop { 0%{transform:scale(0.88);opacity:0} 100%{transform:scale(1);opacity:1} }
</style>
