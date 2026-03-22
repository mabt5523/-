<template>
  <view class="page">
    <!-- 顶部栏 -->
    <view class="topbar">
      <view class="title">
        <text class="t">作品广场</text>
        <text class="s">看看大家都做了什么 ✨</text>
      </view>

    </view>

    <!-- 搜索 + 排序 -->
    <view class="controls">
      <view class="search">
        <input
          v-model="keyword"
          class="search-input"
          placeholder="搜索作品标题/类型/内容关键字…"
          @confirm="loadPublicWorks(true)"
          confirm-type="search"
        />
      </view>

      <view class="sorts">
        <view class="pill" :class="{active: mode==='latest'}" @click="setMode('latest')">最新</view>
        <view class="pill" :class="{active: mode==='hot'}" @click="setMode('hot')">最热</view>
      </view>

      <view class="mine-bar">
        <view class="mine-btn" :class="{active: mode==='interact'}" @click="setMode('interact')">
          我的点赞和评论
        </view>
        <view class="mine-btn" :class="{active: mode==='works'}" @click="setMode('works')">
          我的作品
        </view>
      </view>
    </view>

    <!-- 列表 -->
    <view class="list">
      <view v-if="loading && works.length===0" class="muted">加载中…</view>
      <view v-else-if="!loading && works.length===0" class="muted">暂无公开作品</view>

      <view
        v-for="w in works"
        :key="w.id"
        class="card"
        @click="openDetail(w)"
      >
        <view class="card-top">
          <view class="chip">{{ w.type || '作品' }}</view>
          <view class="time">{{ formatTime(w.createdAt || w.updatedAt) }}</view>
        </view>

        <view class="card-title">{{ w.title || '未命名作品' }}</view>

        <!-- ✅ 列表图预览（有图才显示） -->
        <view v-if="w.images && w.images.length" class="img-row">
          <image
            v-for="(img, idx) in w.images.slice(0, 3)"
            :key="w.id + '_img_' + idx"
            class="thumb"
            :src="img"
            mode="aspectFill"
            @error="onImgError(img, w.id, idx)"
          />
        </view>

        <view class="preview">{{ w.preview || '（无预览内容）' }}</view>

        <view class="actions" @click.stop>
          <view class="a" @click="likeWork(w)">
            👍 <text class="n">{{ w.likeCount || 0 }}</text>
          </view>
          <view class="a" @click="openDetail(w)">
            💬 <text class="n">{{ w.commentCount || 0 }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 详情弹窗 -->
    <view v-if="detailOpen" class="mask" @click="detailOpen=false">
      <view class="modal" @click.stop>
        <view class="modal-head">
          <view class="modal-title">{{ current.title || '未命名作品' }}</view>
          <view class="modal-sub">
            <text class="chip">{{ current.type || '作品' }}</text>
            <text class="time">{{ formatTime(current.createdAt || current.updatedAt) }}</text>
          </view>
        </view>

        <scroll-view scroll-y class="modal-body">
          <!-- ✅ 详情图 -->
          <view v-if="current.images && current.images.length" class="detail-imgs">
            <image
              v-for="(img, idx) in current.images"
              :key="current.id + '_dimg_' + idx"
              class="detail-img"
              :src="img"
              mode="widthFix"
              @error="onImgError(img, current.id, idx)"
            />
          </view>

          <view class="content-block">
            <text class="label">作品内容</text>
            <text class="content">{{ current.fullText || current.preview || '' }}</text>
          </view>

          <view class="content-block" style="margin-top: 16rpx;">
            <view class="row">
              <text class="label">评论</text>
              <text class="muted2">{{ comments.length }} 条</text>
            </view>

            <view v-if="commentsLoading" class="muted2">评论加载中…</view>
            <view v-else-if="comments.length===0" class="muted2">还没有评论，来抢沙发～</view>

            <view v-for="c in comments" :key="c.id" class="comment">
              <view class="c-top">
                <text class="c-user">{{ c.user || '匿名' }}</text>
                <text class="c-time">{{ formatTime(c.createdAt) }}</text>
              </view>
              <view class="c-text">{{ c.content }}</view>
            </view>
          </view>
        </scroll-view>

        <view class="modal-foot">


          <input
            v-model="commentInput"
            class="comment-inp"
            placeholder="写条评论…"
            confirm-type="send"
            @confirm="submitComment"
          />
          <view class="btn" @click="submitComment">发送</view>
        </view>

        <view class="modal-actions" @click.stop>
          <view class="btn2 ghost" @click="likeWork(current, true)">👍 点赞</view>
          <view class="btn2" @click="detailOpen=false">关闭</view>
        </view>
      </view>
    </view>

  </view>
</template>

<script>
import request from '@/common/request.js';

function nowTs(){ return Date.now(); }

export default {
  data() {
    return {
      anon: false, // ✅ 是否匿名

      keyword: '',
      mode: 'latest', // latest | hot | interact | works

      loading: false,
      works: [],

      detailOpen: false,
      current: {},

      commentsLoading: false,
      comments: [],
      commentInput: '',

      likeLock: {},
      commentSending: false
    };
  },

  onLoad() {
    this.loadPublicWorks();
  },

  methods: {
    setMode(m) {
      if (this.mode === m) return;
      this.mode = m;
      this.loadPublicWorks();
    },

    goBack() {
      uni.navigateBack({ delta: 1 });
    },

    // ✅ 图片错误：方便你排查是不是 URL 不可访问 / tempFilePath / 403 / mixed content
    onImgError(src, workId, idx) {
      console.warn('[img error]', { src, workId, idx });
    },

    // ==============================
    // ✅ 作品广场：拉取公开作品
    // GET /api/work/public
    // ==============================
    async loadPublicWorks() {
      if (this.loading) return;
      this.loading = true;

      let url = '/api/work/public';
      if (this.mode === 'works') url = '/api/work/my/works';
      if (this.mode === 'interact') url = '/api/work/my/interactions';

      const sortBy = (this.mode === 'hot') ? 'hot' : 'latest';

      try {
        const res = await request({
          url,
          method: 'GET',
          params: {
            keyword: (this.keyword || '').trim(),
            sortBy
          }
        });

        const rawList = Array.isArray(res) ? res : (Array.isArray(res?.list) ? res.list : []);
        this.works = rawList.map(this.mapWork);
      } catch (e) {
        console.error('load works failed', e);
        uni.showToast({ title: '加载失败', icon: 'none' });
      } finally {
        this.loading = false;
      }
    },

    // ✅ 解析 payload（文本 + 图片）
    parsePayload(payload) {
      // 输出：{ fullText: string, images: string[] }
      let fullText = '';
      let images = [];

      const normalizeImgs = (arr) => {
        if (!Array.isArray(arr)) return [];
        // ✅ 关键：只保留“可访问 URL”
        return arr
          .map(x => String(x || '').trim())
          .filter(Boolean)
          .filter(u => /^https?:\/\//i.test(u));
      };

      const pickImagesFromObj = (obj) => {
        const arr =
          obj?.images ||
          obj?.imageUrls ||
          obj?.imgs ||
          obj?.pics ||
          obj?.pictures ||
          [];
        if (Array.isArray(arr)) return normalizeImgs(arr);
        if (typeof arr === 'string') return normalizeImgs([arr]);
        return [];
      };

      if (payload && typeof payload === 'object') {
        fullText = String(payload.text || payload.content || '');
        images = pickImagesFromObj(payload);
        return { fullText: fullText.trim(), images };
      }

      if (typeof payload === 'string') {
        const s = payload.trim();

        // ✅ payload 是 JSON 字符串（你后端 payload=longtext 强烈建议这样存）
        if ((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']'))) {
          try {
            const obj = JSON.parse(s);
            if (obj && typeof obj === 'object') {
              fullText = String(obj.text || obj.content || '');
              images = pickImagesFromObj(obj);
              return { fullText: fullText.trim(), images };
            }
          } catch (e) {
            // 不是合法 JSON 就当纯文本
          }
        }

        // ✅ 纯文本
        fullText = s;
        return { fullText: fullText.trim(), images: [] };
      }

      return { fullText: '', images: [] };
    },

    // ✅ 将后端 work/version 映射成前端统一结构
    mapWork(x) {
      const { fullText, images } = this.parsePayload(x?.payload);

      const title = x?.title || x?.name || x?.workTitle || '';
      const type = x?.type || x?.workType || x?.category || '';

      const createdAt =
        x?.createdAt ? (typeof x.createdAt === 'string' ? new Date(x.createdAt).getTime() : Number(x.createdAt)) :
        x?.createTime ? new Date(x.createTime).getTime() : 0;

      const updatedAt =
        x?.updatedAt ? (typeof x.updatedAt === 'string' ? new Date(x.updatedAt).getTime() : Number(x.updatedAt)) :
        x?.updateTime ? new Date(x.updateTime).getTime() : 0;

      const likeCount = Number(x?.likeCount ?? x?.likes ?? 0);
      const commentCount = Number(x?.commentCount ?? x?.commentsCount ?? 0);

      const preview = fullText
        ? (fullText.length > 90 ? fullText.slice(0, 90) + '…' : fullText)
        : String(x?.preview || '（无预览内容）');

      // ✅ 兜底：如果 payload 里没图，但后端顶层给了 imageUrls/images
      const topImgs =
        Array.isArray(x?.imageUrls) ? x.imageUrls :
        (Array.isArray(x?.images) ? x.images : []);

      const mergedImages = [
        ...images,
        ...topImgs.map(u => String(u || '').trim()).filter(Boolean).filter(u => /^https?:\/\//i.test(u))
      ];
      const uniqImages = Array.from(new Set(mergedImages));

      return {
        id: x?.id,
        title,
        type,
        createdAt,
        updatedAt,
        likeCount,
        commentCount,
        preview,
        fullText,
        images: uniqImages
      };
    },

    // ==============================
    // ✅ 点赞
    // POST /api/work/version/{id}/like
    // ==============================
    async likeWork(w, inDetail = false) {
      const id = w?.id;
      if (!id) return;

      if (this.likeLock[id]) return;
      this.likeLock[id] = true;

      // optimistic: 先加1
      w.likeCount = Number(w.likeCount || 0) + 1;
      if (!inDetail) {
        const hit = this.works.find(i => String(i.id) === String(id));
        if (hit && hit !== w) hit.likeCount = w.likeCount;
      }

      try {
        const res = await request({
          url: `/api/work/version/${id}/like`,
          method: 'POST'
        });

        // 后端如果是 toggle，可能返回 liked=false
        if (res && res.liked === false) {
          w.likeCount = Math.max(0, Number(w.likeCount || 0) - 2);
          const hit = this.works.find(i => String(i.id) === String(id));
          if (hit && hit !== w) hit.likeCount = w.likeCount;
        }
      } catch (e) {
        w.likeCount = Math.max(0, Number(w.likeCount || 0) - 1);
        const hit = this.works.find(i => String(i.id) === String(id));
        if (hit && hit !== w) hit.likeCount = w.likeCount;

        console.error('like failed', e);
        uni.showToast({ title: '点赞失败', icon: 'none' });
      } finally {
        this.likeLock[id] = false;
      }
    },

    // ==============================
    // ✅ 打开详情 + 拉评论
    // GET /api/work/version/{id}/comments
    // ==============================
    async openDetail(w) {
      if (!w?.id) return;
      this.current = JSON.parse(JSON.stringify(w));
      this.detailOpen = true;
      this.commentInput = '';
      await this.loadComments(w.id);
    },

    async loadComments(id) {
      this.commentsLoading = true;
      try {
        const res = await request({
          url: `/api/work/version/${id}/comments`,
          method: 'GET'
        });

        const rawList =
          (Array.isArray(res?.list) && res.list) ||
          (Array.isArray(res?.data) && res.data) ||
          (Array.isArray(res?.rows) && res.rows) ||
          (Array.isArray(res) && res) ||
          [];

        this.comments = rawList.map((c, idx) => {
          const userName =
            (c?.userName || c?.user || c?.nickname || c?.name || '').toString().trim();

          return {
            id: c?.id || `c_${idx}_${nowTs()}`,
            user: userName,
            content: String(c?.content || c?.text || c?.comment || ''),
            createdAt: c?.createTime ? new Date(c.createTime).getTime() : (c?.createdAt || 0)
          };
        });

      } catch (e) {
        console.error('load comments failed', e);
        this.comments = [];
      } finally {
        this.commentsLoading = false;
      }
    },

    // ==============================
    // ✅ 发表评论
    // POST /api/work/version/{id}/comment
    // ==============================
    async submitComment() {
      const id = this.current?.id;
      const text = (this.commentInput || '').trim();

      if (!id || !text || this.commentSending) return;

      this.commentSending = true;

      try {
        // ✅ 推荐：后端支持 anonymous 字段
        // ✅ 降级：后端不识别时，也能通过前缀区分
        const content = this.anon ? `[ANON] ${text}` : text;

        await request({
          url: `/api/work/version/${id}/comment`,
          method: 'POST',
          data: {
            content,
            anonymous: !!this.anon
          }
        });

        this.commentInput = '';
        await this.loadComments(id);

        this.current.commentCount = Number(this.current.commentCount || 0) + 1;
        const hit = this.works.find(i => String(i.id) === String(id));
        if (hit) hit.commentCount = Number(hit.commentCount || 0) + 1;

        uni.showToast({ title: '已发送', icon: 'none' });
      } catch (e) {
        console.error('comment failed', e);
        uni.showToast({ title: '发送失败', icon: 'none' });
      } finally {
        this.commentSending = false;
      }
    },

    formatTime(ts) {
      if (!ts) return '-';
      const d = new Date(ts);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const mi = String(d.getMinutes()).padStart(2, '0');
      return `${mm}-${dd} ${hh}:${mi}`;
    }
  }
};
</script>

<style scoped>
/* 基础样式 - 奇思妙想主题渐变背景 */
page {
  background: linear-gradient(120deg, #fdf2f8 0%, #e8f4f8 100%);
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", sans-serif;
}
.page {
  min-height: 100vh;
  padding: 22rpx 20rpx 40rpx;
}

/* 顶部栏 - 创意渐变风格 */
.topbar{
  display:flex;
  align-items:center;
  justify-content: space-between;
  gap: 12rpx;
  margin-bottom: 16rpx;
  position: relative;
  padding-bottom: 8rpx;
}
.topbar::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2rpx;
  background: linear-gradient(90deg, #8b5cf6, #ec4899, #3b82f6);
  border-radius: 1rpx;
}
.back{
  width: 68rpx;
  height: 68rpx;
  border-radius: 18rpx;
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
  color:#fff;
  display:flex;
  align-items:center;
  justify-content:center;
  font-weight: 900;
  font-size: 32rpx;
  box-shadow: 0 4rpx 12rpx rgba(139, 92, 246, 0.2);
  transition: all 0.2s ease;
}
.back:active {
  transform: scale(0.96);
  box-shadow: 0 2rpx 8rpx rgba(139, 92, 246, 0.15);
}
.title{ flex:1; text-align:center; }
.t{
  font-size: 34rpx;
  font-weight: 900;
  color:#1e1b4b;
  display:block;
  background: linear-gradient(90deg, #8b5cf6, #ec4899);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.s{
  font-size: 22rpx;
  color:#86909c;
  display:block;
  margin-top: 6rpx;
}
.refresh{
  padding: 14rpx 18rpx;
  border-radius: 18rpx;
  background:#ffffff;
  border: 1rpx solid rgba(139, 92, 246, 0.2);
  color:#8b5cf6;
  font-weight: 900;
  font-size: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(139, 92, 246, 0.08);
  transition: all 0.2s ease;
}
.refresh:active {
  background: #faf5ff;
  transform: scale(0.98);
}

/* 控制区 - 创意卡片样式 */
.controls{
  background:#ffffff;
  border: 1rpx solid rgba(139, 92, 246, 0.15);
  border-radius: 22rpx;
  padding: 16rpx;
  box-shadow: 0 6rpx 20rpx rgba(139, 92, 246, 0.06);
}
.search-input{
  height: 74rpx;
  border-radius: 18rpx;
  background:#f8fafc;
  border: 1rpx solid rgba(139, 92, 246, 0.15);
  padding: 0 16rpx;
  font-size: 26rpx;
  transition: all 0.2s ease;
}
.search-input:focus {
  border-color: #8b5cf6;
  box-shadow: 0 0 0 4rpx rgba(139, 92, 246, 0.1);
}
.sorts{
  display:flex;
  gap: 12rpx;
  margin-top: 12rpx;
}
.pill{
  flex:1;
  text-align:center;
  padding: 14rpx 0;
  border-radius: 16rpx;
  background:#ffffff;
  border: 1rpx solid rgba(139, 92, 246, 0.15);
  color:#4e5969;
  font-size: 24rpx;
  font-weight: 800;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}
.pill::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 3rpx;
  background: transparent;
  transition: background 0.2s ease;
}
.pill.active{
  background: rgba(139, 92, 246, 0.08);
  border-color: rgba(139, 92, 246, 0.25);
  color:#8b5cf6;
}
.pill.active::after {
  background: linear-gradient(90deg, #8b5cf6, #ec4899);
}
.pill:active {
  transform: scale(0.98);
  background: #faf5ff;
}

/* 我的作品/互动按钮组 */
.mine-bar{
  display:flex;
  gap: 12rpx;
  margin-top: 12rpx;
}
.mine-btn{
  flex:1;
  text-align:center;
  padding: 14rpx 0;
  border-radius: 16rpx;
  background:#ffffff;
  border: 1rpx solid rgba(139, 92, 246, 0.15);
  color:#4e5969;
  font-size: 24rpx;
  font-weight: 900;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}
.mine-btn::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 3rpx;
  background: transparent;
  transition: background 0.2s ease;
}
.mine-btn.active{
  background: rgba(139, 92, 246, 0.08);
  border-color: rgba(139, 92, 246, 0.25);
  color:#8b5cf6;
}
.mine-btn.active::after {
  background: linear-gradient(90deg, #8b5cf6, #ec4899);
}
.mine-btn:active {
  transform: scale(0.98);
  background: #faf5ff;
}

/* 作品列表 - 创意卡片风格 */
.list{
  margin-top: 16rpx;
  display:flex;
  flex-direction: column;
  gap: 14rpx;
}
.card{
  background:#ffffff;
  border-radius: 24rpx;
  padding: 18rpx;
  border: 1rpx solid rgba(139, 92, 246, 0.15);
  box-shadow: 0 8rpx 24rpx rgba(139, 92, 246, 0.06);
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}
.card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 4rpx;
  background: linear-gradient(90deg, #8b5cf6, #ec4899, #3b82f6);
}
.card:active {
  transform: translateY(-2rpx);
  box-shadow: 0 10rpx 30rpx rgba(139, 92, 246, 0.09);
}
.card-top{
  display:flex;
  align-items:center;
  justify-content: space-between;
  margin-bottom: 10rpx;
}
.chip{
  font-size: 22rpx;
  padding: 6rpx 12rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #ede9fe, #fce7f3);
  border: 1rpx solid rgba(139, 92, 246, 0.15);
  color:#8b5cf6;
  font-weight: 900;
}
.time{
  font-size: 22rpx;
  color:#86909c;
}
.card-title{
  font-size: 30rpx;
  font-weight: 900;
  color:#1e1b4b;
  margin-bottom: 10rpx;
}
.preview{
  font-size: 24rpx;
  color:#4e5969;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.actions{
  display:flex;
  gap: 14rpx;
  margin-top: 14rpx;
}
.a{
  flex:1;
  text-align:center;
  padding: 12rpx 0;
  border-radius: 16rpx;
  background:#f8fafc;
  border: 1rpx solid rgba(139, 92, 246, 0.15);
  font-weight: 900;
  color:#1e1b4b;
  transition: all 0.2s ease;
}
.a:active {
  background: #faf5ff;
  transform: scale(0.98);
}
.n{
  color:#8b5cf6;
  margin-left: 8rpx;
}

/* ✅ 列表图预览 */
.img-row{
  display:flex;
  gap: 10rpx;
  margin: 10rpx 0 8rpx;
}
.thumb{
  width: 200rpx;
  height: 140rpx;
  border-radius: 16rpx;
  background: #f8fafc;
  border: 1rpx solid rgba(139, 92, 246, 0.12);
  overflow: hidden;
}

/* 辅助文字样式 */
.muted{
  color:#86909c;
  font-size: 24rpx;
  padding: 20rpx 0;
  text-align:center;
}
.muted2{
  color:#86909c;
  font-size: 22rpx;
}

/* 遮罩层 - 模糊背景 */
.mask{
  position: fixed;
  left:0;
  top:0;
  right:0;
  bottom:0;
  background: rgba(0,0,0,0.45);
  display:flex;
  align-items:center;
  justify-content:center;
  z-index: 9999;
  padding: 24rpx;
  backdrop-filter: blur(8rpx);
}
.modal{
  width: 100%;
  background:#ffffff;
  border-radius: 22rpx;
  overflow:hidden;
  border: 1rpx solid rgba(139, 92, 246, 0.2);
  box-shadow: 0 12rpx 40rpx rgba(139, 92, 246, 0.15);
  position: relative;
}
.modal::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 4rpx;
  background: linear-gradient(90deg, #8b5cf6, #ec4899, #3b82f6);
}
.modal-head{
  padding: 18rpx;
  border-bottom: 1rpx solid rgba(139, 92, 246, 0.1);
}
.modal-title{
  font-size: 30rpx;
  font-weight: 900;
  color:#1e1b4b;
}
.modal-sub{
  display:flex;
  align-items:center;
  gap: 12rpx;
  margin-top: 10rpx;
}
.modal-body{
  height: 62vh;
  padding: 16rpx 18rpx;
  background:#ffffff;
}
.content-block .label{
  font-size: 24rpx;
  color:#86909c;
  font-weight: 900;
  display:block;
  margin-bottom: 10rpx;
}
.content{
  font-size: 26rpx;
  color:#1e1b4b;
  white-space: pre-wrap;
  line-height: 1.7;
}

/* ✅ 详情图 */
.detail-imgs{
  margin-bottom: 14rpx;
}
.detail-img{
  width: 100%;
  border-radius: 18rpx;
  margin-bottom: 10rpx;
  background: #f8fafc;
  border: 1rpx solid rgba(139, 92, 246, 0.12);
}

/* 行布局样式 */
.row{
  display:flex;
  justify-content: space-between;
  align-items:center;
  margin-bottom: 10rpx;
}

/* 评论样式 */
.comment{
  background:#f8fafc;
  border: 1rpx solid rgba(139, 92, 246, 0.15);
  border-radius: 18rpx;
  padding: 8rpx 10rpx;
  margin-top: 10rpx;
  transition: all 0.2s ease;
  max-width: 85%;
  width: fit-content;
}
.comment:active {
  background: #faf5ff;
}
.c-top{
  display:flex;
  justify-content: space-between;
  align-items:center;
  margin-bottom: 6rpx;
}
.c-user{
  font-size: 24rpx;
  font-weight: 900;
  color:#1e1b4b;
}
.c-time{
  font-size: 20rpx;
  color:#86909c;
}
.c-text{
  font-size: 24rpx;
  color:#4e5969;
  line-height: 1.6;
  white-space: pre-wrap;
}

/* 评论输入区 */
.modal-foot{
  display:flex;
  gap: 12rpx;
  padding: 14rpx 18rpx;
  border-top: 1rpx solid rgba(139, 92, 246, 0.1);
  align-items: center;
}
.comment-inp{
  flex:1;
  height: 76rpx;
  background:#f8fafc;
  border-radius: 18rpx;
  border: 1rpx solid rgba(139, 92, 246, 0.15);
  padding: 0 16rpx;
  font-size: 26rpx;
  transition: all 0.2s ease;
}
.comment-inp:focus {
  border-color: #8b5cf6;
  box-shadow: 0 0 0 4rpx rgba(139, 92, 246, 0.1);
}
.btn{
  width: 140rpx;
  height: 76rpx;
  border-radius: 18rpx;
  display:flex;
  align-items:center;
  justify-content:center;
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
  color:#fff;
  font-weight: 900;
  box-shadow: 0 4rpx 12rpx rgba(139, 92, 246, 0.2);
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}
.btn:active {
  transform: scale(0.98);
}

/* 底部按钮 */
.modal-actions{
  display:flex;
  gap: 12rpx;
  padding: 0 18rpx 18rpx;
}
.btn2{
  flex:1;
  text-align:center;
  padding: 16rpx 0;
  border-radius: 18rpx;
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
  color:#fff;
  font-weight: 900;
  transition: all 0.2s ease;
}
.btn2:active { transform: scale(0.98); }
.btn2.ghost{
  background:#ffffff;
  color:#8b5cf6;
  border: 1rpx solid rgba(139, 92, 246, 0.25);
  box-shadow: none;
}

/* ✅ 匿名开关小胶囊 */
.anon-row{
  margin-right: 10rpx;
}
.anon-pill{
  padding: 10rpx 14rpx;
  border-radius: 999rpx;
  background: #ffffff;
  border: 1rpx solid rgba(139, 92, 246, 0.18);
  color: #64748b;
  font-size: 22rpx;
  font-weight: 800;
}
.anon-pill.active{
  background: rgba(139, 92, 246, 0.10);
  border-color: rgba(139, 92, 246, 0.30);
  color: #8b5cf6;
}
</style>