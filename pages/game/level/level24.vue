<template>
  <view class="page">
    <!-- 头部 -->
    <view class="header">
      <text class="title">第 24 关：数据管理员 🗂️</text>
      <text class="tip">任务：用“编码”高效查找与筛选学生</text>
    </view>

    <!-- HUD -->
    <view class="hud">
      <text class="badge">🔎 已完成：{{ progress }}/2</text>
      <text class="small">⏱ 用时：{{ formatTime(elapsedMs) }}</text>
    </view>

    <view class="board">
      <view class="board-bg" />

      <!-- 提示栏 -->
      <view class="hintbar">
        <view class="topic">本局重点：编码用于数据管理｜查找、筛选更高效</view>
        <text class="hinttext">
          系统里有一堆学生：
          <text class="linebreak" />
          1）用学号精准找到一个人
          <text class="linebreak" />
          2）用班级一次筛出一组人
        </text>
      </view>

      <view class="content">
        <!-- 查询区 -->
        <view class="query-card">
          <text class="qc-title">🔍 查找 / 筛选</text>

          <view class="row">
            <text class="label">按学号找人：</text>
            <input
              class="input"
              v-model="searchId"
              placeholder="如 202401"
              :disabled="solvedSearch || success"
              @input="onSearchInput"
            />
            <view class="btn small" @click="doSearch" :class="{ disabled: solvedSearch || success }">查找</view>
          </view>

          <view class="row">
            <text class="label">按班级筛选：</text>
            <picker
              mode="selector"
              :range="classOptions"
              @change="onPickClass"
              :disabled="solvedFilter || success"
            >
              <view class="picker" :class="{ picked: !!pickedClass }">
                {{ pickedClass || '选择班级' }}
              </view>
            </picker>
            <view
              class="btn small"
              @click="doFilter"
              :class="{ disabled: solvedFilter || success || !pickedClass }"
            >
              筛选
            </view>
          </view>

          <view class="row tips">
            <text class="tiny">
              🔸 学号=唯一编码（精确定位）｜班级=分类编码（批量筛选）
            </text>
          </view>
        </view>

        <!-- 学生表 -->
        <view class="table">
          <view class="table-head">
            <text class="th">学号</text>
            <text class="th">姓名</text>
            <text class="th">班级</text>
          </view>

          <scroll-view class="tbody" scroll-y>
            <view
              class="row2"
              v-for="s in displayList"
              :key="s.id"
              :class="{ highlight: highlightId === s.id }"
            >
              <text class="td mono">{{ s.id }}</text>
              <text class="td">{{ s.name }}</text>
              <text class="td">{{ s.class }}</text>
            </view>
          </scroll-view>
        </view>

        <!-- 任务条 -->
        <view class="task-card">
          <view class="task-line">
            <view class="dot" :class="{ ok: solvedSearch }"></view>
            <text class="task-text">任务1：按学号找到一个人</text>
          </view>
          <view class="task-line">
            <view class="dot" :class="{ ok: solvedFilter }"></view>
            <text class="task-text">任务2：按班级筛选一组人</text>
          </view>
          <view class="task-actions">
            <view class="btn reset" @click="resetRound" :class="{ disabled: success }">↩ 重新开始</view>
            <view class="btn all" @click="showAll" :class="{ disabled: success }">📋 显示全部</view>
          </view>
        </view>
      </view>
    </view>

    <!-- 成功弹窗 -->
    <view v-if="success" class="popup" @touchmove.stop.prevent>
      <view class="popup-card">
        <text class="pop-title">🎉 通关成功！</text>
        <text class="pop-desc">
          你学会了：
          <text class="linebreak" />
          1）用学号（唯一编码）快速定位一个人；
          <text class="linebreak" />
          2）用班级（分类编码）一次筛选一组人；
          <text class="linebreak" />
          编码让数据管理更高效！
          <text class="linebreak" />
          用时：{{ formatTime(elapsedMs) }}｜错误：{{ wrongTimes }} 次｜星星：{{ earnedStars }}⭐
        </text>
        <view class="pop-actions">
          <view class="pop-btn" @click="newRound">再玩一次</view>
          <view class="pop-btn primary" @click="goNext">下一关 →</view>
        </view>
      </view>
    </view>

    <!-- 轻提示 -->
    <view v-if="toast.show" class="mini-toast">
      <text>{{ toast.text }}</text>
    </view>
  </view>
</template>

<script>
import request from '@/common/request.js'

export default {
  data() {
    return {
      levelId: 24,

      // 后端进度
      levelProgress: { unlocked: true, stars: 0, bestSteps: null },
      reported: false,

      // 计时
      elapsedMs: 0,
      clock: null,
      startAt: 0,

      // 状态
      solvedSearch: false,
      solvedFilter: false,
      success: false,

      // 统计
      wrongTimes: 0,
      earnedStars: 0,

      // 查找/筛选
      searchId: '',
      pickedClass: '',
      highlightId: '',

      // 数据（可替换为接口）
      students: [
        { id: '202401', name: '小明', class: '一班' },
        { id: '202402', name: '小红', class: '一班' },
        { id: '202403', name: '小刚', class: '二班' },
        { id: '202404', name: '小美', class: '二班' },
        { id: '202405', name: '小强', class: '三班' },
        { id: '202406', name: '小丽', class: '三班' },
        { id: '202407', name: '小乐', class: '四班' },
        { id: '202408', name: '小雨', class: '四班' }
      ],
      displayList: [],

      // UI
      toast: { show: false, text: '' }
    }
  },

  computed: {
    classOptions() {
      const set = new Set(this.students.map(s => s.class))
      return Array.from(set)
    },
    progress() {
      return (this.solvedSearch ? 1 : 0) + (this.solvedFilter ? 1 : 0)
    }
  },

  onLoad() {
    this.loadLevelProgress()
    this.newRound()
  },

  onUnload() {
    this.stopClock()
    clearTimeout(this._t)
  },

  methods: {
    // ===== 后端：读取进度（可选）=====
    async loadLevelProgress() {
      try {
        const res = await request({ url: `/api/game/levels/${this.levelId}`, method: 'GET' })
        this.levelProgress = {
          unlocked: res.unlocked === 1 || res.unlocked === true,
          stars: Number(res.stars || 0),
          bestSteps: res.bestSteps ?? res.best_steps ?? null
        }

        if (!this.levelProgress.unlocked) {
          uni.showToast({ title: '该关卡未解锁', icon: 'none' })
          setTimeout(() => uni.redirectTo({ url: '/pages/game/level-select' }), 500)
        }
      } catch (e) {}
    },

    // ===== 计时 =====
    startClock() {
      this.stopClock()
      this.elapsedMs = 0
      this.startAt = Date.now()
      this.clock = setInterval(() => {
        this.elapsedMs = Date.now() - this.startAt
      }, 100)
    },
    stopClock() {
      if (this.clock) {
        clearInterval(this.clock)
        this.clock = null
      }
    },
    formatTime(ms) {
      const totalSec = Math.floor(ms / 1000)
      const m = Math.floor(totalSec / 60)
      const s = totalSec % 60
      const ms2 = Math.floor((ms % 1000) / 10)
      const mm = m < 10 ? '0' + m : '' + m
      const ss = s < 10 ? '0' + s : '' + s
      const msStr = ms2 < 10 ? '0' + ms2 : '' + ms2
      return `${mm}:${ss}.${msStr}`
    },

    // ===== 星星规则 =====
    calcStars({ usedMs, wrongTimes }) {
      const sec = usedMs / 1000
      if (sec <= 60 && wrongTimes <= 1) return 3
      if (sec <= 90) return 2
      return 1
    },

    // ===== 上报通关 =====
    async reportPass({ steps, usedMs, stars }) {
      if (this.reported) return
      this.reported = true
      try {
        await request({
          url: `/api/game/levels/${this.levelId}/complete`,
          method: 'POST',
          data: {
            stars,
            steps,
            usedTimeMs: usedMs,
            usedTimeSec: Math.round(usedMs / 1000),
            wrongTimes: this.wrongTimes
          }
        })

        this.levelProgress.stars = Math.max(this.levelProgress.stars || 0, stars)
        if (this.levelProgress.bestSteps == null) this.levelProgress.bestSteps = steps
        else this.levelProgress.bestSteps = Math.min(this.levelProgress.bestSteps, steps)
      } catch (e) {}
    },

    // ===== 新一局 =====
    newRound() {
      this.success = false
      this.reported = false
      this.solvedSearch = false
      this.solvedFilter = false
      this.wrongTimes = 0
      this.earnedStars = 0

      this.searchId = ''
      this.pickedClass = ''
      this.highlightId = ''

      this.displayList = this.students

      this.stopClock()
      this.startClock()
      uni.vibrateShort({ type: 'light' })
      this.toastMini('🗂️ 用编码来管理数据吧！')
    },

    resetRound() {
      if (this.success) return
      this.newRound()
    },

    showAll() {
      if (this.success) return
      this.displayList = this.students
      this.highlightId = ''
      uni.vibrateShort({ type: 'light' })
      this.toastMini('已显示全部学生')
    },

    onSearchInput() {
      // 只允许数字，最多 6 位（按你的学号规则改）
      let v = (this.searchId || '').replace(/\D/g, '')
      if (v.length > 6) v = v.slice(0, 6)
      this.searchId = v
    },

    doSearch() {
      if (this.success || this.solvedSearch) return

      if (!this.searchId) {
        this.wrongTimes += 1
        this.toastMini('先输入学号～')
        return
      }

      const s = this.students.find(x => x.id === this.searchId)
      if (!s) {
        this.wrongTimes += 1
        uni.vibrateShort({ type: 'light' })
        this.toastMini('❌ 没找到该学号（学号要完全匹配）')
        return
      }

      this.displayList = [s]
      this.highlightId = s.id
      this.solvedSearch = true

      uni.vibrateShort({ type: 'light' })
      this.toastMini('✅ 找到了！学号能精准定位')
      this.checkFinish()
    },

    onPickClass(e) {
      this.pickedClass = this.classOptions[e.detail.value]
    },

    doFilter() {
      if (this.success || this.solvedFilter) return

      if (!this.pickedClass) {
        this.wrongTimes += 1
        this.toastMini('先选择一个班级～')
        return
      }

      const list = this.students.filter(s => s.class === this.pickedClass)
      if (!list.length) {
        this.wrongTimes += 1
        this.toastMini('❌ 这个班级没有学生')
        return
      }

      this.displayList = list
      this.highlightId = ''
      this.solvedFilter = true

      uni.vibrateShort({ type: 'light' })
      this.toastMini('✅ 已筛选！分类编码适合批量操作')
      this.checkFinish()
    },

    async checkFinish() {
      if (!(this.solvedSearch && this.solvedFilter)) return

      this.success = true
      this.stopClock()
      this.earnedStars = this.calcStars({ usedMs: this.elapsedMs, wrongTimes: this.wrongTimes })
      uni.vibrateLong()

      // 上报（可选）
      await this.reportPass({
        steps: 2,
        usedMs: this.elapsedMs,
        stars: this.earnedStars
      })
    },

    toastMini(text) {
      this.toast.text = text
      this.toast.show = true
      clearTimeout(this._t)
      this._t = setTimeout(() => (this.toast.show = false), 900)
    },

    goBack() {
      uni.navigateBack({ delta: 1 })
    },

    goNext() {
      uni.redirectTo({ url: '/pages/game/level/level25' })
    }
  }
}
</script>

<style scoped>
.page{
  height: 130vh;
  overflow: hidden;
  padding: 40rpx 30rpx;
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 55%, #89f7fe 100%);
}

/* header */
.header{
  position: relative;
  text-align: center;
  color:#fff;
  margin-bottom: 12rpx;
}
.back-btn{
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 60rpx;
  height: 60rpx;
  border-radius: 999rpx;
  background: rgba(255,255,255,0.22);
  display:flex;
  align-items:center;
  justify-content:center;
  font-size: 32rpx;
  font-weight: 900;
}
.title{ font-size: 40rpx; font-weight: 900; }
.tip{ display:block; margin-top: 8rpx; font-size: 24rpx; opacity: 0.95; }

/* hud */
.hud{
  display:flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10rpx;
  gap: 12rpx;
}
.badge{
  display:inline-flex;
  align-items:center;
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255,255,255,0.22);
  color: #fff;
  font-size: 24rpx;
  font-weight: 900;
}
.small{
  color:#eaf2ff;
  font-size: 22rpx;
  opacity: 0.95;
}

/* board */
.board{
  position: relative;
  background: rgba(255,255,255,0.95);
  border-radius: 32rpx;
  padding: 18rpx;
  box-shadow: 0 18rpx 50rpx rgba(0,0,0,0.18);
  overflow: hidden;
  border: 2rpx solid rgba(255,255,255,0.8);

  height: calc(100vh - 40rpx - 30rpx - 0rpx);
  display:flex;
  flex-direction: column;
  gap: 10rpx;
  min-height: 0;
}
.board-bg{
  position:absolute;
  inset:0;
  background:
    radial-gradient(circle at 20% 20%, rgba(255, 234, 0, 0.10), transparent 40%),
    radial-gradient(circle at 80% 25%, rgba(0, 200, 255, 0.10), transparent 45%),
    radial-gradient(circle at 50% 80%, rgba(255, 0, 150, 0.08), transparent 50%);
  z-index:0;
}

/* hint */
.hintbar{
  position: relative;
  z-index: 1;
  padding: 14rpx 16rpx;
  border-radius: 22rpx;
  background: rgba(79,108,255,0.08);
  border: 2rpx solid rgba(79,108,255,0.14);
}
.hinttext{
  color:#2b3a66;
  font-size: 24rpx;
  line-height: 1.5;
  font-weight: 700;
}
.topic{
  margin: 10rpx 0;
  padding: 12rpx 18rpx;
  border-radius: 18rpx;
  background: rgba(255,159,67,0.15);
  color:#2b3a66;
  font-size: 26rpx;
  font-weight: 900;
  text-align:center;
}
.linebreak{ display:block; height: 10rpx; }

/* content */
.content{
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  display:flex;
  flex-direction: column;
  gap: 10rpx;
  overflow: hidden;
}

/* query card */
.query-card{
  border-radius: 22rpx;
  background: rgba(255,255,255,0.92);
  border: 2rpx solid rgba(0,0,0,0.06);
  box-shadow: 0 10rpx 22rpx rgba(0,0,0,0.08);
  padding: 14rpx;
}
.qc-title{
  display:block;
  font-size: 24rpx;
  font-weight: 900;
  color:#2b3a66;
  margin-bottom: 10rpx;
}
.row{
  display:flex;
  align-items:center;
  gap: 10rpx;
  margin-bottom: 10rpx;
}
.row:last-child{ margin-bottom: 0; }
.label{
  flex: 0 0 auto;
  font-size: 22rpx;
  font-weight: 900;
  color:#2b3a66;
}
.input{
  flex: 1;
  height: 64rpx;
  border-radius: 16rpx;
  background: rgba(79,108,255,0.08);
  border: 2rpx solid rgba(79,108,255,0.18);
  padding: 0 16rpx;
  font-size: 24rpx;
  font-weight: 900;
  color:#2b3a66;
}
.picker{
  flex: 1;
  height: 64rpx;
  border-radius: 16rpx;
  background: rgba(255,159,67,0.12);
  border: 2rpx solid rgba(255,159,67,0.20);
  display:flex;
  align-items:center;
  padding: 0 16rpx;
  font-size: 24rpx;
  font-weight: 900;
  color:#2b3a66;
}
.picker.picked{
  background: rgba(46,213,115,0.12);
  border-color: rgba(46,213,115,0.22);
}
.tips{
  margin-top: 4rpx;
}
.tiny{
  font-size: 20rpx;
  color:#6b7280;
  font-weight: 800;
}

/* table */
.table{
  flex: 1;
  min-height: 0;
  border-radius: 22rpx;
  background: rgba(255,255,255,0.92);
  border: 2rpx solid rgba(0,0,0,0.06);
  box-shadow: 0 10rpx 22rpx rgba(0,0,0,0.08);
  padding: 14rpx;
  overflow: hidden;
}
.table-head{
  display:flex;
  padding-bottom: 10rpx;
  border-bottom: 2rpx dashed rgba(0,0,0,0.08);
  margin-bottom: 10rpx;
}
.th{
  flex: 1;
  font-size: 22rpx;
  font-weight: 900;
  color:#2b3a66;
}
.tbody{
  height: 100%;
}
.row2{
  display:flex;
  padding: 12rpx 0;
  border-bottom: 2rpx solid rgba(0,0,0,0.04);
}
.row2:last-child{ border-bottom: none; }
.td{
  flex: 1;
  font-size: 24rpx;
  font-weight: 900;
  color:#2b3a66;
}
.mono{
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}
.highlight{
  background: rgba(79,108,255,0.10);
  border-radius: 16rpx;
  padding-left: 10rpx;
  padding-right: 10rpx;
}

/* task card */
.task-card{
  border-radius: 22rpx;
  background: rgba(255,255,255,0.92);
  border: 2rpx solid rgba(0,0,0,0.06);
  box-shadow: 0 10rpx 22rpx rgba(0,0,0,0.08);
  padding: 14rpx;
}
.task-line{
  display:flex;
  align-items:center;
  gap: 10rpx;
  margin-bottom: 10rpx;
}
.task-line:last-child{ margin-bottom: 0; }
.dot{
  width: 18rpx;
  height: 18rpx;
  border-radius: 999rpx;
  background: rgba(0,0,0,0.18);
}
.dot.ok{
  background: rgba(46,213,115,0.95);
}
.task-text{
  font-size: 22rpx;
  font-weight: 900;
  color:#2b3a66;
}
.task-actions{
  margin-top: 12rpx;
  display:flex;
  gap: 12rpx;
}

/* buttons */
.btn{
  flex: 1;
  padding: 16rpx 0;
  text-align:center;
  border-radius: 999rpx;
  font-size: 24rpx;
  font-weight: 900;
  box-shadow: 0 12rpx 24rpx rgba(0,0,0,0.12);
}
.btn:active{ transform: scale(0.98); }
.btn.disabled{
  opacity: 0.55;
  pointer-events:none;
  box-shadow:none;
}
.small{
  flex: 0 0 auto;
  width: 140rpx;
  padding: 16rpx 0;
  background: linear-gradient(90deg,#4f6cff 0%,#667eea 100%);
  color:#fff;
}
.reset{
  background: linear-gradient(90deg,#f5f5f5 0%,#e9e9e9 100%);
  color:#555;
}
.all{
  background: linear-gradient(90deg,#ff9f43 0%,#ff6b6b 100%);
  color:#fff;
}

/* popup */
.popup{
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.55);
  display:flex;
  align-items:center;
  justify-content:center;
  z-index: 99;
  backdrop-filter: blur(8rpx);
}
.popup-card{
  width: 78vw;
  background: rgba(255,255,255,0.96);
  border-radius: 32rpx;
  padding: 54rpx 40rpx 40rpx;
  text-align:center;
  box-shadow: 0 22rpx 70rpx rgba(0,0,0,0.22);
}
.pop-title{
  display:block;
  font-size: 44rpx;
  font-weight: 900;
  color:#ff6b6b;
  margin-bottom: 16rpx;
}
.pop-desc{
  display:block;
  color:#555;
  font-size: 26rpx;
  line-height: 1.7;
  margin-bottom: 24rpx;
}
.pop-actions{
  display:flex;
  gap: 14rpx;
}
.pop-btn{
  flex: 1;
  padding: 18rpx 0;
  border-radius: 22rpx;
  font-size: 28rpx;
  font-weight: 900;
  background: linear-gradient(90deg,#eef2ff 0%,#dbe9ff 100%);
  color:#4f6cff;
  box-shadow: 0 10rpx 22rpx rgba(0,0,0,0.10);
}
.pop-btn.primary{
  background: linear-gradient(90deg,#4f6cff 0%,#667eea 100%);
  color:#fff;
}
.linebreak{ display:block; height: 10rpx; }

/* toast */
.mini-toast{
  position: fixed;
  left: 50%;
  bottom: 140rpx;
  transform: translateX(-50%);
  padding: 16rpx 22rpx;
  border-radius: 999rpx;
  background: rgba(0,0,0,0.75);
  color:#fff;
  font-size: 24rpx;
  font-weight: 800;
  z-index: 120;
}
</style>
