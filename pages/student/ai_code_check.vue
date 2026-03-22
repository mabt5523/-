<template>
  <view class="page">

    <!-- 表单卡片 -->
    <view class="card">

      <!-- ✅ 语言选择（卡片式） -->
      <view class="field">
        <text class="label">语言</text>
        <view class="lang-grid">
          <view
            v-for="(item,index) in langOptions"
            :key="index"
            class="lang-item"
            :class="{active:langIndex===index}"
            @click="langIndex=index"
          >
            {{ item }}
          </view>
        </view>
      </view>

      <view class="field">
        <text class="label">描述（可选）</text>
        <textarea
          v-model="description"
          class="textarea"
          placeholder="例如：帮我检查下面代码是否正确、哪里会报错"
          :maxlength="400"
        />
        <view class="counter">{{ (description || '').length }}/400</view>
      </view>

      <view class="field">
        <text class="label">代码</text>
        <textarea
          v-model="code"
          class="codearea"
          placeholder="粘贴代码片段…"
          :maxlength="8000"
        />
        <view class="counter">{{ (code || '').length }}/8000</view>
      </view>

      <view class="actions">
        <view class="btn ghost" @click="fillDemo">填充示例</view>
        <view class="btn primary" :class="{ disabled: loading }" @click="submitCheck">
          {{ loading ? '检查中…' : '开始检查' }}
        </view>
      </view>

      <text v-if="errorText" class="error-text">{{ errorText }}</text>
    </view>

    <!-- 结果展示（原逻辑不变） -->
    <view v-if="result" class="result-card">
      <view class="result-head">
        <text class="result-title">检查结果</text>
        <view class="pill" :class="pillClass">{{ result.type || 'OK' }}</view>
      </view>

      <text class="result-msg">{{ result.message || '' }}</text>

      <!-- SYNTAX -->
      <view v-if="upperType === 'SYNTAX'" class="block">
        <text class="block-title">语法错误</text>

        <view v-if="(result.syntaxErrors || []).length === 0" class="empty">
          <text class="empty-text">（未返回可定位的语法错误行）</text>
        </view>

        <view v-else>
          <view class="err-item" v-for="(e, idx) in result.syntaxErrors" :key="'se_' + idx">
            <view class="err-row">
              <text class="err-badge">#{{ idx + 1 }}</text>
              <text class="err-line">行号：{{ e.line }}</text>
            </view>
            <text class="err-statement">{{ e.statement }}</text>
            <text class="err-reason">{{ e.reason }}</text>
          </view>
        </view>
      </view>

      <!-- LOGIC -->
      <view v-if="upperType === 'LOGIC'" class="block">
        <text class="block-title">逻辑问题说明</text>
        <text class="para">{{ result.logicReason || '（无）' }}</text>
      </view>

      <!-- Suggestions -->
      <view v-if="(result.suggestions || []).length" class="block">
        <text class="block-title">改进建议</text>
        <view class="sug-item" v-for="(s, idx) in result.suggestions" :key="'sg_' + idx">
          <text class="dot">•</text>
          <text class="sug-text">{{ s }}</text>
        </view>
      </view>
    </view>

    <view class="bottom-space"></view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      // UI
      langOptions: ['C', 'C++', 'Java', 'Python', 'JavaScript', 'TypeScript', 'Go', 'Rust'],
      langIndex: 0,

      // form
      description: '',
      code: '',

      // state
      loading: false,
      errorText: '',
      result: null
    }
  },

  computed: {
    upperType() {
      const t = (this.result?.type || 'OK') + ''
      return t.toUpperCase()
    },
    pillClass() {
      const t = this.upperType
      if (t === 'SYNTAX') return 'pill-red'
      if (t === 'LOGIC') return 'pill-orange'
      return 'pill-green'
    }
  },

  methods: {
    goBack() {
      uni.navigateBack()
    },

    onLangChange(e) {
      this.langIndex = Number(e.detail.value || 0)
    },

    fillDemo() {
      this.langIndex = 0 // C
      this.description = '帮忙检查一下下面代码片段是否正确'
      this.code = 'int n=1; for int i=1;i<=10;i++ {n++;}'
      this.result = null
      this.errorText = ''
    },

    // ===== 8081 专用请求 =====
    getBase8081() {
      return 'http://81.70.62.177:8081'
    },

    getBearerToken() {
      const token = String(uni.getStorageSync('token') || '').trim()
      if (!token) return ''
      return token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`
    },

    request8081({ path, method = 'GET', data = null }) {
      const url = this.getBase8081() + path
      const bearer = this.getBearerToken()

      return new Promise((resolve, reject) => {
        uni.request({
          url,
          method,
          data,
          timeout: 30000,
          header: {
            ...(bearer ? { Authorization: bearer } : {}),
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          success: (res) => {
            // ✅ 你的后端返回 200 + {code,msg,data}
            if (res.statusCode >= 200 && res.statusCode < 300) resolve(res.data || {})
            else reject(res)
          },
          fail: (err) => reject(err)
        })
      })
    },

    // ===== 提交检查（已按你接口返回适配）=====
    async submitCheck() {
      if (this.loading) return
      this.errorText = ''
      this.result = null

      const language = String(this.langOptions[this.langIndex] || '').trim()
      const description = String(this.description || '').trim()
      const code = String(this.code || '').trim()

      if (!code) {
        this.errorText = '请先输入代码'
        return
      }

      try {
        this.loading = true

        const res = await this.request8081({
          path: '/api/ai/code/check',
          method: 'POST',
          data: { language, description, code }
        })

        // res: { code:0, msg:"ok", data:{...} }
        if (!res || typeof res !== 'object') {
          this.errorText = '服务端返回异常'
          return
        }
        if (res.code !== 0) {
          this.errorText = res.msg || '检查失败'
          return
        }

        const d = res.data || {}

        // ✅ 按你截图字段（驼峰）
        const syntaxErrors = Array.isArray(d.syntaxErrors) ? d.syntaxErrors : []
        const logicReason = String(d.logicReason || '')
        const suggestions = Array.isArray(d.suggestions) ? d.suggestions : []

        this.result = {
          type: d.type || 'OK',
          message: d.message || '',
          syntaxErrors,
          logicReason,
          suggestions
        }
      } catch (e) {
        const msg =
          e?.data?.msg ||
          e?.data?.message ||
          e?.errMsg ||
          e?.message ||
          '网络错误，请稍后再试'
        this.errorText = String(msg)
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f5f7ff 0%, #ffffff 100%);
  padding: 28rpx 24rpx;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

/* topbar */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18rpx;
}
.back {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6rpx 18rpx rgba(79, 108, 255, 0.15);
  color: #4f6cff;
  font-size: 30rpx;
  transition: all 0.2s ease;
}
.back:active {
  transform: scale(0.96);
  box-shadow: 0 4rpx 12rpx rgba(79, 108, 255, 0.1);
}
.title {
  font-size: 32rpx;
  font-weight: 800;
  color: #1d2129;
  letter-spacing: 0.5rpx;
}
.top-right {
  width: 72rpx;
  height: 72rpx;
}

/* card */
.card {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx 28rpx;
  box-shadow: 0 12rpx 32rpx rgba(0, 0, 0, 0.04);
  border: 1rpx solid rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10rpx);
  margin-bottom: 24rpx;
}

.field {
  margin-bottom: 30rpx;
}
.label {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #334155;
  margin-bottom: 16rpx;
  letter-spacing: 0.3rpx;
}

/* picker */
.picker {
  height: 88rpx;
  border-radius: 20rpx;
  border: 1rpx solid rgba(79, 108, 255, 0.15);
  background: linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%);
  padding: 0 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all 0.2s ease;
}
.picker:hover {
  border-color: rgba(79, 108, 255, 0.3);
  box-shadow: 0 4rpx 12rpx rgba(79, 108, 255, 0.08);
}
.picker-text {
  font-size: 28rpx;
  color: #111827;
  font-weight: 500;
}
.picker-arrow {
  color: #94a3b8;
  font-size: 24rpx;
  transition: transform 0.2s ease;
}
.picker:active .picker-arrow {
  transform: rotate(180deg);
}

/* textarea */
.textarea {
  width: 100%;
  min-height: 140rpx;
  border-radius: 20rpx;
  border: 1rpx solid rgba(79, 108, 255, 0.15);
  background: #fbfcff;
  padding: 20rpx 24rpx;
  font-size: 26rpx;
  line-height: 1.6;
  box-sizing: border-box;
  transition: all 0.2s ease;
  resize: none;
}
.textarea:focus {
  border-color: rgba(79, 108, 255, 0.4);
  box-shadow: 0 0 0 4rpx rgba(79, 108, 255, 0.08);
  outline: none;
}
.codearea {
  width: 100%;
  min-height: 320rpx;
  border-radius: 20rpx;
  border: 1rpx solid rgba(79, 108, 255, 0.15);
  background: #0b1020;
  color: #e5e7eb;
  padding: 20rpx 24rpx;
  font-size: 24rpx;
  line-height: 1.7;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  box-sizing: border-box;
  transition: all 0.2s ease;
  resize: none;
}
.codearea:focus {
  border-color: rgba(79, 108, 255, 0.4);
  box-shadow: 0 0 0 4rpx rgba(79, 108, 255, 0.08);
  outline: none;
}
.counter {
  margin-top: 10rpx;
  font-size: 22rpx;
  color: #94a3b8;
  text-align: right;
}

/* actions */
.actions {
  display: flex;
  gap: 16rpx;
  margin-top: 10rpx;
}
.btn {
  flex: 1;
  height: 88rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 600;
  transition: all 0.2s ease;
  letter-spacing: 0.5rpx;
}
.btn:active {
  transform: scale(0.98);
}

.btn.primary {
  background: linear-gradient(135deg, #4f6cff 0%, #6b86ff 100%);
  color: #fff;
  box-shadow: 0 12rpx 28rpx rgba(79, 108, 255, 0.2);
  position: relative;
  overflow: hidden;
}
.btn.primary::after {
  content: "";
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.6s ease;
}
.btn.primary:hover::after {
  left: 100%;
}
.btn.ghost {
  background: #fff;
  color: #4f6cff;
  border: 2rpx solid #e5e9ff;
  transition: all 0.2s ease;
}
.btn.ghost:hover {
  background: #f8f9ff;
  border-color: #d1d9ff;
}
.btn.disabled {
  opacity: 0.55;
  pointer-events: none;
}

.error-text {
  margin-top: 18rpx;
  padding: 16rpx 20rpx;
  font-size: 24rpx;
  color: #ff4d4f;
  background: rgba(255, 77, 79, 0.08);
  border: 1rpx solid rgba(255, 77, 79, 0.25);
  border-radius: 16rpx;
  border-left: 4rpx solid #ff4d4f;
}

/* result */
.result-card {
  margin-top: 24rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx 28rpx;
  box-shadow: 0 12rpx 32rpx rgba(0, 0, 0, 0.04);
  border: 1rpx solid rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10rpx);
  animation: fadeIn 0.3s ease forwards;
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.result-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}
.result-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #1d2129;
  letter-spacing: 0.5rpx;
}
.pill {
  padding: 10rpx 20rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 600;
  transition: all 0.2s ease;
}
.pill-green {
  background: rgba(34, 197, 94, 0.12);
  color: #16a34a;
}
.pill-orange {
  background: rgba(245, 158, 11, 0.14);
  color: #d97706;
}
.pill-red {
  background: rgba(239, 68, 68, 0.14);
  color: #dc2626;
}

.result-msg {
  font-size: 26rpx;
  color: #334155;
  line-height: 1.7;
  margin-bottom: 20rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.05);
}

.block {
  margin-top: 24rpx;
}
.block-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #111827;
  margin-bottom: 16rpx;
  letter-spacing: 0.3rpx;
}

.err-item {
  background: #fff7f7;
  border: 1rpx solid rgba(239, 68, 68, 0.18);
  border-radius: 18rpx;
  padding: 18rpx 18rpx;
  margin-bottom: 16rpx;
  transition: all 0.2s ease;
}
.err-item:hover {
  box-shadow: 0 4rpx 12rpx rgba(239, 68, 68, 0.08);
}
.err-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}
.err-badge {
  font-size: 22rpx;
  font-weight: 700;
  color: #dc2626;
  background: rgba(239, 68, 68, 0.1);
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}
.err-line {
  font-size: 22rpx;
  color: #64748b;
}
.err-statement {
  font-size: 24rpx;
  color: #111827;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  white-space: pre-wrap;
  margin-bottom: 8rpx;
  padding: 8rpx 12rpx;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 8rpx;
}
.err-reason {
  font-size: 24rpx;
  color: #b91c1c;
  white-space: pre-wrap;
  line-height: 1.6;
}

.para {
  font-size: 26rpx;
  color: #334155;
  line-height: 1.75;
  white-space: pre-wrap;
  background: #f8fafc;
  padding: 16rpx;
  border-radius: 12rpx;
}

.sug-item {
  display: flex;
  gap: 12rpx;
  margin-bottom: 16rpx;
  padding: 12rpx 0;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.03);
}
.sug-item:last-child {
  border-bottom: none;
  margin-bottom: 0;
}
.dot {
  color: #4f6cff;
  font-size: 28rpx;
  line-height: 1;
  margin-top: 4rpx;
}
.sug-text {
  flex: 1;
  font-size: 26rpx;
  color: #334155;
  line-height: 1.7;
  white-space: pre-wrap;
}

.empty {
  padding: 20rpx 0;
  text-align: center;
}
.empty-text {
  font-size: 24rpx;
  color: #94a3b8;
}

.bottom-space {
  height: 40rpx;
}

/* 滚动条美化 */
::-webkit-scrollbar {
  width: 8rpx;
  height: 8rpx;
}
::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4rpx;
}
::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4rpx;
}
::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
/* 语言选择 */
.lang-grid{
  display:flex;
  flex-wrap:wrap;
  gap:14rpx;
}

.lang-item{
  padding:14rpx 22rpx;
  border-radius:999rpx;
  background:#eef2ff;
  font-weight:600;
  font-size:24rpx;
  color:#4f6cff;
  transition:all 0.2s ease;
}

.lang-item.active{
  background:linear-gradient(135deg,#4f6cff,#6b86ff);
  color:#fff;
  box-shadow:0 6rpx 16rpx rgba(79,108,255,0.3);
}
</style>