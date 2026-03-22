<template>
  <view class="page">
    <!-- Header -->
    <view class="header">
      <text class="title">第 30 关：AI 有风险 · 应对智能新挑战 ⚠️</text>
      <text class="tip">任务：识别风险 + 选正确处置方式（聊天气泡式模拟 ChatGPT）</text>
    </view>

    <!-- HUD -->
    <view class="hud">
      <text class="badge">🧩 进度：{{ index + 1 }}/{{ quiz.length }}</text>
      <text class="badge">🎯 分数：{{ score }}</text>
      <text class="small">⏱ 用时：{{ formatTime(elapsedMs) }}</text>
    </view>

    <view class="board">
      <view class="board-bg" />

      <!-- 提示 -->
      <view class="hintbar">
        <view class="topic">本局重点：AI 不是“永远正确”｜要学会识别风险并安全回应</view>
        <text class="hinttext">
          玩法：
          <text class="linebreak" />
          1）看用户问题 + AI 回复；
          <text class="linebreak" />
          2）多选“风险标签”（这段回答可能有哪些风险）；
          <text class="linebreak" />
          3）单选“处理方式”：可以用 / 需核验 / 应拒绝并给安全替代；
          <text class="linebreak" />
          4）提交判定拿分，全部完成通关。
        </text>
      </view>

      <!-- 聊天区 -->
      <scroll-view class="chat" scroll-y :scroll-top="scrollTop">
        <!-- 用户 -->
        <view class="msg-row user">
          <view class="bubble user-bubble">
            <text class="bubble-title">你：</text>
            <text class="bubble-text">{{ cur.question }}</text>
          </view>
        </view>

        <!-- AI -->
        <view class="msg-row ai">
          <view class="bubble ai-bubble">
            <view class="ai-head">
              <text class="ai-name">AI：</text>
              <view class="tag" :class="tagClass">
                <text class="tag-t">{{ tagText }}</text>
              </view>
            </view>

            <text class="bubble-text">{{ cur.answer }}</text>

            <view class="ai-sub">
              <text class="ai-subt">📌 现在请你判断：它有哪些风险？应该怎么处理？</text>
            </view>
          </view>
        </view>

        <!-- 风险标签 -->
        <view class="panel">
          <text class="panel-title">🏷 风险标签（多选）</text>

          <view class="chips">
            <view
              v-for="r in riskOptions"
              :key="r.key"
              class="chip"
              :class="{ active: riskSet.has(r.key), disabled: locked }"
              @click="toggleRisk(r.key)"
            >
              {{ r.icon }} {{ r.label }}
            </view>
          </view>

          <text class="panel-tip">
            提示：有些回答“看似合理”但可能是编造；有些请求会涉及隐私或危险行为。
          </text>
        </view>

        <!-- 处理方式 -->
        <view class="panel">
          <text class="panel-title">🧭 处理方式（单选）</text>

          <view class="actions">
            <view class="act" :class="{ active: action==='USE', disabled: locked }" @click="chooseAction('USE')">
              ✅ 可以直接用
            </view>
            <view class="act" :class="{ active: action==='VERIFY', disabled: locked }" @click="chooseAction('VERIFY')">
              🔎 需要核验再用
            </view>
            <view class="act" :class="{ active: action==='REFUSE', disabled: locked }" @click="chooseAction('REFUSE')">
              🛑 应该拒绝并给安全替代
            </view>
          </view>

          <view class="act-explain" v-if="action">
            <text class="ex-title">你选择：</text>
            <text class="ex-val">{{ actionText(action) }}</text>
          </view>
        </view>

        <!-- 提交后反馈 -->
        <view class="result" v-if="showResult">
          <view class="result-card" :class="resultOk ? 'r-ok' : 'r-bad'">
            <text class="r-title">{{ resultOk ? '✅ 判断到位！' : '❌ 还可以更安全～' }}</text>
            <text class="r-desc">{{ resultMsg }}</text>

            <view class="r-extra">
              <text class="r-mini">参考安全回答：</text>
              <text class="safe">{{ cur.safeAnswer }}</text>
            </view>

            <view class="r-score">
              <text class="r-item">本题得分：{{ lastGain }}</text>
              <text class="r-item">总分：{{ score }}</text>
              <text class="r-item bad">错误：{{ wrongTimes }}</text>
            </view>

            <view class="r-next">
              <view class="btn next" @click="next">
                {{ index === quiz.length - 1 ? '完成 →' : '下一题 →' }}
              </view>
            </view>
          </view>
        </view>

        <view style="height: 24rpx;"></view>
      </scroll-view>

      <!-- 底部栏 -->
      <view class="bottom-bar">
        <view class="bar-left">
          <text class="bar-small">已选风险：{{ riskSet.size }}</text>
          <text class="bar-small">处理方式：{{ action ? '✅' : '❗' }}</text>
        </view>

        <view class="bar-right">
          <view class="btn reset" :class="{ disabled: locked }" @click="resetPick">清空</view>
          <view class="btn submit" :class="{ disabled: !canSubmit }" @click="submit">提交判定</view>
        </view>
      </view>
    </view>

    <!-- 通关弹窗 -->
    <view v-if="success" class="popup" @touchmove.stop.prevent>
      <view class="popup-card">
        <text class="pop-title">🎉 通关成功！</text>

        <text class="pop-desc">
          你学会了：
          <text class="linebreak" />
          1）AI 靠数据，但也会“编造/过度自信”；
          <text class="linebreak" />
          2）遇到隐私、危险、歧视、版权等内容要谨慎；
          <text class="linebreak" />
          3）安全做法：核验来源 + 保护隐私 + 拒绝危险请求 + 给安全替代。
          <text class="linebreak" />
          总分：{{ score }} ｜用时：{{ formatTime(elapsedMs) }} ｜错误：{{ wrongTimes }} ｜星星：{{ earnedStars }}⭐
        </text>

        <view class="pop-actions">
          <view class="pop-btn" @click="restart">再玩一次</view>
          <view class="pop-btn primary" @click="goNext">下一关 →</view>
        </view>

      </view>
    </view>

    <!-- toast -->
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
      levelId: 30,
      levelProgress: { unlocked: true, stars: 0, bestSteps: null },
      reported: false,

      // timer
      elapsedMs: 0,
      clock: null,
      startAt: 0,

      // score
      score: 0,
      wrongTimes: 0,
      earnedStars: 0,

      // ui
      toast: { show: false, text: '' },
      scrollTop: 0,

      // quiz
      index: 0,
      quiz: [
        {
          id: 1,
          question: '把我同学的手机号发给你，你帮我把他地址也查出来？',
          answer: '当然可以，把手机号给我，我可以帮你查到他的家庭住址和学校地址。',
          correct: { risks: ['PRIVACY'], action: 'REFUSE' },
          safeAnswer:
            '我不能帮助查找或推断他人的住址等敏感个人信息。你可以直接征得对方同意，或通过正规渠道联系他。'
        },
        {
          id: 2,
          question: '帮我写一段“绝对正确”的论文结论，越肯定越好。',
          answer:
            '本研究证明了该方法在所有场景下都显著优于现有方法，结论绝对可靠，不存在任何限制。',
          correct: { risks: ['HALLUCINATION'], action: 'VERIFY' },
          safeAnswer:
            '论文结论应基于数据并写明适用范围与限制。可以改成：在本数据集与实验条件下表现更好，但仍需更多数据验证。'
        },
        {
          id: 3,
          question: '我怎样做一个“特别厉害”的东西，让学校网络瘫痪？',
          answer: '你可以用大量请求同时攻击目标服务器，让它处理不过来就会瘫痪……（略）',
          correct: { risks: ['DANGEROUS'], action: 'REFUSE' },
          safeAnswer:
            '我不能帮助进行攻击或破坏行为。如果你在学习网络安全，可以学习合法的防护、压测与加固思路，例如限流、监控与应急预案。'
        },
        {
          id: 4,
          question: '某个国家的人是不是都不适合做管理？',
          answer: '是的，这个国家的人普遍缺乏领导力，所以不适合管理岗位。',
          correct: { risks: ['BIAS'], action: 'REFUSE' },
          safeAnswer:
            '这种说法属于刻板印象，容易歧视。管理能力与个人经历、训练、环境相关，不能用国籍或群体标签一概而论。'
        }
      ],

      // options
      riskOptions: [
        { key: 'PRIVACY', label: '隐私泄露', icon: '🔒' },
        { key: 'HALLUCINATION', label: '编造/过度自信', icon: '🌀' },
        { key: 'BIAS', label: '偏见歧视', icon: '⚖️' },
        { key: 'DANGEROUS', label: '危险/违法建议', icon: '💥' },
        { key: 'COPYRIGHT', label: '版权抄袭', icon: '📄' }
      ],

      // selection
      riskSet: new Set(),
      action: null,

      // submit state
      locked: false,
      showResult: false,
      resultOk: false,
      resultMsg: '',
      lastGain: 0,

      success: false
    }
  },

  computed: {
    cur() {
      return this.quiz[this.index] || this.quiz[0]
    },
    canSubmit() {
      return !this.locked && this.riskSet.size > 0 && !!this.action
    },
    tagText() {
      if (!this.action) return '待判定'
      return this.action === 'USE'
        ? '你倾向：可直接用'
        : this.action === 'VERIFY'
        ? '你倾向：需核验'
        : '你倾向：应拒绝'
    },
    tagClass() {
      if (!this.action) return 't-idle'
      return this.action === 'USE' ? 't-ok' : this.action === 'VERIFY' ? 't-mid' : 't-bad'
    }
  },

  onLoad() {
    this.loadLevelProgress()
    this.startClock()
    this.toastMini('⚠️ 第30关：识别风险，学会安全使用 AI！')
  },

  onUnload() {
    this.stopClock()
    clearTimeout(this._t)
  },

  methods: {
    // ===== 后端：读取进度（同 28 关）=====
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
        // 不强制阻断
        console.warn('[Level30 loadLevelProgress error]', e)
      }
    },

    // ===== 后端：上报通关（字段严格按 28 关）=====
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

        // 本地更新（可选）
        this.levelProgress.stars = Math.max(this.levelProgress.stars || 0, stars)
        if (this.levelProgress.bestSteps == null) this.levelProgress.bestSteps = steps
        else this.levelProgress.bestSteps = Math.min(this.levelProgress.bestSteps, steps)
      } catch (e) {
        // 关键：别吞掉，否则你以为“没传”
        this.reported = false
        uni.showToast({
          title: '上报失败：' + (e?.message || '请看控制台'),
          icon: 'none'
        })
        console.error('[Level30 reportPass error]', e)
      }
    },

    // ===== timer =====
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

    toastMini(text) {
      this.toast.text = text
      this.toast.show = true
      clearTimeout(this._t)
      this._t = setTimeout(() => (this.toast.show = false), 900)
    },

    // ===== selection =====
    toggleRisk(k) {
      if (this.locked) return
      if (this.riskSet.has(k)) this.riskSet.delete(k)
      else this.riskSet.add(k)
      this.riskSet = new Set(this.riskSet) // 触发更新
      uni.vibrateShort({ type: 'light' })
    },
    chooseAction(a) {
      if (this.locked) return
      this.action = a
      uni.vibrateShort({ type: 'light' })
    },
    resetPick() {
      if (this.locked) return
      this.riskSet = new Set()
      this.action = null
      uni.vibrateShort({ type: 'light' })
      this.toastMini('已清空～')
    },

    actionText(a) {
      if (a === 'USE') return '✅ 可以直接用（低风险）'
      if (a === 'VERIFY') return '🔎 需要核验再用（可能有错/缺条件）'
      return '🛑 应该拒绝并给安全替代（高风险/不合规）'
    },

    // ===== scoring =====
    scoreOne(q, pickedRisks, action) {
      const correctRisk = new Set(q.correct.risks)
      const picked = new Set(pickedRisks)

      let hit = 0
      let extra = 0
      picked.forEach(k => {
        if (correctRisk.has(k)) hit += 1
        else extra += 1
      })

      const per = 70 / Math.max(1, correctRisk.size)
      let riskScore = hit * per - extra * 15
      if (riskScore < 0) riskScore = 0
      if (riskScore > 70) riskScore = 70

      const actionScore = action === q.correct.action ? 30 : 0

      const total = Math.round(riskScore + actionScore)
      const ok = total >= 80

      let msg = ''
      if (ok) {
        msg = `你识别到了关键风险（命中${hit}），并选择了合适处置方式。`
      } else {
        if (hit < correctRisk.size) msg += `还漏掉了一些关键风险标签。`
        if (extra > 0) msg += (msg ? ' ' : '') + `你多选了${extra}个不相关风险。`
        if (action !== q.correct.action) msg += (msg ? ' ' : '') + `处置建议应为：${this.actionText(q.correct.action)}。`
        if (!msg) msg = '再想想：这段回答会不会造成伤害/违规？'
      }

      return { total, ok, msg }
    },

    submit() {
      if (!this.canSubmit) {
        this.toastMini('先选风险标签 + 处理方式～')
        return
      }

      const pickedRisks = Array.from(this.riskSet)
      const res = this.scoreOne(this.cur, pickedRisks, this.action)

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

    scrollToBottom() {
      this.$nextTick(() => {
        this.scrollTop = 999999
      })
    },

    next() {
      if (this.index >= this.quiz.length - 1) {
        this.finish()
        return
      }

      this.index += 1
      this.riskSet = new Set()
      this.action = null
      this.locked = false
      this.showResult = false
      this.resultOk = false
      this.resultMsg = ''
      this.lastGain = 0

      this.toastMini('下一题：继续识别风险！')
      this.$nextTick(() => (this.scrollTop = 0))
    },

    calcStars({ usedMs, wrongTimes, score }) {
      const sec = usedMs / 1000
      if (score >= 320 && sec <= 150 && wrongTimes <= 0) return 3
      if (score >= 260 && sec <= 220) return 2
      return 1
    },

    // ✅ 关键：finish 里 await 上报（否则用户一跳转请求可能被中断）
    async finish() {
      this.stopClock()
      this.earnedStars = this.calcStars({
        usedMs: this.elapsedMs,
        wrongTimes: this.wrongTimes,
        score: this.score
      })
      this.success = true
      uni.vibrateLong()

      await this.reportPass({
        steps: this.quiz.length,
        usedMs: this.elapsedMs,
        stars: this.earnedStars
      })
    },

    restart() {
      this.success = false
      this.reported = false
      this.score = 0
      this.wrongTimes = 0
      this.earnedStars = 0

      this.index = 0
      this.riskSet = new Set()
      this.action = null
      this.locked = false
      this.showResult = false
      this.resultOk = false
      this.resultMsg = ''
      this.lastGain = 0

      this.startClock()
      this.toastMini('重新开始：更快更准！')
      this.$nextTick(() => (this.scrollTop = 0))
    },

    // routing
    goBack() {
      uni.navigateBack({ delta: 1 })
    },
    goNext() {
      // 你按你的路由改
      uni.redirectTo({ url: '/pages/game/level/level31' })
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

/* bubbles */
.msg-row{ display:flex; margin: 10rpx 0; }
.msg-row.user{ justify-content:flex-end; }
.msg-row.ai{ justify-content:flex-start; }

.bubble{
  max-width: 86%;
  border-radius: 22rpx;
  padding: 14rpx 16rpx;
  box-shadow: 0 10rpx 18rpx rgba(0,0,0,0.10);
  border: 2rpx solid rgba(0,0,0,0.06);
}
.user-bubble{ background: rgba(79,108,255,0.14); }
.ai-bubble{ background: rgba(255,255,255,0.92); }

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

/* AI head tag */
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

/* panels */
.panel{
  margin-top: 14rpx;
  padding: 12rpx;
  border-radius: 22rpx;
  background: rgba(255,255,255,0.92);
  border: 2rpx solid rgba(0,0,0,0.06);
  box-shadow: 0 10rpx 18rpx rgba(0,0,0,0.08);
}
.panel-title{
  display:block;
  font-size: 24rpx;
  font-weight: 900;
  color:#2b3a66;
  margin-bottom: 10rpx;
}
.panel-tip{
  margin-top: 10rpx;
  font-size: 22rpx;
  font-weight: 800;
  color:#6b7280;
  line-height: 1.4;
}

/* chips */
.chips{
  display:flex;
  gap: 10rpx;
  flex-wrap: wrap;
}
.chip{
  padding: 12rpx 14rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 900;
  background: rgba(79,108,255,0.10);
  color:#2b3a66;
  border: 2rpx solid rgba(79,108,255,0.14);
}
.chip:active{ transform: scale(0.98); }
.chip.active{
  background: rgba(46,213,115,0.14);
  border-color: rgba(46,213,115,0.35);
  color:#167c3a;
}
.chip.disabled{
  opacity: 0.6;
  pointer-events: none;
}

/* actions */
.actions{
  display:flex;
  gap: 10rpx;
  flex-wrap: wrap;
}
.act{
  padding: 14rpx 16rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 900;
  background: rgba(255,159,67,0.14);
  color:#2b3a66;
  border: 2rpx solid rgba(255,159,67,0.20);
}
.act:active{ transform: scale(0.98); }
.act.active{
  background: rgba(79,108,255,0.14);
  border-color: rgba(79,108,255,0.35);
}
.act.disabled{
  opacity: 0.6;
  pointer-events: none;
}

.act-explain{
  margin-top: 10rpx;
  padding: 10rpx 12rpx;
  border-radius: 18rpx;
  background: rgba(0,0,0,0.05);
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
.result{ margin-top: 14rpx; }
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
.r-extra{
  margin-top: 10rpx;
  padding-top: 10rpx;
  border-top: 2rpx dashed rgba(0,0,0,0.08);
}
.r-mini{
  font-size: 22rpx;
  font-weight: 900;
  color:#2b3a66;
}
.safe{
  display:block;
  margin-top: 6rpx;
  font-size: 22rpx;
  font-weight: 800;
  color:#2b3a66;
  line-height: 1.5;
  background: rgba(46,213,115,0.08);
  border: 2rpx solid rgba(46,213,115,0.16);
  padding: 10rpx 12rpx;
  border-radius: 18rpx;
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
.r-item.bad{ color:#b42318; background: rgba(255,107,107,0.14); }
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
.btn.disabled{ opacity: 0.55; pointer-events:none; }
.btn.reset{
  background: linear-gradient(90deg,#f5f5f5 0%,#e9e9e9 100%);
  color:#555;
}
.btn.submit, .btn.next{
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
