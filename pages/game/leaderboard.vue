<template>
  <view class="page">


    <!-- 背景装饰 -->
    <view class="bg-decoration">
      <view class="star" v-for="i in 50" :key="i" :style="starStyle(i)"></view>
      <view class="circle circle-1"></view>
      <view class="circle circle-2"></view>
      <view class="circle circle-3"></view>
    </view>

    <!-- 标题区 -->
    <view class="hero">
      <text class="title">排行榜</text>
      <text class="sub-title">看看你在小伙伴中排第几名～</text>
    </view>

    <!-- Top3 -->
    <view class="top3 card">
      <text class="card-title">🏆 冠军榜</text>

      <view class="podium" v-if="top3.length">
        <!-- 第二名 -->
        <view class="podium-item second" v-if="top3[1]">
          <view class="badge">🥈</view>

          <image
            v-if="top3[1].avatar"
            class="avatar-img"
            :src="top3[1].avatar"
            mode="aspectFill"
          />
          <view v-else class="avatar">{{ getAvatarText(top3[1].name) }}</view>

          <text class="name">{{ top3[1].name }}</text>
          <text class="score">
            {{ sortBy === 'stars' ? `⭐ ${top3[1].stars}` : `🎯 ${top3[1].finishedLevels}` }}
          </text>
        </view>

        <!-- 第一名 -->
        <view class="podium-item first" v-if="top3[0]">
          <view class="badge">🥇</view>

          <image
            v-if="top3[0].avatar"
            class="avatar-img big"
            :src="top3[0].avatar"
            mode="aspectFill"
          />
          <view v-else class="avatar big">{{ getAvatarText(top3[0].name) }}</view>

          <text class="name">{{ top3[0].name }}</text>
          <text class="score">
            {{ sortBy === 'stars' ? `⭐ ${top3[0].stars}` : `🎯 ${top3[0].finishedLevels}` }}
          </text>
        </view>

        <!-- 第三名 -->
        <view class="podium-item third" v-if="top3[2]">
          <view class="badge">🥉</view>

          <image
            v-if="top3[2].avatar"
            class="avatar-img"
            :src="top3[2].avatar"
            mode="aspectFill"
          />
          <view v-else class="avatar">{{ getAvatarText(top3[2].name) }}</view>

          <text class="name">{{ top3[2].name }}</text>
          <text class="score">
            {{ sortBy === 'stars' ? `⭐ ${top3[2].stars}` : `🎯 ${top3[2].finishedLevels}` }}
          </text>
        </view>
      </view>

      <view v-else class="empty">
        <text>暂无数据，快去闯关拿星星吧～</text>
      </view>
    </view>

    <!-- 列表 -->
    <view class="card list-card">
      <view class="list-header">
        <text class="card-title">📌 全部排名</text>

        <view class="tabs">
          <view class="tab" :class="{ active: sortBy === 'stars' }" @click="switchSort('stars')">按星星</view>
          <view class="tab" :class="{ active: sortBy === 'levels' }" @click="switchSort('levels')">按关卡</view>
        </view>
      </view>

      <!-- 范围：班级/全校 -->
      <view class="scope-bar">
        <view class="scope-pill" :class="{ active: scope === 'class' }" @click="switchScope('class')">本班</view>
        <view class="scope-pill" :class="{ active: scope === 'school' }" @click="switchScope('school')">全校</view>
      </view>

      <scroll-view class="list" scroll-y>
        <view class="row" v-for="item in list" :key="item.userId" :class="{ me: item.isMe }">
          <view class="rank">
            <text v-if="item.rank <= 3">{{ rankEmoji(item.rank) }}</text>
            <text v-else>#{{ item.rank }}</text>
          </view>

          <view class="user">
            <image
              v-if="item.avatar"
              class="mini-avatar-img"
              :src="item.avatar"
              mode="aspectFill"
            />
            <view v-else class="mini-avatar">{{ getAvatarText(item.name) }}</view>

            <view class="meta">
              <text class="name">{{ item.name }}</text>
              <text class="sub">完成 {{ item.finishedLevels }} 关 · 连续 {{ item.streakDays }} 天</text>
            </view>
          </view>

          <view class="right">
            <text class="right-main">
              {{ sortBy === 'stars' ? `⭐ ${item.stars}` : `🎯 ${item.finishedLevels}` }}
            </text>
            <text class="right-sub" v-if="sortBy === 'levels'">⭐ {{ item.stars }}</text>
          </view>
        </view>

        <view class="list-footer-space"></view>
      </scroll-view>
    </view>

    <!-- 我的排名浮条 -->
    <view class="my-bar" v-if="myRank">
      <view class="my-left">
        <text class="my-title">我的排名</text>
        <text class="my-sub">继续加油就能上榜！</text>
      </view>

      <view class="my-right">
        <text class="my-rank">#{{ myRank.rank }}</text>
        <text class="my-score">
          {{ sortBy === 'stars' ? `⭐ ${myRank.stars}` : `🎯 ${myRank.finishedLevels}` }}
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
      sortBy: 'stars', // stars | levels
      scope: 'class',  // class | school
      list: [],
      myRank: null,
      starCache: []
    }
  },

  computed: {
    top3() {
      return this.list.slice(0, 3)
    }
  },

  onLoad() {
    this.initStars()
    this.loadRank()
  },

  methods: {
    goBack() {
      uni.reLaunch({
        url: '/pages/game/index'
      })
    },


    // 背景星星固定：只生成一次
    initStars() {
      const r = (n) => Math.random() * n
      this.starCache = Array.from({ length: 50 }).map(() => ({
        left: `${r(100)}%`,
        top: `${r(100)}%`,
        animationDelay: `${r(5)}s`,
        width: `${4 + r(8)}rpx`,
        height: `${4 + r(8)}rpx`
      }))
    },

    starStyle(i) {
      return this.starCache[i - 1] || {}
    },

    switchSort(type) {
      if (this.sortBy === type) return
      this.sortBy = type
      this.loadRank()
    },

    switchScope(sc) {
      if (this.scope === sc) return
      this.scope = sc
      this.loadRank()
    },

    async loadRank() {
      const res = await request({
        url: '/api/game/leaderboard',
        method: 'GET',
        data: {
          sort: this.sortBy,   // stars|levels
          scope: this.scope,   // class|school
          limit: 50
        }
      })

      const rawList = Array.isArray(res?.list) ? res.list : []
      const me = res?.me || null
      const meId = me?.userId ?? null

      // 直接按后端字段来（后端应该已给 rank/isMe）
      const list = rawList.map((it, idx) => ({
        userId: it.userId ?? it.id ?? idx + 1,
        name: it.name ?? `同学${idx + 1}`,
        avatar: it.avatar ?? null,
        stars: Number(it.stars ?? 0),
        finishedLevels: Number(it.finishedLevels ?? 0),
        streakDays: Number(it.streakDays ?? 0),
        rank: Number(it.rank ?? (idx + 1)),
        isMe: (typeof it.isMe === 'boolean') ? it.isMe : (meId != null && (it.userId ?? it.id) === meId)
      }))

      // 按 rank 排一下更稳
      list.sort((a, b) => a.rank - b.rank)
      this.list = list

      // 我的排名优先用后端 me.rank
      if (me) {
        const rank = Number(me.rank ?? 0) || (meId != null ? (list.find(x => x.userId === meId)?.rank ?? 0) : 0)
        this.myRank = rank > 0 ? {
          rank,
          stars: Number(me.stars ?? 0),
          finishedLevels: Number(me.finishedLevels ?? 0),
          streakDays: Number(me.streakDays ?? 0)
        } : null
      } else {
        const mine = list.find(x => x.isMe)
        this.myRank = mine ? {
          rank: mine.rank,
          stars: mine.stars,
          finishedLevels: mine.finishedLevels,
          streakDays: mine.streakDays
        } : null
      }
    },

    rankEmoji(r) {
      if (r === 1) return '🥇'
      if (r === 2) return '🥈'
      if (r === 3) return '🥉'
      return ''
    },

    getAvatarText(name) {
      if (!name) return '🙂'
      const s = String(name).trim()
      return s.length <= 2 ? s : s.slice(-2)
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #89f7fe 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  overflow: hidden;
}

.back-btn {
  position: fixed;
  left: 20rpx;
  top: 20rpx;
  width: 60rpx;
  height: 60rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  font-weight: bold;
  backdrop-filter: blur(10rpx);
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
  z-index: 100;
}
.back-btn:active {
  transform: scale(0.95);
  background: rgba(255, 255, 255, 0.3);
}

.bg-decoration {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}
.star {
  position: absolute;
  background: #ffffff;
  border-radius: 50%;
  opacity: 0;
  animation: twinkle 3s infinite ease-in-out;
  box-shadow: 0 0 10rpx rgba(255, 255, 255, 0.8);
}
@keyframes twinkle {
  0%, 100% { opacity: 0; }
  50% { opacity: 1; }
}
.circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(50rpx);
  border: 1rpx solid rgba(255, 255, 255, 0.1);
}
.circle-1 {
  width: 600rpx;
  height: 600rpx;
  top: -200rpx;
  right: -200rpx;
  animation: float-slow 20s infinite ease-in-out;
}
.circle-2 {
  width: 400rpx;
  height: 400rpx;
  bottom: -100rpx;
  left: -100rpx;
  animation: float-slow 15s infinite ease-in-out reverse;
}
.circle-3 {
  width: 200rpx;
  height: 200rpx;
  top: 40%;
  left: -100rpx;
  animation: float-slow 18s infinite ease-in-out;
}
@keyframes float-slow {
  0%, 100% { transform: translateY(0) translateX(0); }
  50% { transform: translateY(-30rpx) translateX(20rpx); }
}

.hero {
  margin-top: 110rpx;
  text-align: center;
  color: #fff;
  position: relative;
  z-index: 1;
}
.title {
  display: block;
  font-size: 56rpx;
  font-weight: 800;
  text-shadow: 0 4rpx 8rpx rgba(0,0,0,0.2);
  letter-spacing: 2rpx;
}
.sub-title {
  display: block;
  font-size: 26rpx;
  opacity: 0.95;
  margin-top: 10rpx;
  text-shadow: 0 2rpx 4rpx rgba(0,0,0,0.1);
}

.card {
  width: 85%;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 32rpx;
  margin-top: 40rpx;
  padding: 28rpx;
  box-shadow: 0 24rpx 60rpx rgba(0,0,0,0.15);
  backdrop-filter: blur(10rpx);
  border: 1rpx solid rgba(255, 255, 255, 0.8);
  position: relative;
  z-index: 1;
}

.card-title {
  font-size: 30rpx;
  font-weight: 800;
  color: #333;
}

.top3 .podium{
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-top: 18rpx;
  gap: 12rpx;
}

.podium-item{
  flex: 1;
  background: rgba(248, 249, 250, 0.9);
  border-radius: 22rpx;
  padding: 16rpx 12rpx;
  text-align: center;
  border: 1rpx solid rgba(0,0,0,0.05);
  box-shadow: 0 10rpx 24rpx rgba(0,0,0,0.08);
}
.podium-item.first{ transform: translateY(-12rpx); }
.podium-item.second{ transform: translateY(6rpx); }
.podium-item.third{ transform: translateY(10rpx); }

.badge{ font-size: 34rpx; }

.avatar{
  width: 84rpx;
  height: 84rpx;
  border-radius: 50%;
  margin: 10rpx auto 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(90deg, #667eea, #89f7fe);
  color: #fff;
  font-size: 24rpx;
  font-weight: 800;
  box-shadow: 0 10rpx 22rpx rgba(102,126,234,0.25);
}
.avatar.big{
  width: 96rpx;
  height: 96rpx;
  font-size: 26rpx;
}

/* ✅ 图片头像 */
.avatar-img{
  width: 84rpx;
  height: 84rpx;
  border-radius: 50%;
  margin: 10rpx auto 8rpx;
  display: block;
  box-shadow: 0 10rpx 22rpx rgba(102,126,234,0.25);
}
.avatar-img.big{
  width: 96rpx;
  height: 96rpx;
}

.name{
  display:block;
  font-size: 26rpx;
  font-weight: 800;
  color:#333;
  margin-top: 4rpx;
}
.score{
  display:block;
  font-size: 24rpx;
  color:#667eea;
  font-weight: 700;
  margin-top: 4rpx;
}

.empty{
  margin-top: 16rpx;
  color: #666;
  font-size: 24rpx;
}

.list-card{
  padding: 22rpx 22rpx 10rpx;
  margin-bottom: 120rpx;
}
.list-header{
  display:flex;
  align-items:center;
  justify-content: space-between;
  gap: 12rpx;
  margin-bottom: 10rpx;
}

.tabs{
  display:flex;
  gap: 10rpx;
}
.tab{
  padding: 10rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(102,126,234,0.10);
  color:#667eea;
  font-size: 22rpx;
  font-weight: 700;
  border: 1rpx solid rgba(102,126,234,0.18);
}
.tab.active{
  background: linear-gradient(90deg, #667eea, #89f7fe);
  color:#fff;
  border: none;
}

/* ✅ 范围选择 */
.scope-bar{
  display:flex;
  gap: 10rpx;
  margin-bottom: 12rpx;
}
.scope-pill{
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 159, 67, 0.12);
  color:#ff6b6b;
  font-size: 22rpx;
  font-weight: 800;
  border: 1rpx solid rgba(255, 159, 67, 0.18);
}
.scope-pill.active{
  background: linear-gradient(90deg, #ff9f43, #ff6b6b);
  color:#fff;
  border: none;
}

.list{
  height: 520rpx;
}

.row{
  display:flex;
  align-items:center;
  justify-content: space-between;
  padding: 14rpx 12rpx;
  border-radius: 18rpx;
  margin-bottom: 10rpx;
  background: rgba(248, 249, 250, 0.9);
  border: 1rpx solid rgba(0,0,0,0.04);
}
.row.me{
  background: rgba(102,126,234,0.12);
  border: 1rpx solid rgba(102,126,234,0.22);
}

.rank{
  width: 90rpx;
  font-size: 24rpx;
  font-weight: 900;
  color:#333;
  text-align:center;
}

.user{
  flex: 1;
  display:flex;
  align-items:center;
  gap: 12rpx;
}
.mini-avatar{
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  display:flex;
  align-items:center;
  justify-content:center;
  background: linear-gradient(90deg, #ff9f43, #ff6b6b);
  color:#fff;
  font-size: 22rpx;
  font-weight: 900;
  box-shadow: 0 10rpx 22rpx rgba(255,159,67,0.22);
}

/* ✅ 图片小头像 */
.mini-avatar-img{
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  display:block;
  box-shadow: 0 10rpx 22rpx rgba(255,159,67,0.22);
}

.meta{
  display:flex;
  flex-direction: column;
}
.meta .name{
  font-size: 26rpx;
  margin: 0;
}
.meta .sub{
  font-size: 22rpx;
  color:#666;
  margin-top: 2rpx;
}

.right{
  width: 160rpx;
  text-align:right;
}
.right-main{
  font-size: 24rpx;
  font-weight: 900;
  color:#667eea;
  display:block;
}
.right-sub{
  font-size: 22rpx;
  color:#666;
  margin-top: 2rpx;
  display:block;
}

.list-footer-space{
  height: 10rpx;
}

.my-bar{
  position: fixed;
  left: 50%;
  bottom: 20rpx;
  transform: translateX(-50%);
  width: 88%;
  padding: 18rpx 20rpx;
  border-radius: 24rpx;
  background: rgba(255,255,255,0.22);
  backdrop-filter: blur(12rpx);
  border: 1rpx solid rgba(255,255,255,0.25);
  box-shadow: 0 14rpx 32rpx rgba(0,0,0,0.16);
  display:flex;
  align-items:center;
  justify-content: space-between;
  z-index: 50;
}
.my-title{
  display:block;
  font-size: 24rpx;
  font-weight: 900;
  color:#fff;
}
.my-sub{
  display:block;
  font-size: 22rpx;
  color: rgba(255,255,255,0.92);
  margin-top: 2rpx;
}
.my-right{
  text-align:right;
}
.my-rank{
  display:block;
  font-size: 30rpx;
  font-weight: 1000;
  color:#fff;
}
.my-score{
  display:block;
  font-size: 24rpx;
  font-weight: 900;
  color:#fff;
  margin-top: 2rpx;
}
</style>
