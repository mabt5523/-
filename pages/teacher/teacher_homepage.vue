<template>
  <view class="container">
    <!-- ✅ 修改密码弹窗（跨端：view + input） -->
    <view v-if="showPwdPopup" class="popup-mask" @click.self="closePwdPopup">
      <view class="pwd-popup">
        <text class="popup-title">修改密码</text>

        <view class="pwd-form">
          <input class="pwd-input" v-model="pwdOld" type="password" placeholder="请输入原密码" />
          <input class="pwd-input" v-model="pwdNew1" type="password" placeholder="请输入新密码" />
          <input class="pwd-input" v-model="pwdNew2" type="password" placeholder="请再次输入新密码" />
        </view>

        <view v-if="pwdError" class="pwd-error">
          <text>{{ pwdError }}</text>
        </view>

        <view class="popup-actions">
          <view class="popup-btn cancel" @click="closePwdPopup">取消</view>
          <view
            class="popup-btn confirm"
            :class="{ disabled: pwdSubmitting }"
            @click="submitChangePassword"
          >
            {{ pwdSubmitting ? '提交中…' : '确定' }}
          </view>
        </view>
      </view>
    </view>

    <!-- ===== Header ===== -->
    <view class="header-container">
      <view class="header">
        <view class="hello-row">
          <view class="hello">
            你好，<text class="name">{{ username }}老师</text>
          </view>

          <!-- ✅ 右上角修改密码按钮 -->
          <view class="pwd-btn" @click="openPwdPopup">修改密码</view>
        </view>

        <view class="greeting">欢迎回到你的教学管理中心</view>
      </view>

      <view class="stats">
        <view class="card animate delay1">
          <view class="card-icon">📚</view>
          <view class="card-value">{{ courses.length }}</view>
          <view class="card-label">门课程</view>
        </view>

        <view class="card animate delay2">
          <view class="card-icon">👨‍🎓</view>
          <view class="card-value">{{ totalStudentCount }}</view>
          <view class="card-label">名学生</view>
        </view>
      </view>
    </view>

    <!-- ===== Main ===== -->
    <view class="main-content">
      <view v-if="courses && courses.length > 0" class="courses-list">
        <view
          v-for="(course, index) in courses"
          :key="course.id || course.courseId || index"
          class="course-card animate"
          :class="'delay' + (index + 1)"
          @touchstart="hoveredCard = index"
          @touchend="hoveredCard = -1"
          @tap="handleTapCourse(course)"
        >
          <!-- 状态标签 -->
          <view :class="['status-badge', `status-${course.status}`]">
            {{ formatStatus(course.status) }}
          </view>

          <!-- 左侧：课程图片（✅ 用 image，APP可显示） -->
          <view class="course-cover-wrapper">
            <image
              class="course-cover"
              :src="course.cover || defaultCover"
              mode="aspectFill"
            />
          </view>

          <!-- 右侧：课程信息 -->
          <view class="course-info">
            <view class="course-title">
              {{ course.courseName || '未命名课程' }}
            </view>

            <view class="course-meta">
              <view class="student-count">
                <text class="icon-user">👥</text>
                <text>{{ course.studentCount || 0 }} 人学习</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view v-else class="no-course-tip">
        <view class="empty-icon">📖</view>
        <view class="empty-text">暂无课程</view>
      </view>
    </view>

    <!-- ===== Footer 导航 ===== -->
    <view class="bottom-nav-wrapper">
      <view class="bottom-nav">
        <view class="nav-item left" @tap="handleCourseManage">
          <view class="nav-icon">📋</view>
          <view class="nav-text">课程管理</view>
        </view>

        <!-- ✅ 机器人（✅ 用 image） -->
        <view class="student-robot">
          <image :src="currentLogo" class="robot-img" mode="aspectFill" />
        </view>

        <view class="nav-item right" @tap="handleStudentAnalysis">
          <view class="nav-icon">📊</view>
          <view class="nav-text">学生分析</view>
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
      showPwdPopup: false,
      pwdOld: '',
      pwdNew1: '',
      pwdNew2: '',
      pwdSubmitting: false,
      pwdError: '',

      username: '老师',
      totalStudentCount: 0,
      defaultCover: '/static/default-course.png',

      courses: [],
      hoveredCard: -1,

      // ✅ 逐帧动画配置（与学生端一致）
      logoList: [],
      validFrameIndexes: [],
      currentLogo: '',
      frameTimer: null,
      currentFrameIndex: 0,
      frameInterval: 1000 / 15,
      totalFrames: 51,
      isForward: true
    }
  },

  onLoad() {
    this.getCurrentUser()
    this.fetchCourses()

    // ✅ 初始化逐帧动画
    this.generateValidFrameIndexes()
    this.generateLogoList()
    this.currentLogo = this.logoList[0] || ''
    this.startFrameAnimation()
  },

  onUnload() {
    clearInterval(this.frameTimer)
    this.frameTimer = null
  },

  methods: {
    // ===== 密码弹窗 =====
    openPwdPopup() {
      this.pwdOld = ''
      this.pwdNew1 = ''
      this.pwdNew2 = ''
      this.pwdError = ''
      this.showPwdPopup = true
    },

    closePwdPopup() {
      this.showPwdPopup = false
      this.pwdError = ''
    },

    async submitChangePassword() {
      if (this.pwdSubmitting) return
      this.pwdError = ''

      const oldPassword = (this.pwdOld || '').trim()
      const newPassword = (this.pwdNew1 || '').trim()
      const newPassword2 = (this.pwdNew2 || '').trim()

      if (!oldPassword) { this.pwdError = '请输入原密码'; return }
      if (!newPassword) { this.pwdError = '请输入新密码'; return }
      if (newPassword !== newPassword2) { this.pwdError = '两次新密码不一致'; return }

      try {
        this.pwdSubmitting = true
        const res = await request({
          url: '/api/user/password/change',
          method: 'POST',
          data: { oldPassword, newPassword }
        })

        // 兼容：字符串/对象返回
        if (typeof res === 'string') {
          if (res.trim() === 'ok') {
            uni.showToast({ title: '修改成功', icon: 'success' })
            this.closePwdPopup()
            return
          }
          this.pwdError = res
          return
        }

        if (res && typeof res === 'object') {
          if (res.code === 200 || res.code === 0) {
            uni.showToast({ title: '修改成功', icon: 'success' })
            this.closePwdPopup()
            return
          }
          this.pwdError = res.msg || res.message || '修改失败'
          return
        }

        this.pwdError = '修改失败'
      } catch (e) {
        const msg = e?.data?.msg || e?.data || e?.message || '修改失败'
        this.pwdError = String(msg)
      } finally {
        this.pwdSubmitting = false
      }
    },

    // ===== 业务 =====
    getCurrentUser() {
      request({ url: '/api/auth/me', method: 'GET' })
        .then(data => {
          this.username = data.name || '老师'
        })
        .catch(() => {
          uni.reLaunch({ url: '/pages/login/login' })
        })
    },

    fetchCourses() {
      request({ url: '/api/teacher/home', method: 'GET' })
        .then(res => {
          this.courses = Array.isArray(res.courses) ? res.courses : []
          this.totalStudentCount = res.totalStudentCount || 0
        })
        .catch(() => {
          this.courses = []
          this.totalStudentCount = 0
        })
    },

    formatStatus(status) {
      if (status === 'draft') return '未发布'
      if (status === 'published') return '已发布（未上课）'
      if (status === 'finished') return '已发布（已上课）'
      return '未知状态'
    },

    handleTapCourse(course) {
      // 你原来有 checkCourseStatus / 跳转逻辑，这里保留入口
      const courseId = course?.id || course?.courseId
      if (!courseId) return
      // 需要你自己决定跳哪里（教师详情/学生详情）
      // 示例：进入教师课程详情
      uni.navigateTo({ url: '/pages/teacher/course_detail?id=' + courseId })
    },

    handleCourseManage() {
      uni.navigateTo({ url: '/pages/teacher/course_management' })
    },

    handleStudentAnalysis() {
      uni.navigateTo({ url: '/pages/teacher/student_analysis' })
    },

    // ===== 机器人逐帧动画 =====
    generateValidFrameIndexes() {
      this.validFrameIndexes = []
      const excludeRanges = [
        { start: 13, end: 16 },
        { start: 18, end: 21 }
      ]
      for (let i = 1; i <= this.totalFrames; i++) {
        const isExcluded = excludeRanges.some(r => i >= r.start && i <= r.end)
        if (!isExcluded) this.validFrameIndexes.push(i)
      }
    },

    generateLogoList() {
      this.logoList = this.validFrameIndexes.map(frameNum => {
        const paddedNum = frameNum.toString().padStart(3, '0')
        return `/static/smile/ezgif-frame-${paddedNum}.png`
      })
    },

    startFrameAnimation() {
      if (this.logoList.length === 0) return
      if (this.frameTimer) clearInterval(this.frameTimer)

      this.frameTimer = setInterval(() => {
        if (this.isForward) {
          this.currentFrameIndex++
          if (this.currentFrameIndex >= this.logoList.length - 1) this.isForward = false
        } else {
          this.currentFrameIndex--
          if (this.currentFrameIndex <= 0) this.isForward = true
        }
        this.currentLogo = this.logoList[this.currentFrameIndex]
      }, this.frameInterval)
    }
  }
}
</script>

<style scoped>
/* ===== 基础样式 ===== */
.container{
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(180deg, #f5f9ff 0%, #eaf4ff 100%);
  padding-bottom: 140rpx;
  box-sizing: border-box;
  font-family: "PingFang SC","Microsoft YaHei",Arial,sans-serif;
}

/* ===== Header ===== */
.header-container{
  padding: 30rpx 20rpx 20rpx;
}
.header{
  margin-bottom: 28rpx;
  padding-top: 10rpx;
}
.hello-row{
  display:flex;
  align-items:center;
  justify-content: space-between;
  gap: 12rpx;
}
.hello{
  font-size: 36rpx;
  color:#2d3748;
  font-weight: 600;
}
.name{
  font-size: 38rpx;
  font-weight: 700;
  color:#4f6cff;
  margin-left: 8rpx;
}
.greeting{
  font-size: 24rpx;
  color:#718096;
  margin-top: 8rpx;
}

/* 右上角修改密码按钮 */
.pwd-btn{
  padding: 10rpx 18rpx;
  font-size: 22rpx;
  color:#4f6cff;
  border: 1px solid #e8f0ff;
  border-radius: 999rpx;
  background:#fff;
  box-shadow: 0 4rpx 12rpx rgba(79,108,255,0.10);
}

/* 统计卡片 */
.stats{
  display:flex;
  gap: 16rpx;
  margin-bottom: 30px;
}
.card{
  flex:1;
  background:#fff;
  border-radius: 20rpx;
  padding: 24rpx 16rpx;
  text-align:center;
  border: 1px solid #e8f0ff;
  box-shadow: 0 8rpx 24rpx rgba(79,108,255,0.08);
}
.card-icon{ font-size: 32rpx; margin-bottom: 8rpx; }
.card-value{ font-size: 36rpx; font-weight: 700; color:#4f6cff; line-height: 1; }
.card-label{ font-size: 22rpx; color:#718096; margin-top: 8rpx; }

/* ===== Main 内容区 ===== */
.main-content{
  padding: 0 20rpx 20rpx;
}
.courses-list{
  display:flex;
  flex-direction: column;
  gap: 20rpx;
}
.course-card{
  position: relative;
  background:#fff;
  border-radius: 24rpx;
  padding: 20rpx;
  box-shadow: 0 8rpx 24rpx rgba(79,108,255,0.06);
  display:flex;
  align-items:center;
  gap: 20rpx;
  overflow:hidden;
}

/* 状态标签 */
.status-badge{
  position:absolute;
  top:16rpx;
  right:16rpx;
  color:#fff;
  font-size: 18rpx;
  font-weight: 500;
  padding: 6rpx 12rpx;
  border-radius: 12rpx;
  white-space: nowrap;
  box-shadow: 0 2rpx 8rpx rgba(79,108,255,0.2);
  z-index: 2;
}
.status-draft{ background: linear-gradient(135deg,#94a3b8,#64748b); }
.status-published{ background: linear-gradient(135deg,#4f6cff,#3366ff); }
.status-finished{ background: linear-gradient(135deg,#10b981,#059669); }

/* 左侧图片 */
.course-cover-wrapper{
  flex-shrink: 0;
  width: 160rpx;
  height: 160rpx;
  border-radius: 16rpx;
  overflow:hidden;
}
.course-cover{
  width:100%;
  height:100%;
}

/* 右侧信息 */
.course-info{
  flex:1;
  display:flex;
  flex-direction: column;
  justify-content:center;
  gap: 12rpx;
}
.course-title{
  font-size: 30rpx;
  font-weight: 600;
  color:#1a2b48;
  line-height: 1.3;
}
.student-count{
  font-size: 22rpx;
  color:#718096;
  display:flex;
  align-items:center;
  gap: 6rpx;
}
.icon-user{ font-size: 20rpx; }

/* 空状态 */
.no-course-tip{
  text-align:center;
  padding: 80rpx 20rpx;
  display:flex;
  flex-direction: column;
  align-items:center;
  gap: 16rpx;
}
.empty-icon{ font-size: 80rpx; color:#cbd5e0; }
.empty-text{ font-size: 32rpx; color:#4a5568; font-weight: 500; }

/* ===== 底部导航 ===== */
.bottom-nav-wrapper{
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 120rpx;
  background:#fff;
  border-top: 1rpx solid #e5e9ff;
  box-shadow: 0 -4rpx 16rpx rgba(79,108,255,0.04);
  z-index: 999;
  overflow: visible; /* ✅ 让机器人可以“跳出来” */
}
.bottom-nav{
  position: relative;
  height: 120rpx;
  display:flex;
  align-items:center;
  justify-content:center;
}
.nav-item{
  position:absolute;
  top:50%;
  transform: translate(-50%,-50%);
  font-size: 24rpx;
  color:#86909c;
  display:flex;
  flex-direction: column;
  align-items:center;
  gap: 6rpx;
}
.nav-item.left{ left: 20%; }
.nav-item.right{ left: 80%; }
.nav-icon{ font-size: 32rpx; }
.nav-text{ font-size: 22rpx; }

/* 机器人 */
.student-robot{
  
  position:absolute;
  left:50%;
  top: -80rpx;     
  transform: translateX(-50%);
  z-index: 10;
}
.robot-img{
  width: 180rpx;
  height: 220rpx;
}

/* ===== 弹窗 ===== */
.popup-mask{
  position: fixed;
  left:0; top:0;
  width:100vw; height:100vh;
  background: rgba(0,0,0,0.45);
  display:flex;
  align-items:center;
  justify-content:center;
  z-index: 9999;
}
.pwd-popup{
  width: 80%;
  background:#fff;
  border-radius: 24rpx;
  padding: 40rpx;
  box-shadow: 0 12rpx 40rpx rgba(0,0,0,0.18);
}
.popup-title{
  text-align:center;
  font-size: 32rpx;
  font-weight: 700;
  color:#1a2b48;
  margin-bottom: 18rpx;
}
.pwd-form{
  display:flex;
  flex-direction: column;
  gap: 16rpx;
}
.pwd-input{
  height: 84rpx;
  border-radius: 18rpx;
  border: 1px solid rgba(79,108,255,0.18);
  padding: 0 20rpx;
  font-size: 26rpx;
  background: #fff;
}
.pwd-error{
  margin-top: 14rpx;
  padding: 14rpx 18rpx;
  font-size: 24rpx;
  color:#ff4d4f;
  background: rgba(255,77,79,0.08);
  border: 1px solid rgba(255,77,79,0.25);
  border-radius: 14rpx;
  text-align:center;
}
.popup-actions{
  display:flex;
  gap: 24rpx;
  margin-top: 22rpx;
}
.popup-btn{
  flex:1;
  text-align:center;
  padding: 20rpx 0;
  border-radius: 16rpx;
  font-size: 26rpx;
  font-weight: 600;
}
.popup-btn.cancel{ background:#f5f5f5; color:#666; }
.popup-btn.confirm{
  background: linear-gradient(90deg,#4f6cff 0%,#6a86ff 100%);
  color:#fff;
  box-shadow: 0 6rpx 18rpx rgba(79,108,255,0.25);
}
.popup-btn.confirm.disabled{
  opacity: .55;
  pointer-events:none;
}

/* ===== 入场动画（保留你的延迟类） ===== */
.animate{
  opacity: 0;
  transform: translateY(20rpx);
  animation: fadeInUp .5s ease forwards;
}
.delay1{ animation-delay: .1s; }
.delay2{ animation-delay: .2s; }
.delay3{ animation-delay: .3s; }
.delay4{ animation-delay: .4s; }
.delay5{ animation-delay: .5s; }
@keyframes fadeInUp{
  to{ opacity: 1; transform: translateY(0); }
}
</style>