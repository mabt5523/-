<template>
  <view class="page">
    <!-- 头部 -->
    <view class="header">
      <text class="title">第 12 关：打印机 🖨️</text>
      <text class="tip">任务：点“打印”→ 纸张出来（输出到现实世界）</text>
    </view>

    <!-- HUD -->
    <view class="hud">
      <text class="badge">🧾 已打印：{{ printedCount }}/{{ needPrint }}</text>
      <text class="small">{{ isPrinting ? '正在打印…' : (success ? '完成啦！' : '提示：先选内容，再点打印') }}</text>
    </view>

    <!-- 游戏区 -->
    <view class="board">
      <view class="board-bg" />

      <!-- 提示条 -->
      <view class="hintbar">
        <text class="hinttext">
          打印机也是输出设备：把电脑里的内容变成真实的纸张！
        </text>
      </view>

      <!-- 本局任务 -->
      <view class="task-card">
        <text class="task-title">本次任务</text>
        <text class="task-text">
          打印：<text class="task-bold">{{ currentTask.title }}</text>
        </text>
        <text class="task-sub">（先点要打印的内容，再点“🖨️ 打印”）</text>
      </view>

      <!-- 打印机区 -->
      <view class="printer-area">
        <!-- 打印机外壳 -->
        <view class="printer">
          <view class="printer-top">
            <text class="printer-title">🖨️ 打印机</text>
            <view class="lights">
              <view class="light" :class="{ on: isPrinting }"></view>
              <view class="light" :class="{ on: success }"></view>
            </view>
          </view>

          <!-- 进纸口 -->
          <view class="slot">
            <view class="slot-inner" />
          </view>

          <!-- 出纸动画区 -->
          <view class="paper-out">
            <view
              class="paper"
              :class="{ printing: isPrinting, done: paperShown }"
              :style="{ transform: `translateY(${paperY}px)` }"
            >
              <view class="paper-header">
                <text class="paper-title">{{ printedSheet.title || '（空白）' }}</text>
              </view>
              <view class="paper-body">
                <text class="paper-emoji">{{ printedSheet.emoji || '📝' }}</text>
                <text class="paper-text">{{ printedSheet.text || '还没有打印内容～' }}</text>
              </view>
              <view class="paper-footer">
                <text class="paper-foot">来自电脑的输出 ✅</text>
              </view>
            </view>
          </view>

          <!-- 打印机底座 -->
          <view class="printer-base" />
        </view>

        <!-- 右侧：已选内容小卡 -->
        <view class="selected-card">
          <text class="sel-title">你选择了</text>
          <view class="sel-box">
            <text class="sel-emoji">{{ selectedItem.emoji || '❓' }}</text>
            <text class="sel-name">{{ selectedItem.title || '还没选' }}</text>
          </view>
          <text class="sel-tip">先选内容，再点打印</text>
        </view>
      </view>

      <!-- 内容选择（实例多 + 本局随机抽取） -->
      <view class="choice-grid">
        <view
          v-for="it in options"
          :key="it.key"
          class="choice"
          :class="{ active: selectedKey === it.key, done: printedMap[it.key] }"
          @click="choose(it.key)"
        >
          <text class="c-emoji">{{ it.emoji }}</text>
          <text class="c-title">{{ it.title }}</text>
          <text class="c-small">{{ it.text }}</text>
          <text class="c-tag" v-if="printedMap[it.key]">✅</text>
        </view>
      </view>

      <!-- 小结 -->
      <view class="summary">
        <text class="summary-text">
          你点击打印（输入）→ 程序发送到打印机 → 纸张出来（输出到现实世界）。
        </text>
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="actions">
      <view class="btn reset" @click="reset" :class="{ disabled: isPrinting }">↩ 重新开始</view>
      <view class="btn run" @click="printNow" :class="{ disabled: !selectedKey || isPrinting }">🖨️ 打印</view>
      <view class="btn next" @click="goNext" :class="{ disabled: !success }">下一关 →</view>
    </view>

    <!-- 成功弹窗 -->
    <view v-if="success" class="popup" @touchmove.stop.prevent>
      <view class="popup-card">
        <text class="pop-title">🎉 通关成功！</text>
        <text class="pop-desc">
          你学会了：输出可以到现实世界！
          <text class="linebreak" />
          屏幕显示是输出，打印机把内容打印成纸张也是输出。
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
      levelId: 12,

      // 后端进度
      levelProgress: { unlocked: true, stars: 0, bestSteps: null },
      reported: false,

      // 目标：正确打印指定内容 N 次
      needPrint: 3,
      printedCount: 0,

      // 本局状态
      options: [],
      currentTask: { key: '', title: '', text: '', emoji: '' },

      selectedKey: '',
      selectedItem: {},

      // 打印动画
      isPrinting: false,
      paperShown: false,
      paperY: -120, // 纸张起始位置（隐藏在打印机里）
      printedSheet: { title: '', text: '', emoji: '' },

      // 每个选项是否被打印过（用于步数/统计）
      printedMap: {},

      // 通关
      success: false,

      // toast
      toast: { show: false, text: '' },

      // 计时（可选：用耗时给星）
      startAt: 0,
      elapsedMs: 0,
      clock: null,

      // 题库：实例多（你可以继续加）
      pool: [
        { key: 'hw1', title: '作业单', text: '把作业写在这里：1+1=？', emoji: '🧮' },
        { key: 'note', title: '便签', text: '记得：明天带水杯', emoji: '📝' },
        { key: 'poster', title: '海报', text: '保护眼睛：坐姿要端正', emoji: '👀' },
        { key: 'map', title: '小地图', text: '从教室到操场怎么走？', emoji: '🗺️' },
        { key: 'ticket', title: '小票', text: '图书角借书：已借 1 本', emoji: '🧾' },
        { key: 'namecard', title: '姓名卡', text: '你好，我叫小明', emoji: '🏷️' },
        { key: 'schedule', title: '课程表', text: '周一：语文；周二：数学', emoji: '📅' },
        { key: 'recipe', title: '水果清单', text: '苹果、香蕉、橙子', emoji: '🍎' },
        { key: 'story', title: '小故事', text: '从前有一只小猫…', emoji: '📖' },
        { key: 'sign', title: '提示牌', text: '请保持安静', emoji: '🪧' },
        { key: 'score', title: '成绩条', text: '你得了 ⭐⭐⭐', emoji: '⭐' },
        { key: 'drawing', title: '小画', text: '这是我画的太阳', emoji: '☀️' }
      ]
    }
  },

  onLoad() {
    this.loadLevelProgress()
    this.newRound()
  },

  onUnload() {
    this.stopClock()
  },

  methods: {
    // ============ 后端：拉取关卡进度 ============
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

    // ============ 后端：上报通关 ============
    calcStarsByTime(ms) {
      const sec = ms / 1000
      if (sec <= 8) return 3
      if (sec <= 14) return 2
      return 1
    },

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
            usedTimeSec: usedMs ? Math.round(usedMs / 1000) : 0
          }
        })

        this.levelProgress.stars = Math.max(this.levelProgress.stars || 0, stars)
        if (this.levelProgress.bestSteps == null) this.levelProgress.bestSteps = steps
        else this.levelProgress.bestSteps = Math.min(this.levelProgress.bestSteps, steps)
      } catch (e) {
        console.log('reportPass failed:', e)
      }
    },

    // ============ 计时器（用于给星） ============
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

    // ============ 随机工具 ============
    shuffle(arr) {
      const a = arr.slice()
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const t = a[i]; a[i] = a[j]; a[j] = t
      }
      return a
    },
    sample(arr, n) {
      return this.shuffle(arr).slice(0, n)
    },

    // ============ 开新一局 ============
    newRound() {
      const SHOW = 6 // 一次给几个“可打印内容”
      this.options = this.sample(this.pool, SHOW)
      this.currentTask = this.sample(this.options, 1)[0]

      this.selectedKey = ''
      this.selectedItem = {}

      this.printedMap = this.options.reduce((m, it) => (m[it.key] = false, m), {})
      this.printedCount = 0
      this.success = false
      this.reported = false

      // 纸张复位
      this.isPrinting = false
      this.paperShown = false
      this.paperY = -120
      this.printedSheet = { title: '', text: '', emoji: '' }

      this.toast = { show: false, text: '' }

      this.startClock()
      uni.vibrateShort({ type: 'light' })
    },

    choose(key) {
      if (this.isPrinting) return
      const it = this.options.find(x => x.key === key)
      if (!it) return
      this.selectedKey = key
      this.selectedItem = it
      uni.vibrateShort({ type: 'light' })
      this.toastMini('已选择：' + it.title)
    },

    // ============ 打印动作（出纸动画） ============
    async printNow() {
      if (this.isPrinting) return
      if (!this.selectedKey) {
        this.toastMini('先选一个要打印的内容～')
        return
      }

      // 准备打印
      this.isPrinting = true
      this.paperShown = true
      this.paperY = -120

      const it = this.options.find(x => x.key === this.selectedKey)
      this.printedSheet = { title: it.title, text: it.text, emoji: it.emoji }

      uni.vibrateShort({ type: 'light' })

      // 模拟“出纸”：分段移动更像动画
      await this.sleep(120)
      this.paperY = -60
      await this.sleep(160)
      this.paperY = 0
      await this.sleep(160)
      this.paperY = 60
      await this.sleep(200)
      this.paperY = 96

      // 判断对不对：打印的是不是任务要求的那张
      if (it.key === this.currentTask.key) {
        // 这一次任务完成
        this.printedCount += 1
        this.toastMini('✅ 打印对啦！纸张出来了～')
        uni.vibrateLong()

        // 标记该选项已打印（用于统计 steps）
        this.$set(this.printedMap, it.key, true)

        // 够次数通关
        if (this.printedCount >= this.needPrint) {
          this.success = true
          this.stopClock()

          // steps：累计打印次数 + 选择次数（简单统计）
          const steps =
            this.printedCount +
            Object.values(this.printedMap).filter(Boolean).length

          const usedMs = this.elapsedMs
          const stars = this.calcStarsByTime(usedMs)

          await this.reportPass({ steps, usedMs, stars })
        } else {
          // 继续下一次任务：换任务 + 解除选择
          this.currentTask = this.sample(this.options, 1)[0]
          this.selectedKey = ''
          this.selectedItem = {}
        }
      } else {
        this.toastMini('❌ 打印的不是任务那张：再试试')
      }

      await this.sleep(180)
      this.isPrinting = false
    },

    sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms))
    },

    // ============ UI：Toast ============
    toastMini(text) {
      this.toast.text = text
      this.toast.show = true
      clearTimeout(this._t)
      this._t = setTimeout(() => (this.toast.show = false), 900)
    },

    // ============ 重置/跳转 ============
    reset() {
      if (this.isPrinting) return
      this.newRound()
    },

    goBack() {
      uni.navigateBack({ delta: 1 })
    },

    goNext() {
      if (!this.success) {
        uni.showToast({ title: '先完成打印任务再去下一关～', icon: 'none' })
        return
      }
      uni.redirectTo({ url: '/pages/game/level/level13' })
    }
  }
}
</script>

<style scoped>
.page{
  min-height: 100vh;
  padding: 40rpx 30rpx;
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 55%, #89f7fe 100%);
}

/* header */
.header{ position:relative; text-align:center; color:#fff; margin-bottom:18rpx; }
.back-btn{
  position:absolute; left:0; top:50%; transform:translateY(-50%);
  width:60rpx; height:60rpx; border-radius:999rpx;
  background:rgba(255,255,255,0.22);
  display:flex; align-items:center; justify-content:center;
  font-size:32rpx; font-weight:900;
}
.title{ font-size:40rpx; font-weight:900; }
.tip{ display:block; margin-top:10rpx; font-size:24rpx; opacity:0.95; }

/* hud */
.hud{
  display:flex; justify-content: space-between; align-items:center;
  margin-bottom: 16rpx; gap: 12rpx;
}
.badge{
  display:inline-flex; align-items:center; gap:10rpx;
  padding:10rpx 18rpx; border-radius:999rpx;
  background: rgba(255,255,255,0.22);
  color:#fff; font-size:24rpx; font-weight:900;
}
.small{ color:#eaf2ff; font-size:22rpx; opacity:0.95; }

/* board */
.board{
  position: relative;
  background: rgba(255,255,255,0.95);
  border-radius: 32rpx;
  padding: 22rpx;
  box-shadow: 0 18rpx 50rpx rgba(0,0,0,0.18);
  overflow: hidden;
  border: 2rpx solid rgba(255,255,255,0.8);
  min-height: 820rpx;
}
.board-bg{
  position:absolute; inset:0;
  background:
    radial-gradient(circle at 20% 20%, rgba(255, 234, 0, 0.10), transparent 40%),
    radial-gradient(circle at 80% 25%, rgba(0, 200, 255, 0.10), transparent 45%),
    radial-gradient(circle at 50% 80%, rgba(255, 0, 150, 0.08), transparent 50%);
  z-index:0;
}

.hintbar{
  position: relative;
  z-index: 1;
  margin-bottom: 16rpx;
  padding: 16rpx 18rpx;
  border-radius: 22rpx;
  background: rgba(79,108,255,0.08);
  border: 2rpx solid rgba(79,108,255,0.14);
}
.hinttext{
  color:#2b3a66;
  font-size: 24rpx;
  line-height: 1.6;
  font-weight: 900;
}

/* task */
.task-card{
  position: relative;
  z-index: 1;
  margin-bottom: 16rpx;
  padding: 18rpx 18rpx;
  border-radius: 26rpx;
  background: rgba(255,245,230,0.75);
  border: 2rpx dashed rgba(255,159,67,0.30);
}
.task-title{ display:block; font-size:26rpx; font-weight:900; color:#6b4a12; margin-bottom:8rpx; }
.task-text{ display:block; font-size:26rpx; font-weight:900; color:#2b3a66; }
.task-bold{ font-weight: 900; color:#ff6b6b; }
.task-sub{ display:block; margin-top:8rpx; font-size:22rpx; color:#6b4a12; font-weight:800; }

/* printer area layout */
.printer-area{
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 14rpx;
  align-items: stretch;
  margin-bottom: 16rpx;
}

/* printer */
.printer{
  border-radius: 26rpx;
  background: rgba(255,255,255,0.86);
  border: 2rpx solid rgba(0,0,0,0.06);
  box-shadow: 0 10rpx 24rpx rgba(0,0,0,0.06);
  padding: 16rpx;
  overflow: hidden;
}
.printer-top{
  display:flex;
  justify-content: space-between;
  align-items:center;
  margin-bottom: 10rpx;
}
.printer-title{ font-size:24rpx; font-weight:900; color:#2b3a66; }
.lights{ display:flex; gap: 8rpx; }
.light{
  width: 16rpx; height: 16rpx;
  border-radius: 999rpx;
  background: rgba(0,0,0,0.12);
}
.light.on{
  background: rgba(46, 204, 113, 0.8);
  box-shadow: 0 0 0 6rpx rgba(46,204,113,0.12);
}

/* slot */
.slot{
  height: 34rpx;
  border-radius: 18rpx;
  background: rgba(0,0,0,0.06);
  margin-bottom: 10rpx;
  overflow: hidden;
}
.slot-inner{
  height: 100%;
  width: 100%;
  background: linear-gradient(90deg, rgba(0,0,0,0.10), rgba(0,0,0,0.02));
}

/* paper out */
.paper-out{
  position: relative;
  height: 320rpx;
  border-radius: 22rpx;
  background: rgba(79,108,255,0.06);
  border: 2rpx dashed rgba(79,108,255,0.18);
  display:flex;
  align-items:flex-start;
  justify-content:center;
  overflow: hidden;
}
.paper{
  width: 84%;
  border-radius: 22rpx;
  background: rgba(255,255,255,0.98);
  border: 2rpx solid rgba(0,0,0,0.06);
  box-shadow: 0 14rpx 30rpx rgba(0,0,0,0.12);
  padding: 16rpx;
  margin-top: 16rpx;
  transition: transform 0.18s ease;
}
.paper-header{
  padding-bottom: 10rpx;
  border-bottom: 2rpx dashed rgba(0,0,0,0.06);
  margin-bottom: 10rpx;
}
.paper-title{
  font-size: 24rpx;
  font-weight: 900;
  color:#2b3a66;
}
.paper-body{
  display:flex;
  flex-direction: column;
  align-items:center;
  justify-content:center;
  gap: 10rpx;
  padding: 10rpx 0;
}
.paper-emoji{ font-size: 72rpx; }
.paper-text{
  font-size: 22rpx;
  color:#444;
  font-weight: 800;
  text-align:center;
  line-height: 1.6;
}
.paper-footer{
  margin-top: 8rpx;
  padding-top: 10rpx;
  border-top: 2rpx dashed rgba(0,0,0,0.06);
  text-align:center;
}
.paper-foot{
  font-size: 20rpx;
  color:#1e7f4a;
  font-weight: 900;
}

/* base */
.printer-base{
  height: 18rpx;
  border-radius: 999rpx;
  background: rgba(0,0,0,0.06);
  margin-top: 12rpx;
}

/* selected card */
.selected-card{
  border-radius: 26rpx;
  background: rgba(255,255,255,0.86);
  border: 2rpx solid rgba(0,0,0,0.06);
  box-shadow: 0 10rpx 24rpx rgba(0,0,0,0.06);
  padding: 16rpx;
  display:flex;
  flex-direction: column;
  justify-content: space-between;
}
.sel-title{ font-size:24rpx; font-weight:900; color:#2b3a66; }
.sel-box{
  flex:1;
  margin-top: 10rpx;
  border-radius: 22rpx;
  background: rgba(255,245,230,0.75);
  border: 2rpx dashed rgba(255,159,67,0.30);
  display:flex;
  flex-direction: column;
  align-items:center;
  justify-content:center;
  gap: 10rpx;
  padding: 16rpx;
}
.sel-emoji{ font-size: 66rpx; }
.sel-name{ font-size: 22rpx; font-weight: 900; color:#6b4a12; text-align:center; }
.sel-tip{ font-size: 20rpx; color:#666; font-weight: 800; text-align:center; margin-top: 10rpx; }

/* choices */
.choice-grid{
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14rpx;
  padding: 14rpx;
  border-radius: 26rpx;
  background: rgba(79,108,255,0.06);
  border: 2rpx dashed rgba(79,108,255,0.18);
}
.choice{
  position: relative;
  border-radius: 22rpx;
  background: rgba(255,255,255,0.82);
  border: 2rpx solid rgba(0,0,0,0.06);
  box-shadow: 0 10rpx 24rpx rgba(0,0,0,0.08);
  padding: 14rpx 14rpx;
  display:flex;
  flex-direction: column;
  gap: 6rpx;
}
.choice:active{ transform: scale(0.99); }
.c-emoji{ font-size: 44rpx; }
.c-title{ font-size: 24rpx; font-weight: 900; color:#2b3a66; }
.c-small{ font-size: 20rpx; color:#666; font-weight: 800; line-height: 1.4; }
.choice.active{
  border-color: rgba(79,108,255,0.30);
  box-shadow: 0 0 0 8rpx rgba(79,108,255,0.08), 0 10rpx 24rpx rgba(0,0,0,0.08);
}
.choice.done{
  border-color: rgba(46, 204, 113, 0.30);
}
.c-tag{
  position:absolute;
  right: 12rpx;
  top: 10rpx;
  font-size: 26rpx;
}

/* summary */
.summary{
  position: relative;
  z-index: 1;
  margin-top: 16rpx;
  padding: 16rpx 18rpx;
  border-radius: 22rpx;
  background: rgba(79,108,255,0.08);
  border: 2rpx solid rgba(79,108,255,0.14);
}
.summary-text{
  color:#2b3a66;
  font-size: 24rpx;
  line-height: 1.6;
  font-weight: 900;
}

/* actions */
.actions{
  margin-top: 18rpx;
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
.btn.disabled{
  opacity: 0.55;
  pointer-events:none;
  box-shadow:none;
}
.reset{ background: linear-gradient(90deg,#f5f5f5 0%,#e9e9e9 100%); color:#555; }
.run{ background: linear-gradient(90deg,#ff9f43 0%,#ff6b6b 100%); color:#fff; }
.next{ background: linear-gradient(90deg,#4f6cff 0%,#667eea 100%); color:#fff; }

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
.pop-actions{ display:flex; gap: 14rpx; }
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
  font-weight: 900;
  z-index: 120;
}
</style>
