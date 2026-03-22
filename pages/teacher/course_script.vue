<template>
  <view class="page">
    <!-- 顶部栏 -->
    <view class="header">

      <text class="title">课程脚本</text>
      <view class="save" :class="{ disabled: saving }" @click="saveScript">
        {{ saving ? '保存中…' : '保存' }}
      </view>
    </view>

    <!-- 状态区 -->
    <view v-if="loading" class="card muted">脚本加载中…</view>

    <view v-else-if="errorMsg" class="card error">
      <text>加载失败：{{ errorMsg }}</text>
      <view class="retry" @click="loadScript">重试</view>
    </view>

    <view v-else class="content">


      <!-- 学习目标 -->
      <view class="card section">
        <view class="sec-head">
          <text class="sec-title">学习目标</text>
          <text class="sec-sub">learning_goal</text>
        </view>
        <textarea
          v-model="formText.learningGoalText"
          class="ta"
          placeholder="每行一个学习目标…"
          :maxlength="-1"
        />
        <view class="sec-foot">
          <text class="count">条目数：{{ toList(formText.learningGoalText).length }}</text>
          <view class="mini-btn" @click="fillDemo('learningGoalText')">填充示例</view>
          <view class="mini-btn ghost" @click="clearField('learningGoalText')">清空</view>
        </view>
      </view>

      <!-- 核心概念 -->
      <view class="card section">
        <view class="sec-head">
          <text class="sec-title">核心概念</text>
          <text class="sec-sub">core_concept</text>
        </view>
        <textarea
          v-model="formText.coreConceptText"
          class="ta"
          placeholder="每行一个核心概念…"
          :maxlength="-1"
        />
        <view class="sec-foot">
          <text class="count">条目数：{{ toList(formText.coreConceptText).length }}</text>
          <view class="mini-btn" @click="fillDemo('coreConceptText')">填充示例</view>
          <view class="mini-btn ghost" @click="clearField('coreConceptText')">清空</view>
        </view>
      </view>

      <!-- 引导问题 -->
      <view class="card section">
        <view class="sec-head">
          <text class="sec-title">引导问题</text>
          <text class="sec-sub">guide_question</text>
        </view>
        <textarea
          v-model="formText.guideQuestionText"
          class="ta"
          placeholder="每行一个引导问题…"
          :maxlength="-1"
        />
        <view class="sec-foot">
          <text class="count">条目数：{{ toList(formText.guideQuestionText).length }}</text>
          <view class="mini-btn" @click="fillDemo('guideQuestionText')">填充示例</view>
          <view class="mini-btn ghost" @click="clearField('guideQuestionText')">清空</view>
        </view>
      </view>

      <!-- 常见误解 -->
      <view class="card section">
        <view class="sec-head">
          <text class="sec-title">常见误解</text>
          <text class="sec-sub">common_mistake</text>
        </view>
        <textarea
          v-model="formText.commonMistakeText"
          class="ta"
          placeholder="每行一个常见误解…"
          :maxlength="-1"
        />
        <view class="sec-foot">
          <text class="count">条目数：{{ toList(formText.commonMistakeText).length }}</text>
          <view class="mini-btn" @click="fillDemo('commonMistakeText')">填充示例</view>
          <view class="mini-btn ghost" @click="clearField('commonMistakeText')">清空</view>
        </view>
      </view>

      <!-- 底部按钮 -->
      <view class="bottom-actions">
        <view class="btn outline" @click="loadScript" :class="{ disabled: loading || saving }">重新读取</view>
        <view class="btn primary" @click="saveScript" :class="{ disabled: saving }">
          {{ saving ? '保存中…' : '保存' }}
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import request from '@/common/request.js'

export default {
  data() {
    return {
      courseId: null,
      loading: true,
      saving: false,
      errorMsg: '',

      // ✅ 用“多行文本”作为编辑载体（更顺手）
      formText: {
        learningGoalText: '',
        coreConceptText: '',
        guideQuestionText: '',
        commonMistakeText: ''
      }
    }
  },

  onLoad(options) {
    // ✅ 跟你课程详情页一样：从 options 取 courseId
    this.courseId = options.courseId || options.id || options.course_id
    this.loadScript()
  },

  methods: {
    goBack() { uni.navigateBack({ delta: 1 }) },

    // ========== 文本 <-> 数组 ==========
    toList(text) {
      return String(text || '')
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean)
    },
    toText(list) {
      return Array.isArray(list) ? list.filter(Boolean).map(x => String(x).trim()).filter(Boolean).join('\n') : ''
    },

    // ========== 读取脚本（先读再改） ==========
    async loadScript() {
      if (!this.courseId) {
        this.errorMsg = '缺少 courseId 参数'
        this.loading = false
        return
      }

      this.loading = true
      this.errorMsg = ''

      try {
        const res = await request({
          url: `/api/teacher/course/${this.courseId}/script`,
          method: 'GET'
        })

        // ✅ 兼容你项目的返回风格：res.data / res.course / res.result / res
        const data = res?.data || res?.course || res?.result || res || {}

        // ✅ 回填：数组 -> 多行文本
        this.formText.learningGoalText  = this.toText(data.learningGoal)
        this.formText.coreConceptText   = this.toText(data.coreConcept)
        this.formText.guideQuestionText = this.toText(data.guideQuestion)
        this.formText.commonMistakeText = this.toText(data.commonMistake)

      } catch (e) {
        console.error('loadScript failed', e)
        this.errorMsg =
          e?.data?.message ||
          e?.data?.error ||
          e?.errMsg ||
          e?.message ||
          '接口异常'
      } finally {
        this.loading = false
      }
    },

    // ========== 保存脚本（更新/新增） ==========
    async saveScript() {
      if (this.saving) return
      if (!this.courseId) {
        uni.showToast({ title: '缺少 courseId', icon: 'none' })
        return
      }

      // ✅ 多行文本 -> 数组（后端存 JSON）
      const payload = {
        learningGoal: this.toList(this.formText.learningGoalText),
        coreConcept: this.toList(this.formText.coreConceptText),
        guideQuestion: this.toList(this.formText.guideQuestionText),
        commonMistake: this.toList(this.formText.commonMistakeText)
      }

      this.saving = true
      try {
        await request({
          url: `/api/teacher/course/${this.courseId}/script`,
          method: 'PUT',
          data: payload
        })

        uni.showToast({ title: '已保存', icon: 'none' })

        // ✅ 保存后可选：再读一次保证一致（你想要更稳就打开）
        // await this.loadScript()

      } catch (e) {
        console.error('saveScript failed', e)
        const msg =
          e?.data?.message ||
          e?.data?.error ||
          e?.errMsg ||
          e?.message ||
          `保存失败(${e?.statusCode || ''})`
        uni.showToast({ title: msg, icon: 'none' })
      } finally {
        this.saving = false
      }
    },

    // ========== 小工具 ==========
    clearField(key) {
      this.formText[key] = ''
    },
    fillDemo(key) {
      const demo = {
        learningGoalText: `理解本节核心概念\n能完成一个基础练习\n能解释一个常见错误原因`,
        coreConceptText: `概念A\n概念B\n关键术语C`,
        guideQuestionText: `为什么要这样做？\n如果换一种条件会怎样？\n你能举一个生活例子吗？`,
        commonMistakeText: `把概念A和B混淆\n忽略前提条件\n只记结论不理解过程`
      }
      this.formText[key] = demo[key] || ''
    }
  }
}
</script>

<style scoped>
/* 全局基础样式 - 优化渐变和字体 */
page { 
  background: linear-gradient(135deg, #f5f7ff 0%, #e6edff 100%); 
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", Arial, sans-serif;
  min-height: 100vh;
}
.page { 
  min-height: 100vh; 
  padding: 24rpx; 
  box-sizing: border-box; 
}

/* 顶部导航栏 - 全面美化 */
.header{ 
  display:flex; 
  align-items:center; 
  position: relative; 
  margin-bottom: 32rpx; 
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid rgba(79, 108, 255, 0.1);
}
.back{
  width: 68rpx; 
  height: 68rpx; 
  border-radius: 50%;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%); 
  display:flex; 
  align-items:center; 
  justify-content:center;
  color:#4f6cff; 
  box-shadow: 0 8rpx 24rpx rgba(79,108,255,0.1);
  font-weight: 700;
  font-size: 30rpx;
  transition: all 0.3s ease;
  border: 1rpx solid rgba(79, 108, 255, 0.08);
}
.back:hover {
  transform: scale(1.05);
  box-shadow: 0 10rpx 28rpx rgba(79,108,255,0.15);
}
.back:active {
  transform: scale(0.95);
  box-shadow: 0 4rpx 12rpx rgba(79,108,255,0.12);
}
.title{ 
  margin: 0 auto; 
  font-size: 38rpx; 
  font-weight: 800; 
  color:#1d2129; 
  letter-spacing: 0.8rpx;
  background: linear-gradient(90deg, #4f6cff, #6b86ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.save{
  position:absolute; 
  right:0;
  padding: 16rpx 32rpx; 
  border-radius: 40rpx;
  background: linear-gradient(90deg, #4f6cff 0%, #6b86ff 100%);
  color:#ffffff; 
  font-size: 28rpx; 
  font-weight: 700;
  box-shadow: 0 10rpx 28rpx rgba(79,108,255,0.2);
  transition: all 0.3s ease;
  border: 1rpx solid rgba(255, 255, 255, 0.2);
}
.save:hover {
  transform: translateY(-2rpx);
  box-shadow: 0 12rpx 32rpx rgba(79,108,255,0.25);
}
.save:active {
  transform: scale(0.96);
  box-shadow: 0 6rpx 16rpx rgba(79,108,255,0.2);
}
.save.disabled{ 
  opacity: .6; 
  pointer-events:none; 
  transform: none !important;
  box-shadow: 0 8rpx 20rpx rgba(79,108,255,0.1) !important;
}

/* 卡片通用样式 - 大幅优化质感 */
.card{
  background: linear-gradient(135deg, #ffffff 0%, #fefeff 100%); 
  border-radius: 28rpx; 
  padding: 32rpx; 
  margin-bottom: 24rpx;
  box-shadow: 0 10rpx 30rpx rgba(79,108,255,0.05);
  border: 1rpx solid #f0f3ff;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}
/* 卡片顶部装饰线 */
.card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 4rpx;
  background: linear-gradient(90deg, #4f6cff, #6b86ff, #8aa0ff);
  border-radius: 2rpx 2rpx 0 0;
}
.card:hover {
  transform: translateY(-4rpx);
  box-shadow: 0 14rpx 36rpx rgba(79,108,255,0.08);
  border-color: #e8ecff;
}
.card:active {
  transform: translateY(-2rpx);
  box-shadow: 0 8rpx 24rpx rgba(79,108,255,0.06);
}

/* 加载/错误状态样式优化 */
.muted{ 
  font-size: 26rpx; 
  color:#86909c; 
  text-align:center; 
  padding: 40rpx 0; 
  font-weight: 500; 
  line-height: 1.6;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}
/* 加载动画 */
.muted::before {
  content: '';
  width: 32rpx;
  height: 32rpx;
  border: 3rpx solid #e5e9ff;
  border-top: 3rpx solid #4f6cff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
.muted2{ 
  font-size: 22rpx; 
  color:#86909c; 
  line-height: 1.5;
}
.error{ 
  background: linear-gradient(135deg, #fff2f2 0%, #ffe8e8 100%); 
  border: 1rpx solid rgba(245,34,45,0.2); 
  color:#f5222d;
  padding: 32rpx;
  border-radius: 28rpx;
}
.retry{
  margin-top: 20rpx; 
  padding: 14rpx 24rpx; 
  display:inline-flex;
  border-radius: 20rpx; 
  background:#ffffff;
  border: 1rpx solid rgba(245,34,45,0.25);
  color:#f5222d; 
  font-size: 26rpx; 
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 4rpx 12rpx rgba(245,34,45,0.08);
}
.retry:hover {
  transform: translateY(-2rpx);
  box-shadow: 0 6rpx 16rpx rgba(245,34,45,0.12);
}
.retry:active {
  background:#fef0f0;
  transform: scale(0.96);
}

/* 课程信息卡片（保留扩展） */
.info-row{ 
  display:flex; 
  justify-content: space-between; 
  gap: 16rpx; 
  padding: 12rpx 0; 
  align-items: center;
}
.info-row:first-child {
  padding-top: 0;
}
.k{ 
  font-size: 26rpx; 
  color:#4e5969; 
  font-weight: 600; 
}
.v{ 
  font-size: 26rpx; 
  color:#1d2129; 
  font-weight: 700; 
  padding: 6rpx 16rpx;
  background: #f8f9ff;
  border-radius: 12rpx;
  min-width: 120rpx;
  text-align: right;
  border: 1rpx solid #e8ecff;
}

/* 编辑区域样式 - 核心美化 */
.sec-head{ 
  display:flex; 
  justify-content: space-between; 
  align-items: center; 
  margin-bottom: 20rpx; 
  padding-bottom: 12rpx;
  border-bottom: 1rpx solid #f0f5ff;
}
.sec-title{ 
  font-size: 32rpx; 
  font-weight: 800; 
  color:#1d2129; 
  letter-spacing: 0.5rpx;
  display: flex;
  align-items: center;
  gap: 10rpx;
}
/* 标题图标装饰 */
.sec-title::before {
  content: '';
  width: 8rpx;
  height: 24rpx;
  background: linear-gradient(180deg, #4f6cff, #6b86ff);
  border-radius: 4rpx;
}
.sec-sub{ 
  font-size: 22rpx; 
  color:#86909c; 
  font-weight: 500; 
  background: #f5f7fa;
  padding: 6rpx 16rpx;
  border-radius: 16rpx;
  border: 1rpx solid #e8ecff;
}
.ta{
  width: 100%;
  min-height: 280rpx;
  background: linear-gradient(135deg, #f8f9ff 0%, #f5f7ff 100%);
  border: 1rpx solid #e8ecff;
  border-radius: 20rpx;
  padding: 24rpx;
  font-size: 28rpx;
  color:#1d2129;
  font-weight: 500;
  line-height: 1.8;
  box-sizing: border-box;
  transition: all 0.3s ease;
  resize: none;
  box-shadow: inset 0 2rpx 8rpx rgba(79,108,255,0.03);
}
.ta:focus {
  border-color: #4f6cff;
  background: #ffffff;
  box-shadow: 0 0 0 6rpx rgba(79,108,255,0.08), inset 0 2rpx 8rpx rgba(79,108,255,0.05);
  outline: none;
  transform: translateY(-2rpx);
}
.sec-foot{ 
  display:flex; 
  justify-content: space-between; 
  align-items:center; 
  margin-top: 20rpx; 
  flex-wrap: wrap;
  gap: 16rpx;
  padding-top: 12rpx;
  border-top: 1rpx solid #f0f5ff;
}
.count{ 
  font-size: 24rpx; 
  color:#86909c; 
  font-weight: 600; 
  padding: 8rpx 16rpx;
  background: #f8f9ff;
  border-radius: 16rpx;
  border: 1rpx solid #e8ecff;
}
.mini-btn{
  padding: 14rpx 24rpx; 
  border-radius: 20rpx;
  background: linear-gradient(135deg, #4f6cff 0%, #6b86ff 100%); 
  border: 1rpx solid rgba(255, 255, 255, 0.2);
  color:#ffffff; 
  font-size: 24rpx; 
  font-weight: 700;
  transition: all 0.3s ease;
  box-shadow: 0 6rpx 16rpx rgba(79,108,255,0.15);
}
.mini-btn:hover {
  transform: translateY(-2rpx);
  box-shadow: 0 8rpx 20rpx rgba(79,108,255,0.2);
}
.mini-btn:active {
  transform: scale(0.95);
  box-shadow: 0 4rpx 12rpx rgba(79,108,255,0.15);
}
.mini-btn.ghost{
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f3ff 100%); 
  border: 1rpx solid #e8ecff; 
  color:#4f6cff;
  box-shadow: 0 6rpx 16rpx rgba(79,108,255,0.08);
}
.mini-btn.ghost:hover {
  background: linear-gradient(135deg, #f0f3ff 0%, #e8ecff 100%);
  box-shadow: 0 8rpx 20rpx rgba(79,108,255,0.12);
}
.mini-btn.ghost:active {
  background: #e8ecff;
}

/* 底部操作按钮 - 极致美化 */
.bottom-actions{ 
  display:flex; 
  gap: 20rpx; 
  margin-top: 32rpx; 
  padding-top: 20rpx;
  padding-bottom: 40rpx;
}
.btn{
  flex: 1; 
  height: 96rpx; 
  border-radius: 48rpx;
  display:flex; 
  align-items:center; 
  justify-content:center;
  font-size: 30rpx; 
  font-weight: 700;
  box-shadow: 0 10rpx 28rpx rgba(0,0,0,0.06);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}
/* 按钮流光效果 */
.btn.primary::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0) 100%);
  transition: left 0.8s ease;
}
.btn.primary:hover::after {
  left: 100%;
}
.btn:hover {
  transform: translateY(-4rpx);
  box-shadow: 0 14rpx 32rpx rgba(0,0,0,0.08);
}
.btn:active {
  transform: scale(0.97);
  box-shadow: 0 6rpx 16rpx rgba(0,0,0,0.08);
}
.primary{ 
  background: linear-gradient(90deg, #4f6cff 0%, #6b86ff 100%); 
  color:#ffffff; 
  border: 1rpx solid rgba(255, 255, 255, 0.2);
}
.outline{ 
  background: linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%); 
  color:#4f6cff; 
  border: 2rpx solid #4f6cff; 
}
.btn.disabled{ 
  opacity: 0.5; 
  pointer-events:none; 
  transform: none !important;
  box-shadow: 0 8rpx 20rpx rgba(0,0,0,0.03) !important;
}

/* 适配小屏设备 - 优化响应式 */
@media (max-width: 750rpx) {
  .page {
    padding: 16rpx;
  }
  .card {
    padding: 24rpx;
  }
  .ta {
    min-height: 220rpx;
    font-size: 26rpx;
  }
  .btn {
    height: 88rpx;
    font-size: 28rpx;
  }
  .header {
    margin-bottom: 24rpx;
  }
  .back {
    width: 64rpx;
    height: 64rpx;
  }
  .title {
    font-size: 34rpx;
  }
}

/* 全局动画定义 */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10rpx); }
  to { opacity: 1; transform: translateY(0); }
}
.content {
  animation: fadeIn 0.4s ease-out forwards;
}
.card {
  animation: fadeIn 0.3s ease-out forwards;
}
.card:nth-child(1) { animation-delay: 0.05s; }
.card:nth-child(2) { animation-delay: 0.1s; }
.card:nth-child(3) { animation-delay: 0.15s; }
.card:nth-child(4) { animation-delay: 0.2s; }
</style>