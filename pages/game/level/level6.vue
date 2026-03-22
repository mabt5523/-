<template>
  <view class="page">
    <!-- 头部 -->
    <view class="header">
      <text class="title">第 6 关：信息小侦探 🕵️</text>
      <text class="tip">任务：根据提示找物品（点一点击）</text>
    </view>

    <!-- HUD -->
    <view class="hud">
      <view class="hud-left">
        <text class="badge">⭐ 进度：{{ solved }}/{{ rounds }}</text>
      </view>
      <view class="hud-right">
        <text class="small">⏱ {{ formatTime(elapsedMs) }}　❌ 误点：{{ misclick }}</text>
      </view>
    </view>

    <!-- 游戏区 -->
    <view class="board">
      <view class="board-bg" />

      <!-- 提示卡 -->
      <view class="clue-card">
        <text class="clue-title">线索</text>
        <text class="clue-text">“{{ currentClue }}”</text>
        <text class="clue-sub">请选择最符合线索的物品</text>
      </view>

      <!-- 选项网格 -->
      <view class="grid">
        <view
          v-for="it in options"
          :key="it.id"
          class="card"
          :class="cardClass(it)"
          @click="tapOption(it)"
        >
          <text class="emoji">{{ it.emoji }}</text>
          <text class="name">{{ it.name }}</text>

          <view class="mark" v-if="picked[it.id]">
            <text v-if="it.id === answerId">✅</text>
            <text v-else>❌</text>
          </view>

          <view class="reason" v-if="picked[it.id]">
            <text class="reason-text">{{ it.reason }}</text>
          </view>
        </view>
      </view>

      <view class="statusbar">
        <text class="status">
          <template v-if="success">🎉 通关成功！你会用信息描述事物了！</template>
          <template v-else>读线索 → 找物品</template>
        </text>
        <text class="stat-mini">点击：{{ steps }} 次</text>
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="actions">
      <view class="btn reset" @click="reset">↩ 重新开始</view>
      <view class="btn next" :class="{ disabled: !success }" @click="goNext">
        下一关 →
      </view>
    </view>

    <!-- 成功弹窗 -->
    <view v-if="success" class="popup" @touchmove.stop.prevent>
      <view class="popup-card">
        <text class="pop-title">🎉 通关成功！</text>
        <text class="pop-desc">
          你学会了：用“信息”描述事物！
          <text class="linebreak" />
          形状、用途、颜色、位置、功能……都是信息线索。
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
  async onLoad() {
    await this.loadLevelProgress()
    this.newGame()
  },

  onUnload() {
    this.stopClock()
  },

  data() {
    return {
      levelId: 6,

      // ===== 后端进度 =====
      levelProgress: { unlocked: true, stars: 0, bestSteps: null },
      reported: false,

      // ===== 游戏配置（可调）=====
      rounds: 4,        // ✅ 一次要答对几题算通关
      showCount: 9,     // ✅ 每题展示多少个选项（建议 6/9）
      perRoundWrongMax: 0, // 每题允许误点次数（0=不限制但影响星星；可自行用来做惩罚）

      // ===== 状态 =====
      solved: 0,        // 已完成题数
      steps: 0,         // 点击次数
      misclick: 0,
      success: false,

      // 本题
      current: null,    // 当前题对象（从题库抽）
      currentClue: '',
      options: [],
      answerId: '',
      picked: {},

      // 计时
      elapsedMs: 0,
      clock: null,
      startAt: 0,

      toast: { show: false, text: '' },

      // ✅ 题库：每个物品有多条线索（随机抽线索）
      pool: [
        {
          id: 'clock',
          name: '时钟',
          emoji: '🕒',
          clues: [
            '圆的、能看时间、有指针',
            '挂在墙上，告诉你几点了',
            '会“滴答滴答”，能计时'
          ],
          reason: '时钟能告诉我们时间，是一种信息。'
        },
        {
          id: 'calendar',
          name: '日历',
          emoji: '📅',
          clues: [
            '上面有日期，一页一页翻',
            '能告诉你今天是几月几号',
            '用来安排学习和活动'
          ],
          reason: '日历告诉我们日期信息。'
        },
        {
          id: 'map',
          name: '地图',
          emoji: '🗺️',
          clues: [
            '上面画着路和地方',
            '能告诉你怎么去某个地方',
            '找位置、找方向会用到它'
          ],
          reason: '地图提供位置与路线信息。'
        },
        {
          id: 'traffic',
          name: '红绿灯',
          emoji: '🚦',
          clues: [
            '有红黄绿三种灯',
            '告诉你该走还是该停',
            '在路口帮助大家安全通行'
          ],
          reason: '红绿灯传递交通规则信息。'
        },
        {
          id: 'thermometer',
          name: '温度计',
          emoji: '🌡️',
          clues: [
            '细细的，用来测温度',
            '能告诉你冷还是热',
            '发烧时会用到它'
          ],
          reason: '温度计提供温度信息。'
        },
        {
          id: 'weather',
          name: '天气预报',
          emoji: '🌤',
          clues: [
            '告诉你今天会不会下雨',
            '出门前看看它更方便',
            '能预测明天的天气'
          ],
          reason: '天气预报提供天气信息。'
        },
        {
          id: 'book',
          name: '书本',
          emoji: '📚',
          clues: [
            '里面有很多文字和图片',
            '能学知识、读故事',
            '打开它可以获取信息'
          ],
          reason: '书本是信息载体。'
        },
        {
          id: 'sign',
          name: '路牌',
          emoji: '🪧',
          clues: [
            '立在路边，上面写着方向',
            '告诉你哪里是学校/医院',
            '帮助你不迷路'
          ],
          reason: '路牌提供地点与方向信息。'
        },
        {
          id: 'speaker',
          name: '广播',
          emoji: '📢',
          clues: [
            '会发出声音通知大家',
            '学校里常用它提醒事项',
            '用声音传递信息'
          ],
          reason: '广播用声音传递信息。'
        },

        // 干扰物（也可以有线索，但不作为“信息主题”，这里当普通物品）
        { id: 'apple', name: '苹果', emoji: '🍎', clues: ['红红的、可以吃', '水果，咬一口脆脆的'], reason: '苹果是食物，不是信息工具。' },
        { id: 'teddy', name: '玩具熊', emoji: '🧸', clues: ['软软的、可以抱', '用来玩耍和陪伴'], reason: '玩具主要用来玩，不是传递信息。' },
        { id: 'ball', name: '皮球', emoji: '⚽', clues: ['圆的、会滚', '踢一踢很好玩'], reason: '皮球主要用于运动。' },
        { id: 'flower', name: '花朵', emoji: '🌸', clues: ['香香的、很好看', '在春天开花'], reason: '花朵是自然事物。' }
      ]
    }
  },

  methods: {
    // ===== 后端进度 =====
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

    // ===== 计时器 =====
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
      const mm = m < 10 ? '0' + m : '' + m
      const ss = s < 10 ? '0' + s : '' + s
      return `${mm}:${ss}`
    },

    // ===== 工具 =====
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
    toastMsg(text) {
      this.toast.text = text
      this.toast.show = true
      clearTimeout(this._t)
      this._t = setTimeout(() => (this.toast.show = false), 900)
    },
    pickOne(arr) {
      return arr[Math.floor(Math.random() * arr.length)]
    },

    // ===== 开始新游戏 =====
    newGame() {
      this.solved = 0
      this.steps = 0
      this.misclick = 0
      this.success = false
      this.reported = false

      this.startClock()
      this.nextRound()
      uni.vibrateShort({ type: 'light' })
    },

    // ===== 出下一题（随机抽物品 + 随机线索 + 随机选项）=====
    nextRound() {
      // 从题库里抽一个作为答案
      const answer = this.pickOne(this.pool.filter(x => (x.clues || []).length > 0))
      this.current = answer
      this.answerId = answer.id
      this.currentClue = this.pickOne(answer.clues)

      // 选项：包含答案 + 其他干扰
      const others = this.pool.filter(x => x.id !== answer.id)
      const needOther = Math.max(0, this.showCount - 1)
      const distract = this.sample(others, needOther)

      this.options = this.shuffle([answer, ...distract])
      this.picked = this.options.reduce((m, it) => (m[it.id] = false, m), {})
    },

    // ===== 点击选项 =====
    async tapOption(it) {
      if (this.success) return
      if (this.picked[it.id]) {
        uni.vibrateShort({ type: 'light' })
        this.toastMsg('你已经点过这个啦～')
        return
      }

      this.steps++
      this.$set(this.picked, it.id, true)

      if (it.id === this.answerId) {
        uni.vibrateLong()
        this.toastMsg('✅ 找对了！线索描述的是它！')
        this.solved++

        // 该题结束：短暂停顿进入下一题或通关
        if (this.solved >= this.rounds) {
          this.success = true
          this.stopClock()
          const stars = this.calcStars()
          await this.reportPass({ steps: this.steps, usedMs: this.elapsedMs, stars })
        } else {
          setTimeout(() => {
            this.nextRound()
          }, 380)
        }
      } else {
        this.misclick++
        uni.vibrateShort({ type: 'light' })
        this.toastMsg('❌ 不太像，再看看线索～')
      }
    },

    // ===== 星星规则（可改）=====
    calcStars() {
      const sec = this.elapsedMs / 1000
      // 3星：误点<=1 且 70秒内
      if (this.misclick <= 1 && sec <= 70) return 3
      // 2星：误点<=3 且 110秒内
      if (this.misclick <= 3 && sec <= 110) return 2
      return 1
    },

    // ===== 上报后端 =====
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
            usedTimeSec: Math.round(usedMs / 1000)
          }
        })

        this.levelProgress.stars = Math.max(this.levelProgress.stars || 0, stars)
        if (this.levelProgress.bestSteps == null) this.levelProgress.bestSteps = steps
        else this.levelProgress.bestSteps = Math.min(this.levelProgress.bestSteps, steps)
      } catch (e) {
        console.log('reportPass failed:', e)
      }
    },

    // ===== UI class =====
    cardClass(it) {
      const p = !!this.picked[it.id]
      return {
        picked: p,
        right: p && it.id === this.answerId,
        wrong: p && it.id !== this.answerId
      }
    },

    reset() {
      this.stopClock()
      this.newGame()
    },

    goBack() {
      uni.navigateBack({ delta: 1 })
    },

    goNext() {
      if (!this.success) {
        uni.showToast({ title: '先完成所有题目再去下一关～', icon: 'none' })
        return
      }
      uni.redirectTo({ url: '/pages/game/level/level7' })
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
.hud{ display:flex; justify-content:space-between; align-items:center; margin-bottom:16rpx; gap:12rpx; }
.badge{
  display:inline-flex; align-items:center; gap:10rpx;
  padding:10rpx 18rpx; border-radius:999rpx;
  background:rgba(255,255,255,0.22); color:#fff;
  font-size:24rpx; font-weight:900;
}
.small{ color:#eaf2ff; font-size:22rpx; opacity:0.95; }

/* board */
.board{
  position:relative;
  background:rgba(255,255,255,0.95);
  border-radius:32rpx;
  padding:22rpx;
  box-shadow:0 18rpx 50rpx rgba(0,0,0,0.18);
  overflow:hidden;
  border:2rpx solid rgba(255,255,255,0.8);
  min-height: 880rpx;
}
.board-bg{
  position:absolute; inset:0;
  background:
    radial-gradient(circle at 20% 20%, rgba(255, 234, 0, 0.10), transparent 40%),
    radial-gradient(circle at 80% 25%, rgba(0, 200, 255, 0.10), transparent 45%),
    radial-gradient(circle at 50% 80%, rgba(255, 0, 150, 0.08), transparent 50%);
  z-index:0;
}

/* clue */
.clue-card{
  position:relative; z-index:1;
  padding: 18rpx 18rpx;
  border-radius: 24rpx;
  background: rgba(79,108,255,0.08);
  border: 2rpx solid rgba(79,108,255,0.14);
  margin-bottom: 16rpx;
}
.clue-title{
  display:block;
  font-size: 24rpx;
  font-weight: 900;
  color:#2b3a66;
  margin-bottom: 8rpx;
}
.clue-text{
  display:block;
  font-size: 30rpx;
  line-height: 1.6;
  font-weight: 900;
  color:#1f2a55;
}
.clue-sub{
  display:block;
  margin-top: 8rpx;
  font-size: 22rpx;
  font-weight: 800;
  color:#5b6aa8;
}

/* grid */
.grid{
  position:relative; z-index:1;
  display:grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
  padding: 16rpx;
  border-radius: 26rpx;
  background: rgba(79,108,255,0.06);
  border: 2rpx dashed rgba(79,108,255,0.18);
}

.card{
  position:relative;
  aspect-ratio: 1 / 1;
  border-radius: 22rpx;
  background: rgba(255,255,255,0.82);
  border: 2rpx solid rgba(0,0,0,0.06);
  display:flex;
  align-items:center;
  justify-content:center;
  flex-direction: column;
  gap: 8rpx;
  box-shadow: 0 10rpx 24rpx rgba(0,0,0,0.08);
  overflow: hidden;
}
.card:active{ transform: scale(0.985); }

.emoji{ font-size: 60rpx; }
.name{
  font-size: 24rpx;
  font-weight: 900;
  color:#2b3a66;
  text-align:center;
  padding: 0 10rpx;
}

.mark{
  position:absolute;
  right: 12rpx;
  top: 10rpx;
  font-size: 30rpx;
}

.reason{
  position:absolute;
  left: 12rpx;
  right: 12rpx;
  bottom: 10rpx;
  padding: 10rpx 10rpx;
  border-radius: 14rpx;
  background: rgba(0,0,0,0.05);
}
.reason-text{
  font-size: 20rpx;
  line-height: 1.5;
  font-weight: 800;
  color:#333;
}

/* picked states */
.card.picked{ opacity: 0.96; }
.card.right{
  border-color: rgba(46, 204, 113, 0.55);
  box-shadow: 0 0 0 8rpx rgba(46, 204, 113, 0.10), 0 10rpx 24rpx rgba(0,0,0,0.08);
}
.card.wrong{
  border-color: rgba(255, 107, 107, 0.55);
  box-shadow: 0 0 0 8rpx rgba(255, 107, 107, 0.10), 0 10rpx 24rpx rgba(0,0,0,0.08);
}

/* status */
.statusbar{
  position:relative; z-index:1;
  margin-top: 16rpx;
  padding: 14rpx 16rpx;
  border-radius: 22rpx;
  background: rgba(0,0,0,0.04);
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap: 12rpx;
}
.status{ color:#2b3a66; font-size: 22rpx; font-weight: 900; }
.stat-mini{ color:#6b7cff; font-size: 22rpx; font-weight: 900; }

/* actions */
.actions{ margin-top:18rpx; display:flex; gap:14rpx; }
.btn{
  flex:1;
  padding:22rpx 0;
  text-align:center;
  border-radius:999rpx;
  font-size:28rpx;
  font-weight:900;
  box-shadow:0 12rpx 26rpx rgba(0,0,0,0.14);
}
.btn.disabled{ opacity: 0.55; pointer-events:none; box-shadow:none; }
.reset{ background: linear-gradient(90deg,#f5f5f5 0%,#e9e9e9 100%); color:#555; }
.next{ background: linear-gradient(90deg,#4f6cff 0%,#667eea 100%); color:#fff; }

/* popup */
.popup{
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.55);
  display:flex; align-items:center; justify-content:center;
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
