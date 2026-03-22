<template>
  <view class="page">
    <view class="header">
      <text class="title">第 49 关：函数返回值 Return ✅/❌</text>
      <text class="tip">学习点：return true/false（函数能“问问题”）</text>
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
      <view v-for="(b, idx) in blocks" :key="'b'+idx" class="block" :style="toPxStyle(b.r, b.c)">🧱</view>

      <!-- 红灯 -->
      <view v-for="(d, idx) in dangers" :key="'d'+idx" class="danger" :style="toPxStyle(d.r, d.c)">❗</view>

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
        <text class="hint">提示：F1 只负责“判断并 return”，主程序负责动作</text>
      </view>

      <!-- 当前编辑区 -->
      <view class="cmd-box">
        <view class="box-head">
          <text class="box-title">{{ editTab==='main' ? '主程序（运行入口）' : '函数 F1（返回 true/false）' }}</text>
          <text class="box-sub">{{ editTab==='main' ? `上限 ${maxMain}` : `上限 ${maxF1}` }}</text>
        </view>

        <view class="cmd-list">
          <template v-for="(cmd, index) in currentList" :key="index">
            <!-- ✅ 主程序：If F1 then ... else ...（学生自己填两个槽位） -->
            <view v-if="cmd.type === 'ifF1ThenElse'" class="cmd if-card">
              <view class="if-head">
                <text class="if-badge">🧠 如果 F1 为真</text>
                <text class="cmd-close" @click.stop="removeCommand(index)">×</text>
              </view>

              <view class="if-body">
                <view class="slot-row" @click.stop="pickSlot(index,'then')">
                  <text class="slot-label">那么 →</text>
                  <view class="slot-box" :class="{ active: isEditing(index,'then') }">
                    <text v-if="!cmd.slots.then" class="slot-empty">点我选择动作</text>
                    <text v-else class="slot-filled">{{ cmdText(cmd.slots.then) }}</text>
                  </view>
                </view>

                <view class="slot-row" @click.stop="pickSlot(index,'else')">
                  <text class="slot-label">否则 →</text>
                  <view class="slot-box" :class="{ active: isEditing(index,'else') }">
                    <text v-if="!cmd.slots.else" class="slot-empty">点我选择动作</text>
                    <text v-else class="slot-filled">{{ cmdText(cmd.slots.else) }}</text>
                  </view>
                </view>

                <view class="slot-tip">
                  玩法：先点槽位 → 再点下方按钮填动作（推荐：真→前进；假→右转）
                </view>
              </view>
            </view>

            <!-- ✅ 普通指令 -->
            <view v-else class="cmd" @click="removeCommand(index)">
              <view class="cmd-left">
                <text class="badge f" v-if="cmd.type === 'callF1'">F1</text>
                <text class="badge r" v-if="cmd.type === 'returnTrue' || cmd.type === 'returnFalse'">RET</text>
                <text>{{ cmdText(cmd) }}</text>
              </view>
              <text class="cmd-close">×</text>
            </view>
          </template>

          <view class="cmd-placeholder" v-if="currentList.length === 0">
            {{ editTab==='main' ? '先编辑主程序，再运行' : '在这里定义 F1：用 return true/false 返回判断结果' }}
          </view>
        </view>
      </view>

      <!-- 操作按钮 -->
      <view class="buttons">
        <view class="btn add" @click="add('move')" :class="{ disabled: isFull || isMoving }">➕ 前进</view>
        <view class="btn turn-left" @click="add('turnLeft')" :class="{ disabled: isFull || isMoving }">↺ 左转</view>
        <view class="btn turn-right" @click="add('turnRight')" :class="{ disabled: isFull || isMoving }">↻ 右转</view>

        <!-- ✅ 主程序新增：ifF1ThenElse（可编辑两个槽位） -->
        <view
          class="btn ifbtn"
          v-if="editTab==='main'"
          @click="addIfF1"
          :class="{ disabled: isFull || isMoving }"
        >🧠 如果 F1 为真/否则</view>

        <!-- ✅ F1 新增：Return -->
        <view
          class="btn retT"
          v-if="editTab==='f1'"
          @click="add('returnTrue')"
          :class="{ disabled: isFull || isMoving }"
        >✅ return true</view>

        <view
          class="btn retF"
          v-if="editTab==='f1'"
          @click="add('returnFalse')"
          :class="{ disabled: isFull || isMoving }"
        >❌ return false</view>

        <!-- ✅ F1 允许放“判断积木”：前方可走？ -->
        <view
          class="btn pred"
          v-if="editTab==='f1'"
          @click="add('predFrontWalkable')"
          :class="{ disabled: isFull || isMoving }"
        >🔎 判断：前方可走？</view>

        <view class="btn run" @click="run" :class="{ disabled: mainCommands.length === 0 || isMoving }">▶ 运行</view>
        <view class="btn reset" @click="reset" :class="{ disabled: isMoving }">↩ 重来</view>
      </view>

      <view class="rule">
        <text>规则：</text>
        <text>
          F1 是“探路函数”：它会执行你在 F1 里写的判断逻辑，并在遇到 return 时立刻返回 true/false。
          主程序里的「如果 F1 为真/否则」会根据返回值执行不同动作。
          红灯❗不能踩；撞墙🧱或越界会停止。
        </text>
      </view>

      <view class="hintbox">
        <text class="hint-title">推荐通关思路：</text>
        <text>F1：判断前方可走？可走就 return true，否则 return false。主程序：如果真→前进，否则→右转（循环写几次）。</text>
      </view>
    </view>

    <!-- 通关弹窗 -->
    <view v-if="success" class="success-popup" @touchmove.stop.prevent>
      <view class="success-content">
        <text class="success-text">🎉 通关成功！你会用 return 啦</text>
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
        <text class="fail-desc">试试：让 F1 更准确（前方不可走就 return false），主程序用 else 转向</text>
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
      levelId: 49,

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

      // ✅ 地图：保证有路，不会被墙/红灯堵死
      // 设计：中间墙制造拐弯；红灯逼你用“探路+转向”
      blocks: [
        { r: 3, c: 2 }, // 底部拦一下，逼你转向
        { r: 2, c: 2 }, // 形成竖向障碍
        { r: 1, c: 1 }, // 顶部拐弯引导
        { r: 1, c: 3 }  // 避免直冲到终点旁
      ],
      dangers: [
        { r: 4, c: 3 }, // 底边红灯：一路直走会踩
        { r: 2, c: 4 }  // 右侧红灯：逼你提前转
      ],

      // 两套指令
      mainCommands: [],
      f1Commands: [],

      maxMain: 14,
      maxF1: 10,

      editTab: 'main', // main | f1

      // if积木槽位编辑
      editing: { cmdIndex: null, slotKey: null },

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

  onLoad() { this.loadLevelProgress() },
  onReady() { this.initGrid() },
  onUnload() { clearTimeout(this.timer) },

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

    // ================= 指令文案 =================
    cmdText(cmd) {
      if (!cmd) return ''
      if (cmd.type === 'move') return '前进'
      if (cmd.type === 'turnLeft') return '左转'
      if (cmd.type === 'turnRight') return '右转'
      if (cmd.type === 'ifF1ThenElse') return '如果F1为真/否则'
      if (cmd.type === 'predFrontWalkable') return '判断：前方可走？'
      if (cmd.type === 'returnTrue') return 'return true'
      if (cmd.type === 'returnFalse') return 'return false'
      if (cmd.type === 'callF1') return '调用 F1'
      return cmd.type
    },

    // ================= UI 编辑：if槽位 =================
    addIfF1() {
      if (this.isMoving || this.isFull) return
      if (this.editTab !== 'main') return
      this.mainCommands.push({
        type: 'ifF1ThenElse',
        slots: { then: null, else: null }
      })
      uni.vibrateShort({ type: 'light' })
    },

    pickSlot(cmdIndex, slotKey) {
      if (this.isMoving) return
      this.editing = { cmdIndex, slotKey }
      uni.vibrateShort({ type: 'light' })
    },

    isEditing(i, k) {
      return this.editing.cmdIndex === i && this.editing.slotKey === k
    },

    // ================= 添加指令：支持“填槽位” =================
    add(type) {
      if (this.isMoving || this.isFull) return

      // 主程序：不能直接放 return/pred
      if (this.editTab === 'main' && (type === 'returnTrue' || type === 'returnFalse' || type === 'predFrontWalkable')) {
        return
      }
      // F1：不能放 ifF1ThenElse
      if (this.editTab === 'f1' && type === 'ifF1ThenElse') return

      // 如果正在编辑 if 槽位：把动作写进槽位，不新增胶囊
      if (this.editTab === 'main' && this.editing.cmdIndex != null && this.editing.slotKey) {
        const idx = this.editing.cmdIndex
        const cmd = this.mainCommands[idx]
        if (cmd && cmd.type === 'ifF1ThenElse') {
          // 槽位只允许动作（move/turn）
          if (type === 'move' || type === 'turnLeft' || type === 'turnRight') {
            cmd.slots[this.editing.slotKey] = { type }
            this.mainCommands.splice(idx, 1, { ...cmd, slots: { ...cmd.slots } })
            uni.vibrateShort({ type: 'light' })
            return
          }
        }
      }

      this.currentList.push({ type })
      uni.vibrateShort({ type: 'light' })
    },

    removeCommand(index) {
      if (this.isMoving) return
      this.currentList.splice(index, 1)
      if (this.editing.cmdIndex === index) this.editing = { cmdIndex: null, slotKey: null }
      uni.vibrateShort({ type: 'light' })
    },

    // ================= 运动判定 =================
    turnLeft() { this.robotDir = (this.robotDir + 3) % 4 },
    turnRight() { this.robotDir = (this.robotDir + 1) % 4 },

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

    // ================= 执行动作 =================
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
      await this.sleep(360)
      return true
    },

    // ✅ F1 执行：返回 true/false（遇到 return 立即结束）
    // 约定：predFrontWalkable 会把“判断结果”写入一个临时寄存器 lastPred
    async execF1ReturnBool() {
      // 1) 找到“判断：前方可走？”
      let pred = null
      for (const cmd of this.f1Commands) {
        if (cmd.type === 'predFrontWalkable') {
          const n = this.getNextCell()
          pred = this.inBounds(n) && !this.isBlocked(n) && !this.isDanger(n) // ✅ 红灯也算不可走
          break
        }
      }
    
      // 没有判断就默认 false（更安全）
      if (pred === null) return false
    
      // 2) 把 return true/false 当成 if/else 的两个分支
      for (const cmd of this.f1Commands) {
        if (cmd.type === 'returnTrue') {
          if (pred === true) return true   // ✅ 只有判断为真才返回 true
        }
        if (cmd.type === 'returnFalse') {
          if (pred === false) return false // ✅ 只有判断为假才返回 false
        }
      }
    
      // 3) 如果学生忘了放 return，就兜底返回 pred
      return pred
    },



    // ✅ 主程序 ifF1ThenElse：执行 then/else 一个动作
    async execActionOnce(action, stepCounter) {
      if (!action) return true

      if (action.type === 'turnLeft') {
        this.turnLeft()
        stepCounter.count++
        await this.sleep(220)
        return true
      }
      if (action.type === 'turnRight') {
        this.turnRight()
        stepCounter.count++
        await this.sleep(220)
        return true
      }
      if (action.type === 'move') {
        const ok = await this.stepMoveOnce()
        stepCounter.count++
        return ok
      }

      return true
    },

    // ================= 运行 =================
    async run() {
      if (this.isMoving || this.mainCommands.length === 0) return
      if (!this.gridReady) await this.initGrid()

      this.isMoving = true
      this.success = false
      this.fail = false
      this.reported = false
      this.editing = { cmdIndex: null, slotKey: null }

      // reset
      this.robot = { ...this.robotStart }
      this.robotDir = this.robotDirStart
      await this.sleep(80)

      const stepCounter = { count: 0 }

      // 为了让“自适应”体现出来：允许主程序多放几个 if 块来循环判断
      // 这里设置一个安全上限，避免写坏死循环的体验
      const SAFE_LIMIT = 80
      let guard = 0

      for (let i = 0; i < this.mainCommands.length && guard < SAFE_LIMIT; i++, guard++) {
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
        } else if (cmd.type === 'ifF1ThenElse') {
          const ret = await this.execF1ReturnBool()
          const act = ret ? cmd.slots.then : cmd.slots.else
          // 槽位为空：给一个兜底（否则容易卡住）
          const fallback = ret ? { type: 'move' } : { type: 'turnRight' }
          const ok = await this.execActionOnce(act || fallback, stepCounter)
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
        uni.showToast({ title: '还没到⭐，试试完善 F1 的 return！', icon: 'none' })
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
      this.editing = { cmdIndex: null, slotKey: null }
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
.badge.r{ background: rgba(20,184,166,0.16); color:#0f766e; }

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
.ifbtn{ background:linear-gradient(90deg,#ffe9f2 0%,#ffd1e6 100%); color:#b9165c; }
.retT{ background:linear-gradient(90deg,#e9fff2 0%,#c9f7de 100%); color:#1b7f4a; }
.retF{ background:linear-gradient(90deg,#ffecec 0%,#ffd1d1 100%); color:#b91c1c; }
.pred{ background:linear-gradient(90deg,#fff1d6 0%,#ffe2b8 100%); color:#9a5b00; }
.run{ background:linear-gradient(90deg,#ff9f43 0%,#ff6b6b 100%); color:#fff; }
.reset{ background:linear-gradient(90deg,#f5f5f5 0%,#e9e9e9 100%); color:#666; }

.rule{ margin-top: 12rpx; font-size: 22rpx; color:#666; line-height: 1.6; }
.hintbox{ margin-top: 14rpx; padding: 16rpx 18rpx; border-radius: 20rpx; background: rgba(185,22,92,0.08); color:#5b2a42; font-size: 24rpx; }
.hint-title{ font-weight: 900; margin-right: 8rpx; }

/* ✅ if卡片（学生填槽位） */
.if-card{
  width: 100%;
  padding: 16rpx 18rpx;
  border-radius: 24rpx;
  background: linear-gradient(90deg, rgba(185,22,92,0.16) 0%, rgba(185,22,92,0.08) 100%);
  border: 2rpx solid rgba(185,22,92,0.18);
  color: #b9165c;
}
.if-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom: 12rpx; }
.if-badge{ font-size: 26rpx; font-weight: 900; }
.if-body{ background: rgba(255,255,255,0.65); border-radius: 18rpx; padding: 12rpx; }

.slot-row{ display:flex; align-items:center; gap:12rpx; margin-bottom: 12rpx; }
.slot-label{ font-size:22rpx; color:#6b4a12; font-weight:900; width: 140rpx; }
.slot-box{
  flex:1;
  border-radius: 18rpx;
  padding: 12rpx 14rpx;
  background: rgba(255,255,255,0.78);
  border: 2rpx dashed rgba(185,22,92,0.25);
}
.slot-box.active{
  border-style: solid;
  border-color: rgba(185,22,92,0.55);
  box-shadow: 0 0 0 6rpx rgba(185,22,92,0.08);
}
.slot-empty{ color:#8792a0; font-size:22rpx; }
.slot-filled{ color:#4f6cff; font-size:24rpx; font-weight:900; }
.slot-tip{ margin-top: 6rpx; font-size: 20rpx; color:#8a6a3a; }

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
