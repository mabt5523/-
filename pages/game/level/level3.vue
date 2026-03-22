<template>
  <view class="page">
    <!-- 头部 -->
    <view class="header">
      <text class="title">第 3 关：信息的形式 🧩</text>
      <text class="tip">任务：把信息分到正确的形式（点物品 → 点分类）</text>
    </view>

    <!-- HUD -->
    <view class="hud">
      <view class="hud-left">
        <text class="badge">✅ 已完成：{{ doneCount }}/{{ items.length }}</text>
      </view>
      <view class="hud-right">
        <text class="small">⏱ {{ formatTime(elapsedMs) }}</text>
      </view>
    </view>

    <!-- 分类区 -->
    <view class="board">
      <view class="board-bg" />

      <view class="hintbar">
        <text class="hinttext">
          小提示：先点一个物品，再点下面的「声音/图片/文字/视频」分类框～
        </text>
      </view>

      <view class="bins">
        <view
          class="bin"
          v-for="b in bins"
          :key="b.type"
          :class="{ active: selectingKey && !success }"
          @click="chooseBin(b.type)"
        >
          <view class="bin-head">
            <text class="bin-emoji">{{ b.emoji }}</text>
            <text class="bin-title">{{ b.name }}</text>
          </view>
          <text class="bin-sub">点击这里分类</text>
        </view>
      </view>

      <!-- 物品区 -->
      <view class="items">
        <view
          v-for="it in items"
          :key="it.key"
          class="item"
          :class="itemClass(it)"
          @click="selectItem(it.key)"
        >
          <text class="emoji">{{ it.emoji }}</text>
          <text class="label">{{ it.name }}</text>

          <view v-if="result[it.key]?.done" class="tag">
            <text v-if="result[it.key]?.correct">✅</text>
            <text v-else>❌</text>
          </view>
        </view>
      </view>

      <view class="statusbar">
        <text class="status">
          <template v-if="success">🎉 全部分类正确！</template>
          <template v-else-if="selectingKey">
            已选：{{ itemByKey(selectingKey)?.name }}（去点一个分类框）
          </template>
          <template v-else>
            请先点一个物品
          </template>
        </text>

        <text class="stat-mini">错误：{{ wrongCount }} 次</text>
      </view>
    </view>

    <!-- 按钮 -->
    <view class="actions">
      <view class="btn reset" @click="reset" :class="{ disabled: isMoving }">↩ 重新开始</view>
      <view class="btn next" :class="{ disabled: !success }" @click="goNext">下一关 →</view>
    </view>

    <!-- 成功弹窗 -->
    <view v-if="success" class="popup" @touchmove.stop.prevent>
      <view class="popup-card">
        <text class="pop-title">🎉 通关成功！</text>
        <text class="pop-desc">
          你学会了：信息有不同表现形式！
          <text class="linebreak" />
          声音 / 图片 / 文字 / 视频 都能“传递信息”。
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
  async onLoad() {
    await this.loadLevelProgress()
    this.newRound()
  },

  onUnload() {
    this.stopClock()
  },

  data() {
    return {
      levelId: 3,

      // ✅ 后端关卡进度
      levelProgress: { unlocked: true, stars: 0, bestSteps: null },
      reported: false,

      // 游戏状态
      items: [],             // 本局抽到的物品
      result: {},            // { key: {done, correct} }
      selectingKey: null,    // 当前选中的物品
      doneCount: 0,
      wrongCount: 0,
      steps: 0,              // 分类尝试次数（用于 bestSteps）
      isMoving: false,
      success: false,

      // 计时器
      elapsedMs: 0,
      clock: null,
      startAt: 0,

      // 分类框
      bins: [
        { type: 'sound', name: '声音', emoji: '🔊' },
        { type: 'image', name: '图片', emoji: '🖼️' },
        { type: 'text',  name: '文字', emoji: '✍️' },
        { type: 'video', name: '视频', emoji: '🎬' }
      ],

      // ✅ 题库：实例要多（你可以继续加）
      pool: [
        // ===== 声音 =====
        { key: 'sound_bell',   name: '铃声',   emoji: '🔔', type: 'sound' },
        { key: 'sound_music',  name: '音乐',   emoji: '🎵', type: 'sound' },
        { key: 'sound_radio',  name: '广播',   emoji: '📻', type: 'sound' },
        { key: 'sound_voice',  name: '说话',   emoji: '🗣️', type: 'sound' },
        { key: 'sound_siren',  name: '警报声', emoji: '🚨', type: 'sound' },
        { key: 'sound_bird',   name: '鸟叫声', emoji: '🐦', type: 'sound' },
        { key: 'sound_clap',   name: '掌声',   emoji: '👏', type: 'sound' },
        { key: 'sound_knock',  name: '敲门声', emoji: '🚪', type: 'sound' },
        { key: 'sound_whistle',name: '口哨',   emoji: '😗', type: 'sound' },
        { key: 'sound_alarm',  name: '闹钟声', emoji: '⏰', type: 'sound' },

        // ===== 图片 =====
        { key: 'img_photo',    name: '照片',   emoji: '📷', type: 'image' },
        { key: 'img_map',      name: '地图',   emoji: '🗺️', type: 'image' },
        { key: 'img_poster',   name: '海报',   emoji: '🪧', type: 'image' },
        { key: 'img_icon',     name: '图标',   emoji: '🔷', type: 'image' },
        { key: 'img_paint',    name: '绘画',   emoji: '🎨', type: 'image' },
        { key: 'img_emoji',    name: '表情',   emoji: '😊', type: 'image' },
        { key: 'img_traffic',  name: '标志图', emoji: '🚸', type: 'image' },
        { key: 'img_qrcode',   name: '二维码', emoji: '🔳', type: 'image' },
        { key: 'img_graph',    name: '图表',   emoji: '📊', type: 'image' },
        { key: 'img_stamp',    name: '印章',   emoji: '🧾', type: 'image' },

        // ===== 文字 =====
        { key: 'text_book',    name: '书本',   emoji: '📚', type: 'text' },
        { key: 'text_sms',     name: '短信',   emoji: '💬', type: 'text' },
        { key: 'text_sign',    name: '路牌',   emoji: '🚏', type: 'text' },
        { key: 'text_note',    name: '便签',   emoji: '📝', type: 'text' },
        { key: 'text_news',    name: '新闻',   emoji: '📰', type: 'text' },
        { key: 'text_menu',    name: '菜单',   emoji: '📜', type: 'text' },
        { key: 'text_homework',name: '作业本', emoji: '📒', type: 'text' },
        { key: 'text_letter',  name: '信件',   emoji: '✉️', type: 'text' },
        { key: 'text_name',    name: '姓名牌', emoji: '🏷️', type: 'text' },
        { key: 'text_subtitle',name: '字幕',   emoji: '🔤', type: 'text' },

        // ===== 视频 =====
        { key: 'vid_cartoon',  name: '动画片', emoji: '🐻', type: 'video' },
        { key: 'vid_movie',    name: '电影',   emoji: '🎞️', type: 'video' },
        { key: 'vid_short',    name: '短视频', emoji: '📱', type: 'video' },
        { key: 'vid_class',    name: '网课',   emoji: '👩‍💻', type: 'video' },
        { key: 'vid_live',     name: '直播',   emoji: '📡', type: 'video' },
        { key: 'vid_news',     name: '电视新闻', emoji: '📺', type: 'video' },
        { key: 'vid_sport',    name: '比赛视频', emoji: '⚽', type: 'video' },
        { key: 'vid_story',    name: '故事视频', emoji: '📖', type: 'video' },
        { key: 'vid_mv',       name: '音乐MV', emoji: '🎤', type: 'video' },
        { key: 'vid_demo',     name: '演示视频', emoji: '🧪', type: 'video' }
      ],

      toast: { show: false, text: '' }
    }
  },

  methods: {
    // ========= 后端进度 =========
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

    // ========= 工具 =========
    shuffle(arr) {
      const a = arr.slice()
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const t = a[i]; a[i] = a[j]; a[j] = t
      }
      return a
    },
    sample(arr, n) {
      return this.shuffle(arr).slice(0, n)
    },

    itemByKey(key) {
      return this.items.find(x => x.key === key)
    },

    toastMsg(text) {
      this.toast.text = text
      this.toast.show = true
      clearTimeout(this._t)
      this._t = setTimeout(() => (this.toast.show = false), 900)
    },

    // ========= 计时器 =========
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
      const s = Math.floor(ms / 1000)
      const m = Math.floor(s / 60)
      const ss = s % 60
      const mm = m < 10 ? '0' + m : '' + m
      const s2 = ss < 10 ? '0' + ss : '' + ss
      return `${mm}:${s2}`
    },

    // ========= 星星规则（可改） =========
    calcStars() {
      const sec = this.elapsedMs / 1000
      if (this.wrongCount === 0 && sec <= 35) return 3
      if (this.wrongCount <= 2 && sec <= 55) return 2
      return 1
    },

    // ========= 上报 =========
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
            usedTimeSec: Math.round(usedMs / 1000)
          }
        })

        this.levelProgress.stars = Math.max(this.levelProgress.stars || 0, stars)
        if (this.levelProgress.bestSteps == null) this.levelProgress.bestSteps = steps
        else this.levelProgress.bestSteps = Math.min(this.levelProgress.bestSteps, steps)
      } catch (e) {
        console.log('reportPass failed:', e)
      }
    },

    // ========= 开新局：随机抽取 =========
    newRound() {
      // 每类抽几个（默认 3*4=12 个）
      const PER_TYPE = 3

      const pickByType = (type) => {
        const list = this.pool.filter(x => x.type === type)
        return this.sample(list, PER_TYPE)
      }

      const picked = [
        ...pickByType('sound'),
        ...pickByType('image'),
        ...pickByType('text'),
        ...pickByType('video')
      ]

      this.items = this.shuffle(picked)

      this.result = this.items.reduce((m, it) => {
        m[it.key] = { done: false, correct: false }
        return m
      }, {})

      this.selectingKey = null
      this.doneCount = 0
      this.wrongCount = 0
      this.steps = 0
      this.success = false
      this.isMoving = false
      this.reported = false

      this.startClock()
      uni.vibrateShort({ type: 'light' })
    },

    // ========= 玩法：点物品 → 点分类 =========
    selectItem(key) {
      if (this.success) return
      if (this.result[key]?.done) {
        uni.vibrateShort({ type: 'light' })
        this.toastMsg('这个已经分好了～')
        return
      }
      this.selectingKey = key
      uni.vibrateShort({ type: 'light' })
    },

    async chooseBin(type) {
      if (this.success) return
      if (!this.selectingKey) {
        uni.vibrateShort({ type: 'light' })
        this.toastMsg('先点一个物品～')
        return
      }

      const it = this.itemByKey(this.selectingKey)
      if (!it) return

      // 每次尝试算一步
      this.steps++

      if (it.type === type) {
        this.$set(this.result, it.key, { done: true, correct: true })
        this.doneCount++

        uni.vibrateLong()
        this.toastMsg('✅ 分对了！')

        // 清空选择
        this.selectingKey = null

        // 全部完成：通关 + 上报
        if (this.doneCount >= this.items.length) {
          this.success = true
          this.stopClock()
          const stars = this.calcStars()
          await this.reportPass({
            steps: this.steps,
            usedMs: this.elapsedMs,
            stars
          })
        }
      } else {
        this.wrongCount++
        uni.vibrateShort({ type: 'light' })
        this.toastMsg('❌ 再想想：它属于哪种信息？')
        // ✅ 错了不锁定，允许再试
      }
    },

    // ========= 样式 =========
    itemClass(it) {
      return {
        selected: this.selectingKey === it.key,
        done: !!this.result[it.key]?.done
      }
    },

    reset() {
      this.newRound()
    },

    goBack() {
      uni.navigateBack({ delta: 1 })
    },

    goNext() {
      if (!this.success) {
        uni.showToast({ title: '先把所有物品分类正确再去下一关～', icon: 'none' })
        return
      }
      uni.redirectTo({ url: '/pages/game/level/level4' })
    }
  }
}
</script>

<style scoped>
.page{
  min-height: 100vh;
  padding: 40rpx 30rpx;
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 55%, #89f7fe 100%);
}

/* header */
.header{ position:relative; text-align:center; color:#fff; margin-bottom:18rpx; }
.back-btn{
  position:absolute; left:0; top:50%; transform:translateY(-50%);
  width:60rpx; height:60rpx; border-radius:999rpx;
  background:rgba(255,255,255,0.22);
  display:flex; align-items:center; justify-content:center;
  font-size:32rpx; font-weight:900;
}
.title{ font-size:40rpx; font-weight:900; }
.tip{ display:block; margin-top:10rpx; font-size:24rpx; opacity:0.95; }

/* hud */
.hud{ display:flex; justify-content:space-between; align-items:center; margin-bottom:16rpx; gap:12rpx; }
.badge{
  display:inline-flex; align-items:center; gap:10rpx;
  padding:10rpx 18rpx; border-radius:999rpx;
  background:rgba(255,255,255,0.22); color:#fff;
  font-size:24rpx; font-weight:900;
}
.small{ color:#eaf2ff; font-size:22rpx; opacity:0.95; }

/* board */
.board{
  position:relative;
  background:rgba(255,255,255,0.95);
  border-radius:32rpx;
  padding:22rpx;
  box-shadow:0 18rpx 50rpx rgba(0,0,0,0.18);
  overflow:hidden;
  border:2rpx solid rgba(255,255,255,0.8);
  min-height: 860rpx;
}
.board-bg{
  position:absolute; inset:0;
  background:
    radial-gradient(circle at 20% 20%, rgba(255, 234, 0, 0.10), transparent 40%),
    radial-gradient(circle at 80% 25%, rgba(0, 200, 255, 0.10), transparent 45%),
    radial-gradient(circle at 50% 80%, rgba(255, 0, 150, 0.08), transparent 50%);
  z-index:0;
}

.hintbar{
  position:relative; z-index:1;
  margin-bottom:16rpx;
  padding:16rpx 18rpx;
  border-radius:22rpx;
  background:rgba(79,108,255,0.08);
  border:2rpx solid rgba(79,108,255,0.14);
}
.hinttext{ color:#2b3a66; font-size:24rpx; line-height:1.6; font-weight:700; }

/* bins */
.bins{
  position:relative; z-index:1;
  display:grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14rpx;
  margin-bottom: 16rpx;
}
.bin{
  border-radius: 22rpx;
  padding: 16rpx 14rpx;
  background: rgba(255,255,255,0.86);
  border: 2rpx dashed rgba(79,108,255,0.22);
  box-shadow: 0 10rpx 24rpx rgba(0,0,0,0.08);
}
.bin:active{ transform: scale(0.985); }
.bin.active{
  border-style: solid;
  border-color: rgba(79,108,255,0.45);
  box-shadow: 0 0 0 8rpx rgba(79,108,255,0.08), 0 10rpx 24rpx rgba(0,0,0,0.08);
}
.bin-head{ display:flex; align-items:center; gap:10rpx; justify-content:center; }
.bin-emoji{ font-size: 34rpx; }
.bin-title{ font-size: 26rpx; font-weight: 900; color:#2b3a66; }
.bin-sub{ display:block; text-align:center; margin-top: 8rpx; font-size: 20rpx; color:#6b7cff; font-weight: 800; }

/* items grid */
.items{
  position:relative; z-index:1;
  display:grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14rpx;
  padding: 14rpx;
  border-radius: 26rpx;
  background: rgba(79,108,255,0.06);
  border: 2rpx dashed rgba(79,108,255,0.18);
}
.item{
  position:relative;
  aspect-ratio: 1 / 1;
  border-radius: 22rpx;
  background: rgba(255,255,255,0.84);
  border: 2rpx solid rgba(0,0,0,0.06);
  display:flex; align-items:center; justify-content:center;
  flex-direction:column;
  gap: 8rpx;
  box-shadow: 0 10rpx 24rpx rgba(0,0,0,0.08);
}
.item:active{ transform: scale(0.985); }
.emoji{ font-size: 56rpx; }
.label{ font-size: 22rpx; font-weight: 900; color:#2b3a66; text-align:center; }
.tag{
  position:absolute;
  right: 10rpx;
  top: 8rpx;
  font-size: 26rpx;
}
.item.selected{
  border-color: rgba(255,159,67,0.65);
  box-shadow: 0 0 0 8rpx rgba(255,159,67,0.10), 0 10rpx 24rpx rgba(0,0,0,0.08);
}
.item.done{
  opacity: 0.70;
  border-color: rgba(46, 204, 113, 0.40);
}

/* status bar */
.statusbar{
  position:relative; z-index:1;
  margin-top: 14rpx;
  padding: 14rpx 16rpx;
  border-radius: 22rpx;
  background: rgba(0,0,0,0.04);
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap: 12rpx;
}
.status{
  color:#2b3a66;
  font-size: 22rpx;
  font-weight: 900;
}
.stat-mini{
  color:#6b7cff;
  font-size: 22rpx;
  font-weight: 900;
}

/* actions */
.actions{ margin-top:18rpx; display:flex; gap:14rpx; }
.btn{
  flex:1;
  padding:22rpx 0;
  text-align:center;
  border-radius:999rpx;
  font-size:28rpx;
  font-weight:900;
  box-shadow:0 12rpx 26rpx rgba(0,0,0,0.14);
}
.btn.disabled{ opacity:0.55; pointer-events:none; box-shadow:none; }
.reset{ background: linear-gradient(90deg,#f5f5f5 0%,#e9e9e9 100%); color:#555; }
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
.pop-actions{ display:flex; gap: 14rpx; }
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
  font-weight: 900;
  z-index: 120;
}
</style>
