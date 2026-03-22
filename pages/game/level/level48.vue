<template>
  <view class="page">
    <view class="header">
      <text class="title">第 48 关：函数带参数 F1(n) 📦</text>
      <text class="tip">学习点：参数传递（调用时给 n，函数里用 n）</text>
    </view>

    <!-- 游戏区：5x5 -->
    <view class="game-area">
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

      <!-- 墙 -->
      <view v-for="(b, idx) in blocks" :key="'b'+idx" class="block" :style="toPxStyle(b.r, b.c)">
        🧱
      </view>

      <!-- 红灯 -->
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
        <text>指令编辑：</text>
        <text class="tab" :class="{ on: editTab==='main' }" @click="editTab='main'">主程序</text>
        <text class="tab" :class="{ on: editTab==='f1' }" @click="editTab='f1'">函数 F1</text>
        <text class="hint">提示：在 F1 里用「前进 n 次（参数）」很省槽</text>
      </view>

      <!-- 当前编辑区 -->
      <view class="cmd-box">
        <view class="box-head">
          <text class="box-title">{{ editTab==='main' ? '主程序（运行入口）' : '函数 F1（可用参数 n）' }}</text>
          <text class="box-sub">
            {{ editTab==='main' ? `上限 ${maxMain}` : `上限 ${maxF1}` }}
          </text>
        </view>

        <view class="cmd-list">
          <template v-for="(cmd, index) in currentList" :key="index">
            <!-- ✅ 主程序：调用 F1(n)（可调参数） -->
            <view v-if="cmd.type === 'callF1N'" class="cmd func-card">
              <view class="func-head">
                <view class="cmd-left">
                  <text class="badge f">F1</text>
                  <text>调用 F1(n)</text>
                </view>
                <text class="cmd-close" @click.stop="removeCommand(index)">×</text>
              </view>

              <view class="func-body">
                <view class="n-row">
                  <text class="n-label">n =</text>
                  <view class="n-stepper">
                    <view class="step-btn" @click.stop="decCallN(index)">－</view>
                    <view class="n-value">{{ cmd.n }}</view>
                    <view class="step-btn" @click.stop="incCallN(index)">＋</view>
                  </view>
                  <text class="n-hint">（本次调用传入 {{ cmd.n }}）</text>
                </view>

                <view class="slider-row">
                  <slider
                    :value="cmd.n"
                    :min="1"
                    :max="5"
                    :step="1"
                    @changing="onCallSliderChanging($event, index)"
                    @change="onCallSliderChange($event, index)"
                    activeColor="#4f6cff"
                    backgroundColor="#dbe9ff"
                    blockColor="#4f6cff"
                  />
                  <text class="slider-tip">拖动选择 n（1~5）</text>
                </view>
              </view>
            </view>

            <!-- ✅ 其他普通指令胶囊 -->
            <view v-else class="cmd" @click="removeCommand(index)">
              <view class="cmd-left">
                <text class="badge f" v-if="cmd.type === 'callF1N'">F1</text>
                <text>{{ cmdText(cmd) }}</text>
              </view>
              <text class="cmd-close">×</text>
            </view>
          </template>

          <view class="cmd-placeholder" v-if="currentList.length === 0">
            {{ editTab==='main' ? '先编辑主程序，再运行' : '在这里定义 F1，里面可以用参数 n' }}
          </view>
        </view>
      </view>

      <!-- 操作按钮 -->
      <view class="buttons">
        <view class="btn add" @click="add('move')" :class="{ disabled: isFull || isMoving }">➕ 前进</view>
        <view class="btn turn-left" @click="add('turnLeft')" :class="{ disabled: isFull || isMoving }">↺ 左转</view>
        <view class="btn turn-right" @click="add('turnRight')" :class="{ disabled: isFull || isMoving }">↻ 右转</view>

        <!-- ✅ 仅 F1 可添加：参数动作 -->
        <view
          class="btn param"
          v-if="editTab==='f1'"
          @click="add('moveParam')"
          :class="{ disabled: isFull || isMoving }"
        >⏩ 前进 n 次（参数）</view>

        <!-- ✅ 仅主程序可添加：调用F1(n) -->
        <view
          class="btn fcall"
          v-if="editTab==='main'"
          @click="addCallF1N"
          :class="{ disabled: isFull || isMoving }"
        >📦 调用 F1(n)</view>

        <view class="btn run" @click="run" :class="{ disabled: mainCommands.length === 0 || isMoving }">▶ 运行</view>
        <view class="btn reset" @click="reset" :class="{ disabled: isMoving }">↩ 重来</view>
      </view>

      <view class="rule">
        <text>规则：</text>
        <text>
          「📦 调用 F1(n)」会执行一遍你在“函数 F1”里写好的指令序列，并把 n 传给它。
          在 F1 里，「⏩ 前进 n 次（参数）」会使用传进来的 n（遇到墙/越界/红灯会提前停）。
        </text>
      </view>

      <view class="hintbox">
        <text class="hint-title">本关目标：</text>
        <text>用更少的主程序槽位通关：把套路写进 F1，再用不同 n 多次调用。</text>
      </view>
    </view>

    <!-- 通关弹窗 -->
    <view v-if="success" class="success-popup" @touchmove.stop.prevent>
      <view class="success-content">
        <text class="success-text">🎉 通关成功！你会传参啦</text>
        <view class="popup-actions">
          <view class="popup-btn back" @click="goLevelSelect">回到选关</view>
          <view class="popup-btn next" @click="goNext">下一关 →</view>
        </view>
      </view>
    </view>

    <!-- 失败弹窗（踩红灯） -->
    <view v-if="fail" class="fail-popup" @touchmove.stop.prevent>
      <view class="fail-content">
        <text class="fail-text">😵 踩到红灯了！</text>
        <text class="fail-desc">试试：调整调用时的 n，或在 F1 里先转弯再用参数前进</text>
        <view class="fail-actions">
          <view class="fail-btn" @click="reset">再来一次</view>
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
      levelId: 48,

      levelProgress: { unlocked: true, stars: 0, bestSteps: null },
      reported: false,

      rows: 5,
      cols: 5,
      paddingPx: 18,
      cell: 0,
      gridReady: false,

      // 起点：左下
      robot: { r: 4, c: 0 },
      robotStart: { r: 4, c: 0 },

      // 朝向：向右
      robotDir: 1,
      robotDirStart: 1,

      // 终点：右上
      target: { r: 0, c: 4 },

      // ✅ 地图：通路存在且不会被堵死（固定关）
      // 思路：让“走n步”非常有用：直走一段、拐弯、再走一段。
      blocks: [
        { r: 2, c: 2 },
        { r: 1, c: 0 },
        { r: 3, c: 3 }
      ],
      dangers: [
        { r: 4, c: 4 },
        { r: 1, c: 4 }
      ],

      // 两套指令
      mainCommands: [],
      f1Commands: [],

      maxMain: 10,
      maxF1: 10,

      editTab: 'main', // main | f1

      isMoving: false,
      success: false,
      fail: false,
      timer: null
    }
  },

  computed: {
    currentList() {
      return this.editTab === 'main' ? this.mainCommands : this.f1Commands
    },
    isFull() {
      return this.editTab === 'main'
        ? this.mainCommands.length >= this.maxMain
        : this.f1Commands.length >= this.maxF1
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

    cmdText(cmd) {
      if (cmd.type === 'move') return '前进'
      if (cmd.type === 'turnLeft') return '左转'
      if (cmd.type === 'turnRight') return '右转'
      if (cmd.type === 'moveParam') return '前进 n 次（参数）'
      if (cmd.type === 'callF1N') return `调用 F1(${cmd.n})`
      return cmd.type
    },

    clampN(n) {
      return Math.max(1, Math.min(5, Number(n || 1)))
    },

    add(type) {
      if (this.isMoving || this.isFull) return

      // ✅ 主程序不能加 moveParam（只在 F1 用）
      if (type === 'moveParam' && this.editTab !== 'f1') return

      // ✅ 主程序不能用普通 callF1（本关只用带参 callF1N）
      if ((type === 'callF1' || type === 'callF1N') && this.editTab !== 'main') return

      this.currentList.push({ type })
      uni.vibrateShort({ type: 'light' })
    },

    addCallF1N() {
      if (this.isMoving || this.isFull) return
      if (this.editTab !== 'main') return
      this.mainCommands.push({ type: 'callF1N', n: 3 })
      uni.vibrateShort({ type: 'light' })
    },

    incCallN(index) {
      if (this.isMoving) return
      const cmd = this.mainCommands[index]
      if (!cmd || cmd.type !== 'callF1N') return
      cmd.n = this.clampN(cmd.n + 1)
      this.mainCommands.splice(index, 1, { ...cmd })
      uni.vibrateShort({ type: 'light' })
    },

    decCallN(index) {
      if (this.isMoving) return
      const cmd = this.mainCommands[index]
      if (!cmd || cmd.type !== 'callF1N') return
      cmd.n = this.clampN(cmd.n - 1)
      this.mainCommands.splice(index, 1, { ...cmd })
      uni.vibrateShort({ type: 'light' })
    },

    onCallSliderChanging(e, index) {
      const cmd = this.mainCommands[index]
      if (!cmd || cmd.type !== 'callF1N') return
      cmd.n = this.clampN(e.detail.value)
      this.mainCommands.splice(index, 1, { ...cmd })
    },

    onCallSliderChange(e, index) {
      const cmd = this.mainCommands[index]
      if (!cmd || cmd.type !== 'callF1N') return
      cmd.n = this.clampN(e.detail.value)
      this.mainCommands.splice(index, 1, { ...cmd })
      uni.vibrateShort({ type: 'light' })
    },

    removeCommand(index) {
      if (this.isMoving) return
      this.currentList.splice(index, 1)
      uni.vibrateShort({ type: 'light' })
    },

    turnLeft() {
      this.robotDir = (this.robotDir + 3) % 4
    },
    turnRight() {
      this.robotDir = (this.robotDir + 1) % 4
    },

    getNextCell() {
      const { r, c } = this.robot
      if (this.robotDir === 0) return { r: r - 1, c }
      if (this.robotDir === 1) return { r, c: c + 1 }
      if (this.robotDir === 2) return { r: r + 1, c }
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

    checkSuccess() {
      return this.robot.r === this.target.r && this.robot.c === this.target.c
    },

    async stepMoveOnce() {
      const next = this.getNextCell()
      if (!this.inBounds(next)) {
        uni.showToast({ title: '撞到边界了！', icon: 'none' })
        return false
      }
      if (this.isBlocked(next)) {
        uni.showToast({ title: '撞到墙了！', icon: 'none' })
        return false
      }
      if (this.isDanger(next)) {
        this.fail = true
        uni.vibrateLong()
        return false
      }
      this.robot = next
      await this.sleep(380)
      return true
    },

    // ✅ 执行 F1（带参数 n）
    async execF1WithParam(n, stepCounter) {
      const paramN = this.clampN(n)

      for (let i = 0; i < this.f1Commands.length; i++) {
        const cmd = this.f1Commands[i]

        if (cmd.type === 'turnLeft') {
          this.turnLeft()
          stepCounter.count++
          await this.sleep(220)
        } else if (cmd.type === 'turnRight') {
          this.turnRight()
          stepCounter.count++
          await this.sleep(220)
        } else if (cmd.type === 'move') {
          const ok = await this.stepMoveOnce()
          stepCounter.count++
          if (!ok) return false
        } else if (cmd.type === 'moveParam') {
          // ✅ 关键：用参数 n 来循环前进
          for (let k = 0; k < paramN; k++) {
            const ok = await this.stepMoveOnce()
            stepCounter.count++
            if (!ok) return false
            if (this.checkSuccess()) return true
          }
        }

        if (this.checkSuccess()) return true
      }

      return true
    },

    async run() {
      if (this.isMoving || this.mainCommands.length === 0) return
      if (!this.gridReady) await this.initGrid()

      this.isMoving = true
      this.success = false
      this.fail = false
      this.reported = false

      this.robot = { ...this.robotStart }
      this.robotDir = this.robotDirStart
      await this.sleep(80)

      const stepCounter = { count: 0 }

      for (let i = 0; i < this.mainCommands.length; i++) {
        const cmd = this.mainCommands[i]

        if (cmd.type === 'turnLeft') {
          this.turnLeft()
          stepCounter.count++
          await this.sleep(220)
        } else if (cmd.type === 'turnRight') {
          this.turnRight()
          stepCounter.count++
          await this.sleep(220)
        } else if (cmd.type === 'move') {
          const ok = await this.stepMoveOnce()
          stepCounter.count++
          if (!ok) break
        } else if (cmd.type === 'callF1N') {
          const ok = await this.execF1WithParam(cmd.n, stepCounter)
          if (!ok) break
        }

        if (this.checkSuccess()) {
          this.success = true
          uni.vibrateLong()
          await this.reportPass({ steps: stepCounter.count })
          break
        }
      }

      this.isMoving = false
      if (!this.success && !this.fail) {
        uni.showToast({ title: '还没到⭐，试试改 n 或优化 F1～', icon: 'none' })
      }
    },

    reset() {
      if (this.isMoving) return
      this.robot = { ...this.robotStart }
      this.robotDir = this.robotDirStart
      this.mainCommands = []
      this.f1Commands = []
      this.editTab = 'main'
      this.success = false
      this.fail = false
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
.panel-title{
  font-size:28rpx; font-weight:900; color:#333; margin-bottom:16rpx;
  display:flex; flex-wrap:wrap; align-items:center; gap:12rpx;
}
.tab{
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(79,108,255,0.12);
  color:#4f6cff;
  font-size: 22rpx;
  font-weight: 900;
}
.tab.on{
  background: linear-gradient(90deg, #4f6cff 0%, #667eea 100%);
  color:#fff;
}
.hint{ font-size:22rpx; color:#6b7cff; margin-left:6rpx; }

.cmd-box{
  background: rgba(248,249,250,0.8);
  border-radius: 24rpx;
  padding: 18rpx;
  margin-bottom: 18rpx;
}
.box-head{ display:flex; justify-content:space-between; align-items:center; margin-bottom: 12rpx; }
.box-title{ font-size:24rpx; font-weight:900; color:#333; }
.box-sub{ font-size:22rpx; color:#666; }

.cmd-list{
  min-height: 90rpx;
  display:flex;
  flex-wrap:wrap;
  gap:16rpx;
  align-items:center;
  padding: 10rpx;
  border-radius: 20rpx;
  background: rgba(255,255,255,0.75);
}

.cmd{
  background: linear-gradient(90deg, #e5f0ff 0%, #d1e0ff 100%);
  color:#4f6cff;
  padding: 14rpx 18rpx;
  border-radius: 24rpx;
  font-size: 24rpx;
  font-weight: 900;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap: 10rpx;
}
.cmd-left{ display:flex; align-items:center; gap:10rpx; }
.cmd-close{ font-size:22rpx; opacity:0.7; }

.badge{
  padding:6rpx 12rpx;
  border-radius: 18rpx;
  font-size:20rpx;
  font-weight:900;
}
.badge.f{ background: rgba(185,22,92,0.14); color:#b9165c; }

.cmd-placeholder{
  width:100%;
  text-align:center;
  color:#999;
  font-size:24rpx;
  padding:18rpx 0;
}

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
.param{ background:linear-gradient(90deg,#fff1d6 0%,#ffe2b8 100%); color:#9a5b00; }
.fcall{ background:linear-gradient(90deg,#ffe9f2 0%,#ffd1e6 100%); color:#b9165c; }
.run{ background:linear-gradient(90deg,#ff9f43 0%,#ff6b6b 100%); color:#fff; }
.reset{ background:linear-gradient(90deg,#f5f5f5 0%,#e9e9e9 100%); color:#666; }

.rule{ margin-top: 12rpx; font-size: 22rpx; color:#666; line-height: 1.6; }
.hintbox{ margin-top: 14rpx; padding: 16rpx 18rpx; border-radius: 20rpx; background: rgba(79,108,255,0.08); color:#2b3a66; font-size: 24rpx; }
.hint-title{ font-weight: 900; margin-right: 8rpx; }

/* ✅ 调用F1(n)卡片 */
.func-card{
  width: 100%;
  padding: 16rpx 18rpx;
  border-radius: 24rpx;
  background: linear-gradient(90deg, rgba(79,108,255,0.14) 0%, rgba(79,108,255,0.08) 100%);
  border: 2rpx solid rgba(79,108,255,0.18);
  color: #4f6cff;
}
.func-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom: 12rpx; }
.func-body{ background: rgba(255,255,255,0.65); border-radius: 18rpx; padding: 12rpx; }

.n-row{ display:flex; align-items:center; gap:12rpx; margin-bottom: 10rpx; flex-wrap:wrap; }
.n-label{ font-size:24rpx; font-weight:900; color:#2b3a66; }
.n-stepper{ display:flex; align-items:center; gap:10rpx; }
.step-btn{
  width:64rpx; height:56rpx;
  border-radius:16rpx;
  background: rgba(255,255,255,0.8);
  display:flex; align-items:center; justify-content:center;
  font-size:30rpx; font-weight:900;
  border:2rpx solid rgba(79,108,255,0.22);
}
.n-value{
  width:78rpx; height:56rpx;
  border-radius:16rpx;
  background: rgba(255,255,255,0.85);
  display:flex; align-items:center; justify-content:center;
  font-size:26rpx; font-weight:900;
  border:2rpx solid rgba(79,108,255,0.18);
  color:#4f6cff;
}
.n-hint{ font-size:22rpx; color:#4a5a8a; }

.slider-row{ margin-top: 6rpx; }
.slider-tip{ font-size:20rpx; color:#6b7cff; margin-top: 6rpx; display:block; }

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

/* 失败弹窗 */
.fail-popup{
  position:fixed; inset:0;
  background:rgba(0,0,0,0.55);
  display:flex; align-items:center; justify-content:center;
  z-index:110;
  backdrop-filter: blur(6rpx);
}
.fail-content{
  width:78vw;
  background:rgba(255,255,255,0.96);
  border-radius:32rpx;
  padding:54rpx 40rpx 40rpx;
  text-align:center;
  box-shadow:0 20rpx 60rpx rgba(0,0,0,0.2);
}
.fail-text{
  font-size:42rpx;
  color:#ff4d4f;
  font-weight:900;
  display:block;
  margin-bottom:12rpx;
}
.fail-desc{
  display:block;
  font-size:24rpx;
  color:#666;
  margin-bottom:22rpx;
}
.fail-actions{ display:flex; justify-content:center; }
.fail-btn{
  width: 60%;
  padding: 18rpx 0;
  border-radius: 26rpx;
  font-size: 28rpx;
  font-weight: 900;
  background: linear-gradient(90deg,#ff9f43 0%,#ff6b6b 100%);
  color:#fff;
  box-shadow:0 10rpx 22rpx rgba(0,0,0,0.12);
}
.fail-btn:active{ transform: scale(0.97); }
</style>
