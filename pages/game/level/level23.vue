<template>
  <view class="page">
    <!-- 头部 -->
    <view class="header">
      <text class="title">第 23 关：我来定规则 🧾</text>
      <text class="tip">任务：设计动物园编码系统（统一规则，不能冲突）</text>
    </view>

    <!-- HUD -->
    <view class="hud">
      <text class="badge">✅ 已完成：{{ solved ? 1 : 0 }}/1</text>
      <text class="small">⏱ 用时：{{ formatTime(elapsedMs) }}</text>
    </view>

    <view class="board">
      <view class="board-bg" />

      <!-- 提示栏 -->
      <view class="hintbar">
        <view class="topic">本局重点：编码规则要统一｜否则无法识别</view>
        <text class="hinttext">
          你来制定“动物园编码系统”：
          <text class="linebreak" />
          - 规则：字母 + 两位数字（例：A01）
          <text class="linebreak" />
          - 每种动物必须有唯一编码，不能重复
          <text class="linebreak" />
          填好后点「检查」。
        </text>
      </view>

      <view class="content">
        <!-- 规则展示 -->
        <view class="rule-card">
          <text class="rule-title">编码格式（统一规则）</text>
          <view class="rule-line">
            <text class="rule-dot" />
            <text class="rule-text">第一位：大写字母 A–Z</text>
          </view>
          <view class="rule-line">
            <text class="rule-dot" />
            <text class="rule-text">后两位：数字 00–99（不足两位要补 0）</text>
          </view>
          <view class="rule-line">
            <text class="rule-dot" />
            <text class="rule-text">每个编码只能给一种动物（不能冲突）</text>
          </view>
        </view>

        <!-- 输入列表 -->
        <view class="table">
          <view class="table-head">
            <text class="th animal">动物</text>
            <text class="th code">编码</text>
            <text class="th status">状态</text>
          </view>

          <view class="row" v-for="(it, idx) in animals" :key="it.key">
            <view class="td animal">
              <text class="emoji">{{ it.emoji }}</text>
              <text class="name">{{ it.name }}</text>
            </view>

            <view class="td code">
              <input
                class="code-input"
                v-model="it.code"
                maxlength="3"
                :disabled="solved"
                placeholder="如 A01"
                @input="onCodeInput(idx)"
              />
              <text class="mini">{{ hintOf(it.code) }}</text>
            </view>

            <view class="td status">
              <view class="pill" :class="statusClass(it)">
                <text>{{ statusText(it) }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 总体提示 -->
        <view class="summary-card">
          <view class="sum-row">
            <text class="sum-label">冲突数：</text>
            <text class="sum-value bad">{{ conflictCount }}</text>
            <text class="sum-label" style="margin-left:18rpx;">格式错误：</text>
            <text class="sum-value bad">{{ invalidCount }}</text>
          </view>
          <text class="sum-tip">
            小提示：先给同一类动物用同一个字母（例如全部用 A），再让数字递增，就更统一。
          </text>
        </view>

        <!-- 操作按钮 -->
        <view class="buttons">
          <view class="btn reset" @click="reset" :class="{ disabled: solved }">↩ 重置</view>
          <view class="btn auto" @click="autoFill" :class="{ disabled: solved }">✨ 自动生成</view>
          <view class="btn check" @click="check" :class="{ disabled: solved }">✅ 检查</view>
        </view>
      </view>
    </view>

    <!-- 成功弹窗 -->
    <view v-if="success" class="popup" @touchmove.stop.prevent>
      <view class="popup-card">
        <text class="pop-title">🎉 通关成功！</text>
        <text class="pop-desc">
          你学会了：
          <text class="linebreak" />
          1）编码规则要统一（格式一致）；
          <text class="linebreak" />
          2）编码必须唯一（不能冲突）；
          <text class="linebreak" />
          3）这样系统才能识别和管理现实世界。
          <text class="linebreak" />
          用时：{{ formatTime(elapsedMs) }}｜错误：{{ wrongTimes }} 次｜星星：{{ earnedStars }}⭐
        </text>
        <view class="pop-actions">
          <view class="pop-btn" @click="newGame">再玩一次</view>
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
      levelId: 23,

      levelProgress: { unlocked: true, stars: 0, bestSteps: null },
      reported: false,

      // 计时
      elapsedMs: 0,
      clock: null,
      startAt: 0,

      // 状态
      solved: false,
      success: false,
      isMoving: false,

      // 统计
      wrongTimes: 0,
      earnedStars: 0,

      // UI
      toast: { show: false, text: '' },

      // 动物（可自行增减）
      animals: [
        { key: 'tiger', name: '老虎', emoji: '🐯', code: '', _invalid: false, _dup: false },
        { key: 'elephant', name: '大象', emoji: '🐘', code: '', _invalid: false, _dup: false },
        { key: 'giraffe', name: '长颈鹿', emoji: '🦒', code: '', _invalid: false, _dup: false },
        { key: 'panda', name: '熊猫', emoji: '🐼', code: '', _invalid: false, _dup: false },
        { key: 'lion', name: '狮子', emoji: '🦁', code: '', _invalid: false, _dup: false },
        { key: 'zebra', name: '斑马', emoji: '🦓', code: '', _invalid: false, _dup: false }
      ]
    }
  },

  computed: {
    invalidCount() {
      return this.animals.filter(a => a._invalid).length
    },
    conflictCount() {
      return this.animals.filter(a => a._dup).length
    }
  },

  onLoad() {
    this.loadLevelProgress()
    this.newGame()
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
    calcStars({ usedMs, wrongTimes }) {
      const sec = usedMs / 1000
      // 3星：70秒内且错误<=1
      if (sec <= 70 && wrongTimes <= 1) return 3
      // 2星：100秒内
      if (sec <= 100) return 2
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
            wrongTimes: this.wrongTimes,
            codes: this.animals.map(a => ({ key: a.key, code: a.code }))
          }
        })

        this.levelProgress.stars = Math.max(this.levelProgress.stars || 0, stars)
        if (this.levelProgress.bestSteps == null) this.levelProgress.bestSteps = steps
        else this.levelProgress.bestSteps = Math.min(this.levelProgress.bestSteps, steps)
      } catch (e) {}
    },

    // ===== 初始化 =====
    newGame() {
      this.success = false
      this.solved = false
      this.reported = false
      this.wrongTimes = 0
      this.earnedStars = 0

      this.animals = this.animals.map(a => ({
        ...a,
        code: '',
        _invalid: false,
        _dup: false
      }))

      this.stopClock()
      this.startClock()
      uni.vibrateShort({ type: 'light' })
      this.toastMini('🧾 设计你的动物园编码系统吧！')
    },

    // 输入时：大写化、过滤非字母数字
    onCodeInput(idx) {
      const it = this.animals[idx]
      if (!it) return
      let v = (it.code || '').toUpperCase()
      v = v.replace(/[^A-Z0-9]/g, '')
      if (v.length > 3) v = v.slice(0, 3)
      it.code = v

      // 实时清理状态（等检查再算）
      it._invalid = false
      it._dup = false
    },

    // ===== 校验：格式 & 冲突 =====
    isValidCode(code) {
      // 规则：大写字母 + 两位数字
      return /^[A-Z][0-9]{2}$/.test(code)
    },

    recomputeFlags() {
      // 清空
      this.animals.forEach(a => {
        a._invalid = false
        a._dup = false
      })

      // 先算格式
      this.animals.forEach(a => {
        if (!this.isValidCode(a.code)) a._invalid = true
      })

      // 再算冲突（只对格式正确的算）
      const map = {}
      this.animals.forEach(a => {
        if (this.isValidCode(a.code)) {
          map[a.code] = (map[a.code] || 0) + 1
        }
      })
      this.animals.forEach(a => {
        if (this.isValidCode(a.code) && map[a.code] > 1) a._dup = true
      })
    },

    // UI：状态显示
    statusText(it) {
      if (!it.code) return '未填写'
      if (it._invalid) return '格式不对'
      if (it._dup) return '冲突重复'
      return 'OK'
    },
    statusClass(it) {
      if (!it.code) return 'idle'
      if (it._invalid || it._dup) return 'bad'
      return 'ok'
    },
    hintOf(code) {
      if (!code) return '格式：A01'
      if (code.length < 3) return '还差一位'
      if (!this.isValidCode(code)) return '需：字母+两位数字'
      return '格式正确'
    },

    // ===== 按钮 =====
    reset() {
      if (this.solved) return
      this.animals.forEach(a => {
        a.code = ''
        a._invalid = false
        a._dup = false
      })
      uni.vibrateShort({ type: 'light' })
      this.toastMini('已重置～')
    },

    autoFill() {
      if (this.solved) return
      // 示例：统一用 A，数字递增 01,02...
      this.animals.forEach((a, i) => {
        const n = (i + 1).toString().padStart(2, '0')
        a.code = `A${n}`
        a._invalid = false
        a._dup = false
      })
      uni.vibrateShort({ type: 'light' })
      this.toastMini('✨ 已自动生成（统一规则）')
    },

    async check() {
      if (this.solved) return

      this.recomputeFlags()

      // 是否全部填写且无错
      const allFilled = this.animals.every(a => !!a.code)
      const anyInvalid = this.animals.some(a => a._invalid)
      const anyDup = this.animals.some(a => a._dup)

      if (!allFilled) {
        this.wrongTimes += 1
        this.toastMini('先把所有动物都编上码～')
        return
      }

      if (anyInvalid || anyDup) {
        this.wrongTimes += 1
        uni.vibrateShort({ type: 'light' })
        this.toastMini('❌ 有格式错误或冲突重复，再改改～')
        return
      }

      // 通过
      this.solved = true
      this.success = true
      this.stopClock()
      this.earnedStars = this.calcStars({ usedMs: this.elapsedMs, wrongTimes: this.wrongTimes })
      uni.vibrateLong()
      this.toastMini('✅ 系统无冲突！通关～')

      await this.reportPass({
        steps: 1,
        usedMs: this.elapsedMs,
        stars: this.earnedStars
      })
    },

    toastMini(text) {
      this.toast.text = text
      this.toast.show = true
      clearTimeout(this._t)
      this._t = setTimeout(() => (this.toast.show = false), 900)
    },

    goBack() {
      uni.navigateBack({ delta: 1 })
    },

    goNext() {
      uni.redirectTo({ url: '/pages/game/level/level24' })
    }
  }
}
</script>

<style scoped>
.page{
  height: 140vh;
  overflow: hidden;
  padding: 40rpx 30rpx;
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 55%, #89f7fe 100%);
}

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
  margin-bottom: 10rpx;
  gap: 12rpx;
}
.badge{
  display:inline-flex;
  align-items:center;
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

/* board */
.board{
  position: relative;
  background: rgba(255,255,255,0.95);
  border-radius: 32rpx;
  padding: 18rpx;
  box-shadow: 0 18rpx 50rpx rgba(0,0,0,0.18);
  overflow: hidden;
  border: 2rpx solid rgba(255,255,255,0.8);

  height: calc(100vh - 40rpx - 30rpx - 0rpx);
  display:flex;
  flex-direction: column;
  gap: 10rpx;
  min-height: 0;
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

/* hint */
.hintbar{
  position: relative;
  z-index: 1;
  padding: 14rpx 16rpx;
  border-radius: 22rpx;
  background: rgba(79,108,255,0.08);
  border: 2rpx solid rgba(79,108,255,0.14);
}
.hinttext{
  color:#2b3a66;
  font-size: 24rpx;
  line-height: 1.5;
  font-weight: 700;
}
.topic{
  margin: 10rpx 0;
  padding: 12rpx 18rpx;
  border-radius: 18rpx;
  background: rgba(255,159,67,0.15);
  color:#2b3a66;
  font-size: 26rpx;
  font-weight: 900;
  text-align:center;
}
.linebreak{ display:block; height: 10rpx; }

/* content */
.content{
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  display:flex;
  flex-direction: column;
  gap: 10rpx;
  overflow: hidden;
}

/* rule card */
.rule-card{
  border-radius: 22rpx;
  background: rgba(255,255,255,0.92);
  border: 2rpx solid rgba(0,0,0,0.06);
  box-shadow: 0 10rpx 22rpx rgba(0,0,0,0.08);
  padding: 14rpx;
}
.rule-title{
  display:block;
  font-size: 24rpx;
  font-weight: 900;
  color:#2b3a66;
  margin-bottom: 10rpx;
}
.rule-line{
  display:flex;
  align-items:center;
  gap: 10rpx;
  margin-bottom: 6rpx;
}
.rule-dot{
  width: 10rpx;
  height: 10rpx;
  border-radius: 999rpx;
  background: rgba(79,108,255,0.75);
}
.rule-text{
  font-size: 22rpx;
  font-weight: 800;
  color:#555;
}

/* table */
.table{
  border-radius: 22rpx;
  background: rgba(255,255,255,0.92);
  border: 2rpx solid rgba(0,0,0,0.06);
  box-shadow: 0 10rpx 22rpx rgba(0,0,0,0.08);
  padding: 14rpx;
  overflow: hidden;
}
.table-head{
  display:flex;
  padding-bottom: 10rpx;
  border-bottom: 2rpx dashed rgba(0,0,0,0.08);
  margin-bottom: 10rpx;
}
.th{
  font-size: 22rpx;
  font-weight: 900;
  color:#2b3a66;
}
.th.animal{ flex: 1.1; }
.th.code{ flex: 1; text-align:center; }
.th.status{ flex: 0.9; text-align:right; }

.row{
  display:flex;
  align-items:center;
  padding: 10rpx 0;
  border-bottom: 2rpx solid rgba(0,0,0,0.04);
}
.row:last-child{ border-bottom: none; }

.td.animal{
  flex: 1.1;
  display:flex;
  align-items:center;
  gap: 10rpx;
}
.emoji{ font-size: 32rpx; }
.name{ font-size: 24rpx; font-weight: 900; color:#2b3a66; }

.td.code{
  flex: 1;
  display:flex;
  flex-direction: column;
  align-items:center;
  gap: 6rpx;
}
.code-input{
  width: 160rpx;
  height: 64rpx;
  border-radius: 16rpx;
  background: rgba(79,108,255,0.08);
  border: 2rpx solid rgba(79,108,255,0.18);
  text-align:center;
  font-size: 26rpx;
  font-weight: 900;
  color:#2b3a66;
}
.mini{
  font-size: 20rpx;
  color:#6b7280;
  font-weight: 800;
}

.td.status{
  flex: 0.9;
  display:flex;
  justify-content:flex-end;
}
.pill{
  min-width: 140rpx;
  padding: 10rpx 14rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 900;
  text-align:center;
}
.pill.idle{ background: rgba(0,0,0,0.06); color:#666; }
.pill.ok{ background: rgba(46,213,115,0.14); color:#167c3a; }
.pill.bad{ background: rgba(255,107,107,0.14); color:#b42318; }

/* summary */
.summary-card{
  border-radius: 22rpx;
  background: rgba(255,255,255,0.92);
  border: 2rpx solid rgba(0,0,0,0.06);
  box-shadow: 0 10rpx 22rpx rgba(0,0,0,0.08);
  padding: 14rpx;
}
.sum-row{
  display:flex;
  align-items: baseline;
  gap: 10rpx;
  margin-bottom: 8rpx;
}
.sum-label{
  font-size: 22rpx;
  font-weight: 900;
  color:#2b3a66;
}
.sum-value{
  font-size: 30rpx;
  font-weight: 900;
}
.sum-value.bad{ color:#ff6b6b; }
.sum-tip{
  font-size: 22rpx;
  font-weight: 800;
  color:#6b7280;
  line-height: 1.4;
}

/* buttons */
.buttons{
  display:flex;
  gap: 12rpx;
}
.btn{
  flex: 1;
  padding: 18rpx 0;
  text-align:center;
  border-radius: 999rpx;
  font-size: 26rpx;
  font-weight: 900;
  box-shadow: 0 12rpx 24rpx rgba(0,0,0,0.12);
}
.btn:active{ transform: scale(0.98); }
.btn.disabled{
  opacity: 0.55;
  pointer-events:none;
  box-shadow:none;
}
.reset{ background: linear-gradient(90deg,#f5f5f5 0%,#e9e9e9 100%); color:#555; }
.auto{ background: linear-gradient(90deg,#ff9f43 0%,#ff6b6b 100%); color:#fff; }
.check{ background: linear-gradient(90deg,#4f6cff 0%,#667eea 100%); color:#fff; }

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
  background: linear-gradient(90deg,#4f6cff 0%,#667eea 100%);
  color:#fff;
}

/* toast */
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
</style>
