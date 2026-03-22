<template>
  <view class="page">
    <!-- 头部 -->
    <view class="header">
      <text class="title">第 15 关：规则排序 🧩</text>
      <text class="tip">任务：把步骤按正确顺序排好（点卡片放进 1→4）</text>
    </view>

    <!-- HUD -->
    <view class="hud">
      <text class="badge">✅ 已放：{{ pickedSteps.length }}/{{ needCount }}</text>
      <text class="small">⏱ 用时：{{ formatTime(elapsedMs) }}</text>
    </view>

    <!-- 游戏区 -->
    <view class="board">
      <view class="board-bg" />

      <!-- 提示 -->
      <view class="hintbar">
		  <view class="topic">
		    本局主题：{{ currentSet.title }}
		  </view>

        <text class="hinttext">
          先把上面的规则卡片按顺序点进下面的 1→4，再点「检查」。
        </text>
      </view>

      <!-- 卡片池 -->
      <view class="pool">
        <view class="pool-title">可选规则卡片</view>
        <view class="pool-grid">
          <view
            v-for="it in options"
            :key="it.id"
            class="card"
            :class="{ disabled: usedMap[it.id] }"
            @click="pick(it)"
          >
            <text class="card-index"></text>
            <text class="card-text">{{ it.text }}</text>
          </view>
        </view>
      </view>

      <!-- 排序栏 -->
      <view class="sort">
        <view class="sort-title">我的排序（1 → {{ needCount }}）</view>

        <view class="slots">
          <view class="slot" v-for="i in needCount" :key="'s'+i">
            <view class="slot-head">
              <text class="slot-no">{{ i }}</text>
              <view
                class="slot-remove"
                v-if="pickedSteps[i-1]"
                @click="removeAt(i-1)"
              >
                ×
              </view>
            </view>

            <view class="slot-body">
              <text v-if="pickedSteps[i-1]" class="slot-text">
                {{ pickedSteps[i-1].text }}
              </text>
              <text v-else class="slot-placeholder">点上面卡片放到这里</text>
            </view>
          </view>
        </view>

        <!-- 操作按钮 -->
        <view class="buttons">
          <view class="btn reset" @click="reset" :class="{ disabled: isMoving }">↩ 重新开始</view>
          <view class="btn check" @click="check" :class="{ disabled: pickedSteps.length !== needCount || isMoving }">
            ✅ 检查
          </view>
          <view class="btn next" @click="goNext" :class="{ disabled: !success }">下一关 →</view>
        </view>
      </view>
    </view>

    <!-- 成功弹窗 -->
    <view v-if="success" class="popup" @touchmove.stop.prevent>
      <view class="popup-card">
        <text class="pop-title">🎉 通关成功！</text>
        <text class="pop-desc">
          你学会了：规则/步骤要按顺序执行！
          <text class="linebreak" />
          用时：{{ formatTime(elapsedMs) }}｜错误：{{ wrongTimes }} 次｜星星：{{ earnedStars }}⭐
        </text>
        <view class="pop-actions">
          <view class="pop-btn" @click="reset">再玩一次</view>
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
      levelId: 15,

      // 后端进度
      levelProgress: { unlocked: true, stars: 0, bestSteps: null },
      reported: false,

      // 计时
      elapsedMs: 0,
      clock: null,
      startAt: 0,

      // 关卡逻辑
      needCount: 4,
      success: false,
      isMoving: false,

      // 本局题目
      currentSet: null,      // { key, title, steps:[...] } 正确顺序
      options: [],           // 打乱后的卡片
      pickedSteps: [],       // 玩家选择的顺序
      usedMap: {},           // 防止重复选

      // 统计
      wrongTimes: 0,
      earnedStars: 0,

      // UI
      toast: { show: false, text: '' },

      // 题库（实例多一些）
      // 每个 set.steps 就是正确顺序
      sets: [
        {
          key: 'wash_hands',
          title: '洗手',
          steps: ['打开水龙头', '抹上肥皂搓一搓', '用清水冲干净', '用毛巾擦干']
        },
        {
          key: 'turn_on_pc',
          title: '打开电脑上课',
          steps: ['按电源键开机', '等待开机完成', '输入账号/密码', '打开学习软件']
        },
        {
          key: 'cross_road',
          title: '过马路',
          steps: ['停下看红绿灯', '左右看看有没有车', '绿灯亮再走', '走斑马线通过']
        },
        {
          key: 'make_tea',
          title: '泡一杯茶',
          steps: ['准备杯子', '放入茶叶', '倒入热水', '等待一会儿再喝']
        },
        {
          key: 'do_homework',
          title: '写作业',
          steps: ['准备文具', '看清题目要求', '认真完成', '检查再收拾']
        },
        {
          key: 'save_file',
          title: '保存文件',
          steps: ['点击“文件”菜单', '选择“保存”', '输入文件名', '点击确定']
        },
        {
          key: 'safe_password',
          title: '密码安全',
          steps: ['设置不容易猜的密码', '不告诉别人', '定期更换', '需要时再输入']
        },
        {
          key: 'classroom_rule',
          title: '上课规则',
          steps: ['坐好看老师', '认真听讲', '举手再发言', '课后整理桌面']
        }
      ]
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
    // ===== 后端：读取进度 =====
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

    // ===== 工具：随机 =====
    shuffle(arr) {
      const a = arr.slice()
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const t = a[i]
        a[i] = a[j]
        a[j] = t
      }
      return a
    },

    // ===== 星星规则（可随时改）=====
    calcStars({ usedMs, wrongTimes }) {
      const sec = usedMs / 1000
      // 3星：30秒内 且 错误<=1
      if (sec <= 30 && wrongTimes <= 1) return 3
      // 2星：45秒内
      if (sec <= 45) return 2
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
            wrongTimes: this.wrongTimes,
            setKey: this.currentSet?.key || ''
          }
        })

        this.levelProgress.stars = Math.max(this.levelProgress.stars || 0, stars)
        if (this.levelProgress.bestSteps == null) this.levelProgress.bestSteps = steps
        else this.levelProgress.bestSteps = Math.min(this.levelProgress.bestSteps, steps)
      } catch (e) {}
    },

    // ===== 新一局：随机抽题 =====
    newRound() {
      this.success = false
      this.isMoving = false
      this.reported = false

      this.wrongTimes = 0
      this.earnedStars = 0

      // 抽一套题
      this.currentSet = this.shuffle(this.sets)[0]

      // 生成选项卡片（打乱）
      const steps = this.currentSet.steps.slice(0, this.needCount)
      const options = steps.map((t, idx) => ({
        id: `${this.currentSet.key}_${idx}`,
        text: t,
        correctIndex: idx + 1,
        displayNo: idx + 1
      }))

      this.options = this.shuffle(options)
      this.pickedSteps = []
      this.usedMap = {}
      this.options.forEach(o => (this.usedMap[o.id] = false))

      // 启动计时
      this.stopClock()
      this.elapsedMs = 0
      this.startClock()

      uni.vibrateShort({ type: 'light' })
    
    },

    pick(it) {
      if (this.success) return
      if (this.usedMap[it.id]) {
        uni.vibrateShort({ type: 'light' })
        this.toastMini('这张卡片已经用过啦～')
        return
      }
      if (this.pickedSteps.length >= this.needCount) return

      this.usedMap[it.id] = true
      this.pickedSteps.push(it)
      uni.vibrateShort({ type: 'light' })
    },

    removeAt(index) {
      if (this.success) return
      const it = this.pickedSteps[index]
      if (!it) return
      this.pickedSteps.splice(index, 1)
      this.usedMap[it.id] = false
      uni.vibrateShort({ type: 'light' })
    },

    async check() {
      if (this.pickedSteps.length !== this.needCount) {
        this.toastMini(`先放满 ${this.needCount} 步再检查～`)
        return
      }

      const correctSteps = this.currentSet.steps.slice(0, this.needCount)
      const mine = this.pickedSteps.map(x => x.text)

      const ok = mine.every((t, i) => t === correctSteps[i])

      if (ok) {
        this.success = true
        this.stopClock()
        this.earnedStars = this.calcStars({ usedMs: this.elapsedMs, wrongTimes: this.wrongTimes })
        uni.vibrateLong()
        this.toastMini('✅ 全对啦！')

        await this.reportPass({
          steps: this.needCount,
          usedMs: this.elapsedMs,
          stars: this.earnedStars
        })
      } else {
        this.wrongTimes += 1
        uni.vibrateShort({ type: 'light' })
        this.toastMini('❌ 顺序不对，再试试！')
      }
    },

    toastMini(text) {
      this.toast.text = text
      this.toast.show = true
      clearTimeout(this._t)
      this._t = setTimeout(() => (this.toast.show = false), 900)
    },

    reset() {
      this.newRound()
    },

    goBack() {
      uni.navigateBack({ delta: 1 })
    },

    goNext() {
      if (!this.success) return
      uni.redirectTo({ url: '/pages/game/level/level16' })
    }
  }
}
</script>

<style scoped>
.page{
  height: 100vh;
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

  height: calc(100vh - 40rpx - 30rpx - 170rpx - 120rpx);
  display:flex;
  flex-direction: column;
  gap: 10rpx;
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

/* pool */
.pool{
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  border-radius: 26rpx;
  background: rgba(79,108,255,0.06);
  border: 2rpx dashed rgba(79,108,255,0.18);
  padding: 12rpx;
  overflow: hidden;
}
.pool-title{
  font-size: 24rpx;
  font-weight: 900;
  color:#2b3a66;
  margin-bottom: 10rpx;
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

.pool-grid{
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap: 10rpx;
}
.card{
  border-radius: 20rpx;
  background: rgba(255,255,255,0.92);
  border: 2rpx solid rgba(0,0,0,0.06);
  box-shadow: 0 10rpx 22rpx rgba(0,0,0,0.08);
  padding: 14rpx 14rpx;
}
.card:active{ transform: scale(0.98); }
.card.disabled{
  opacity: 0.4;
  pointer-events: none;
}
.card-index{
  display:block;
  font-size: 20rpx;
  font-weight: 900;
  color:#4f6cff;
  opacity: 0.9;
  margin-bottom: 6rpx;
}
.card-text{
  display:block;
  font-size: 24rpx;
  font-weight: 900;
  color:#2b3a66;
  line-height: 1.35;
}

/* sort */
.sort{
  position: relative;
  z-index: 1;
  flex: 1.1;
  min-height: 0;
  border-radius: 26rpx;
  background: rgba(255,159,67,0.06);
  border: 2rpx dashed rgba(255,159,67,0.22);
  padding: 12rpx;
  overflow: hidden;
}
.sort-title{
  font-size: 24rpx;
  font-weight: 900;
  color:#2b3a66;
  margin-bottom: 10rpx;
}
.slots{
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap: 10rpx;
}
.slot{
  border-radius: 20rpx;
  background: rgba(255,255,255,0.92);
  border: 2rpx solid rgba(0,0,0,0.06);
  padding: 12rpx;
  position: relative;
  min-height: 92rpx;
}
.slot-head{
  display:flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6rpx;
}
.slot-no{
  width: 40rpx;
  height: 40rpx;
  border-radius: 999rpx;
  background: rgba(79,108,255,0.12);
  display:flex;
  align-items:center;
  justify-content:center;
  font-weight: 900;
  color:#4f6cff;
}
.slot-remove{
  width: 40rpx;
  height: 40rpx;
  border-radius: 999rpx;
  background: rgba(0,0,0,0.06);
  display:flex;
  align-items:center;
  justify-content:center;
  font-weight: 900;
  color:#666;
}
.slot-body{ }
.slot-text{
  display:block;
  font-size: 24rpx;
  font-weight: 900;
  color:#2b3a66;
  line-height: 1.35;
}
.slot-placeholder{
  display:block;
  font-size: 22rpx;
  color:#999;
  font-weight: 700;
}

/* buttons */
.buttons{
  margin-top: 10rpx;
  display:flex;
  gap: 12rpx;
}
.btn{
  flex: 1;
  padding: 18rpx 0;
  text-align: center;
  border-radius: 999rpx;
  font-size: 26rpx;
  font-weight: 900;
  box-shadow: 0 12rpx 24rpx rgba(0,0,0,0.12);
}
.btn:active{ transform: scale(0.98); }
.btn.disabled{
  opacity: 0.55;
  pointer-events: none;
  box-shadow: none;
}
.reset{ background: linear-gradient(90deg,#f5f5f5 0%,#e9e9e9 100%); color:#555; }
.check{ background: linear-gradient(90deg,#ff9f43 0%,#ff6b6b 100%); color:#fff; }
.next{ background: linear-gradient(90deg,#4f6cff 0%,#667eea 100%); color:#fff; }

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
  background: linear-gradient(90deg,#4f6cff 0%,#667eea 100%);
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
