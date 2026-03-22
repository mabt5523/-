<template>
  <view class="page">
    <!-- 头部 -->
    <view class="header">
      <text class="title">第 20 关：扫码小心点 📱</text>
      <text class="tip">任务：判断扫码结果安全/危险 + 补上最后一位“校验码”</text>
    </view>

    <!-- HUD -->
    <view class="hud">
      <text class="badge">✅ 进度：{{ stepIndex + 1 }}/{{ rounds.length }}</text>
      <text class="small">⏱ 用时：{{ formatTime(elapsedMs) }}</text>
    </view>

    <view class="board">
      <view class="board-bg" />

      <!-- 提示栏 -->
      <view class="hintbar">
        <view class="topic">本局重点：二维码信息多｜扫码有风险｜校验码用来“发现输错/伪造”</view>
        <text class="hinttext">
          先看“扫码结果”，判断它是安全还是危险；再做一个小校验：补上最后一位校验码。
        </text>
      </view>

      <!-- 关卡内容 -->
      <view class="content">
        <!-- 上：真假扫码判断 -->
        <view class="panel">
          <view class="panel-head">
            <text class="panel-title">① 真假扫码判断</text>
            <text class="panel-sub">看到结果先判断：安全✅ / 危险⚠️</text>
          </view>

          <view class="scan-card">
            <view class="scan-top">
              <text class="scan-badge">{{ current.kindTag }}</text>
              <text class="scan-note">“二维码能装很多信息” → 更要看清结果</text>
            </view>

            <text class="scan-title">{{ current.title }}</text>

            <view class="scan-result">
              <text class="scan-label">扫码结果：</text>
              <text class="scan-text">{{ current.resultText }}</text>
            </view>

            <view class="scan-actions">
              <view
                class="btn safe"
                :class="{ disabled: answered.safety || isMoving }"
                @click="chooseSafety(true)"
              >
                ✅ 安全
              </view>
              <view
                class="btn danger"
                :class="{ disabled: answered.safety || isMoving }"
                @click="chooseSafety(false)"
              >
                ⚠️ 危险
              </view>
            </view>

            <view v-if="answered.safety" class="feedback" :class="{ ok: safetyOk, bad: !safetyOk }">
              <text v-if="safetyOk">✅ 判断正确：{{ current.safetyWhy }}</text>
              <text v-else>❌ 判断不对：{{ current.safetyWhy }}</text>
            </view>
          </view>
        </view>

        <!-- 下：简单校验码小游戏 -->
        <view class="panel">
          <view class="panel-head">
            <text class="panel-title">② 补最后一位校验码</text>
            <text class="panel-sub">校验码的意义：发现“输错/改动/伪造”</text>
          </view>

          <view class="check-card">
            <view class="check-row">
              <text class="check-label">校验规则：</text>
              <text class="check-rule">
                前面数字之和 % 10 = 最后一位（校验码）
              </text>
            </view>

            <view class="code-box">
              <view class="code-left">
                <text class="code-title">号码（最后一位缺失）</text>
                <text class="code-num">{{ current.check.base }}-?</text>
              </view>

              <view class="code-right">
                <text class="code-title">你来补：</text>
                <view class="digits">
                  <view
                    v-for="d in 10"
                    :key="'d'+d"
                    class="digit"
                    :class="{ picked: inputDigit === (d-1), disabled: !answered.safety || answered.check }"
                    @click="pickDigit(d-1)"
                  >
                    {{ d-1 }}
                  </view>
                </view>
              </view>
            </view>

            <view class="check-actions">
              <view
                class="btn check"
                :class="{ disabled: !answered.safety || answered.check || inputDigit===null }"
                @click="submitCheckDigit"
              >
                ✅ 提交校验码
              </view>
              <view class="btn reset" @click="resetRound" :class="{ disabled: isMoving }">↩ 重来这一题</view>
            </view>

            <view v-if="answered.check" class="feedback" :class="{ ok: checkOk, bad: !checkOk }">
              <text v-if="checkOk">✅ 校验码正确：{{ current.check.why }}</text>
              <text v-else>❌ 校验码不对：{{ current.check.why }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 底部按钮 -->
      <view class="footer">
        <view class="btn next"
              :class="{ disabled: !roundPassed || isMoving }"
              @click="nextRound">
          下一题 →
        </view>
        <view class="btn finish"
              :class="{ disabled: !allPassed || isMoving }"
              @click="finish">
          🎉 通关
        </view>
      </view>
    </view>

    <!-- 成功弹窗 -->
    <view v-if="success" class="popup" @touchmove.stop.prevent>
      <view class="popup-card">
        <text class="pop-title">🎉 毕业啦！</text>
        <text class="pop-desc">
          你学会了：
          <text class="linebreak" />
          1）二维码信息多 → 扫码前先看结果；
          <text class="linebreak" />
          2）遇到领奖/转账/要密码 → 多半危险；
          <text class="linebreak" />
          3）校验码能帮你发现输错或被篡改。
          <text class="linebreak" />
          用时：{{ formatTime(elapsedMs) }}｜错误：{{ wrongTimes }} 次｜星星：{{ earnedStars }}⭐
        </text>
        <view class="pop-actions">
          <view class="pop-btn" @click="resetAll">再玩一次</view>
          <view class="pop-btn primary" @click="goNext">返回选关 →</view>
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
      levelId: 20,

      levelProgress: { unlocked: true, stars: 0, bestSteps: null },
      reported: false,

      elapsedMs: 0,
      clock: null,
      startAt: 0,

      success: false,
      isMoving: false,

      wrongTimes: 0,
      earnedStars: 0,

      toast: { show: false, text: '' },

      // 题目列表：安全/危险判断 + 校验码补位
      // 校验规则：sum(baseDigits) % 10 = checkDigit
      rounds: [
        {
          id: 'r1',
          kindTag: '🏆 领奖',
          title: '“恭喜中奖！扫码领 100 元”',
          resultText: '打开页面：输入手机号 + 验证码 + 付款 1 元激活领奖',
          safeAnswer: false,
          safetyWhy: '领奖却要你付钱/填验证码，很像诈骗引导，属于危险扫码。',
          check: { base: '7318402', answer: 5, why: '7+3+1+8+4+0+2=25，25%10=5。校验码能发现输错或篡改。' }
        },
        {
          id: 'r2',
          kindTag: '🌐 官网',
          title: '“学校官网登录”',
          resultText: '打开网址：https://school.edu/login（域名是 .edu）',
          safeAnswer: true,
          safetyWhy: '明确的官方域名（.edu）且是登录页，不要求转账/隐私验证码，相对安全。',
          check: { base: '906513', answer: 4, why: '9+0+6+5+1+3=24，24%10=4。校验码用于检查输入是否正确。' }
        },
        {
          id: 'r3',
          kindTag: '💸 转账',
          title: '“扫码立刻领取补贴”',
          resultText: '跳转到聊天：让你添加客服并转账验证身份',
          safeAnswer: false,
          safetyWhy: '让你转账“验证身份”是典型诈骗话术，危险。',
          check: { base: '44890', answer: 5, why: '4+4+8+9+0=25，25%10=5。最后一位能帮你发现号码被改过。' }
        }
      ],

      stepIndex: 0,

      // 当前作答状态
      answered: {
        safety: false,
        check: false
      },
      safetyOk: false,
      checkOk: false,

      inputDigit: null,

      // 每题是否通过（两步都正确）
      passedMap: {}
    }
  },

  computed: {
    current() {
      return this.rounds[this.stepIndex]
    },
    roundPassed() {
      return this.passedMap[this.current.id] === true
    },
    allPassed() {
      return this.rounds.every(r => this.passedMap[r.id] === true)
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
      // 3星：90秒内且错误<=2
      if (sec <= 90 && wrongTimes <= 2) return 3
      // 2星：120秒内
      if (sec <= 120) return 2
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
            wrongTimes: this.wrongTimes
          }
        })

        this.levelProgress.stars = Math.max(this.levelProgress.stars || 0, stars)
        if (this.levelProgress.bestSteps == null) this.levelProgress.bestSteps = steps
        else this.levelProgress.bestSteps = Math.min(this.levelProgress.bestSteps, steps)
      } catch (e) {}
    },

    // ===== 新游戏 =====
    newGame() {
      this.success = false
      this.isMoving = false
      this.reported = false
      this.wrongTimes = 0
      this.earnedStars = 0
      this.stepIndex = 0
      this.passedMap = {}

      this.resetRound()
      this.stopClock()
      this.startClock()
      uni.vibrateShort({ type: 'light' })
    },

    resetRound() {
      this.answered = { safety: false, check: false }
      this.safetyOk = false
      this.checkOk = false
      this.inputDigit = null
      uni.vibrateShort({ type: 'light' })
    },

    // ===== 第一步：安全/危险 =====
    chooseSafety(isSafe) {
      if (this.answered.safety) return
      this.answered.safety = true

      const ok = isSafe === this.current.safeAnswer
      this.safetyOk = ok

      if (!ok) this.wrongTimes += 1

      uni.vibrateShort({ type: 'light' })
      this.toastMini(ok ? '✅ 判断正确' : '❌ 判断错误')
    },

    // ===== 第二步：选校验码 =====
    pickDigit(d) {
      if (!this.answered.safety) {
        this.toastMini('先完成上面的“安全/危险”判断～')
        return
      }
      if (this.answered.check) return
      this.inputDigit = d
      uni.vibrateShort({ type: 'light' })
    },

    submitCheckDigit() {
      if (!this.answered.safety) {
        this.toastMini('先完成上面的判断～')
        return
      }
      if (this.answered.check) return
      if (this.inputDigit === null) {
        this.toastMini('先选一个数字～')
        return
      }

      this.answered.check = true
      const ok = this.inputDigit === this.current.check.answer
      this.checkOk = ok
      if (!ok) this.wrongTimes += 1

      uni.vibrateShort({ type: 'light' })
      this.toastMini(ok ? '✅ 校验码正确' : '❌ 校验码不对')

      // 两步都对才算过
      if (this.safetyOk && this.checkOk) {
        this.passedMap[this.current.id] = true
        uni.vibrateLong()
        this.toastMini('🎉 本题通过！')
      }
    },

    // ===== 下一题 =====
    nextRound() {
      if (!this.roundPassed) {
        this.toastMini('先把本题两步都做对再进入下一题～')
        return
      }
      if (this.stepIndex < this.rounds.length - 1) {
        this.stepIndex += 1
        this.resetRound()
      } else {
        this.toastMini('已经是最后一题啦，点“通关”结束～')
      }
    },

    // ===== 通关 =====
    async finish() {
      if (!this.allPassed) {
        this.toastMini('还有题没通过哦～把每题两步都做对！')
        return
      }
      this.success = true
      this.stopClock()
      this.earnedStars = this.calcStars({ usedMs: this.elapsedMs, wrongTimes: this.wrongTimes })

      await this.reportPass({
        steps: this.rounds.length,
        usedMs: this.elapsedMs,
        stars: this.earnedStars
      })
    },

    resetAll() {
      this.newGame()
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
      // 毕业关：回选关或去结算页
      uni.redirectTo({ url: '/pages/game/level-select' })
    }
  }
}
</script>

<style scoped>
.page{
  height: 150vh;
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

  height: calc(110vh - 10rpx - 30rpx - 10rpx);
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

/* content two panels */
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
.panel{
  border-radius: 26rpx;
  background: rgba(79,108,255,0.06);
  border: 2rpx dashed rgba(79,108,255,0.18);
  padding: 12rpx;
  overflow: hidden;
}
.panel-head{
  margin-bottom: 10rpx;
}
.panel-title{
  display:block;
  font-size: 26rpx;
  font-weight: 900;
  color:#2b3a66;
}
.panel-sub{
  display:block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color:#6b7280;
  font-weight: 800;
}

/* scan card */
.scan-card{
  border-radius: 22rpx;
  background: rgba(255,255,255,0.92);
  border: 2rpx solid rgba(0,0,0,0.06);
  box-shadow: 0 10rpx 22rpx rgba(0,0,0,0.08);
  padding: 14rpx;
}
.scan-top{
  display:flex;
  justify-content: space-between;
  align-items:center;
  margin-bottom: 8rpx;
  gap: 10rpx;
}
.scan-badge{
  font-size: 22rpx;
  font-weight: 900;
  color:#4f6cff;
  background: rgba(79,108,255,0.10);
  padding: 6rpx 12rpx;
  border-radius: 999rpx;
}
.scan-note{
  font-size: 20rpx;
  color:#6b7280;
  font-weight: 800;
}
.scan-title{
  display:block;
  font-size: 26rpx;
  font-weight: 900;
  color:#2b3a66;
  margin-bottom: 10rpx;
}
.scan-result{
  display:flex;
  gap: 8rpx;
  margin-bottom: 12rpx;
}
.scan-label{
  font-size: 22rpx;
  font-weight: 900;
  color:#2b3a66;
}
.scan-text{
  flex: 1;
  font-size: 22rpx;
  color:#555;
  font-weight: 800;
  line-height: 1.4;
}
.scan-actions{
  display:flex;
  gap: 12rpx;
}
.btn{
  flex: 1;
  padding: 16rpx 0;
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
.safe{ background: linear-gradient(90deg,#2ed573 0%,#1e90ff 100%); color:#fff; }
.danger{ background: linear-gradient(90deg,#ff9f43 0%,#ff6b6b 100%); color:#fff; }

/* check card */
.check-card{
  border-radius: 22rpx;
  background: rgba(255,255,255,0.92);
  border: 2rpx solid rgba(0,0,0,0.06);
  box-shadow: 0 10rpx 22rpx rgba(0,0,0,0.08);
  padding: 14rpx;
}
.check-row{
  display:flex;
  gap: 8rpx;
  margin-bottom: 12rpx;
}
.check-label{
  font-size: 22rpx;
  font-weight: 900;
  color:#2b3a66;
}
.check-rule{
  flex: 1;
  font-size: 22rpx;
  color:#555;
  font-weight: 800;
  line-height: 1.4;
}
.code-box{
  display:flex;
  gap: 12rpx;
  margin-bottom: 12rpx;
}
.code-left,.code-right{
  flex: 1;
  border-radius: 18rpx;
  background: rgba(79,108,255,0.06);
  border: 2rpx solid rgba(79,108,255,0.12);
  padding: 12rpx;
}
.code-title{
  display:block;
  font-size: 22rpx;
  font-weight: 900;
  color:#2b3a66;
  margin-bottom: 10rpx;
}
.code-num{
  font-size: 30rpx;
  font-weight: 900;
  color:#4f6cff;
}
.digits{
  display:grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10rpx;
}
.digit{
  border-radius: 16rpx;
  background: rgba(255,255,255,0.92);
  border: 2rpx solid rgba(0,0,0,0.06);
  text-align:center;
  padding: 14rpx 0;
  font-size: 24rpx;
  font-weight: 900;
  color:#2b3a66;
}
.digit:active{ transform: scale(0.98); }
.digit.picked{
  border-color: rgba(79,108,255,0.35);
  background: rgba(79,108,255,0.12);
  color:#4f6cff;
}
.digit.disabled{
  opacity: 0.55;
  pointer-events:none;
}

.check-actions{
  display:flex;
  gap: 12rpx;
}
.check{ background: linear-gradient(90deg,#4f6cff 0%,#667eea 100%); color:#fff; }
.reset{ background: linear-gradient(90deg,#f5f5f5 0%,#e9e9e9 100%); color:#555; }

/* feedback */
.feedback{
  margin-top: 12rpx;
  border-radius: 18rpx;
  padding: 12rpx;
  font-size: 22rpx;
  font-weight: 900;
}
.feedback.ok{ background: rgba(46,213,115,0.12); color:#167c3a; }
.feedback.bad{ background: rgba(255,107,107,0.12); color:#b42318; }

/* footer */
.footer{
  position: relative;
  z-index: 1;
  display:flex;
  gap: 12rpx;
}
.next{ background: linear-gradient(90deg,#ff9f43 0%,#ff6b6b 100%); color:#fff; }
.finish{ background: linear-gradient(90deg,#4f6cff 0%,#667eea 100%); color:#fff; }

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
  background: linear-gradient(90deg,#4f6cff 0%,#667eea 100%);
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
</style>
