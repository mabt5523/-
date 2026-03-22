<template>
  <view class="page">
    <!-- 头部 -->
    <view class="header">
      <text class="title">第 17 关：条件判断 ✅</text>
      <text class="tip">任务：看条件，选出正确的动作（如果…就…）</text>
    </view>

    <!-- HUD -->
    <view class="hud">
      <text class="badge">✅ 进度：{{ currentIndex + (answered ? 1 : 0) }}/{{ roundCount }}</text>
      <text class="small">⏱ 用时：{{ formatTime(elapsedMs) }}</text>
    </view>

    <!-- 游戏区（单屏不滚动） -->
    <view class="board">
      <view class="board-bg" />

      <!-- 顶部提示条 -->
      <view class="hintbar">
        <text class="hinttext">
          小口诀：如果“条件成立” → 做动作；不成立 → 做另一个动作
        </text>
      </view>

      <!-- 题目 -->
      <view class="qcard" v-if="question && !success">
        <view class="qtitle">第 {{ currentIndex + 1 }} 题：该怎么做？</view>

        <!-- 场景卡 -->
        <view class="scene">
          <view class="scene-line">
            <text class="scene-label">条件：</text>
            <text class="scene-text">{{ question.condText }}</text>
          </view>
          <view class="scene-line">
            <text class="scene-label">现在：</text>
            <text class="scene-text">{{ question.stateText }}</text>
          </view>
          <view class="scene-line">
            <text class="scene-label">规则：</text>
            <text class="scene-text">如果 {{ question.ifText }}，就 {{ question.thenText }}；否则 {{ question.elseText }}</text>
          </view>
        </view>

        <!-- 选择题 -->
        <view class="options">
          <view
            v-for="(op, idx) in question.options"
            :key="idx"
            class="op"
            :class="optionClass(idx)"
            @click="choose(idx)"
          >
            <text class="op-text">{{ op }}</text>
          </view>
        </view>

        <!-- 反馈 -->
        <view class="feedback" v-if="answered">
          <text v-if="isCorrect" class="ok">✅ 判断正确！</text>
          <text v-else class="no">❌ 不对哦：{{ question.explain }}</text>
        </view>

        <!-- 下一题 -->
        <view class="nextline">
          <view class="mini-btn" :class="{ disabled: !answered }" @click="nextQuestion">
            下一题 →
          </view>
        </view>
      </view>

      <!-- 完成 -->
      <view v-if="success" class="finish">
        <text class="finish-title">🎉 本局完成！</text>
        <text class="finish-desc">
          用时：{{ formatTime(elapsedMs) }} ｜ 错误：{{ wrongCount }} 次 ｜ 星星：{{ earnedStars }}⭐
        </text>

        <view class="finish-actions">
          <view class="btn2 light" @click="reset">再玩一次</view>
          <view class="btn2 primary" @click="goNext">下一关 →</view>
        </view>
      </view>
    </view>

    <!-- 底部按钮 -->
    <view class="actions">
      <view class="btn reset" @click="reset">↩ 重新开始</view>
      <view class="btn next" :class="{ disabled: !success }" @click="goNext">下一关 →</view>
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
      levelId: 17,

      // 后端进度
      levelProgress: { unlocked: true, stars: 0, bestSteps: null },
      reported: false,

      // 本局
      roundCount: 6,
      questions: [],
      currentIndex: 0,

      // 答题状态
      selectedIndex: null,
      answered: false,
      isCorrect: false,
      correctCount: 0,
      wrongCount: 0,
      success: false,
      earnedStars: 0,

      // 计时
      elapsedMs: 0,
      clock: null,
      startAt: 0,

      toast: { show: false, text: '' },

      // ✅ 条件题库（实例多一些，可继续加）
      pool: [
        // 红绿灯
        {
          key: 'traffic_red',
          condText: '红灯亮',
          stateText: '现在看到：🔴 红灯',
          ifText: '红灯亮',
          thenText: '停下',
          elseText: '可以走',
          answerAction: '停下',
          options: ['停下', '快跑过去', '继续走'],
          explain: '红灯亮要停下，等绿灯再走。'
        },
        {
          key: 'traffic_green',
          condText: '绿灯亮',
          stateText: '现在看到：🟢 绿灯',
          ifText: '绿灯亮',
          thenText: '可以走',
          elseText: '停下等待',
          answerAction: '可以走',
          options: ['停下', '可以走', '闭上眼睛走'],
          explain: '绿灯亮可以走，但也要注意车辆。'
        },

        // 天气
        {
          key: 'rain',
          condText: '下雨',
          stateText: '窗外：🌧 下雨了',
          ifText: '下雨',
          thenText: '带伞',
          elseText: '不用带伞',
          answerAction: '带伞',
          options: ['带伞', '穿短袖', '带冰淇淋'],
          explain: '下雨要带伞，才不会淋湿。'
        },
        {
          key: 'sunny',
          condText: '太阳很大',
          stateText: '窗外：☀️ 大太阳',
          ifText: '太阳很大',
          thenText: '戴帽子',
          elseText: '不用戴帽子',
          answerAction: '戴帽子',
          options: ['戴帽子', '带雨伞', '穿雨衣'],
          explain: '太阳很大可以戴帽子防晒。'
        },

        // 电量
        {
          key: 'battery_low',
          condText: '电量低于 20%',
          stateText: '手机：🔋 15%',
          ifText: '电量低于 20%',
          thenText: '去充电',
          elseText: '继续用',
          answerAction: '去充电',
          options: ['去充电', '把手机丢掉', '继续玩到没电'],
          explain: '电量低要充电，避免关机。'
        },

        // 作业
        {
          key: 'homework_done',
          condText: '作业写完',
          stateText: '现在：📚 作业写完了',
          ifText: '作业写完',
          thenText: '可以玩 10 分钟',
          elseText: '先写作业',
          answerAction: '可以玩 10 分钟',
          options: ['可以玩 10 分钟', '继续写作业', '不睡觉'],
          explain: '作业完成后才能放松一下。'
        },
        {
          key: 'homework_not_done',
          condText: '作业没写完',
          stateText: '现在：📝 还差两页',
          ifText: '作业没写完',
          thenText: '先写作业',
          elseText: '再玩',
          answerAction: '先写作业',
          options: ['先写作业', '先玩游戏', '把书藏起来'],
          explain: '作业没写完要先完成任务。'
        },

        // 进门洗手
        {
          key: 'wash_hands',
          condText: '刚从外面回来',
          stateText: '现在：🚪 刚进家门',
          ifText: '刚从外面回来',
          thenText: '洗手',
          elseText: '不用洗手',
          answerAction: '洗手',
          options: ['洗手', '直接吃零食', '摸眼睛'],
          explain: '外面回来要洗手更卫生。'
        },

        // 温度
        {
          key: 'cold',
          condText: '天气很冷',
          stateText: '现在：❄️ 很冷',
          ifText: '天气很冷',
          thenText: '穿外套',
          elseText: '穿短袖',
          answerAction: '穿外套',
          options: ['穿外套', '穿短袖', '穿泳衣'],
          explain: '天气冷要穿外套保暖。'
        }
      ]
    }
  },

  computed: {
    question() {
      return this.questions[this.currentIndex] || null
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

    // ===== 星星规则（可调） =====
    calcStars({ usedMs, wrongCount }) {
      const sec = usedMs / 1000
      if (sec <= 45 && wrongCount <= 1) return 3
      if (sec <= 70) return 2
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
            wrongCount: this.wrongCount,
            correctCount: this.correctCount
          }
        })
        this.levelProgress.stars = Math.max(this.levelProgress.stars || 0, stars)
      } catch (e) {}
    },

    // ===== 随机工具 =====
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
    sample(arr, n) {
      return this.shuffle(arr).slice(0, n)
    },

    // ===== 新一局 =====
    newRound() {
      const picked = this.sample(this.pool, this.roundCount).map(q => {
        const options = this.shuffle(q.options.slice())
        const answerIndex = options.findIndex(x => x === q.answerAction)
        return { ...q, options, answerIndex }
      })

      this.questions = picked
      this.currentIndex = 0

      this.selectedIndex = null
      this.answered = false
      this.isCorrect = false
      this.correctCount = 0
      this.wrongCount = 0
      this.success = false
      this.earnedStars = 0
      this.reported = false

      this.stopClock()
      this.elapsedMs = 0
      this.startClock()

      uni.vibrateShort({ type: 'light' })
    },

    // ===== 选择答案 =====
    choose(idx) {
      if (this.success) return
      if (this.answered) return

      this.selectedIndex = idx
      this.answered = true

      const q = this.question
      const ok = idx === q.answerIndex
      this.isCorrect = ok

      if (ok) {
        this.correctCount += 1
        uni.vibrateLong()
        this.toastMini('✅ 判断正确！')
      } else {
        this.wrongCount += 1
        uni.vibrateShort({ type: 'light' })
        this.toastMini('❌ 不对，再看看“如果…否则…”')
      }
    },

    optionClass(idx) {
      if (!this.answered) return {}
      if (idx === this.question.answerIndex) return { correct: true }
      if (idx === this.selectedIndex && !this.isCorrect) return { wrong: true }
      return {}
    },

    // ===== 下一题 / 结束 =====
    async nextQuestion() {
      if (!this.answered) return

      if (this.currentIndex >= this.roundCount - 1) {
        this.stopClock()
        this.success = true
        this.earnedStars = this.calcStars({ usedMs: this.elapsedMs, wrongCount: this.wrongCount })

        await this.reportPass({
          steps: this.roundCount,
          usedMs: this.elapsedMs,
          stars: this.earnedStars
        })
        return
      }

      this.currentIndex += 1
      this.selectedIndex = null
      this.answered = false
      this.isCorrect = false
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
        uni.showToast({ title: '先完成本关再去下一关～', icon: 'none' })
        return
      }
      uni.redirectTo({ url: '/pages/game/level/level18' })
    }
  }
}
</script>

<style scoped>
.page{
  min-height: 100vh;
  padding: 40rpx 30rpx;
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 55%, #89f7fe 100%);
  overflow: hidden; /* ✅ 单屏不滚动 */
}

/* header */
.header{ position: relative; text-align:center; color:#fff; margin-bottom:18rpx; }
.back-btn{
  position:absolute; left:0; top:50%; transform: translateY(-50%);
  width:60rpx; height:60rpx; border-radius:999rpx; background: rgba(255,255,255,0.22);
  display:flex; align-items:center; justify-content:center; font-size:32rpx; font-weight:900;
}
.title{ font-size:40rpx; font-weight:900; }
.tip{ display:block; margin-top:10rpx; font-size:24rpx; opacity:0.95; }

/* hud */
.hud{ display:flex; justify-content:space-between; align-items:center; margin-bottom:14rpx; gap:12rpx; }
.badge{
  display:inline-flex; align-items:center; gap:10rpx;
  padding:10rpx 18rpx; border-radius:999rpx; background: rgba(255,255,255,0.22);
  color:#fff; font-size:24rpx; font-weight:900;
}
.small{ color:#eaf2ff; font-size:22rpx; opacity:0.95; }

/* board */
.board{
  position: relative;
  background: rgba(255,255,255,0.95);
  border-radius: 32rpx;
  padding: 20rpx;
  box-shadow: 0 18rpx 50rpx rgba(0,0,0,0.18);
  overflow: hidden;
  border: 2rpx solid rgba(255,255,255,0.8);
  height: 760rpx; /* ✅ 固定高度单屏 */
}
.board-bg{
  position:absolute; inset:0;
  background:
    radial-gradient(circle at 20% 20%, rgba(255, 234, 0, 0.10), transparent 40%),
    radial-gradient(circle at 80% 25%, rgba(0, 200, 255, 0.10), transparent 45%),
    radial-gradient(circle at 50% 80%, rgba(255, 0, 150, 0.08), transparent 50%);
  z-index:0;
}

/* hint */
.hintbar{
  position: relative; z-index:1;
  margin-bottom:12rpx;
  padding:14rpx 16rpx;
  border-radius:22rpx;
  background: rgba(79,108,255,0.08);
  border: 2rpx solid rgba(79,108,255,0.14);
}
.hinttext{
  color:#2b3a66;
  font-size:24rpx;
  line-height:1.6;
  font-weight:700;
}

/* qcard */
.qcard{
  position: relative;
  z-index: 1;
  margin-top: 12rpx;
  padding: 18rpx;
  border-radius: 26rpx;
  background: rgba(79,108,255,0.06);
  border: 2rpx dashed rgba(79,108,255,0.18);
  height: 620rpx;
  display:flex;
  flex-direction: column;
}
.qtitle{
  font-size: 28rpx;
  font-weight: 900;
  color:#2b3a66;
  text-align:center;
  margin-bottom: 12rpx;
}

/* scene */
.scene{
  background: rgba(255,255,255,0.88);
  border: 2rpx solid rgba(0,0,0,0.06);
  border-radius: 22rpx;
  padding: 16rpx;
  box-shadow: 0 10rpx 24rpx rgba(0,0,0,0.08);
}
.scene-line{ display:flex; gap: 8rpx; margin-bottom: 10rpx; }
.scene-label{ font-size: 24rpx; font-weight: 900; color:#2b3a66; }
.scene-text{ font-size: 24rpx; font-weight: 800; color:#2b3a66; opacity: 0.95; }

/* options */
.options{
  margin-top: 16rpx;
  display: grid;
  grid-template-columns: 1fr;
  gap: 12rpx;
  flex: 1;
}
.op{
  padding: 18rpx 16rpx;
  border-radius: 22rpx;
  background: rgba(255,255,255,0.88);
  border: 2rpx solid rgba(0,0,0,0.06);
  box-shadow: 0 10rpx 24rpx rgba(0,0,0,0.08);
  display:flex;
  align-items:center;
  justify-content:center;
}
.op:active{ transform: scale(0.98); }
.op-text{ font-size: 30rpx; font-weight: 900; color:#2b3a66; }

/* 初始都一样；答题后才标色 */
.op.correct{ border-color: rgba(46, 204, 113, 0.55); background: rgba(46, 204, 113, 0.12); }
.op.wrong{ border-color: rgba(255, 107, 107, 0.55); background: rgba(255, 107, 107, 0.12); }

/* feedback */
.feedback{ margin-top: 10rpx; text-align:center; min-height: 56rpx; }
.ok{ color:#2ecc71; font-size:26rpx; font-weight:900; }
.no{ color:#ff6b6b; font-size:24rpx; font-weight:900; }

/* next */
.nextline{ margin-top: 8rpx; display:flex; justify-content:center; }
.mini-btn{
  padding: 16rpx 24rpx;
  border-radius: 999rpx;
  background: linear-gradient(90deg,#4f6cff 0%,#667eea 100%);
  color:#fff;
  font-weight:900;
  font-size:26rpx;
  box-shadow: 0 12rpx 26rpx rgba(0,0,0,0.14);
}
.mini-btn.disabled{ opacity:0.55; pointer-events:none; box-shadow:none; }

/* finish */
.finish{
  position: absolute;
  left: 20rpx;
  right: 20rpx;
  bottom: 20rpx;
  z-index: 2;
  padding: 26rpx 18rpx;
  border-radius: 26rpx;
  background: rgba(255,255,255,0.96);
  box-shadow: 0 22rpx 70rpx rgba(0,0,0,0.22);
  border: 2rpx solid rgba(255,255,255,0.8);
  text-align:center;
}
.finish-title{
  display:block;
  font-size: 40rpx;
  font-weight: 900;
  color:#ff6b6b;
  margin-bottom: 10rpx;
}
.finish-desc{
  display:block;
  font-size: 24rpx;
  color:#555;
  font-weight: 800;
  margin-bottom: 14rpx;
}
.finish-actions{ display:flex; gap: 12rpx; }
.btn2{
  flex:1;
  padding: 16rpx 0;
  border-radius: 22rpx;
  font-size: 26rpx;
  font-weight: 900;
}
.btn2.light{ background: linear-gradient(90deg,#eef2ff 0%,#dbe9ff 100%); color:#4f6cff; }
.btn2.primary{ background: linear-gradient(90deg,#ff9f43 0%,#ff6b6b 100%); color:#fff; }

/* actions */
.actions{ margin-top:16rpx; display:flex; gap:14rpx; }
.btn{
  flex:1;
  padding:22rpx 0;
  text-align:center;
  border-radius:999rpx;
  font-size:28rpx;
  font-weight:900;
  box-shadow: 0 12rpx 26rpx rgba(0,0,0,0.14);
}
.reset{ background: linear-gradient(90deg,#f5f5f5 0%,#e9e9e9 100%); color:#555; }
.next{ background: linear-gradient(90deg,#4f6cff 0%,#667eea 100%); color:#fff; }
.next.disabled{ opacity:0.55; pointer-events:none; box-shadow:none; }

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
