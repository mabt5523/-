<template>
  <view class="page">
    <!-- 顶部 -->
    <view class="header">


      <view class="title-wrap">
        <text class="title">{{ course.courseName || '课程简介' }}</text>
        <view class="course-tag">{{ formatStatus(course.status) }}</view>
      </view>
    </view>

    <!-- 课程内容（目标 / 学习方式 / 课程结构） -->
    <view class="content-container">
      <view class="section-card animate">
        <view class="section-header">
          <view class="section-icon goal-icon">🎯</view>
          <text class="section-title">课程目标</text>
        </view>
        <view class="section-content">
          <view v-if="!course.goals || !course.goals.length" class="muted">暂无</view>
          <view v-else v-for="(item, index) in course.goals" :key="index" class="item">
            • {{ item }}
          </view>
        </view>
      </view>

      <view class="section-card animate delay1">
        <view class="section-header">
          <view class="section-icon way-icon">📚</view>
          <text class="section-title">本节学习方式</text>
        </view>
        <view class="section-content">
          <view v-if="!course.studyWays || !course.studyWays.length" class="muted">暂无</view>
          <view v-else v-for="(item, index) in course.studyWays" :key="index" class="item">
            • {{ item }}
          </view>
        </view>
      </view>

      <view class="section-card animate delay2">
        <view class="section-header">
          <view class="section-icon struct-icon">🧩</view>
          <text class="section-title">课程结构</text>
        </view>
        <view class="section-content">
          <view v-if="!course.structure || !course.structure.length" class="muted">暂无</view>
          <view v-else v-for="(item, index) in course.structure" :key="index" class="item">
            • {{ item }}
          </view>
        </view>
      </view>
    </view>

    <!-- 操作按钮（教师端） -->
    <view class="actions">
      <view class="btn primary" @click="goAIAssistant">
        <text class="btn-icon">🤖</text>
        <text class="btn-text">AI伴教</text>
      </view>

      <view class="btn outline" @click="goScript">
        <text class="btn-icon">📜</text>
        <text class="btn-text">课程脚本</text>
      </view>

      <view class="btn outline" @click="goExercises">
        <text class="btn-icon">🧠</text>
        <text class="btn-text">课后习题</text>
      </view>

      <view class="btn danger" @click="openStatusModal">
        <text class="btn-icon">⚙️</text>
        <text class="btn-text">修改状态</text>
      </view>

      <!-- ✅ 新增：学生学习总结 -->
      <view class="btn outline wide" @click="openSummaryModal">
        <text class="btn-icon">📋</text>
        <text class="btn-text">学生总结</text>
      </view>
    </view>

    <!-- 状态修改弹窗 -->
    <view v-if="statusModalOpen" class="modal-mask" @click="statusModalOpen=false">
      <view class="modal" @click.stop>
        <view class="modal-title">修改课程状态</view>
        <view class="modal-sub">当前：{{ formatStatus(course.status) }}</view>

        <view class="status-list">
          <view
            v-for="s in statusOptions"
            :key="s.value"
            class="status-item"
            :class="{ active: s.value === nextStatus }"
            @click="nextStatus = s.value"
          >
            {{ s.label }}
          </view>
        </view>

        <view class="row">
          <view class="btn ghost" @click="statusModalOpen=false">取消</view>
          <view class="btn" @click="saveStatus">保存</view>
        </view>
      </view>
    </view>

    <!-- ✅ 学生总结弹窗（90%高度） -->
    <view v-if="summaryModalOpen" class="summary-mask" @click="closeSummaryModal">
      <view class="summary-modal" @click.stop>
        <view class="summary-header">
          <text class="summary-title">学生学习总结</text>
          <view class="summary-close" @click="closeSummaryModal">✕</view>
        </view>

        <!-- 筛选区 -->
        <view class="summary-filters">
          <view class="filter-item">
            <text class="filter-label">班级</text>
          
            <!-- 点击展开/收起 -->
            <view class="picker-box" @click.stop="toggleClassDropdown">
              <text class="picker-text">{{ classOptions[classIndex] || '全部' }}</text>
              <text class="picker-arrow">▾</text>
            </view>
          
            <!-- 下拉面板（弹窗内部） -->
            <view v-if="classDropdownOpen" class="class-dropdown">
              <view
                v-for="(c, idx) in classOptions"
                :key="c + '_' + idx"
                class="class-option"
                :class="{ active: idx === classIndex }"
                @click.stop="pickClass(idx)"
              >
                {{ c }}
              </view>
            </view>
          </view>

          <view class="filter-item flex1">
            <text class="filter-label">搜索</text>
            <input
              v-model="summaryKeyword"
              class="search-input"
              placeholder="输入学生姓名/学号"
              type="text"
              confirm-type="search"
            />
          </view>

          <view class="refresh-btn" :class="{ disabled: summaryLoading }" @click="fetchTeacherSummaryList">
            {{ summaryLoading ? '加载中…' : '刷新' }}
          </view>
        </view>

        <!-- 列表区 -->
        <view v-if="summaryLoading" class="summary-loading">
          <view class="loading-spinner"></view>
          <text class="loading-text">正在加载学生总结…</text>
        </view>

        <scroll-view v-else scroll-y class="summary-list">
          <view v-if="filteredTeacherSummaries.length === 0" class="summary-empty">
            <text class="summary-empty-title">暂无数据</text>
            <text class="summary-empty-sub">请确认该课程已生成总结评价</text>
          </view>

          <view
            v-else
            class="summary-card"
            v-for="(item, idx) in filteredTeacherSummaries"
            :key="'ts_' + (item.studentId || idx)"
            @click="openSummaryDetail(item)"
          >
            <view class="summary-card-top">
              <view class="left">
                <text class="student-name">{{ item.studentName || '同学' }}</text>
                <text class="student-sub">学号：{{ item.username || '-' }} ｜ 班级：{{ item.clazz ?? '-' }}</text>
              </view>
              <text class="update-time">{{ formatTime(item.updateTime) }}</text>
            </view>

            <text class="summary-preview">{{ makePreview(item.teacherSummary) }}</text>

            <view class="meta-row" v-if="item.metricsParsed">
              <text class="pill">预习 {{ item.metricsParsed.turns.preview }}</text>
              <text class="pill">复习 {{ item.metricsParsed.turns.review }}</text>
              <text class="pill">拔高 {{ item.metricsParsed.turns.improve }}</text>
              <text class="pill">总计 {{ item.metricsParsed.turns.total }}</text>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- ✅ 总结详情弹窗（同样 90%） -->
    <view v-if="detailModalOpen" class="summary-mask" @click="closeDetailModal">
      <view class="detail-modal" @click.stop>
        <view class="summary-header">
          <text class="summary-title">总结详情</text>
          <view class="summary-close" @click="closeDetailModal">✕</view>
        </view>

        <view class="detail-top">
          <text class="detail-student">{{ currentDetail.studentName || '同学' }}</text>
          <text class="detail-sub">
            学号：{{ currentDetail.username || '-' }} ｜ 班级：{{ currentDetail.clazz ?? '-' }}
          </text>
          <text class="detail-time">{{ formatTime(currentDetail.updateTime) }}</text>
        </view>

        <view class="metrics-box" v-if="currentDetail.metricsParsed">
          <view class="metrics-row">
            <text class="metrics-title">互动轮次</text>
            <text class="metrics-text">
              预习 {{ currentDetail.metricsParsed.turns.preview }} ｜复习 {{ currentDetail.metricsParsed.turns.review }} ｜拔高 {{ currentDetail.metricsParsed.turns.improve }} ｜总计 {{ currentDetail.metricsParsed.turns.total }}
            </text>
          </view>
          <view class="metrics-row">
            <text class="metrics-title">正确率</text>
            <text class="metrics-text">
              预习 {{ toPct(currentDetail.metricsParsed.acc.preview) }} ｜复习 {{ toPct(currentDetail.metricsParsed.acc.review) }} ｜拔高 {{ toPct(currentDetail.metricsParsed.acc.improve) }}
            </text>
          </view>
        </view>

        <scroll-view scroll-y class="detail-scroll">
          <text class="detail-text">{{ currentDetail.teacherSummary || '暂无内容' }}</text>
        </scroll-view>

        <view class="detail-actions">
          <view class="btn primary" @click="closeDetailModal">关闭</view>
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
		classDropdownOpen: false,
      courseId: null,
      course: {
        courseName: '',
        goals: [],
        studyWays: [],
        structure: [],
        subject: '',
        grade: '',
        status: 'draft'
      },

      statusModalOpen: false,
      nextStatus: 'draft',
      saving: false,

      statusOptions: [
        { label: '未发布', value: 'draft' },
        { label: '已发布（未上课）', value: 'published' },
        { label: '已发布（已上课）', value: 'finished' }
      ],

      // ✅ 新增：学生总结相关
      summaryModalOpen: false,
      summaryLoading: false,
      teacherSummaries: [],        // 原始数据
      summaryKeyword: '',          // 搜索关键字
      classOptions: ['全部'],      // picker 展示数组
      classIndex: 0,               // picker index
      pickedClass: '全部',         // 当前班级

      // 详情弹窗
      detailModalOpen: false,
      currentDetail: {}
    }
  },

  onLoad(options) {
    this.courseId = options.id
    if (options.status) this.course.status = options.status
    this.loadCourseDetail()
  },

  computed: {
    // ✅ 根据班级+关键词过滤
    filteredTeacherSummaries() {
      const list = Array.isArray(this.teacherSummaries) ? [...this.teacherSummaries] : []
      const cls = this.pickedClass
      const kw = String(this.summaryKeyword || '').trim().toLowerCase()

      return list.filter(x => {
        const okClass = (cls === '全部') ? true : String(x.clazz ?? '') === String(cls)
        if (!okClass) return false

        if (!kw) return true
        const name = String(x.studentName || '').toLowerCase()
        const username = String(x.username || '').toLowerCase()
        return name.includes(kw) || username.includes(kw)
      }).sort((a, b) => {
        // updateTime 倒序
        const ta = new Date(a.updateTime || 0).getTime()
        const tb = new Date(b.updateTime || 0).getTime()
        return tb - ta
      })
    }
  },

  methods: {
	toggleClassDropdown() {
	    this.classDropdownOpen = !this.classDropdownOpen
	  },
	
	  pickClass(idx) {
	    this.classIndex = idx
	    this.classDropdownOpen = false
	
	    // ✅ 你原来 onClassPick 里做的事情（过滤/请求）放这里
	    // 如果你还想复用原函数，也可以：
	    // this.onClassPick({ detail: { value: idx } })
	    this.applyFiltersAndRefresh && this.applyFiltersAndRefresh()
	  },
    goBack() {
      uni.navigateBack({ delta: 1 })
    },

    formatStatus(status) {
      if (status === 'draft') return '未发布'
      if (status === 'published') return '已发布（未上课）'
      if (status === 'finished') return '已发布（已上课）'
      return '未知状态'
    },

    async loadCourseDetail() {
      if (!this.courseId) return

      try {
        const res = await request({
          url: `/api/student/course/${this.courseId}/detail`,
          method: 'GET'
        })
        console.log('detail res =>', JSON.stringify(res))

        const detail = res?.data || res?.course || res?.result || res || {}
        this.course = { ...this.course, ...detail }
        this.nextStatus = this.course.status || 'draft'
      } catch (e) {
        console.error('loadCourseDetail failed', e)
        uni.showToast({ title: '加载失败', icon: 'none' })
      }
    },

    // ===== 4 个入口 =====
    goAIAssistant() {
      if (!this.courseId) {
        uni.showToast({ title: '缺少课程ID', icon: 'none' })
        return
      }
      uni.navigateTo({
        url: `/pages/teacher/ai_assistant?courseId=${this.courseId}&courseName=${encodeURIComponent(this.course.courseName || '')}`
      })
    },

    goScript() {
      uni.navigateTo({ url: `/pages/teacher/course_script?courseId=${this.courseId}` })
    },

    goExercises() {
      uni.navigateTo({ url: `/pages/teacher/course_exercises?courseId=${this.courseId}` })
    },

    // ===== 状态修改 =====
    openStatusModal() {
      this.nextStatus = this.course.status || 'draft'
      this.statusModalOpen = true
    },

    async saveStatus() {
      if (this.saving) return
      if (!this.courseId) return

      this.saving = true
      try {
        const mapToEnum = {
          draft: 'draft',
          published: 'published',
          finished: 'finished'
        }
        const statusEnum = mapToEnum[this.nextStatus] || 'DRAFT'

        const res = await request({
          url: `/api/teacher/course/${this.courseId}/status`,
          method: 'PUT',
          data: { status: statusEnum }
        })

        console.log('saveStatus ok:', res)
        this.course.status = this.nextStatus
        this.statusModalOpen = false
        uni.showToast({ title: '已更新状态', icon: 'none' })
      } catch (e) {
        console.error('saveStatus failed raw:', e)
        const msg =
          e?.data?.message ||
          e?.data?.error ||
          e?.errMsg ||
          e?.message ||
          `更新失败(${e?.statusCode || ''})`
        uni.showToast({ title: msg, icon: 'none' })
      } finally {
        this.saving = false
      }
    },

    // ============================
    // ✅ 学生总结：弹窗 + 拉数据
    // ============================
    openSummaryModal() {
      this.summaryModalOpen = true
      // 第一次打开就拉一次
      if (!this.teacherSummaries.length) {
        this.fetchTeacherSummaryList()
      }
    },

    closeSummaryModal() {
      this.summaryModalOpen = false
    },

    onClassPick(e) {
      const i = Number(e?.detail?.value ?? 0)
      this.classIndex = i
      this.pickedClass = this.classOptions[i] || '全部'
    },

    async fetchTeacherSummaryList() {
      if (this.summaryLoading) return
      if (!this.courseId) {
        uni.showToast({ title: '缺少课程ID', icon: 'none' })
        return
      }

      this.summaryLoading = true
      try {
        const res = await this.request8081({
          path: `/api/teacher/course/summary/list?courseId=${encodeURIComponent(this.courseId)}`,
          method: 'GET'
        })

        const u = this.unwrap(res)
        const arr = Array.isArray(u.data) ? u.data : []

        this.teacherSummaries = arr.map(x => ({
          studentId: x.studentId,
          username: x.username,
          studentName: x.studentName,
          clazz: x.clazz,
          status: x.status,
          missingParts: x.missingParts,
          teacherSummary: x.teacherSummary || '',
          updateTime: x.updateTime,
          metricsJson: x.metricsJson,
          metricsParsed: this.parseMetrics(x.metricsJson)
        }))

        // 生成班级下拉选项
        const classes = this.teacherSummaries
          .map(s => s.clazz)
          .filter(v => v !== null && v !== undefined && String(v).trim() !== '')
          .map(v => String(v))
        const uniq = Array.from(new Set(classes)).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))
        this.classOptions = ['全部', ...uniq]

        // 如果当前选的班级不在列表里，重置
        if (!this.classOptions.includes(this.pickedClass)) {
          this.pickedClass = '全部'
          this.classIndex = 0
        } else {
          this.classIndex = this.classOptions.indexOf(this.pickedClass)
        }

      } catch (e) {
        console.error('[teacher summary] failed:', e)
        const msg = e?.data?.msg || e?.message || '获取学生总结失败'
        uni.showToast({ title: msg, icon: 'none' })
        this.teacherSummaries = []
        this.classOptions = ['全部']
        this.classIndex = 0
        this.pickedClass = '全部'
      } finally {
        this.summaryLoading = false
      }
    },

    openSummaryDetail(item) {
      this.currentDetail = item || {}
      this.detailModalOpen = true
    },

    closeDetailModal() {
      this.detailModalOpen = false
      this.currentDetail = {}
    },

    // ============================
    // ✅ 8081 请求封装（带 token）
    // ============================
    getBase8081() {

      return 'http://81.70.62.177:8081'
    },

    getBearerToken() {
      const token = String(uni.getStorageSync('token') || '').trim()
      if (!token) return ''
      return token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`
    },

    request8081({ path, method = 'GET', data = null }) {
      const base = this.getBase8081()
      const bearer = this.getBearerToken()
      const url = base + path

      return new Promise((resolve, reject) => {
        uni.request({
          url,
          method,
          data,
          timeout: 60000,
          header: {
            ...(bearer ? { Authorization: bearer } : {}),
            'Content-Type': 'application/json'
          },
          success: (res) => {
            if (res.statusCode >= 200 && res.statusCode < 300) resolve(res.data || {})
            else reject(res)
          },
          fail: (err) => reject(err)
        })
      })
    },

    unwrap(res) {
      const payload =
        (res && typeof res === 'object' && ('code' in res || 'msg' in res || 'data' in res))
          ? res
          : (res && res.data && (('code' in res.data) || ('msg' in res.data) || ('data' in res.data)))
            ? res.data
            : {}
      return {
        code: payload.code,
        msg: payload.msg ?? payload.message ?? '',
        data: payload.data ?? null,
        raw: payload
      }
    },

    // ============================
    // ✅ metrics 解析 + UI 小工具
    // ============================
    parseMetrics(mj) {
      if (!mj) return null
      try {
        const obj = typeof mj === 'string' ? JSON.parse(mj) : mj
        const turns = obj?.engagement || {}
        const perf = obj?.performance || {}
        return {
          turns: {
            preview: Number(turns.student_turns_preview ?? 0),
            review: Number(turns.student_turns_review ?? 0),
            improve: Number(turns.student_turns_improve ?? 0),
            total: Number(turns.total_student_turns ?? 0)
          },
          acc: {
            preview: Number(perf.accuracy_preview ?? 0),
            review: Number(perf.accuracy_review ?? 0),
            improve: Number(perf.accuracy_improve ?? 0)
          }
        }
      } catch (e) {
        return null
      }
    },

    makePreview(text) {
      const s = String(text || '').trim()
      if (!s) return '暂无评价内容'
      return s.length > 72 ? (s.slice(0, 72) + '…') : s
    },

    formatTime(t) {
      if (!t) return ''
      return String(t).replace('T', ' ').slice(0, 16)
    },

    toPct(v) {
      const n = Number(v)
      if (!isFinite(n)) return '--'
      return Math.round(n * 100) + '%'
    }
  }
}
</script>

<style scoped>
/* 基础布局 */
/* 基础布局 */
page {
  background: linear-gradient(180deg, #f5f7ff 0%, #e6edff 100%);
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", sans-serif;
}
.page {
  padding: 32rpx 28rpx 220rpx; /* ✅ 底部按钮更多，稍微加高 */
  min-height: 100vh;
}

/* =========================
   顶部 Header（修正版）
   ========================= */
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 99;

  /* 关键：高度包含状态栏 */
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

/* =========================
   标题区域（上移一点）
   ========================= */
.title-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;

  /* ⭐ 这里控制上移程度 */
  transform: translateY(-12rpx);
}

/* =========================
   内容区（防止被 header 遮挡）
   ========================= */
.content-container {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  margin-bottom: 40rpx;

  /* 高度 = header高度(110rpx) + 间距20rpx + 状态栏高度 */
  margin-top: calc(130rpx);
}



.back {
  position: absolute;
  left: 0;
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


.title {
  font-size: 38rpx;
  font-weight: 700;
  color: #1d2129;
  text-align:center;
  background: linear-gradient(90deg, #4f6cff, #6b86ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.course-tag {
  font-size: 22rpx;
  color: #4f6cff;
  background: rgba(79, 108, 255, 0.1);
  padding: 6rpx 18rpx;
  border-radius: 50rpx;
  font-weight: 600;
  border: 1rpx solid rgba(79, 108, 255, 0.2);
}


.section-card{
  background:#ffffff;
  border-radius:24rpx;
  padding: 32rpx;
  box-shadow: 0 8rpx 28rpx rgba(79, 108, 255, 0.1);
  border: 1rpx solid rgba(79, 108, 255, 0.1);
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}
.section-header{
  display:flex;
  align-items:center;
  gap: 16rpx;
  margin-bottom: 20rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid rgba(79, 108, 255, 0.08);
}
.section-icon{
  font-size:32rpx;
  width:60rpx;
  height:60rpx;
  border-radius:50%;
  display:flex;
  align-items:center;
  justify-content:center;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.05);
}
.goal-icon{ background: linear-gradient(135deg, #fff1f0 0%, #ffe4e1 100%); color: #e87a61; }
.way-icon{ background: linear-gradient(135deg, #e8f4f8 0%, #d1e7dd 100%); color: #4299e1; }
.struct-icon{ background: linear-gradient(135deg, #f0f8fb 0%, #e0f2fe 100%); color: #38bdf8; }
.section-title{ font-size: 30rpx; font-weight: 700; color:#1d2129; }
.item{ font-size: 26rpx; color:#4e5969; line-height: 1.8; padding: 4rpx 0; }
.muted{ font-size: 26rpx; color:#94a3b8; text-align: center; padding: 20rpx 0; }

/* 底部操作按钮 */
.actions{
  position: fixed;
  bottom: 40rpx;
  left: 28rpx;
  right: 28rpx;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;

  /* ✅ 关键：降低底部按钮层级，避免遮挡弹窗/下拉 */
  z-index: 1;
}
.btn {
  height: 90rpx;
  border-radius: 20rpx;
  font-size: 26rpx;
  display:flex;
  align-items:center;
  justify-content:center;
  gap: 8rpx;
  box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.08);
  font-weight: 700;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}
.btn:active{ transform: scale(0.96); box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.08); }
.btn-icon{ font-size: 28rpx; }
.primary{ background: linear-gradient(90deg, #4f6cff 0%, #6b86ff 100%); color:#fff; }
.outline{ border: 2rpx solid #4f6cff; color:#4f6cff; background:#fff; }
.danger{ background: linear-gradient(90deg, #ff7a45 0%, #ff9566 100%); color:#fff; }
.ghost{ background:#fff; color:#64748b; border:1rpx solid #e5e7eb; box-shadow:none; }
.wide{ grid-column: 1 / span 2; } /* ✅ 新增按钮占两列 */

/* 状态修改弹窗 - 全面美化版 */
.modal-mask{
  position: fixed;
  top:0; left:0; right:0; bottom:0;
  background: rgba(0,0,0,0.6);
  display:flex;
  align-items:center;
  justify-content:center;
  z-index: 999;
  padding: 40rpx;
  backdrop-filter: blur(12rpx);
  /* 弹窗入场背景渐变 */
  animation: modalBgFade 0.3s ease forwards;
}

/* 背景渐入动画 */
@keyframes modalBgFade {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal{
  width: 100%;
  max-width: 640rpx;
  background:#ffffff;
  border-radius: 32rpx;
  padding: 40rpx 36rpx;
  box-shadow: 0 20rpx 60rpx rgba(0,0,0,0.18);
  border: 1rpx solid rgba(255, 255, 255, 0.8);
  position: relative;
  overflow: hidden;
  /* 弹窗主体入场动画 */
  animation: modalSlideUp 0.4s ease-out forwards;
  /* 增加内阴影提升质感 */
  box-shadow: 
    0 20rpx 60rpx rgba(0,0,0,0.18),
    inset 0 1rpx 0 rgba(255,255,255,0.9);
}

/* 弹窗上滑入场动画 */
@keyframes modalSlideUp {
  from { 
    opacity: 0; 
    transform: translateY(30rpx) scale(0.98); 
  }
  to { 
    opacity: 1; 
    transform: translateY(0) scale(1); 
  }
}

/* 弹窗顶部装饰线 */
.modal::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 6rpx;
  background: linear-gradient(90deg, #4f6cff, #6b86ff, #8a9fff);
  border-radius: 32rpx 32rpx 0 0;
}

.modal-title{ 
  font-size: 36rpx; 
  font-weight: 800; 
  color:#1d2129; 
  margin-bottom: 8rpx;
  position: relative;
  padding-bottom: 8rpx;
}

/* 标题下划线装饰 */
.modal-title::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: 0;
  width: 80rpx;
  height: 4rpx;
  background: linear-gradient(90deg, #4f6cff, #6b86ff);
  border-radius: 2rpx;
}

.modal-sub{ 
  font-size: 26rpx; 
  color:#86909c; 
  margin: 12rpx 0 32rpx; 
  padding-bottom: 20rpx; 
  border-bottom: 1rpx solid #f0f2f5;
  line-height: 1.5;
}

.status-list{ 
  display:flex; 
  flex-wrap:wrap; 
  gap: 18rpx; 
  margin-bottom: 36rpx; 
}

.status-item{
  padding: 18rpx 28rpx;
  border-radius: 24rpx;
  background:#f8fafc;
  border: 1rpx solid #e8f0ff;
  color:#334155;
  font-size: 28rpx;
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

/* 状态项悬浮效果 */
.status-item:hover {
  transform: translateY(-2rpx);
  box-shadow: 0 8rpx 20rpx rgba(79, 108, 255, 0.08);
  border-color: #d1dfff;
}

.status-item.active{
  background: linear-gradient(135deg, #e5e9ff 0%, #f0f4ff 100%);
  border-color:#4f6cff;
  color:#4f6cff;
  font-weight: 800;
  box-shadow: 0 6rpx 16rpx rgba(79, 108, 255, 0.12);
  /* 选中态缩放效果 */
  transform: scale(1.02);
}

/* 选中态右侧对勾装饰 */
.status-item.active::after {
  content: '✓';
  margin-left: 8rpx;
  font-size: 24rpx;
  color: #4f6cff;
}

.row{ 
  display:flex; 
  gap: 20rpx; 
  margin-top: 12rpx; 
}

/* 弹窗按钮美化 */
.row .btn {
  height: 84rpx;
  border-radius: 20rpx;
  font-size: 28rpx;
  flex: 1;
}

.row .btn.ghost {
  background: #f8f9fa;
  border-color: #eef2ff;
  color: #64748b;
}

.row .btn.ghost:hover {
  background: #f0f2f5;
  border-color: #d1dfff;
}

/* =========================
   ✅ 学生总结弹窗（90%）
   ========================= */
.summary-mask{
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.55);

  /* ✅ 关键：让总结弹窗层级高于所有 fixed（尤其底部 actions） */
  z-index: 2000;

  display:flex;
  align-items:center;
  justify-content:center;
  padding: 28rpx;
  backdrop-filter: blur(10rpx);
}
.summary-modal{
  width: 100%;
  height: 90vh;             /* ✅ 占整体 90% */
  background: #ffffff;
  border-radius: 28rpx;
  padding: 26rpx;
  box-shadow: 0 16rpx 48rpx rgba(0,0,0,0.18);
  display:flex;
  flex-direction: column;

  /* ✅ 关键：防止 picker 下拉被内部层级/裁剪影响 */
  position: relative;
  z-index: 20001;
  overflow: visible;        /* ✅ 不裁剪 picker 区域 */

}
.detail-modal{
  width: 100%;
  height: 90vh;
  background: #ffffff;
  border-radius: 28rpx;
  padding: 26rpx;
  box-shadow: 0 16rpx 48rpx rgba(0,0,0,0.18);
  display:flex;
  flex-direction: column;

  /* ✅ 同步：避免内部裁剪 */
  position: relative;
  z-index: 20001;
  overflow: visible;
}

.summary-header{
  display:flex;
  align-items:center;
  justify-content: space-between;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #eef2ff;
}
.summary-title{
  font-size: 32rpx;
  font-weight: 800;
  color:#1d2129;
}
.summary-close{
  width: 64rpx;
  height: 64rpx;
  border-radius: 18rpx;
  background:#f2f5ff;
  color:#4f6cff;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size: 26rpx;
}

.summary-filters{
  display:flex;
  gap: 16rpx;
  padding: 18rpx 0 14rpx;
  align-items:flex-end;

  /* ✅ 关键：filters 置顶，避免被列表/scroll 覆盖 */
  position: relative;
  z-index: 20002;
}
.filter-item{ width: 220rpx; position: relative; /* ✅ dropdown 面板以它为参照 */}
.filter-item.flex1{ flex: 1; width: auto; }
.filter-label{
  font-size: 22rpx;
  color:#94a3b8;
  display:block;
  margin-bottom: 8rpx;
}
.picker-box{
  background:#f8f9ff;
  border: 1rpx solid #e5e9ff;
  border-radius: 18rpx;
  padding: 16rpx 18rpx;
  display:flex;
  align-items:center;
  justify-content: space-between;

  /* ✅ 关键：picker 盒子层级最高，避免被任何东西盖住 */
  position: relative;
  z-index: 120003;
}
.picker-text{ font-size: 26rpx; color:#1d2129; }
.picker-arrow{ font-size: 22rpx; color:#94a3b8; }

.search-input{
  background:#f8f9ff;
  border: 1rpx solid #e5e9ff;
  border-radius: 18rpx;
  padding: 16rpx 18rpx;
  font-size: 26rpx;
  color:#1d2129;
}
.refresh-btn{
  padding: 16rpx 18rpx;
  border-radius: 18rpx;
  background: linear-gradient(90deg, #4f6cff 0%, #6b86ff 100%);
  color:#fff;
  font-size: 24rpx;
  font-weight: 700;
}
.refresh-btn.disabled{ opacity: .6; }

.summary-loading{
  flex: 1;
  display:flex;
  flex-direction: column;
  align-items:center;
  justify-content:center;
  gap: 16rpx;
}
.loading-spinner{
  width: 52rpx;
  height: 52rpx;
  border: 4rpx solid #e5e9ff;
  border-top: 4rpx solid #4f6cff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
.loading-text{ font-size: 26rpx; color:#86909c; }
@keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }

.summary-list{ flex: 1; }
.summary-empty{
  padding: 80rpx 20rpx;
  text-align:center;
}
.summary-empty-title{
  font-size: 28rpx;
  font-weight: 700;
  color:#64748b;
}
.summary-empty-sub{
  margin-top: 10rpx;
  font-size: 24rpx;
  color:#94a3b8;
}

.summary-card{
  background:#fff;
  border: 1rpx solid #eef2ff;
  border-radius: 22rpx;
  padding: 22rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 6rpx 18rpx rgba(79,108,255,0.06);
}
.summary-card-top{
  display:flex;
  justify-content: space-between;
  gap: 16rpx;
}
.summary-card-top .left{ flex: 1; }
.student-name{
  font-size: 28rpx;
  font-weight: 800;
  color:#1d2129;
}
.student-sub{
  display:block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color:#94a3b8;
}
.update-time{
  font-size: 22rpx;
  color:#94a3b8;
  flex-shrink: 0;
}
.summary-preview{
  margin-top: 14rpx;
  font-size: 26rpx;
  color:#4e5969;
  line-height: 1.7;
  white-space: pre-wrap;
  display:-webkit-box;
  -webkit-line-clamp:3;
  -webkit-box-orient:vertical;
  overflow:hidden;
}
.meta-row{
  margin-top: 12rpx;
  display:flex;
  flex-wrap: wrap;
  gap: 10rpx;
}
.pill{
  font-size: 22rpx;
  color:#4f6cff;
  background:#eef2ff;
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
}

/* 详情弹窗内容 */
.detail-top{
  padding: 18rpx 0 14rpx;
}
.detail-student{
  font-size: 30rpx;
  font-weight: 900;
  color:#1d2129;
}
.detail-sub{
  display:block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color:#94a3b8;
}
.detail-time{
  display:block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color:#94a3b8;
}

.metrics-box{
  margin-top: 8rpx;
  background:#f8f9ff;
  border: 1rpx solid #e5e9ff;
  border-radius: 18rpx;
  padding: 18rpx;
}
.metrics-row{ margin-bottom: 12rpx; }
.metrics-row:last-child{ margin-bottom: 0; }
.metrics-title{
  font-size: 24rpx;
  font-weight: 800;
  color:#1d2129;
  display:block;
  margin-bottom: 6rpx;
}
.metrics-text{
  font-size: 24rpx;
  color:#4e5969;
  line-height: 1.6;
}
.detail-scroll{
  flex: 1;
  margin-top: 14rpx;
  border-radius: 18rpx;
  border: 1rpx solid #eef2ff;
  padding: 18rpx;
}
.detail-text{
  font-size: 26rpx;
  color:#1d2129;
  line-height: 1.75;
  white-space: pre-wrap;
}

.detail-actions{
  margin-top: 16rpx;
}
/* 班级下拉面板：在弹窗内展开 */
.class-dropdown{
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 10rpx);
  background: #fff;
  border: 1rpx solid #e5e9ff;
  border-radius: 18rpx;
  box-shadow: 0 16rpx 40rpx rgba(0,0,0,0.12);
  z-index: 50;         /* ✅ 只要比弹窗内部其它元素高即可 */
  max-height: 520rpx;
  overflow-y: auto;
}

/* 下拉项 */
.class-option{
  padding: 18rpx 18rpx;
  font-size: 26rpx;
  color:#1d2129;
  border-bottom: 1rpx solid #f1f5ff;
}
.class-option:last-child{ border-bottom: none; }

.class-option:active{
  background:#f5f7ff;
}

/* 选中态 */
.class-option.active{
  color:#4f6cff;
  font-weight: 700;
  background:#eef2ff;
}
</style>