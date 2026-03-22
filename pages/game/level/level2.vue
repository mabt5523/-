<template>
  <view class="page">
    <!-- 头部 -->
    <view class="header">
      <text class="title">第 2 关：谁在传信息 📡</text>
      <text class="tip">任务：把“传信息的路线”连起来（点起点 → 点终点）</text>
    </view>

    <!-- 进度 -->
    <view class="hud">
      <text class="badge">⭐ 已完成：{{ doneCount }}/{{ totalLinks }}</text>
      <text class="small">提示：先点左边，再点右边</text>
    </view>

    <!-- 游戏区 -->
    <view class="board">
      <view class="board-bg" />

      <!-- 顶部提示条 -->
      <view class="hintbar">
        <text class="hinttext">
          选一条路线：例如「人 → 电话 → 人」，或「电脑 → 网络 → 电脑」
        </text>
      </view>

      <!-- 连线区域 -->
      <view class="wiring">
        <view class="row" v-for="r in routesThisRound" :key="r.key">
          <!-- 左：起点 -->
          <view
            class="node"
            :class="nodeClassLeft(r.left.id)"
            @tap="tapLeft(r.left.id)"
          >
            <text class="emoji">{{ r.left.emoji }}</text>
            <text class="label">{{ r.left.name }}</text>
          </view>

          <!-- 中：中介 + 进度条（每行自己一条） -->
          <view class="midcell">
            <view
              class="hub"
              :class="{
                active: selectedLeft === r.left.id,
                locked: !!lockedFrom[r.left.id]
              }"
            >
              <text class="emoji">{{ r.mid.emoji }}</text>
              <text class="label">{{ r.mid.name }}</text>
            </view>

            <view
              class="hub-line"
              :class="{
                active: selectedLeft === r.left.id,
                locked: !!done[r.left.id]
              }"
            />
          </view>

          <!-- 右：终点（右列仍然打乱：用映射） -->
          <view
            class="node"
            :class="nodeClassRight(mapRightId(r.left.id))"
            @tap="tapRight(mapRightId(r.left.id))"
          >
            <text class="emoji">{{ rightById(mapRightId(r.left.id)).emoji }}</text>
            <text class="label">{{ rightById(mapRightId(r.left.id)).name }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="actions">
      <view class="btn reset" @tap="reset">↩ 重新开始</view>
      <view class="btn next" :class="{ disabled: !success }" @tap="goNext">下一关 →</view>
    </view>

    <!-- 成功弹窗 -->
    <view v-if="success" class="popup" @touchmove.stop.prevent>
      <view class="popup-card">
        <text class="pop-title">🎉 通关成功！</text>
        <text class="pop-desc">
          你学会了：信息可以被传递！
          <text class="linebreak" />
          人可以通过电话传递信息，电脑可以通过网络传递信息。
        </text>
        <view class="pop-actions">
          <view class="pop-btn" @tap="reset">再玩一次</view>
          <view class="pop-btn primary" @tap="goNext">下一关 →</view>
        </view>
      </view>
    </view>

    <!-- 错误提示（轻弹） -->
    <view v-if="wrongToast.show" class="mini-toast">
      <text>{{ wrongToast.text }}</text>
    </view>
  </view>
</template>

<script>
import request from '@/common/request.js'

export default {
  data() {
    return {
      levelId: 2,

      rightOrderMap: {},

      // ✅ 本局抽到的题目
      routesThisRound: [],

      leftNodes: [],
      rightNodes: [],

      levelProgress: { unlocked: true, stars: 0, bestSteps: null },
      reported: false,

      poolRoutes: [
        { key: 'person_phone',  left: { id: 'person', name: '人', emoji: '🧍' }, mid: { name:'电话', emoji:'📞' }, right: { id:'person_r', name:'人', emoji:'🧍' } },
        { key: 'pc_net',        left: { id: 'computer', name:'电脑', emoji:'💻' }, mid: { name:'网络', emoji:'🌐' }, right: { id:'computer_r', name:'电脑', emoji:'💻' } },
        { key: 'phone_signal',  left: { id: 'phone', name:'手机', emoji:'📱' }, mid: { name:'信号', emoji:'📶' }, right: { id:'phone_r', name:'手机', emoji:'📱' } },
        { key: 'radio_wave',    left: { id: 'radio', name:'广播站', emoji:'📻' }, mid: { name:'电波', emoji:'〰️' }, right: { id:'listener_r', name:'听众', emoji:'🧑‍🎓' } },
        { key: 'tv_signal',     left: { id: 'tv', name:'电视台', emoji:'📺' }, mid: { name:'信号', emoji:'📡' }, right: { id:'viewer_r', name:'观众', emoji:'👀' } },
        { key: 'mail_post',     left: { id: 'sender', name:'寄信人', emoji:'✉️' }, mid: { name:'邮递员', emoji:'📮' }, right: { id:'receiver_r', name:'收信人', emoji:'📬' } },
        { key: 'teacher_talk',  left: { id: 'teacher', name:'老师', emoji:'👩‍🏫' }, mid: { name:'说话', emoji:'🗣️' }, right: { id:'student_r', name:'同学', emoji:'👦' } },
      ],

      selectedLeft: null,

      lockedFrom: {},
      lockedTo: {},
      done: {},

      clickCount: 0,
      wrongCount: 0,

      wrongToast: { show: false, text: '' },
      _t: null
    }
  },

  computed: {
    totalLinks() {
      return this.routesThisRound.length
    },
    doneCount() {
      return Object.values(this.done).filter(Boolean).length
    },
    success() {
      return this.totalLinks > 0 && this.doneCount >= this.totalLinks
    }
  },

  async onLoad() {
    await this.loadLevelProgress()
    this.newRound()
  },

  onUnload() {
    clearTimeout(this._t)
  },

  methods: {
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
      } catch (e) {
        console.log('loadLevelProgress failed:', e)
      }
    },

    calcStars() {
      const minClicks = this.routesThisRound.length * 2
      const extraClicks = Math.max(0, this.clickCount - minClicks)

      if (this.wrongCount === 0 && extraClicks <= 1) return 3
      if (this.wrongCount <= 1 && extraClicks <= 3) return 2
      return 1
    },

    async reportPass({ steps, stars }) {
      if (this.reported) return
      this.reported = true
      try {
        await request({
          url: `/api/game/levels/${this.levelId}/complete`,
          method: 'POST',
          data: { stars, steps, usedTimeMs: 0, usedTimeSec: 0 }
        })

        this.levelProgress.stars = Math.max(this.levelProgress.stars || 0, stars)
        if (this.levelProgress.bestSteps == null) this.levelProgress.bestSteps = steps
        else this.levelProgress.bestSteps = Math.min(this.levelProgress.bestSteps, steps)
      } catch (e) {
        console.log('reportPass failed:', e)
      }
    },

    mapRightId(leftId) {
      return this.rightOrderMap[leftId]
    },

    rightById(id) {
      const hit = this.rightNodes.find(x => x.id === id)
      return hit || { id, name: '未知', emoji: '❓' }
    },

    shuffle(arr) {
      const a = arr.slice()
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const t = a[i]; a[i] = a[j]; a[j] = t
      }
      return a
    },

    newRound() {
      const COUNT = 4

      this.routesThisRound = this.shuffle(this.poolRoutes).slice(0, COUNT)
      this.leftNodes = this.routesThisRound.map(r => r.left)

      // 右侧打乱映射
      const rights = this.shuffle(this.routesThisRound.map(r => r.right))
      const map = {}
      this.routesThisRound.forEach((r, i) => {
        map[r.left.id] = rights[i].id
      })
      this.rightOrderMap = map
      this.rightNodes = rights

      this.selectedLeft = null
      this.lockedFrom = {}
      this.lockedTo = {}
      const done = {}
      this.routesThisRound.forEach(r => { done[r.left.id] = false })
      this.done = done

      this.wrongToast = { show: false, text: '' }
      this.clickCount = 0
      this.wrongCount = 0
      this.reported = false

      uni.vibrateShort({ type: 'light' })
    },

    tapLeft(id) {
      this.clickCount++

      if (this.lockedFrom[id]) {
        uni.vibrateShort({ type: 'light' })
        this.toast('这条路线已经连好了～')
        return
      }
      this.selectedLeft = id
      uni.vibrateShort({ type: 'light' })
    },

    async tapRight(id) {
      this.clickCount++

      if (!this.selectedLeft) {
        uni.vibrateShort({ type: 'light' })
        this.toast('先点左边起点～')
        return
      }
      if (this.lockedTo[id]) {
        uni.vibrateShort({ type: 'light' })
        this.toast('这个终点已经连过了～')
        return
      }

      const from = this.selectedLeft
      const correct = this.routesThisRound.some(r => r.left.id === from && r.right.id === id)

      if (correct) {
        // ✅ Vue3 兼容：不要用 this.$set
        this.lockedFrom = { ...this.lockedFrom, [from]: true }
        this.lockedTo = { ...this.lockedTo, [id]: true }
        this.done = { ...this.done, [from]: true }

        uni.vibrateLong()
        this.toast('✅ 连对了！信息可以被传递～')
        this.selectedLeft = null

        if (this.success) {
          const stars = this.calcStars()
          await this.reportPass({ steps: this.clickCount, stars })
        }
      } else {
        this.wrongCount++
        uni.vibrateShort({ type: 'light' })
        this.toast('❌ 不太对哦：想想谁会传给谁～')
      }
    },

    nodeClassLeft(id) {
      return {
        selected: this.selectedLeft === id,
        locked: !!this.lockedFrom[id]
      }
    },

    nodeClassRight(id) {
      return {
        locked: !!this.lockedTo[id]
      }
    },

    toast(text) {
      this.wrongToast = { show: true, text }
      clearTimeout(this._t)
      this._t = setTimeout(() => {
        this.wrongToast = { ...this.wrongToast, show: false }
      }, 900)
    },

    reset() {
      this.newRound()
    },

    goBack() {
      uni.navigateBack({ delta: 1 })
    },

    goNext() {
      if (!this.success) {
        uni.showToast({ title: '先把路线都连对再去下一关～', icon: 'none' })
        return
      }
      uni.redirectTo({ url: '/pages/game/level/level3' })
    }
  }
}
</script>

<style scoped>
/* 你样式我基本原封不动保留，只删掉重复/无用的 bridge/line 老代码 */

.page{
  min-height: 100vh;
  padding: 40rpx 30rpx;
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 55%, #89f7fe 100%);
}

.header{
  position: relative;
  text-align: center;
  color:#fff;
  margin-bottom: 18rpx;
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
.tip{ display:block; margin-top: 10rpx; font-size: 24rpx; opacity: 0.95; }

.hud{
  display:flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
  gap: 12rpx;
}
.badge{
  display:inline-flex;
  align-items:center;
  gap: 10rpx;
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255,255,255,0.22);
  color: #fff;
  font-size: 24rpx;
  font-weight: 900;
}
.small{ color:#eaf2ff; font-size: 22rpx; opacity: 0.95; }

.board{
  position: relative;
  background: rgba(255,255,255,0.95);
  border-radius: 32rpx;
  padding: 22rpx;
  box-shadow: 0 18rpx 50rpx rgba(0,0,0,0.18);
  overflow: hidden;
  border: 2rpx solid rgba(255,255,255,0.8);
  min-height: 820rpx;
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

.hintbar{
  position: relative;
  z-index: 1;
  margin-bottom: 16rpx;
  padding: 16rpx 18rpx;
  border-radius: 22rpx;
  background: rgba(79,108,255,0.08);
  border: 2rpx solid rgba(79,108,255,0.14);
}
.hinttext{
  color:#2b3a66;
  font-size: 24rpx;
  line-height: 1.6;
  font-weight: 700;
}

.wiring{
  position: relative;
  z-index: 1;
  display:flex;
  flex-direction: column;
  gap: 14rpx;
}

.row{
  display: grid;
  grid-template-columns: 1fr 1.2fr 1fr;
  gap: 14rpx;
  align-items: center;
}

.midcell{
  display:flex;
  flex-direction: column;
  gap: 10rpx;
}

.node{
  position: relative;
  padding: 18rpx 12rpx;
  border-radius: 22rpx;
  background: rgba(255,255,255,0.82);
  border: 2rpx solid rgba(0,0,0,0.06);
  display:flex;
  align-items:center;
  justify-content:center;
  flex-direction: column;
  gap: 8rpx;
  box-shadow: 0 10rpx 24rpx rgba(0,0,0,0.08);
}
.node:active{ transform: scale(0.98); }

.node .emoji{ font-size: 56rpx; }
.node .label{ font-size: 24rpx; font-weight: 900; color:#2b3a66; }

.node.selected{
  border-color: rgba(79,108,255,0.45);
  box-shadow: 0 0 0 8rpx rgba(79,108,255,0.10), 0 10rpx 24rpx rgba(0,0,0,0.08);
}
.node.locked{
  opacity: 0.65;
  border-color: rgba(46, 204, 113, 0.45);
}

.hub{
  padding: 16rpx 12rpx;
  border-radius: 22rpx;
  background: rgba(255, 245, 230, 0.75);
  border: 2rpx dashed rgba(255,159,67,0.30);
  display:flex;
  align-items:center;
  justify-content:center;
  flex-direction: column;
  gap: 8rpx;
}
.hub .emoji{ font-size: 50rpx; }
.hub .label{ font-size: 22rpx; font-weight: 900; color:#6b4a12; }
.hub.active{
  border-style: solid;
  border-color: rgba(79,108,255,0.45);
  box-shadow: 0 0 0 8rpx rgba(79,108,255,0.10);
}
.hub.locked{
  opacity: 0.75;
  border-color: rgba(46, 204, 113, 0.45);
}

.hub-line{
  width: 100%;
  height: 16rpx;
  border-radius: 999rpx;
  background: rgba(160, 180, 220, 0.35);
  border: 2rpx dashed rgba(160,180,220,0.55);
}
.hub-line.active{
  background: rgba(79,108,255,0.20);
  border-color: rgba(79,108,255,0.55);
}
.hub-line.locked{
  background: rgba(46, 204, 113, 0.20);
  border-style: solid;
  border-color: rgba(46, 204, 113, 0.55);
}

/* actions */
.actions{
  margin-top: 18rpx;
  display:flex;
  gap: 14rpx;
}
.btn{
  flex: 1;
  padding: 22rpx 0;
  text-align: center;
  border-radius: 999rpx;
  font-size: 28rpx;
  font-weight: 900;
  box-shadow: 0 12rpx 26rpx rgba(0,0,0,0.14);
}
.reset{
  background: linear-gradient(90deg,#f5f5f5 0%,#e9e9e9 100%);
  color:#555;
}
.next{
  background: linear-gradient(90deg,#4f6cff 0%,#667eea 100%);
  color:#fff;
}
.next.disabled{
  opacity: 0.55;
  pointer-events: none;
  box-shadow: none;
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
.linebreak{ display:block; height: 10rpx; }
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
  background: linear-gradient(90deg,#ff9f43 0%,#ff6b6b 100%);
  color:#fff;
}

/* mini toast */
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