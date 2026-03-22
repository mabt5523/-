<template>
  <view class="page">
    <!-- Header -->
    <view class="header">
      <text class="title">第 29 关：AI 世界 · 数据点亮新生活 💬</text>
      <text class="tip">任务：用“证据卡”支撑观点，并给回答打可信度（聊天气泡式）</text>
    </view>

    <!-- HUD -->
    <view class="hud">
      <text class="badge">🧩 进度：{{ currentIndex + 1 }}/{{ quiz.length }}</text>
      <text class="badge">🎯 分数：{{ score }}</text>
      <text class="small">⏱ 用时：{{ formatTime(elapsedMs) }}</text>
    </view>

    <view class="board">
      <view class="board-bg" />

      <!-- 上：提示 -->
      <view class="hintbar">
        <view class="topic">本局重点：回答要“有证据”｜可信度要“可解释”</view>
        <text class="hinttext">
          玩法：
          <text class="linebreak" />
          1）看 AI 回答 + 证据卡；
          <text class="linebreak" />
          2）多选“支持回答”的证据卡（别选干扰项）；
          <text class="linebreak" />
          3）选择可信度：✅可靠 / ⚠️部分可靠 / ❌不可靠；
          <text class="linebreak" />
          4）点击「提交判定」进入下一题。
        </text>
      </view>

      <!-- 中：聊天区 -->
      <scroll-view class="chat" scroll-y :scroll-top="scrollTop">
        <!-- 用户问题 -->
        <view class="msg-row user">
          <view class="bubble user-bubble">
            <text class="bubble-title">你：</text>
            <text class="bubble-text">{{ curQ.question }}</text>
          </view>
        </view>

        <!-- AI回答 -->
        <view class="msg-row ai">
          <view class="bubble ai-bubble">
            <view class="ai-head">
              <text class="ai-name">AI：</text>
              <view class="tag" :class="aiTagClass">
                <text class="tag-t">{{ aiTagText }}</text>
              </view>
            </view>
            <text class="bubble-text">{{ curQ.answer }}</text>

            <view class="ai-sub">
              <text class="ai-subt">📌 现在请你用“证据卡”来判断它能不能信。</text>
            </view>
          </view>
        </view>

        <!-- 证据卡区域 -->
        <view class="evidence-wrap">
          <text class="section-title">📎 证据卡（多选：支持回答的证据）</text>

          <view class="cards">
            <view
              class="card"
              v-for="(c, idx) in curQ.cards"
              :key="idx"
              :class="{ picked: pickedSet.has(idx), disabled: locked }"
              @click="toggleCard(idx)"
            >
              <view class="card-top">
                
                <text class="card-title">{{ c.title }}</text>
              </view>
              <text class="card-desc">{{ c.desc }}</text>

              <view class="pickmark" v-if="pickedSet.has(idx)">
                <text>✅ 已选</text>
              </view>
            </view>
          </view>

          <view class="mini-tip">
            <text>提示：选“与回答直接相关”的数据证据，别选“过时/道听途说/无关”的干扰项。</text>
          </view>
        </view>

        <!-- 可信度按钮 -->
        <view class="cred-wrap">
          <text class="section-title">🎚 可信度判断</text>

          <view class="cred-buttons">
            <view
              class="cred-btn ok"
              :class="{ active: chosenCred === 'OK', disabled: locked }"
              @click="chooseCred('OK')"
            >
              ✅ 可靠
            </view>
            <view
              class="cred-btn mid"
              :class="{ active: chosenCred === 'MID', disabled: locked }"
              @click="chooseCred('MID')"
            >
              ⚠️ 部分可靠
            </view>
            <view
              class="cred-btn bad"
              :class="{ active: chosenCred === 'BAD', disabled: locked }"
              @click="chooseCred('BAD')"
            >
              ❌ 不可靠
            </view>
          </view>

          <view class="cred-explain" v-if="chosenCred">
            <text class="ex-title">你选择了：</text>
            <text class="ex-val">{{ credText(chosenCred) }}</text>
          </view>
        </view>

        <!-- 判定反馈（提交后显示） -->
        <view class="result" v-if="showResult">
          <view class="result-card" :class="resultOk ? 'r-ok' : 'r-bad'">
            <text class="r-title">{{ resultOk ? '✅ 判定正确！' : '❌ 还可以更准确～' }}</text>
            <text class="r-desc">{{ resultMsg }}</text>

            <view class="r-score">
              <text class="r-item">本题得分：{{ lastGain }}</text>
              <text class="r-item">总分：{{ score }}</text>
            </view>

            <view class="r-next">
              <view class="btn next" @click="nextQuestion">
                {{ currentIndex === quiz.length - 1 ? '完成 →' : '下一题 →' }}
              </view>
            </view>
          </view>
        </view>

        <view style="height: 24rpx;"></view>
      </scroll-view>

      <!-- 底部操作栏 -->
      <view class="bottom-bar">
        <view class="bar-left">
          <text class="bar-small">已选证据：{{ pickedSet.size }}</text>
          <text class="bar-small">需要选择可信度：{{ chosenCred ? '✅' : '❗' }}</text>
        </view>

        <view class="bar-right">
          <view class="btn reset" :class="{ disabled: locked }" @click="resetPick">清空</view>
          <view class="btn submit" :class="{ disabled: !canSubmit }" @click="submitJudge">提交判定</view>
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
          1）AI 回答要用“数据证据”支撑；
          <text class="linebreak" />
          2）证据充分→更可靠；证据不足/有冲突→要谨慎；
          <text class="linebreak" />
          3）能说清“为什么信/不信”，才算会用 AI。
          <text class="linebreak" />
          总分：{{ score }} ｜用时：{{ formatTime(elapsedMs) }} ｜错误：{{ wrongTimes }} 次 ｜星星：{{ earnedStars }}⭐
        </text>

        <view class="pop-actions">
          <view class="pop-btn" @click="restart">再玩一次</view>
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
      levelId: 29,

      // ===== 后端进度 =====
      levelProgress: { unlocked: true, stars: 0, bestSteps: null, bestScore: 0, bestTimeMs: null },
      reported: false,

      // ===== 计时 =====
      elapsedMs: 0,
      clock: null,
      startAt: 0,

      // ===== 通用统计 =====
      score: 0,
      wrongTimes: 0,
      earnedStars: 0,
      success: false,

      // UI
      toast: { show: false, text: '' },

      // ===== 题库 =====
      quiz: [
        {
          id: 1,
          question: '今天东京天气怎么样？',
          answer: '根据天气数据，今天东京有小雨，最高 9°C，降雨概率较高。',
          correct: { keyEvidenceIdx: [0, 1], trapIdx: [2, 3], cred: 'OK' },
          cards: [
            { kind: 'DATA', title: '气象数据（今日）', desc: '东京：降雨概率 80%，最高 9°C。' },
            { kind: 'DATA', title: '小时预报（上午）', desc: '上午有降雨云带，局部小雨。' },
            { kind: 'TRAP', title: '去年同日天气', desc: '去年这天是晴天（过时，不能代表今天）。' },
            { kind: 'TRAP', title: '朋友说会晴', desc: '口头说法，无数据来源（不可靠证据）。' }
          ]
        },
        {
          id: 2,
          question: '为什么有些人喝咖啡会睡不着？',
          answer: '咖啡因会阻断“腺苷受体”，降低困意；但每个人对咖啡因敏感度不同，所以表现不一样。',
          correct: { keyEvidenceIdx: [0, 1], trapIdx: [2, 3], cred: 'MID' },
          cards: [
            { kind: 'DATA', title: '科普解释', desc: '腺苷与睡眠压力相关；咖啡因会影响困意。' },
            { kind: 'DATA', title: '研究摘要', desc: '咖啡因半衰期存在明显个体差异。' },
            { kind: 'TRAP', title: '绝对化结论', desc: '“喝咖啡的人一定会失眠”（过度绝对）。' },
            { kind: 'TRAP', title: '错误概念', desc: '“咖啡因是维生素”（概念不对）。' }
          ]
        },
        {
          id: 3,
          question: '长颈鹿和斑马是捕食关系吗？',
          answer: '是的，长颈鹿会捕食斑马。',
          correct: { keyEvidenceIdx: [0, 1], trapIdx: [2], cred: 'BAD' },
          cards: [
            { kind: 'DATA', title: '食性数据（长颈鹿）', desc: '长颈鹿主要以树叶为食（草食）。' },
            { kind: 'DATA', title: '食性数据（斑马）', desc: '斑马主要以草为食（草食）。' },
            { kind: 'TRAP', title: '“食物链图”', desc: '图里画在一起≠捕食关系（不能当证据）。' }
          ]
        }
      ],
      currentIndex: 0,

      // ===== 作答状态 =====
      pickedSet: new Set(),
      chosenCred: null,

      locked: false,
      showResult: false,
      resultOk: false,
      resultMsg: '',
      lastGain: 0,

      // ✅ 用于上报：每题记录
      answers: [],

      // scroll
      scrollTop: 0
    }
  },

  computed: {
    curQ() {
      return this.quiz[this.currentIndex] || this.quiz[0]
    },
    canSubmit() {
      return !this.locked && this.pickedSet.size > 0 && !!this.chosenCred
    },
    aiTagText() {
      if (!this.chosenCred) return '待判定'
      return this.chosenCred === 'OK'
        ? '你倾向：可靠'
        : this.chosenCred === 'MID'
        ? '你倾向：部分可靠'
        : '你倾向：不可靠'
    },
    aiTagClass() {
      if (!this.chosenCred) return 't-idle'
      return this.chosenCred === 'OK' ? 't-ok' : this.chosenCred === 'MID' ? 't-mid' : 't-bad'
    }
  },

  async onLoad() {
    await this.loadLevelProgress()
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
          bestSteps: res.bestSteps ?? res.best_steps ?? null,
          bestScore: Number(res.bestScore ?? res.best_score ?? 0),
          bestTimeMs: res.bestTimeMs ?? res.best_time_ms ?? null
        }
        if (!this.levelProgress.unlocked) {
          uni.showToast({ title: '该关卡未解锁', icon: 'none' })
          setTimeout(() => uni.redirectTo({ url: '/pages/game/level-select' }), 500)
        }
      } catch (e) {}
    },

    // ===== 后端：上报通关 =====
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
            score: this.score,
            usedTimeMs: usedMs,
            usedTimeSec: Math.round(usedMs / 1000),
            wrongTimes: this.wrongTimes,
            // ✅ 把每题选择也发给后端（你后端不需要可删）
            answers: this.answers
          }
        })

        this.levelProgress.stars = Math.max(this.levelProgress.stars || 0, stars)
        this.levelProgress.bestScore = Math.max(this.levelProgress.bestScore || 0, this.score)
        if (this.levelProgress.bestTimeMs == null) this.levelProgress.bestTimeMs = usedMs
        else this.levelProgress.bestTimeMs = Math.min(this.levelProgress.bestTimeMs, usedMs)
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
      if (this.clock) clearInterval(this.clock)
      this.clock = null
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
    calcStars({ usedMs, wrongTimes, score }) {
      const sec = usedMs / 1000
      if (score >= 250 && sec <= 120 && wrongTimes <= 0) return 3
      if (score >= 200 && sec <= 180) return 2
      return 1
    },

    // ===== 初始化/重开 =====
    newRound() {
      this.reported = false
      this.success = false

      this.score = 0
      this.wrongTimes = 0
      this.earnedStars = 0

      this.currentIndex = 0
      this.pickedSet = new Set()
      this.chosenCred = null

      this.locked = false
      this.showResult = false
      this.resultOk = false
      this.resultMsg = ''
      this.lastGain = 0

      this.answers = []

      this.stopClock()
      this.startClock()
      uni.vibrateShort({ type: 'light' })
      this.toastMini('💬 模拟 ChatGPT：用证据支撑观点！')
      this.scrollToTop()
    },

    // ===== UI =====
    toastMini(text) {
      this.toast.text = text
      this.toast.show = true
      clearTimeout(this._t)
      this._t = setTimeout(() => (this.toast.show = false), 900)
    },
    credText(c) {
      if (c === 'OK') return '✅可靠（证据充分）'
      if (c === 'MID') return '⚠️部分可靠（有依据但有条件/不足）'
      return '❌不可靠（缺证据/冲突/胡编）'
    },

    // ===== 交互 =====
    toggleCard(idx) {
      if (this.locked) return
      if (this.pickedSet.has(idx)) this.pickedSet.delete(idx)
      else this.pickedSet.add(idx)
      // Set 非响应式：强制刷新
      this.pickedSet = new Set(this.pickedSet)
      uni.vibrateShort({ type: 'light' })
    },
    resetPick() {
      if (this.locked) return
      this.pickedSet = new Set()
      this.chosenCred = null
      uni.vibrateShort({ type: 'light' })
      this.toastMini('已清空选择～')
    },
    chooseCred(c) {
      if (this.locked) return
      this.chosenCred = c
      uni.vibrateShort({ type: 'light' })
    },

    // ===== 判分 =====
    scoreOneQuestion(q, pickedIdxArr, cred) {
      const key = new Set(q.correct.keyEvidenceIdx)
      const trap = new Set(q.correct.trapIdx)

      let hitKey = 0
      let hitTrap = 0
      pickedIdxArr.forEach(i => {
        if (key.has(i)) hitKey += 1
        if (trap.has(i)) hitTrap += 1
      })

      // 证据 0~70
      let evScore = Math.min(hitKey, 2) * 35
      evScore -= hitTrap * 20
      if (evScore < 0) evScore = 0

      // 可信度 0~30
      const credScore = cred === q.correct.cred ? 30 : 0

      const total = evScore + credScore
      const ok = total >= 80

      let msg = ''
      if (ok) {
        msg = `做得对：命中关键证据 ${hitKey} 个，且可信度判断合适。`
      } else {
        const needKeys = q.correct.keyEvidenceIdx.length
        const missed = Math.max(0, needKeys - hitKey)
        if (hitTrap > 0) msg += `你选到了 ${hitTrap} 个干扰项。`
        if (missed > 0) msg += (msg ? ' ' : '') + `你还缺少 ${missed} 个关键证据。`
        if (cred !== q.correct.cred) msg += (msg ? ' ' : '') + `可信度建议：${this.credText(q.correct.cred)}。`
        if (!msg) msg = '再看看哪些证据真正“直接支撑”回答。'
      }

      return { total, ok, msg, hitKey, hitTrap }
    },

    // ===== 提交判定 =====
    submitJudge() {
      if (!this.canSubmit) {
        this.toastMini('先选证据卡 + 选择可信度～')
        return
      }

      const pickedIdxArr = Array.from(this.pickedSet)
      const res = this.scoreOneQuestion(this.curQ, pickedIdxArr, this.chosenCred)

      // ✅ 记录本题
      this.answers.push({
        qid: this.curQ.id,
        picked: pickedIdxArr,
        cred: this.chosenCred,
        gain: res.total,
        ok: res.ok
      })

      this.locked = true
      this.showResult = true
      this.resultOk = res.ok
      this.resultMsg = res.msg
      this.lastGain = res.total

      this.score += res.total
      if (!res.ok) this.wrongTimes += 1

      uni.vibrateShort({ type: 'light' })
      this.scrollToBottom()
    },

    // ===== 下一题/结束 =====
    async nextQuestion() {
      if (this.currentIndex >= this.quiz.length - 1) {
        await this.finishGame()
        return
      }

      this.currentIndex += 1
      this.pickedSet = new Set()
      this.chosenCred = null

      this.locked = false
      this.showResult = false
      this.resultOk = false
      this.resultMsg = ''
      this.lastGain = 0

      this.toastMini('下一题：继续用证据说话！')
      this.scrollToTop()
    },

    async finishGame() {
      this.stopClock()
      this.earnedStars = this.calcStars({
        usedMs: this.elapsedMs,
        wrongTimes: this.wrongTimes,
        score: this.score
      })
      this.success = true
      uni.vibrateLong()

      // ✅ 按 28 关同款：steps 传题数即可
      await this.reportPass({
        steps: this.quiz.length,
        usedMs: this.elapsedMs,
        stars: this.earnedStars
      })
    },

    restart() {
      this.newRound()
    },

    // ===== scroll =====
    scrollToBottom() {
      this.$nextTick(() => {
        this.scrollTop = 999999
      })
    },
    scrollToTop() {
      this.$nextTick(() => {
        this.scrollTop = 0
      })
    },

    // ===== 路由 =====
    goBack() {
      uni.navigateBack({ delta: 1 })
    },
    goNext() {
      uni.redirectTo({ url: '/pages/game/level/level30' })
    }
  }
}
</script>



<style scoped>
.page{
  height: 210vh;
  overflow: hidden;
  padding: 36rpx 28rpx;
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
.title{ font-size: 36rpx; font-weight: 900; }
.tip{ display:block; margin-top: 8rpx; font-size: 24rpx; opacity: 0.95; }

/* hud */
.hud{
  display:flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10rpx;
  gap: 12rpx;
  flex-wrap: wrap;
}
.badge{
  display:inline-flex;
  align-items:center;
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255,255,255,0.22);
  color: #fff;
  font-size: 22rpx;
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
  border-radius: 30rpx;
  padding: 16rpx;
  box-shadow: 0 18rpx 50rpx rgba(0,0,0,0.18);
  overflow: hidden;
  border: 2rpx solid rgba(255,255,255,0.8);

  height: calc(100vh - 36rpx - 24rpx);
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

/* chat */
.chat{
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  padding: 10rpx 6rpx;
  overflow: hidden;
}

/* bubble rows */
.msg-row{
  display:flex;
  margin: 10rpx 0;
}
.msg-row.user{ justify-content: flex-end; }
.msg-row.ai{ justify-content: flex-start; }

.bubble{
  max-width: 86%;
  border-radius: 22rpx;
  padding: 14rpx 16rpx;
  box-shadow: 0 10rpx 18rpx rgba(0,0,0,0.10);
  border: 2rpx solid rgba(0,0,0,0.06);
}
.user-bubble{
  background: rgba(79,108,255,0.14);
}
.ai-bubble{
  background: rgba(255,255,255,0.92);
}
.bubble-title{
  display:block;
  font-size: 22rpx;
  font-weight: 900;
  color:#2b3a66;
  margin-bottom: 6rpx;
}
.bubble-text{
  display:block;
  font-size: 24rpx;
  font-weight: 800;
  color:#2b3a66;
  line-height: 1.55;
}

/* ai head tag */
.ai-head{
  display:flex;
  align-items:center;
  justify-content: space-between;
  gap: 10rpx;
  margin-bottom: 6rpx;
}
.ai-name{
  font-size: 22rpx;
  font-weight: 900;
  color:#2b3a66;
}
.tag{
  padding: 6rpx 12rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  font-weight: 900;
}
.tag-t{ font-size: 20rpx; font-weight: 900; }
.t-idle{ background: rgba(0,0,0,0.06); color:#555; }
.t-ok{ background: rgba(46,213,115,0.14); color:#167c3a; }
.t-mid{ background: rgba(255,159,67,0.18); color:#8a4b0f; }
.t-bad{ background: rgba(255,107,107,0.16); color:#b42318; }

.ai-sub{
  margin-top: 10rpx;
  padding-top: 10rpx;
  border-top: 2rpx dashed rgba(0,0,0,0.08);
}
.ai-subt{
  font-size: 22rpx;
  font-weight: 800;
  color:#6b7280;
}

/* evidence */
.evidence-wrap{
  margin-top: 14rpx;
  padding: 12rpx;
  border-radius: 22rpx;
  background: rgba(79,108,255,0.06);
  border: 2rpx solid rgba(79,108,255,0.12);
}
.section-title{
  display:block;
  font-size: 24rpx;
  font-weight: 900;
  color:#2b3a66;
  margin-bottom: 10rpx;
}

.cards{
  display:flex;
  flex-direction: column;
  gap: 10rpx;
}
.card{
  position: relative;
  padding: 12rpx;
  border-radius: 18rpx;
  background: rgba(255,255,255,0.92);
  border: 2rpx solid rgba(0,0,0,0.06);
  box-shadow: 0 10rpx 18rpx rgba(0,0,0,0.08);
}
.card:active{ transform: scale(0.99); }
.card.picked{
  border-color: rgba(46,213,115,0.50);
  box-shadow: 0 12rpx 22rpx rgba(46,213,115,0.14);
}
.card.disabled{
  opacity: 0.7;
  pointer-events: none;
}
.card-top{
  display:flex;
  align-items:center;
  gap: 10rpx;
  margin-bottom: 6rpx;
}
.card-title{
  font-size: 22rpx;
  font-weight: 900;
  color:#2b3a66;
}
.card-desc{
  font-size: 22rpx;
  font-weight: 800;
  color:#6b7280;
  line-height: 1.4;
}
.pickmark{
  position:absolute;
  right: 12rpx;
  top: 12rpx;
  padding: 6rpx 10rpx;
  border-radius: 999rpx;
  background: rgba(46,213,115,0.14);
  color:#167c3a;
  font-size: 20rpx;
  font-weight: 900;
}

/* chip */
.chip{
  padding: 6rpx 10rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  font-weight: 900;
}
.chip-t{ font-size: 20rpx; font-weight: 900; }
.chip-data{ background: rgba(79,108,255,0.14); color:#2b3a66; }
.chip-trap{ background: rgba(255,107,107,0.14); color:#b42318; }

.mini-tip{
  margin-top: 10rpx;
  font-size: 22rpx;
  font-weight: 800;
  color:#6b7280;
}

/* credibility */
.cred-wrap{
  margin-top: 14rpx;
  padding: 12rpx;
  border-radius: 22rpx;
  background: rgba(255,159,67,0.10);
  border: 2rpx solid rgba(255,159,67,0.16);
}
.cred-buttons{
  display:flex;
  gap: 10rpx;
  flex-wrap: wrap;
}
.cred-btn{
  padding: 14rpx 16rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 900;
  border: 2rpx solid rgba(0,0,0,0.06);
  background: rgba(255,255,255,0.92);
}
.cred-btn:active{ transform: scale(0.98); }
.cred-btn.active{
  border-color: rgba(79,108,255,0.55);
  box-shadow: 0 12rpx 22rpx rgba(79,108,255,0.14);
}
.cred-btn.disabled{
  opacity: 0.6;
  pointer-events: none;
}
.cred-btn.ok{ }
.cred-btn.mid{ }
.cred-btn.bad{ }

.cred-explain{
  margin-top: 10rpx;
  padding: 10rpx 12rpx;
  border-radius: 18rpx;
  background: rgba(255,255,255,0.92);
  border: 2rpx dashed rgba(0,0,0,0.10);
}
.ex-title{
  font-size: 22rpx;
  font-weight: 900;
  color:#2b3a66;
}
.ex-val{
  margin-left: 10rpx;
  font-size: 22rpx;
  font-weight: 900;
  color:#2b3a66;
}

/* result */
.result{
  margin-top: 14rpx;
  padding: 0 2rpx;
}
.result-card{
  border-radius: 22rpx;
  padding: 14rpx;
  border: 2rpx solid rgba(0,0,0,0.06);
  background: rgba(255,255,255,0.92);
  box-shadow: 0 10rpx 18rpx rgba(0,0,0,0.10);
}
.result-card.r-ok{ border-color: rgba(46,213,115,0.40); }
.result-card.r-bad{ border-color: rgba(255,107,107,0.35); }
.r-title{
  display:block;
  font-size: 26rpx;
  font-weight: 900;
  color:#2b3a66;
  margin-bottom: 8rpx;
}
.r-desc{
  display:block;
  font-size: 22rpx;
  font-weight: 800;
  color:#6b7280;
  line-height: 1.5;
}
.r-score{
  margin-top: 10rpx;
  display:flex;
  gap: 14rpx;
  flex-wrap: wrap;
}
.r-item{
  padding: 8rpx 12rpx;
  border-radius: 999rpx;
  background: rgba(0,0,0,0.05);
  font-size: 20rpx;
  font-weight: 900;
  color:#2b3a66;
}
.r-next{
  margin-top: 12rpx;
  display:flex;
  justify-content:flex-end;
}

/* bottom bar */
.bottom-bar{
  position: relative;
  z-index: 2;
  display:flex;
  align-items:center;
  justify-content: space-between;
  gap: 12rpx;

  padding: 12rpx;
  border-radius: 22rpx;
  background: rgba(255,255,255,0.92);
  border: 2rpx solid rgba(0,0,0,0.06);
  box-shadow: 0 12rpx 24rpx rgba(0,0,0,0.12);
}
.bar-left{
  display:flex;
  flex-direction: column;
  gap: 6rpx;
}
.bar-small{
  font-size: 20rpx;
  font-weight: 900;
  color:#2b3a66;
}
.bar-right{
  display:flex;
  gap: 10rpx;
}

/* buttons */
.btn{
  padding: 14rpx 18rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 900;
}
.btn:active{ transform: scale(0.98); }
.btn.disabled{
  opacity: 0.55;
  pointer-events:none;
}
.btn.reset{
  background: linear-gradient(90deg,#f5f5f5 0%,#e9e9e9 100%);
  color:#555;
}
.btn.submit{
  background: linear-gradient(90deg,#4f6cff 0%,#667eea 100%);
  color:#fff;
}
.btn.next{
  background: linear-gradient(90deg,#4f6cff 0%,#667eea 100%);
  color:#fff;
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
  width: 82vw;
  background: rgba(255,255,255,0.96);
  border-radius: 32rpx;
  padding: 52rpx 40rpx 40rpx;
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
