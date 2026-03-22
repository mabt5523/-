<template>
  <view class="page">
    <!-- 标题 -->
    <view class="header">

      <text class="title">学生分析</text>

      <!-- ✅ 右上角：作品广场 -->
      <view class="work-btn" @click="goWorkSquare">
        作品广场
      </view>
    </view>

    <!-- 时间范围 Tabs -->
    <view class="tabs card">
      <view class="tab-row">
        <view
          v-for="t in tabList"
          :key="t.value"
          class="tab"
          :class="{ active: currentType === t.value }"
          @click="switchType(t.value)"
        >
          {{ t.label }}
        </view>
      </view>
    </view>

    <!-- 概览 -->
    <view class="card">
      <view class="card-head">
        <text class="card-title">学习概览</text>
        <text class="sub">{{ periodLabel }}</text>
      </view>

      <view v-if="loadingRank" class="muted">概览加载中…</view>
      <view v-else-if="rankError" class="error">
        <text>概览加载失败：{{ rankError }}</text>
      </view>

      <view v-else class="stats">
        <view class="stat-item">
          <text class="label">上榜人数:</text>
          <text class="value">{{ overview.studyCount }}</text>
        </view>

        <view class="stat-item">
          <text class="label">进度第一:</text>
          <text class="value">{{ overview.top1Name }}</text>
        </view>

        <view class="stat-item">
          <text class="label">上榜最多班级:</text>
          <text class="value">{{ overview.topClassName }}</text>
        </view>

        <view class="stat-item">
          <text class="label">该班上榜人数:</text>
          <text class="value">{{ overview.topClassCount }}</text>
        </view>
      </view>
    </view>

    <!-- ✅ 饼图：上榜人数占比（班级） -->
    <view class="card">
      <view class="card-head">
        <text class="card-title">上榜人数占比（班级）</text>
        <text class="sub">{{ periodLabel }}</text>
      </view>

      <view v-if="loadingRank" class="muted">图表加载中…</view>
      <view v-else-if="rankError" class="error">
        <text>图表加载失败：{{ rankError }}</text>
      </view>

      <view v-else-if="classShareList.length === 0" class="muted">
        暂无数据
      </view>

      <view v-else class="pie-wrap-col">
        <view class="pie-box">
          <canvas canvas-id="pieCanvas" id="pieCanvas" class="pie-canvas"></canvas>

          <view class="pie-center">
            <text class="pie-total">{{ overview.studyCount }}</text>
            <text class="pie-tip">上榜人数</text>
          </view>
        </view>

        <view class="legend-col">
          <view v-for="it in classShareList" :key="it.className" class="legend-row">
            <view class="dot" :style="{ background: it.color }"></view>
            <view class="legend-text">
              <text class="legend-name">{{ it.className }}</text>
              <text class="legend-meta">{{ it.count }}人 · {{ it.percent }}%</text>
            </view>
          </view>

          <view class="muted legend-foot">
            注：占比=该班上榜人数 / 上榜总人数（只统计 TOP10 榜单）
          </view>
        </view>
      </view>
    </view>

    <!-- 排行榜 -->
    <view class="card">
      <view class="card-head">
        <text class="card-title">学习排行榜 TOP10</text>
        <text class="sub">{{ periodLabel }}</text>
      </view>

      <view v-if="loadingRank" class="muted">排行榜加载中…</view>
      <view v-else-if="rankError" class="error">
        <text>排行榜加载失败：{{ rankError }}</text>
      </view>

      <view v-else-if="rankList.length === 0" class="muted">
        暂无排行榜数据（该时间段可能无人产生学习记录）
      </view>

      <view v-else class="rank-list">
        <!-- ✅ 点击打开弹窗 -->
        <view
          v-for="(item, idx) in rankList"
          :key="String(item.studentId || idx) + '_' + currentType"
          class="rank-item"
          @click="openStudentModal(item)"
        >
          <view class="left">
            <text class="rank-index">NO.{{ idx + 1 }}</text>



            <view class="name-wrap">
              <text class="rank-name">{{ item.name || '未命名' }}</text>

              <text class="rank-sub">
                {{ item.className ? ('班级：' + item.className) : '班级：-' }}
              </text>

              <!-- ✅ 课程列表 -->
              <view v-if="item.courses && item.courses.length" class="course-list">
                <view v-for="c in item.courses" :key="c.courseId" class="course-row">
                  <text class="course-name">{{ c.courseName }}</text>
                  <text class="course-progress">{{ Number(c.totalProgress || 0) }}%</text>
                </view>
              </view>

              <view v-else class="course-empty">
                <text class="course-empty-text">（无课程明细）</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- ✅ 学生信息弹窗 -->
    <view v-if="stuModalOpen" class="stu-mask" @click.self="closeStudentModal">
      <view class="stu-modal" @click.stop>
        <view class="stu-head">
          <text class="stu-title">学生信息</text>
          <view class="stu-close" @click="closeStudentModal">×</view>
        </view>

        <!-- 基本信息 -->
        <view class="stu-basic">
          <view class="stu-basic-text">
            <text class="stu-name">{{ stuCurrent.name || '未命名' }}</text>
            <text class="stu-sub">班级：{{ stuCurrent.className || '-' }}</text>
            
          </view>
        </view>

        <!-- 课程选择 + 刷新 -->
        <view class="stu-tools">
          <view class="tool-item flex1">
            <text class="tool-label">课程</text>
          
            <!-- 点击展开 -->
            <view class="picker-box" @click.stop="toggleCourseDropdown">
              <text class="picker-text">
                {{ stuCourseNames[stuCourseIndex] || '请选择课程' }}
              </text>
              <text class="picker-arrow">▾</text>
            </view>
          
            <!-- 下拉面板（弹窗内部） -->
            <view v-if="courseDropdownOpen" class="class-dropdown">
              <view
                v-for="(c, idx) in stuCourseNames"
                :key="c + '_' + idx"
                class="class-option"
                :class="{ active: idx === stuCourseIndex }"
                @click.stop="pickCourse(idx)"
              >
                {{ c }}
              </view>
            </view>
          </view>

          <view
            class="tool-btn"
            :class="{ disabled: evalLoading }"
            @click="fetchStudentEval"
          >
            {{ evalLoading ? '获取中…' : '重新获取' }}
          </view>
        </view>

        <!-- 评价内容 -->
        <view class="eval-wrap">
          <view v-if="evalLoading" class="eval-loading">
            <view class="loading-spinner"></view>
            <text class="loading-text">正在生成评价…</text>
          </view>

          <view v-else-if="evalError" class="eval-error">
            {{ evalError }}
          </view>

          <scroll-view v-else class="eval-scroll" scroll-y>
            <text class="eval-text">{{ evalText }}</text>
          </scroll-view>
        </view>
      </view>
    </view>

    <!-- 调试：原始返回（可删） -->
    <view class="card debug" v-if="debug">
      <view class="card-head">
        <text class="card-title">调试：rank raw</text>
        <text class="sub">仅开发使用</text>
      </view>
      <text class="debug-text">{{ pretty(rankRaw) }}</text>
    </view>
  </view>
</template>

<script>
import request from '@/common/request.js'

export default {
  data() {
    return {
	  courseDropdownOpen: false,
      debug: false,

      tabList: [
        { label: '今日', value: 'today' },
        { label: '本周', value: 'week' },
        { label: '本月', value: 'month' },
        { label: '学期', value: 'term' },
        { label: '学年', value: 'year' }
      ],

      currentType: 'today',
      loadingRank: false,
      rankError: '',
      rankRaw: null,
      rankList: [],

      // ✅ 8080 资源拼接（头像等）
      baseUrl: 'http://81.70.62.177:8080',

      // ✅ 8081 AI 接口
      AI_BASE_URL: 'http://81.70.62.177:8081',

      // 饼图颜色池
      pieColors: ['#3B82F6', '#163763', '#2fbaf5', '#5f75c5', '#436df7', '#037d90', '#464b8f'],

      // ===== 弹窗 =====
      stuModalOpen: false,
      stuCurrent: {},
      stuCourseIndex: 0,

      evalLoading: false,
      evalError: '',
      evalText: ''
    }
  },

  computed: {
    periodLabel() {
      const hit = this.tabList.find(x => x.value === this.currentType)
      return hit ? hit.label : this.currentType
    },

    overview() {
      const list = Array.isArray(this.rankList) ? this.rankList : []
      const n = list.length
      const top1 = list[0] || {}

      const classCount = {}
      for (const s of list) {
        const cls = (s.className || '').trim() || '未知班级'
        classCount[cls] = (classCount[cls] || 0) + 1
      }

      let topClassName = '-'
      let topClassCount = 0
      for (const k in classCount) {
        if (classCount[k] > topClassCount) {
          topClassCount = classCount[k]
          topClassName = k
        }
      }

      return {
        studyCount: n,
        top1Name: top1.name || '-',
        topClassName: n ? topClassName : '-',
        topClassCount: n ? topClassCount : 0
      }
    },

    classShareList() {
      const list = Array.isArray(this.rankList) ? this.rankList : []
      if (!list.length) return []

      const classCount = {}
      for (const s of list) {
        const cls = (s.className || '').trim() || '未知班级'
        classCount[cls] = (classCount[cls] || 0) + 1
      }

      const total = list.length
      const keys = Object.keys(classCount)
      keys.sort((a, b) => (classCount[b] || 0) - (classCount[a] || 0))

      return keys.map((k, idx) => {
        const count = classCount[k] || 0
        const percent = total ? Math.round((count / total) * 1000) / 10 : 0
        return {
          className: k,
          count,
          percent,
          color: this.pieColors[idx % this.pieColors.length]
        }
      })
    },

    // 弹窗课程名列表
    stuCourseNames() {
      const courses = Array.isArray(this.stuCurrent?.courses) ? this.stuCurrent.courses : []
      return courses.map(c => c.courseName || `课程${c.courseId}`)
    },

    // 当前选中的 courseId
    stuSelectedCourseId() {
      const courses = Array.isArray(this.stuCurrent?.courses) ? this.stuCurrent.courses : []
      const c = courses[this.stuCourseIndex]
      return c?.courseId
    }
  },

  watch: {
    rankList() {
      this.$nextTick(() => {
        this.drawPie()
      })
    }
  },

  onLoad() {
    this.loadRank()
  },

  methods: {
	toggleCourseDropdown() {
	    this.courseDropdownOpen = !this.courseDropdownOpen
	  },
	
	  pickCourse(idx) {
	    this.stuCourseIndex = idx
	    this.courseDropdownOpen = false
	
	    // 选完课程自动刷新 AI 评价
	    this.fetchStudentEval()
	  },
    goWorkSquare() {
      uni.navigateTo({ url: '/pages/student/work_square' })
    },

    goBack() {
      uni.navigateBack()
    },

    switchType(type) {
      if (this.currentType === type) return
      this.currentType = type
      this.loadRank()
    },

    async loadRank() {
      this.loadingRank = true
      this.rankError = ''
      this.rankRaw = null
      this.rankList = []

      try {
        const res = await request({
          url: '/api/teacher/analysis/rank',
          method: 'GET',
          params: { type: this.currentType },
          data: { type: this.currentType }
        })

        console.log('[teacher_analysis] rank raw =>', res)
        this.rankRaw = res

        const list = Array.isArray(res?.list) ? res.list : (Array.isArray(res) ? res : [])
        this.rankList = list
          .map(x => ({
            studentId: x.studentId,
            name: x.name,
            avatar: x.avatar,
            className: x.className,
            totalProgress: Number(x.totalProgress || 0),
            courses: Array.isArray(x.courses) ? x.courses : []
          }))
          .slice(0, 10)
      } catch (err) {
        console.error('[teacher_analysis] rank failed:', err)
        const msg =
          err?.data?.message ||
          err?.message ||
          err?.errMsg ||
          err?.data?.error ||
          '接口异常'
        this.rankError = msg
      } finally {
        this.loadingRank = false
        this.$nextTick(() => this.drawPie())
      }
    },

    // ✅ AI 请求（8081）
    aiRequest({ url, method = 'GET', data = {} }) {
      const token = uni.getStorageSync('token')
      return new Promise((resolve, reject) => {
        uni.request({
          url: this.AI_BASE_URL + url,
          method,
          data,
          header: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          success: (res) => {
            if (res.statusCode === 200) resolve(res.data)
            else reject(res)
          },
          fail: (err) => reject(err)
        })
      })
    },

    // ✅ 点击排行榜打开弹窗
    openStudentModal(item) {
      this.stuCurrent = item || {}
      this.stuCourseIndex = 0
      this.evalText = ''
      this.evalError = ''
      this.evalLoading = false
      this.stuModalOpen = true

      // 有课程就自动拉一次
      if (this.stuSelectedCourseId) {
        this.fetchStudentEval()
      } else {
        this.evalError = '该学生没有课程明细，无法生成评价（courses 为空）'
      }
    },

    closeStudentModal() {
      this.stuModalOpen = false
    },

    onStuCoursePick(e) {
      const i = Number(e?.detail?.value || 0)
      this.stuCourseIndex = i
      // 切换课程后自动刷新评价
      this.fetchStudentEval()
    },

    async fetchStudentEval() {
      if (this.evalLoading) return
      const studentId = this.stuCurrent?.studentId
      const courseId = this.stuSelectedCourseId
      if (!studentId || !courseId) {
        this.evalError = '缺少 studentId 或 courseId'
        return
      }

      this.evalLoading = true
      this.evalError = ''
      this.evalText = ''

      try {
        // ✅ 图示接口：POST /api/teacher/ai/student/eval  （8081）
        const res = await this.aiRequest({
          url: '/api/teacher/ai/student/eval',
          method: 'POST',
          data: { studentId, courseId }
        })

        // 兼容：有的直接返回 evaluation，有的包一层 data
        const evaluation =
          res?.evaluation ||
          res?.data?.evaluation ||
          res?.data ||
          ''

        this.evalText = String(evaluation || '').trim() || '（后端返回为空）'
      } catch (e) {
        console.error('[student eval] failed:', e)
        this.evalError =
          e?.data?.message ||
          e?.data?.error ||
          e?.errMsg ||
          e?.message ||
          `获取失败(${e?.statusCode || ''})`
      } finally {
        this.evalLoading = false
      }
    },

    normalizeUrl(u) {
      if (!u) return ''
      const s = String(u)
      if (s.startsWith('http://') || s.startsWith('https://')) return s
      return this.baseUrl + s
    },

    drawPie() {
      const data = this.classShareList
      if (!data || !data.length) return

      const sizeRpx = 280
      const sizePx = uni.upx2px(sizeRpx)

      const ctx = uni.createCanvasContext('pieCanvas', this)
      const cx = sizePx / 2
      const cy = sizePx / 2
      const r = sizePx / 2 - uni.upx2px(8)

      ctx.clearRect(0, 0, sizePx, sizePx)

      const total = data.reduce((a, b) => a + (b.count || 0), 0)
      if (!total) {
        ctx.draw()
        return
      }

      let start = -Math.PI / 2
      for (const it of data) {
        const val = it.count || 0
        const angle = (val / total) * Math.PI * 2
        const end = start + angle

        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.arc(cx, cy, r, start, end)
        ctx.closePath()
        ctx.setFillStyle(it.color)
        ctx.fill()

        start = end
      }

      ctx.beginPath()
      ctx.arc(cx, cy, r * 0.58, 0, Math.PI * 2)
      ctx.setFillStyle('#ffffff')
      ctx.fill()

      ctx.draw()
    },

    pretty(obj) {
      try {
        return JSON.stringify(obj, null, 2)
      } catch (e) {
        return String(obj || '')
      }
    }
  }
}
</script>

<style scoped>
page {
  background: linear-gradient(180deg, #f8f9ff 0%, #edf2ff 100%);
}

.page {
  min-height: 100vh;
  padding: 24rpx;
  box-sizing: border-box;
}

.header {
  display: flex;
  align-items: center;
  position: relative;
  margin-bottom: 20rpx;
}
.back {
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4f6cff;
  box-shadow: 0 4rpx 12rpx rgba(79,108,255,0.15);
}
.title {
  margin: 0 auto;
  font-size: 34rpx;
  font-weight: 700;
  color: #1d2129;
}

/* 右上角按钮 */
.work-btn{
  position:absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  padding: 12rpx 18rpx;
  border-radius: 999rpx;
  background: linear-gradient(90deg, #4f6cff 0%, #6b86ff 100%);
  color:#fff;
  font-size: 24rpx;
  font-weight: 800;
  box-shadow: 0 8rpx 20rpx rgba(79,108,255,0.22);
}

.card {
  background: #fff;
  border-radius: 22rpx;
  padding: 22rpx;
  margin-bottom: 18rpx;
  box-shadow: 0 12rpx 32rpx rgba(79,108,255,0.08);
  border: 1rpx solid #f0f2f5;
}

.card-head{
  display:flex;
  align-items:center;
  justify-content: space-between;
  margin-bottom: 14rpx;
}
.card-title{
  font-size: 28rpx;
  font-weight: 700;
  color:#1d2129;
}
.sub{
  font-size: 22rpx;
  color:#86909c;
}

.tabs .tab-row{
  display:flex;
  flex-wrap: wrap;
  gap: 12rpx;
}
.tab{
  padding: 12rpx 18rpx;
  border-radius: 999rpx;
  background:#ffffff;
  border: 1rpx solid #e5e9ff;
  color:#4f6cff;
  font-size: 24rpx;
  font-weight: 700;
}
.tab.active{
  background: linear-gradient(90deg, #4f6cff 0%, #6b86ff 100%);
  color:#fff;
  border-color: transparent;
}

/* 概览 */
.stats{
  display:flex;
  flex-wrap: wrap;
}
.stat-item{
  width: 50%;
  margin-bottom: 14rpx;
  display:flex;
  flex-direction: column;
  gap: 6rpx;
}
.value{
  font-size: 34rpx;
  font-weight: 800;
  color:#4f6cff;
}
.label{
  font-size: 22rpx;
  color:#86909c;
}

/* ✅ 饼图上下布局：避免小屏裁切 */
.pie-wrap-col{
  display:flex;
  flex-direction: column;
  gap: 18rpx;
}
.pie-box{
  width: 100%;
  display:flex;
  justify-content: center;
  position: relative;
}
.pie-canvas{
  width: 300rpx;
  height: 300rpx;
}
.pie-center{
  position:absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display:flex;
  flex-direction: column;
  align-items:center;
  justify-content:center;
  pointer-events:none;
}
.pie-total{
  font-size: 36rpx;
  font-weight: 900;
  color:#1d2129;
}
.pie-tip{
  margin-top: 6rpx;
  font-size: 22rpx;
  color:#86909c;
  font-weight: 700;
}

.legend-col{
  display:flex;
  flex-wrap: wrap;
  gap: 12rpx 18rpx;
}
.legend-row{
  width: 48%;
  display:flex;
  align-items:center;
  gap: 10rpx;
}
.dot{
  width: 18rpx;
  height: 18rpx;
  border-radius: 50%;
}
.legend-text{
  display:flex;
  flex-direction: column;
}
.legend-name{
  font-size: 24rpx;
  color:#1d2129;
  font-weight: 800;
}
.legend-meta{
  margin-top: 4rpx;
  font-size: 22rpx;
  color:#4e5969;
  font-weight: 700;
}
.legend-foot{
  width: 100%;
  margin-top: 6rpx;
}

/* rank */
.rank-list{
  display:flex;
  flex-direction: column;
  gap: 12rpx;
}
.rank-item{
  display:flex;
  align-items:flex-start;
  justify-content: space-between;
  padding: 14rpx 12rpx;
  border-radius: 18rpx;
  background:#f8f9ff;
  border: 1rpx solid #e8ecff;
}
.left{
  display:flex;
  align-items:flex-start;
  gap: 12rpx;
  flex: 1;
}
.rank-index{
  font-size: 22rpx;
  color:#4f6cff;
  font-weight: 800;
  margin-top: 6rpx;
}
.avatar{
  width: 54rpx;
  height: 54rpx;
  border-radius: 50%;
  background:#fff;
  margin-top: 2rpx;
}
.name-wrap{
  display:flex;
  flex-direction: column;
  flex: 1;
}
.rank-name{
  font-size: 26rpx;
  font-weight: 700;
  color:#1d2129;
}
.rank-sub{
  font-size: 20rpx;
  color:#86909c;
  margin-top: 4rpx;
}

.course-list{
  margin-top: 10rpx;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.course-row{
  display: flex;
  justify-content: space-between;
  font-size: 22rpx;
  color: #4e5969;
  background: #fff;
  padding: 6rpx 10rpx;
  border-radius: 10rpx;
  border: 1rpx solid #eef1ff;
}
.course-name{
  max-width: 320rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.course-progress{
  color: #4f6cff;
  font-weight: 700;
}
.course-empty{
  margin-top: 8rpx;
}
.course-empty-text{
  font-size: 22rpx;
  color:#c0c6cc;
}

.muted{
  font-size: 24rpx;
  color:#86909c;
  padding: 12rpx 0;
}
.error{
  padding: 14rpx 12rpx;
  border-radius: 16rpx;
  background:#fff2f2;
  border: 1rpx solid rgba(245,34,45,0.18);
  color:#f5222d;
  font-size: 24rpx;
}

.debug .debug-text{
  font-size: 22rpx;
  color:#4e5969;
  white-space: pre-wrap;
  line-height: 1.6;
}

/* =====================
   ✅ 学生弹窗
   ===================== */
.stu-mask{
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.55);
  z-index: 9999;
  display:flex;
  align-items:center;
  justify-content:center;
  padding: 24rpx;
  backdrop-filter: blur(10rpx);
}
.stu-modal{
  width: 100%;
  height: 90vh;
  background:#fff;
  border-radius: 26rpx;
  padding: 22rpx;
  box-shadow: 0 16rpx 48rpx rgba(0,0,0,0.18);
  display:flex;
  flex-direction: column;
}
.stu-head{
  display:flex;
  align-items:center;
  justify-content: space-between;
  padding-bottom: 12rpx;
  border-bottom: 1rpx solid #eef2ff;
}
.stu-title{
  font-size: 30rpx;
  font-weight: 900;
  color:#1d2129;
}
.stu-close{
  width: 64rpx;
  height: 64rpx;
  border-radius: 18rpx;
  background:#f2f5ff;
  color:#4f6cff;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size: 30rpx;
  font-weight: 900;
}

.stu-basic{
  display:flex;
  gap: 16rpx;
  padding: 16rpx 0;
  align-items:center;
}
.stu-avatar{
  width: 92rpx;
  height: 92rpx;
  border-radius: 50%;
  background:#f8f9ff;
  border: 1rpx solid #e8ecff;
}
.stu-basic-text{
  display:flex;
  flex-direction: column;
  gap: 6rpx;
}
.stu-name{
  font-size: 28rpx;
  font-weight: 900;
  color:#1d2129;
}
.stu-sub{
  font-size: 22rpx;
  color:#86909c;
  font-weight: 700;
}

.stu-tools{
  display:flex;
  gap: 14rpx;
  align-items:flex-end;
  padding-bottom: 12rpx;
}
.tool-item{ width: 360rpx; }
.tool-item.flex1{ flex: 1; width: auto; }
.tool-label{
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
}
.picker-text{ font-size: 26rpx; color:#1d2129; font-weight: 800; }
.picker-arrow{ font-size: 22rpx; color:#94a3b8; }

.tool-btn{
  padding: 16rpx 18rpx;
  border-radius: 18rpx;
  background: linear-gradient(90deg, #4f6cff 0%, #6b86ff 100%);
  color:#fff;
  font-size: 24rpx;
  font-weight: 900;
  box-shadow: 0 10rpx 24rpx rgba(79,108,255,0.18);
}
.tool-btn.disabled{ opacity: .6; }

.eval-wrap{
  flex: 1;
  border-radius: 18rpx;
  border: 1rpx solid #eef2ff;
  padding: 16rpx;
  background:#fff;
}
.eval-loading{
  height: 100%;
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
.loading-text{ font-size: 26rpx; color:#86909c; font-weight: 700; }
@keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }

.eval-error{
  padding: 16rpx;
  border-radius: 16rpx;
  background:#fff2f2;
  border: 1rpx solid rgba(245,34,45,0.18);
  color:#f5222d;
  font-size: 24rpx;
  font-weight: 700;
}

.eval-scroll{
  height: 100%;
}
.eval-text{
  font-size: 26rpx;
  color:#1d2129;
  line-height: 1.8;
  white-space: pre-wrap;
}
.stu-modal{
  position: relative;
  overflow: visible;
}
.tool-item{
  position: relative;
}
.class-dropdown{
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 10rpx);
  z-index: 50;
}
/* ===== 下拉容器 ===== */
.class-dropdown{
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 12rpx);
  z-index: 200;

  background: #ffffff;
  border-radius: 22rpx;
  padding: 12rpx 0;

  box-shadow:
    0 18rpx 48rpx rgba(79,108,255,0.15),
    0 6rpx 18rpx rgba(0,0,0,0.06);

  border: 1rpx solid #eef2ff;

  max-height: 420rpx;
  overflow-y: auto;

  animation: dropdownFade 0.18s ease-out;
}

/* ===== 出现动画 ===== */
@keyframes dropdownFade{
  from{
    opacity: 0;
    transform: translateY(-8rpx) scale(0.98);
  }
  to{
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* ===== 单个选项 ===== */
.class-option{
  padding: 22rpx 28rpx;
  font-size: 26rpx;
  font-weight: 600;
  color: #1d2129;

  transition: all 0.15s ease;
  position: relative;
}

/* hover 效果（H5 有效） */
.class-option:hover{
  background: #f4f7ff;
}

/* 点击反馈 */
.class-option:active{
  background: #e9efff;
  transform: scale(0.99);
}

/* 选中项 */
.class-option.active{
  background: linear-gradient(90deg, #eef2ff 0%, #f7f9ff 100%);
  color: #4f6cff;
  font-weight: 800;
}

/* 选中项左侧高亮条 */
.class-option.active::before{
  content: "";
  position: absolute;
  left: 12rpx;
  top: 50%;
  transform: translateY(-50%);
  width: 6rpx;
  height: 36rpx;
  border-radius: 999rpx;
  background: linear-gradient(180deg, #4f6cff, #6b86ff);
}

/* ===== 滚动条美化（H5有效） ===== */
.class-dropdown::-webkit-scrollbar{
  width: 8rpx;
}
.class-dropdown::-webkit-scrollbar-thumb{
  background: rgba(79,108,255,0.35);
  border-radius: 999rpx;
}
.class-dropdown::-webkit-scrollbar-track{
  background: transparent;
}
/* ===== 评价区域容器：固定在弹窗内部，不把弹窗撑开 ===== */
.eval-wrap{
  flex: 1;            /* ✅ 占满弹窗剩余空间 */
  min-height: 0;      /* ✅ 关键：允许内部滚动，不撑开父容器 */
  margin-top: 14rpx;

  background: #ffffff;
  border: 1rpx solid #eef2ff;
  border-radius: 18rpx;
  padding: 18rpx;
  box-sizing: border-box;

  display: flex;
  flex-direction: column;
  overflow: hidden;   /* ✅ 防止内容溢出把弹窗顶大 */
}

/* ===== 加载态 ===== */
.eval-loading{
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
.loading-text{
  font-size: 26rpx;
  color:#86909c;
}
@keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }

/* ===== 错误态 ===== */
.eval-error{
  flex: 1;
  background:#fff2f2;
  border: 1rpx solid rgba(245,34,45,0.18);
  color:#f5222d;
  border-radius: 14rpx;
  padding: 16rpx;
  font-size: 24rpx;
  line-height: 1.6;
  overflow: auto; /* 错误文字太长也能滚 */
}

/* ===== 评价滚动区 ===== */
.eval-scroll{
  flex: 1;            /* ✅ 占满 eval-wrap 剩余空间 */
  min-height: 0;      /* ✅ 关键：保证 scroll-view 真正滚动 */
}

/* ===== 评价文本 ===== */
.eval-text{
  font-size: 26rpx;
  color:#1d2129;
  line-height: 1.75;
  white-space: pre-wrap;
}
</style>