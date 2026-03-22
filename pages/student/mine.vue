<template>
  <view class="page">
	<view v-if="showPwdPopup" class="popup-mask" @click.self="closePwdPopup">
	      <view class="pwd-popup">
	        <text class="popup-title">修改密码</text>
	
	        <view class="pwd-form">
	          <input class="pwd-input" v-model="pwdOld" password placeholder="请输入原密码" />
	          <input class="pwd-input" v-model="pwdNew1" password placeholder="请输入新密码" />
	          <input class="pwd-input" v-model="pwdNew2" password placeholder="请再次输入新密码" />
	        </view>
	
	        <!-- ✅ 错误提示在弹窗内部 -->
	        <text v-if="pwdError" class="pwd-error">{{ pwdError }}</text>
	
	        <view class="popup-actions">
	          <view class="popup-btn cancel" @click="closePwdPopup">取消</view>
	          <view class="popup-btn confirm" :class="{ disabled: pwdSubmitting }" @click="submitChangePassword">
	            {{ pwdSubmitting ? '提交中…' : '确定' }}
	          </view>
	        </view>
	      </view>
	    </view>


    <!-- 顶部头像 -->
    <view class="avatar-section">
      <view class="avatar-wrap" @click="openAvatarPopup">
        <image :src="currentAvatar" class="avatar-img" mode="aspectFill" />
      </view>

      <view class="name-row">
        <text class="student-name">{{ username }}</text>
        <view class="pwd-btn" @click="openPwdPopup">修改密码</view>
      </view>
      <text class="student-tip">继续加油，成为更好的自己！</text>
    </view>

    <!-- 学习统计 -->
    <view class="stat-card">
      <view class="stat-item" @click="handleStatClick('finished')">
        <view class="stat-ll">
          <text class="stat-label">完成课程数</text>
        </view>
        <text class="stat-value">{{ stats.finished }}</text>
        <view class="stat-arrow">→</view>
      </view>
      <view class="divider"></view>

      <view class="stat-item" @click="handleStatClick('todayRank')">
        <view class="stat-ll1">
          <text class="stat-label">今日排名</text>
        </view>
        <text class="stat-value">{{ stats.todayRank }}</text>
        <view class="stat-arrow">→</view>
      </view>

      <view class="divider"></view>

      <view class="stat-item" @click="handleStatClick('weekRank')">
        <view class="stat-ll2">
          <text class="stat-label">本周排名</text>
        </view>
        <text class="stat-value">{{ stats.weekRank }}</text>
        <view class="stat-arrow">→</view>
      </view>
    </view>

    <!-- ✅ 学习历史 / 总结评价 / 其他功能 切换 -->
    <view class="switch-tabs">
      <text
        class="switch-tab"
        :class="{ active: mainTab === 'history' }"
        @click="switchMainTab('history')"
      >学习历史</text>

      <text
        class="switch-tab"
        :class="{ active: mainTab === 'summary' }"
        @click="switchMainTab('summary')"
      >总结评价</text>
	    <!-- 新增：其他功能按钮 -->
	    <text
	      class="switch-tab"
	      :class="{ active: mainTab === 'other' }"
	      @click="switchMainTab('other')"
	    >其他功能</text>
    </view>

    <!-- =========================
         ✅ 学习历史（原功能保留）
         ========================= -->
    <view v-if="mainTab === 'history'" class="history-container">
      <view class="history-header">
        <text class="history-title">学习历史</text>

        <view class="history-actions">
          <text
            class="history-tab"
            :class="{ active: historyMode === 'recent' }"
            @click="historyMode = 'recent'"
          >最近</text>

          <text
            class="history-tab"
            :class="{ active: historyMode === 'all' }"
            @click="historyMode = 'all'"
          >全部</text>

          <text
            class="history-tab"
            :class="{ active: historyMode === 'date' }"
            @click="historyMode = 'date'"
          >按日期</text>
        </view>
      </view>

      <!-- ===== 最近 / 全部 ===== -->
      <view v-if="historyMode !== 'date'">
        <view
          class="history-card"
          v-for="(item, index) in displayHistoryList"
          :key="'h_' + index"
          @click="handleHistoryClick(item)"
        >
          <image :src="item.courseCover" class="history-cover" mode="aspectFill" />

          <view class="history-info">
            <text class="history-name">{{ item.courseName }}</text>

            <text class="history-time">
              {{ item.endTime ? ('结束：' + item.endTime) : '学习中' }}
            </text>

            <view class="progress-bar-wrap">
              <text class="history-progress">
                进度：{{ item.endProgress }}%
              </text>

              <view class="progress-bar">
                <view
                  class="progress-fill"
                  :style="{ width: (item.endProgress ?? item.startProgress ?? 0) + '%' }"
                ></view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- ===== 按日期 ===== -->
      <view v-else class="history-date-group">
        <view v-for="(list, date) in groupedHistory" :key="date" class="date-section">
          <view class="history-date">
            <text class="date-text">{{ date }}</text>
            <view class="date-line"></view>
          </view>

          <view
            class="history-card"
            v-for="(item, index) in list"
            :key="'hd_' + date + '_' + index"
            @click="handleHistoryClick(item)"
          >
            <image :src="item.courseCover" class="history-cover" mode="aspectFill" />

            <view class="history-info">
              <text class="history-name">{{ item.courseName }}</text>

              <text class="history-time">
                {{ item.endTime ? ('结束：' + item.endTime.slice(11, 16)) : '学习中' }}
              </text>

              <text class="history-progress">
                进度： {{ item.endProgress }}%
              </text>
            </view>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="historyList.length === 0" class="history-empty">
        <image src="/static/empty-history.png" class="empty-img" mode="widthFix" />
        <text class="empty-text">暂无学习历史</text>
        <text class="empty-desc">快去开始你的第一次学习吧！</text>
      </view>
    </view>

    <!-- =========================
         ✅ 总结评价（新功能）
         ========================= -->
    <view v-else-if="mainTab === 'summary'" class="summary-container">
      <view class="history-header">
        <text class="history-title">总结评价</text>
        <view class="summary-actions">
          <view class="summary-refresh" :class="{ disabled: summaryLoading }" @click="fetchSummaryList">
            {{ summaryLoading ? '刷新中…' : '刷新' }}
          </view>
        </view>
      </view>

      <!-- 加载态 -->
      <view v-if="summaryLoading" class="summary-loading">
        <view class="loading-spinner"></view>
        <text class="loading-text">加载总结评价中…</text>
      </view>

      <!-- 列表 -->
      <view v-else>
        <view
          class="summary-card"
          v-for="(item, idx) in summaryList"
          :key="'s_' + (item.courseId || idx)"
          @click="openSummary(item)"
        >
          <view class="summary-top">
            <text class="summary-name">{{ item.courseName }}</text>
            <text class="summary-time">{{ formatTime(item.updateTime) }}</text>
          </view>

          <text class="summary-preview">
            {{ makePreview(item.summary) }}
          </text>

          <view class="summary-meta" v-if="item.metricsParsed">
            <text class="meta-pill">预习互动 {{ item.metricsParsed.turns.preview }}</text>
            <text class="meta-pill">复习互动 {{ item.metricsParsed.turns.review }}</text>
            <text class="meta-pill">拔高互动 {{ item.metricsParsed.turns.improve }}</text>
            <text class="meta-pill">总互动 {{ item.metricsParsed.turns.total }}</text>
          </view>
        </view>

        <!-- 空状态 -->
        <view v-if="summaryList.length === 0" class="history-empty">
          <image src="/static/empty-history.png" class="empty-img" mode="widthFix" />
          <text class="empty-text">暂无总结评价</text>
          <text class="empty-desc">完成课程学习后会自动生成评价</text>
        </view>
      </view>
    </view>

    <!-- =========================
         ✅ 其他功能（新增占位）
         ========================= -->
    <view v-else-if="mainTab === 'other'" class="other-container">
      <view class="history-header">
        <text class="history-title">其他功能</text>
      </view>
    
      <view class="func-grid">
        <view class="func-item" @click="handleFuncClick('code_check')">
          <image class="func-icon" src="/static/func_code_check.png" mode="aspectFill" />
          <text class="func-name">代码检查</text>
        </view>
    
        <view class="func-item" @click="handleFuncClick('code_generate')">
          <image class="func-icon" src="/static/func_code_generate.png" mode="aspectFill" />
          <text class="func-name">代码生成</text>
        </view>
    
        <view class="func-item" @click="handleFuncClick('code_explain')">
          <image class="func-icon" src="/static/func_code_explain.png" mode="aspectFill" />
          <text class="func-name">代码解释</text>
        </view>
    
        <view class="func-item" @click="handleFuncClick('prize')">
          <image class="func-icon" src="/static/func_prize.png" mode="aspectFill" />
          <text class="func-name">奖品兑换</text>
        </view>
      </view>
    </view>

    <!-- ✅ 评价详情弹窗 -->
    <view v-if="summaryOpen" class="popup-mask" @click.self="closeSummary">
      <view class="summary-popup">
        <text class="popup-title">课程总结评价</text>
        <text class="popup-sub">{{ currentSummary.courseName || '' }}</text>
        <text class="popup-sub2">{{ formatTime(currentSummary.updateTime) }}</text>

        <view class="metrics-box" v-if="currentSummary.metricsParsed">
          <view class="metrics-row">
            <text class="metrics-title">互动轮次</text>
            <text class="metrics-text">
              预习 {{ currentSummary.metricsParsed.turns.preview }} ｜复习 {{ currentSummary.metricsParsed.turns.review }} ｜拔高 {{ currentSummary.metricsParsed.turns.improve }} ｜总计 {{ currentSummary.metricsParsed.turns.total }}
            </text>
          </view>
          <view class="metrics-row">
            <text class="metrics-title">正确率</text>
            <text class="metrics-text">
              预习 {{ toPct(currentSummary.metricsParsed.acc.preview) }} ｜复习 {{ toPct(currentSummary.metricsParsed.acc.review) }} ｜拔高 {{ toPct(currentSummary.metricsParsed.acc.improve) }}
            </text>
          </view>
        </view>

        <scroll-view scroll-y class="summary-scroll">
          <text class="summary-full">{{ currentSummary.summary || '暂无内容' }}</text>
        </scroll-view>

        <view class="popup-actions">
          <view class="popup-btn confirm" @click="closeSummary">关闭</view>
        </view>
      </view>
    </view>

    <!-- ===== 自定义头像弹窗 ===== -->
    <view v-if="showAvatarPopup" class="popup-mask" @click.self="closeAvatarPopup">
      <view class="avatar-popup">
        <text class="popup-title">选择你喜欢的头像</text>

        <view class="avatar-grid">
          <image
            v-for="i in 10"
            :key="i"
            :src="`/static/profile_picture${i}.jpg`"
            class="avatar-option"
            :class="{ active: tempAvatarIndex === i }"
            mode="aspectFill"
            @click="selectAvatar(i)"
          />
        </view>

        <view class="popup-actions">
          <view class="popup-btn cancel" @click="closeAvatarPopup">取消</view>
          <view class="popup-btn confirm" @click="confirmAvatar">确定</view>
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
	  pwdError: '',
	  showPwdPopup: false,
	  pwdOld: '',
	  pwdNew1: '',
	  pwdNew2: '',
	  pwdSubmitting: false,
      // ✅ 主切换：history / summary / other
      mainTab: 'history',

      // ===== history =====
      historyMode: 'recent',
      recentLimit: 3,
      historyList: [],

      // ===== summary =====
      summaryLoading: false,
      summaryList: [],
      summaryOpen: false,
      currentSummary: {},

      // ===== user =====
      showAvatarPopup: false,
      username: '同学',
      currentAvatarIndex: 1,
      tempAvatarIndex: 1,
      currentAvatar: '/static/profile_picture1.jpg',

      stats: {
        finished: 0,
        duration: '0h',
        todayRank: '--',
        weekRank: '--'
      }
    }
  },

  computed: {
    // ✅ 学习历史：按 endTime 倒序，仅展示已结束
    sortedHistoryList() {
      const list = Array.isArray(this.historyList) ? [...this.historyList] : []
      const ended = list.filter(item => !!item.endTime)
      ended.sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime())
      return ended
    },

    displayHistoryList() {
      if (this.historyMode === 'recent') return this.sortedHistoryList.slice(0, this.recentLimit)
      if (this.historyMode === 'all') return this.sortedHistoryList
      return []
    },

    groupedHistory() {
      const map = {}
      this.sortedHistoryList.forEach(item => {
        const key = item.endTime ? item.endTime.slice(0, 10) : '学习中'
        if (!map[key]) map[key] = []
        map[key].push(item)
      })
      return map
    }
  },

  onLoad() {
    this.getUserInfo()
    this.getStats()
    this.getMyRanks()
    this.getFinishedCount()
    this.getHistory()
    // ✅ 默认不自动拉总结；切到 tab 再拉（也可以改成这里直接拉）
  },

  methods: {
	handleFuncClick(key) {
	  const routes = {
	    code_check: '/pages/student/ai_code_check',
	    code_generate: '/pages/student/ai_code_generate',
	    code_explain: '/pages/student/ai_code_explain',
	    prize: '/pages/student/prize_exchange'
	  }
	
	  const url = routes[key]
	
	  // 还没做页面：先 toast
	  if (!url) {
	    uni.showToast({ title: '功能开发中', icon: 'none' })
	    return
	  }
	
	  uni.navigateTo({ url })
	

	},
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
	
	    // ✅ 成功：可以 toast（成功一般没关系），也可以直接提示文字
	    if (String(res).trim() === 'ok') {
	      uni.showToast({ title: '修改成功', icon: 'success' })
	      this.closePwdPopup()
	      return
	    }
	
	    // ✅ 如果后端返回了非 ok 的文本，也当成错误显示在弹窗里
	    this.pwdError = String(res || '修改失败')
	  } catch (e) {
	    // ✅ 失败：永远写到弹窗内，不用 toast
	    const msg = e?.data?.msg || e?.data || e?.message || '修改失败'
	    this.pwdError = String(msg)
	  } finally {
	    this.pwdSubmitting = false
	  }
	},
    // =============================
    // ✅ 8081 base + token
    // =============================
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
          timeout: 1115000,
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

    // =============================
    // ✅ 切换主 tab
    // =============================
    switchMainTab(tab) {
      if (this.mainTab === tab) return
      this.mainTab = tab
      if (tab === 'summary' && this.summaryList.length === 0) {
        this.fetchSummaryList()
      }
      // 可在这里添加 other tab 的逻辑
      if (tab === 'other') {
        // 点击其他功能时的初始化逻辑
        console.log('切换到其他功能tab')
      }
    },

    // =============================
    // ✅ 总结评价：拉列表（8081）
    // GET /api/student/course/summary/list
    // =============================
    async fetchSummaryList() {
      if (this.summaryLoading) return
      this.summaryLoading = true
      try {
        const res = await this.request8081({
          path: '/api/student/course/summary/list',
          method: 'GET'
        })
        const u = this.unwrap(res)
        const arr = Array.isArray(u.data) ? u.data : []

        // 统一字段 + 解析 metricsJson
        this.summaryList = arr.map(x => {
          const summary = x.studentSummary || x.student_summary || x.summary || ''
          const metricsJson = x.metricsJson || x.metrics_json || ''
          return {
            courseId: x.courseId,
            courseName: x.courseName,
            updateTime: x.updateTime,
            status: x.status,
            missingParts: x.missingParts,
            summary,
            metricsJson,
            metricsParsed: this.parseMetrics(metricsJson)
          }
        })
      } catch (e) {
        const msg = e?.data?.msg || e?.message || '获取总结评价失败'
        uni.showToast({ title: msg, icon: 'none' })
        this.summaryList = []
      } finally {
        this.summaryLoading = false
      }
    },

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

    openSummary(item) {
      this.currentSummary = item || {}
      this.summaryOpen = true
    },

    closeSummary() {
      this.summaryOpen = false
      this.currentSummary = {}
    },

    makePreview(text) {
      const s = String(text || '').trim()
      if (!s) return '暂无评价内容'
      return s.length > 56 ? (s.slice(0, 56) + '…') : s
    },

    formatTime(t) {
      if (!t) return ''
      // "2026-02-21T14:32:23" -> "2026-02-21 14:32"
      return String(t).replace('T', ' ').slice(0, 16)
    },

    toPct(v) {
      const n = Number(v)
      if (!isFinite(n)) return '--'
      return Math.round(n * 100) + '%'
    },

    // =============================
    // ✅ 原有：学习历史/统计/用户
    // =============================
    goBack() {
      uni.reLaunch({ url: '/pages/student/student_homepage' })
    },

    handleStatClick(type) {
      console.log('点击统计项:', type)
    },
    handleHistoryClick(item) {
      console.log('点击学习记录:', item)
    },

    getHistory() {
      request({ url: '/api/student/history' }).then(res => {
        this.historyList = Array.isArray(res) ? res : []
      })
    },

    getFinishedCount() {
      request({
        url: '/api/student/courses',
        data: { status: 'finished' }
      }).then(res => {
        const list = Array.isArray(res) ? res : []
        this.stats.finished = list.length
      })
    },

    getMyRanks() {
      request({
        url: '/api/student/home/rank',
        data: { type: 'today' }
      }).then(res => {
        this.stats.todayRank =
          Array.isArray(res.list) && res.list.length === 0
            ? '暂无排名'
            : (res.myRank && res.myRank > 0 ? res.myRank : '暂无排名')
      })

      request({
        url: '/api/student/home/rank',
        data: { type: 'week' }
      }).then(res => {
        this.stats.weekRank =
          Array.isArray(res.list) && res.list.length === 0
            ? '暂无排名'
            : (res.myRank && res.myRank > 0 ? res.myRank : '暂无排名')
      })
    },

    getUserInfo() {
      request({ url: '/api/auth/me' }).then(res => {
        this.username = res.name || '同学'
        this.currentAvatar = res.avatar || '/static/profile_picture1.jpg'

        const match = this.currentAvatar.match(/profile_picture(\d+)\.jpg/)
        this.currentAvatarIndex = match ? Number(match[1]) : 1
      })
    },

    getStats() {
      request({ url: '/api/student/mine/stats' }).then(res => {
        if (res) this.stats = res
      })
    },

    /* ===== 头像弹窗 ===== */
    openAvatarPopup() {
      this.tempAvatarIndex = this.currentAvatarIndex
      this.showAvatarPopup = true
    },

    closeAvatarPopup() {
      this.showAvatarPopup = false
    },

    selectAvatar(index) {
      this.tempAvatarIndex = index
    },

    confirmAvatar() {
      const avatar = `/static/profile_picture${this.tempAvatarIndex}.jpg`
      this.currentAvatar = avatar
      this.currentAvatarIndex = this.tempAvatarIndex
      this.closeAvatarPopup()

      request({
        url: '/api/student/home/avatar',
        method: 'POST',
        data: { avatar }
      })
    }
  }
}
</script>

<style scoped>
/* 全局样式 */
.page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f5f7ff 0%, #ffffff 100%);
  padding: 40rpx 32rpx;
}

/* 顶部标题区域 */
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

/* ===== 头像区域 ===== */
.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 48rpx;
  padding: 40rpx 0;
}
.avatar-wrap {
  position: relative;
  width: 220rpx;
  height: 220rpx;
  border-radius: 50%;
  border: 4rpx solid #ffffff;
  overflow: hidden;
  box-shadow: 0 8rpx 24rpx rgba(79, 108, 255, 0.15);
  transition: transform 0.3s ease;
}
.avatar-wrap:active { transform: scale(0.98); }
.avatar-img { width: 100%; height: 100%; }

.student-name {
  margin-top: 24rpx;
  font-size: 36rpx;
  font-weight: 600;
  color: #333333;
}
.student-tip {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #999999;
}

/* ✅ 修改密码按钮 - 极致美化 */
.name-row{
  display:flex;
  align-items:center;
  gap: 16rpx;
  margin-top: 24rpx;
}
.pwd-btn{
  padding: 12rpx 24rpx;
  font-size: 24rpx;
  color: #ffffff;
  background: linear-gradient(135deg, #4f6cff 0%, #6b86ff 100%);
  border: 2rpx solid transparent;
  border-radius: 999rpx;
  box-shadow: 0 6rpx 18rpx rgba(79, 108, 255, 0.2);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}
/* 按钮流光效果 */
.pwd-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  transition: left 0.8s ease;
}
.pwd-btn:hover::before {
  left: 100%;
}
.pwd-btn:hover {
  transform: translateY(-2rpx);
  box-shadow: 0 8rpx 24rpx rgba(79, 108, 255, 0.25);
}
.pwd-btn:active{ 
  transform: scale(0.96);
  opacity: .9;
  box-shadow: 0 4rpx 12rpx rgba(79, 108, 255, 0.2);
}

/* ===== 统计卡片 ===== */
.stat-card {
  display: flex;
  align-items: center;
  background: #ffffff;
  border-radius: 20rpx;
  padding: 32rpx 0;
  margin-bottom: 28rpx;
  box-shadow: 0 6rpx 20rpx rgba(0, 0, 0, 0.05);
  overflow: hidden;
}
.stat-item {
  flex: 1;
  text-align: center;
  padding: 16rpx 0;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;
}
.stat-item:active { background-color: #f8f9ff; }
.stat-label { font-size: 26rpx; color: #666666; margin-bottom: 8rpx; }
.stat-value { font-size: 36rpx; font-weight: 700; color: #4f6cff; line-height: 1.2; }
.stat-arrow {
  position: absolute;
  right: 20rpx;
  top: 50%;
  transform: translateY(-50%);
  font-size: 20rpx;
  color: #dddddd;
  opacity: 0;
  transition: opacity 0.2s ease;
}
.stat-item:active .stat-arrow { opacity: 1; }
.divider { width: 2rpx; height: 60rpx; background: #f0f0f0; }

/* ✅ 主切换 tabs */
.switch-tabs{
  display:flex;
  justify-content:center;
  gap: 24rpx;
  margin: 4rpx 0 36rpx;
}
.switch-tab{
  padding: 12rpx 34rpx;
  border-radius: 999rpx;
  font-size: 26rpx;
  color:#4f6cff;
  border: 2rpx solid #e5e9ff;
  background:#fff;
  transition: all .2s ease;
}
.switch-tab.active{
  background: linear-gradient(90deg, #4f6cff 0%, #6b86ff 100%);
  color:#fff;
  border-color: transparent;
  box-shadow: 0 8rpx 20rpx rgba(79, 108, 255, 0.22);
}

/* ===== 历史记录 ===== */
.history-container { margin-top: 8rpx; }
.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}
.history-title { font-size: 32rpx; font-weight: 600; color: #333333; }

.history-actions { display: flex; gap: 32rpx; }
.history-tab {
  font-size: 26rpx;
  color: #999999;
  padding: 8rpx 0;
  position: relative;
  transition: color 0.2s ease;
}
.history-tab.active { color: #4f6cff; font-weight: 600; }
.history-tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 24rpx;
  height: 4rpx;
  background: #4f6cff;
  border-radius: 2rpx;
}

/* 按日期分组样式 */
.history-date-group { margin-top: 8rpx; }
.date-section { margin-bottom: 32rpx; }
.history-date {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
  padding-left: 8rpx;
}
.date-text {
  font-size: 26rpx;
  color: #666666;
  font-weight: 500;
  background: #f5f7ff;
  padding: 6rpx 16rpx;
  border-radius: 16rpx;
  margin-right: 16rpx;
}
.date-line { flex: 1; height: 1rpx; background: #eeeeee; }

/* 历史卡片 */
.history-card {
  display: flex;
  gap: 24rpx;
  padding: 28rpx;
  background: #ffffff;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.history-card:active { transform: translateY(2rpx); box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04); }
.history-cover {
  width: 120rpx;
  height: 120rpx;
  border-radius: 12rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
}
.history-info { flex: 1; display: flex; flex-direction: column; justify-content: space-between; }
.history-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #333333;
  margin-bottom: 8rpx;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.history-time { font-size: 24rpx; color: #999999; margin-top: 4rpx; }
.progress-bar-wrap { width: 100%; margin-top: 12rpx; }
.history-progress { font-size: 24rpx; color: #666666; display: block; margin-bottom: 8rpx; }
.progress-bar {
  width: 100%;
  height: 8rpx;
  background: #f5f5f5;
  border-radius: 4rpx;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4f6cff 0%, #758cff 100%);
  border-radius: 4rpx;
  transition: width 0.5s ease;
}

/* ✅ 总结评价 */
.summary-container{ margin-top: 8rpx; }
.summary-actions{ display:flex; align-items:center; }
.summary-refresh{
  padding: 10rpx 22rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  color:#4f6cff;
  border: 2rpx solid #e5e9ff;
  background:#fff;
}
.summary-refresh.disabled{ opacity: .5; }

.summary-loading{
  display:flex;
  flex-direction: column;
  align-items:center;
  justify-content:center;
  gap: 18rpx;
  padding: 80rpx 0;
}
.loading-spinner{
  width: 48rpx;
  height: 48rpx;
  border: 4rpx solid #e5e9ff;
  border-top: 4rpx solid #4f6cff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
.loading-text{ font-size: 26rpx; color:#86909c; }
@keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }

.summary-card{
  background:#fff;
  border-radius: 18rpx;
  padding: 26rpx;
  margin-bottom: 18rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04);
}
.summary-top{
  display:flex;
  align-items:baseline;
  justify-content: space-between;
  gap: 16rpx;
}
.summary-name{
  font-size: 28rpx;
  font-weight: 700;
  color:#1d2129;
  flex: 1;
  display:-webkit-box;
  -webkit-line-clamp:1;
  -webkit-box-orient:vertical;
  overflow:hidden;
}
.summary-time{
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
.summary-meta{
  margin-top: 14rpx;
  display:flex;
  flex-wrap: wrap;
  gap: 10rpx;
}
.meta-pill{
  font-size: 22rpx;
  color:#4f6cff;
  background:#eef2ff;
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
}

/* 其他功能容器样式（和历史/总结保持一致） */
.other-container { margin-top: 8rpx; }

/* 空状态 */
.history-empty {
  text-align: center;
  padding: 80rpx 0;
  background: #ffffff;
  border-radius: 16rpx;
  margin-top: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}
.empty-img { width: 200rpx; margin-bottom: 24rpx; opacity: 0.8; }
.empty-text { font-size: 28rpx; color: #999999; margin-bottom: 12rpx; }
.empty-desc { font-size: 24rpx; color: #cccccc; }

/* ===== 弹窗样式 ===== */
.popup-mask {
  position: fixed;
  left: 0;
  top: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(4rpx);
}

/* 头像弹窗 */
.avatar-popup {
  width: 680rpx;
  background: #ffffff;
  border-radius: 24rpx;
  padding: 40rpx;
  box-shadow: 0 12rpx 40rpx rgba(0, 0, 0, 0.15);
}
.popup-title {
  text-align: center;
  font-size: 32rpx;
  font-weight: 600;
  color: #333333;
  margin-bottom: 16rpx;
}
.avatar-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 24rpx;
  margin-bottom: 40rpx;
}
.avatar-option {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  border: 4rpx solid transparent;
  transition: transform 0.2s ease;
}
.avatar-option:active { transform: scale(0.95); }
.avatar-option.active {
  border-color: #4f6cff;
  box-shadow: 0 0 0 4rpx rgba(79, 108, 255, 0.1);
}

/* ✅ 总结评价弹窗 */
.summary-popup{
  width: 720rpx;
  max-height: 86vh;
  background:#fff;
  border-radius: 24rpx;
  padding: 36rpx;
  box-shadow: 0 12rpx 40rpx rgba(0,0,0,0.18);
}
.popup-sub{
  text-align:center;
  margin-top: 6rpx;
  font-size: 26rpx;
  color:#64748b;
}
.popup-sub2{
  text-align:center;
  margin-top: 6rpx;
  font-size: 22rpx;
  color:#94a3b8;
}
.metrics-box{
  margin-top: 18rpx;
  background:#f8f9ff;
  border: 1rpx solid #e5e9ff;
  border-radius: 18rpx;
  padding: 18rpx;
}
.metrics-row{ margin-bottom: 12rpx; }
.metrics-row:last-child{ margin-bottom: 0; }
.metrics-title{
  font-size: 24rpx;
  font-weight: 700;
  color:#1d2129;
  display:block;
  margin-bottom: 6rpx;
}
.metrics-text{
  font-size: 24rpx;
  color:#4e5969;
  line-height: 1.6;
}
.summary-scroll{
  margin-top: 18rpx;
  max-height: 48vh;
}
.summary-full{
  font-size: 26rpx;
  color:#1d2129;
  line-height: 1.75;
  white-space: pre-wrap;
}

/* 弹窗按钮通用样式 */
.popup-actions { display: flex; gap: 24rpx; margin-top: 22rpx; }
.popup-btn {
  flex: 1;
  text-align: center;
  padding: 20rpx 0;
  border-radius: 16rpx;
  font-size: 28rpx;
  font-weight: 500;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}
/* 取消按钮 */
.popup-btn.cancel { 
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); 
  color: #64748b;
  border: 1rpx solid #e2e8f0;
}
.popup-btn.cancel:hover {
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
}
.popup-btn.cancel:active { 
  background: #e2e8f0;
  transform: scale(0.98);
}
/* 确认按钮 */
.popup-btn.confirm {
  background: linear-gradient(135deg, #4f6cff 0%, #6b86ff 100%);
  color: #ffffff;
  box-shadow: 0 6rpx 20rpx rgba(79, 108, 255, 0.25);
  border: 1rpx solid transparent;
}
/* 确认按钮流光效果 */
.popup-btn.confirm::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  transition: left 0.8s ease;
}
.popup-btn.confirm:hover::before {
  left: 100%;
}
.popup-btn.confirm:hover {
  transform: translateY(-2rpx);
  box-shadow: 0 8rpx 24rpx rgba(79, 108, 255, 0.3);
}
.popup-btn.confirm:active {
  transform: scale(0.98);
  box-shadow: 0 4rpx 12rpx rgba(79, 108, 255, 0.2);
}
.popup-btn.confirm.disabled{
  opacity:.5;
  pointer-events:none;
  background: linear-gradient(135deg, #94a3b8 0%, #64748b 100%);
  box-shadow: none;
}

/* ✅ 修改密码弹窗 - 极致美化 */
.pwd-popup{
  width: 500rpx;
  background: linear-gradient(135deg, #ffffff 0%, #fefeff 100%);
  border-radius: 28rpx;
  padding: 48rpx;
  box-shadow: 0 16rpx 48rpx rgba(0,0,0,0.18);
  border: 1rpx solid rgba(79, 108, 255, 0.1);
  position: relative;
  overflow: hidden;
}
/* 弹窗顶部渐变装饰 */
.pwd-popup::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 8rpx;
  background: linear-gradient(90deg, #4f6cff, #6b86ff, #8aa0ff);
  border-radius: 28rpx 28rpx 0 0;
}
.pwd-popup .popup-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #1d2129;
  margin-bottom: 32rpx;
  letter-spacing: 0.5rpx;
}
.pwd-form{
  margin-top: 8rpx;
  display:flex;
  flex-direction: column;
  gap: 20rpx;
}
.pwd-input{
  height: 92rpx;
  border-radius: 20rpx;
  border: 1rpx solid rgba(79,108,255,0.2);
  padding: 0 28rpx;
  font-size: 28rpx;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%);
  box-shadow: 0 4rpx 12rpx rgba(79, 108, 255, 0.05);
  transition: all 0.3s ease;
}
.pwd-input:focus {
  border-color: #4f6cff;
  box-shadow: 0 0 0 6rpx rgba(79, 108, 255, 0.1);
  outline: none;
}
.pwd-input::placeholder {
  color: #94a3b8;
  font-size: 26rpx;
}

.pwd-error{
  margin-top: 14rpx;
  padding: 14rpx 175rpx;
  font-size: 24rpx;
  color: #ff4d4f;
  background: rgba(255, 77, 79, 0.08);
  border: 1px solid rgba(255, 77, 79, 0.25);
  border-radius: 24rpx;
  text-align: center;
}
.pwd-btn{
  /* 调整尺寸：更小的内边距和字号 */
  padding: 6rpx 16rpx;
  font-size: 16rpx;
  
  /* 位置调整：绝对定位到名字右下方 */
  position: absolute;
  top: 10rpx;
  right: 0;
  
  /* 其他样式保留，仅调整尺寸 */
  color: #ffffff;
  background: linear-gradient(135deg, #4f6cff 0%, #6b86ff 100%);
  border: 2rpx solid transparent;
  border-radius: 999rpx;
  box-shadow: 0 4rpx 12rpx rgba(79, 108, 255, 0.15);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}
/* ===== 其他功能：四宫格按钮 ===== */
.func-grid{
  margin-top: 18rpx;
  background: #ffffff;
  border-radius: 20rpx;
  padding: 28rpx 18rpx;
  box-shadow: 0 6rpx 20rpx rgba(0,0,0,0.05);

  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18rpx;
}

.func-item{
  display:flex;
  flex-direction: column;
  align-items:center;
  justify-content:center;
  padding: 16rpx 10rpx;
  border-radius: 18rpx;
  transition: transform .15s ease, background-color .15s ease;
}

.func-item:active{
  transform: scale(0.97);
  background: #f6f8ff;
}

.func-icon{
  width: 110rpx;
  height: 110rpx;
  border-radius: 50%;
  border: 4rpx solid #ffffff;
  box-shadow: 0 8rpx 22rpx rgba(79,108,255,0.18);
  background: #f5f7ff;
}

.func-name{
  margin-top: 14rpx;
  font-size: 24rpx;
  color: #334155;
  font-weight: 600;
}
</style>