<template>
  <view class="login-page">

    <!-- 登录卡片 -->
    <view class="login-card">

      <!-- LOGO -->
      <view class="logo-wrapper">
        <image :src="currentLogo" class="logo-img" />
        <text class="system-name">你好，我是芝麻糖</text>
        <text class="system-name">欢迎来到智码堂</text>
      </view>

      <!-- 表单区域（默认账号登录） -->
      <view class="form-container">
        <view class="form-content">

          <view class="input-group">
            <view class="input-label">账号</view>
            <input
              v-model="form.username"
              placeholder="请输入账号"
              class="input-field"
            />
          </view>

          <view class="input-group">
            <view class="input-label">密码</view>
            <input
              v-model="form.password"
              password
              placeholder="请输入密码"
              class="input-field"
            />
          </view>

          <!-- ✅ 记住账号密码 -->
          <view class="remember-row">
            <checkbox
              :checked="remember"
              @click="remember = !remember"
            />
            <text class="remember-text">记住账号和密码</text>
          </view>

        </view>
      </view>

      <!-- 登录按钮 -->
      <button class="login-btn" @click="handleLogin">
        <text class="login-btn-text">登录</text>
      </button>

      <view class="footer-tips">
        <text class="tips-text">
          登录即表示同意《用户服务协议》和《隐私政策》
        </text>
      </view>

    </view>
  </view>
</template>

<script>
import request from '@/common/request.js'

export default {
  data() {
    return {
      remember: true,   // ✅ 默认勾选

      form: {
        username: '',
        password: ''
      },

      /* 动画相关 */
      logoList: [],
      currentLogo: '',
      frameTimer: null,
      currentFrameIndex: 0,
      frameInterval: 1000 / 15,
      totalFrames: 51
    }
  },

  onLoad() {
    this.generateLogoList()
    this.currentLogo = this.logoList[0]
    this.startFrameAnimation()

    // ✅ 读取本地保存的账号密码
    const saved = uni.getStorageSync('LOGIN_REMEMBER_INFO')
    if (saved && saved.username) {
      this.form.username = saved.username
      this.form.password = saved.password
    }
  },

  onUnload() {
    clearInterval(this.frameTimer)
  },

  methods: {

    /* 批量生成图片 */
    generateLogoList() {
      for (let i = 1; i <= this.totalFrames; i++) {
        const frameNum = i.toString().padStart(3, '0')
        const imagePath = `/static/hello/ezgif-frame-${frameNum}.png`
        this.logoList.push(imagePath)
      }
    },

    startFrameAnimation() {
      this.frameTimer = setInterval(() => {
        this.currentFrameIndex =
          (this.currentFrameIndex + 1) % this.logoList.length
        this.currentLogo = this.logoList[this.currentFrameIndex]
      }, this.frameInterval)
    },

    /* 登录 */
    handleLogin() {
      if (!this.form.username) {
        uni.showToast({ title: '请输入账号', icon: 'none' })
        return
      }

      if (!this.form.password) {
        uni.showToast({ title: '请输入密码', icon: 'none' })
        return
      }

      const payload = {
        loginType: 'account',
        username: this.form.username,
        password: this.form.password
      }

      request({
        url: '/api/auth/login',
        method: 'POST',
        data: payload
      })
        .then(res => {

          // ✅ 记住账号密码（保存本地）
          if (this.remember) {
            uni.setStorageSync('LOGIN_REMEMBER_INFO', {
              username: this.form.username,
              password: this.form.password
            })
          } else {
            uni.removeStorageSync('LOGIN_REMEMBER_INFO')
          }

          uni.setStorageSync('token', res.token)
          uni.setStorageSync('role', res.role)
          uni.setStorageSync('userId', res.userId)

          if (res.role === 'student') {
            uni.reLaunch({ url: '/pages/student/student_homepage' })
          } else {
            uni.reLaunch({ url: '/pages/teacher/teacher_homepage' })
          }
        })
        .catch(err => {
          uni.showToast({
            title: err.message || '登录失败',
            icon: 'none'
          })
        })
    }
  }
}
</script>

<style scoped>

/* 页面背景 */
.login-page {
  height: 100vh;
  background: linear-gradient(135deg, #4f6cff 0%, #8094ff 30%, #9f7aea 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx 20rpx;
  box-sizing: border-box;
}

/* 登录卡片 */
.login-card {
  width: 100%;
  max-width: 480rpx;
  padding: 60rpx 40rpx;
  border-radius: 32rpx;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20rpx);
  box-shadow:
    0 24rpx 60rpx rgba(79, 108, 255, 0.15),
    inset 0 2rpx 0 rgba(255, 255, 255, 0.8);
  border: 1rpx solid rgba(255, 255, 255, 0.3);
}

/* LOGO */
.logo-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 40rpx;
}
.logo-img {
  width: 220rpx;
  height: 280rpx;
  object-fit: contain;
  margin-bottom: 16rpx;
}
.system-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #1d2129;
  letter-spacing: 2rpx;
}

/* 表单 */
.form-container {
  margin-bottom: 40rpx;
}

.input-group {
  margin-bottom: 30rpx;
}
.input-label {
  font-size: 26rpx;
  color: #4e5969;
  margin-bottom: 8rpx;
  font-weight: 500;
}
.input-field {
  width: 100%;
  height: 88rpx;
  border-radius: 20rpx;
  border: 2rpx solid #f0f2f5;
  padding: 0 24rpx;
  font-size: 26rpx;
  background: #f8f9ff;
  box-sizing: border-box;
}

/* 记住账号 */
.remember-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 10rpx;
}
.remember-text {
  font-size: 24rpx;
  color: #4e5969;
}

/* 登录按钮 */
.login-btn {
  width: 100%;
  height: 96rpx;
  border-radius: 24rpx;
  border: none;
  background: linear-gradient(90deg, #4f6cff 0%, #8094ff 100%);
  box-shadow: 0 12rpx 32rpx rgba(79, 108, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
}
.login-btn-text {
  font-size: 30rpx;
  font-weight: 600;
  color: #ffffff;
}

.footer-tips {
  margin-top: 30rpx;
  text-align: center;
}
.tips-text {
  font-size: 22rpx;
  color: #86909c;
}

</style>