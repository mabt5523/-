<template>
  <view class="page">
    <!-- 顶部标题 -->
    <view class="header">

      <text class="title">我的课程</text>
    </view>

    <!-- 分类切换 -->
    <view class="tabs">
      <text
        v-for="item in tabList"
        :key="item.value"
        :class="['tab', currentStatus === item.value ? 'active' : '']"
        @tap="changeStatus(item.value)"
      >
        {{ item.label }}
      </text>
    </view>

    <!-- 加载中 -->
    <view v-if="loading" class="loading">
      <view class="loading-spinner"></view>
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 课程列表 -->
    <view v-else-if="courseList.length" class="course-list">
      <view
        class="course-card"
        v-for="course in courseList"
        :key="course.courseId"
        @click="goToDetail(course)"
      >
        <image
          class="course-cover"
          :src="course.cover || defaultCover"
          mode="aspectFill"
        />

        <view class="course-info">
          <view class="course-text">
            <view class="course-name">{{ course.courseName }}</view>
            <view class="course-intro">{{ course.intro }}</view>
          </view>

          <view class="progress">
            <view class="progress-inner" :style="{ width: (course.progress || 0) + '%' }"></view>
          </view>

          <text class="progress-text">学习进度 {{ course.progress || 0 }}%</text>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view v-else class="empty">
      <view class="empty-icon">📚</view>
      <text class="empty-text">暂无课程</text>
      <text class="empty-desc">（只显示本年级已发布课程）</text>
    </view>
  </view>
</template>

<script>
import request from '@/common/request.js'

export default {
  data() {
    return {
	  defaultCover: '/static/course_default.png',
      starting: false,
      currentStatus: 'all',
      loading: false,

      tabList: [
        { label: '全部', value: 'all' },
        { label: '进行中', value: 'studying' },
        { label: '已完成', value: 'finished' }
      ],

      courseList: []
    }
  },

  onShow() {
    this.loadCourses()
  },

  methods: {
    // =============================
    // ✅ 8081 基地址 + token + request
    // =============================
    getBase8081() {
      return 'http://81.70.62.177:8081'
    },

    getBearerToken() {
      const token = String(uni.getStorageSync('token') || '').trim()
      if (!token) return ''
      return token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`
    },

    request8081({ path, method = 'GET', data = {} }) {
      const base = this.getBase8081()
      const bearer = this.getBearerToken()
      const url = base + path

      return new Promise((resolve, reject) => {
        uni.request({
          url,
          method,
          data,
          timeout: 30000,
          header: {
            'Content-Type': 'application/json',
            ...(bearer ? { Authorization: bearer } : {})
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

    // =============================
    // 页面功能
    // =============================
    goBack() {
      uni.reLaunch({ url: '/pages/student/student_homepage' })
    },

    changeStatus(status) {
      if (this.currentStatus === status) return
      this.currentStatus = status
      this.loadCourses()
    },

    getToken() {
      return uni.getStorageSync('token')
    },

    // ✅ 列表仍然走 8080（如果你的 published-courses 在 8080）
    async loadCourses() {
      this.loading = true
      try {
        const token = this.getToken()
        if (!token) {
          uni.showToast({ title: '未登录或缺少token', icon: 'none' })
          this.courseList = []
          return
        }

        const url = `/api/student/published-courses?tab=${this.currentStatus}`
        const res = await request({
          url,
          method: 'GET',
          header: {
            Authorization: `Bearer ${token}`
          }
        })

        const list =
          (Array.isArray(res) ? res : null) ||
          (Array.isArray(res?.data) ? res.data : null) ||
          (Array.isArray(res?.result) ? res.result : null) ||
          []

        this.courseList = list.map(x => ({
          courseId: x.courseId,
          courseName: x.courseName,
          intro: x.intro,
          cover: x.cover,
          status: x.status,
          progress: Number(x.progress || 0)
        }))

        console.log('[my_courses] url=', url)
        console.log('[my_courses] raw res =>', res)
        console.log('[my_courses] list =>', this.courseList)
      } catch (err) {
        console.error('[my_courses] load failed:', err)
        const msg = err?.data?.message || err?.message || err?.errMsg || '获取课程失败'
        uni.showToast({ title: msg, icon: 'none' })
        this.courseList = []
      } finally {
        this.loading = false
      }
    },

    // ✅ 点进详情页：先走 8081 start，再跳转
    async goToDetail(course) {
      const id = course?.courseId
      if (!id) return

      // 防止用户连点
      if (this.starting) return
      this.starting = true

      try {
        // ✅ start 在 8081
        await this.request8081({
          path: `/api/student/course/start?courseId=${id}`,
          method: 'POST'
        })
      } catch (e) {
        console.warn('[start before enter detail] failed:', e)
        // 失败也继续进详情页，不阻塞
      } finally {
        this.starting = false
      }

      const status = encodeURIComponent(course?.status || '')
      const progress = Number(course?.progress || 0)

      uni.navigateTo({
        url: `/pages/student/course_detail?id=${id}&status=${status}&progress=${progress}`
      })
    }
  }
}
</script>

<style scoped>
/* 你的样式原封不动 */
.page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f8f9ff 0%, #edf2ff 100%);
  padding: 32rpx 24rpx;
}
.header {
  display: flex;
  align-items: center;
  position: relative;
  margin-bottom: 24rpx;
}
.back {
  position: absolute;
  left: 0;
  top: 10rpx;
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
}
.back:active {
  transform: scale(0.95);
  box-shadow: 0 2rpx 8rpx rgba(79, 108, 255, 0.1);
  background-color: #f5f7ff;
}
.title {
  margin: 0 auto;
  font-size: 34rpx;
  font-weight: 600;
}

.tabs {
  display: flex;
  justify-content: center;
  gap: 16rpx;
  margin-bottom: 32rpx;
}
.tab {
  padding: 14rpx 36rpx;
  border-radius: 50rpx;
  font-size: 28rpx;
  color: #4f6cff;
  border: 2rpx solid #e5e9ff;
  background-color: #ffffff;
  transition: all 0.3s ease;
  letter-spacing: 0.5rpx;
}
.tab.active {
  background: linear-gradient(90deg, #4f6cff 0%, #6b86ff 100%);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 8rpx 20rpx rgba(79, 108, 255, 0.25);
}
.tab:not(.active):active { background-color: #f5f7ff; }

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #666;
  margin-top: 120rpx;
  gap: 20rpx;
}
.loading-spinner {
  width: 48rpx;
  height: 48rpx;
  border: 4rpx solid #e5e9ff;
  border-top: 4rpx solid #4f6cff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
.loading-text { font-size: 26rpx; color: #86909c; }
@keyframes spin { 0% { transform: rotate(0deg);} 100% { transform: rotate(360deg);} }

.course-list { display: flex; flex-direction: column; gap: 24rpx; }
.course-card {
  display: flex;
  background: #ffffff;
  border-radius: 24rpx;
  padding: 28rpx;
  box-shadow: 0 12rpx 32rpx rgba(159, 162, 177, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1rpx solid #f0f2f5;
}
.course-card:active { transform: translateY(-2rpx); box-shadow: 0 8rpx 24rpx rgba(159, 162, 177, 0.15); }

.course-cover {
  width: 160rpx;
  height: 120rpx;
  border-radius: 16rpx;
  margin-right: 24rpx;
  box-shadow: 0 6rpx 16rpx rgba(0, 0, 0, 0.08);
}
.course-info { flex: 1; display: flex; flex-direction: column; justify-content: space-between; }
.course-text { margin-bottom: 12rpx; }
.course-name { font-size: 30rpx; font-weight: 600; color: #1d2129; line-height: 1.4; }
.course-intro {
  font-size: 24rpx;
  color: #86909c;
  margin-top: 8rpx;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.progress { height: 12rpx; background: #f5f7fa; border-radius: 8rpx; overflow: hidden; position: relative; }
.progress-inner {
  height: 100%;
  background: linear-gradient(90deg, #4f6cff 0%, #8094ff 100%);
  border-radius: 8rpx;
  transition: width 0.6s ease;
  position: relative;
}
.progress-text { font-size: 24rpx; color: #4e5969; margin-top: 10rpx; font-weight: 500; }

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-top: 120rpx;
  gap: 16rpx;
}
.empty-icon { font-size: 80rpx; margin-bottom: 8rpx; }
.empty-text { font-size: 28rpx; color: #86909c; font-weight: 500; }
.empty-desc { font-size: 24rpx; color: #c0c6cc; margin-top: 8rpx; }
</style>