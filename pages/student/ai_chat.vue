<template>
  <view class="page">
    <!-- 顶部栏（固定在最上方） -->
    <view class="header">
      <!-- 返回按钮（原生 view 实现） -->
      <view class="back" @click="goBack"></view>

      <text class="course-name">{{ courseName }}</text>

      <!-- ✅ 右上角：获得评价按钮 -->
      <view class="eval-btn" :class="{ disabled: evalLoading || !sessionId }" @click="getEvaluation">
        <text class="eval-btn-text">{{ evalLoading ? '获取中…' : '获得评价' }}</text>
      </view>
    </view>

    <!-- 学习进度条（固定在顶部栏下方） -->
    <view class="progress-container">
      <text class="progress-text">学习进度 {{ progress }}%</text>
      <view class="progress">
        <view class="progress-inner" :style="{ width: progress + '%' }">
          <image class="progress-icon" :src="currentRunImg" mode="aspectFit" />
        </view>
      </view>
    </view>

    <!-- 右侧悬浮 AI 图标（无背景、无样式、持续打招呼） -->
    <view class="ai-icon-float" @click="onIconClick">
      <image :src="currentHelloImg" class="ai-icon-img" mode="aspectFit" />
    </view>

    <!-- AI 对话区（原生 scroll-view） -->
    <scroll-view class="chat-area" scroll-y :scroll-with-animation="true">
      <view class="chat-list">
        <view
          class="chat-item"
          v-for="(msg, index) in messages"
          :key="msg.mid || index"
          :class="['chat-' + msg.role]"
        >
          <image
            v-if="msg.role === 'ai'"
            class="chat-avatar ai-avatar"
            :src="currentThinkImg"
            mode="aspectFit"
          />
          <image
            v-if="msg.role === 'user'"
            class="chat-avatar user-avatar"
            :src="userAvatar"
            mode="aspectFit"
          />

          <view class="chat-bubble">
            <view v-if="msg.q" class="q-card">
              <view class="q-tag">
                <text class="q-tag-text">{{ msg.q.typeText }}</text>
              </view>

              <text class="q-stem">{{ msg.q.stem }}</text>

              <view class="q-options">
                <view
                  v-for="opt in msg.q.options"
                  :key="opt.key"
                  class="q-option"
                  :class="{ active: isOptionActive(msg, opt.key) }"
                  @click="selectOption(msg, opt.key)"
                >
                  <text class="q-option-key">{{ opt.key }}</text>
                  <text class="q-option-text">{{ opt.text }}</text>
                </view>
              </view>

              <button
                v-if="!msg.q.confirmed"
                class="q-confirm"
                @click="confirmAnswer(msg)"
                hover-class="q-confirm-hover"
              >
                确定
              </button>

              <view v-else class="confirmed-tip">
                ✅ 已提交：{{ (msg.q.selected || []).join(',') }}
              </view>
            </view>

            <text v-else class="chat-content">{{ msg.content }}</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 输入框 -->
    <view class="input-bar">
      <input
        v-model="inputText"
        placeholder="请输入你的回答..."
        class="input"
        type="text"
        confirm-type="send"
        @confirm="sendMessage"
      />
      <button class="send-btn" @click="sendMessage" hover-class="send-btn-hover">发送</button>
    </view>

    <!-- 学习目标弹窗 -->
    <view v-if="showGoal" class="mask" @click="showGoal = false">
      <view class="goal-popup" @click.stop>
        <text class="popup-title">🎯 本节课学习目标</text>
        <view class="goal-item" v-for="(goal, index) in learningGoals" :key="index">
          • {{ goal }}
        </view>
        <button class="close-btn" @click="showGoal = false" hover-class="close-btn-hover">知道了</button>
      </view>
    </view>

    <!-- ✅ 评价弹窗 -->
    <view v-if="evalOpen" class="mask" @click="evalOpen = false">
      <view class="goal-popup" @click.stop>
        <text class="popup-title">📝 学习评价</text>
        <scroll-view scroll-y style="max-height: 520rpx;">
          <text style="font-size:26rpx;color:#1d2129;line-height:1.7;white-space:pre-wrap;">
            {{ evalText || '暂无评价内容' }}
          </text>
        </scroll-view>
        <button class="close-btn" @click="evalOpen = false" hover-class="close-btn-hover">关闭</button>
      </view>
    </view>
  </view>
</template>

<script>
import request from '@/common/request.js'

export default {
  data() {
    return {
      courseStatus: '',
      sessionId: '',
      courseId: '',
      mode: 'preview',

      courseName: '课程名称',

      previewProgress: 0,
      reviewProgress: 0,
      improveProgress: 0,
      progress: 0,

      messages: [],
      inputText: '',

      userAvatar: '/static/logo1.png',
      userName: '',

      introInited: false,
      isAlive: true,
      iconState: 'default',

      showGoal: false,
      learningGoals: [],

      ending: false,
      qAnswerMap: {},

      // 逐帧动画配置
      runImgList: [],
      currentRunImg: '',
      runFrameTimer: null,
      runCurrentIndex: 0,
      runFrameInterval: 60,

      thinkImgList: [],
      currentThinkImg: '',
      thinkFrameTimer: null,
      thinkCurrentIndex: 0,
      thinkFrameInterval: 80,

      helloImgList: [],
      currentHelloImg: '',
      helloFrameTimer: null,
      helloCurrentIndex: 0,
      helloFrameInterval: 70,
      isHelloPlaying: false,

      // 评价相关
      evalOpen: false,
      evalLoading: false,
      evalText: ''
    }
  },

  async onLoad(options) {
    this.courseName = options.courseName || '课程'
    this.mode = options.mode || 'preview'
    this.courseId = options.courseId || ''
    this.courseStatus = options.status || ''

    this.initRunAnimation()
    this.initThinkAnimation()
    this.initHelloAnimation()

    this.messages = [this.buildMessage('ai', '你好，我们开始今天的学习吧 😊')]

    this.fetchUserInfo()
    this.fetchCourseDetail()

    await this.fetchCourseProgress()
    if (!this.isAlive) return

    await this.restoreOrStartSession()
    if (!this.isAlive) return

    await this.loadHistory()
    if (!this.isAlive) return

    this.$nextTick(() => {
      if (!this.isAlive) return
      if (!this.messages.length || this.messages.length <= 1) {
        this.initAIIntro()
      }
    })

    this.startRunAnimation()
    this.startThinkAnimation()
    this.startHelloAnimationLoop()
  },

  async onUnload() {
    this.isAlive = false
    await this.endSessionIfNeeded()
    this.clearAllAnimationTimers()
  },

  methods: {
    getBase8081() {
      return 'http://81.70.62.177:8081'
    },

    getBearerToken() {
      const token = String(uni.getStorageSync('token') || '').trim()
      if (!token) return ''
      return token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`
    },

    // 初始化跑动画（34张）
    initRunAnimation() {
      this.runImgList = []
      for (let i = 1; i <= 34; i++) {
        const paddedNum = i.toString().padStart(3, '0')
        this.runImgList.push(`/static/run/ezgif-frame-${paddedNum}.png`)
      }
      this.currentRunImg = this.runImgList[0] || ''
    },

    startRunAnimation() {
      if (this.runFrameTimer) clearInterval(this.runFrameTimer)
      if (this.runImgList.length === 0) return
      this.runFrameTimer = setInterval(() => {
        this.runCurrentIndex = (this.runCurrentIndex + 1) % this.runImgList.length
        this.currentRunImg = this.runImgList[this.runCurrentIndex]
      }, this.runFrameInterval)
    },

    // 初始化闭眼思考动画（51张，排除第15张）
    initThinkAnimation() {
      this.thinkImgList = []
      for (let i = 1; i <= 51; i++) {
        if (i === 15) continue
        const paddedNum = i.toString().padStart(3, '0')
        this.thinkImgList.push(`/static/think/ezgif-frame-${paddedNum}.png`)
      }
      this.currentThinkImg = this.thinkImgList[0] || ''
    },

    startThinkAnimation() {
      if (this.thinkFrameTimer) clearInterval(this.thinkFrameTimer)
      if (this.thinkImgList.length === 0) return
      this.thinkFrameTimer = setInterval(() => {
        this.thinkCurrentIndex = (this.thinkCurrentIndex + 1) % this.thinkImgList.length
        this.currentThinkImg = this.thinkImgList[this.thinkCurrentIndex]
      }, this.thinkFrameInterval)
    },

    // 初始化打招呼动画（51张）
    initHelloAnimation() {
      this.helloImgList = []
      for (let i = 1; i <= 51; i++) {
        const paddedNum = i.toString().padStart(3, '0')
        this.helloImgList.push(`/static/hello/ezgif-frame-${paddedNum}.png`)
      }
      this.currentHelloImg = this.helloImgList[0] || ''
    },

    startHelloAnimationLoop() {
      if (this.helloFrameTimer) clearInterval(this.helloFrameTimer)
      if (this.helloImgList.length === 0) return
      this.helloFrameTimer = setInterval(() => {
        this.helloCurrentIndex = (this.helloCurrentIndex + 1) % this.helloImgList.length
        this.currentHelloImg = this.helloImgList[this.helloCurrentIndex]
      }, this.helloFrameInterval)
    },

    clearAllAnimationTimers() {
      if (this.runFrameTimer) clearInterval(this.runFrameTimer)
      if (this.thinkFrameTimer) clearInterval(this.thinkFrameTimer)
      if (this.helloFrameTimer) clearInterval(this.helloFrameTimer)
      this.runFrameTimer = null
      this.thinkFrameTimer = null
      this.helloFrameTimer = null
    },

    makeQid(qObj) {
      const base =
        `${qObj.type}|${qObj.stem}|` +
        (qObj.options || []).map(o => `${o.key}:${o.text}`).join('|')

      let hash = 0
      for (let i = 0; i < base.length; i++) {
        hash = (hash * 31 + base.charCodeAt(i)) >>> 0
      }
      return String(hash)
    },

    getSessionKey() {
      return `AI_SESSION:${this.courseId}:${this.mode}`
    },

    sanitizeAIMarkdown(text) {
      if (!text) return ''
      let s = String(text)
      s = s.replace(/\*\*(.+?)\*\*/g, '$1')
      s = s.replace(/^\s*[\[【](OK|WRONG)[\]】]\s*/i, '')
      return s
    },

    parseQuestion(rawText) {
      if (!rawText) return null
      const text = String(rawText).trim()

      const tagMatch = text.match(/^\s*[\[【](Q_SINGLE|Q_MULTI|Q_JUDGE)[\]】]\s*/i)
      if (!tagMatch) return null

      const tag = tagMatch[1].toUpperCase()
      const body = text.replace(tagMatch[0], '').trim()

      const lines = body.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
      const optionLineReg = /^([A-H])[\.\、\)]\s*(.+)$/

      const stemLines = []
      const options = []

      for (const line of lines) {
        const m = line.match(optionLineReg)
        if (m) {
          options.push({ key: m[1].toUpperCase(), text: m[2].trim() })
          continue
        }
        stemLines.push(line)
      }

      if (tag === 'Q_JUDGE') {
        return {
          type: tag,
          typeText: '判断题',
          stem: stemLines.join('\n'),
          options: [
            { key: '对', text: '对' },
            { key: '错', text: '错' }
          ]
        }
      }

      if (options.length === 0) return null

      return {
        type: tag,
        typeText: tag === 'Q_SINGLE' ? '单选题' : '多选题',
        stem: stemLines.join('\n'),
        options
      }
    },

    buildMessage(role, rawText) {
      const safeText = role === 'ai'
        ? this.sanitizeAIMarkdown(rawText)
        : String(rawText || '')

      if (role !== 'ai') {
        return { role, content: safeText }
      }

      const q = this.parseQuestion(safeText)
      if (!q) {
        return { role, content: safeText }
      }

      const qId = this.makeQid(q)
      q.selected = []
      q.confirmed = false

      return { role, content: safeText, q, qId }
    },

    aiRequest({ url, method = 'GET', data = {}, header = {} }) {
      const base = this.getBase8081()
      const bearer = this.getBearerToken()

      return new Promise((resolve, reject) => {
        uni.request({
          url: base + url,
          method,
          data,
          timeout: 1115000,
          header: {
            'Content-Type': 'application/json',
            ...(bearer ? { Authorization: bearer } : {}),
            ...header
          },
          success: (res) => {
            if (res.statusCode >= 200 && res.statusCode < 300) resolve(res.data)
            else reject(res)
          },
          fail: (err) => reject(err)
        })
      })
    },

    async getEvaluation() {
      if (this.evalLoading) return
      if (!this.sessionId) {
        uni.showToast({ title: '会话未初始化', icon: 'none' })
        return
      }

      this.evalLoading = true
      try {
        const res = await this.aiRequest({
          url: '/api/ai/eval',
          method: 'POST',
          data: { sessionId: Number(this.sessionId) }
        })

        const evaluation = (res && (res.evaluation || res.data?.evaluation)) || ''
        this.evalText = String(evaluation || '').trim()
        this.evalOpen = true

        if (this.evalText) {
          this.messages.push(this.buildMessage('ai', `【学习评价】\n${this.evalText}`))
        }
      } catch (e) {
        console.error('[eval] failed:', e)
        const msg = e?.data?.msg || e?.data?.message || e?.message || '获取评价失败'
        uni.showToast({ title: msg, icon: 'none' })
      } finally {
        this.evalLoading = false
      }
    },

    async endSessionIfNeeded() {
      if (this.ending) return
      if (!this.sessionId) return

      this.ending = true
      try {
        await request({
          url: '/api/student/study/session/end',
          method: 'POST',
          data: {
            sessionId: this.sessionId,
            endProgress: this.progress
          }
        })
      } catch (e) {
        console.warn('[AI] endSession failed:', e)
      } finally {
        this.ending = false
      }
    },

    async restoreOrStartSession() {
      const key = this.getSessionKey()
      const savedSessionId = uni.getStorageSync(key)

      if (savedSessionId) {
        this.sessionId = savedSessionId
        return
      }

      await this.startStudySession()
      if (!this.isAlive) return

      if (this.sessionId) {
        uni.setStorageSync(key, this.sessionId)
      }
    },

    fetchCourseProgress() {
      return request({
        url: '/api/student/home/records',
        method: 'GET'
      }).then(res => {
        if (!Array.isArray(res)) return

        const record = res.find(item => String(item.courseId) === String(this.courseId))
        if (!record) return

        this.previewProgress = Number(record.previewProgress ?? 0)
        this.reviewProgress = Number(record.reviewProgress ?? 0)
        this.improveProgress = Number(record.improveProgress ?? 0)

        this.updateDisplayProgress()
      })
    },

    updateDisplayProgress() {
      if (this.mode === 'preview') this.progress = Number(this.previewProgress || 0)
      else if (this.mode === 'review') this.progress = Number(this.reviewProgress || 0)
      else if (this.mode === 'improve') this.progress = Number(this.improveProgress || 0)
    },

    initAIIntro() {
      if (this.introInited) return
      this.introInited = true

      let intro = ''
      if (this.mode === 'preview') intro = '我们先来进行预习，我会带你逐步理解新内容。'
      else if (this.mode === 'review') intro = '我们来复习一下，看看你是否真正掌握了。'
      else intro = '现在进入提升拔高环节，挑战更高难度的问题！'

      this.messages.push(this.buildMessage('ai', intro))
    },

    startStudySession() {
      return request({
        url: '/api/student/study/session/start',
        method: 'POST',
        data: {
          courseId: this.courseId,
          studyType: this.mode
        }
      }).then(res => {
        if (!this.isAlive) return
        this.sessionId = res.sessionId
        uni.setStorageSync(this.getSessionKey(), this.sessionId)
        console.log('[AI] new sessionId saved:', this.sessionId, 'key=', this.getSessionKey())
      })
    },

    async loadHistory() {
      if (!this.sessionId) return
      try {
        const res = await this.aiRequest({
          url: `/api/student/session/${this.sessionId}/dialogue`,
          method: 'GET'
        })
        if (!this.isAlive) return
        if (!res || res.length === 0) return

        const rebuilt = res.map(item => {
          const role = item.role === 'student' ? 'user' : 'ai'
          return this.buildMessage(role, item.content)
        })

        this.messages.splice(0, this.messages.length, ...rebuilt)
      } catch (e) {
        console.error('拉取 AI 历史失败：', e)
      }
    },

    fetchCourseDetail() {
      if (!this.courseId) return
      request({
        url: `/api/student/course/${this.courseId}/detail`,
        method: 'GET'
      }).then(res => {
        this.courseName = res.courseName || '课程'
        this.learningGoals = res.goals || this.learningGoals
      }).catch(() => {
        this.courseName = '课程'
      })
    },

    fetchUserInfo() {
      request({ url: '/api/auth/me', method: 'GET' })
        .then(res => {
          if (res) {
            this.userName = res.name || ''
            this.userAvatar = res.avatar || this.userAvatar
          }
        })
        .catch(() => {})
    },

    goBack() {
      const backUrl =
        `/pages/student/course_detail?id=${this.courseId}` +
        `&mode=${encodeURIComponent(this.mode)}` +
        `&status=${encodeURIComponent(this.courseStatus || '')}`

      if (!this.sessionId) {
        uni.redirectTo({ url: backUrl })
        return
      }

      const token = uni.getStorageSync('token')
      uni.request({
        url: 'http://192.168.18.16:8080/api/student/study/session/end',
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: 'Bearer ' + token } : {})
        },
        data: {
          sessionId: this.sessionId,
          endProgress: this.progress
        },
        complete: () => {
          uni.redirectTo({ url: backUrl })
        }
      })
    },

    onIconClick() {
      this.showGoal = true
    },

    isOptionActive(msg, key) {
      const selected = msg?.q?.selected || []
      return selected.includes(key)
    },

    selectOption(msg, key) {
      if (!msg || !msg.q) return
      if (msg.q.confirmed) return

      const type = msg.q.type
      if (type === 'Q_MULTI') {
        const arr = Array.isArray(msg.q.selected) ? [...msg.q.selected] : []
        const i = arr.indexOf(key)
        if (i >= 0) arr.splice(i, 1)
        else arr.push(key)
        arr.sort()
        msg.q.selected = arr
        this.$forceUpdate()
        return
      }

      msg.q.selected = [key]
      this.$forceUpdate()
    },

    confirmAnswer(msg) {
      if (!msg || !msg.q || !msg.qId) return
      if (msg.q.confirmed) return

      const selected = msg.q.selected || []
      if (!selected.length) {
        uni.showToast({ title: '请先选择一个选项', icon: 'none' })
        return
      }

      msg.q.confirmed = true

      const answerText = selected.join(',')
      this.inputText = answerText
      this.sendMessage()
    },

    async sendMessage() {
      if (!this.inputText.trim()) return
      if (!this.sessionId) {
        uni.showToast({ title: '学习会话未初始化，请稍候', icon: 'none' })
        return
      }

      const userMsg = this.inputText
      this.messages.push(this.buildMessage('user', userMsg))
      this.inputText = ''

      try {
        const res = await this.aiRequest({
          url: '/api/ai/chat',
          method: 'POST',
          data: {
            sessionId: this.sessionId,
            message: userMsg
          }
        })

        this.messages.push(this.buildMessage('ai', res.reply))

        if (res.progress !== undefined) {
          const nextProgress = Number(res.progress || 0)

          if (this.mode === 'preview') this.previewProgress = nextProgress
          else if (this.mode === 'review') this.reviewProgress = nextProgress
          else if (this.mode === 'improve') this.improveProgress = nextProgress

          this.updateDisplayProgress()
        }
      } catch (e) {
        console.error('AI 请求失败：', e)
        uni.showToast({ title: 'AI 服务请求失败', icon: 'none' })
      }
    }
  }
}
</script>
<style scoped>
/* 全局样式 */
page {
  background: linear-gradient(180deg, #f8f9ff 0%, #edf2ff 100%);
}

.page {
  min-height: 100vh;
  position: relative;
  padding-top: 180rpx;
  padding-bottom: 120rpx;
  box-sizing: border-box;
}

/* 顶部栏 */
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 998;
  padding: 24rpx 20rpx;
  background: #ffffff;
  box-shadow: 0 4rpx 12rpx rgba(79, 108, 255, 0.08);
  display: flex;
  align-items: center;
}

/* 返回按钮 */
.back {
  position: absolute;
  left: 20rpx;
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  color: #4f6cff;
  background-color: #ffffff;
  border-radius: 50%;
  box-shadow: 0 4rpx 12rpx rgba(79, 108, 255, 0.15);
  transition: all 0.3s ease;
  z-index: 2;
}
.back::before { content: "←"; }
.back:active {
  transform: scale(0.95);
  box-shadow: 0 2rpx 8rpx rgba(79, 108, 255, 0.1);
  background-color: #f5f7ff;
}

.course-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #1d2129;
  margin: 0 auto;
}

/* ✅ 右上角：获得评价按钮 */
.eval-btn{
  position: absolute;
  right: 20rpx;
  height: 56rpx;
  padding: 0 22rpx;
  border-radius: 999rpx;
  background: linear-gradient(90deg, #4f6cff 0%, #6b86ff 100%);
  display:flex;
  align-items:center;
  justify-content:center;
  box-shadow: 0 6rpx 16rpx rgba(79,108,255,0.22);
}
.eval-btn-text{
  color:#fff;
  font-size: 24rpx;
  font-weight: 600;
}
.eval-btn.disabled{
  opacity: 0.45;
}

/* 进度条 */
.progress-container {
  position: fixed;
  top: 108rpx;
  left: 0;
  right: 0;
  z-index: 998;
  padding: 20rpx 24rpx;
  background: #ffffff;
  box-shadow: 0 4rpx 12rpx rgba(79, 108, 255, 0.08);
}
.progress-text {
  font-size: 24rpx;
  color: #4e5969;
  margin-bottom: 8rpx;
  display: block;
  font-weight: 500;
}
.progress {
  height: 12rpx;
  background: #f5f7fa;
  border-radius: 8rpx;
  overflow: visible;
  position: relative;
}
.progress-inner {
  position: relative;
  height: 100%;
  background: linear-gradient(90deg, #4f6cff 0%, #8094ff 100%);
  border-radius: 8rpx;
  transition: width 0.6s ease;
}
.progress-icon {
  position: absolute;
  right: -50rpx;
  top: -44rpx;
  width: 100rpx;
  height: 100rpx;
  border-radius: 0;
  filter: none;
  background: none;
}

/* 悬浮 AI 图标 */
.ai-icon-float {
  position: fixed;
  right: 24rpx;
  top: 40%;
  transform: translateY(-50%);
  width: 120rpx;
  height: 120rpx;
  z-index: 999;
  background: none;
}
.ai-icon-img {
  width: 100%;
  height: 100%;
  border-radius: 0;
  box-shadow: none;
  background: none;
  filter: none;
}

/* 聊天区域 */
.chat-area {
  position: absolute;
  top: 240rpx;
  left: 0;
  right: 0;
  bottom: 120rpx;
  padding: 20rpx 24rpx 0;
  box-sizing: border-box;
}
.chat-list { width: 100%; height: 100%; }
.chat-item {
  display: flex;
  margin-bottom: 24rpx;
  max-width: 100%;
}
.chat-ai { align-items: flex-start; }
.chat-user { flex-direction: row-reverse; align-items: flex-start; }
.chat-avatar {
  margin: 0 16rpx;
  flex-shrink: 0;
  border-radius: 0;
  box-shadow: none;
  background: none;
}
.ai-avatar { width: 100rpx; height: 100rpx; }
.user-avatar {
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  box-shadow: 0 4rpx 8rpx rgba(0, 0, 0, 0.1);
}
.chat-bubble {
  max-width: 70%;
  padding: 16rpx 20rpx;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
}
.chat-ai .chat-bubble { background: #ffffff; border-top-left-radius: 8rpx; }
.chat-user .chat-bubble {
  background: linear-gradient(90deg, #4f6cff 0%, #6b86ff 100%);
  color: #ffffff;
  border-top-right-radius: 8rpx;
}
.chat-content {
  font-size: 26rpx;
  line-height: 1.6;
  white-space: pre-wrap;
}

/* 输入框 */
.input-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 998;
  display: flex;
  padding: 20rpx 24rpx;
  background: #ffffff;
  box-shadow: 0 -4rpx 12rpx rgba(79, 108, 255, 0.08);
  box-sizing: border-box;
}
.input {
  flex: 1;
  border: 1rpx solid #e5e9ff;
  border-radius: 50rpx;
  padding: 16rpx 24rpx;
  font-size: 26rpx;
  background: #f8f9ff;
  transition: all 0.3s ease;
}
.input:focus { border-color: #4f6cff; background: #ffffff; }
.send-btn {
  margin-left: 16rpx;
  background: linear-gradient(90deg, #4f6cff 0%, #6b86ff 100%);
  color: #fff;
  border-radius: 50rpx;
  padding: 0 32rpx;
  font-size: 26rpx;
  box-shadow: 0 4rpx 12rpx rgba(79, 108, 255, 0.2);
  transition: all 0.3s ease;
}
.send-btn-hover { transform: scale(0.96); box-shadow: 0 2rpx 8rpx rgba(79, 108, 255, 0.2); }

/* 弹窗 */
.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}
.goal-popup {
  background: #ffffff;
  width: 80%;
  padding: 32rpx;
  border-radius: 24rpx;
  box-shadow: 0 12rpx 32rpx rgba(0, 0, 0, 0.15);
}
.popup-title {
  font-size: 30rpx;
  font-weight: 600;
  margin-bottom: 20rpx;
  display: block;
  color: #1d2129;
}
.goal-item {
  font-size: 26rpx;
  margin-bottom: 12rpx;
  color: #4e5969;
  line-height: 1.6;
}
.close-btn {
  margin-top: 24rpx;
  background: linear-gradient(90deg, #4f6cff 0%, #6b86ff 100%);
  color: #fff;
  border-radius: 50rpx;
  padding: 12rpx 0;
  font-size: 26rpx;
  width: 100%;
}
.close-btn-hover { opacity: 0.9; }

/* 题目卡片 */
.q-card {
  width: 100%;
  background: #ffffff;
  border-radius: 18rpx;
  padding: 18rpx;
  box-sizing: border-box;
}
.q-tag {
  align-self: flex-start;
  background: #f2f5ff;
  padding: 6rpx 12rpx;
  border-radius: 999rpx;
  margin-bottom: 12rpx;
  display: inline-flex;
}
.q-tag-text {
  font-size: 22rpx;
  color: #4f6cff;
  font-weight: 600;
}
.q-stem {
  font-size: 26rpx;
  line-height: 1.65;
  color: #1d2129;
  display: block;
  margin-bottom: 14rpx;
  white-space: pre-wrap;
}
.q-options {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  margin-bottom: 16rpx;
}
.q-option {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  padding: 14rpx 14rpx;
  border-radius: 14rpx;
  border: 1rpx solid #e8ecff;
  background: #f8f9ff;
}
.q-option.active { border-color: #4f6cff; background: #eef2ff; }
.q-option-key {
  width: 40rpx;
  height: 40rpx;
  border-radius: 10rpx;
  background: #e9eeff;
  color: #4f6cff;
  font-weight: 700;
  font-size: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.q-option-text {
  font-size: 26rpx;
  color: #1d2129;
  line-height: 1.55;
  flex: 1;
}
.q-confirm {
  width: 100%;
  border-radius: 14rpx;
  background: linear-gradient(90deg, #4f6cff 0%, #6b86ff 100%);
  color: #fff;
  font-size: 26rpx;
  padding: 16rpx 0;
}
.q-confirm-hover { opacity: 0.9; }
.q-confirm[disabled] { opacity: 0.5; }
.confirmed-tip {
  font-size: 24rpx;
  color: #4f6cff;
  text-align: center;
  padding: 8rpx 0;
}
</style>