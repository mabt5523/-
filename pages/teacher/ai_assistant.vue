<template>
  <view class="page">
    <!-- 顶部栏 -->
    <view class="header">


      <view class="title-wrap">
        <text class="title">AI伴教</text>
        <text class="sub">{{ courseName || `课程ID：${courseId || '-'}` }}</text>
      </view>
    </view>

    <!-- 缺少 courseId 提示 -->
    <view v-if="!courseId" class="warn-card">
      <text class="warn-title">缺少课程ID</text>
      <text class="warn-text">请从课程详情页进入 AI伴教，确保 URL 带 courseId。</text>
      <view class="btn outline" @click="goBack">返回</view>
    </view>

    <!-- 聊天区 -->
    <scroll-view v-else class="chat" scroll-y :scroll-top="scrollTop">
      <view v-for="(m, idx) in messages" :key="idx" class="msg-row" :class="[m.role]">
        <!-- 增加外层容器，避免scoped样式隔离问题 -->
        <view class="bubble-wrap">
          <view class="bubble" :class="[m.role]">
            <!-- ✅ 支持 ** ** 加粗渲染 -->
            <text class="bubble-text">
              <text
                v-for="(seg, sidx) in renderTextSegments(m.content)"
                :key="idx + '-' + sidx"
                :class="{
                  'txt-bold': seg.bold,
                  'txt-blue': seg.blue
                }"
              >
                {{ seg.text }}
              </text>
            </text>
          </view>
        </view>
      </view>

      <view v-if="loading" class="msg-row assistant">
        <view class="bubble-wrap">
          <view class="bubble assistant">
            <text class="bubble-text">正在思考…</text>
          </view>
        </view>
      </view>

      <view style="height: 20rpx;"></view>
    </scroll-view>

    <!-- 输入栏 -->
    <view v-if="courseId" class="input-bar">
      <textarea
        class="input"
        v-model="input"
        :maxlength="2000"
  
        auto-height
      />
      <view class="send-btn" :class="{ disabled: !canSend }" @click="handleSend">
        发送
      </view>
    </view>
  </view>
</template>

<script>
import request from '@/common/request.js'

// ✅ 历史接口走 8081（你按自己实际 IP 改）
// 真机：用电脑局域网 IP；模拟器/H5：可用 localhost
const AI_BASE = 'http://81.70.62.177:8081'

export default {
  data() {
    return {
      courseId: null,
      courseName: '',
      mode: 'PLAN',

      sessionId: null,
      messages: [],
      input: '',
      loading: false,
      scrollTop: 0
    }
  },

  async onLoad(options) {
    const id = options.courseId || options.id
    this.courseId = id ? Number(id) : null
    this.courseName = options.courseName ? decodeURIComponent(options.courseName) : ''

    // ✅ 1) 先恢复本地缓存（秒开）
    this.restoreChatCache()

    // ✅ 2) 每次进入：按你要求 —— 8080 拿 sessionId，再 8081 拉 history
    if (this.courseId) {
      await this.fetchHistoryOnEnter()
    }

    // ✅ 3) 如果还是没有任何历史，给一条默认开场
    if (!this.messages.length) {
      this.messages = [
        {
          role: 'assistant',
          content:
            '老师你好，我将以协助你完成课程设计。\n' +
            '先确认几个关键信息：\n' +
            '1) 这节课预计多少分钟？（40/45/其他）\n' +
            '2) 教学环境在教室还是在机房？\n' +
            '3) 学生对本课知识点的基础如何？（好/一般/较弱）'
        }
      ]
      this.persistChatCache()
    }

    this.$nextTick(() => this.scrollToBottom())
  },

  computed: {
    canSend() {
      return !this.loading && this.input.trim().length > 0 && !!this.courseId
    }
  },

  methods: {
    goBack() {
      uni.navigateBack({ delta: 1 })
    },

    getToken() {
      return (
        uni.getStorageSync('token') ||
        uni.getStorageSync('TOKEN') ||
        uni.getStorageSync('ACCESS_TOKEN') ||
        ''
      )
    },

    // ✅ **加粗** 解析：把文本拆成 segments（bold / normal）
    renderTextSegments(text) {
      const s = String(text ?? '')
      if (!s) return [{ text: '', bold: false, blue: false }]
    
      const result = []
    
      // 先按换行分段
      const lines = s.split('\n')
    
      lines.forEach((line, lineIndex) => {
        let isBlueLine = false
        let content = line
    
        // 判断这一行是否包含 ###
        const marker = '###'
        const pos = line.indexOf(marker)
    
        if (pos >= 0) {
          // ### 之后的这一行变蓝
          isBlueLine = true
          content = line.slice(pos + marker.length)
        }
    
        // 处理 **加粗**
        const re = /\*\*([\s\S]+?)\*\*/g
        let last = 0
        let m
    
        while ((m = re.exec(content)) !== null) {
          const start = m.index
          const end = re.lastIndex
    
          if (start > last) {
            result.push({
              text: content.slice(last, start),
              bold: false,
              blue: isBlueLine
            })
          }
    
          result.push({
            text: m[1],
            bold: true,
            blue: isBlueLine
          })
    
          last = end
        }
    
        if (last < content.length) {
          result.push({
            text: content.slice(last),
            bold: false,
            blue: isBlueLine
          })
        }
    
        // 除了最后一行，手动补回换行
        if (lineIndex < lines.length - 1) {
          result.push({
            text: '\n',
            bold: false,
            blue: false
          })
        }
      })
    
      return result
    },

    // ========== 本地持久化（关键） ==========
    cacheKey() {
      // 按 courseId + 固定 PLAN 分开存
      return `teacher_ai_plan_${this.courseId || 'unknown'}`
    },

    restoreChatCache() {
      if (!this.courseId) return
      try {
        const raw = uni.getStorageSync(this.cacheKey())
        if (!raw) return
        const obj = typeof raw === 'string' ? JSON.parse(raw) : raw
        if (obj && typeof obj === 'object') {
          this.sessionId = obj.sessionId ?? null
          this.messages = Array.isArray(obj.messages) ? obj.messages : []
        }
      } catch (e) {
        console.warn('[ai_assistant] restore cache failed', e)
      }
    },

    persistChatCache() {
      if (!this.courseId) return
      try {
        const data = {
          sessionId: this.sessionId,
          messages: this.messages
        }
        uni.setStorageSync(this.cacheKey(), JSON.stringify(data))
      } catch (e) {
        console.warn('[ai_assistant] persist cache failed', e)
      }
    },

    // 可选：清空本课程 AI 历史
    clearChatCache() {
      if (!this.courseId) return
      uni.removeStorageSync(this.cacheKey())
      this.sessionId = null
      this.messages = []
    },

    // ===========================
    // ✅ 进页面：获取历史
    // 1) 8080：/api/teacher/ai/plan-session-id（用 request.js）
    // 2) 8081：/api/teacher/ai/history?sessionId=xx（带 token）
    // ===========================
    async fetchHistoryOnEnter() {
      const token = this.getToken()
      if (!token) return

      try {
        // 1) 从 8080 获取 plan sessionId（你截图里就是 8080）
        const sidRes = await request({
          url: '/api/teacher/ai/plan-session-id',
          method: 'GET'
        })

        const sid = sidRes?.data?.sessionId ?? sidRes?.sessionId
        if (!sid) return
        this.sessionId = Number(sid)

        // 2) 用 8081 获取历史（你截图里 history 在 8081）
        const res = await uni.request({
          url: `${AI_BASE}/api/teacher/ai/history`,
          method: 'GET',
          header: {
            Authorization: `Bearer ${token}`
          },
          data: {
            sessionId: this.sessionId
          }
        })

        // uni.request 返回：{ data, statusCode, header, ... }
        const body = res?.data || {}
        const status = res?.statusCode

        if (status && status >= 400) {
          console.error('[history] http error', status, body)
          return
        }

        // ✅ 兼容你 swagger 返回：{ msg, code, data: { sessionId, mode, messages: [...] } }
        const msgList = body?.data?.messages || []
        if (!Array.isArray(msgList) || !msgList.length) return

        // ✅ 映射成前端渲染结构
        this.messages = msgList.map((x) => ({
          role: x.role === 'teacher' ? 'teacher' : 'assistant',
          content: String(x.content ?? '')
        }))

        this.persistChatCache()
        this.$nextTick(() => this.scrollToBottom())
      } catch (e) {
        console.error('[fetchHistoryOnEnter] failed:', e)
      }
    },

    // ========== 发送消息 ==========
    async handleSend() {
      if (!this.canSend) return

      const text = this.input.trim()
      this.input = ''

      // 先把老师消息加入列表
      this.messages.push({ role: 'teacher', content: text })
      this.persistChatCache()
      this.scrollToBottom()

      try {
        this.loading = true

        const token = this.getToken()
        if (!token) {
          uni.showToast({ title: '未登录或缺少token', icon: 'none' })
          this.loading = false
          return
        }

        const payload = {
          courseId: this.courseId,
          mode: this.mode, // 固定 PLAN
          message: text
        }
        if (this.sessionId != null) payload.sessionId = this.sessionId

        // ✅ 不用 request.js（8080），AI chat 走 8081
        const res = await uni.request({
          url: `${AI_BASE}/api/teacher/ai/chat`,
          method: 'POST',
          header: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          data: payload
        })

        const body = res?.data || {}
        const code = res?.statusCode

        if (code && code >= 400) {
          const msg = body?.message || body?.error || `请求失败(${code})`
          throw { statusCode: code, data: body, message: msg }
        }

        const newSessionId = body.sessionId
        const reply = body.reply

        if (newSessionId != null) this.sessionId = newSessionId

        this.messages.push({
          role: 'assistant',
          content: (reply || '').toString().trim() || '（AI未返回内容）'
        })

        this.persistChatCache()
        this.$nextTick(() => this.scrollToBottom())
      } catch (e) {
        console.error('[ai_assistant] chat failed:', e)

        const msg =
          e?.data?.message ||
          e?.data?.error ||
          e?.errMsg ||
          e?.message ||
          `请求失败(${e?.statusCode || ''})`

        uni.showToast({ title: msg, icon: 'none' })

        this.messages.push({
          role: 'assistant',
          content: `（请求失败）${msg}`
        })

        this.persistChatCache()
        this.$nextTick(() => this.scrollToBottom())
      } finally {
        this.loading = false
      }
    },

    scrollToBottom() {
      this.scrollTop += 999999
    }
  }
}
</script>

<!-- 移除scoped，或使用深度选择器，确保样式生效 -->
<style>
/* 基础布局 - 优化渐变背景 + 固定布局 */
page {
  background: linear-gradient(180deg, #f5f7ff 0%, #e6edff 100%);
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", sans-serif;
}
.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;

  /* ✅ 给固定顶部栏留出空间：要算上状态栏 */
  padding-top: calc(110rpx);
  padding-bottom: 0;
}

.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 99;

  /* ✅ header 总高度 = 内容区110rpx + 状态栏 */
  height: calc(110rpx);


  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(12rpx);
  display: flex;
  align-items: center;
  justify-content: center;

  padding-left: 24rpx;
  padding-right: 24rpx;

  box-shadow: 0 4rpx 20rpx rgba(79, 108, 255, 0.08);
  border-bottom: 1rpx solid rgba(79, 108, 255, 0.1);
  box-sizing: border-box;
}
.back {
  position: absolute;
  left: 28rpx;
  top: 28rpx;
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  color: #fff;
  background: linear-gradient(135deg, #4f6cff 0%, #6b86ff 100%);
  border-radius: 50%;
  box-shadow: 0 6rpx 16rpx rgba(79, 108, 255, 0.2);
  transition: all 0.2s ease;
}
.back::before { content: "←"; }
.back:active {
  transform: scale(0.95);
  box-shadow: 0 3rpx 8rpx rgba(79, 108, 255, 0.15);
}

.title-wrap {
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;

  /* ✅ 想更靠上就调这里（推荐 -8rpx ~ -14rpx） */
  transform: translateY(-10rpx);
}
.title {
  font-size: 36rpx;
  font-weight: 800;
  color: #1d2129;
  background: linear-gradient(90deg, #4f6cff, #6b86ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.sub {
  font-size: 24rpx;
  color: #64748b;
}
.tag{
  font-size: 22rpx;
  color: #4f6cff;
  background: rgba(79, 108, 255, 0.1);
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  font-weight: 800;
  border: 1rpx solid rgba(79, 108, 255, 0.2);
}

/* 警告卡片 - 视觉升级 */
.warn-card{
  margin: 24rpx 28rpx;
  background: #ffffff;
  border-radius: 24rpx;
  padding: 24rpx;
  border: 1rpx solid rgba(255, 180, 180, 0.3);
  box-shadow: 0 10rpx 24rpx rgba(0,0,0,0.05);
  position: relative;
  overflow: hidden;
}
.warn-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 4rpx;
  background: linear-gradient(90deg, #ff4d4f, #ff7a7a);
}
.warn-title{
  font-size: 30rpx;
  font-weight: 800;
  color: #b42318;
}
.warn-text{
  margin-top: 10rpx;
  font-size: 26rpx;
  color:#64748b;
  line-height: 1.7;
}
.btn{
  margin-top: 18rpx;
  height: 84rpx;
  border-radius: 18rpx;
  font-size: 26rpx;
  display:flex;
  align-items:center;
  justify-content:center;
  font-weight: 800;
  transition: all 0.2s ease;
}
.btn:active {
  transform: scale(0.98);
}
.outline{
  border: 2rpx solid #4f6cff;
  color:#4f6cff;
  background:#fff;
}
.outline:active {
  background: rgba(79, 108, 255, 0.05);
}

/* 聊天区域 - 核心滚动优化 */
.chat{
  flex: 1; /* 占满除了头部和输入框的所有空间 */
  padding: 0 28rpx 20rpx;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  /* 防止内容被输入框覆盖 */
  padding-bottom: 120rpx;
}
.tips{
  margin: 10rpx 0 18rpx;
  display:flex;
  flex-direction: column;
  gap: 8rpx;
  font-size: 22rpx;
  color:#94a3b8;
  align-items: center;
}

/* 消息行布局 - 增加间距和层次感 */
.msg-row{
  display:flex;
  margin: 20rpx 0;
  position: relative;
  padding: 0 4rpx;
}
/* 强制指定教师消息右对齐 */
.msg-row.teacher{
  justify-content: flex-end !important;
}
/* 强制指定AI消息左对齐 */
.msg-row.assistant{
  justify-content: flex-start !important;
}

.bubble-wrap {
  display: inline-block;
}

/* 对话气泡 - 基础样式 */
.bubble{
  max-width: 75%; /* 适当收窄，提升精致感 */
  padding: 24rpx 28rpx;
  border-radius: 24rpx;
  line-height: 1.8;
  position: relative;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  /* 高级纹理背景 */
  background-size: 100% 100%;
  background-position: center;
}

/* 教师气泡（右侧）- 渐变蓝色高级质感（强制优先级） */
.msg-row.teacher .bubble {
  /* 优化的渐变蓝色 - 更高级的蓝调 */
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important;
  color: #545454 !important;
  border-bottom-right-radius: 10rpx !important;
  /* 细腻纹理叠加 */
  background-image: radial-gradient(circle at 10% 20%, rgba(255,255,255,0.08) 0%, transparent 20%),
                    radial-gradient(circle at 90% 80%, rgba(255,255,255,0.05) 0%, transparent 20%) !important;
  /* 立体阴影 */
  box-shadow:
    0 8rpx 24rpx rgba(59, 130, 246, 0.2),
    inset 0 -2rpx 4rpx rgba(0,0,0,0.1),
    inset 0 2rpx 4rpx rgba(255,255,255,0.1) !important;
}
/* 教师气泡尾部 - 精致三角 */
.msg-row.teacher .bubble::after {
  content: '' !important;
  position: absolute !important;
  right: -12rpx !important;
  bottom: 24rpx !important;
  width: 24rpx !important;
  height: 32rpx !important;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important;
  border-radius: 0 0 8rpx 0 !important;
  transform: rotate(15deg) !important;
  box-shadow: 4rpx 4rpx 8rpx rgba(59, 130, 246, 0.15) !important;
}
/* 教师气泡高光点缀 */
.msg-row.teacher .bubble::before {
  content: '' !important;
  position: absolute !important;
  top: 12rpx !important;
  left: 12rpx !important;
  width: 60% !important;
  height: 40% !important;
  background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%) !important;
  border-radius: 50% !important;
}

/* AI气泡（左侧）- 质感卡片风格（强制优先级） */
.msg-row.assistant .bubble {
  background: #ffffff !important;
  color: #1d2129 !important;
  border-bottom-left-radius: 10rpx !important;
  border: 1rpx solid rgba(79, 108, 255, 0.15) !important;
  /* 细腻纹理叠加 */
  background-image: radial-gradient(circle at 10% 20%, rgba(79, 108, 255, 0.03) 0%, transparent 20%),
                    radial-gradient(circle at 90% 80%, rgba(79, 108, 255, 0.02) 0%, transparent 20%) !important;
  /* 立体阴影 */
  box-shadow:
    0 8rpx 24rpx rgba(0,0,0,0.06),
    inset 0 -1rpx 2rpx rgba(0,0,0,0.03),
    inset 0 1rpx 2rpx rgba(255,255,255,0.8) !important;
}
/* AI气泡尾部 - 精致三角 */
.msg-row.assistant .bubble::after {
  content: '' !important;
  position: absolute !important;
  left: -12rpx !important;
  bottom: 24rpx !important;
  width: 24rpx !important;
  height: 32rpx !important;
  background: #ffffff !important;
  border: 1rpx solid rgba(79, 108, 255, 0.15) !important;
  border-right: none !important;
  border-top: none !important;
  border-radius: 0 0 0 8rpx !important;
  transform: rotate(-15deg) !important;
  box-shadow: -4rpx 4rpx 8rpx rgba(0,0,0,0.03) !important;
}
/* AI气泡高光点缀 */
.msg-row.assistant .bubble::before {
  content: '' !important;
  position: absolute !important;
  top: 12rpx !important;
  left: 12rpx !important;
  width: 60% !important;
  height: 40% !important;
  background: radial-gradient(circle, rgba(79, 108, 255, 0.05) 0%, transparent 70%) !important;
  border-radius: 50% !important;
}

/* 气泡文字 - 优化可读性 */
.bubble-text{
  font-size: 26rpx !important;
  white-space: pre-wrap !important;
  word-break: break-all !important;
  position: relative !important;
  z-index: 1 !important; /* 确保文字在纹理之上 */
  text-shadow: 0 1rpx 2rpx rgba(0,0,0,0.03) !important;
}
/* 教师气泡文字增强对比度 */
.msg-row.teacher .bubble-text {
  text-shadow: 0 1rpx 2rpx rgba(0,0,0,0.1) !important;
}

/* 加载中气泡特殊样式 */
.msg-row.assistant.loading .bubble {
  background: linear-gradient(135deg, #f8fafc 0%, #f0f4ff 100%) !important;
  border-color: rgba(79, 108, 255, 0.2) !important;
}
.msg-row.assistant.loading .bubble::before {
  background: radial-gradient(circle, rgba(79, 108, 255, 0.08) 0%, transparent 70%) !important;
}

/* 底部输入框 - 固定定位 + 美化 */
.input-bar{
  /* 核心：固定在底部 */
  position: fixed !important;
  bottom: 0 !important;
  left: 0 !important;
  right: 0 !important;
  z-index: 20 !important;

  padding: 18rpx 28rpx 32rpx !important; /* 适配不同设备底部安全区 */
  background: rgba(255,255,255,0.95) !important;
  backdrop-filter: blur(8rpx) !important;
  border-top: 1rpx solid rgba(79, 108, 255, 0.15) !important;
  display:flex !important;
  gap: 16rpx !important;
  align-items: flex-end !important;
  box-shadow: 0 -4rpx 20rpx rgba(79, 108, 255, 0.05) !important;
}
/* 输入框样式 */
.input{
  flex: 1 !important;
  min-height: 72rpx !important;
  max-height: 240rpx !important;
  background: #ffffff !important;
  border: 1rpx solid rgba(79, 108, 255, 0.15) !important;
  border-radius: 20rpx !important;
  padding: 18rpx 20rpx !important;
  font-size: 26rpx !important;
  color:#1d2129 !important;
  box-shadow: 0 6rpx 18rpx rgba(79, 108, 255, 0.06) !important;
  transition: all 0.2s ease !important;
}
.input:focus {
  border-color: #4f6cff !important;
  box-shadow: 0 0 0 4rpx rgba(79, 108, 255, 0.1) !important;
}
/* 发送按钮 - 匹配用户气泡渐变蓝 */
.send-btn{
  width: 140rpx !important;
  height: 76rpx !important;
  border-radius: 20rpx !important;
  /* 匹配用户气泡的渐变蓝色 */
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important;
  color:#fff !important;
  font-size: 26rpx !important;
  font-weight: 800 !important;
  display:flex !important;
  align-items:center !important;
  justify-content:center !important;
  box-shadow: 0 8rpx 20rpx rgba(59, 130, 246, 0.2) !important;
  transition: all 0.2s ease !important;
  position: relative !important;
  overflow: hidden !important;
}
.send-btn::before {
  content: '' !important;
  position: absolute !important;
  top: 0 !important;
  left: -100% !important;
  width: 100% !important;
  height: 100% !important;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent) !important;
  transition: left 0.5s ease !important;
}
.send-btn:active{
  transform: scale(0.98) !important;
  box-shadow: 0 4rpx 12rpx rgba(59, 130, 246, 0.15) !important;
}
.send-btn:active::before {
  left: 100% !important;
}
.send-btn.disabled{
  opacity: 0.5 !important;
  pointer-events: none !important;
}

/* ✅ 新增：加粗样式（用于 ** **） */
.txt-bold { font-weight: 700; }
.txt-blue { 
  color: #2563eb !important; 
}
</style>