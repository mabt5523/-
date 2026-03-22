<template>
  <view class="page">
    <view class="header">
      <text class="title">第 47 关：路径规划 🗺️（动态障碍）</text>
      <text class="tip">学习点：循环 + CASE（多分支）= 自适应避障</text>
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

      <!-- 墙 -->
      <view v-for="(b, idx) in blocks" :key="'b'+idx" class="block" :style="toPxStyle(b.r, b.c)">
        🧱
      </view>

      <!-- 动态红灯 -->
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
        <text class="hint">提示：先点循环块里的槽位，再点下面按钮填动作</text>
      </view>

      <view class="cmd-list">
        <template v-for="(cmd, index) in commands" :key="index">
          <!-- ✅ 循环CASE：学生自己填内容 -->
          <view v-if="cmd.type === 'loopCaseEditable'" class="cmd case-card">
            <view class="loop-head">
              <text class="loop-badge">🔁🧩 循环CASE（可编辑）</text>
              <text class="cmd-close" @click.stop="removeCommand(index)">×</text>
            </view>

            <view class="loop-body">
              <view class="slot-row" @click.stop="pickSlot(index,'front')">
                <text class="slot-label">前方可走 →</text>
                <view class="slot-box" :class="{ active: isEditing(index,'front') }">
                  <text v-if="!cmd.slots.front" class="slot-empty">点我选择动作</text>
                  <text v-else class="slot-filled">{{ cmdText(cmd.slots.front) }}</text>
                </view>
              </view>

              <view class="slot-row" @click.stop="pickSlot(index,'right')">
                <text class="slot-label">右侧可走 →</text>
                <view class="slot-box" :class="{ active: isEditing(index,'right') }">
                  <text v-if="!cmd.slots.right" class="slot-empty">点我选择动作</text>
                  <text v-else class="slot-filled">{{ cmdText(cmd.slots.right) }}</text>
                </view>
              </view>

              <view class="slot-row" @click.stop="pickSlot(index,'left')">
                <text class="slot-label">左侧可走 →</text>
                <view class="slot-box" :class="{ active: isEditing(index,'left') }">
                  <text v-if="!cmd.slots.left" class="slot-empty">点我选择动作</text>
                  <text v-else class="slot-filled">{{ cmdText(cmd.slots.left) }}</text>
                </view>
              </view>

              <view class="slot-row" @click.stop="pickSlot(index,'fallback')">
                <text class="slot-label">都不行 →</text>
                <view class="slot-box" :class="{ active: isEditing(index,'fallback') }">
                  <text v-if="!cmd.slots.fallback" class="slot-empty">点我选择动作</text>
                  <text v-else class="slot-filled">{{ cmdText(cmd.slots.fallback) }}</text>
                </view>
              </view>

              <view class="slot-tip">
                玩法：点槽位 → 点按钮（前进/左转/右转）填入；运行时会循环执行直到到达⭐或安全上限。
              </view>
            </view>
          </view>

          <!-- ✅ 普通指令 -->
          <view v-else class="cmd" @click="removeCommand(index)">
            <view class="cmd-left">
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

        <view class="btn casebtn2" @click="addLoopCaseEditable" :class="{ disabled: isFull || isMoving }">
          🔁🧩 循环CASE（可编辑）
        </view>

        <view class="btn run" @click="run" :class="{ disabled: commands.length === 0 || isMoving }">▶ 运行</view>
        <view class="btn reset" @click="reset" :class="{ disabled: isMoving }">↩ 重来</view>
      </view>

      <view class="rule">
        <text>规则：</text>
        <text>
          每次点「运行」会随机刷新红灯❗位置（动态障碍）。
          红灯不能踩；墙/越界也不能走。
          本关保证随机红灯不会把路完全堵死（生成时会校验至少有一条路通到⭐）。
        </text>
      </view>

      <view class="hintbox">
        <text class="hint-title">本关知识点：</text>
        <text>自适应=每一步先判断可走方向，再决定动作。用循环 + CASE 多分支能应对动态障碍。</text>
      </view>
    </view>

    <!-- 通关弹窗 -->
    <view v-if="success" class="success-popup" @touchmove.stop.prevent>
      <view class="success-content">
        <text class="success-text">🎉 通关成功！你会自适应规划啦</text>
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
      levelId: 47,

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

      // ✅ 固定迷宫墙（留出主通路 + 旁路）
      // 设计目标：固定墙制造拐弯；红灯随机但不会“封死”。
      blocks: [
        { r: 3, c: 1 }, { r: 3, c: 2 }, { r: 3, c: 3 },
        { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 1, c: 3 }
      ],

      // 动态红灯（每次 run 刷新）
      dangers: [],
      // 候选点：避开起点/终点/墙；也避免“关键窄口”（通过 BFS 校验兜底）
      dangerCandidates: [
        { r: 4, c: 2 }, { r: 4, c: 3 }, { r: 4, c: 4 },
        { r: 2, c: 0 }, { r: 2, c: 1 }, { r: 2, c: 2 }, { r: 2, c: 3 }, { r: 2, c: 4 },
        { r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }, { r: 0, c: 3 }
      ],
      dangerCount: 2,

      commands: [],
      maxCmd: 14,

      // 正在编辑哪个槽位
      editing: { cmdIndex: null, slotKey: null },

      isMoving: false,
      success: false,
      timer: null
    }
  },

  computed: {
    isFull() { return this.commands.length >= this.maxCmd }
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

    // ================= UI / 指令 =================
    cmdText(cmd) {
      if (!cmd) return ''
      if (cmd.type === 'move') return '前进'
      if (cmd.type === 'turnLeft') return '左转'
      if (cmd.type === 'turnRight') return '右转'
      if (cmd.type === 'loopCaseEditable') return '循环CASE（可编辑）'
      return cmd.type
    },

    addLoopCaseEditable() {
      if (this.isMoving || this.isFull) return
      this.commands.push({
        type: 'loopCaseEditable',
        slots: { front: null, right: null, left: null, fallback: null }
      })
      uni.vibrateShort({ type: 'light' })
    },

    // 如果正在编辑槽位：写入槽位；否则：新增普通指令
    add(type) {
      if (this.isMoving || this.isFull) return

      if (this.editing.cmdIndex != null && this.editing.slotKey) {
        const i = this.editing.cmdIndex
        const k = this.editing.slotKey
        const cmd = this.commands[i]
        if (cmd && cmd.type === 'loopCaseEditable') {
          cmd.slots[k] = { type }
          // 触发响应式
          this.commands.splice(i, 1, { ...cmd, slots: { ...cmd.slots } })
          uni.vibrateShort({ type: 'light' })
          return
        }
      }

      this.commands.push({ type })
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

    removeCommand(index) {
      if (this.isMoving) return
      this.commands.splice(index, 1)
      if (this.editing.cmdIndex === index) this.editing = { cmdIndex: null, slotKey: null }
      uni.vibrateShort({ type: 'light' })
    },

    // ================= 网格 =================
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

    // ================= 运动与判定 =================
    turnLeft() { this.robotDir = (this.robotDir + 3) % 4 },
    turnRight() { this.robotDir = (this.robotDir + 1) % 4 },

    getCellByDir(dir) {
      const { r, c } = this.robot
      if (dir === 0) return { r: r - 1, c }
      if (dir === 1) return { r, c: c + 1 }
      if (dir === 2) return { r: r + 1, c }
      return { r, c: c - 1 }
    },

    // offset: 0前 1右 3左
    getCellByOffset(offset) {
      return this.getCellByDir((this.robotDir + offset) % 4)
    },

    inBounds(cell) {
      return cell.r >= 0 && cell.r < this.rows && cell.c >= 0 && cell.c < this.cols
    },

    isBlocked(cell) {
      return this.blocks.some(b => b.r === cell.r && b.c === cell.c)
    },

    isDanger(cell, dangers = this.dangers) {
      return dangers.some(d => d.r === cell.r && d.c === cell.c)
    },

    canWalk(cell, dangers = this.dangers) {
      return this.inBounds(cell) && !this.isBlocked(cell) && !this.isDanger(cell, dangers)
    },

    checkSuccess() {
      return this.robot.r === this.target.r && this.robot.c === this.target.c
    },

    // ================= 动态红灯（保证不封死） =================
    shuffle(arr) {
      const a = arr.slice()
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[a[i], a[j]] = [a[j], a[i]]
      }
      return a
    },

    neighbors(cell) {
      return [
        { r: cell.r - 1, c: cell.c },
        { r: cell.r + 1, c: cell.c },
        { r: cell.r, c: cell.c - 1 },
        { r: cell.r, c: cell.c + 1 }
      ]
    },

    // BFS：只要存在一条路（忽略朝向）就算“没被堵死”
    hasPathWithDangers(dangers) {
      const start = this.robotStart
      const goal = this.target

      // 起点/终点绝不能被占
      if (this.isDanger(start, dangers) || this.isDanger(goal, dangers)) return false
      if (this.isBlocked(start) || this.isBlocked(goal)) return false

      const key = (p) => `${p.r},${p.c}`
      const q = [start]
      const seen = new Set([key(start)])

      while (q.length) {
        const cur = q.shift()
        if (cur.r === goal.r && cur.c === goal.c) return true
        for (const nb of this.neighbors(cur)) {
          if (!this.inBounds(nb)) continue
          if (this.isBlocked(nb)) continue
          if (this.isDanger(nb, dangers)) continue
          const k = key(nb)
          if (seen.has(k)) continue
          seen.add(k)
          q.push(nb)
        }
      }
      return false
    },

    // 生成红灯：反复抽样直到“存在通路”，最多尝试若干次
    refreshDynamicDangers() {
      const base = this.dangerCandidates
        .filter(p => !(p.r === this.robotStart.r && p.c === this.robotStart.c))
        .filter(p => !(p.r === this.target.r && p.c === this.target.c))
        .filter(p => !this.isBlocked(p))

      const MAX_TRY = 60
      for (let t = 0; t < MAX_TRY; t++) {
        const picked = this.shuffle(base).slice(0, this.dangerCount).map(x => ({ ...x }))
        if (this.hasPathWithDangers(picked)) {
          this.dangers = picked
          return
        }
      }

      // 兜底：如果实在抽不到（理论上很难），就减少红灯数量保证可玩
      const picked1 = this.shuffle(base).slice(0, 1).map(x => ({ ...x }))
      if (this.hasPathWithDangers(picked1)) {
        this.dangers = picked1
        return
      }
      this.dangers = [] // 最兜底：不放红灯
    },

    // ================= 循环CASE 执行（学生填槽位） =================
    async doAction(act, stepCounter) {
      if (!act) return

      if (act.type === 'move') {
        const next = this.getCellByOffset(0)
        if (!this.canWalk(next)) return
        this.robot = next
        stepCounter.count++
        await this.sleep(320)
        return
      }

      if (act.type === 'turnLeft') {
        this.turnLeft()
        stepCounter.count++
        await this.sleep(220)
        return
      }

      if (act.type === 'turnRight') {
        this.turnRight()
        stepCounter.count++
        await this.sleep(220)
        return
      }
    },

    async execLoopCaseEditable(cmd, stepCounter) {
      const SAFE_LIMIT = 140
      let guard = 0

      while (!this.checkSuccess() && guard < SAFE_LIMIT) {
        const front = this.getCellByOffset(0)
        const right = this.getCellByOffset(1)
        const left  = this.getCellByOffset(3)

        if (this.canWalk(front)) {
          await this.doAction(cmd.slots.front, stepCounter)
        } else if (this.canWalk(right)) {
          await this.doAction(cmd.slots.right, stepCounter)
        } else if (this.canWalk(left)) {
          await this.doAction(cmd.slots.left, stepCounter)
        } else {
          await this.doAction(cmd.slots.fallback, stepCounter)
        }

        // 如果槽位没填（doAction 什么都没做），为了避免“原地死循环”，给一个轻微兜底：右转
        if (!cmd.slots.front && !cmd.slots.right && !cmd.slots.left && !cmd.slots.fallback) {
          this.turnRight()
          stepCounter.count++
          await this.sleep(220)
        }

        guard++
      }
    },

    // ================= 运行 =================
    async run() {
      if (this.isMoving || this.commands.length === 0) return
      if (!this.gridReady) await this.initGrid()

      this.isMoving = true
      this.success = false
      this.reported = false

      // ✅ 每次运行刷新动态红灯（且保证不堵死）
      this.refreshDynamicDangers()

      // reset
      this.robot = { ...this.robotStart }
      this.robotDir = this.robotDirStart
      this.editing = { cmdIndex: null, slotKey: null }
      await this.sleep(80)

      const stepCounter = { count: 0 }

      for (let i = 0; i < this.commands.length; i++) {
        const cmd = this.commands[i]

        if (cmd.type === 'turnLeft') {
          this.turnLeft()
          stepCounter.count++
          await this.sleep(220)
        } else if (cmd.type === 'turnRight') {
          this.turnRight()
          stepCounter.count++
          await this.sleep(220)
        } else if (cmd.type === 'move') {
          const next = this.getCellByOffset(0)
          // 自适应关：撞前就停，不判失败（避免体验太挫）
          if (!this.canWalk(next)) continue
          this.robot = next
          stepCounter.count++
          await this.sleep(320)
        } else if (cmd.type === 'loopCaseEditable') {
          await this.execLoopCaseEditable(cmd, stepCounter)
        }

        if (this.checkSuccess()) {
          this.success = true
          uni.vibrateLong()
          await this.reportPass({ steps: stepCounter.count })
          break
        }
      }

      this.isMoving = false
      if (!this.success) {
        uni.showToast({ title: '还没到⭐，再试试～（红灯每次会变）', icon: 'none' })
      }
    },

    reset() {
      if (this.isMoving) return
      this.robot = { ...this.robotStart }
      this.robotDir = this.robotDirStart
      this.commands = []
      this.success = false
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
.casebtn2{ background:linear-gradient(90deg,#fff1d6 0%,#ffe2b8 100%); color:#9a5b00; }
.run{ background:linear-gradient(90deg,#ff9f43 0%,#ff6b6b 100%); color:#fff; }
.reset{ background:linear-gradient(90deg,#f5f5f5 0%,#e9e9e9 100%); color:#666; }

.rule{ margin-top:12rpx; font-size:22rpx; color:#666; line-height:1.6; }
.hintbox{ margin-top:14rpx; padding:16rpx 18rpx; border-radius:20rpx; background:rgba(154, 91, 0, 0.08); color:#5b2a42; font-size:24rpx; }
.hint-title{ font-weight:900; margin-right:8rpx; }

/* ✅ 循环CASE卡片 */
.case-card{
  width: 100%;
  padding: 16rpx 18rpx;
  border-radius: 24rpx;
  background: linear-gradient(90deg, rgba(154,91,0,0.16) 0%, rgba(154,91,0,0.08) 100%);
  border: 2rpx solid rgba(154,91,0,0.18);
  color: #9a5b00;
}
.loop-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom: 12rpx; }
.loop-badge{ font-size: 26rpx; font-weight: 900; }
.loop-body{ background: rgba(255,255,255,0.65); border-radius: 18rpx; padding: 12rpx; }

/* 槽位 */
.slot-row{
  display:flex; align-items:center; gap:12rpx;
  margin-bottom: 12rpx;
}
.slot-label{
  font-size:22rpx; color:#6b4a12; font-weight:900;
  width: 170rpx;
}
.slot-box{
  flex:1;
  border-radius: 18rpx;
  padding: 12rpx 14rpx;
  background: rgba(255,255,255,0.78);
  border: 2rpx dashed rgba(154,91,0,0.25);
}
.slot-box.active{
  border-style: solid;
  border-color: rgba(154,91,0,0.55);
  box-shadow: 0 0 0 6rpx rgba(154,91,0,0.08);
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
</style>
