<template>
  <view class="page">
    <!-- 顶部 -->
    <view class="header">


      <view class="title-wrap">
        <text class="title">{{ course.courseName }}</text>
        <view class="course-tag">学习指南</view>
      </view>

      <!-- ▶️ 播放按钮 -->
      <view class="play-btn" @click="openVideo">▶</view>
    </view>

    <!-- 🎬 视频弹层 -->
    <view v-if="showVideo" class="video-mask" @click="closeVideo">
      <view class="video-wrapper" @click.stop>
        <video :src="currentVideo.src" controls autoplay class="video-player"></video>
      </view>
    </view>

    <!-- 内容 -->
    <view class="content-container">
      <!-- 课程目标 -->
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

      <!-- 学习方式 -->
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

      <!-- 课程结构 -->
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

    <!-- 操作按钮 -->
    <view class="actions">
      <!-- ✅ 预习 -->
      <view class="btn primary" :class="{ disabled: !canPreview }" @click="handleAction('preview')">
        <text class="btn-icon">📖</text>
        <text class="btn-text">开始预习</text>
      </view>

      <!-- ✅ 复习 -->
      <view class="btn primary" :class="{ disabled: !canReview }" @click="handleAction('review')">
        <text class="btn-icon">🔄</text>
        <text class="btn-text">开始复习</text>
      </view>

      <!-- ✅ 课后习题 -->
      <view class="btn outline" :class="{ disabled: !canMindMap }" @click="handleAction('mindmap')">
        <text class="btn-icon">🧠</text>
        <text class="btn-text">课后习题</text>
      </view>

      <!-- ✅ 拔高 -->
      <view class="btn danger" :class="{ disabled: !canImprove }" @click="handleAction('improve')">
        <text class="btn-icon">🚀</text>
        <text class="btn-text">提升拔高</text>
      </view>

      <!-- ✅ 结束学习（8081：end + summary） -->
      <view class="btn end" :class="{ disabled: ending }" @click="endAndGetReport">
        <text class="btn-icon">✅</text>
        <text class="btn-text">{{ ending ? '生成报告中…' : '结束学习 获取学习报告' }}</text>
      </view>
    </view>

    <!-- ✅ 报告弹窗 -->
    <view v-if="reportOpen" class="modal-mask" @click="reportOpen=false">
      <view class="modal" @click.stop>
        <view class="modal-title">学习报告</view>
        <view class="modal-sub">课程：{{ reportCourseName }}</view>
    
        <view class="report-card">
          <!-- 状态显示 -->
          <view v-if="reportData" class="report-item status">
            状态：
            <view class="status-tag" :class="{
              success: formatReportStatus(reportData.status) === '已生成报告',
              pending: formatReportStatus(reportData.status) === '未生成',
              unknown: formatReportStatus(reportData.status) === '未知'
            }">
              {{ formatReportStatus(reportData.status) }}
            </view>
          </view>
    
          <!-- 未完成部分 -->
          <view v-if="missingPartsText" class="report-item warn">
            未完成部分：{{ missingPartsText }}
          </view>
    
          <!-- 学习数据 -->
          <view v-if="metricsObj" class="report-metrics">
            <view class="metrics-title">学习数据</view>
            <view class="metrics-grid">
              <view class="metrics-item">
                <view class="metrics-label">预习对话轮次</view>
                <view class="metrics-value">{{ engagement.preview }}</view>
              </view>
              <view class="metrics-item">
                <view class="metrics-label">复习对话轮次</view>
                <view class="metrics-value">{{ engagement.review }}</view>
              </view>
              <view class="metrics-item">
                <view class="metrics-label">拔高对话轮次</view>
                <view class="metrics-value">{{ engagement.improve }}</view>
              </view>
              <view class="metrics-item total">
                <view class="metrics-label">总对话轮次</view>
                <view class="metrics-value">{{ engagement.total }}</view>
              </view>
            </view>
          </view>
        </view>
    
        <!-- 报告正文 -->
        <scroll-view scroll-y class="report-scroll">
          <view class="report-content">{{ reportText }}</view>
        </scroll-view>
    
        <view class="row">
          <view class="btn ghost" @click="reportOpen=false">关闭</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import request from '@/common/request.js'

// ✅ 课程ID → 视频路径 映射表（保持你原来的）
const COURSE_VIDEO_MAP = {
  1: ['/static/video/3-1-1.mp4'],
  2: ['/static/video/3-1-2.mp4'],
  3: ['/static/video/3-1-3.mp4'],
  4: ['/static/video/3-2-1.mp4'],
  5: ['/static/video/3-2-2.mp4'],
  6: ['/static/video/3-2-3.mp4'],
  7: ['/static/video/3-2-4.mp4'],
  8: ['/static/video/3-3-1.mp4'],
  9: ['/static/video/3-3-2.mp4'],
  10: ['/static/video/3-3-3.mp4'],
  11: ['/static/video/3-3-4.mp4'],
  12: ['/static/video/3-4-1.mp4'],
  13: ['/static/video/3-4-2.mp4'],
  14: ['/static/video/3-4-3.mp4'],
  15: ['/static/video/3-4-4.mp4'],
  16: ['/static/video/3-5-1.mp4'],
  17: ['/static/video/3-5-2.mp4'],
  18: ['/static/video/3-5-3.mp4'],
  19: ['/static/video/3-5-4.mp4'],
  20: ['/static/video/3-6-1.mp4'],
  21: ['/static/video/3-6-2.mp4'],
  22: ['/static/video/3-6-3.mp4'],
  23: ['/static/video/3-7-1.mp4'],
  24: ['/static/video/3-7-2.mp4'],
  25: ['/static/video/3-7-3.mp4'],
  26: ['/static/video/3-7-4.mp4'],
  27: ['/static/video/3-8-1.mp4'],
  28: ['/static/video/3-8-2.mp4'],
  29: ['/static/video/3-8-3.mp4'],
  30: ['/static/video/3-8-4.mp4'],
  31: ['/static/video/4-1-1.mp4'],
  32: ['/static/video/4-1-2.mp4'],
  33: ['/static/video/4-1-3.mp4'],
  34: ['/static/video/4-1-4.mp4'],
  35: ['/static/video/4-1-5.mp4'],
  36: ['/static/video/4-2-1.mp4'],
  37: ['/static/video/4-2-2.mp4'],
  38: ['/static/video/4-2-3.mp4'],
  39: ['/static/video/4-2-4.mp4'],
  40: ['/static/video/4-2-5.mp4'],
  41: ['/static/video/4-3-1.mp4'],
  42: ['/static/video/4-3-2.mp4'],
  43: ['/static/video/4-3-3.mp4'],
  44: ['/static/video/4-3-4.mp4'],
  45: ['/static/video/4-3-5.mp4'],
  46: ['/static/video/4-4-1.mp4'],
  47: ['/static/video/4-4-2.mp4'],
  48: ['/static/video/4-4-3.mp4'],
  49: ['/static/video/4-4-4.mp4'],
  50: ['/static/video/4-4-5.mp4'],
  51: ['/static/video/4-5-1.mp4'],
  52: ['/static/video/4-5-2.mp4'],
  53: ['/static/video/4-5-3.mp4'],
  54: ['/static/video/4-5-4.mp4'],
  55: ['/static/video/4-5-5.mp4'],
  56: ['/static/video/4-5-6.mp4'],
  57: ['/static/video/4-6-1.mp4'],
  58: ['/static/video/4-6-2.mp4'],
  59: ['/static/video/4-6-3.mp4'],
  60: ['/static/video/4-6-4.mp4'],
  61: ['/static/video/5-1-1.mp4'],
  62: ['/static/video/5-1-2.mp4'],
  63: ['/static/video/5-1-3.mp4'],
  64: ['/static/video/5-1-4.mp4'],
  65: ['/static/video/5-2-1.mp4'],
  66: ['/static/video/5-2-2.mp4'],
  67: ['/static/video/5-2-3.mp4'],
  68: ['/static/video/5-2-4.mp4'],
  69: ['/static/video/5-3-1.mp4'],
  70: ['/static/video/5-3-2.mp4'],
  71: ['/static/video/5-3-3.mp4'],
  72: ['/static/video/5-3-4.mp4'],
  73: ['/static/video/5-4-1.mp4'],
  74: ['/static/video/5-4-2.mp4'],
  75: ['/static/video/5-4-3.mp4'],
  76: ['/static/video/5-5-1.mp4'],
  77: ['/static/video/5-5-2.mp4'],
  78: ['/static/video/5-5-3.mp4'],
  79: ['/static/video/5-5-4.mp4'],
  80: ['/static/video/5-5-5.mp4'],
  81: ['/static/video/5-6-1.mp4'],
  82: ['/static/video/5-6-2.mp4'],
  83: ['/static/video/5-6-3.mp4'],
  84: ['/static/video/5-7-1.mp4'],
  85: ['/static/video/5-7-2.mp4'],
  86: ['/static/video/5-7-3.mp4'],
  87: ['/static/video/5-7-4.mp4'],
  88: ['/static/video/5-8-1.mp4'],
  89: ['/static/video/5-8-2.mp4'],
  90: ['/static/video/5-8-3.mp4'],
  91: ['/static/video/6-1-1.mp4'],
  92: ['/static/video/6-1-2.mp4'],
  93: ['/static/video/6-1-3.mp4'],
  94: ['/static/video/6-1-4.mp4'],
  95: ['/static/video/6-2-1.mp4'],
  96: ['/static/video/6-2-2.mp4'],
  97: ['/static/video/6-2-3.mp4'],
  98: ['/static/video/6-2-4.mp4'],
  99: ['/static/video/6-3-1.mp4'],
  100: ['/static/video/6-3-2.mp4'],
  101: ['/static/video/6-3-3.mp4'],
  102: ['/static/video/6-3-4.mp4'],
  103: ['/static/video/6-4-1.mp4'],
  104: ['/static/video/6-4-2.mp4'],
  105: ['/static/video/6-4-3.mp4'],
  106: ['/static/video/6-5-1.mp4'],
  107: ['/static/video/6-5-2.mp4'],
  108: ['/static/video/6-5-3.mp4'],
  109: ['/static/video/6-5-4.mp4'],
  110: ['/static/video/6-6-1.mp4'],
  111: ['/static/video/6-6-2.mp4'],
  112: ['/static/video/6-6-3.mp4'],
  113: ['/static/video/6-6-4.mp4'],
  114: ['/static/video/6-7-1.mp4'],
  115: ['/static/video/6-7-2.mp4'],
  116: ['/static/video/6-7-3.mp4'],
  117: ['/static/video/6-7-4.mp4'],
  118: ['/static/video/6-8-1.mp4'],
  119: ['/static/video/6-8-2.mp4'],
  120: ['/static/video/6-8-3.mp4']
}

export default {
  data() {
    return {
      // ===== 报告相关 =====
      ending: false,
      reportOpen: false,
      reportData: null,
      reportMsg: '',

      // ===== 视频相关 =====
      showVideo: false,
      currentVideo: {},
      videoList: [],

      // ===== 课程相关 =====
      courseId: null,
      course: {
        courseName: '',
        goals: [],
        studyWays: [],
        structure: [],
        status: ''
      },
      courseStatusFromList: ''
    }
  },

  computed: {
	// ✅ metricsJson 解析成对象（兼容：对象 / JSON字符串 / “字符串包字符串”）
	metricsObj() {
	  if (!this.reportData) return null
	
	  const mj = this.reportData.metricsJson || this.reportData.metrics_json
	  if (!mj) return null
	
	  try {
	    // 情况1：后端直接给对象
	    if (typeof mj === 'object') return mj
	
	    // 情况2：正常 JSON 字符串
	    let obj = JSON.parse(mj)
	
	    // 情况3：有些后端会把 JSON 再 stringify 一次，导致 parse 后还是字符串
	    if (typeof obj === 'string') obj = JSON.parse(obj)
	
	    return obj && typeof obj === 'object' ? obj : null
	  } catch (e) {
	    console.warn('[metricsJson parse failed]', mj, e)
	    return null
	  }
	},
	
	// ✅ 只取 engagement
	engagement() {
	  const m = this.metricsObj
	  const e = m?.engagement || null
	  return {
	    preview: Number(e?.student_turns_preview ?? 0),
	    review: Number(e?.student_turns_review ?? 0),
	    improve: Number(e?.student_turns_improve ?? 0),
	    total: Number(e?.total_student_turns ?? 0)
	  }
	},
    courseStatus() {
      return (this.courseStatusFromList || this.course.status || '').toString().toLowerCase()
    },
    canPreview() {
      return this.courseStatus === 'published'
    },
    canReview() {
      return this.courseStatus === 'finished'
    },
    canMindMap() {
      return this.courseStatus === 'finished'
    },
    canImprove() {
      return this.courseStatus === 'finished'
    },

    // 弹窗顶部课程名
    reportCourseName() {
      const n = this.reportData && (this.reportData.courseName || this.reportData.course_name)
      return n || this.course.courseName || ''
    },

    // 未完成部分：兼容 missingParts 是数组 or 字符串 "[]"
    missingPartsText() {
      if (!this.reportData) return ''
      const mp = this.reportData.missingParts ?? this.reportData.missing_parts
      if (!mp) return ''

      // 数组
      if (Array.isArray(mp)) return mp.length ? mp.join(', ') : ''

      // 字符串：可能是 "[]" 或 '["preview","improve"]'
      if (typeof mp === 'string') {
        const s = mp.trim()
        if (!s || s === '[]') return ''
        try {
          const arr = JSON.parse(s)
          if (Array.isArray(arr)) return arr.join(', ')
          return s
        } catch (e) {
          return s
        }
      }

      return ''
    },

    // ✅ 报告正文：优先 studentSummary（你后端就是这个字段）
    reportText() {
      if (!this.reportData) return this.reportMsg || '暂无报告内容'
    
      const s =
        (this.reportData.studentSummary ||
         this.reportData.student_summary ||
         this.reportData.summary || '').toString().trim()
    
      if (s) return s
    
      // 兜底：metricsJson
      const mj = this.reportData.metricsJson || this.reportData.metrics_json
      if (mj) {
        try {
          const obj = typeof mj === 'string' ? JSON.parse(mj) : mj
          return JSON.stringify(obj, null, 2)
        } catch (e) {
          return String(mj)
        }
      }
    
      return this.reportMsg || '暂无报告内容'
    }
  },

  onLoad(options) {
    this.courseId = options.id
    this.courseStatusFromList = options.status || ''

    // 8080：继续走 request.js 默认
    this.loadCourseStatusFromAll()
    this.loadCourseDetail()

    this.loadCourseVideo()
  },

  methods: {
    // =============================
    // ✅ 8081 基地址（只用于 end + summary）
    // =============================
    getBase8081() {
      let saved = uni.getStorageSync('BASE_8081')
      if (saved) {
        saved = String(saved).trim()
        if (!/^https?:\/\//i.test(saved)) saved = 'http://' + saved
        return saved.replace(/\/+$/, '')
      }

      // H5：用当前 origin 推导 host，改端口为 8081
      // eslint-disable-next-line no-undef
      if (typeof window !== 'undefined' && window.location && window.location.origin) {
        try {
          const u = new URL(window.location.origin)
          u.port = '8081'
          return u.origin
        } catch (e) {}
      }

      // 兜底：用你的局域网 IP（不要用 localhost）
      return 'http://81.70.62.177:8081'
    },

    getBearerToken() {
      const token = String(uni.getStorageSync('token') || '').trim()
      if (!token) return ''
      return token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`
    },

    // ✅ 8081 请求：只给这两个接口用，避免污染 request.js 的 8080
    request8081({ path, method = 'GET' }) {
      const base = this.getBase8081()
      const bearer = this.getBearerToken()
      const url = base + path

      return new Promise((resolve, reject) => {
        uni.request({
          url,
          method,
          timeout: 1115000,
          header: {
            ...(bearer ? { Authorization: bearer } : {}),
            'Content-Type': 'application/json'
          },
          success: (res) => {
            console.log('[8081]', method, url, 'status=', res.statusCode, 'data=', res.data)

            if (!(res.statusCode >= 200 && res.statusCode < 300)) {
              reject(res)
              return
            }
            resolve(res.data || {})
          },
          fail: (err) => {
            console.warn('[8081] fail', method, url, err)
            reject(err)
          }
        })
      })
    },

    // ✅ 拆包：兼容 {code,msg,data}
    unwrap(res) {
      const lv1 = res?.data ?? res
      return {
        code: lv1?.code,
        msg: lv1?.msg ?? lv1?.message ?? '',
        data: lv1?.data ?? null,
        raw: lv1
      }
    },

    // =============================
    // ✅ 结束学习 + 获取报告（8081）
    // =============================
    async endAndGetReport() {
      if (this.ending) return
      if (!this.courseId) {
        uni.showToast({ title: '缺少课程ID', icon: 'none' })
        return
      }
    
      const bearer = this.getBearerToken()
      if (!bearer) {
        uni.showToast({ title: '未登录', icon: 'none' })
        return
      }
    
      const ok = await new Promise(resolve => {
        uni.showModal({
          title: '结束学习',
          content: '确定结束学习并生成学习报告吗？（结束后仍可继续学习）',
          success: r => resolve(!!r.confirm),
          fail: () => resolve(false)
        })
      })
      if (!ok) return
    
      this.ending = true
      this.reportOpen = false
      this.reportData = null
      this.reportMsg = ''
    
      try {
        // 1) end（只用来 toast，不要拿它当报告内容）
        const endRes = await this.request8081({
          path: `/api/student/course/end?courseId=${this.courseId}`,
          method: 'POST'
        })
        const endMsg = endRes?.msg || '课程结束成功'
    
        // 2) summary/get（你日志里结构：{msg, code, data:{...}}）
        const sumRes = await this.request8081({
          path: `/api/student/course/summary/get?courseId=${this.courseId}`,
          method: 'GET'
        })
    
        // ✅ 关键：报告对象在 sumRes.data，不是 sumRes.msg
        const report = sumRes?.data || null
    
        // ✅ 如果这里还是 null，直接打印出来定位
        if (!report) {
          console.warn('[summary/get] data is empty =>', sumRes)
          this.reportMsg = sumRes?.msg || '暂无报告内容'
        } else {
          this.reportData = report
          // reportMsg 只保留 summary 的 msg（一般是 ok），避免覆盖正文
          this.reportMsg = sumRes?.msg || ''
        }
    
        // ✅ 一定要最后再打开弹窗（保证 reportData 已经写入）
        this.reportOpen = true
    
        uni.showToast({ title: endMsg, icon: 'none' })
      } catch (e) {
        console.error('[endAndGetReport] failed =>', e)
        const msg = e?.data?.msg || e?.message || '请求失败'
        uni.showToast({ title: msg, icon: 'none' })
      } finally {
        this.ending = false
      }
    },

    formatReportStatus(s) {
      if (s === 1 || s === '1') return '已生成报告'
      if (s === 0 || s === '0') return '未生成'
      if (!s && s !== 0) return '未知'
      return String(s)
    },

    // =============================
    // ✅ 下面这些：仍走 request.js（8080）
    // =============================
    async loadCourseStatusFromAll() {
      try {
        const list = await request({
          url: `/api/student/published-courses?tab=all`,
          method: 'GET'
        })

        const arr =
          (Array.isArray(list) ? list : null) ||
          (Array.isArray(list?.data) ? list.data : null) ||
          (Array.isArray(list?.result) ? list.result : null) ||
          []

        const hit = arr.find(x => String(x.courseId) === String(this.courseId))
        this.course.status = hit?.status ? String(hit.status).toLowerCase() : ''
      } catch (e) {
        console.warn('[course_detail] load status failed:', e)
        this.course.status = ''
      }
    },

    handleAction(type) {
      if (type === 'preview') {
        if (!this.canPreview) return
        this.goAI('preview')
        return
      }

      if (this.courseStatus !== 'finished') {
        uni.showToast({ title: '请先完成预习后再解锁本模块', icon: 'none' })
        return
      }

      if (type === 'review') return this.goAI('review')
      if (type === 'improve') return this.goAI('improve')
      if (type === 'mindmap') return this.goMindMap()
    },

    // 视频
    openVideo() {
      if (!this.videoList.length) {
        uni.showToast({ title: '暂无课程视频', icon: 'none' })
        return
      }
      this.currentVideo = this.videoList[0]
      this.showVideo = true
    },
    closeVideo() {
      this.showVideo = false
      this.currentVideo = {}
    },
    normalizeAssetUrl(url) {
      if (!url) return url
      const u = String(url).trim()
      if (u.startsWith('http://') || u.startsWith('https://')) return u
      if (u.startsWith('/static/')) return u
      if (!u.startsWith('/')) return '/' + u
      return u
    },
    loadCourseVideo() {
      const videos = COURSE_VIDEO_MAP[this.courseId] || []
      this.videoList = videos.map((path) => ({
        src: this.normalizeAssetUrl(path),
        poster: '/static/img/video_cover_1.png'
      }))
    },

    goBack() {
      uni.redirectTo({ url: '/pages/student/my_courses' })
    },

    loadCourseDetail() {
      request({
        url: `/api/student/course/${this.courseId}/detail`,
        method: 'GET'
      }).then(res => {
        const data = res?.data || res
        this.course = data || this.course
      })
    },

    goAI(mode) {
      uni.navigateTo({
        url:
          `/pages/student/ai_chat?courseId=${this.courseId}` +
          `&mode=${mode}` +
          `&courseName=${encodeURIComponent(this.course.courseName)}` +
          `&status=${encodeURIComponent(this.courseStatus || '')}`
      })
    },

    goMindMap() {
      uni.navigateTo({
        url: `/pages/student/course_mindmap?courseId=${this.courseId}`
      })
    }
  }
}
</script>

<style scoped>
page { background: linear-gradient(180deg, #f8f9ff 0%, #edf2ff 100%); }
.page { padding: 32rpx 28rpx 200rpx; min-height: 100vh; }

.header { margin-bottom: 32rpx; display: flex; align-items: center; position: relative; }
.back {
  position: absolute; left: 0;
  width: 60rpx; height: 60rpx;
  display: flex; align-items: center; justify-content: center;
  font-size: 28rpx; color: #4f6cff;
  background-color: #ffffff; border-radius: 50%;
  box-shadow: 0 4rpx 12rpx rgba(79, 108, 255, 0.15);
  transition: all 0.3s ease;
  z-index: 2;
}
.back::before { content: "←"; }
.back:active { transform: scale(0.95); background-color: #f5f7ff; }

.title-wrap { margin: 0 auto; display: flex; flex-direction: column; gap: 12rpx; align-items: center; }
.title { font-size: 38rpx; font-weight: 700; color: #1d2129; text-align: center; }
.course-tag { font-size: 22rpx; color: #4f6cff; background: #e5e9ff; padding: 6rpx 16rpx; border-radius: 50rpx; font-weight: 500; }

.content-container { display: flex; flex-direction: column; gap: 24rpx; margin-bottom: 40rpx; }
.section-card { background: #fff; border-radius: 24rpx; padding: 32rpx; box-shadow: 0 12rpx 32rpx rgba(79,108,255,0.1); border: 1rpx solid #f0f2f5; transition: all 0.3s ease; }
.section-header { display:flex; align-items:center; gap:16rpx; margin-bottom:20rpx; padding-bottom:16rpx; border-bottom:1rpx solid #f5f7fa; }
.section-icon { font-size: 32rpx; width: 60rpx; height: 60rpx; border-radius: 50%; display:flex; align-items:center; justify-content:center; }
.goal-icon { background:#fff1f0; color:#ff4d4f; }
.way-icon { background:#e8f4f8; color:#4299e1; }
.struct-icon { background:#f0f8fb; color:#9f7aea; }
.section-title { font-size: 30rpx; font-weight: 600; color:#1d2129; }
.item { font-size: 26rpx; color:#4e5969; line-height: 1.8; padding: 4rpx 0; }
.muted { color:#94a3b8; text-align:center; padding: 20rpx 0; }

.actions {
  position: fixed; bottom: 40rpx; left: 28rpx; right: 28rpx;
  display: grid; grid-template-columns: 1fr 1fr; gap: 20rpx;
  z-index: 10;
}
.btn {
  height: 90rpx; border-radius: 20rpx; font-size: 26rpx;
  display:flex; align-items:center; justify-content:center; gap: 8rpx;
  box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.08);
  transition: all 0.3s ease;
  font-weight: 500;
}
.btn:active { transform: scale(0.96); }
.primary { background: linear-gradient(90deg, #4f6cff 0%, #6b86ff 100%); color: #fff; }
.outline { border: 2rpx solid #4f6cff; color: #4f6cff; background: #fff; }
.danger { background: linear-gradient(90deg, #ff7a45 0%, #ff9566 100%); color: #fff; }

.btn.disabled { opacity: 0.45; filter: grayscale(0.2); }
.btn.disabled:active { transform: none; }

.play-btn {
  position: absolute; right: 0;
  width: 60rpx; height: 60rpx; border-radius: 50%;
  background: linear-gradient(90deg, #4f6cff, #8094ff);
  color: #fff; font-size: 28rpx;
  display:flex; align-items:center; justify-content:center;
  box-shadow: 0 6rpx 16rpx rgba(79,108,255,0.3);
}
.play-btn:active { transform: scale(0.95); }

.video-mask {
  position: fixed; top:0; left:0; right:0; bottom:0;
  z-index: 9999; background: rgba(0,0,0,0.6);
  display:flex; align-items:center; justify-content:center;
}
.video-wrapper { width: 90%; max-width: 680rpx; background: #000; border-radius: 20rpx; overflow: hidden; }
.video-player { width: 100%; height: 360rpx; background: #000; }

.animate { animation: fadeUp 0.6s ease both; }
.delay1 { animation-delay: 0.15s; }
.delay2 { animation-delay: 0.3s; }
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(30rpx); }
  to { opacity: 1; transform: translateY(0); }
}

/* ✅ 结束按钮：占满一行 */
.btn.end{
  grid-column: 1 / -1;
  background: linear-gradient(90deg, #ff7a45 0%, #ff9566 100%);
  color:#fff;
}

/* ✅ 优化后的报告弹窗样式 - 调整宽度+内部滚动 */
.modal-mask{
  position: fixed; top:0; left:0; right:0; bottom:0;
  background: rgba(0,0,0,0.7);
  display:flex; align-items:center; justify-content:center;
  z-index: 9999;
  padding: 40rpx 32rpx;
  backdrop-filter: blur(4rpx);
}
.modal{
  width: 80%; /* 核心修改：弹窗宽度设为整体界面的80% */
  max-width: none; /* 取消最大宽度限制，完全遵循80%宽度 */
  background:#ffffff;
  border-radius: 32rpx;
  padding: 40rpx 36rpx;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.12);
  border: 1rpx solid rgba(240, 242, 245, 0.8);
  animation: modalFadeIn 0.4s ease-out both;
  max-height: 85vh; /* 限制弹窗最大高度为视口85% */
  overflow-y: auto; /* 核心修改：弹窗内部支持垂直滚动 */
  /* 优化滚动条样式（可选） */
  scrollbar-width: thin;
  scrollbar-color: #e5e9ff #f8f9ff;
}

/* 弹窗入场动画 */
@keyframes modalFadeIn {
  from { opacity: 0; transform: scale(0.92) translateY(20rpx); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

/* 自定义滚动条样式（适配webkit内核） */
.modal::-webkit-scrollbar {
  width: 6rpx;
}
.modal::-webkit-scrollbar-track {
  background: #f8f9ff;
  border-radius: 3rpx;
}
.modal::-webkit-scrollbar-thumb {
  background: #e5e9ff;
  border-radius: 3rpx;
}
.modal::-webkit-scrollbar-thumb:hover {
  background: #4f6cff;
}

.modal-title{ 
  font-size: 36rpx; 
  font-weight: 700; 
  color:#1d2129; 
  position: relative;
  padding-bottom: 12rpx;
  /* 标题固定，不随滚动移动 */
  position: sticky;
  top: 0;
  background-color: #ffffff;
  padding-top: 10rpx;
  z-index: 1;
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
  margin-top: 16rpx; 
  color:#86909c; 
  font-size: 24rpx; 
  line-height: 1.5;
}

/* 报告卡片容器 */
.report-card {
  margin-top: 24rpx;
  border-radius: 20rpx;
  background: #f8f9ff;
  padding: 24rpx;
  border: 1rpx solid #e5e9ff;
}

/* 报告状态项 */
.report-item.status {
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 26rpx;
  color: #4e5969;
  padding: 8rpx 0;
}
/* 状态标签美化 */
.status-tag {
  padding: 4rpx 16rpx;
  border-radius: 50rpx;
  font-size: 22rpx;
  font-weight: 500;
}
.status-tag.success {
  background: #e6fffa;
  color: #38b2ac;
}
.status-tag.pending {
  background: #fffbeb;
  color: #ed8936;
}
.status-tag.unknown {
  background: #f8f8f8;
  color: #718096;
}

/* 未完成部分提示 */
.report-item.warn{
  margin-top: 16rpx;
  padding: 16rpx;
  background: #fff5f5;
  border-radius: 16rpx;
  border-left: 4rpx solid #ff7a45;
  color:#c53030;
  font-size: 26rpx;
  line-height: 1.6;
}

/* 学习数据模块 */
.report-metrics {
  margin-top: 20rpx;
  border-radius: 16rpx;
  background: linear-gradient(180deg, #f0f8fb 0%, #e8f4f8 100%);
  padding: 24rpx;
}
.metrics-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 16rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.metrics-title::before {
  content: "📊";
  font-size: 32rpx;
}
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}
.metrics-item {
  background: #ffffff;
  border-radius: 12rpx;
  padding: 16rpx;
  text-align: center;
  box-shadow: 0 2rpx 8rpx rgba(79, 108, 255, 0.08);
}
.metrics-label {
  font-size: 22rpx;
  color: #718096;
  margin-bottom: 8rpx;
}
.metrics-value {
  font-size: 32rpx;
  font-weight: 700;
  color: #4f6cff;
}
/* 总计项单独样式 */
.metrics-item.total {
  grid-column: 1 / -1;
  background: linear-gradient(90deg, #4f6cff 0%, #6b86ff 100%);
  color: #ffffff;
}
.metrics-item.total .metrics-label {
  color: #e5e9ff;
}
.metrics-item.total .metrics-value {
  color: #ffffff;
}

/* 报告正文区域 - 取消原有滚动，统一由弹窗外层滚动 */
.report-scroll{
  margin-top: 24rpx;
  max-height: none; /* 取消最大高度限制 */
  border-radius: 16rpx;
  background: #ffffff;
  border: 1rpx solid #f0f2f5;
  padding: 24rpx;
}
.report-content{
  font-size: 26rpx;
  color:#4a5568;
  line-height: 1.8;
  white-space: pre-wrap;
  letter-spacing: 0.5rpx;
}

/* 按钮区域 */
.row{ 
  display:flex; 
  gap: 16rpx; 
  margin-top: 32rpx; 
  justify-content: center;
  /* 按钮区域固定在弹窗底部 */
  position: sticky;
  bottom: 0;
  background-color: #ffffff;
  padding-bottom: 10rpx;
  z-index: 1;
}
.ghost{ 
  background:#f8f9fa; 
  color:#4f6cff; 
  border:1rpx solid #dee2e6; 
  box-shadow:none;
  padding: 0 40rpx;
  height: 80rpx;
  border-radius: 40rpx;
  font-weight: 500;
  transition: all 0.2s ease;
}
.ghost:hover, .ghost:active {
  background: #e5e9ff;
  border-color: #4f6cff;
}
</style>