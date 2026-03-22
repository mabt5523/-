<template>
  <view class="page">
    <!-- 顶部提示 -->
    <view class="header">
      <text class="title">第 33 关：学会转向</text>
      <text class="tip">先转向，再前进，到达 ⭐</text>
    </view>

    <!-- 游戏区 -->
    <view class="game-area" :style="{ height: gameHPx + 'px' }">
      <!-- 网格背景（竖线 + 横线） -->
      <view class="grid-bg">
        <view
          v-for="i in (cols - 1)"
          :key="'v' + i"
          class="grid-line-v"
          :style="{ left: gridLeftPx + i * cellW + 'px' }"
        />
        <view
          v-for="j in (rows - 1)"
          :key="'h' + j"
          class="grid-line-h"
          :style="{ top: gridTopPx + j * cellH + 'px' }"
        />
      </view>

      <!-- 星星 -->
      <view
        class="target"
        :style="{ left: targetPx.x + 'px', top: targetPx.y + 'px' }"
      >
        ⭐
      </view>

      <!-- 机器人（带朝向箭头） -->
      <view
        class="robot"
        :class="{ moving: isMoving }"
        :style="{ left: robotPx.x + 'px', top: robotPx.y + 'px' }"
      >
        <text class="robot-icon">🤖</text>
        <text class="dir" :style="{ transform: `rotate(${dirDeg}deg)` }">➤</text>
      </view>

      <!-- （可选）提示起点/终点坐标 -->
      <view class="hint">
        <text>起点：({{ start.x }},{{ start.y }})</text>
        <text class="sep">|</text>
        <text>终点：({{ target.x }},{{ target.y }})</text>
      </view>
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
          <text>{{ cmdLabel(cmd) }}</text>
          <text class="cmd-close">×</text>
        </view>

        <view class="cmd-placeholder" v-if="commands.length === 0">
          依次点击下方按钮添加指令
        </view>
      </view>

      <view class="buttons">
        <view class="btn add" @click="addCommand('forward')" :class="{ disabled: commands.length >= maxCmd }">
          ➕ 前进
        </view>
        <view class="btn turn" @click="addCommand('left')" :class="{ disabled: commands.length >= maxCmd }">
          ⟲ 左转
        </view>
        <view class="btn turn" @click="addCommand('right')" :class="{ disabled: commands.length >= maxCmd }">
          ⟳ 右转
        </view>
      </view>

      <view class="buttons second">
        <view class="btn run" @click="run" :class="{ disabled: commands.length === 0 || isMoving }">
          ▶ 运行
        </view>
        <view class="btn reset" @click="reset" :class="{ disabled: isMoving }">
          ↩ 重来
        </view>
      </view>
    </view>

    <!-- 通关弹窗 -->
    <view v-if="success" class="success-popup" @touchmove.stop.prevent>
      <view class="success-content">
        <text class="success-text">🎉 通关成功！</text>
        <text class="success-sub">知识点：方向 + 左转/右转</text>

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
      levelId: 33, // ✅ 修改为第三关
      
      // 关卡进度（后端返回）
      levelProgress: {
        unlocked: true,
        stars: 0,
        bestSteps: null
      },
      
      // ✅ 计时器相关
      elapsedMs: 0,
      clock: null,
      startAt: 0,
      
      // 防止重复上报
      reported: false,
      
      // 原第三关的数据
      cols: 5,
      rows: 5,
      gameHPx: 220,
      paddingPx: 18,
      gameW: 0,
      gameH: 0,
      cellW: 0,
      cellH: 0,
      gridLeftPx: 0,
      gridTopPx: 0,
      gridReady: false,

      start: { x: 1, y: 3 },
      target: { x: 4, y: 1 },

      robot: { x: 1, y: 3, dir: 0 },
      robotPx: { x: 0, y: 0 },
      targetPx: { x: 0, y: 0 },

      maxCmd: 10,
      commands: [],

      isMoving: false,
      success: false,
      timer: null
    };
  },

  computed: {
    dirDeg() {
      return (this.robot.dir - 1) * 90;
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
    this.stopClock(); // ✅ 清理计时器
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

    // ============ 计时器 ============
    startClock() {
      this.stopClock();
      this.elapsedMs = 0;
      this.startAt = Date.now();

      this.clock = setInterval(() => {
        this.elapsedMs = Date.now() - this.startAt;
      }, 100);
    },

    stopClock() {
      if (this.clock) {
        clearInterval(this.clock);
        this.clock = null;
      }
    },

    formatTime(ms) {
      const totalSec = Math.floor(ms / 1000);
      const m = Math.floor(totalSec / 60);
      const s = totalSec % 60;
      const ms2 = Math.floor((ms % 1000) / 10);
      const mm = m < 10 ? '0' + m : '' + m;
      const ss = s < 10 ? '0' + s : '' + s;
      const msStr = ms2 < 10 ? '0' + ms2 : '' + ms2;
      return `${mm}:${ss}.${msStr}`;
    },

    // ============ 通关上报 ============
    async reportPass({ steps, usedMs }) {
      if (this.reported) return;
      this.reported = true;

      try {
        // ✅ 固定给3颗星星（不要按时间给星星）
        const stars = 3;
        
        await request({
          url: `/api/game/levels/${this.levelId}/complete`,
          method: 'POST',
          data: {
            stars,               // 固定3星
            steps,               // 步数（指令数）
            usedTimeMs: usedMs,  // 耗时ms
            usedTimeSec: Math.round(usedMs / 1000)
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

    // ---------- 原第三关的方法 ----------
    initGrid() {
      return new Promise((resolve) => {
        const q = uni.createSelectorQuery().in(this);
        q.select(".game-area").boundingClientRect((rect) => {
          if (!rect) return resolve();

          this.gameW = rect.width;
          this.gameH = rect.height;

          const gridW = this.gameW - this.paddingPx * 2;
          const gridH = this.gameH - this.paddingPx * 2;

          this.cellW = gridW / this.cols;
          this.cellH = gridH / this.rows;

          this.gridLeftPx = this.paddingPx;
          this.gridTopPx = this.paddingPx;

          this.targetPx = this.cellCenterPx(this.target.x, this.target.y);
          this.robotPx = this.cellCenterPx(this.robot.x, this.robot.y);

          this.gridReady = true;
          resolve();
        }).exec();
      });
    },

    cellCenterPx(cx, cy) {
      return {
        x: this.gridLeftPx + (cx + 0.5) * this.cellW,
        y: this.gridTopPx + (cy + 0.5) * this.cellH
      };
    },

    cmdLabel(cmd) {
      if (cmd === "forward") return "前进";
      if (cmd === "left") return "左转";
      if (cmd === "right") return "右转";
      return cmd;
    },

    addCommand(type) {
      if (this.commands.length >= this.maxCmd) return;
      if (this.isMoving) return;
      this.commands.push(type);
      uni.vibrateShort({ type: "light" });
    },

    removeCommand(index) {
      if (this.isMoving) return;
      this.commands.splice(index, 1);
      uni.vibrateShort({ type: "light" });
    },

    // ---------- 动作执行 ----------
    async run() {
      if (this.isMoving || this.commands.length === 0) return;
      if (!this.gridReady) await this.initGrid();

      this.isMoving = true;
      this.success = false;
      this.reported = false;
      
      // ✅ 开始计时
      this.startClock();

      // 每次运行重置到起点
      this.robot = { x: this.start.x, y: this.start.y, dir: 0 };
      this.robotPx = this.cellCenterPx(this.robot.x, this.robot.y);

      let steps = 0; // 记录实际执行的指令数
      
      for (let i = 0; i < this.commands.length; i++) {
        const cmd = this.commands[i];
        steps++; // 每条指令都算一步

        if (cmd === "left") {
          this.robot.dir = (this.robot.dir + 3) % 4;
          await this.sleep(220);
        } else if (cmd === "right") {
          this.robot.dir = (this.robot.dir + 1) % 4;
          await this.sleep(220);
        } else if (cmd === "forward") {
          const next = this.nextPos(this.robot);
          this.robot.x = next.x;
          this.robot.y = next.y;

          this.robotPx = this.cellCenterPx(this.robot.x, this.robot.y);
          await this.sleep(420);
        }

        // 判定：格子重合
        if (this.robot.x === this.target.x && this.robot.y === this.target.y) {
          this.success = true;
          uni.vibrateLong();
          
          // ✅ 停止计时 + 上报后端（固定3星）
          this.stopClock();
          const usedMs = this.elapsedMs;
          
          await this.reportPass({
            steps: steps, // 使用实际执行的指令数
            usedMs
          });
          
          break;
        }
      }
      
      // 如果没到终点，也停表
      if (!this.success) {
        this.stopClock();
        uni.showToast({ title: "还没到⭐，再试试！", icon: "none" });
      }

      this.isMoving = false;
    },

    nextPos(robot) {
      let { x, y, dir } = robot;

      if (dir === 0) y -= 1;
      else if (dir === 1) x += 1;
      else if (dir === 2) y += 1;
      else if (dir === 3) x -= 1;

      // 边界限制
      x = Math.max(0, Math.min(this.cols - 1, x));
      y = Math.max(0, Math.min(this.rows - 1, y));

      return { x, y };
    },

    reset() {
      if (this.isMoving) return;
      this.commands = [];
      this.success = false;
      this.reported = false;

      this.robot = { x: this.start.x, y: this.start.y, dir: 0 };
      this.robotPx = this.cellCenterPx(this.robot.x, this.robot.y);

      // ✅ 重置计时器
      this.stopClock();
      this.elapsedMs = 0;

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
.page{
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 55%, #89f7fe 100%);
  padding: 40rpx 30rpx;
  box-sizing: border-box;
}

/* Header */
.header{
  text-align: center;
  color: #fff;
  position: relative;
  margin-bottom: 24rpx;
}
.back-btn{
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  background: rgba(255,255,255,0.2);
  display:flex;
  align-items:center;
  justify-content:center;
  font-size: 32rpx;
  font-weight: 800;
  backdrop-filter: blur(10rpx);
}
.title{
  font-size: 40rpx;
  font-weight: 900;
  display:block;
}
.tip{
  margin-top: 10rpx;
  display:block;
  font-size: 26rpx;
  opacity: 0.95;
}

/* Game */
.game-area{
  position: relative;
  background: rgba(255,255,255,0.96);
  border-radius: 32rpx;
  box-shadow: 0 16rpx 40rpx rgba(0,0,0,0.18);
  overflow:hidden;
  border: 2rpx solid rgba(255,255,255,0.8);
}

/* grid lines */
.grid-bg{
  position:absolute;
  top:0; left:0; right:0; bottom:0;
}
.grid-line-v{
  position:absolute;
  top: 18px;
  bottom: 18px;
  width: 0;
  border-left: 1px dashed rgba(150,150,150,0.35);
}
.grid-line-h{
  position:absolute;
  left: 18px;
  right: 18px;
  height: 0;
  border-top: 1px dashed rgba(150,150,150,0.35);
}

/* target */
.target{
  position:absolute;
  transform: translate(-50%, -50%);
  font-size: 56rpx;
  z-index: 2;
  filter: drop-shadow(0 4rpx 12rpx rgba(255,235,59,0.55));
}

/* robot */
.robot{
  position:absolute;
  transform: translate(-50%, -50%);
  z-index: 3;
  display:flex;
  align-items:center;
  gap: 8rpx;
  transition: left 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
              top 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.robot-icon{
  font-size: 56rpx;
  filter: drop-shadow(0 4rpx 8rpx rgba(0,0,0,0.18));
}
.dir{
  font-size: 30rpx;
  color: rgba(79,108,255,0.95);
  display:inline-block;
  transform-origin: 50% 50%;
}
.robot.moving{
  animation: bounce 0.4s infinite alternate;
}
@keyframes bounce{
  0% { transform: translate(-50%, -50%) translateY(0); }
  100% { transform: translate(-50%, -50%) translateY(-6rpx); }
}

/* small hint */
.hint{
  position:absolute;
  left: 16rpx;
  top: 12rpx;
  font-size: 22rpx;
  color: rgba(0,0,0,0.45);
  display:flex;
  gap: 10rpx;
}
.sep{ opacity: 0.5; }

/* Panel */
.panel{
  margin-top: 26rpx;
  background: rgba(255,255,255,0.95);
  border-radius: 32rpx;
  padding: 30rpx;
  box-shadow: 0 16rpx 40rpx rgba(0,0,0,0.18);
  border: 2rpx solid rgba(255,255,255,0.8);
}
.panel-title{
  font-size: 28rpx;
  font-weight: 800;
  color: #333;
  margin-bottom: 18rpx;
}
.cmd-list{
  min-height: 90rpx;
  display:flex;
  flex-wrap: wrap;
  gap: 16rpx;
  align-items:center;
  padding: 10rpx;
  border-radius: 20rpx;
  background: rgba(248,249,250,0.85);
  margin-bottom: 18rpx;
}
.cmd{
  background: linear-gradient(90deg, #e5f0ff 0%, #d1e0ff 100%);
  color: #4f6cff;
  padding: 14rpx 24rpx;
  border-radius: 24rpx;
  font-size: 26rpx;
  font-weight: 700;
  display:flex;
  align-items:center;
  gap: 10rpx;
}
.cmd-close{ opacity: 0.65; font-size: 22rpx; }
.cmd-placeholder{
  width: 100%;
  text-align:center;
  color:#999;
  font-size: 24rpx;
  padding: 20rpx 0;
}

.buttons{
  display:flex;
  gap: 14rpx;
}
.buttons.second{
  margin-top: 14rpx;
}
.btn{
  flex: 1;
  padding: 20rpx 0;
  text-align:center;
  border-radius: 48rpx;
  font-size: 28rpx;
  font-weight: 800;
  box-shadow: 0 6rpx 12rpx rgba(0,0,0,0.10);
  transition: transform 0.15s ease;
}
.btn:active{ transform: scale(0.97); }
.btn.disabled{ opacity: 0.6; pointer-events:none; box-shadow:none; }

.add{
  background: linear-gradient(90deg, #edf2ff 0%, #dbe9ff 100%);
  color: #4f6cff;
}
.turn{
  background: linear-gradient(90deg, #f3f0ff 0%, #e6ddff 100%);
  color: #6b4cff;
}
.run{
  background: linear-gradient(90deg, #ff9f43 0%, #ff6b6b 100%);
  color: #fff;
}
.reset{
  background: linear-gradient(90deg, #f5f5f5 0%, #e9e9e9 100%);
  color: #666;
}

/* Success popup */
.success-popup{
  position: fixed;
  top:0; left:0; right:0; bottom:0;
  background: rgba(0,0,0,0.5);
  display:flex;
  align-items:center;
  justify-content:center;
  z-index: 100;
  backdrop-filter: blur(5rpx);
}
.success-content{
  width: 78vw;
  background: rgba(255,255,255,0.96);
  border-radius: 32rpx;
  padding: 56rpx 40rpx 44rpx;
  text-align:center;
  box-shadow: 0 20rpx 60rpx rgba(0,0,0,0.2);
}
.success-text{
  font-size: 48rpx;
  color: #ff6b6b;
  font-weight: 900;
  display:block;
  margin-bottom: 14rpx;
}
.success-sub{
  display:block;
  font-size: 24rpx;
  color: rgba(0,0,0,0.55);
  margin-bottom: 26rpx;
}
.popup-actions{
  display:flex;
  gap: 18rpx;
}
.popup-btn{
  flex:1;
  padding: 18rpx 0;
  border-radius: 26rpx;
  font-size: 28rpx;
  font-weight: 900;
  box-shadow: 0 10rpx 22rpx rgba(0,0,0,0.12);
}
.popup-btn:active{ transform: scale(0.97); }
.popup-btn.back{
  background: linear-gradient(90deg, #eef2ff 0%, #dbe9ff 100%);
  color: #4f6cff;
  border: 2rpx solid rgba(79,108,255,0.18);
}
.popup-btn.next{
  background: linear-gradient(90deg, #4f6cff 0%, #667eea 100%);
  color: #fff;
}
</style>
