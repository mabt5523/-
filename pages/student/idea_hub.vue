<template>
  <view class="page">
    <!-- 头部：返回按钮 + 标题 同行布局 -->
    <view class="header">
		<!-- 占位符：保持标题居中 -->
	<view class="empty-placeholder"></view>
		

      <view class="title-row">
        <text class="title">奇思妙想</text>
		
        <text class="sub">把想法变成作品 ✨</text>
      </view>
	  <view class="square-btn" @click="goSquare">作品广场</view>
      
    </view>
	
	

    <!-- 核心内容区 -->
    <view class="content">
      <!-- 新建想法 -->
      <view class="new-box">
        <input
          v-model="newIdeaText"
          class="new-input"
          placeholder="输入一个天马行空的想法…（例如：会提醒关灯的校园机器人）"
          confirm-type="done"
          @confirm="createIdeaFromText"
        />
        <view class="new-btn" @click="createIdeaFromText">
          <text class="btn-text">新建</text>
          <svg class="plus-icon" viewBox="0 0 24 24" width="20" height="20">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="#fff"/>
          </svg>
        </view>
      </view>

      <!-- 筛选 -->
      <view class="filters">
        <view class="pill" :class="{ active: filterStatus === 'all' }" @click="filterStatus='all'">全部</view>
        <view class="pill" :class="{ active: filterStatus === 'draft' }" @click="filterStatus='draft'">草稿</view>
        <view class="pill" :class="{ active: filterStatus === 'building' }" @click="filterStatus='building'">制作中</view>
        <view class="pill" :class="{ active: filterStatus === 'done' }" @click="filterStatus='done'">已完成</view>

        <view class="spacer"></view>

        <view class="small-btn" @click="clearAllLocalData">清空本地</view>
      </view>

      <!-- 搜索 -->
      <view class="search">
        <view class="search-wrapper">
          <svg class="search-icon" viewBox="0 0 24 24" width="20" height="20">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="#86909c"/>
          </svg>
          <input
            v-model="keyword"
            class="search-input"
            placeholder="搜索想法/作品…"
          />
        </view>
      </view>

      <view class="count">
        共 {{ filteredIdeas.length }} 个想法
      </view>

      <!-- 列表 -->
      <view class="list">
        <view v-if="filteredIdeas.length === 0" class="empty">
          <view class="empty-icon">
            <svg viewBox="0 0 24 24" width="80" height="80">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" fill="#fff"/>
            </svg>
          </view>
          <text class="empty-title">还没有想法</text>
          <text class="empty-sub">在上面输入一个想法，新建后就能开始和 AI 一起做作品～</text>
        </view>

        <view
          v-for="(item, index) in filteredIdeas"
          :key="item.id"
          class="card animate"
          :class="'delay' + (index % 5 + 1)"
          @click="openIdea(item.id)"
        >
          <!-- 创意角标装饰 -->
          <view class="card-corner"></view>

          <view class="card-top">
            <view class="status" :class="'s-' + item.status">
              {{ statusText(item.status) }}
            </view>

            <view style="display:flex; align-items:center; gap:12rpx;">
              <view class="time">
                更新：{{ formatTime(item.updatedAt) }}
              </view>

              <!-- ✅ 删除按钮（阻止冒泡，避免点删除还进入详情） -->
              <view class="del-idea" @click.stop="confirmDeleteIdea(item)">🗑</view>
            </view>
          </view>

          <view class="card-title">
            {{ item.title || '未命名想法' }}
          </view>

          <view class="meta">
            <view class="meta-chip" v-if="item.level">
              路线：{{ item.level }}
            </view>
            <view class="meta-chip" v-if="item.slots && item.slots.form">
              形式：{{ item.slots.form }}
            </view>
            <view class="meta-chip" v-if="item.versionsCount">
              作品版本：{{ item.versionsCount }}
            </view>
          </view>

          <view class="preview">
            <text class="preview-label">最近一句：</text>
            <text class="preview-text">{{ lastChatText(item) }}</text>
          </view>

          <view class="cta">
            <text>进入详情 →</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import request from '@/common/request.js';

const STORE_PREFIX = 'IDEA_WORKSHOP_V1';
function nowTs() { return Date.now(); }

export default {
  data() {
    return {
      userKey: '',
      newIdeaText: '',
      keyword: '',
      filterStatus: 'all',
      ideas: []
    };
  },

  onLoad() {
    this.initUserKeyThenLoad();
  },

  onShow() {
    // 返回首页时会触发，这里会重新拉 + 合并
    this.loadIdeas();
  },

  computed: {
    filteredIdeas() {
      const kw = (this.keyword || '').trim().toLowerCase();
      return (this.ideas || [])
        .filter(i => {
          const hitStatus = this.filterStatus === 'all' || i.status === this.filterStatus;
          if (!hitStatus) return false;
          if (!kw) return true;
          const hay = `${i.title || ''} ${this.lastChatText(i)} ${(i.slots && i.slots.form) || ''}`.toLowerCase();
          return hay.includes(kw);
        })
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    }
  },

  methods: {
	debugToken() {
	  const t = uni.getStorageSync('token');
	  console.log('[DEBUG] token=', t ? (t.slice(0, 18) + '...') : '(empty)');
	  return t;
	},
    getUserKey() {
      const uid = uni.getStorageSync('USER_ID') || uni.getStorageSync('userId');
      const s = String(uid || '').trim();
      return /^\d+$/.test(s) ? ('u_' + s) : 'u_0';
    },

    goSquare() {
      uni.navigateTo({
        url: '/pages/student/work_square',
        success() {
          console.log('已跳转到作品广场');
        },
        fail(err) {
          console.error('跳转失败', err);
          uni.showToast({
            title: '跳转失败，请检查路径',
            icon: 'none'
          });
        }
      });
    },

    async createIdeaFromText() {
      const title = (this.newIdeaText || '').trim();
      if (!title) {
        uni.showToast({ title: '请输入想法', icon: 'none' });
        return;
      }

      try {
        const res = await request({
          url: '/api/idea/create',
          method: 'POST',
          data: { title }
        });

        const id = res?.id ?? res?.data?.id ?? res?.idea?.id;
        if (!id) {
          uni.showToast({ title: '创建失败：后端未返回 id', icon: 'none' });
          return;
        }

        this.newIdeaText = '';
        // 创建后跳详情
        uni.navigateTo({ url: `/pages/student/idea_detail?id=${id}` });
      } catch (e) {
        console.error('create idea failed', e);
        uni.showToast({ title: '创建失败', icon: 'none' });
      }
    },

    clearAllLocalData() {
      uni.showModal({
        title: '清空本地数据？',
        content: '只清空本机缓存，不影响后端数据',
        success: (res) => {
          if (!res.confirm) return;

          // 只清当前用户桶（别全局清空）
          try {
            const prefix = `${STORE_PREFIX}::`;
            const keys = uni.getStorageInfoSync().keys || [];
            keys.forEach(k => {
              if (k.startsWith(prefix) && k.includes(`::${this.userKey}`)) {
                uni.removeStorageSync(k);
              }
            });
          } catch (e) {}

          this.ideas = [];
          uni.showToast({ title: '已清空本地缓存', icon: 'none' });
        }
      });
    },

    goBack() {
      uni.navigateBack({ delta: 1 });
    },

    async initUserKeyThenLoad() {
      // ✅ 修复：必须用 this.getUserKey()
      this.userKey = this.getUserKey();
      await this.loadIdeas();
    },

    // ========= keys =========
    storageKey() {
      return `${STORE_PREFIX}::ideas::${this.userKey}`;
    },
    versionsKey(ideaId) {
      return `${STORE_PREFIX}::versions::${this.userKey}::${ideaId}`;
    },
    ideaCacheKeyById() {
      return `${STORE_PREFIX}::ideaById::${this.userKey}`;
    },

    // ========= local =========
    loadIdeasLocalRaw() {
      try {
        const raw = uni.getStorageSync(this.storageKey());
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    },
    getVersions(ideaId) {
      try {
        const raw = uni.getStorageSync(this.versionsKey(ideaId));
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    },

    // ✅ 关键：合并策略
    // - 后端有：用后端为主
    // - 但如果本地同 id 的 updatedAt 更大（说明你刚在详情页改过），就用本地覆盖关键字段
    mergeBackendWithLocal(backendList) {
      const localList = this.loadIdeasLocalRaw();
      const localMap = {};
      (localList || []).forEach(x => { localMap[String(x.id)] = x; });

      return (backendList || []).map(b => {
        const lid = String(b.id);
        const l = localMap[lid];

        const versionsCount = this.getVersions(b.id).length;

        // 没有本地 -> 直接后端
        if (!l) return { ...b, versionsCount };

        const bUpdated = Number(b.updatedAt || 0);
        const lUpdated = Number(l.updatedAt || 0);

        // ✅ 本地更新更“新”，就覆盖这些字段（解决状态不同步）
        if (lUpdated > bUpdated) {
          return {
            ...b,
            title: l.title ?? b.title,
            status: l.status ?? b.status,
            level: l.level ?? b.level,
            slots: l.slots ?? b.slots,
            tasks: l.tasks ?? b.tasks,
            chat: l.chat ?? b.chat,
            updatedAt: lUpdated,
            versionsCount
          };
        }

        return { ...b, versionsCount };
      });
    },

    // ========= ✅ 优先后端：拉取列表 + 合并本地最新 =========
    async loadIdeas() {
      try {
        const res = await request({ url: '/api/idea/list', method: 'GET' });
        const list = Array.isArray(res?.list) ? res.list : [];

        const backend = list.map(i => ({
          id: i.id,
          title: i.title || '未命名想法',
          status: i.status || 'draft',
          createdAt: i.createTime ? new Date(i.createTime).getTime() : nowTs(),
          updatedAt: i.updateTime ? new Date(i.updateTime).getTime() : nowTs(),
          level: i.level || '',
          slots: i.slots || { goal: '', scene: '', audience: '', form: '' },
          tasks: i.tasks || [],
          chat: i.chat || []
        }));

        this.ideas = this.mergeBackendWithLocal(backend);
      } catch (e) {
        // 后端挂了就直接本地
        const localList = this.loadIdeasLocalRaw();
        this.ideas = (localList || []).map(i => ({
          ...i,
          versionsCount: this.getVersions(i.id).length
        }));
      }
    },

    openIdea(id) {
      uni.navigateTo({ url: `/pages/student/idea_detail?id=${id}` });
    },

    // =========================
    // ✅ 删除想法（走后端 DELETE /api/idea/{id}）
    // =========================
    confirmDeleteIdea(item) {
      const id = item?.id;
      if (!id) return;
    
      // ✅ 删除前检查 token
      const token = this.debugToken();
      if (!token) {
        uni.showToast({ title: '未登录或 token 丢失，请重新登录', icon: 'none' });
        return;
      }
    
      uni.showModal({
        title: '删除想法？',
        content: '删除后不可恢复（会同时删除该想法的聊天/作品版本等）。',
        confirmText: '删除',
        confirmColor: '#ef4444',
        success: async (res) => {
          if (!res.confirm) return;
          await this.deleteIdeaRemoteAndLocal(id);
        }
      });
    },

    async deleteIdeaRemoteAndLocal(ideaId) {
      try {
        uni.showLoading({ title: '删除中…' });
    
        // ✅ 1) 调后端删除（request.js 会自动带 Authorization: Bearer token）
        const resp = await request({
          url: `/api/idea/${ideaId}`,
          method: 'DELETE'
        });
    
        console.log('[DELETE OK]', resp);
    
        // ✅ 2) 清本地缓存（ideas list + byId + versions）
        this.removeIdeaFromLocalCaches(ideaId);
    
        // ✅ 3) 更新当前 UI 列表
        this.ideas = (this.ideas || []).filter(x => String(x.id) !== String(ideaId));
    
        uni.showToast({ title: '已删除', icon: 'none' });
      } catch (e) {
        // ✅ 关键：把后端返回的状态码/消息打印出来
        console.error('[DELETE FAIL]', e);
    
        const status = e?.statusCode;
        const msg =
          e?.data?.message ||
          e?.data?.msg ||
          (typeof e?.data === 'string' ? e.data : '');
    
        if (status === 401) {
          uni.showToast({ title: '401：未登录/Token 过期，请重新登录', icon: 'none' });
          return;
        }
        if (status === 403) {
          uni.showToast({ title: '403：无权限（token 有但不允许删除）', icon: 'none' });
          return;
        }
        if (status) {
          uni.showToast({ title: `${status}：删除失败 ${msg || ''}`.trim(), icon: 'none' });
          return;
        }
    
        // statusCode 为空：多半是 H5 被 CORS/预检拦了，或者网络错误
        uni.showToast({ title: '删除失败：网络/CORS（看控制台错误）', icon: 'none' });
      } finally {
        uni.hideLoading();
      }
    },
    removeIdeaFromLocalCaches(ideaId) {
      const idStr = String(ideaId);

      // A) ideas list 缓存
      try {
        const key = this.storageKey();
        const raw = uni.getStorageSync(key);
        const list = raw ? JSON.parse(raw) : [];
        const next = (list || []).filter(x => String(x.id) !== idStr);
        uni.setStorageSync(key, JSON.stringify(next));
      } catch (e) {}

      // B) byId map 缓存
      try {
        const mapKey = this.ideaCacheKeyById();
        const raw = uni.getStorageSync(mapKey);
        const map = raw ? JSON.parse(raw) : {};
        delete map[idStr];
        uni.setStorageSync(mapKey, JSON.stringify(map));
      } catch (e) {}

      // C) versions 本地缓存（你旧逻辑里版本还在本地）
      // 如果你后面把版本完全迁移到数据库，这段可以删掉
      try {
        const vKey = this.versionsKey(ideaId);
        uni.removeStorageSync(vKey);
      } catch (e) {}
    },

    statusText(s) {
      if (s === 'draft') return '草稿';
      if (s === 'building') return '制作中';
      if (s === 'done') return '已完成';
      return '未知';
    },

    formatTime(ts) {
      if (!ts) return '-';
      const d = new Date(ts);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const mi = String(d.getMinutes()).padStart(2, '0');
      return `${mm}-${dd} ${hh}:${mi}`;
    },

    lastChatText(item) {
      const chat = item && item.chat ? item.chat : [];
      if (!chat.length) return '还没开始聊天';
      return chat[chat.length - 1].text || '';
    }
  }
};
</script>

<style scoped>
/* 奇思妙想主题背景：蓝紫梦幻渐变 + 轻量噪点，适配全屏幕 */
.page {
  background: linear-gradient(120deg, #637aff, #9d6bff, #c963ff);
  background-size: 200% 200%;
  animation: bgMove 15s ease infinite alternate;
  min-height: 100vh;
  /* 轻量噪点提升质感，不刺眼 */
  background-image:
    linear-gradient(120deg, #637aff, #9d6bff, #c963ff),
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' viewBox='0 0 4 4'%3E%3Cpath fill='%23ffffff' fill-opacity='0.05' d='M1 3h1v1H1V3zm2-2h1v1H3V1z'%3E%3C/path%3E%3C/svg%3E");
}
/* 背景缓慢动效，增强创意灵动性 */
@keyframes bgMove {
  0% { background-position: 0% 0%; }
  100% { background-position: 100% 100%; }
}



/* 头部：返回按钮 + 标题 同行居中布局 */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 40rpx 0 24rpx;
  position: relative;
}
/* 占位符：让标题绝对居中 */
.empty-placeholder {
  width: 60rpx;
}
.back-btn {
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10rpx);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.3);
}
.back-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.08);
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.1);
}
.title-row {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}
.title {
  font-size: 52rpx;
  font-weight: 800;
  color: #fff;
  text-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.15);
  display: block;
  margin-bottom: 8rpx;
}
.sub {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

/* 核心内容区：毛玻璃卡片包裹，提升层次 */
.content {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(15rpx);
  border-radius: 32rpx;
  padding: 28rpx 24rpx;
  border: 1px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 12rpx 40rpx rgba(0, 0, 0, 0.08);
}

/* 新建想法输入框+按钮 */
.new-box {
  display:flex;
  gap: 14rpx;
  margin-bottom: 24rpx;
}
.new-input {
  flex:1;
  height: 88rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 0 24rpx;
  box-shadow: 0 6rpx 16rpx rgba(0, 0, 0, 0.05);
  border: 1rpx solid rgba(220, 220, 255, 0.6);
  font-size: 28rpx;
  transition: all 0.3s ease;
}
.new-input:focus {
  box-shadow: 0 8rpx 20rpx rgba(99, 122, 255, 0.15);
  border-color: #637aff;
  outline: none;
}
.new-btn{
  width: 140rpx;
  height: 88rpx;
  border-radius: 24rpx;
  display:flex;
  align-items:center;
  justify-content:center;
  gap: 6rpx;
  background: linear-gradient(135deg,#637aff,#9d6bff);
  color:#fff;
  font-weight: 700;
  font-size: 28rpx;
  box-shadow: 0 8rpx 20rpx rgba(99, 122, 255, 0.2);
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.3);
}
.new-btn:hover {
  transform: translateY(-2rpx);
  box-shadow: 0 10rpx 24rpx rgba(99, 122, 255, 0.25);
  background: linear-gradient(135deg,#5266ff,#8f5cff);
}
.plus-icon {
  transition: transform 0.3s ease;
}
.new-btn:hover .plus-icon {
  transform: rotate(90deg);
}

/* 筛选标签 */
.filters {
  display:flex;
  gap: 12rpx;
  align-items:center;
  margin-bottom: 18rpx;
  flex-wrap:wrap;
}
.pill {
  padding: 12rpx 20rpx;
  border-radius: 999rpx;
  background:#fff;
  color:#4e5969;
  border: 1rpx solid #eef1ff;
  font-size: 24rpx;
  transition: all 0.2s ease;
}
.pill:hover {
  transform: translateY(-2rpx);
  box-shadow: 0 4rpx 12rpx rgba(99, 122, 255, 0.08);
}
.pill.active {
  background: rgba(99, 122, 255, 0.15);
  color:#637aff;
  border-color: rgba(99, 122, 255, 0.3);
  font-weight: 700;
}
.small-btn {
  padding: 10rpx 16rpx;
  border-radius: 14rpx;
  background:#fff;
  border: 1rpx solid #eef1ff;
  color:#86909c;
  font-size: 24rpx;
  transition: all 0.2s ease;
}
.small-btn:hover {
  background: #f6f8ff;
  color:#637aff;
}
.spacer { flex:1; }

/* 搜索框 */
.search { margin-bottom: 14rpx; }
.search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}
.search-icon {
  position: absolute;
  left: 20rpx;
  pointer-events: none;
}
.search-input {
  width: 100%;
  height: 78rpx;
  background:#fff;
  border-radius: 22rpx;
  padding: 0 20rpx 0 60rpx;
  border: 1rpx solid #eef1ff;
  font-size: 26rpx;
  transition: all 0.3s ease;
}
.search-input:focus {
  border-color: #637aff;
  box-shadow: 0 4rpx 16rpx rgba(99, 122, 255, 0.08);
  outline: none;
}

/* 数量统计 */
.count {
  font-size: 24rpx;
  color:#86909c;
  margin-top: 6rpx;
  margin-bottom: 24rpx;
}

/* 想法列表 */
.list {
  display:flex;
  flex-direction: column;
  gap: 20rpx;
}
/* 列表渐入动画 */
.animate {
  opacity: 0;
  transform: translateY(20rpx);
  animation: fadeInUp 0.5s ease forwards;
}
.delay1 { animation-delay: 0.1s; }
.delay2 { animation-delay: 0.2s; }
.delay3 { animation-delay: 0.3s; }
.delay4 { animation-delay: 0.4s; }
.delay5 { animation-delay: 0.5s; }
@keyframes fadeInUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 想法卡片 */
.card {
  background:#fff;
  border-radius: 28rpx;
  padding: 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.04);
  border: 1rpx solid #f3f5ff;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
}
.card:hover {
  transform: translateY(-6rpx);
  box-shadow: 0 16rpx 32rpx rgba(99, 122, 255, 0.09);
  border-color: #eef2ff;
}
/* 卡片创意角标 */
.card-corner {
  position: absolute;
  top: 0;
  right: 0;
  width: 100rpx;
  height: 100rpx;
  background: linear-gradient(135deg, rgba(99,122,255,0.05), rgba(157,107,255,0.03));
  border-radius: 0 28rpx 0 80rpx;
}

/* 卡片头部：状态+时间 */
.card-top {
  display:flex;
  align-items:center;
  justify-content: space-between;
  margin-bottom: 16rpx;
  /* 新增：防止内容溢出 */
  flex-wrap: wrap;
  gap: 12rpx;
}
/* 调整时间+删除按钮的容器样式 */
.card-top view:nth-child(2) {
  display:flex;
  align-items:center;
  gap: 12rpx;
  /* 确保在小屏幕上也能正常显示 */
  flex-shrink: 0;
}
.status {
  font-size: 22rpx;
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  font-weight: 700;
  transition: all 0.2s ease;
}
.card:hover .status {
  transform: scale(1.05);
}
.s-draft {
  background: rgba(255, 247, 237, 0.8);
  color:#c2410c;
  border: 1rpx solid #fed7aa;
}
.s-building {
  background: rgba(238, 242, 255, 0.8);
  color:#637aff;
  border: 1rpx solid #c7d2fe;
}
.s-done {
  background: rgba(236, 253, 245, 0.8);
  color:#10b981;
  border: 1rpx solid #a7f3d0;
}
.time {
  font-size: 22rpx;
  color:#86909c;
}

.square-btn{
  padding: 12rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255,255,255,0.22);
  backdrop-filter: blur(10rpx);
  border: 1px solid rgba(255,255,255,0.35);
  color: #fff;
  font-size: 24rpx;
  font-weight: 800;
  box-shadow: 0 6rpx 18rpx rgba(0,0,0,0.10);
  transition: all .25s ease;
}
.square-btn:hover{
  transform: translateY(-2rpx);
  background: rgba(255,255,255,0.30);
}

/* ✅ 美化后的删除按钮样式 */
.del-idea{
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%; /* 圆形按钮 */
  display:flex;
  align-items:center;
  justify-content:center;
  /* 渐变背景 + 透明质感 */
  background: linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.05));
  border: 1rpx solid rgba(239,68,68,0.2);
  color: #ef4444;
  /* 替换文字为SVG图标，更美观 */
  font-size: 0;
  position: relative;
  box-shadow: 0 4rpx 12rpx rgba(239,68,68,0.08);
  transition: all .3s ease;
}
/* 新增：删除图标（SVG背景） */
.del-idea::after {
  content: '';
  width: 24rpx;
  height: 24rpx;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23ef4444'%3E%3Cpath d='M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z'/%3E%3C/svg%3E") center/contain no-repeat;
}
/* 悬浮效果 */
.del-idea:hover{
  transform: translateY(-2rpx) scale(1.05);
  background: linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.1));
  border-color: rgba(239,68,68,0.3);
  box-shadow: 0 6rpx 16rpx rgba(239,68,68,0.12);
}
/* 点击效果 */
.del-idea:active{
  transform: scale(0.96);
  background: linear-gradient(135deg, rgba(239,68,68,0.2), rgba(239,68,68,0.15));
}

/* 卡片内容 */
.card-title {
  font-size: 32rpx;
  font-weight: 800;
  color:#1d2129;
  margin-bottom: 14rpx;
  line-height: 1.4;
}
.meta {
  display:flex;
  gap: 10rpx;
  flex-wrap: wrap;
  margin-bottom: 12rpx;
}
.meta-chip {
  font-size: 22rpx;
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  background:#f6f8ff;
  color:#4e5969;
  border: 1rpx solid #eef1ff;
  transition: all 0.2s ease;
}
.card:hover .meta-chip {
  background: rgba(99, 122, 255, 0.1);
  border-color: rgba(99, 122, 255, 0.2);
}
.preview {
  display:flex;
  gap: 8rpx;
  margin-bottom: 12rpx;
}
.preview-label {
  font-size: 24rpx;
  color:#86909c;
  flex-shrink: 0;
}
.preview-text {
  font-size: 24rpx;
  color:#4e5969;
  flex:1;
  line-height: 1.4;
}
.cta {
  font-size: 26rpx;
  color:#637aff;
  font-weight: 700;
  padding-top: 8rpx;
  border-top: 1rpx solid #f3f5ff;
  transition: all 0.2s ease;
}
.card:hover .cta {
  color:#9d6bff;
  padding-left: 8rpx;
}

/* 空状态 */
.empty {
  padding: 80rpx 20rpx;
  text-align:center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
}
.empty-icon {
  margin-bottom: 10rpx;
  opacity: 0.9;
  transition: all 0.3s ease;
}
.empty:hover .empty-icon {
  transform: scale(1.05);
  opacity: 1;
}
.empty-title {
  font-size: 36rpx;
  font-weight: 800;
  color:#1d2129;
  display:block;
  margin-bottom: 10rpx;
}
.empty-sub {
  font-size: 28rpx;
  color:#86909c;
  display:block;
  line-height: 1.6;
  max-width: 600rpx;
}
</style>