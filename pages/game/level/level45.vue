<template>
  <view class="page">
    <view class="header">
      <text class="title">第 45 关：学会「且」AND ✅</text>
      <text class="tip">学习点：AND（两个条件都为真才执行）+ 循环分支</text>
    </view>

    <!-- 游戏区：5x5 -->
    <view class="game-area">
      <!-- 网格线 -->
      <view class="grid">
        <view
          v-for="i in cols + 1"
          :key="'v' + i"
          class="grid-line-v"
          :style="{ left: paddingPx + (i - 1) * cell + 'px' }"
        />
        <view
          v-for="j in rows + 1"
          :key="'h' + j"
          class="grid-line-h"
          :style="{ top: paddingPx + (j - 1) * cell + 'px' }"
        />
      </view>

      <!-- 障碍 -->
      <view v-for="(b, idx) in blocks" :key="'b'+idx" class="block" :style="toPxStyle(b.r, b.c)">
        🧱
      </view>

      <!-- 红灯（本关可为空，也保留结构） -->
      <view v-for="(d, idx) in dangers" :key="'d'+idx" class="danger" :style="toPxStyle(d.r, d.c)">
        ❗
      </view>

      <!-- 目标 -->
      <view class="target" :style="toPxStyle(target.r, target.c)">⭐</view>

      <!-- 机器人 -->
      <view class="robot-wrap" :class="{ moving: isMoving }" :style="toPxStyle(robot.r, robot.c)">
        <text class="robot">🤖</text>
        <text class="dir" :style="{ transform: `translate(-50%, -130%) rotate(${robotDir * 90}deg)` }">⬆️</text>
      </view>
    </view>

    <!-- 指令区 -->
    <view class="panel">
      <view class="panel-title">
        指令序列（点可删除）
        <text class="hint">提示：用「循环 AND 到⭐」一条就能过</text>
      </view>

      <view class="cmd-list">
        <template v-for="(cmd, index) in commands" :key="index">
          <!-- ✅ 循环 AND 积木 -->
          <view
            v-if="cmd.type === 'whileNotSuccessAndRule'"
            class="cmd loopand-card"
            @click="removeCommand(index)"
          >
            <view class="loop-head">
              <text class="loop-badge">🔁✅ 循环 AND 到⭐</text>
              <text class="cmd-close">×</text>
            </view>
            <view class="loop-body">
              <view class="sub-cmd">
                <text>
                  while(没到⭐){ if(前方不可走 && 右侧可走)↻右转 else if(前方不可走)↺左转 else ➕前进 }
                </text>
              </view>
            </view>
          </view>

          <!-- ✅ 普通指令 -->
          <view v-else class="cmd" @click="removeCommand(index)">
            <view class="cmd-left">
              <text class="badge and" v-if="cmd.type === 'ifFrontBlockedAndRightFreeTurnRight'">AND</text>
              <text>{{ cmdText(cmd) }}</text>
            </view>
            <text class="cmd-close">×</text>
          </view>
        </template>

        <view class="cmd-placeholder" v-if="commands.length === 0">
          先添加指令，再点「运行」
        </view>
      </view>

      <!-- 操作按钮 -->
      <view class="buttons">
        <view class="btn add" @click="add('move')" :class="{ disabled: isFull || isMoving }">➕ 前进</view>
        <view class="btn turn-left" @click="add('turnLeft')" :class="{ disabled: isFull || isMoving }">↺ 左转</view>
        <view class="btn turn-right" @click="add('turnRight')" :class="{ disabled: isFull || isMoving }">↻ 右转</view>

        <!-- ✅ 本关新知识点：AND -->
        <view class="btn andbtn" @click="add('ifFrontBlockedAndRightFreeTurnRight')" :class="{ disabled: isFull || isMoving }">
          ✅ 前方不可走 且 右侧可走：右转
        </view>

        <!-- ✅ 一键过关（可选） -->
        <view class="btn loopand" @click="add('whileNotSuccessAndRule')" :class="{ disabled: isFull || isMoving }">
          🔁✅ 循环 AND 到⭐
        </view>

        <view class="btn run" @click="run" :class="{ disabled: commands.length === 0 || isMoving }">▶ 运行</view>
        <view class="btn reset" @click="reset" :class="{ disabled: isMoving }">↩ 重来</view>
      </view>

      <view class="rule">
        <text>规则：</text>
        <text>
          撞墙🧱、越界、踩红灯❗ 都算“前方不可走”。
          AND（且）= 两个条件都为真才执行：必须同时满足「前方不可走」并且「右侧可走」，才会右转。
        </text>
      </view>

      <view class="hintbox">
        <text class="hint-title">本关知识点：</text>
        <text>AND：条件A 且 条件B —— 只有 A 和 B 都为真，才会执行。</text>
      </view>
    </view>

    <!-- 通关弹窗 -->
    <view v-if="success" class="success-popup" @touchmove.stop.prevent>
      <view class="success-content">
        <text class="success-text">🎉 通关成功！你会用 AND 组合条件啦</text>
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
      levelId: 45,

      levelProgress: { unlocked: true, stars: 0, bestSteps: null },
      reported: false,

      rows: 5,
      cols: 5,
      paddingPx: 18,
      cell: 0,
      gridReady: false,

      // 起点：左下，朝右
      robot: { r: 4, c: 0 },
      robotStart: { r: 4, c: 0 },
      robotDir: 1,
      robotDirStart: 1,

      // 目标：右上
      target: { r: 0, c: 4 },

      // ✅ 可通关地图：只用一块墙逼你转向
      // 走法（用循环 AND）：底边走到墙前 -> 左转向上 -> 到顶边 -> AND 触发右转 -> 到⭐
      blocks: [
        { r: 4, c: 3 }
      ],
      dangers: [],

      commands: [],
      maxCmd: 12,

      isMoving: false,
      success: false,
      timer: null
    }
  },

  computed: {
    isFull() {
      return this.commands.length >= this.maxCmd
    }
  },

  onLoad() {
    this.loadLevelProgress()
  },

  onReady() {
    this.initGrid()
  },

  onUnload() {
    clearTimeout(this.timer)
  },

  methods: {
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
        console.log('loadLevelProgress failed:', e)
      }
    },

    async reportPass({ steps }) {
      if (this.reported) return
      this.reported = true
      try {
        const stars = 3
        await request({
          url: `/api/game/levels/${this.levelId}/complete`,
          method: 'POST',
          data: { stars, steps, usedTimeMs: 0, usedTimeSec: 0 }
        })

        this.levelProgress.stars = Math.max(this.levelProgress.stars || 0, stars)
        if (this.levelProgress.bestSteps == null) this.levelProgress.bestSteps = steps
        else this.levelProgress.bestSteps = Math.min(this.levelProgress.bestSteps, steps)
      } catch (e) {
        console.log('reportPass failed:', e)
      }
    },

    cmdText(cmd) {
      if (cmd.type === 'move') return '前进'
      if (cmd.type === 'turnLeft') return '左转'
      if (cmd.type === 'turnRight') return '右转'
      if (cmd.type === 'ifFrontBlockedAndRightFreeTurnRight') return '如果(前方不可走 且 右侧可走)：右转'
      if (cmd.type === 'whileNotSuccessAndRule') return '循环 AND 到⭐'
      return cmd.type
    },

    add(type) {
      if (this.isMoving || this.isFull) return
      this.commands.push({ type })
      uni.vibrateShort({ type: 'light' })
    },

    removeCommand(index) {
      if (this.isMoving) return
      this.commands.splice(index, 1)
      uni.vibrateShort({ type: 'light' })
    },

    initGrid() {
      return new Promise(resolve => {
        const q = uni.createSelectorQuery().in(this)
        q.select('.game-area').boundingClientRect(rect => {
          if (!rect) return resolve()
          const usableW = rect.width - this.paddingPx * 2
          const usableH = rect.height - this.paddingPx * 2
          const size = Math.min(usableW, usableH)
          this.cell = size / this.cols
          this.gridReady = true
          resolve()
        }).exec()
      })
    },

    toPxStyle(r, c) {
      const left = this.paddingPx + (c + 0.5) * this.cell
      const top = this.paddingPx + (r + 0.5) * this.cell
      return { left: left + 'px', top: top + 'px' }
    },

    turnLeft() { this.robotDir = (this.robotDir + 3) % 4 },
    turnRight() { this.robotDir = (this.robotDir + 1) % 4 },

    getNextCell() {
      const { r, c } = this.robot
      if (this.robotDir === 0) return { r: r - 1, c }
      if (this.robotDir === 1) return { r, c: c + 1 }
      if (this.robotDir === 2) return { r: r + 1, c }
      return { r, c: c - 1 }
    },

    // dirOffset: 0=前方, 1=右侧, 2=后方, 3=左侧（相对当前朝向）
    getCellByDirOffset(dirOffset) {
      const dir = (this.robotDir + dirOffset) % 4
      const { r, c } = this.robot
      if (dir === 0) return { r: r - 1, c }
      if (dir === 1) return { r, c: c + 1 }
      if (dir === 2) return { r: r + 1, c }
      return { r, c: c - 1 }
    },

    inBounds(cell) {
      return cell.r >= 0 && cell.r < this.rows && cell.c >= 0 && cell.c < this.cols
    },

    isBlocked(cell) {
      return this.blocks.some(b => b.r === cell.r && b.c === cell.c)
    },

    isDanger(cell) {
      return this.dangers.some(d => d.r === cell.r && d.c === cell.c)
    },

    // ✅ 前方不可走 = 越界 或 墙 或 红灯
    frontNotWalkable() {
      const next = this.getCellByDirOffset(0)
      return (!this.inBounds(next)) || this.isBlocked(next) || this.isDanger(next)
    },

    // ✅ 右侧可走 = 在边界内 且 不是墙 且 不是红灯
    rightWalkable() {
      const right = this.getCellByDirOffset(1)
      return this.inBounds(right) && !this.isBlocked(right) && !this.isDanger(right)
    },

    checkSuccess() {
      return this.robot.r === this.target.r && this.robot.c === this.target.c
    },

    // ✅ 一键过关：循环 + AND + 分支
    async execLoopAndRuleUntilSuccess() {
      const SAFE_LIMIT = 80
      let guard = 0

      while (!this.checkSuccess() && guard < SAFE_LIMIT) {
        // AND：两个条件都真才右转
        if (this.frontNotWalkable() && this.rightWalkable()) {
          this.turnRight()
          await this.sleep(220)
        } else if (this.frontNotWalkable()) {
          // 前方不可走但右侧也不通 -> 左转兜底（保证不会卡死）
          this.turnLeft()
          await this.sleep(220)
        } else {
          this.robot = this.getCellByDirOffset(0)
          await this.sleep(340)
        }

        guard++
      }
    },

    async run() {
      if (this.isMoving || this.commands.length === 0) return
      if (!this.gridReady) await this.initGrid()

      this.isMoving = true
      this.success = false
      this.reported = false

      // reset
      this.robot = { ...this.robotStart }
      this.robotDir = this.robotDirStart
      await this.sleep(80)

      let steps = 0

      for (let i = 0; i < this.commands.length; i++) {
        const cmd = this.commands[i]
        steps++

        if (cmd.type === 'turnLeft') {
          this.turnLeft()
          await this.sleep(220)
        } else if (cmd.type === 'turnRight') {
          this.turnRight()
          await this.sleep(220)
        } else if (cmd.type === 'move') {
          const next = this.getNextCell()
          if (!this.inBounds(next)) { uni.showToast({ title: '撞到边界了！', icon: 'none' }); break }
          if (this.isBlocked(next)) { uni.showToast({ title: '撞到墙了！', icon: 'none' }); break }
          if (this.isDanger(next)) { uni.showToast({ title: '踩到红灯❗了！', icon: 'none' }); break }
          this.robot = next
          await this.sleep(340)
        } else if (cmd.type === 'ifFrontBlockedAndRightFreeTurnRight') {
          // ✅ 本关重点：AND
          if (this.frontNotWalkable() && this.rightWalkable()) {
            this.turnRight()
            uni.vibrateShort({ type: 'light' })
          }
          await this.sleep(240)
        } else if (cmd.type === 'whileNotSuccessAndRule') {
          await this.execLoopAndRuleUntilSuccess()
          await this.sleep(80)
        }

        if (this.checkSuccess()) {
          this.success = true
          uni.vibrateLong()
          await this.reportPass({ steps })
          break
        }
      }

      this.isMoving = false
      if (!this.success) {
        uni.showToast({ title: '还没到⭐，再试试～', icon: 'none' })
      }
    },

    reset() {
      if (this.isMoving) return
      this.robot = { ...this.robotStart }
      this.robotDir = this.robotDirStart
      this.commands = []
      this.success = false
      this.reported = false
      uni.vibrateShort({ type: 'light' })
    },

    sleep(ms) {
      return new Promise(resolve => { this.timer = setTimeout(resolve, ms) })
    },

    goBack() { uni.navigateBack({ delta: 1 }) },
    goLevelSelect() { uni.redirectTo({ url: '/pages/game/level-select' }) },
    goNext() { uni.redirectTo({ url: `/pages/game/level/level${this.levelId + 1}` }) }
  }
}
</script>

<style scoped>
.page{
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #89f7fe 100%);
  padding: 40rpx 30rpx;
}
.header{ text-align:center; color:#fff; position:relative; margin-bottom:24rpx; }
.back-btn{
  position:absolute; left:0; top:50%; transform:translateY(-50%);
  width:60rpx; height:60rpx; border-radius:50%;
  background:rgba(255,255,255,0.2);
  display:flex; align-items:center; justify-content:center;
  font-size:32rpx; font-weight:900;
}
.title{ font-size:40rpx; font-weight:900; }
.tip{ display:block; margin-top:10rpx; font-size:26rpx; opacity:0.95; }

.game-area{
  position:relative;
  height:420rpx;
  background:rgba(255,255,255,0.95);
  border-radius:32rpx;
  box-shadow:0 16rpx 40rpx rgba(0,0,0,0.18);
  overflow:hidden;
  border:2rpx solid rgba(255,255,255,0.8);
}
.grid-line-v{ position:absolute; top:0; bottom:0; width:0; border-left:1px dashed rgba(150,150,150,0.35); }
.grid-line-h{ position:absolute; left:0; right:0; height:0; border-top:1px dashed rgba(150,150,150,0.35); }

.robot-wrap,.target,.danger,.block{
  position:absolute;
  transform:translate(-50%,-50%);
  z-index:2;
}
.robot-wrap{ width:64px; height:64px; display:flex; align-items:center; justify-content:center; }
.robot{ font-size:42px; filter: drop-shadow(0 6rpx 12rpx rgba(0,0,0,0.18)); }
.dir{ position:absolute; left:50%; top:50%; font-size:18px; transform-origin:50% 80%; opacity:0.95; }
.robot-wrap.moving{ animation:bounce 0.4s infinite alternate; }
@keyframes bounce{ 0%{ transform: translate(-50%,-50%) translateY(0); } 100%{ transform: translate(-50%,-50%) translateY(-6px); } }

.target{ font-size:42px; z-index:1; filter: drop-shadow(0 8rpx 16rpx rgba(255,235,59,0.35)); }
.danger{ font-size:40px; z-index:1; filter: drop-shadow(0 8rpx 16rpx rgba(255, 59, 59, 0.28)); }
.block{ font-size:38px; opacity:0.95; z-index:1; }

.panel{
  margin-top:24rpx;
  background:rgba(255,255,255,0.95);
  border-radius:32rpx;
  padding:30rpx;
  box-shadow:0 16rpx 40rpx rgba(0,0,0,0.18);
  border:2rpx solid rgba(255,255,255,0.8);
}
.panel-title{ font-size:28rpx; font-weight:900; color:#333; margin-bottom:16rpx; }
.hint{ font-size:22rpx; color:#6b7cff; margin-left:12rpx; }

.cmd-list{
  min-height:90rpx;
  display:flex; flex-wrap:wrap;
  gap:16rpx; align-items:center;
  padding:10rpx;
  border-radius:20rpx;
  background:rgba(248,249,250,0.85);
  margin-bottom:20rpx;
}
.cmd{
  background:linear-gradient(90deg,#e5f0ff 0%,#d1e0ff 100%);
  color:#4f6cff;
  padding:14rpx 18rpx;
  border-radius:24rpx;
  font-size:24rpx;
  font-weight:900;
  display:flex; align-items:center; justify-content:space-between;
  gap:12rpx;
}
.cmd-left{ display:flex; align-items:center; gap:10rpx; }
.badge{
  padding:6rpx 12rpx;
  border-radius:18rpx;
  font-size:20rpx;
  font-weight:900;
  background: rgba(79,108,255,0.12);
}
.badge.and{
  background: rgba(0, 140, 255, 0.14);
  color:#0b5cff;
}
.cmd-close{ font-size:22rpx; opacity:0.7; }
.cmd-placeholder{ width:100%; text-align:center; color:#999; font-size:24rpx; padding:18rpx 0; }

.buttons{ display:flex; flex-wrap:wrap; gap:14rpx; }
.btn{
  flex:1; min-width:30%;
  padding:20rpx 0;
  text-align:center;
  border-radius:48rpx;
  font-size:26rpx;
  font-weight:900;
  box-shadow:0 6rpx 12rpx rgba(0,0,0,0.1);
}
.btn.disabled{ opacity:0.6; pointer-events:none; box-shadow:none; }
.add{ background:linear-gradient(90deg,#edf2ff 0%,#dbe9ff 100%); color:#4f6cff; }
.turn-left{ background:linear-gradient(90deg,#fff3d6 0%,#ffe0b2 100%); color:#c26a00; }
.turn-right{ background:linear-gradient(90deg,#e9fff2 0%,#c9f7de 100%); color:#1b7f4a; }
.andbtn{ background:linear-gradient(90deg,#e6f3ff 0%,#cfe6ff 100%); color:#0b5cff; }
.loopand{ background:linear-gradient(90deg,#dff7ff 0%,#c7f0ff 100%); color:#05647d; }
.run{ background:linear-gradient(90deg,#ff9f43 0%,#ff6b6b 100%); color:#fff; }
.reset{ background:linear-gradient(90deg,#f5f5f5 0%,#e9e9e9 100%); color:#666; }

.rule{ margin-top:12rpx; font-size:22rpx; color:#666; line-height:1.6; }
.hintbox{ margin-top:14rpx; padding:16rpx 18rpx; border-radius:20rpx; background:rgba(11, 92, 255, 0.08); color:#2a3b5b; font-size:24rpx; }
.hint-title{ font-weight:900; margin-right:8rpx; }

/* ✅ 循环 AND 积木 */
.loopand-card{
  width: 100%;
  padding: 16rpx 18rpx;
  border-radius: 24rpx;
  background: linear-gradient(90deg, rgba(11,92,255,0.16) 0%, rgba(11,92,255,0.08) 100%);
  border: 2rpx solid rgba(11,92,255,0.18);
  color: #0b5cff;
}
.loop-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom: 12rpx; }
.loop-badge{ font-size: 26rpx; font-weight: 900; }
.loop-body{ background: rgba(255,255,255,0.65); border-radius: 18rpx; padding: 12rpx; }
.sub-cmd{
  background: rgba(255,255,255,0.75);
  border-radius: 18rpx;
  padding: 12rpx 16rpx;
  font-size: 22rpx;
  font-weight: 900;
  color:#244a87;
}

/* 弹窗 */
.success-popup{
  position:fixed; inset:0;
  background:rgba(0,0,0,0.5);
  display:flex; align-items:center; justify-content:center;
  z-index:100;
  backdrop-filter: blur(6rpx);
}
.success-content{
  width:78vw;
  background:rgba(255,255,255,0.96);
  border-radius:32rpx;
  padding:60rpx 40rpx 44rpx;
  text-align:center;
  box-shadow:0 20rpx 60rpx rgba(0,0,0,0.2);
}
.success-text{
  font-size:42rpx;
  color:#ff6b6b;
  font-weight:900;
  display:block;
  margin-bottom:28rpx;
}
.popup-actions{ display:flex; gap:18rpx; }
.popup-btn{
  flex:1;
  padding:18rpx 0;
  border-radius:26rpx;
  font-size:28rpx;
  font-weight:900;
  box-shadow:0 10rpx 22rpx rgba(0,0,0,0.12);
}
.popup-btn.back{ background:linear-gradient(90deg,#eef2ff 0%,#dbe9ff 100%); color:#4f6cff; }
.popup-btn.next{ background:linear-gradient(90deg,#4f6cff 0%,#667eea 100%); color:#fff; }
</style>
