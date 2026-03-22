<template>
  <view class="page">
    <!-- 头部 -->
    <view class="header">
      <text class="title">第 4 关：真假信息 ✅❌</text>
      <text class="tip">任务：判断这条信息“可靠”还是“不可靠”</text>
    </view>

    <!-- HUD -->
    <view class="hud">
      <view class="hud-left">
        <text class="badge">🎯 进度：{{ index + 1 }}/{{ questions.length }}</text>
      </view>
      <view class="hud-right">
        <text class="small">⏱ {{ formatTime(elapsedMs) }}　❌ 错误：{{ wrongCount }}</text>
      </view>
    </view>

    <!-- 游戏区 -->
    <view class="board">
      <view class="board-bg" />

      <view class="hintbar">
        <text class="hinttext">
          小提示：可靠的信息通常符合常识、能验证；不可靠的信息往往夸张、没依据。
        </text>
      </view>

      <!-- 卡片 -->
      <view class="card" v-if="current">
        <text class="card-title">这条信息说：</text>
        <view class="quote">
          <text class="quote-text">“{{ current.text }}”</text>
        </view>

        <view class="why" v-if="answered">
          <text class="why-title">{{ answeredCorrect ? '✅ 解释：' : '❌ 解释：' }}</text>
          <text class="why-text">{{ current.reason }}</text>
        </view>

        <view class="choices">
          <view
            class="choice true"
            :class="{ disabled: answered || success }"
            @click="choose(true)"
          >
            ✅ 可靠
          </view>
          <view
            class="choice false"
            :class="{ disabled: answered || success }"
            @click="choose(false)"
          >
            ❌ 不可靠
          </view>
        </view>

        <view class="bottom-row">
          <view class="mini" :class="{ disabled: !answered || success }" @click="nextOne">
            下一条 →
          </view>
          <text class="mini-tip" v-if="!answered">先选“可靠/不可靠”</text>
          <text class="mini-tip" v-else>点“下一条”继续</text>
        </view>
      </view>

      <view class="statusbar">
        <text class="status">
          <template v-if="success">🎉 全部判断完成！</template>
          <template v-else>请判断：这条信息可靠吗？</template>
        </text>
        <text class="stat-mini">✅ 对：{{ rightCount }}　❌ 错：{{ wrongCount }}</text>
      </view>
    </view>

    <!-- 按钮 -->
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
          你学会了：不是所有信息都可靠！
          <text class="linebreak" />
          碰到“奇怪夸张”的信息，要先想一想、再去验证～
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
    this.newRound()
  },

  onUnload() {
    this.stopClock()
  },

  data() {
    return {
      levelId: 4,

      // 后端进度
      levelProgress: { unlocked: true, stars: 0, bestSteps: null },
      reported: false,

      // 本局题目
      questions: [],
      index: 0,

      // 答题状态
      answered: false,
      answeredCorrect: false,
      rightCount: 0,
      wrongCount: 0,
      steps: 0, // 选择次数
      success: false,

      // 计时器
      elapsedMs: 0,
      clock: null,
      startAt: 0,

      toast: { show: false, text: '' },

      // ✅ 题库：多一些（你可以继续加）
      pool: [
        // —— 可靠（true）——
        { text: '下雨要带伞', ans: true,  reason: '下雨会把人淋湿，带伞能挡雨，这是常识，也容易验证。' },
        { text: '红灯要停，绿灯再走', ans: true, reason: '交通规则能保护大家安全，现实中处处可见。' },
        { text: '洗手可以减少细菌', ans: true, reason: '用肥皂/洗手液能带走污渍和部分细菌，很多地方都有宣传和验证。' },
        { text: '把垃圾分类投放更环保', ans: true, reason: '分类能让可回收物再利用，减少污染。' },
        { text: '早睡早起对身体更好', ans: true, reason: '充足睡眠有助于恢复精力，很多医生和常识都支持。' },
        { text: '火很烫，不要用手摸', ans: true, reason: '火会烫伤皮肤，这是基本常识。' },
        { text: '用地图可以找到路', ans: true, reason: '地图提供位置和路线信息，能帮助我们导航。' },
        { text: '体温计能测出体温', ans: true, reason: '体温计就是用来测温的工具，容易验证。' },

        // —— 不可靠（false）——
        { text: '吃石头会变聪明', ans: false, reason: '石头不能消化，还可能伤害身体，这种说法没有科学依据。' },
        { text: '只要把手机贴在书上，就能把知识吸进去', ans: false, reason: '学习需要阅读、理解和练习，不可能靠“贴一下”获得知识。' },
        { text: '喝可乐能让人马上长高10厘米', ans: false, reason: '长高受遗传、营养、运动等影响，“马上长高10厘米”很夸张。' },
        { text: '对着太阳看一分钟眼睛会更厉害', ans: false, reason: '直视太阳会伤害眼睛，非常危险。' },
        { text: '把作业放枕头下，第二天就会写了', ans: false, reason: '这是玩笑话，作业还是要自己动脑完成。' },
        { text: '每天吃一颗糖就永远不会生病', ans: false, reason: '糖不能防病，吃太多糖还可能影响牙齿和健康。' },
        { text: '把手表泡水里，时间会变慢', ans: false, reason: '时间不会因为泡水变慢，泡水还可能弄坏手表。' },
        { text: '只要大声喊“我会飞”，就能飞起来', ans: false, reason: '人不会因为喊话就飞起来，这是不符合现实的夸张说法。' }
      ]
    }
  },

  computed: {
    current() {
      return this.questions[this.index]
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

    // ===== 工具 =====
    shuffle(arr) {
      const a = arr.slice()
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const t = a[i]; a[i] = a[j]; a[j] = t
      }
      return a
    },

    toastMsg(text) {
      this.toast.text = text
      this.toast.show = true
      clearTimeout(this._t)
      this._t = setTimeout(() => (this.toast.show = false), 900)
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
      const s = Math.floor(ms / 1000)
      const m = Math.floor(s / 60)
      const ss = s % 60
      const mm = m < 10 ? '0' + m : '' + m
      const s2 = ss < 10 ? '0' + ss : '' + ss
      return `${mm}:${s2}`
    },

    // ===== 星星规则（可改）=====
    calcStars() {
      const sec = this.elapsedMs / 1000
      if (this.wrongCount === 0 && sec <= 40) return 3
      if (this.wrongCount <= 2 && sec <= 65) return 2
      return 1
    },

    // ===== 上报 =====
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

    // ===== 开新局：随机抽题 =====
    newRound() {
      const COUNT = 6 // ✅ 每局几题（你可改 5~8）
      this.questions = this.shuffle(this.pool).slice(0, COUNT)

      this.index = 0
      this.answered = false
      this.answeredCorrect = false
      this.rightCount = 0
      this.wrongCount = 0
      this.steps = 0
      this.success = false
      this.reported = false

      this.startClock()
      uni.vibrateShort({ type: 'light' })
    },

    // ===== 选择答案 =====
    choose(userAns) {
      if (this.success || this.answered) return
      const q = this.current
      if (!q) return

      this.steps++

      const ok = (userAns === q.ans)
      this.answered = true
      this.answeredCorrect = ok

      if (ok) {
        this.rightCount++
        uni.vibrateLong()
        this.toastMsg('✅ 判断正确！')
      } else {
        this.wrongCount++
        uni.vibrateShort({ type: 'light' })
        this.toastMsg('❌ 再想想：这条信息靠谱吗？')
      }
    },

    // ===== 下一题 =====
    async nextOne() {
      if (this.success) return
      if (!this.answered) {
        uni.vibrateShort({ type: 'light' })
        this.toastMsg('先选“可靠/不可靠”哦～')
        return
      }

      if (this.index < this.questions.length - 1) {
        this.index++
        this.answered = false
        this.answeredCorrect = false
        uni.vibrateShort({ type: 'light' })
        return
      }

      // 结束：通关
      this.success = true
      this.stopClock()
      uni.vibrateLong()

      const stars = this.calcStars()
      await this.reportPass({
        steps: this.steps,
        usedMs: this.elapsedMs,
        stars
      })
    },

    reset() {
      this.newRound()
    },

    goBack() {
      uni.navigateBack({ delta: 1 })
    },

    goNext() {
      if (!this.success) {
        uni.showToast({ title: '先把本关题目做完再去下一关～', icon: 'none' })
        return
      }
      uni.redirectTo({ url: '/pages/game/level/level5' })
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
  min-height: 860rpx;
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
  position:relative; z-index:1;
  margin-bottom:16rpx;
  padding:16rpx 18rpx;
  border-radius:22rpx;
  background:rgba(79,108,255,0.08);
  border:2rpx solid rgba(79,108,255,0.14);
}
.hinttext{ color:#2b3a66; font-size:24rpx; line-height:1.6; font-weight:700; }

/* card */
.card{
  position:relative; z-index:1;
  background: rgba(255,255,255,0.86);
  border: 2rpx solid rgba(0,0,0,0.06);
  border-radius: 28rpx;
  padding: 22rpx;
  box-shadow: 0 10rpx 24rpx rgba(0,0,0,0.08);
}
.card-title{
  display:block;
  font-size: 24rpx;
  font-weight: 900;
  color:#2b3a66;
  margin-bottom: 12rpx;
}
.quote{
  border-radius: 22rpx;
  padding: 22rpx 18rpx;
  background: rgba(79,108,255,0.06);
  border: 2rpx dashed rgba(79,108,255,0.18);
}
.quote-text{
  font-size: 34rpx;
  font-weight: 900;
  color:#1f2a54;
  line-height: 1.6;
}

.why{
  margin-top: 14rpx;
  padding: 14rpx 16rpx;
  border-radius: 18rpx;
  background: rgba(0,0,0,0.04);
}
.why-title{
  display:block;
  font-size: 22rpx;
  font-weight: 900;
  margin-bottom: 6rpx;
  color:#2b3a66;
}
.why-text{
  font-size: 22rpx;
  color:#555;
  line-height: 1.6;
  font-weight: 700;
}

/* choices */
.choices{
  margin-top: 18rpx;
  display:flex;
  gap: 14rpx;
}
.choice{
  flex:1;
  padding: 22rpx 0;
  text-align:center;
  border-radius: 999rpx;
  font-size: 30rpx;
  font-weight: 900;
  box-shadow: 0 12rpx 26rpx rgba(0,0,0,0.12);
}
.choice:active{ transform: scale(0.985); }
.choice.disabled{ opacity:0.55; pointer-events:none; box-shadow:none; transform:none; }
.choice.true{
  background: linear-gradient(90deg,#4cd964 0%,#2ecc71 100%);
  color:#fff;
}
.choice.false{
  background: linear-gradient(90deg,#ff9f43 0%,#ff6b6b 100%);
  color:#fff;
}

.bottom-row{
  margin-top: 16rpx;
  display:flex;
  align-items:center;
  justify-content: space-between;
  gap: 12rpx;
}
.mini{
  padding: 14rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(79,108,255,0.10);
  border: 2rpx solid rgba(79,108,255,0.18);
  color:#4f6cff;
  font-size: 22rpx;
  font-weight: 900;
}
.mini:active{ transform: scale(0.985); }
.mini.disabled{ opacity:0.55; pointer-events:none; }
.mini-tip{
  color:#6b7cff;
  font-size: 22rpx;
  font-weight: 900;
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
.btn.disabled{ opacity:0.55; pointer-events:none; box-shadow:none; }
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
