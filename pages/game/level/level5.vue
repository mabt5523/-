<template>
  <view class="page">
    <!-- 头部 -->
    <view class="header">
      <text class="title">第 5 关：找错信息 🧩</text>
      <text class="tip">任务：点出“不合理/有危险”的图片</text>
    </view>

    <!-- HUD -->
    <view class="hud">
      <view class="hud-left">
        <text class="badge">⭐ 已找到：{{ foundCount }}/{{ needWrong }}</text>
      </view>
      <view class="hud-right">
        <text class="small">⏱ {{ formatTime(elapsedMs) }}　❌ 误点：{{ misclick }}</text>
      </view>
    </view>

    <!-- 游戏区 -->
    <view class="board">
      <view class="board-bg" />

      <view class="hintbar">
        <text class="hinttext">
          小提示：不合理的信息常常“危险、泄露隐私、违反规则”。看到就要说“不对”！
        </text>
      </view>

      <!-- 卡片网格 -->
      <view class="grid">
        <view
          v-for="it in cards"
          :key="it.id"
          class="card"
          :class="cardClass(it)"
          @click="tapCard(it)"
        >
          <text class="pic">{{ it.emoji }}</text>
          <text class="name">{{ it.title }}</text>

          <!-- 选中标记 -->
          <view class="mark" v-if="picked[it.id]">
            <text v-if="it.isWrong">✅</text>
            <text v-else>❌</text>
          </view>

          <!-- 已揭示解释 -->
          <view class="reason" v-if="picked[it.id]">
            <text class="reason-text">{{ it.reason }}</text>
          </view>
        </view>
      </view>

      <view class="statusbar">
        <text class="status">
          <template v-if="success">🎉 找对啦！你会识别不合理信息了！</template>
          <template v-else>请找出所有“不合理图片”</template>
        </text>
        <text class="stat-mini">✅ 正确：{{ correctClicks }}　❌ 误点：{{ misclick }}</text>
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
          你学会了：要会识别不合理信息！
          <text class="linebreak" />
          遇到危险行为、泄露密码、违反规则的内容，要立刻说“不对”并提醒他人。
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
      levelId: 5,

      // ===== 后端进度 =====
      levelProgress: { unlocked: true, stars: 0, bestSteps: null },
      reported: false,

      // ===== 本局 =====
      cards: [],
      needWrong: 3,          // ✅ 本局需要找出几个“错误图片”
      showCount: 9,          // ✅ 本局展示多少张卡片
      picked: {},            // { id: true/false }
      foundCount: 0,
      success: false,

      // 统计
      steps: 0,              // 点击次数
      correctClicks: 0,
      misclick: 0,

      // 计时
      elapsedMs: 0,
      clock: null,
      startAt: 0,

      toast: { show: false, text: '' },

      // ✅ 题库：你可以继续加（越多越好）
      pool: [
        // —— 错误/不合理（isWrong:true）——
        {
          id: 'redlight_cross',
          title: '红灯过马路',
          emoji: '🚦🏃‍♂️',
          isWrong: true,
          reason: '红灯应该停！这样很危险。'
        },
        {
          id: 'pwd_on_paper',
          title: '密码写在纸上',
          emoji: '🔐📝',
          isWrong: true,
          reason: '密码是隐私，写出来容易被别人看到。'
        },
        {
          id: 'share_pwd_friend',
          title: '把密码发给同学',
          emoji: '📨🔐',
          isWrong: true,
          reason: '密码不能随便告诉别人，会被盗号。'
        },
        {
          id: 'click_unknown_link',
          title: '点陌生链接领奖品',
          emoji: '🎁🔗',
          isWrong: true,
          reason: '陌生链接可能是诈骗或病毒，要先问大人。'
        },
        {
          id: 'give_address_online',
          title: '在网上公开家庭住址',
          emoji: '🏠📣',
          isWrong: true,
          reason: '住址是隐私，公开会不安全。'
        },
        {
          id: 'play_phone_while_walk',
          title: '走路看手机不看路',
          emoji: '🚶📱',
          isWrong: true,
          reason: '容易撞到人或发生危险。'
        },
        {
          id: 'download_unknown_app',
          title: '随便下载不认识的软件',
          emoji: '⬇️🧩',
          isWrong: true,
          reason: '可能有病毒或乱扣费，要在正规渠道下载。'
        },
        {
          id: 'meet_stranger',
          title: '约网友见面不告诉家长',
          emoji: '🧑‍🤝‍🧑❓',
          isWrong: true,
          reason: '不安全，必须告诉家长并拒绝单独见面。'
        },

        // —— 正确/合理（isWrong:false）——
        {
          id: 'greenlight_cross',
          title: '绿灯走斑马线',
          emoji: '🟩🚶‍♀️',
          isWrong: false,
          reason: '遵守交通规则，安全过马路。'
        },
        {
          id: 'ask_parent_link',
          title: '陌生链接先问家长',
          emoji: '🔗👨‍👩‍👧',
          isWrong: false,
          reason: '先确认再点击更安全。'
        },
        {
          id: 'set_strong_pwd',
          title: '设置复杂密码',
          emoji: '🔐💪',
          isWrong: false,
          reason: '复杂密码更不容易被猜到。'
        },
        {
          id: 'keep_private_info',
          title: '不公开个人信息',
          emoji: '🙈📌',
          isWrong: false,
          reason: '保护隐私更安全。'
        },
        {
          id: 'close_unknown_popup',
          title: '遇到弹窗广告就关闭',
          emoji: '❎🪟',
          isWrong: false,
          reason: '不随便点广告，避免风险。'
        },
        {
          id: 'sit_correct',
          title: '正确坐姿用电脑',
          emoji: '🧑‍💻🪑',
          isWrong: false,
          reason: '坐姿正确更护眼、更健康。'
        },
        {
          id: 'rest_eyes',
          title: '用眼一会儿就休息',
          emoji: '👀⏸',
          isWrong: false,
          reason: '适当休息保护视力。'
        }
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

    // ===== 开新局：随机抽取 =====
    newRound() {
      // 1) 抽 needWrong 个“错误卡”
      const wrongPool = this.pool.filter(x => x.isWrong)
      const correctWrong = this.sample(wrongPool, this.needWrong)

      // 2) 抽剩余的正确卡
      const goodPool = this.pool.filter(x => !x.isWrong)
      const needGood = Math.max(0, this.showCount - this.needWrong)
      const goodCards = this.sample(goodPool, needGood)

      // 3) 合并打乱
      this.cards = this.shuffle([...correctWrong, ...goodCards])

      // 4) 重置状态
      this.picked = this.cards.reduce((m, it) => (m[it.id] = false, m), {})
      this.foundCount = 0
      this.success = false
      this.reported = false
      this.steps = 0
      this.correctClicks = 0
      this.misclick = 0

      // 5) 计时开始
      this.startClock()
      uni.vibrateShort({ type: 'light' })
    },

    // ===== 点击卡片 =====
    async tapCard(it) {
      if (this.success) return
      if (this.picked[it.id]) {
        uni.vibrateShort({ type: 'light' })
        this.toastMsg('你已经点过这张啦～')
        return
      }

      this.steps++
      this.$set(this.picked, it.id, true)

      if (it.isWrong) {
        this.foundCount++
        this.correctClicks++
        uni.vibrateLong()
        this.toastMsg('✅ 找对了！这是不合理信息')
      } else {
        this.misclick++
        uni.vibrateShort({ type: 'light' })
        this.toastMsg('❌ 这张是合理的哦，再找找！')
      }

      // 通关：找齐所有错误卡
      if (!this.success && this.foundCount >= this.needWrong) {
        this.success = true
        this.stopClock()
        uni.vibrateLong()

        const stars = this.calcStars()
        await this.reportPass({
          steps: this.steps,
          usedMs: this.elapsedMs,
          stars
        })
      }
    },

    // ===== 星星规则（可改）=====
    calcStars() {
      const sec = this.elapsedMs / 1000
      // 3星：误点0 且 40秒内
      if (this.misclick === 0 && sec <= 40) return 3
      // 2星：误点<=2 且 65秒内
      if (this.misclick <= 2 && sec <= 65) return 2
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

    // ===== UI class =====
    cardClass(it) {
      const p = !!this.picked[it.id]
      return {
        picked: p,
        good: p && !it.isWrong,
        bad: p && it.isWrong
      }
    },

    reset() {
      this.newRound()
    },

    goBack() {
      uni.navigateBack({ delta: 1 })
    },

    goNext() {
      if (!this.success) {
        uni.showToast({ title: '先找出所有错误图片再去下一关～', icon: 'none' })
        return
      }
      uni.redirectTo({ url: '/pages/game/level/level6' })
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

.pic{ font-size: 60rpx; }
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
.card.bad{
  border-color: rgba(46, 204, 113, 0.55);
  box-shadow: 0 0 0 8rpx rgba(46, 204, 113, 0.10), 0 10rpx 24rpx rgba(0,0,0,0.08);
}
.card.good{
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
