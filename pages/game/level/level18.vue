<template>
  <view class="page">
    <!-- 顶部：标题 + HUD（固定） -->
    <view class="top">
      <view class="header">
        <text class="title">第 18 关：简单流程图 🧩</text>
        <text class="tip">任务：把步骤按正确顺序放进流程图（开始 → … → 结束）</text>
      </view>

      <view class="hud">
        <text class="badge">✅ 已放对：{{ correctCount }}/{{ needCount }}</text>
        <text class="small">⏱ 用时：{{ formatTime(elapsedMs) }}</text>
      </view>
    </view>

    <!-- 中间：左右结构（一屏可见，不滚动） -->
    <view class="main">
      <view class="board-bg" />

      <!-- 左：流程图 -->
      <view class="left">
        <view class="hintbar">
          <text class="hinttext">把右边步骤卡片拖到对应槽位，全部正确就通关！</text>
        </view>

        <view class="flow-area">
          <view class="flow-title">流程图</view>

          <view class="slot-list">
            <view
              class="slot-card"
              v-for="(slot, idx) in slots"
              :key="slot.id"
              :id="'slot-' + slot.id"
            >
              <view class="slot-head">
                <text class="slot-index">{{ idx + 1 }}</text>
               
              </view>

              <view class="slot-body">
                <view
                  class="placed-card"
                  v-if="slot.placedKey"
                  :class="{ ok: slot.correct }"
                  @click="removeFromSlot(slot.id)"
                >
                  <text class="emoji">{{ stepByKey(slot.placedKey).emoji }}</text>
                  <text class="pname">{{ stepByKey(slot.placedKey).name }}</text>
                  <text class="mini">点我拿回</text>
                </view>

                <view class="empty" v-else>
                  <text class="empty-text">拖到这里</text>
                </view>
              </view>

              <view class="arrow" v-if="idx < slots.length - 1">
                <text class="arrow-icon">⬇️</text>
              </view>
            </view>
          </view>

          <view class="flow-footer">
            <text class="round-title">题目：{{ roundTitle }}</text>
            <text class="round-tip">提示：点已放入的卡片可拿回</text>
          </view>
        </view>
      </view>

      <!-- 右：可拖拽组件（步骤卡） -->
      <view class="right">
        <view class="steps-area">
          <view class="steps-title">步骤卡片（拖到左边）</view>

          <view class="steps-grid">
            <view
              class="step-card"
              v-for="it in steps"
              :key="it.key"
              :class="{ used: usedMap[it.key], dragging: draggingKey === it.key }"
              :style="cardStyle(it.key)"
              @touchstart="startDrag(it.key, $event)"
              @touchmove="onDrag(it.key, $event)"
              @touchend="endDrag(it.key)"
            >
              <text class="emoji">{{ it.emoji }}</text>
              <text class="name">{{ it.name }}</text>
            </view>
          </view>

          <view class="stat">
            <text class="stat-item">❌ 错误：{{ wrongDrops }}</text>
            <text class="stat-item">🧩 已放：{{ placedCount }}/{{ needCount }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部按钮（固定可见） -->
    <view class="actions">
      <view class="btn reset" @click="reset" :class="{ disabled: isMoving }">↩ 重新开始</view>
      <view class="btn next" :class="{ disabled: !success }" @click="goNext">下一关 →</view>
    </view>

    <!-- 成功弹窗 -->
    <view v-if="success" class="popup" @touchmove.stop.prevent>
      <view class="popup-card">
        <text class="pop-title">🎉 通关成功！</text>
        <text class="pop-desc">
          你学会了：流程图可以表示“按顺序做事情”！
          <text class="linebreak" />
          用时：{{ formatTime(elapsedMs) }}，星星：{{ earnedStars }}⭐
        </text>
        <view class="pop-actions">
          <view class="pop-btn" @click="reset">再玩一次</view>
          <view class="pop-btn primary" @click="goNext">下一关 →</view>
        </view>
      </view>
    </view>

    <!-- 轻提示 -->
    <view v-if="toast.show" class="mini-toast">
      <text>{{ toast.text }}</text>
    </view>
  </view>
</template>

<script>
import request from '@/common/request.js'

export default {
  data() {
    return {
      levelId: 18,

      // 后端进度
      levelProgress: { unlocked: true, stars: 0, bestSteps: null },
      reported: false,

      // 计时
      elapsedMs: 0,
      clock: null,
      startAt: 0,

      // 拖拽（fixed 跟随手指）
      draggingKey: null,
      offsetX: 0,
      offsetY: 0,
      dragX: 0,
      dragY: 0,

      // 状态
      isMoving: false,
      toast: { show: false, text: '' },
      earnedStars: 0,
      wrongDrops: 0,

      // 题库（随机抽取）
      pool: [
        {
          id: 'morning',
          title: '早晨到校流程',
          slots: [
            { label: '开始', correct: 'start' },
            { label: '进校门', correct: 'gate' },
            { label: '去教室', correct: 'class' },
            { label: '坐好准备', correct: 'sit' },
            { label: '结束', correct: 'end' }
          ],
          steps: [
            { key: 'start', name: '开始', emoji: '🟢' },
            { key: 'gate', name: '进校门', emoji: '🏫' },
            { key: 'class', name: '去教室', emoji: '🚶' },
            { key: 'sit', name: '坐好准备', emoji: '🪑' },
            { key: 'end', name: '结束', emoji: '🔴' }
          ]
        },
        {
          id: 'wash',
          title: '洗手流程',
          slots: [
            { label: '开始', correct: 'start' },
            { label: '打湿双手', correct: 'wet' },
            { label: '抹肥皂搓一搓', correct: 'soap' },
            { label: '冲干净', correct: 'rinse' },
            { label: '擦干', correct: 'dry' }
          ],
          steps: [
            { key: 'start', name: '开始', emoji: '🟢' },
            { key: 'wet', name: '打湿双手', emoji: '💧' },
            { key: 'soap', name: '抹肥皂搓搓', emoji: '🧼' },
            { key: 'rinse', name: '冲干净', emoji: '🚿' },
            { key: 'dry', name: '擦干', emoji: '🧻' }
          ]
        },
        {
          id: 'computer',
          title: '打开电脑学习流程',
          slots: [
            { label: '开始', correct: 'start' },
            { label: '按电源键', correct: 'power' },
            { label: '输入密码', correct: 'pwd' },
            { label: '打开学习软件', correct: 'app' },
            { label: '结束', correct: 'end' }
          ],
          steps: [
            { key: 'start', name: '开始', emoji: '🟢' },
            { key: 'power', name: '按电源键', emoji: '⏻' },
            { key: 'pwd', name: '输入密码', emoji: '🔑' },
            { key: 'app', name: '打开学习软件', emoji: '📘' },
            { key: 'end', name: '结束', emoji: '🔴' }
          ]
        }
      ],

      // 本局
      roundTitle: '',
      slots: [],
      steps: [],
      usedMap: {},

      // 槽位 rect 缓存
      slotRects: {}
    }
  },

  computed: {
    needCount() {
      return this.slots.length
    },
    placedCount() {
      return this.slots.filter(s => !!s.placedKey).length
    },
    correctCount() {
      return this.slots.filter(s => !!s.placedKey && s.correct).length
    },
    success() {
      return this.needCount > 0 && this.correctCount >= this.needCount
    }
  },

  onLoad() {
    this.loadLevelProgress()
    this.newRound()
  },

  onUnload() {
    this.stopClock()
    clearTimeout(this._t)
  },

  methods: {
    // ===== 后端：读取进度 =====
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
      } catch (e) {}
    },

    // ===== 计时 =====
    startClock() {
      this.stopClock()
      this.elapsedMs = 0
      this.startAt = Date.now()
      this.clock = setInterval(() => {
        this.elapsedMs = Date.now() - this.startAt
      }, 100)
    },
    stopClock() {
      if (this.clock) {
        clearInterval(this.clock)
        this.clock = null
      }
    },
    formatTime(ms) {
      const totalSec = Math.floor(ms / 1000)
      const m = Math.floor(totalSec / 60)
      const s = totalSec % 60
      const ms2 = Math.floor((ms % 1000) / 10)
      const mm = m < 10 ? '0' + m : '' + m
      const ss = s < 10 ? '0' + s : '' + s
      const msStr = ms2 < 10 ? '0' + ms2 : '' + ms2
      return `${mm}:${ss}.${msStr}`
    },

    // ===== 星星规则 =====
    calcStars({ usedMs, wrongDrops }) {
      const sec = usedMs / 1000
      if (sec <= 25 && wrongDrops <= 1) return 3
      if (sec <= 40) return 2
      return 1
    },

    // ===== 上报通关 =====
    async reportPass({ steps, usedMs, stars }) {
      if (this.reported) return
      this.reported = true
      try {
        await request({
          url: `/api/game/levels/${this.levelId}/complete`,
          method: 'POST',
          data: {
            stars,
            steps,
            usedTimeMs: usedMs,
            usedTimeSec: Math.round(usedMs / 1000),
            wrongDrops: this.wrongDrops
          }
        })

        this.levelProgress.stars = Math.max(this.levelProgress.stars || 0, stars)
        if (this.levelProgress.bestSteps == null) this.levelProgress.bestSteps = steps
        else this.levelProgress.bestSteps = Math.min(this.levelProgress.bestSteps, steps)
      } catch (e) {}
    },

    // ===== 随机 =====
    shuffle(arr) {
      const a = arr.slice()
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const t = a[i]
        a[i] = a[j]
        a[j] = t
      }
      return a
    },

    // ===== 新一局 =====
    newRound() {
      const round = this.shuffle(this.pool)[0]
      this.roundTitle = round.title

      this.slots = round.slots.map((s, idx) => ({
        id: `${round.id}-${idx}`,
        label: s.label,
        correctKey: s.correct,
        placedKey: null,
        correct: false
      }))
      this.steps = this.shuffle(round.steps)

      this.usedMap = {}
      this.steps.forEach(s => (this.usedMap[s.key] = false))

      this.draggingKey = null
      this.dragX = 0
      this.dragY = 0
      this.offsetX = 0
      this.offsetY = 0

      this.wrongDrops = 0
      this.earnedStars = 0
      this.reported = false
      this.toast = { show: false, text: '' }

      this.stopClock()
      this.elapsedMs = 0
      this.startClock()

      this.slotRects = {}
      setTimeout(() => this.measureAllSlots(), 120)

      uni.vibrateShort({ type: 'light' })
    },

    stepByKey(key) {
      return this.steps.find(s => s.key === key) || { key, name: '', emoji: '❓' }
    },

    // ===== 拖拽：fixed 跟随 =====
    cardStyle(key) {
      if (this.draggingKey === key) {
        return {
          position: 'fixed',
          left: this.dragX + 'px',
          top: this.dragY + 'px'
        }
      }
      return {}
    },

    startDrag(key, e) {
      if (this.usedMap[key]) return
      if (!e || !e.touches || !e.touches[0]) return

      this.draggingKey = key

      // 右侧卡片固定尺寸（下面 CSS），用固定偏移让手指更自然
      this.offsetX = 60
      this.offsetY = 40

      this.dragX = e.touches[0].clientX - this.offsetX
      this.dragY = e.touches[0].clientY - this.offsetY

      uni.vibrateShort({ type: 'light' })
    },

    onDrag(key, e) {
      if (this.draggingKey !== key) return
      if (!e || !e.touches || !e.touches[0]) return

      this.dragX = e.touches[0].clientX - this.offsetX
      this.dragY = e.touches[0].clientY - this.offsetY
    },

    async endDrag(key) {
      if (this.draggingKey !== key) return

      const dropX = this.dragX + 60
      const dropY = this.dragY + 42

      const slot = await this.hitSlot(dropX, dropY)

      if (!slot) {
        this.draggingKey = null
        return
      }

      if (slot.placedKey) {
        this.toastMini('这个位置已经有卡片啦～')
        this.draggingKey = null
        return
      }

      slot.placed്
      slot.placedKey = key
      slot.correct = slot.correctKey === key
      this.usedMap[key] = true

      if (slot.correct) {
        uni.vibrateLong()
        this.toastMini('✅ 放对了！')
      } else {
        this.wrongDrops += 1
        uni.vibrateShort({ type: 'light' })
        this.toastMini('❌ 顺序不太对，再试试～')
      }

      this.draggingKey = null

      // 全部正确才通关（可改成：全部放完即通关）
      if (this.success) {
        this.stopClock()
        this.earnedStars = this.calcStars({ usedMs: this.elapsedMs, wrongDrops: this.wrongDrops })
        await this.reportPass({
          steps: this.needCount,
          usedMs: this.elapsedMs,
          stars: this.earnedStars
        })
      }
    },

    removeFromSlot(slotId) {
      if (this.success) return
      const slot = this.slots.find(s => s.id === slotId)
      if (!slot || !slot.placedKey) return

      const key = slot.placedKey
      slot.placedKey = null
      slot.correct = false
      this.usedMap[key] = false

      uni.vibrateShort({ type: 'light' })
      this.toastMini('已拿回卡片')
    },

    // ===== 槽位测量/命中 =====
    measureAllSlots() {
      const ids = this.slots.map(s => '#slot-' + s.id)
      const q = uni.createSelectorQuery().in(this)

      ids.forEach(sel => q.select(sel).boundingClientRect())

      q.exec(resArr => {
        const map = {}
        resArr.forEach((rect, idx) => {
          if (!rect) return
          const sid = this.slots[idx]?.id
          if (!sid) return
          map[sid] = rect
        })
        this.slotRects = map
      })
    },

    async hitSlot(x, y) {
      if (!this.slotRects || Object.keys(this.slotRects).length === 0) {
        await new Promise(resolve => {
          this.measureAllSlots()
          setTimeout(resolve, 120)
        })
      }

      for (const s of this.slots) {
        const rect = this.slotRects[s.id]
        if (!rect) continue
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
          return s
        }
      }
      return null
    },

    // ===== UI =====
    toastMini(text) {
      this.toast.text = text
      this.toast.show = true
      clearTimeout(this._t)
      this._t = setTimeout(() => (this.toast.show = false), 900)
    },

    reset() {
      this.newRound()
    },

    goBack() {
      uni.navigateBack({ delta: 1 })
    },

    goNext() {
      if (!this.success) {
        uni.showToast({ title: '先把流程图放对再去下一关～', icon: 'none' })
        return
      }
      uni.redirectTo({ url: '/pages/game/level/level19' })
    }
  }
}
</script>

<style scoped>
/* 一屏可见：page flex，禁滚动 */
.page{
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 40rpx 30rpx;
  box-sizing: border-box;
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 55%, #89f7fe 100%);
}

/* 顶部固定 */
.top{ flex: 0 0 auto; }

/* header */
.header{
  position: relative;
  text-align: center;
  color:#fff;
  margin-bottom: 12rpx;
}
.back-btn{
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 60rpx;
  height: 60rpx;
  border-radius: 999rpx;
  background: rgba(255,255,255,0.22);
  display:flex;
  align-items:center;
  justify-content:center;
  font-size: 32rpx;
  font-weight: 900;
}
.title{ font-size: 40rpx; font-weight: 900; }
.tip{ display:block; margin-top: 8rpx; font-size: 24rpx; opacity: 0.95; }

/* hud */
.hud{
  display:flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
  gap: 12rpx;
}
.badge{
  display:inline-flex;
  align-items:center;
  gap: 10rpx;
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255,255,255,0.22);
  color: #fff;
  font-size: 24rpx;
  font-weight: 900;
}
.small{
  color:#eaf2ff;
  font-size: 22rpx;
  opacity: 0.95;
}


/* ✅ main 左右：占剩余空间，min-height:0 防止溢出 */
.main{
  flex: 1 1 auto;
  min-height: 0;
  position: relative;
  border-radius: 32rpx;
  overflow: hidden;
  background: rgba(255,255,255,0.95);
  border: 2rpx solid rgba(255,255,255,0.8);
  box-shadow: 0 18rpx 50rpx rgba(0,0,0,0.18);
  display: flex;
  gap: 14rpx;
  padding: 18rpx;
  box-sizing: border-box;
}
.board-bg{
  position:absolute;
  inset:0;
  background:
    radial-gradient(circle at 20% 20%, rgba(255, 234, 0, 0.10), transparent 40%),
    radial-gradient(circle at 80% 25%, rgba(0, 200, 255, 0.10), transparent 45%),
    radial-gradient(circle at 50% 80%, rgba(255, 0, 150, 0.08), transparent 50%);
  z-index:0;
}

/* 左右列 */
.left, .right{
  position: relative;
  z-index: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.left{ flex: 1.45; }
.right{ flex: 1; }

/* hint */
.hintbar{
  flex: 0 0 auto;
  margin-bottom: 10rpx;
  padding: 14rpx 16rpx;
  border-radius: 22rpx;
  background: rgba(79,108,255,0.08);
  border: 2rpx solid rgba(79,108,255,0.14);
}
.hinttext{
  color:#2b3a66;
  font-size: 22rpx;
  line-height: 1.5;
  font-weight: 700;
}

/* 流程图 */
.flow-area{
  flex: 1 1 auto;
  min-height: 0;
  display:flex;
  flex-direction: column;
}
.flow-title{
  text-align: center;
  font-size: 26rpx;
  font-weight: 900;
  color:#2b3a66;
  margin: 6rpx 0 8rpx;
}
.slot-list{
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  padding: 10rpx;
  border-radius: 26rpx;
  background: rgba(79,108,255,0.06);
  border: 2rpx dashed rgba(79,108,255,0.18);
  box-sizing: border-box;
}
.slot-card{
  border-radius: 22rpx;
  background: rgba(255,255,255,0.85);
  border: 2rpx solid rgba(0,0,0,0.06);
  padding: 12rpx 12rpx;
  box-sizing: border-box;
}
.slot-head{
  display:flex;
  align-items:center;
  gap: 10rpx;
  margin-bottom: 8rpx;
}
.slot-index{
  width: 44rpx;
  height: 44rpx;
  border-radius: 999rpx;
  background: rgba(79,108,255,0.15);
  color:#2b3a66;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size: 22rpx;
  font-weight: 900;
}
.slot-label{
  font-size: 24rpx;
  font-weight: 900;
  color:#2b3a66;
}
.slot-body{
  min-height: 74rpx;
  border-radius: 18rpx;
  border: 2rpx dashed rgba(0,0,0,0.10);
  background: rgba(255,255,255,0.6);
  display:flex;
  align-items:center;
  justify-content:center;
  overflow: hidden;
}
.empty-text{
  font-size: 22rpx;
  color: rgba(43,58,102,0.65);
  font-weight: 800;
}
.placed-card{
  width: 100%;
  padding: 12rpx 12rpx;
  display:flex;
  align-items:center;
  justify-content: center;
  gap: 10rpx;
  border-radius: 18rpx;
  background: rgba(255, 245, 230, 0.75);
  border: 2rpx dashed rgba(255,159,67,0.30);
  box-sizing: border-box;
}
.placed-card.ok{
  background: rgba(46, 204, 113, 0.12);
  border-style: solid;
  border-color: rgba(46, 204, 113, 0.40);
}
.pname{
  font-size: 24rpx;
  font-weight: 900;
  color:#2b3a66;
}
.mini{
  margin-left: auto;
  font-size: 20rpx;
  font-weight: 800;
  opacity: 0.6;
  color:#2b3a66;
}
.arrow{
  display:flex;
  justify-content:center;
  align-items:center;
  height: 26rpx;
  margin-top: 6rpx;
}
.arrow-icon{ font-size: 24rpx; }

.flow-footer{
  flex: 0 0 auto;
  margin-top: 8rpx;
  display:flex;
  justify-content: space-between;
  gap: 10rpx;
}
.round-title{
  color:#2b3a66;
  font-size: 22rpx;
  font-weight: 900;
  opacity: 0.85;
}
.round-tip{
  color:#2b3a66;
  font-size: 20rpx;
  font-weight: 800;
  opacity: 0.6;
}

/* 右：步骤卡 */
.steps-area{
  flex: 1 1 auto;
  min-height: 0;
  padding: 12rpx;
  border-radius: 26rpx;
  background: rgba(255,159,67,0.08);
  border: 2rpx dashed rgba(255,159,67,0.22);
  box-sizing: border-box;
  display:flex;
  flex-direction: column;
}
.steps-title{
  flex: 0 0 auto;
  font-size: 22rpx;
  font-weight: 900;
  color:#6b4a12;
  margin-bottom: 10rpx;
}
.steps-grid{
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr;
  gap: 12rpx;
}
.step-card{
  height: 110rpx;
  border-radius: 20rpx;
  background: rgba(255,255,255,0.88);
  border: 2rpx solid rgba(0,0,0,0.06);
  display:flex;
  align-items:center;
  justify-content:center;
  flex-direction: column;
  gap: 2rpx;
  box-shadow: 0 10rpx 24rpx rgba(0,0,0,0.08);
  box-sizing: border-box;
}
.step-card:active{ transform: scale(0.98); }
.step-card.used{
  opacity: 0.35;
  pointer-events: none;
}
.step-card.dragging{
  z-index: 9999;
  width: 180px;
  height: 92px;
  border-radius: 18px;
  box-shadow: 0 16px 40px rgba(0,0,0,0.22);
  transform: scale(1.02);
}
.step-card .emoji{ font-size: 40rpx; }
.step-card .name{
  font-size: 22rpx;
  font-weight: 900;
  color:#2b3a66;
}

.stat{
  flex: 0 0 auto;
  margin-top: 10rpx;
  display:flex;
  flex-direction: column;
  gap: 6rpx;
}
.stat-item{
  font-size: 22rpx;
  font-weight: 900;
  color:#6b4a12;
  opacity: 0.85;
}

/* 底部按钮固定 */
.actions{
  flex: 0 0 auto;
  margin-top: 14rpx;
  display:flex;
  gap: 14rpx;
}
.btn{
  flex: 1;
  padding: 22rpx 0;
  text-align: center;
  border-radius: 999rpx;
  font-size: 28rpx;
  font-weight: 900;
  box-shadow: 0 12rpx 26rpx rgba(0,0,0,0.14);
}
.reset{
  background: linear-gradient(90deg,#f5f5f5 0%,#e9e9e9 100%);
  color:#555;
}
.next{
  background: linear-gradient(90deg,#4f6cff 0%,#667eea 100%);
  color:#fff;
}
.btn.disabled{
  opacity: 0.55;
  pointer-events: none;
  box-shadow: none;
}

/* popup */
.popup{
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.55);
  display:flex;
  align-items:center;
  justify-content:center;
  z-index: 99;
  backdrop-filter: blur(8rpx);
}
.popup-card{
  width: 78vw;
  background: rgba(255,255,255,0.96);
  border-radius: 32rpx;
  padding: 54rpx 40rpx 40rpx;
  text-align:center;
  box-shadow: 0 22rpx 70rpx rgba(0,0,0,0.22);
}
.pop-title{
  display:block;
  font-size: 44rpx;
  font-weight: 900;
  color:#ff6b6b;
  margin-bottom: 16rpx;
}
.pop-desc{
  display:block;
  color:#555;
  font-size: 26rpx;
  line-height: 1.7;
  margin-bottom: 24rpx;
}
.linebreak{ display:block; height: 10rpx; }
.pop-actions{
  display:flex;
  gap: 14rpx;
}
.pop-btn{
  flex: 1;
  padding: 18rpx 0;
  border-radius: 22rpx;
  font-size: 28rpx;
  font-weight: 900;
  background: linear-gradient(90deg,#eef2ff 0%,#dbe9ff 100%);
  color:#4f6cff;
  box-shadow: 0 10rpx 22rpx rgba(0,0,0,0.10);
}
.pop-btn.primary{
  background: linear-gradient(90deg,#ff9f43 0%,#ff6b6b 100%);
  color:#fff;
}

/* mini toast */
.mini-toast{
  position: fixed;
  left: 50%;
  bottom: 140rpx;
  transform: translateX(-50%);
  padding: 16rpx 22rpx;
  border-radius: 999rpx;
  background: rgba(0,0,0,0.75);
  color:#fff;
  font-size: 24rpx;
  font-weight: 800;
  z-index: 120;
}
/* ✅ main 保持不滚动，但把 padding 更省空间 */
.main{
  flex: 1 1 auto;
  min-height: 0;
  position: relative;
  border-radius: 32rpx;
  overflow: hidden;
  background: rgba(255,255,255,0.95);
  border: 2rpx solid rgba(255,255,255,0.8);
  box-shadow: 0 18rpx 50rpx rgba(0,0,0,0.18);
  display: flex;
  gap: 12rpx;
  padding: 10rpx;              /* ✅ 原来 18rpx，缩小 */
  box-sizing: border-box;
}

/* ✅ 左侧整体更紧凑 */
.left{ flex: 1.55; }
.right{ flex: 1; }

/* ✅ hintbar 再薄一点 */
.hintbar{
  margin-bottom: 8rpx;
  padding: 10rpx 12rpx;        /* ✅ 缩小 */
  border-radius: 20rpx;
}

/* ✅ 流程图标题更紧凑 */
.flow-title{
  text-align: center;
  font-size: 20rpx;            /* ✅ 原 26 */
  font-weight: 900;
  color:#2b3a66;
  margin: 4rpx 0 6rpx;         /* ✅ 缩小 */
}

/* ✅ slot-list 更省空间 */
.slot-list{
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 3rpx;                   /* ✅ 原 8 */
  padding: 6rpx;               /* ✅ 原 10 */
  border-radius: 24rpx;
  background: rgba(79,108,255,0.06);
  border: 2rpx dashed rgba(79,108,255,0.18);
  box-sizing: border-box;
}

/* ✅ 每个槽位卡片变矮 */
.slot-card{
  border-radius: 20rpx;
  background: rgba(255,255,255,0.85);
  border: 2rpx solid rgba(0,0,0,0.06);
  padding: 6rpx 6rpx;        /* ✅ 原 12 */
  box-sizing: border-box;
}

/* ✅ 头部更紧凑 */
.slot-head{
  display:flex;
  align-items:center;
  gap: 8rpx;
  margin-bottom: 1rpx;         /* ✅ 原 8 */
}

.slot-index{
  width: 36rpx;                /* ✅ 原 44 */
  height: 40rpx;
  border-radius: 999rpx;
  background: rgba(79,108,255,0.15);
  color:#2b3a66;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size: 16rpx;            /* ✅ 原 22 */
  font-weight: 900;
}

.slot-label{
  font-size: 20rpx;            /* ✅ 原 24 */
  font-weight: 900;
  color:#2b3a66;
}

/* ✅ 放置区高度缩小：保证最后一格能显示出来 */
.slot-body{
  min-height: 64rpx;           /* ✅ 原 74 */
  border-radius: 16rpx;
  border: 2rpx dashed rgba(0,0,0,0.10);
  background: rgba(255,255,255,0.6);
  display:flex;
  align-items:center;
  justify-content:center;
  overflow: hidden;
}

.empty-text{
  font-size: 20rpx;            /* ✅ 原 22 */
  font-weight: 800;
  color: rgba(43,58,102,0.65);
}

/* ✅ 已放入卡片更紧凑 */
.placed-card{
  width: 100%;
  padding: 10rpx 10rpx;        /* ✅ 原 12 */
  display:flex;
  align-items:center;
  justify-content: center;
  gap: 8rpx;
  border-radius: 16rpx;
  background: rgba(255, 245, 230, 0.75);
  border: 2rpx dashed rgba(255,159,67,0.30);
  box-sizing: border-box;
}

.pname{
  font-size: 22rpx;            /* ✅ 原 24 */
  font-weight: 900;
  color:#2b3a66;
}

.mini{
  font-size: 18rpx;            /* ✅ 原 20 */
  font-weight: 800;
  opacity: 0.6;
}

/* ✅ 箭头高度缩小 */
.arrow{
  display:flex;
  justify-content:center;
  align-items:center;
  height: 18rpx;               /* ✅ 原 26 */
  margin-top: 4rpx;            /* ✅ 原 6 */
}
.arrow-icon{ font-size: 22rpx; }

/* ✅ footer 改成一行更薄（不占高度） */
.flow-footer{
  margin-top: 4rpx;            /* ✅ 原 8 */
  display:flex;
  justify-content: space-between;
  gap: 8rpx;
}

.round-title{
  font-size: 16rpx;            /* ✅ 原 22 */
  font-weight: 900;
  opacity: 0.85;
  color:#2b3a66;
}

.round-tip{
  font-size: 14rpx;            /* ✅ 原 20 */
  font-weight: 800;
  opacity: 0.55;
  color:#2b3a66;
}
</style>
