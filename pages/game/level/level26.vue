<template>
  <view class="page">
    <!-- 头部 -->
    <view class="header">
      <text class="title">第 26 关：数据守护者 🛡️</text>
      <text class="tip">任务：角色扮演判断哪些行为安全（隐私与数据安全）</text>
    </view>

    <!-- HUD -->
    <view class="hud">
      <text class="badge">✅ 进度：{{ doneCount }}/{{ totalCount }}</text>
      <text class="small">⏱ 用时：{{ formatTime(elapsedMs) }}</text>
    </view>

    <view class="board">
      <view class="board-bg" />

      <!-- 提示栏 -->
      <view class="hintbar">
        <view class="topic">本局重点：数据安全｜隐私保护</view>
        <text class="hinttext">
          读情景卡，判断「安全 / 危险」，并选出更好的做法。
          <text class="linebreak" />
          记住：不随便给手机号、不乱连公共 WiFi、遇到陌生链接先核实！
        </text>
      </view>

      <view class="content">
        <!-- 左侧：情景卡 -->
        <view class="scene-card">
          <view class="scene-head">
            <text class="scene-title">情景 {{ currentIndex + 1 }}/{{ totalCount }}</text>
            <view class="risk-pill" :class="riskClass">
              <text>{{ riskText }}</text>
            </view>
          </view>

          <view class="scene-body">
            <text class="scene-role">🎭 你的身份：{{ current.role }}</text>
            <text class="scene-text">{{ current.text }}</text>
          </view>

          <view class="scene-ops">
            <view class="op">
              <text class="op-label">你会怎么做？</text>
              <view class="answers">
                <view class="ans safe" @click="choose('safe')" :class="{ disabled: locked }">✅ 安全</view>
                <view class="ans danger" @click="choose('danger')" :class="{ disabled: locked }">⚠️ 危险</view>
              </view>
            </view>

            <view class="op">
              <text class="op-label">更好的做法（选一个）</text>
              <view class="advice-grid">
                <view
                  v-for="(a, i) in current.actions"
                  :key="i"
                  class="advice"
                  @click="pickAdvice(i)"
                  :class="{
                    picked: pickedAdviceIndex===i,
                    disabled: locked
                  }"
                >
                  <text class="advice-text">{{ a }}</text>
                </view>
              </view>
            </view>

            <view class="buttons">
              <view class="btn reset" @click="resetCurrent" :class="{ disabled: locked }">↩ 重选</view>
              <view class="btn check" @click="check" :class="{ disabled: locked || !pickedLabel || pickedAdviceIndex===-1 }">
                ✅ 提交
              </view>
            </view>
          </view>
        </view>

        <!-- 右侧：小抄 -->
        <view class="cheat-card">
          <text class="cheat-title">🧠 守护者小抄</text>

          <view class="cheat-item">
            <text class="dot"></text>
            <text class="cheat-text">手机号/身份证/验证码：能不填就不填</text>
          </view>
          <view class="cheat-item">
            <text class="dot"></text>
            <text class="cheat-text">陌生网站/弹窗领奖：先核实网址与来源</text>
          </view>
          <view class="cheat-item">
            <text class="dot"></text>
            <text class="cheat-text">公共 WiFi：不要登录银行/支付；必要时用热点/VPN</text>
          </view>
          <view class="cheat-item">
            <text class="dot"></text>
            <text class="cheat-text">验证码/密码：任何人都不能要（包括“客服”）</text>
          </view>

          <view class="score-box">
            <view class="score-row">
              <text class="score-l">已完成：</text>
              <text class="score-v">{{ doneCount }}/{{ totalCount }}</text>
            </view>
            <view class="score-row">
              <text class="score-l">错误：</text>
              <text class="score-v bad">{{ wrongTimes }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 结果弹窗（每题） -->
    <view v-if="resultPopup.show" class="mini-popup" @touchmove.stop.prevent>
      <view class="mini-card">
        <text class="mini-title">{{ resultPopup.ok ? '✅ 判断正确！' : '❌ 判断有误' }}</text>
        <text class="mini-desc">{{ resultPopup.msg }}</text>
        <view class="mini-actions">
          <view class="mini-btn" @click="closeResult">继续</view>
        </view>
      </view>
    </view>

    <!-- 通关弹窗 -->
    <view v-if="success" class="popup" @touchmove.stop.prevent>
      <view class="popup-card">
        <text class="pop-title">🎉 通关成功！</text>
        <text class="pop-desc">
          你学会了：保护隐私、注意数据安全！
          <text class="linebreak" />
          不随便给手机号｜公共 WiFi 不做敏感登录｜陌生链接先核实
          <text class="linebreak" />
          用时：{{ formatTime(elapsedMs) }}｜错误：{{ wrongTimes }} 次｜星星：{{ earnedStars }}⭐
        </text>
        <view class="pop-actions">
          <view class="pop-btn" @click="newRound">再玩一次</view>
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
      levelId: 26,

      // 后端进度
      levelProgress: { unlocked: true, stars: 0, bestSteps: null },
      reported: false,

      // 计时
      elapsedMs: 0,
      clock: null,
      startAt: 0,

      // 题目
      scenes: [
        {
          key: 'phone_unknown_site',
          role: '想领取“免费皮肤”的玩家',
          text: '你看到一个陌生网站写着“输入手机号立即领取奖励”，你要不要填手机号？',
          truth: 'danger',
          bestAdviceIndex: 1,
          actions: [
            '先填手机号领取，反正可以再拉黑',
            '不填；去官方活动页/官方App核实是否真的有活动',
            '把手机号写在备注里“别打电话”，就安全了',
            '随便填一个同学的手机号先试试'
          ],
          explainOk: '对！陌生网站要手机号很可能用来骚扰/诈骗，先去官方渠道核实。',
          explainBad: '更安全的做法是：不在陌生网站填手机号，去官方渠道核实。'
        },
        {
          key: 'public_wifi_login',
          role: '在咖啡店写作业的学生',
          text: '你连上了“Cafe_Free_WiFi”，准备登录支付/网银查账，这样安全吗？',
          truth: 'danger',
          bestAdviceIndex: 2,
          actions: [
            '公共 WiFi 速度快，直接登录就行',
            '只要不下载东西就安全，可以登录网银',
            '不要在公共 WiFi 做支付/网银登录，改用手机热点或回家再操作',
            '先把密码发给同学，让同学帮你查'
          ],
          explainOk: '对！公共 WiFi 可能被监听，敏感登录尽量用热点或可信网络。',
          explainBad: '更安全的做法是：公共 WiFi 不做支付/网银登录，改用热点或可信网络。'
        },
        {
          key: 'sms_code',
          role: '接到“客服”电话的人',
          text: '有人自称客服，说要帮你“退款”，让你把短信验证码告诉他，你给吗？',
          truth: 'danger',
          bestAdviceIndex: 3,
          actions: [
            '给他验证码，反正他说是客服',
            '先把验证码截图发过去更清楚',
            '让他等一会儿，再去群里问问同学',
            '不提供任何验证码；挂断并用官方电话/官方App联系客服核实'
          ],
          explainOk: '对！验证码等同于“钥匙”，任何人都不能要。',
          explainBad: '正确做法是：不提供验证码，自己用官方渠道核实。'
        },
        {
          key: 'permission_app',
          role: '下载了一个手电筒App的人',
          text: '一个“手电筒App”要求读取通讯录、短信和定位，你要不要同意？',
          truth: 'danger',
          bestAdviceIndex: 2,
          actions: [
            '同意，不然用不了手电筒',
            '同意定位就行，通讯录短信也无所谓',
            '不同意；手电筒不需要这些权限，换个更正规的App',
            '把手机给朋友，让他帮你点同意'
          ],
          explainOk: '对！不需要的权限别给，能减少隐私泄露风险。',
          explainBad: '更安全：不给不必要权限，换正规应用。'
        },
        {
          key: 'real_name',
          role: '注册网站账号的新用户',
          text: '一个不知名论坛让你上传身份证照片“认证”，你该怎么做？',
          truth: 'danger',
          bestAdviceIndex: 1,
          actions: [
            '上传身份证正反面，省得麻烦',
            '不上传；除非是明确可信的官方平台，否则不要提供身份证照片',
            '把身份证号打码但照片全上传',
            '让网站发邮件保证“不会泄露”，就可以上传'
          ],
          explainOk: '对！身份证属于高敏感信息，必须慎重，优先只在可信官方平台提供。',
          explainBad: '更安全：不在不知名网站上传身份证照片，只在可信官方平台处理。'
        }
      ],

      currentIndex: 0,

      // 当前选择
      pickedLabel: '', // safe/danger
      pickedAdviceIndex: -1,
      locked: false,

      // 统计
      wrongTimes: 0,
      earnedStars: 0,
      success: false,

      // UI
      toast: { show: false, text: '' },
      resultPopup: { show: false, ok: true, msg: '' }
    }
  },

  computed: {
    totalCount() {
      return this.scenes.length
    },
    doneCount() {
      return this.currentIndex
    },
    current() {
      return this.scenes[this.currentIndex] || this.scenes[this.scenes.length - 1]
    },
    riskText() {
      // 仅用于 UI 提示：真实答案不提前暴露
      return this.pickedLabel ? (this.pickedLabel === 'safe' ? '你选：安全' : '你选：危险') : '请判断安全性'
    },
    riskClass() {
      if (!this.pickedLabel) return 'idle'
      return this.pickedLabel === 'safe' ? 'ok' : 'bad'
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
      if (sec <= 90 && wrongTimes <= 1) return 3
      if (sec <= 140) return 2
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
            usedTimeSec: Math.round(usedMs / 1000),
            wrongTimes: this.wrongTimes
          }
        })
      } catch (e) {}
    },

    // ===== 初始化 =====
    newRound() {
      this.reported = false
      this.currentIndex = 0
      this.success = false
      this.wrongTimes = 0
      this.earnedStars = 0
      this.resetCurrent(true)

      this.stopClock()
      this.startClock()
      uni.vibrateShort({ type: 'light' })
      this.toastMini('🛡️ 做出更安全的选择吧！')
    },

    resetCurrent(silent = false) {
      this.pickedLabel = ''
      this.pickedAdviceIndex = -1
      this.locked = false
      if (!silent) {
        uni.vibrateShort({ type: 'light' })
        this.toastMini('已重选～')
      }
    },

    choose(label) {
      if (this.locked) return
      this.pickedLabel = label
      uni.vibrateShort({ type: 'light' })
    },

    pickAdvice(i) {
      if (this.locked) return
      this.pickedAdviceIndex = i
      uni.vibrateShort({ type: 'light' })
    },

    check() {
      if (this.locked) return
      if (!this.pickedLabel || this.pickedAdviceIndex === -1) return

      const c = this.current
      const ok1 = this.pickedLabel === c.truth
      const ok2 = this.pickedAdviceIndex === c.bestAdviceIndex
      const ok = ok1 && ok2

      this.locked = true

      if (ok) {
        uni.vibrateShort({ type: 'light' })
        this.resultPopup = { show: true, ok: true, msg: c.explainOk }
      } else {
        this.wrongTimes += 1
        uni.vibrateShort({ type: 'light' })
        this.resultPopup = { show: true, ok: false, msg: c.explainBad }
      }
    },

    async closeResult() {
      this.resultPopup.show = false
      this.locked = false

      // 下一题 / 结算
      if (this.currentIndex < this.totalCount - 1) {
        this.currentIndex += 1
        this.resetCurrent(true)
        uni.vibrateShort({ type: 'light' })
        return
      }

      // 通关
      this.success = true
      this.stopClock()
      this.earnedStars = this.calcStars({ usedMs: this.elapsedMs, wrongTimes: this.wrongTimes })
      uni.vibrateLong()

      await this.reportPass({
        steps: this.totalCount,
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
      uni.redirectTo({ url: '/pages/game/level/level27' })
    }
  }
}
</script>

<style scoped>
.page{
  height: 130vh;
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

.content{
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  display:flex;
  gap: 10rpx;
  overflow: hidden;
}

/* scene card */
.scene-card{
  flex: 1.25;
  min-height: 0;
  border-radius: 26rpx;
  background: rgba(255,255,255,0.92);
  border: 2rpx solid rgba(0,0,0,0.06);
  box-shadow: 0 10rpx 22rpx rgba(0,0,0,0.08);
  padding: 14rpx;
  overflow: hidden;
  display:flex;
  flex-direction: column;
}
.scene-head{
  display:flex;
  align-items:center;
  justify-content: space-between;
  gap: 10rpx;
  margin-bottom: 10rpx;
}
.scene-title{
  font-size: 24rpx;
  font-weight: 900;
  color:#2b3a66;
}
.risk-pill{
  padding: 10rpx 14rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 900;
}
.risk-pill.idle{ background: rgba(0,0,0,0.06); color:#666; }
.risk-pill.ok{ background: rgba(46,213,115,0.14); color:#167c3a; }
.risk-pill.bad{ background: rgba(255,107,107,0.14); color:#b42318; }

.scene-body{
  border-radius: 22rpx;
  background: rgba(79,108,255,0.06);
  border: 2rpx dashed rgba(79,108,255,0.14);
  padding: 14rpx;
}
.scene-role{
  display:block;
  font-size: 22rpx;
  font-weight: 900;
  color:#2b3a66;
  margin-bottom: 8rpx;
}
.scene-text{
  display:block;
  font-size: 26rpx;
  font-weight: 900;
  color:#2b3a66;
  line-height: 1.5;
}

.scene-ops{
  margin-top: 10rpx;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display:flex;
  flex-direction: column;
  gap: 10rpx;
}
.op-label{
  display:block;
  font-size: 22rpx;
  font-weight: 900;
  color:#2b3a66;
  margin-bottom: 8rpx;
}
.answers{
  display:flex;
  gap: 12rpx;
}
.ans{
  flex: 1;
  padding: 18rpx 0;
  text-align:center;
  border-radius: 999rpx;
  font-size: 26rpx;
  font-weight: 900;
  box-shadow: 0 12rpx 24rpx rgba(0,0,0,0.10);
}
.ans:active{ transform: scale(0.98); }
.ans.disabled{ opacity: 0.55; pointer-events:none; box-shadow:none; }
.safe{ background: linear-gradient(90deg,#2ed573 0%,#1e90ff 100%); color:#fff; }
.danger{ background: linear-gradient(90deg,#ff9f43 0%,#ff6b6b 100%); color:#fff; }

.advice-grid{
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap: 10rpx;
}
.advice{
  border-radius: 20rpx;
  background: rgba(255,255,255,0.92);
  border: 2rpx solid rgba(0,0,0,0.06);
  box-shadow: 0 10rpx 22rpx rgba(0,0,0,0.06);
  padding: 14rpx;
}
.advice:active{ transform: scale(0.99); }
.advice.picked{
  border-color: rgba(46,213,115,0.45);
  background: rgba(46,213,115,0.10);
}
.advice.disabled{ opacity: 0.6; pointer-events:none; box-shadow:none; }
.advice-text{
  font-size: 22rpx;
  font-weight: 900;
  color:#2b3a66;
  line-height: 1.35;
}

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
.btn.disabled{ opacity: 0.55; pointer-events:none; box-shadow:none; }
.reset{ background: linear-gradient(90deg,#f5f5f5 0%,#e9e9e9 100%); color:#555; }
.check{ background: linear-gradient(90deg,#4f6cff 0%,#667eea 100%); color:#fff; }

/* cheat */
.cheat-card{
  flex: 0.9;
  min-height: 0;
  border-radius: 26rpx;
  background: rgba(255,255,255,0.92);
  border: 2rpx solid rgba(0,0,0,0.06);
  box-shadow: 0 10rpx 22rpx rgba(0,0,0,0.08);
  padding: 14rpx;
  overflow: hidden;
}
.cheat-title{
  display:block;
  font-size: 24rpx;
  font-weight: 900;
  color:#2b3a66;
  margin-bottom: 10rpx;
}
.cheat-item{
  display:flex;
  gap: 10rpx;
  align-items:flex-start;
  margin-bottom: 10rpx;
}
.dot{
  width: 10rpx;
  height: 10rpx;
  border-radius: 999rpx;
  background: rgba(79,108,255,0.75);
  margin-top: 10rpx;
}
.cheat-text{
  font-size: 22rpx;
  font-weight: 800;
  color:#6b7280;
  line-height: 1.4;
}
.score-box{
  margin-top: 10rpx;
  border-radius: 20rpx;
  background: rgba(79,108,255,0.06);
  border: 2rpx dashed rgba(79,108,255,0.14);
  padding: 12rpx;
}
.score-row{
  display:flex;
  justify-content: space-between;
  margin-bottom: 6rpx;
}
.score-l{
  font-size: 22rpx;
  font-weight: 900;
  color:#2b3a66;
}
.score-v{
  font-size: 24rpx;
  font-weight: 900;
  color:#2b3a66;
}
.score-v.bad{ color:#ff6b6b; }

/* per-question popup */
.mini-popup{
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  display:flex;
  align-items:center;
  justify-content:center;
  z-index: 98;
  backdrop-filter: blur(6rpx);
}
.mini-card{
  width: 82vw;
  background: rgba(255,255,255,0.96);
  border-radius: 28rpx;
  padding: 40rpx 30rpx 30rpx;
  box-shadow: 0 22rpx 60rpx rgba(0,0,0,0.22);
}
.mini-title{
  display:block;
  font-size: 38rpx;
  font-weight: 900;
  color:#2b3a66;
  margin-bottom: 12rpx;
  text-align:center;
}
.mini-desc{
  display:block;
  font-size: 24rpx;
  font-weight: 800;
  color:#555;
  line-height: 1.6;
  margin-bottom: 18rpx;
}
.mini-actions{
  display:flex;
  justify-content:center;
}
.mini-btn{
  width: 60%;
  padding: 16rpx 0;
  border-radius: 999rpx;
  text-align:center;
  font-size: 26rpx;
  font-weight: 900;
  background: linear-gradient(90deg,#4f6cff 0%,#667eea 100%);
  color:#fff;
  box-shadow: 0 12rpx 24rpx rgba(0,0,0,0.12);
}

/* success popup */
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
