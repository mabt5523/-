<template>
  <view class="page">
    <!-- 顶部提示 -->
    <view class="header">
      <text class="title">第 32 关：学会重复执行 🔁</text>
      <text class="tip">试试「重复2次」更省力</text>
    </view>

    <!-- 游戏区 -->
    <view class="game-area">
      <!-- 竖向虚线：画内部的虚线 -->
      <view class="grid-bg">
        <view
          class="grid-line"
          v-for="i in (cols - 1)"
          :key="i"
          :style="{ left: lineToX(i) + 'px' }"
        ></view>
      </view>

      <!-- 机器人 -->
      <view class="robot" :class="{ moving: isMoving }" :style="{ left: robotX + 'px' }">
        🤖
      </view>

      <!-- 星星 -->
      <view class="target" :style="{ left: targetX + 'px' }">
        <view class="star">⭐</view>
      </view>

      <!-- 目标辅助圈 -->
      <view class="target-area" :style="{ left: targetX + 'px' }"></view>
    </view>

    <!-- 指令区 -->
    <view class="panel">
      <view class="panel-title">指令序列</view>

      <view class="cmd-list">
        <view class="cmd" v-for="(cmd, index) in commands" :key="index" @click="removeCommand(index)">
          <text>{{ cmdLabel(cmd) }}</text>
          <text class="cmd-close">×</text>
        </view>

        <view class="cmd-placeholder" v-if="commands.length === 0">
          试试：点「🔁 重复2次」再点「➕ 前进」
        </view>
      </view>

      <view class="buttons">
        <view class="btn loop" @click="addLoop" :class="{ disabled: isMoving || hasLoop }">
          🔁 重复2次
        </view>
        <view class="btn add" @click="addForward" :class="{ disabled: isMoving || commands.length >= 8 }">
          ➕ 前进
        </view>
        <view class="btn run" @click="run" :class="{ disabled: commands.length === 0 || isMoving }">
          ▶ 运行
        </view>
        <view class="btn reset" @click="reset" :class="{ disabled: isMoving }">
          ↩ 重来
        </view>
      </view>

      <!-- 小提示 -->
      <view class="hint">
        <text class="hint-title">本关知识点：</text>
        <text>重复执行（循环）= 同样的动作做很多次</text>
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
      levelId: 32,  // ✅ 修改为第二关
      
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
      
      // 原第二关的数据
      cols: 8,
      paddingPx: 24,
      cellW: 0,
      gameW: 0,
      gridReady: false,

      robotLine: 0,
      targetLine: 2, // 第二关只需要走2步
      robotX: 0,
      targetX: 0,

      commands: [],
      success: false,
      isMoving: false,
      timer: null,
    };
  },

  computed: {
    hasLoop() {
      return this.commands.includes("loop2Start");
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
          url: `/api/game/levels/${this.levelId}`,  // 获取第二关进度
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
      const ms2 = Math.floor((ms % 1000) / 10); // 2位小数
      const mm = m < 10 ? '0' + m : '' + m;
      const ss = s < 10 ? '0' + s : '' + s;
      const msStr = ms2 < 10 ? '0' + ms2 : '' + ms2;
      return `${mm}:${ss}.${msStr}`;
    },

    // ============ 按用时给星星 ============
    calcStarsByTime(ms) {
      const sec = ms / 1000;
      if (sec <= 4) return 3;   // 4秒内：3星
      if (sec <= 7) return 2;   // 7秒内：2星
      return 1;                 // 其他：1星
    },

    // ============ 通关上报 ============
    async reportPass({ steps, usedMs, stars }) {
      if (this.reported) return;
      this.reported = true;

      try {
        // ✅ 用后端的完成接口
        await request({
          url: `/api/game/levels/${this.levelId}/complete`,
          method: 'POST',
          data: {
            stars,               // ⭐ 必传：星星数
            steps,               // 可选：步数
            usedTimeMs: usedMs,  // 可选：耗时ms
            usedTimeSec: Math.round(usedMs / 1000)
          }
        });

        // 本地同步一下（可选）
        this.levelProgress.stars = Math.max(this.levelProgress.stars || 0, stars);
        if (this.levelProgress.bestSteps == null) this.levelProgress.bestSteps = steps;
        else this.levelProgress.bestSteps = Math.min(this.levelProgress.bestSteps, steps);

      } catch (e) {
        console.log('reportPass failed:', e);
      }
    },

    // ---------- 原第二关的方法 ----------
    initGrid() {
      return new Promise(resolve => {
        const q = uni.createSelectorQuery().in(this);
        q.select(".game-area").boundingClientRect(rect => {
          if (!rect) return resolve();

          this.gameW = rect.width;
          this.cellW = (this.gameW - this.paddingPx * 2) / this.cols;

          this.robotX = this.lineToX(this.robotLine);
          this.targetX = this.lineToX(this.targetLine);

          this.gridReady = true;
          resolve();
        }).exec();
      });
    },

    lineToX(lineIndex) {
      return this.paddingPx + this.cellW * lineIndex;
    },

    cmdLabel(cmd) {
      if (cmd === "forward") return "前进";
      if (cmd === "loop2Start") return "重复2次 {";
      if (cmd === "loop2End") return "}";
      return cmd;
    },

    addLoop() {
      if (this.isMoving) return;
      if (this.hasLoop) {
        uni.showToast({ title: "本关只需要一个循环哦", icon: "none" });
        return;
      }
      this.commands.push("loop2Start");
      this.commands.push("loop2End");
      uni.vibrateShort({ type: "light" });
    },

    addForward() {
      if (this.isMoving) return;
      if (this.commands.length >= 8) return;

      // 如果已经有 loop，把 forward 插入到 loop2End 前面（放进循环里）
      const endIdx = this.commands.indexOf("loop2End");
      if (endIdx !== -1) {
        this.commands.splice(endIdx, 0, "forward");
      } else {
        this.commands.push("forward");
      }

      uni.vibrateShort({ type: "light" });
    },

    removeCommand(index) {
      if (this.isMoving) return;

      const cmd = this.commands[index];

      // 删除 loopStart 时，把 loopEnd 一起删
      if (cmd === "loop2Start") {
        const endIdx = this.commands.indexOf("loop2End");
        this.commands.splice(index, 1);
        if (endIdx !== -1) this.commands.splice(endIdx - 1, 1); // -1 因为前面删了一个
        uni.vibrateShort({ type: "light" });
        return;
      }

      // 删除 loopEnd 时，把 loopStart 一起删
      if (cmd === "loop2End") {
        const startIdx = this.commands.indexOf("loop2Start");
        this.commands.splice(index, 1);
        if (startIdx !== -1) this.commands.splice(startIdx, 1);
        uni.vibrateShort({ type: "light" });
        return;
      }

      // 普通删除
      this.commands.splice(index, 1);
      uni.vibrateShort({ type: "light" });
    },

    // ---------- 执行 ----------
    async run() {
      if (this.isMoving || this.commands.length === 0) return;
      if (!this.gridReady) await this.initGrid();

      this.isMoving = true;
      this.success = false;
      this.reported = false;
      
      // ✅ 开始计时
      this.startClock();

      // 回到起点
      this.robotLine = 0;
      this.robotX = this.lineToX(this.robotLine);

      // 展开命令（处理 loop2Start/loop2End）
      const expanded = this.expandCommands(this.commands);

      for (let i = 0; i < expanded.length; i++) {
        const cmd = expanded[i];
        if (cmd === "forward") {
          this.robotLine = Math.min(this.robotLine + 1, this.cols);
          this.robotX = this.lineToX(this.robotLine);
          await this.sleep(420);
        }

        if (this.robotLine === this.targetLine) {
          this.success = true;
          uni.vibrateLong();
          
          // ✅ 停止计时 + 计算星星 + 上报后端
          this.stopClock();
          const usedMs = this.elapsedMs;
          const stars = this.calcStarsByTime(usedMs);
          
          await this.reportPass({
            steps: i + 1,
            usedMs,
            stars
          });
          
          break;
        }
      }
      
      // 如果没到终点，也停表
      if (!this.success) this.stopClock();

      this.isMoving = false;

      // 小反馈：没到就提示一下
      if (!this.success) {
        uni.showToast({ title: "还没到⭐，再试试！", icon: "none" });
      }
    },

    // 把循环结构展开：重复2次
    expandCommands(cmds) {
      const start = cmds.indexOf("loop2Start");
      const end = cmds.indexOf("loop2End");
      if (start === -1 || end === -1 || end <= start) {
        // 没有循环
        return cmds.filter(c => c === "forward");
      }

      // 循环体
      const body = cmds.slice(start + 1, end).filter(c => c === "forward");

      // 循环外的 forward 也执行（在循环结构之外的）
      const before = cmds.slice(0, start).filter(c => c === "forward");
      const after = cmds.slice(end + 1).filter(c => c === "forward");

      // 重复2次
      return [...before, ...body, ...body, ...after];
    },

    reset() {
      if (this.isMoving) return;
      this.robotLine = 0;
      this.robotX = this.lineToX(this.robotLine);
      this.commands = [];
      this.success = false;
      this.reported = false;
      
      // ✅ 重置计时器
      this.stopClock();
      this.elapsedMs = 0;
      
      uni.vibrateShort({ type: "light" });
    },

    sleep(ms) {
      return new Promise(resolve => {
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
    },
  }
};
</script>


<style scoped>
/* 页面基础样式 */
.page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #89f7fe 100%);
  padding: 40rpx 30rpx;
  position: relative;
  overflow-x: hidden;
}

/* 顶部标题区 */
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
  transition: all 0.2s ease;
}
.back-btn:active {
  transform: translateY(-50%) scale(0.95);
  background: rgba(255, 255, 255, 0.3);
}
.title {
  font-size: 40rpx;
  font-weight: 800;
  text-shadow: 0 4rpx 8rpx rgba(0, 0, 0, 0.2);
  letter-spacing: 2rpx;
}
.tip {
  font-size: 26rpx;
  opacity: 0.95;
  margin-top: 12rpx;
  text-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.1);
  display: block;
}

/* 游戏区域 */
.game-area {
  position: relative;
  height: 220rpx;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 32rpx;
  margin: 30rpx 0;
  box-shadow: 0 16rpx 40rpx rgba(0, 0, 0, 0.18);
  overflow: hidden;
  backdrop-filter: blur(10rpx);
  border: 2rpx solid rgba(255, 255, 255, 0.8);
}

/* 网格虚线 */
.grid-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}
.grid-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 0;
  border-left: 1px dashed rgba(150, 150, 150, 0.35);
}

/* 机器人/目标：在线上（用 translateX(-50%) 让 left 表示中心点） */
.robot {
  position: absolute;
  bottom: 20rpx;
  font-size: 56rpx;
  transform: translateX(-50%);
  transition: left 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  z-index: 2;
  filter: drop-shadow(0 4rpx 8rpx rgba(0, 0, 0, 0.2));
}
.robot.moving {
  animation: bounce 0.4s infinite alternate;
}
@keyframes bounce {
  0% { transform: translateX(-50%) translateY(0); }
  100% { transform: translateX(-50%) translateY(-8rpx); }
}

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

/* 指令面板 */
.panel {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 32rpx;
  padding: 30rpx;
  box-shadow: 0 16rpx 40rpx rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(10rpx);
  border: 2rpx solid rgba(255, 255, 255, 0.8);
}
.panel-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #333;
  margin-bottom: 20rpx;
}
.cmd-list {
  min-height: 90rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  align-items: center;
  padding: 10rpx;
  border-radius: 20rpx;
  background: rgba(248, 249, 250, 0.8);
  margin-bottom: 20rpx;
}
.cmd {
  background: linear-gradient(90deg, #e5f0ff 0%, #d1e0ff 100%);
  color: #4f6cff;
  padding: 14rpx 24rpx;
  border-radius: 24rpx;
  font-size: 26rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8rpx;
  box-shadow: 0 4rpx 8rpx rgba(79, 108, 255, 0.1);
  transition: all 0.2s ease;
}
.cmd:active { transform: scale(0.95); }
.cmd-close { font-size: 20rpx; opacity: 0.7; }

.cmd-placeholder {
  width: 100%;
  text-align: center;
  color: #999;
  font-size: 24rpx;
  padding: 20rpx 0;
}

/* 按钮区域 */
.buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
}
.btn {
  flex: 1;
  min-width: 30%;
  padding: 22rpx 0;
  text-align: center;
  border-radius: 48rpx;
  font-size: 28rpx;
  font-weight: 700;
  transition: all 0.2s ease;
  box-shadow: 0 6rpx 12rpx rgba(0, 0, 0, 0.1);
}
.btn:active { transform: scale(0.96); }
.btn.disabled { opacity: 0.6; pointer-events: none; box-shadow: none; }

.loop {
  background: linear-gradient(90deg, #e9fff2 0%, #d8ffe8 100%);
  color: #14a76c;
}
.add {
  background: linear-gradient(90deg, #edf2ff 0%, #dbe9ff 100%);
  color: #4f6cff;
}
.run {
  background: linear-gradient(90deg, #ff9f43 0%, #ff6b6b 100%);
  color: #fff;
}
.reset {
  background: linear-gradient(90deg, #f5f5f5 0%, #e9e9e9 100%);
  color: #666;
}

/* 小提示 */
.hint{
  margin-top: 18rpx;
  padding: 16rpx 18rpx;
  border-radius: 20rpx;
  background: rgba(79,108,255,0.08);
  color: #2f3a59;
  font-size: 24rpx;
}
.hint-title{
  font-weight: 800;
  margin-right: 8rpx;
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
  animation: fadeIn 0.3s ease;
}
.success-content {
  width: 78vw;
  background: rgba(255,255,255,0.96);
  border-radius: 32rpx;
  padding: 60rpx 40rpx 44rpx;
  text-align: center;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.2);
  border: 2rpx solid rgba(255,255,255,0.8);
  animation: pop 0.5s ease;
}
.success-text {
  font-size: 48rpx;
  color: #ff6b6b;
  font-weight: 800;
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
  font-weight: 800;
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

@keyframes fadeIn { 0%{opacity:0} 100%{opacity:1} }
@keyframes pop { 0%{transform:scale(.85);opacity:0} 100%{transform:scale(1);opacity:1} }
</style>
