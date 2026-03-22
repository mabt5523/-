<template>
  <view class="page">
    <!-- 头部 -->
    <view class="header">
      <text class="title">第 13 关：垃圾分类 ♻️</text>
      <text class="tip">任务：把垃圾拖进正确的垃圾桶</text>
    </view>

    <!-- HUD -->
    <view class="hud">
      <text class="badge">🗑️ 已分类：{{ doneCount }}/{{ needCount }}</text>
      <text class="small">{{ success ? '完成啦！' : '拖动垃圾到对应垃圾桶' }}</text>
    </view>

    <!-- 游戏区 -->
    <view class="board">
      <view class="board-bg" />

      <!-- 垃圾区 -->
      <view class="trash-area">
        <view
          v-for="it in trashList"
          :key="it.key"
          class="trash"
          :class="{ done: doneMap[it.key] }"
          :style="{ left: it.x + 'px', top: it.y + 'px' }"
          @touchstart="startDrag(it, $event)"
          @touchmove="onDrag(it, $event)"
          @touchend="endDrag(it)"
        >
          <text class="emoji">{{ it.emoji }}</text>
          <text class="label">{{ it.name }}</text>
        </view>
      </view>

      <!-- 垃圾桶区 -->
      <view class="bin-area">
        <view class="bin recycle" id="bin-recycle">♻️ 可回收</view>
        <view class="bin kitchen" id="bin-kitchen">🥬 厨余</view>
        <view class="bin harmful" id="bin-harmful">☠️ 有害</view>
      </view>

    </view>

    <!-- 操作 -->
    <view class="actions">
      <view class="btn reset" @click="reset">↩ 重新开始</view>
      <view class="btn next" :class="{ disabled: !success }" @click="goNext">下一关 →</view>
    </view>

    <!-- 成功弹窗 -->
    <view v-if="success" class="popup">
      <view class="popup-card">
        <text class="pop-title">🎉 通关成功！</text>
        <text class="pop-desc">
          你学会了：分类就是一种信息处理！
          <text class="linebreak" />
          把不同信息放进不同类别。
        </text>
        <view class="pop-actions">
          <view class="pop-btn" @click="reset">再玩一次</view>
          <view class="pop-btn primary" @click="goNext">下一关 →</view>
        </view>
      </view>
    </view>

    <!-- 提示 -->
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
      levelId: 13,

      // 后端进度
      levelProgress: { unlocked: true },
      reported: false,

      trashList: [],
      doneMap: {},
      needCount: 6,
      success: false,

      toast: { show: false, text: '' },

      // 拖拽
      dragging: null,
      offsetX: 0,
      offsetY: 0,

      // 题库
      pool: [
        { key: 'bottle', name: '塑料瓶', emoji: '🧴', type: 'recycle' },
        { key: 'paper', name: '废纸', emoji: '📄', type: 'recycle' },
        { key: 'can', name: '易拉罐', emoji: '🥫', type: 'recycle' },

        { key: 'banana', name: '香蕉皮', emoji: '🍌', type: 'kitchen' },
        { key: 'apple', name: '苹果核', emoji: '🍎', type: 'kitchen' },
        { key: 'fish', name: '鱼骨头', emoji: '🐟', type: 'kitchen' },

        { key: 'battery', name: '电池', emoji: '🔋', type: 'harmful' },
        { key: 'drug', name: '过期药', emoji: '💊', type: 'harmful' },
        { key: 'lamp', name: '灯泡', emoji: '💡', type: 'harmful' }
      ]
    }
  },

  computed: {
    doneCount() {
      return Object.values(this.doneMap).filter(Boolean).length
    }
  },

  onLoad() {
    this.loadLevelProgress()
    this.newRound()
  },

  methods: {
    async loadLevelProgress() {
      try {
        const res = await request({ url: `/api/game/levels/${this.levelId}`, method: 'GET' })
        this.levelProgress.unlocked = res.unlocked === 1 || res.unlocked === true
      } catch (e) {}
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
      const list = this.shuffle(this.pool).slice(0, this.needCount)
      this.trashList = list.map((it, i) => ({
        ...it,
        x: 30 + (i % 2) * 170,
        y: 30 + Math.floor(i / 2) * 80

      }))
      this.doneMap = {}
      this.trashList.forEach(it => this.doneMap[it.key] = false)
      this.success = false
      this.reported = false
    },

    startDrag(it, e) {
      if (this.doneMap[it.key]) return
      this.dragging = it
      this.offsetX = e.touches[0].clientX - it.x
      this.offsetY = e.touches[0].clientY - it.y
    },

    onDrag(it, e) {
      if (this.dragging !== it) return
      it.x = e.touches[0].clientX - this.offsetX
      it.y = e.touches[0].clientY - this.offsetY
    },

    async endDrag(it) {
      if (!this.dragging) return

      const hit = await this.checkHit(it)
      if (hit) {
        if (hit === it.type) {
          this.doneMap[it.key] = true
          this.toastMini('✅ 分对了！')
          if (this.doneCount >= this.needCount) {
            this.success = true
            this.reportPass()
          }
        } else {
          this.toastMini('❌ 不对的垃圾桶')
        }
      }

      this.dragging = null
    },

    async checkHit(it) {
      // 注意：这里返回的是类型名（recycle/kitchen/harmful）
      const bins = [
        { type: 'recycle', selector: '#bin-recycle' },
        { type: 'kitchen', selector: '#bin-kitchen' },
        { type: 'harmful', selector: '#bin-harmful' }
      ]
    
      for (const b of bins) {
        const rect = await this.getRectBySelector(b.selector)
        if (!rect) continue
    
        // ✅ 用“垃圾卡片中心点”判断是否落进垃圾桶
        const cx = it.x + 70   // 140rpx 近似当 140px 可能不同机型，这里先用相对逻辑
        const cy = it.y + 70
    
        if (cx >= rect.left && cx <= rect.right && cy >= rect.top && cy <= rect.bottom) {
          return b.type
        }
      }
      return null
    },
    
    getRectBySelector(selector) {
      return new Promise(resolve => {
        const q = uni.createSelectorQuery().in(this)
        q.select(selector).boundingClientRect(res => {
          resolve(res)
        }).exec()
      })
    },


    async reportPass() {
      if (this.reported) return
      this.reported = true
      try {
        await request({
          url: `/api/game/levels/${this.levelId}/complete`,
          method: 'POST',
          data: { stars: 3, steps: this.doneCount }
        })
      } catch (e) {}
    },

    toastMini(text) {
      this.toast.text = text
      this.toast.show = true
      clearTimeout(this._t)
      this._t = setTimeout(() => this.toast.show = false, 900)
    },

    reset() {
      this.newRound()
    },

    goBack() {
      uni.navigateBack({ delta: 1 })
    },

    goNext() {
      if (!this.success) return
      uni.redirectTo({ url: '/pages/game/level/level14' })
    }
  }
}
</script>

<style scoped>
.page{
  min-height:100vh;
  padding:40rpx 30rpx;
  background:linear-gradient(135deg,#6a11cb,#2575fc,#89f7fe);
}
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

.hud{display:flex;justify-content:space-between;color:#fff;margin-bottom:14rpx;}
.badge{background:rgba(255,255,255,.2);padding:8rpx 16rpx;border-radius:999rpx;font-weight:900;}
.small{font-size:22rpx;}

.board{position:relative;background:#fff;border-radius:32rpx;padding:20rpx;min-height:800rpx;}
.trash-area{position:relative;height:520rpx;}
.trash{
  position:absolute;
  width:140rpx;height:140rpx;
  border-radius:22rpx;
  background:#f5f5f5;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
}
.trash.done{opacity:.4;}
.emoji{font-size:48rpx;}
.label{font-size:22rpx;font-weight:900;}

.bin-area{display:flex;justify-content:space-around;margin-top:20rpx;}
.bin{
  width: 200rpx;
  height: 120rpx;
  border-radius: 22rpx;
  display:flex;
  align-items:center;
  justify-content:center;
  font-weight: 900;
  position: relative;

  /* ✅ 轮廓 */
  border: 3rpx dashed rgba(0,0,0,0.25);
  box-shadow: 0 10rpx 24rpx rgba(0,0,0,0.10);
}

/* ✅ “投放口”视觉：让孩子知道往这里丢 */
.bin::after{
  content: '';
  position: absolute;
  top: 14rpx;
  left: 50%;
  transform: translateX(-50%);
  width: 120rpx;
  height: 22rpx;
  border-radius: 999rpx;
  border: 3rpx solid rgba(0,0,0,0.18);
  background: rgba(255,255,255,0.35);
}

.recycle{background:#c8f7c5;}
.kitchen{background:#ffeaa7;}
.harmful{background:#fab1a0;}

.actions{margin-top:16rpx;display:flex;gap:12rpx;}
.btn{flex:1;padding:20rpx;border-radius:999rpx;text-align:center;font-weight:900;}
.reset{background:#eee;}
.next{background:#4f6cff;color:#fff;}
.next.disabled{opacity:.4;}

.popup{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;}
.popup-card{background:#fff;padding:40rpx;border-radius:32rpx;text-align:center;}
.pop-title{font-size:40rpx;font-weight:900;}
.pop-desc{margin:16rpx 0;font-size:24rpx;}
.pop-actions{display:flex;gap:12rpx;}
.pop-btn{flex:1;padding:16rpx;border-radius:22rpx;background:#eee;}
.pop-btn.primary{background:#ff6b6b;color:#fff;}

.mini-toast{
  position:fixed;left:50%;bottom:120rpx;
  transform:translateX(-50%);
  background:rgba(0,0,0,.7);
  color:#fff;padding:14rpx 20rpx;border-radius:999rpx;
}
</style>
