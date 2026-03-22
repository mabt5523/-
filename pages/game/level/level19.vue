<template>
  <view class="page">
    <!-- 头部 -->
    <view class="header">
      <text class="title">第 19 关：编码侦探 🕵️‍♀️</text>
      <text class="tip">任务：把物品拖到正确的“编码方式”里（编码=唯一身份证）</text>
    </view>

    <!-- HUD -->
    <view class="hud">
      <text class="badge">✅ 已匹配：{{ matchedCount }}/{{ needCount }}</text>
      <text class="small">⏱ 用时：{{ formatTime(elapsedMs) }}</text>
    </view>

    <!-- 游戏区 -->
    <view class="board">
      <view class="board-bg" />

      <!-- 提示栏 -->
      <view class="hintbar">
        <view class="topic">
          本局重点：编码要“唯一”才能识别；编码位数越长，能表示的信息量越大
        </view>
        <text class="hinttext">
          把上面的物品卡片拖到下面对应的编码方式里。
          放错会提示：这个编码不能唯一识别。
        </text>
      </view>

      <!-- 上：物品池（叠放） -->
      <view class="pool">
        <view class="pool-title">待配身份证的物品（拖动到下方）</view>

        <view class="stack-area">
          <!-- 叠放卡片：只渲染未匹配；只允许拖最上面一张 -->
          <view
            v-for="(it, idx) in unmatchedItems"
            :key="it.id"
            class="stack-card"
            :class="{ top: idx === 0, notop: idx !== 0 }"
            :style="stackStyle(idx)"
            @touchstart.stop.prevent="idx===0 && onDragStart($event, it)"
            @touchmove.stop.prevent="idx===0 && onDragMove($event)"
            @touchend.stop.prevent="idx===0 && onDragEnd($event)"
            @click="idx!==0 && toastMini('一次只能拖最上面那张哦～')"
          >
            <view class="item-top">
              <text class="item-tag">{{ tagText(it.kind) }}</text>
            </view>
            <text class="item-name">{{ it.name }}</text>
            <text class="item-hint">拖到下面选择编码方式</text>
          </view>

          <!-- 空状态 -->
          <view v-if="unmatchedItems.length === 0" class="stack-empty">
            <text class="stack-empty-title">✅ 都匹配完成啦</text>
            <text class="stack-empty-sub">点「检查」即可通关</text>
          </view>
        </view>
      </view>

      <!-- 下：编码方式（投放区） -->
      <view class="bins">
        <view class="bins-title">编码方式（把物品拖进来）</view>

        <view class="bins-grid">
          <view
            v-for="b in buckets"
            :key="b.key"
            class="bin"
            :data-key="b.key"
            :id="'bin-' + b.key"
          >
            <view class="bin-head">
              <text class="bin-title">{{ b.label }}</text>
              <text class="bin-sub">{{ b.desc }}</text>
            </view>

            <view class="bin-body">
              <view class="bin-pill" v-for="it in matchedInBucket(b.key)" :key="it.id">
                <text class="pill-name">{{ it.name }}</text>
                <view class="pill-x" @click.stop="unmatch(it)">×</view>
              </view>

              <text v-if="matchedInBucket(b.key).length === 0" class="bin-placeholder">
                把物品拖到这里
              </text>
            </view>
          </view>
        </view>

        <!-- 操作按钮 -->
        <view class="buttons">
          <view class="btn reset" @click="reset" :class="{ disabled: isMoving }">↩ 重新开始</view>
          <view class="btn check" @click="check" :class="{ disabled: matchedCount !== needCount || isMoving }">
            ✅ 检查
          </view>
          <view class="btn next" @click="goNext" :class="{ disabled: !success }">下一关 →</view>
        </view>
      </view>

      <!-- 拖拽“幽灵卡片” -->
      <view v-if="dragging.show" class="ghost" :style="ghostStyle">
        <view class="ghost-top">
          <text class="ghost-tag">{{ tagText(dragging.item?.kind) }}</text>
        </view>
        <text class="ghost-name">{{ dragging.item?.name }}</text>
        <text class="ghost-tip">拖到正确编码方式</text>
      </view>
    </view>

    <!-- 成功弹窗 -->
    <view v-if="success" class="popup" @touchmove.stop.prevent>
      <view class="popup-card">
        <text class="pop-title">🎉 通关成功！</text>
        <text class="pop-desc">
          你学会了：
          <text class="linebreak" />
          1）编码是“唯一标识”才好管理；
          <text class="linebreak" />
          2）编码位数越长，一般能表示的信息量越大；
          <text class="linebreak" />
          3）用编码把现实世界管理起来。
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
      levelId: 19,

      // 后端进度
      levelProgress: { unlocked: true, stars: 0, bestSteps: null },
      reported: false,

      // 计时
      elapsedMs: 0,
      clock: null,
      startAt: 0,

      // 关卡逻辑
      success: false,
      isMoving: false,

      // 统计
      wrongTimes: 0,
      earnedStars: 0,

      // UI
      toast: { show: false, text: '' },

      // 拖拽状态
      dragging: {
        show: false,
        item: null,
        x: 0,
        y: 0,
        offsetX: 0,
        offsetY: 0
      },

      // 物品池
      items: [],

      // 编码方式（投放区）
      buckets: [
        { key: 'idcard', label: '身份证号（18位）', desc: '唯一识别一个人' },
        { key: 'isbn', label: 'ISBN（10/13位）', desc: '唯一识别一本书' },
        { key: 'plate', label: '车牌号', desc: '唯一识别一辆车' },
        { key: 'barcode', label: '商品条码', desc: '唯一识别一种商品' }
      ],

      // 本关需要匹配的数量
      needCount: 8,

      // 投放检测 rect
      binRects: {},

      // 题库
      bank: {
        person: ['小明（学生）', '李华（学生）', '王老师', '张阿姨', '小雨（学生）', '陈叔叔'],
        book: ['《西游记》', '《小王子》', '《三体》', '《哈利波特》', '《十万个为什么》', '《时间简史》'],
        car: ['蓝色轿车', '红色出租车', '校车', '白色面包车', '快递车', '警车'],
        goods: ['牛奶', '洗发水', '面包', '铅笔', '饼干', '矿泉水']
      }
    }
  },

  computed: {
    matchedCount() {
      return this.items.filter(x => x.matched).length
    },
    unmatchedItems() {
      return this.items.filter(x => !x.matched)
    },
    ghostStyle() {
      return `left:${this.dragging.x}px;top:${this.dragging.y}px;`
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
    pickN(list, n) {
      return this.shuffle(list).slice(0, n)
    },

    // ===== 叠放样式（最多显示6张）=====
    stackStyle(idx) {
      const maxVisible = 6
      const i = Math.min(idx, maxVisible - 1)
      const offsetY = i * 10
      const offsetX = i * 6
      const scale = 1 - i * 0.02
      const z = 200 - i
      const opacity = idx >= maxVisible ? 0 : 1
      return `transform: translate(${offsetX}px, ${offsetY}px) scale(${scale});
              z-index:${z}; opacity:${opacity};`
    },

    // ===== 星星规则（可调）=====
    calcStars({ usedMs, wrongTimes }) {
      const sec = usedMs / 1000
      if (sec <= 40 && wrongTimes <= 1) return 3
      if (sec <= 60) return 2
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
      this.isMoving = false
      this.reported = false
      this.wrongTimes = 0
      this.earnedStars = 0

      // 生成 8 个物品：2人2书2车2商品
      const persons = this.pickN(this.bank.person, 2).map((name, i) => ({
        id: `p_${i}_${Date.now()}`,
        kind: 'person',
        name
      }))
      const books = this.pickN(this.bank.book, 2).map((name, i) => ({
        id: `b_${i}_${Date.now()}`,
        kind: 'book',
        name
      }))
      const cars = this.pickN(this.bank.car, 2).map((name, i) => ({
        id: `c_${i}_${Date.now()}`,
        kind: 'car',
        name
      }))
      const goods = this.pickN(this.bank.goods, 2).map((name, i) => ({
        id: `g_${i}_${Date.now()}`,
        kind: 'goods',
        name
      }))

      const all = this.shuffle([...persons, ...books, ...cars, ...goods]).map(it => ({
        ...it,
        matched: false,
        matchedBucket: ''
      }))

      this.items = all
      this.needCount = all.length

      // 启动计时
      this.stopClock()
      this.elapsedMs = 0
      this.startClock()

      // 测量投放区
      this.$nextTick(() => {
        setTimeout(() => this.measureBins(), 60)
      })

      uni.vibrateShort({ type: 'light' })
    },

    // ===== 编码正确映射 =====
    correctBucketFor(kind) {
      if (kind === 'person') return 'idcard'
      if (kind === 'book') return 'isbn'
      if (kind === 'car') return 'plate'
      return 'barcode'
    },

    // ===== UI文本 =====
    tagText(kind) {
      if (kind === 'person') return '👤 人'
      if (kind === 'book') return '📚 书'
      if (kind === 'car') return '🚗 车'
      return '🛒 商品'
    },

    // ===== 拖拽：测量投放区 =====
    measureBins() {
      const q = uni.createSelectorQuery().in(this)
      const ids = this.buckets.map(b => '#bin-' + b.key)
      ids.forEach(id => q.select(id).boundingClientRect())
      q.exec(rects => {
        const map = {}
        rects.forEach((r, idx) => {
          const k = this.buckets[idx].key
          if (r) map[k] = r
        })
        this.binRects = map
      })
    },

    // ===== 拖拽：开始 =====
    onDragStart(e, it) {
      if (this.success) return
      if (!it || it.matched) return

      // 保险：每次开始拖都测一次（避免布局变化导致命中不准）
      this.measureBins()

      const t = e.touches && e.touches[0]
      if (!t) return

      this.isMoving = true
      this.dragging.item = it
      this.dragging.show = true

      // 让幽灵卡片跟手（偏移可调）
      this.dragging.offsetX = 120
      this.dragging.offsetY = 55
      this.dragging.x = t.clientX - this.dragging.offsetX
      this.dragging.y = t.clientY - this.dragging.offsetY

      uni.vibrateShort({ type: 'light' })
    },

    // ===== 拖拽：移动 =====
    onDragMove(e) {
      if (!this.dragging.show) return
      const t = e.touches && e.touches[0]
      if (!t) return
      this.dragging.x = t.clientX - this.dragging.offsetX
      this.dragging.y = t.clientY - this.dragging.offsetY
    },

    // ===== 拖拽：结束 =====
    onDragEnd(e) {
      if (!this.dragging.show) return

      const t = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0])
      const endX = t ? t.clientX : 0
      const endY = t ? t.clientY : 0

      const dropKey = this.hitTestBins(endX, endY)
      const it = this.dragging.item

      // 收起幽灵
      this.dragging.show = false
      this.dragging.item = null
      this.isMoving = false

      if (!dropKey || !it) {
        this.toastMini('拖到下面的编码方式里试试～')
        return
      }

      const correct = this.correctBucketFor(it.kind)
      if (dropKey === correct) {
        // ✅ 匹配成功：直接标记 matched -> 卡片会从叠放区消失
        it.matched = true
        it.matchedBucket = dropKey
        uni.vibrateLong()

        if (this.matchedCount === this.needCount) {
          this.toastMini('✅ 全部都配好啦！点「检查」通关～')
        } else {
          this.toastMini('✅ 匹配正确！')
        }
      } else {
        this.wrongTimes += 1
        uni.vibrateShort({ type: 'light' })
        this.toastMini('❌ 这个编码不能唯一识别')
      }
    },

    // 命中检测：看手指落点在哪个 bin 里
    hitTestBins(x, y) {
      const rects = this.binRects || {}
      const keys = Object.keys(rects)
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i]
        const r = rects[k]
        if (!r) continue
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return k
      }
      return ''
    },

    // 已匹配列表（显示在投放区里）
    matchedInBucket(bucketKey) {
      return this.items.filter(x => x.matchedBucket === bucketKey)
    },

    // 撤销某个已匹配
    unmatch(it) {
      if (this.success) return
      it.matched = false
      it.matchedBucket = ''
      uni.vibrateShort({ type: 'light' })
    },

    // ===== 检查通关 =====
    async check() {
      if (this.matchedCount !== this.needCount) {
        this.toastMini('先把所有物品都配好编码再检查～')
        return
      }

      const allOk = this.items.every(it => it.matchedBucket === this.correctBucketFor(it.kind))
      if (allOk) {
        this.success = true
        this.stopClock()
        this.earnedStars = this.calcStars({ usedMs: this.elapsedMs, wrongTimes: this.wrongTimes })
        uni.vibrateLong()
        this.toastMini('🎉 通过！')

        await this.reportPass({
          steps: this.needCount,
          usedMs: this.elapsedMs,
          stars: this.earnedStars
        })
      } else {
        this.wrongTimes += 1
        uni.vibrateShort({ type: 'light' })
        this.toastMini('❌ 还有匹配错误的哦，再检查一下～')
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
      uni.redirectTo({ url: '/pages/game/level/level20' })
    }
  }
}
</script>

<style scoped>
.page{
  height: 120vh;
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

/* board：整体白框更长，不遮挡其它 */
.board{
  position: relative;
  background: rgba(255,255,255,0.95);
  border-radius: 32rpx;
  padding: 18rpx;
  box-shadow: 0 18rpx 50rpx rgba(0,0,0,0.18);
  overflow: hidden;
  border: 2rpx solid rgba(255,255,255,0.8);

  /* ✅ 更长：减少扣掉的高度，避免盖住其它区域 */
  height: calc(100vh - 20rpx - 10rpx - 30rpx);
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

/* pool：叠放区 */
.pool{
  position: relative;
  z-index: 1;
  flex: 0.9;
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
.stack-area{
  position: relative;
  height: 320rpx;
  margin-top: 6rpx;
}

/* 叠放卡片：绝对定位叠起来 */
.stack-card{
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  border-radius: 20rpx;
  background: rgba(255,255,255,0.92);
  border: 2rpx solid rgba(0,0,0,0.06);
  box-shadow: 0 10rpx 22rpx rgba(0,0,0,0.08);
  padding: 14rpx;
}
.stack-card.top{
  border-color: rgba(79,108,255,0.22);
}
.stack-card.notop{
  pointer-events: none; /* ✅ 只允许拖最上面那张 */
}

.item-top{
  display:flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
}
.item-tag{
  font-size: 22rpx;
  font-weight: 900;
  color:#4f6cff;
  background: rgba(79,108,255,0.10);
  padding: 6rpx 12rpx;
  border-radius: 999rpx;
}
.item-name{
  display:block;
  font-size: 26rpx;
  font-weight: 900;
  color:#2b3a66;
  line-height: 1.35;
}
.item-hint{
  display:block;
  margin-top: 10rpx;
  font-size: 22rpx;
  color:#6b7280;
  font-weight: 800;
}

/* 空状态 */
.stack-empty{
  height: 100%;
  border-radius: 20rpx;
  background: rgba(255,255,255,0.7);
  border: 2rpx dashed rgba(0,0,0,0.12);
  display:flex;
  flex-direction: column;
  align-items:center;
  justify-content:center;
}
.stack-empty-title{
  font-size: 28rpx;
  font-weight: 900;
  color:#2b3a66;
}
.stack-empty-sub{
  margin-top: 8rpx;
  font-size: 22rpx;
  font-weight: 800;
  color:#6b7280;
}

/* bins：投放区更大 */
.bins{
  position: relative;
  z-index: 1;
  flex: 1.2;
  min-height: 0;
  border-radius: 26rpx;
  background: rgba(255,159,67,0.06);
  border: 2rpx dashed rgba(255,159,67,0.22);
  padding: 12rpx;
  overflow: hidden;
}
.bins-title{
  font-size: 24rpx;
  font-weight: 900;
  color:#2b3a66;
  margin-bottom: 10rpx;
}
.bins-grid{
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap: 10rpx;
}
.bin{
  border-radius: 20rpx;
  background: rgba(255,255,255,0.92);
  border: 2rpx solid rgba(0,0,0,0.06);
  padding: 12rpx;
  min-height: 160rpx;
}
.bin-head{
  margin-bottom: 10rpx;
}
.bin-title{
  display:block;
  font-size: 24rpx;
  font-weight: 900;
  color:#ff6b6b;
}
.bin-sub{
  display:block;
  margin-top: 4rpx;
  font-size: 20rpx;
  color:#6b7280;
  font-weight: 800;
}
.bin-body{
  min-height: 90rpx;
  display:flex;
  flex-wrap: wrap;
  gap: 8rpx;
  align-content: flex-start;
}
.bin-placeholder{
  font-size: 22rpx;
  color:#999;
  font-weight: 800;
}

.bin-pill{
  display:flex;
  align-items:center;
  gap: 8rpx;
  padding: 8rpx 10rpx;
  border-radius: 999rpx;
  background: rgba(79,108,255,0.10);
}
.pill-name{
  font-size: 20rpx;
  font-weight: 900;
  color:#2b3a66;
}
.pill-x{
  width: 34rpx;
  height: 34rpx;
  border-radius: 999rpx;
  background: rgba(0,0,0,0.08);
  display:flex;
  align-items:center;
  justify-content:center;
  font-weight: 900;
  color:#666;
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

/* ghost */
.ghost{
  position: fixed;
  z-index: 999;
  width: 260rpx;
  border-radius: 22rpx;
  background: rgba(255,255,255,0.96);
  border: 2rpx solid rgba(0,0,0,0.06);
  box-shadow: 0 18rpx 40rpx rgba(0,0,0,0.22);
  padding: 14rpx 14rpx;
  pointer-events: none;
}
.ghost-top{ margin-bottom: 8rpx; }
.ghost-tag{
  font-size: 20rpx;
  font-weight: 900;
  color:#4f6cff;
  background: rgba(79,108,255,0.10);
  padding: 6rpx 12rpx;
  border-radius: 999rpx;
}
.ghost-name{
  display:block;
  font-size: 24rpx;
  font-weight: 900;
  color:#2b3a66;
  line-height: 1.35;
}
.ghost-tip{
  display:block;
  margin-top: 8rpx;
  font-size: 20rpx;
  color:#6b7280;
  font-weight: 800;
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
