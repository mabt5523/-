<template>
  <view class="page">
    <!-- 顶部问候 -->
    <view class="header">
      <text class="hello">你好，</text>
      <text class="name">{{ username }}</text>
      <text class="greeting" v-if="getGreetingText()">· {{ getGreetingText() }}</text>
    </view>

    <!-- 今日学习建议 -->
    <view class="card animate slide-up">
      <view class="card-header">
        <text class="card-title">今日学习建议</text>
        <view class="card-badge">优先完成</view>
      </view>

      <view
        class="course-suggest"
        v-for="course in suggestCourses"
        :key="course.courseId"
        hover-class="course-suggest-hover"
      >
        <image :src="course.cover" class="course-img" mode="aspectFill" />

        <view class="course-info">
          <view class="course-name">{{ course.courseName }}</view>
          <view class="course-desc">{{ course.desc }}</view>

          <view class="progress">
            <view
              class="progress-inner"
              :style="{ width: course.progress + '%' }"
              :class="{ 'progress-full': course.progress === 100 }"
            ></view>
          </view>

          <view class="progress-text">
            学习进度 {{ course.progress }}%
          </view>
        </view>
      </view>
    </view>

    <!-- 排行榜 -->
    <view class="card animate slide-up delay1">
      <!-- 切换 -->
      <view class="rank-header">
        <text
          :class="rankType === 'today' ? 'active' : ''"
          @click="switchRank('today')"
        >今日排行榜</text>

        <text
          :class="rankType === 'week' ? 'active' : ''"
          @click="switchRank('week')"
        >周排行榜</text>
      </view>

     <!-- 有排行榜数据 -->
     <view v-if="rankList.length > 0">
       <text class="my-rank">
         我的排名：第 {{ myRank }} 名
       </text>
     
       <scroll-view scroll-x class="stairs-scroll">
         <view class="stairs">
           <view
             class="step"
             :class="'rank-' + item.rank"
             v-for="item in rankList"
             :key="rankType + '-' + item.studentId"
             :style="getRankStepStyle(item)"
           >
             <image :src="item.avatar" class="avatar" mode="aspectFill" />
             <text class="step-name">{{ item.name }}</text>
             <text class="step-rank">NO.{{ item.rank }}</text>
           </view>
         </view>
       </scroll-view>
     </view>
     
     <!-- 没有排行榜数据 -->
     <view v-else class="rank-empty">
       <text class="rank-empty-text">
         暂无排行榜数据，快去学习冲榜吧 🚀
       </text>
     </view>

    </view>

    <!-- 今日学习记录 -->
    <view class="card animate slide-up delay2">
      <text class="card-title">今日学习记录</text>

      <view
        class="record-card"
        v-for="record in studyRecords"
        :key="record.id"
        hover-class="record-card-hover"
      >
        <image
          :src="record.cover || '/static/course_default.png'"
          class="record-icon"
          mode="aspectFill"
        />

        <view class="record-info">
          <!-- 课程名单独一层 -->
          <view class="record-name-wrap">
            <text class="record-name">
              {{ record.courseName }}
            </text>
          </view>

          <!-- 学习时间 -->
          <text class="record-time">
            上次学习：{{ formatStudyTime(record.lastStudyTime) }}
          </text>

          <!-- 学习进度 -->
          <text class="record-progress">
            学习进度：{{ record.progress }}%
          </text>

          <!-- 按钮单独一层 -->
          <view class="record-btn-wrap">
            <view class="record-btn" @click="goToCourse(record.courseId)">
              <text>继续学习</text>
              <uni-icons type="arrowright" size="16" color="#4f6cff"></uni-icons>
            </view>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view class="empty-record" v-if="studyRecords.length === 0">
        <text class="empty-text">今日暂无学习记录，快去学习吧 📚</text>
      </view>
    </view>

    <!-- ================= 底部导航栏（中间 Logo） ================= -->
      <view class="bottom-nav">
        <view class="nav-item" @click="goMistake">
          <uni-icons type="edit" size="24" color="#86909c" class="nav-icon"></uni-icons>
          <text class="nav-text">错题集</text>
        </view>
        <view class="nav-item" @click="goMyCourses">
          <uni-icons type="book" size="24" color="#86909c" class="nav-icon"></uni-icons>
          <text class="nav-text">我的课程</text>
        </view>
    
        <!-- ✅ 修改这里：正序+倒序循环的机器人 -->
        <view class="student-robot" @click="goGameHome">
          <image :src="currentLogo" class="robot-img" mode="aspectFill" />
        </view>
    
        <view class="nav-item" @click="goSummary">
          <uni-icons type="chart" size="24" color="#86909c" class="nav-icon"></uni-icons>
          <text class="nav-text">奇思妙想</text>
        </view>
        <view class="nav-item" @click="goMine">
          <uni-icons type="person" size="24" color="#86909c" class="nav-icon"></uni-icons>
          <text class="nav-text">我的</text>
        </view>
      </view>
  </view>
</template>

<script>
import request from '@/common/request.js'

export default {
  data() {
    return {
      /* 笑动画相关配置 */
      logoList: [], // 存储有效笑图片路径
      validFrameIndexes: [], // 有效帧索引白名单
      currentLogo: '', // 当前显示的图片
      frameTimer: null, // 逐帧动画定时器
      currentFrameIndex: 0, // 当前播放的有效帧索引（白名单中的索引）
      frameInterval: 1000 / 15, // 每秒15帧（约66.67ms/帧）
      totalFrames: 51, // 原始总帧数
      isForward: true, // 播放方向：true=正序，false=倒序
      
      username: '同学',
      /* 排行榜 */
      rankType: 'today',
      myRank: 0,
      rankList: [],
      /* 今日学习建议 */
      suggestCourses: [],
      /* 学习记录 */
      studyRecords: []
    }
  },

  onLoad() {
    this.getCurrentUser()
    this.getSuggestCourses()
    this.getStudyRecords()
    this.getRank()   // 🔥 首次加载就拉 today
    
    // 初始化逐帧动画
    this.generateValidFrameIndexes() // 生成有效帧索引
    this.generateLogoList() // 生成有效图片路径
    this.currentLogo = this.logoList[0] || ''
    this.startFrameAnimation()
  },

  onUnload() {
    // 清除逐帧动画定时器，防止内存泄漏
    clearInterval(this.frameTimer)
    this.frameTimer = null
  },

  methods: {
	goGameHome() {
	      uni.navigateTo({ 
	        url: '/pages/game/index' 
	      });
	    },
    // 获取问候语
    getGreetingText() {
      const hour = new Date().getHours()
      if (hour >= 6 && hour < 12) return '上午好'
      if (hour >= 12 && hour < 18) return '下午好'
      if (hour >= 18 && hour < 24) return '晚上好'
      return '深夜了，注意休息'
    },

    /* ========== 排行榜 ========== */
    switchRank(type) {
      this.rankType = type
      this.getRank()
    },
    goMistake() {
      uni.navigateTo({ url: '/pages/student/mistake_book' })
    },
    goMyCourses() {
      uni.navigateTo({ url: '/pages/student/my_courses' })
    },
    goSummary() {
      uni.navigateTo({ url: '/pages/student/idea_hub' })
    },
    goMine() {
      uni.navigateTo({ url: '/pages/student/mine' })
    },

    /* 📋 生成有效帧索引白名单（排除13-16、18-21） */
    generateValidFrameIndexes() {
      // 排除的帧范围：13-16、18-21（注意：这里是图片的实际序号，从1开始）
      const excludeRanges = [
        { start: 13, end: 16 },
        { start: 18, end: 21 }
      ]

      // 遍历所有帧，筛选有效帧
      for (let i = 1; i <= this.totalFrames; i++) {
        // 检查当前帧是否在排除范围内
        const isExcluded = excludeRanges.some(range => {
          return i >= range.start && i <= range.end
        })

        // 不在排除范围则加入白名单
        if (!isExcluded) {
          this.validFrameIndexes.push(i)
        }
      }
    },

    /* 📦 批量生成有效笑图片路径 */
    generateLogoList() {
      this.logoList = this.validFrameIndexes.map(frameNum => {
        // 补零处理：1 → 001，10 → 010，匹配序列图片命名规则
        const paddedNum = frameNum.toString().padStart(3, '0')
        // 替换为你的笑文件夹路径（根据实际情况调整）
        return `/static/smile/ezgif-frame-${paddedNum}.png`
      })
    },

    /* 🎬 启动正序+倒序循环的逐帧动画 */
    startFrameAnimation() {
      // 如果没有有效帧，不启动动画
      if (this.logoList.length === 0) return

      this.frameTimer = setInterval(() => {
        // 根据播放方向更新帧索引
        if (this.isForward) {
          // 正序：索引递增
          this.currentFrameIndex++
          // 到达最后一帧，切换为倒序
          if (this.currentFrameIndex >= this.logoList.length - 1) {
            this.isForward = false
          }
        } else {
          // 倒序：索引递减
          this.currentFrameIndex--
          // 到达第一帧，切换为正序
          if (this.currentFrameIndex <= 0) {
            this.isForward = true
          }
        }

        // 更新当前显示的图片
        this.currentLogo = this.logoList[this.currentFrameIndex]
      }, this.frameInterval)
    },

    getRank() {
      request({
        url: '/api/student/home/rank',
        method: 'GET',
        data: {                 // ✅ 不是 params
          type: this.rankType
        }
      })
        .then(res => {
          console.log('【后端返回 raw list】', res.list)
          const list = Array.isArray(res.list) ? res.list : []

          // ===== 正确的并列排名（Competition Ranking，标准版）=====
          let lastProgress = null
          let sameCount = 0

          const rankedList = list.map((item, index) => {
            let rank

            if (item.totalProgress === lastProgress) {
              // 和上一个人分数一样 → 并列
              sameCount++
              rank = index + 1 - sameCount
            } else {
              // 新分数
              sameCount = 0
              rank = index + 1
              lastProgress = item.totalProgress
            }

            return {
              ...item,
              rank
            }
          })

          this.rankList = rankedList.filter(item => item.rank <= 10)
          this.myRank = res.myRank ?? 0
        })
    },

    /* ========== 学习建议 ========== */
    getSuggestCourses() {
      request({
        url: '/api/student/home/suggest',
        method: 'GET'
      }).then(res => {
        const list = Array.isArray(res) ? res : []
        this.suggestCourses = list.filter(
          item => item.progress >= 70 && item.progress < 100
        )
      })
    },

    /* ========== 学习记录 ========== */
    getStudyRecords() {
      request({
        url: '/api/student/home/records',
        method: 'GET'
      }).then(res => {
        const list = Array.isArray(res) ? res : []

        // ===== 只保留「今天」的学习记录 =====
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        this.studyRecords = list.filter(item => {
          if (!item.lastStudyTime) return false

          const recordDate = new Date(item.lastStudyTime)
          recordDate.setHours(0, 0, 0, 0)

          return recordDate.getTime() === today.getTime()
        })
      })
    },

    formatStudyTime(time) {
      return time ? time.replace('T', ' ') : '暂无'
    },

    getRankStepStyle(item) {
      const topHeight = 420   // 第一名固定高度
      const step = 32         // 每一名减少多少
      const minHeight = 180   // 最低高度保护

      let height = topHeight - (item.rank - 1) * step

      if (height < minHeight) {
        height = minHeight
      }

      return {
        height: height + 'rpx'
      }
    },

    getCurrentUser() {
      request({ url: '/api/auth/me' })
        .then(res => {
          this.username = res.name || '同学'
        })
    },

    goToCourse(id) {
      uni.navigateTo({
        url: '/pages/student/course_detail?id=' + id
      })
    }
  }
}
</script>

<style scoped>
/* 全局背景 */
page {
  background: linear-gradient(180deg, #f8f9ff 0%, #edf2ff 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', sans-serif;
}

/* 页面容器 */
.page {
  min-height: 100vh;
  padding: 40rpx 24rpx 180rpx;
}

/* 顶部问候 */
.header {
  margin-bottom: 40rpx;
  padding: 0 8rpx;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}
.hello {
  font-size: 32rpx;
  color: #4e5969;
}
.name {
  font-size: 42rpx;
  font-weight: 700;
  color: #4f6cff;
  margin-left: 8rpx;
}
.greeting {
  font-size: 28rpx;
  color: #86909c;
  margin-left: 12rpx;
  margin-top: 4rpx;
}

/* 通用卡片 */
.card {
  background: #ffffff;
  border-radius: 28rpx;
  padding: 36rpx;
  margin-bottom: 32rpx;
  box-shadow: 0 16rpx 40rpx rgba(79, 108, 255, 0.08);
  border: 1rpx solid #f5f7ff;
  position: relative;
  overflow: hidden;
}

/* 卡片头部 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}
.card-badge {
  font-size: 22rpx;
  color: #4f6cff;
  background: #f0f3ff;
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
  font-weight: 500;
}

.card-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1d2129;
  margin-bottom: 28rpx;
}

/* 入场动画 */
.animate {
  opacity: 0;
  transform: translateY(30rpx);
  animation: slideUp 0.5s ease forwards;
}
.delay1 {
  animation-delay: 0.15s;
}
.delay2 {
  animation-delay: 0.3s;
}
@keyframes slideUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ===== 今日学习建议 ===== */
.course-suggest {
  display: flex;
  gap: 24rpx;
  margin-bottom: 24rpx;
  padding: 20rpx;
  border-radius: 20rpx;
  background: #f8f9ff;
  transition: all 0.2s ease;
}
.course-suggest-hover {
  background: #f0f3ff;
  transform: translateY(-2rpx);
}
.course-img {
  width: 128rpx;
  height: 128rpx;
  border-radius: 20rpx;
  box-shadow: 0 8rpx 16rpx rgba(0, 0, 0, 0.08);
}
.course-info {
  flex: 1;
}
.course-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #1d2129;
  line-height: 1.4;
}
.course-desc {
  font-size: 24rpx;
  color: #86909c;
  margin-top: 8rpx;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.progress {
  height: 16rpx;
  background: #f5f7fa;
  border-radius: 12rpx;
  margin-top: 16rpx;
  overflow: hidden;
}
.progress-inner {
  height: 100%;
  background: linear-gradient(90deg, #4f6cff, #8094ff);
  border-radius: 12rpx;
  transition: width 0.6s ease;
}
.progress-full {
  background: linear-gradient(90deg, #36d399, #2cb978);
}
.progress-text {
  font-size: 24rpx;
  color: #4e5969;
  margin-top: 10rpx;
}

/* ===== 排行榜 ===== */
.rank-header {
  display: flex;
  justify-content: center;
  gap: 48rpx;
  margin-bottom: 24rpx;
}
.rank-header text {
  font-size: 28rpx;
  color: #86909c;
  padding-bottom: 8rpx;
  position: relative;
  transition: all 0.2s ease;
}
.rank-header text.active {
  color: #4f6cff;
  font-weight: 600;
}
.rank-header text.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 36rpx;
  height: 4rpx;
  background: #4f6cff;
  border-radius: 2rpx;
}

.my-rank {
  font-size: 26rpx;
  color: #4f6cff;
  text-align: center;
  margin-bottom: 28rpx;
  font-weight: 500;
}

/* 横向滚动 */
.stairs-scroll {
  white-space: nowrap;
}
.stairs {
  display: flex;
  align-items: flex-end;
  min-height: 320rpx;
}

/* 阶梯 */
.step {
  width: 120rpx;
  margin-right: 20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-radius: 16rpx;
  padding: 20rpx 8rpx;
  color: #fff;
  box-shadow: 0 8rpx 16rpx rgba(0, 0, 0, 0.1);
}
/* ===== 按排名定义颜色（并列同色） ===== */
.step.rank-1 {
  background: linear-gradient(180deg, #3a57e8, #2d46d8);
}
.step.rank-2 {
  background: linear-gradient(180deg, #5b75f0, #4f6cff);
}
.step.rank-3 {
  background: linear-gradient(180deg, #7c93f7, #6b86ff);
}
/* 第 4 名及以后统一 */
.step[class*="rank-"]:not(.rank-1):not(.rank-2):not(.rank-3) {
  background: linear-gradient(180deg, #9db1fd, #8094ff);
}

.avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  border: 4rpx solid #fff;
  margin-bottom: 12rpx;
  box-shadow: 0 4rpx 8rpx rgba(0, 0, 0, 0.1);
}

.step-name {
  font-size: 24rpx;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 8rpx;
}
.step-rank {
  font-size: 22rpx;
  opacity: 0.9;
}

/* ===== 学习记录 ===== */
.record-card {
  display: flex;
  gap: 24rpx;
  background: #f8f9ff;
  padding: 24rpx;
  border-radius: 20rpx;
  margin-bottom: 20rpx;
  transition: all 0.2s ease;
  align-items: center;
}
.record-card-hover {
  background: #f0f3ff;
  transform: translateY(-2rpx);
  box-shadow: 0 8rpx 16rpx rgba(79, 108, 255, 0.08);
}
.record-icon {
  width: 108rpx;
  height: 108rpx;
  border-radius: 16rpx;
  box-shadow: 0 8rpx 16rpx rgba(0, 0, 0, 0.08);
}
.record-info {
  flex: 1;
}
.record-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #1d2129;
  line-height: 1.4;
}
.record-time,
.record-progress {
  font-size: 24rpx;
  color: #86909c;
  margin-top: 8rpx;
  line-height: 1.4;
}
.record-btn-wrap {
  margin-top: 16rpx;
}
.record-btn {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  font-size: 26rpx;
  color: #4f6cff;
  font-weight: 500;
  padding: 8rpx 16rpx;
  background: #f0f3ff;
  border-radius: 12rpx;
  transition: all 0.2s ease;
}
.record-btn:active {
  background: #e5e9ff;
}

/* 空状态 */
.empty-record {
  padding: 60rpx 20rpx;
  text-align: center;
}
.empty-img {
  width: 200rpx;
  height: auto;
  margin-bottom: 20rpx;
}
.empty-text {
  font-size: 28rpx;
  color: #86909c;
}

/* ================= 底部导航栏 ================= */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 120rpx;
  background: #ffffff;
  display: flex;
  justify-content: space-around;
  align-items: center;
  border-top: 1rpx solid #e5e9ff;
  box-shadow: 0 -8rpx 30rpx rgba(0, 0, 0, 0.05);
  z-index: 999;
  padding-bottom: env(safe-area-inset-bottom);
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 20rpx;
  border-radius: 8rpx;
  transition: all 0.2s ease;
}
.nav-item:active {
  background: #f5f7ff;
}
.nav-item:active .nav-icon,
.nav-item:active .nav-text {
  color: #4f6cff;
}
.nav-icon {
  transition: color 0.2s ease;
}
.nav-text {
  color: #86909c;
  font-size: 24rpx;
  transition: color 0.2s ease;
}

/* 中间机器人 */
.student-robot {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: -50rpx; /* 让机器人“跳出来” */
  transition: all 0.3s ease;
}
.robot-img {
  width: 140rpx;
  height: 140rpx;
  border-radius: 50%;
  background: #ffffff;
  padding: 8rpx;
  box-shadow: 0 12rpx 24rpx rgba(79, 108, 255, 0.2);
  transition: all 0.3s ease;
  /* 移除过渡效果，保证逐帧动画流畅 */
  transition: none;
}
/* ===== 排行榜空状态 ===== */
.rank-empty {
  padding: 60rpx 20rpx;
  text-align: center;
}

.rank-empty-img {
  width: 220rpx;
  height: auto;
  margin-bottom: 20rpx;
  opacity: 0.9;
}

.rank-empty-text {
  font-size: 28rpx;
  color: #86909c;
}
</style>