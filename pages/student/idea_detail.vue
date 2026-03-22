<template>
  <view class="page">
    <!-- 顶部栏 -->
    <view class="topbar">
      <view class="top-title" @click="editTitleMode = true">
        <text v-if="!editTitleMode" class="t">{{ idea.title || '未命名想法' }}</text>
        <input
          v-else
          class="title-input"
          v-model="idea.title"
          confirm-type="done"
          @confirm="saveAndExitTitleEdit"
          @blur="saveAndExitTitleEdit"
        />
      </view>
      <view class="status-chip" :class="'s-' + idea.status" @click="toggleStatus">
        {{ statusText(idea.status) }}
      </view>
    </view>

    <!-- Tab -->
    <view class="tabs">
      <view class="tab" :class="{ active: tab==='chat' }" @click="tab='chat'">🤖 和AI聊</view>
      <view class="tab" :class="{ active: tab==='workshop' }" @click="tab='workshop'">🛠 作品工坊</view>
      <view class="tab" :class="{ active: tab==='history' }" @click="tab='history'">📚 作品历史</view>
    </view>

    <!-- ========== Chat ========== -->
    <view v-if="tab==='chat'" class="chat-wrap">
      <scroll-view class="chat-list" scroll-y :scroll-top="chatScrollTop">
        <view v-for="(m, idx) in idea.chat" :key="idx" class="msg-row" :class="m.role">
          <view class="bubble">
            <text class="msg-text">
              <text
                v-for="(seg, sidx) in renderTextSegments(m.text)"
                :key="idx + '-' + sidx"
                :class="{ 'txt-bold': seg.bold }"
              >
                {{ seg.text }}
              </text>
            </text>

            <!-- 小动作：把AI输出的关键内容一键写入工坊 -->
            <view v-if="m.role==='assistant'" class="mini-actions">
              <view class="mini-btn" @click="aiFillWorkshopLatest()">写入工坊</view>
              <view class="mini-btn" @click="giveThreeLevels()">给我三档方案</view>
            </view>
          </view>
        </view>
        <view style="height: 20rpx;"></view>
      </scroll-view>

      <view class="chat-input-bar">
        <input
          v-model="chatInput"
          class="chat-input"
          placeholder="对AI说说你的想法…"
          confirm-type="send"
          @confirm="sendChat"
        />
        <view class="send-btn" @click="sendChat">发送</view>
      </view>
    </view>

    <!-- ========== Workshop ========== -->
    <view v-else-if="tab==='workshop'" class="ws">
      <!-- 四要素 -->
      <view class="card">
        <view class="card-title">想法四要素</view>

        <view class="field">
          <text class="label">目标</text>
          <input class="inp" v-model="idea.slots.goal" placeholder="例如：节能 / 帮同学记作业 / 保护眼睛" @blur="persistAll" />
        </view>

        <view class="field">
          <text class="label">场景</text>
          <input class="inp" v-model="idea.slots.scene" placeholder="例如：教室 / 家里 / 图书馆" @blur="persistAll" />
        </view>

        <view class="field">
          <text class="label">对象</text>
          <input class="inp" v-model="idea.slots.audience" placeholder="例如：同学 / 老师 / 家长" @blur="persistAll" />
        </view>

        <view class="field">
          <text class="label">形式</text>
          <input class="inp" v-model="idea.slots.form" placeholder="例如：海报 / 故事 / 小游戏 / 小装置" @blur="persistAll" />
        </view>

        <view class="row">
          <view class="btn ghost" @click="autoClarifyIdea">帮我把想法变清楚</view>
          <view class="btn" @click="giveThreeLevels">生成三档落地方案</view>
        </view>
      </view>

      <!-- 路线选择 -->
      <view class="card">
        <view class="card-title">选择落地路线</view>
        <view class="levels">
          <view class="level" :class="{ active: idea.level==='L1' }" @click="setLevel('L1')">
            <text class="lv">L1</text>
            <text class="lt">今天就能做</text>
          </view>
          <view class="level" :class="{ active: idea.level==='L2' }" @click="setLevel('L2')">
            <text class="lv">L2</text>
            <text class="lt">1-2天完成</text>
          </view>
          <view class="level" :class="{ active: idea.level==='L3' }" @click="setLevel('L3')">
            <text class="lv">L3</text>
            <text class="lt">挑战版</text>
          </view>
        </view>

        <view class="row">
          <view class="btn ghost" @click="generateTasks">生成任务清单</view>
          <view class="btn" @click="markDone">标记为已完成</view>
        </view>
      </view>

      <!-- 任务清单 -->
      <view class="card">
        <view class="card-title">任务清单</view>

        <view class="task-add">
          <input class="task-inp" v-model="newTaskText" placeholder="新增任务…" @confirm="addTask" />
          <view class="task-add-btn" @click="addTask">添加</view>
        </view>

        <view v-if="!idea.tasks.length" class="muted">还没有任务，点“生成任务清单”试试。</view>

        <view v-for="t in idea.tasks" :key="t.id" class="task-row">
          <view class="chk" :class="{ on: t.done }" @click="toggleTask(t.id)">{{ t.done ? '✓' : '' }}</view>
          <input class="task-text" v-model="t.text" @blur="persist" />
          <view class="del" @click="removeTask(t.id)">删除</view>
        </view>
      </view>

      <!-- 作品草稿 -->
      <view class="card">
        <view class="card-title">作品草稿</view>

        <view class="type-row">
          <text class="label">作品类型</text>

          <view style="display:flex; align-items:center; gap:12rpx;">
            <picker :range="outputTypes" :value="outputTypeIndex" @change="onChangeOutputType">
              <view class="picker">{{ outputTypes[outputTypeIndex] }}</view>
            </picker>

            <!-- ✅ 修复点：弹窗不再放在 history 分支里，所以这里点了立刻可输入 -->
            <view class="mini-btn" @click="openCustomType">+ 自定义</view>
          </view>
        </view>

        <view class="draft-box">
          <textarea
            class="draft"
            v-model="draftText"
            placeholder="这里会生成作品初稿，你也可以自己修改…"
            maxlength="-1"
            @blur="persistDraft"
          />
        </view>



        <view v-if="draftImages.length" class="img-grid">
          <view v-for="(p, i) in draftImages" :key="p + '_' + i" class="img-item">
            <image :src="p" mode="aspectFill" class="img-thumb" @click="previewDraftImages(i)" />
            <view class="img-del" @click="removeDraftImage(i)">删除</view>
          </view>
        </view>

        <view class="row">
          <view class="btn ghost" @click="generateDraft">一键生成初稿</view>
          <view class="btn" @click="saveVersion">保存为新版本</view>
        </view>
      </view>

      <view class="foot-space"></view>
    </view>

    <!-- ========== History ========== -->
    <view v-else class="history">
      <view class="card">
        <view class="card-title">作品版本历史</view>
        <view v-if="versions.length===0" class="muted">
          还没有保存版本。去「作品工坊」点“保存为新版本”就会出现在这里～
        </view>

        <view v-for="v in versions" :key="v.id" class="ver" @click="openVersion(v)">
          <view class="ver-top">
            <text class="ver-title">{{ v.title }}</text>

            <view class="ver-right">
              <text class="vis" :class="(v.visibility || 'private') === 'public' ? 'public' : 'private'">
                {{ (v.visibility || 'private') === 'public' ? '公开' : '私密' }}
              </text>
              <text class="ver-time">{{ formatTime(v.createdAt) }}</text>
            </view>
          </view>

          <view class="ver-meta">
            <text class="chip">{{ v.type }}</text>
            <text class="chip" v-if="(v.payload?.images || []).length" style="margin-left:10rpx;">
              图片 {{ (v.payload?.images || []).length }}
            </text>
          </view>
          <view class="ver-preview">
            {{ (v.payload && v.payload.text) ? v.payload.text.slice(0, 60) + '…' : '' }}
          </view>
        </view>
      </view>

      <!-- 版本详情弹窗 -->
      <view v-if="versionModalOpen" class="modal-mask" @click="versionModalOpen=false">
        <view class="modal" @click.stop>
          <view class="modal-title">{{ currentVersion.title }}</view>
          <view class="modal-sub">{{ currentVersion.type }} · {{ formatTime(currentVersion.createdAt) }}</view>

          <scroll-view scroll-y class="modal-body">
            <text class="modal-text">{{ currentVersion.payload?.text || '' }}</text>

           
          </scroll-view>

          <view class="row">
            <view class="btn ghost" @click="loadVersionToDraft">加载到草稿继续改</view>
            <view class="btn danger" @click="deleteVersion(currentVersion.id)">删除该版本</view>
          </view>

          <view class="row" style="margin-top:12rpx;">
            <view class="btn" @click="publishVersionToSquare(currentVersion)">发布到广场</view>
            <view class="btn ghost" @click="toggleWorkVisibility(currentVersion)">
              {{ (currentVersion.visibility || 'private') === 'public' ? '设为私密' : '设为公开' }}
            </view>
          </view>
        </view>
      </view>

      <view class="foot-space"></view>
    </view>

    <!-- ✅ 修复点：自定义作品类型弹窗必须放在三大 Tab 外层，否则在 workshop 点了不会渲染 -->
    <view v-if="customTypeModalOpen" class="modal-mask" @click="customTypeModalOpen=false">
      <view class="modal" @click.stop>
        <view class="modal-title">新增作品类型</view>
        <input
          ref="customTypeInputRef"
          class="title-input"
          v-model="customTypeInput"
          :focus="customTypeModalOpen"
          placeholder="例如：短视频脚本 / PPT大纲 / 采访提纲"
          confirm-type="done"
          @confirm="addCustomType"
        />
        <view class="row" style="margin-top:12rpx;">
          <view class="btn ghost" @click="customTypeModalOpen=false">取消</view>
          <view class="btn" @click="addCustomType">添加</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import request from '@/common/request.js';

const STORE_PREFIX = 'IDEA_WORKSHOP_V1';
function nowTs() { return Date.now(); }
function vid() { return 'ver_' + Math.random().toString(36).slice(2) + '_' + Date.now(); }

export default {
  data() {
    return {
	  versionImages: [],     // 当前草稿/版本的图片URL数组（已上传）
	  uploading: false,
      saveTimer: null,
      savingRemote: false,
      userKey: '',

      id: '',
      idea: {
        id: '',
        title: '',
        status: 'draft',
        createdAt: 0,
        updatedAt: 0,
        level: '',
        slots: { goal: '', scene: '', audience: '', form: '' },
        tasks: [],
        chat: [],

        // ✅ 持久化字段：草稿 + 作品类型选择 + 图片草稿
        draftText: '',
        outputTypeIndex: 0,
        draftImages: [],

        // ✅ 作品发布元信息
        workMeta: { workVersionId: '', visibility: 'private' }
      },

      workMeta: {
        workVersionId: '',
        visibility: 'private'
      },

      tab: 'chat',
      editTitleMode: false,

      chatInput: '',
      chatScrollTop: 0,
      sending: false,

      outputTypes: ['海报文案', '故事脚本', '小游戏策划', '演讲稿'],
      outputTypeIndex: 0,
      draftText: '',
      draftImages: [],

      customTypeModalOpen: false,
      customTypeInput: '',

      newTaskText: '',

      versions: [],
      versionModalOpen: false,
      currentVersion: {}
    };
  },

  async onLoad(query) {
    this.id = query.id || '';
    this.userKey = this.getUserKey(); // ✅ 不要写死 guest（否则本地缓存/类型列表会乱）

    this.loadOutputTypes();
    await this.loadIdeaOrBack();

    this.syncFromIdea();

    if (this.idea?.workMeta) {
      this.workMeta = { ...this.workMeta, ...this.idea.workMeta };
    } else {
      this.idea.workMeta = { ...this.workMeta };
    }

    this.loadVersions();
    this.scrollChatToBottom();
  },

  async onShow() {
    this.syncFromIdea();
    if (this.idea?.workMeta) this.workMeta = { ...this.workMeta, ...this.idea.workMeta };
    this.loadVersions();
  },

  methods: {
	async pickImages() {
	  if (this.uploading) return;
	  const max = 9;
	
	  uni.chooseImage({
	    count: max,
	    success: async (res) => {
	      const paths = res.tempFilePaths || [];
	      if (!paths.length) return;
	
	      this.uploading = true;
	      try {
	        const uploadedUrls = [];
	        for (const p of paths) {
	          const url = await this.uploadOneImage(p);
	          if (url) uploadedUrls.push(url);
	        }
	        this.versionImages = [...this.versionImages, ...uploadedUrls].slice(0, max);
	        this.persistAll();
	        uni.showToast({ title: '图片已上传', icon: 'none' });
	      } catch (e) {
	        console.error(e);
	        uni.showToast({ title: '上传失败', icon: 'none' });
	      } finally {
	        this.uploading = false;
	      }
	    }
	  })
	},
	
	uploadOneImage(filePath) {
	  return new Promise((resolve, reject) => {
	    // 1) 后端地址：你本地 SpringBoot 大概率是 http，不是 https
	    const base = 'http://192.168.18.16:8080';
	    const url = base + '/api/upload/image';
	
	    // 2) 如果你后端做了鉴权（你 UploadController 里会触发）
	    //    这里从本地取 token（按你项目实际字段改一下）
	    const token =
	      uni.getStorageSync('TOKEN') ||
	      uni.getStorageSync('token') ||
	      uni.getStorageSync('ACCESS_TOKEN') ||
	      '';
	
	    uni.uploadFile({
	      url,
	      filePath,
	      name: 'file',
	      formData: { biz: 'idea_version' },
	
	      // 3) 关键：带 Authorization
	      header: token
	        ? { Authorization: `Bearer ${token}` }
	        : {},
	
	      success: (r) => {
	        // ★ 一定要先把状态码打印出来，不然你永远不知道是 401/413/500
	        console.log('[uploadFile] statusCode=', r.statusCode);
	        console.log('[uploadFile] raw data=', r.data);
	
	        // 4) HTTP 非 200 直接认为失败（并把后端返回吐出来）
	        if (r.statusCode !== 200) {
	          return reject(new Error(`HTTP ${r.statusCode}: ${String(r.data || '')}`));
	        }
	
	        // 5) 解析 JSON
	        let data;
	        try {
	          data = typeof r.data === 'string' ? JSON.parse(r.data) : (r.data || {});
	        } catch (e) {
	          return reject(new Error('response is not valid JSON: ' + String(r.data || '')));
	        }
	
	        // 6) 取 url（你后端返回的是 { url: "http://.../uploads/..." }）
	        const imgUrl = data.url || data.data?.url;
	        if (!imgUrl) return reject(new Error('no url in response: ' + JSON.stringify(data)));
	
	        resolve(String(imgUrl));
	      },
	
	      fail: (err) => {
	        // 7) 这里打印 fail 原因，很多时候就是 https/http 不匹配或证书问题
	        console.error('[uploadFile] fail:', err);
	        reject(err);
	      }
	    });
	  });
	},
    // ============ user ============
    getUserKey() {
      const uid = uni.getStorageSync('USER_ID') || uni.getStorageSync('userId');
      const s = String(uid || '').trim();
      return /^\d+$/.test(s) ? ('u_' + s) : 'u_0';
    },

    // ============ text render ============
    renderTextSegments(text) {
      const s = String(text ?? '');
      if (!s.includes('**')) return [{ text: s, bold: false }];

      const out = [];
      const re = /\*\*([\s\S]+?)\*\*/g;
      let last = 0;
      let m;

      while ((m = re.exec(s)) !== null) {
        const start = m.index;
        const end = re.lastIndex;

        if (start > last) out.push({ text: s.slice(last, start), bold: false });
        out.push({ text: m[1], bold: true });
        last = end;
      }
      if (last < s.length) out.push({ text: s.slice(last), bold: false });
      return out.length ? out : [{ text: s, bold: false }];
    },

    // ✅ 把 idea 的关键字段打包成后端想要的结构（如果后端不接收 draftImages/workMetaJson 可忽略，不影响前端）
    buildIdeaUpdatePayload() {
      return {
        id: Number(this.idea.id || this.id),
        title: this.idea.title || '',
        status: this.idea.status || 'draft',
        level: this.idea.level || '',

        slotsJson: JSON.stringify(this.idea.slots || { goal:'', scene:'', audience:'', form:'' }),
        tasksJson: JSON.stringify((this.idea.tasks || []).map(t => ({ text: String(t.text||''), done: !!t.done }))),
        chatJson: JSON.stringify(this.idea.chat || []),

        draftText: String(this.draftText || ''),
        outputTypeIndex: Number(this.outputTypeIndex || 0),

        // ✅ 可选：如果你后端愿意存图片草稿，就接这个字段；不接也没事
        draftImagesJson: JSON.stringify(this.draftImages || []),

        workMetaJson: JSON.stringify(this.idea.workMeta || { workVersionId:'', visibility:'private' })
      };
    },

    scheduleRemoteSave() {
      if (this.saveTimer) clearTimeout(this.saveTimer);
      this.saveTimer = setTimeout(() => { this.saveIdeaRemote(); }, 500);
    },

    async saveIdeaRemote() {
      if (this.savingRemote) return;
      this.savingRemote = true;
      try {
        await request({
          url: '/api/idea/update',
          method: 'POST',
          data: this.buildIdeaUpdatePayload()
        });
      } catch (e) {
        console.error('[saveIdeaRemote] failed', e);
      } finally {
        this.savingRemote = false;
      }
    },

    // =========================
    // ✅ 同步：idea <-> UI 镜像
    // =========================
    syncFromIdea() {
      const idx = Number(this.idea?.outputTypeIndex ?? 0);
      this.outputTypeIndex = (idx >= 0 && idx < this.outputTypes.length) ? idx : 0;

      this.draftText = String(this.idea?.draftText || '');
      this.draftImages = Array.isArray(this.idea?.draftImages) ? [...this.idea.draftImages] : [];
    },
    syncToIdea() {
      this.idea.draftText = String(this.draftText || '');
      this.idea.outputTypeIndex = Number(this.outputTypeIndex || 0);

      this.idea.draftImages = Array.isArray(this.draftImages) ? [...this.draftImages] : [];
      this.idea.workMeta = { ...this.workMeta };
    },

    persistAll() {
      this.syncToIdea();
      this.persist();
      this.syncIdeaStatusToHomeCache();
      this.scheduleRemoteSave();
    },

    // =========================
    // ✅ 让首页立刻同步（本地双写）
    // =========================
    ideasKey() { return `${STORE_PREFIX}::ideas::${this.userKey}`; },
    ideaCacheKeyById() { return `${STORE_PREFIX}::ideaById::${this.userKey}`; },

    loadIdeasListLocal() {
      try {
        const raw = uni.getStorageSync(this.ideasKey());
        return raw ? JSON.parse(raw) : [];
      } catch (e) { return []; }
    },
    saveIdeasListLocal(list) {
      uni.setStorageSync(this.ideasKey(), JSON.stringify(list || []));
    },
    getIdeaCacheMap() {
      try {
        const raw = uni.getStorageSync(this.ideaCacheKeyById());
        return raw ? JSON.parse(raw) : {};
      } catch (e) { return {}; }
    },
    setIdeaCacheMap(map) {
      uni.setStorageSync(this.ideaCacheKeyById(), JSON.stringify(map || {}));
    },
    cacheIdeaById(idea) {
      if (!idea || !idea.id) return;
      const map = this.getIdeaCacheMap();
      map[String(idea.id)] = idea;
      this.setIdeaCacheMap(map);
    },
    upsertIdeaToLocalList(idea) {
      const list = this.loadIdeasListLocal();
      const idx = list.findIndex(i => String(i.id) === String(idea.id));
      const snap = JSON.parse(JSON.stringify(idea));
      if (idx >= 0) list[idx] = snap;
      else list.unshift(snap);
      this.saveIdeasListLocal(list);
    },
    syncIdeaStatusToHomeCache() {
      this.cacheIdeaById(this.idea);
      this.upsertIdeaToLocalList(this.idea);
    },

    // ============ outputTypes (customizable) ============
    outputTypesKey() { return `${STORE_PREFIX}::outputTypes::${this.userKey}`; },
    versionsKey(ideaId) { return `${STORE_PREFIX}::versions::${this.userKey}::${ideaId}`; },

    loadOutputTypes() {
      try {
        const raw = uni.getStorageSync(this.outputTypesKey());
        if (raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr) && arr.length) this.outputTypes = arr;
        }
      } catch (e) {}
      if (this.outputTypeIndex >= this.outputTypes.length) this.outputTypeIndex = 0;
    },
    saveOutputTypes() {
      uni.setStorageSync(this.outputTypesKey(), JSON.stringify(this.outputTypes || []));
    },

    openCustomType() {
      this.customTypeInput = '';
      this.customTypeModalOpen = true;

      // ✅ 让输入框立刻可输入（部分端需要 nextTick）
      this.$nextTick(() => {
        // focus 由 :focus="customTypeModalOpen" 兜底
      });
    },
    addCustomType() {
      const t = (this.customTypeInput || '').trim();
      if (!t) {
        uni.showToast({ title: '请输入类型名称', icon: 'none' });
        return;
      }
      if (!this.outputTypes.includes(t)) {
        this.outputTypes.push(t);
        this.saveOutputTypes();
      }
      this.outputTypeIndex = this.outputTypes.indexOf(t);
      this.customTypeModalOpen = false;

      this.persistAll();
      uni.showToast({ title: '已添加作品类型', icon: 'none' });
    },

    // ============ helpers: shape/map ============
    ensureIdeaShape(idea) {
      const base = {
        id: '',
        title: '',
        status: 'draft',
        createdAt: 0,
        updatedAt: 0,
        level: '',
        slots: { goal: '', scene: '', audience: '', form: '' },
        tasks: [],
        chat: [],
        draftText: '',
        outputTypeIndex: 0,
        draftImages: [],
        workMeta: { workVersionId: '', visibility: 'private' }
      };
      const merged = { ...base, ...(idea || {}) };
      merged.slots = { ...base.slots, ...(merged.slots || {}) };
      merged.tasks = Array.isArray(merged.tasks) ? merged.tasks : [];
      merged.chat = Array.isArray(merged.chat) ? merged.chat : [];
      merged.draftText = typeof merged.draftText === 'string' ? merged.draftText : String(merged.draftText || '');
      merged.outputTypeIndex = Number.isFinite(Number(merged.outputTypeIndex)) ? Number(merged.outputTypeIndex) : 0;
      merged.draftImages = Array.isArray(merged.draftImages) ? merged.draftImages : [];
      merged.workMeta = { ...base.workMeta, ...(merged.workMeta || {}) };
      return merged;
    },

    mapBackendIdeaToFront(hit) {
      return {
        id: hit.id,
        title: hit.title || '未命名想法',
        status: hit.status || 'draft',
        createdAt: hit.createTime ? new Date(hit.createTime).getTime() : nowTs(),
        updatedAt: hit.updateTime ? new Date(hit.updateTime).getTime() : nowTs(),
        level: hit.level || '',
        slots: hit.slots || { goal: '', scene: '', audience: '', form: '' },
        tasks: hit.tasks || [],
        chat: hit.chat || [],
        draftText: hit.draftText || '',
        outputTypeIndex: Number(hit.outputTypeIndex || 0),
        draftImages: hit.draftImages || [], // ✅ 若后端不返回也没事
        workMeta: hit.workMeta || { workVersionId: '', visibility: 'private' }
      };
    },

    // ============ nav ============
    goBack() {
      uni.navigateBack({ delta: 1 });
    },

    // ============ load idea ============
    async loadIdeaOrBack() {
      const id = this.id;
      if (!id) {
        uni.showToast({ title: '缺少想法 id', icon: 'none' });
        setTimeout(() => this.goBack(), 300);
        return;
      }

      const localList = this.loadIdeasListLocal();
      const localFound = localList.find(i => String(i.id) === String(id));

      const map = this.getIdeaCacheMap();
      const localCached = map[String(id)];

      let localBest = null;
      if (localFound && localCached) {
        localBest = ((localFound.updatedAt || 0) >= (localCached.updatedAt || 0)) ? localFound : localCached;
      } else {
        localBest = localFound || localCached || null;
      }

      if (localBest) {
        this.idea = JSON.parse(JSON.stringify(this.ensureIdeaShape(localBest)));
        this.cacheIdeaById(this.idea);
        this.upsertIdeaToLocalList(this.idea);

        if (!this.idea.chat?.length) {
          this.idea.chat = [{ role: 'assistant', text: '你好～把你的想法告诉我吧！', ts: nowTs() }];
        }
      }

      try {
        const res = await request({ url: '/api/idea/list', method: 'GET' });
        const list = Array.isArray(res?.list) ? res.list : (Array.isArray(res) ? res : []);
        const hit = list.find(x => String(x.id) === String(id));

        if (!hit) {
          if (localBest) return;
          uni.showToast({ title: '找不到该想法', icon: 'none' });
          setTimeout(() => this.goBack(), 300);
          return;
        }

        const remoteIdea = this.ensureIdeaShape(this.mapBackendIdeaToFront(hit));
        const localUpdated = Number(localBest?.updatedAt || 0);
        const remoteUpdated = Number(remoteIdea?.updatedAt || 0);

        if (!localBest || remoteUpdated >= localUpdated) {
          this.idea = JSON.parse(JSON.stringify(remoteIdea));
          this.cacheIdeaById(this.idea);
          this.upsertIdeaToLocalList(this.idea);
        } else {
          try { await this.saveIdeaRemote(); } catch (e) {}
        }

        if (!this.idea.chat?.length) {
          this.idea.chat = [{ role: 'assistant', text: '你好～把你的想法告诉我吧！', ts: nowTs() }];
        }
        return;
      } catch (e) {
        if (localBest) return;
        uni.showToast({ title: '加载失败（后端不可用）', icon: 'none' });
        setTimeout(() => this.goBack(), 300);
      }
    },

    // ============ persist（本地缓存） ============
    persist() {
      this.idea.updatedAt = nowTs();
      this.upsertIdeaToLocalList(this.idea);
      this.cacheIdeaById(this.idea);
    },

    // ============ status ============
    statusText(s) {
      if (s === 'draft') return '草稿';
      if (s === 'building') return '制作中';
      if (s === 'done') return '已完成';
      return '未知';
    },
    async toggleStatus() {
      const next = this.idea.status === 'draft'
        ? 'building'
        : (this.idea.status === 'building' ? 'done' : 'draft');

      this.idea.status = next;
      this.persist();
      this.syncIdeaStatusToHomeCache();
      await this.saveIdeaRemote();
      uni.showToast({ title: `已切换为：${this.statusText(next)}`, icon: 'none' });
    },

    async markDone() {
      this.idea.status = 'done';
      this.persist();
      this.syncIdeaStatusToHomeCache();
      await this.saveIdeaRemote();
      uni.showToast({ title: '已标记完成 ✅', icon: 'none' });
    },

    // ============ title ============
    saveAndExitTitleEdit() {
      this.editTitleMode = false;
      this.persistAll();
    },

    // ✅ 组装上下文（统一用这个）
    buildContext() {
      return {
        title: this.idea.title || '',
        status: this.idea.status || 'draft',
        level: this.idea.level || '',
        slots: this.idea.slots || { goal:'', scene:'', audience:'', form:'' },
        tasks: (this.idea.tasks || []).map(t => ({ text: t.text, done: !!t.done })),
        draftText: this.draftText || '',
        draftImages: this.draftImages || [],
        outputType: this.outputTypes[this.outputTypeIndex] || '',
        outputTypeIndex: Number(this.outputTypeIndex || 0)
      };
    },

    // ============ chat（后端） ============
    async sendChat() {
      const text = (this.chatInput || '').trim();
      if (!text || this.sending) return;

      this.sending = true;

      this.idea.chat.push({ role: 'user', text, ts: nowTs() });
      this.chatInput = '';
      this.persistAll();
      this.scrollChatToBottom();

      try {
        const res = await request({
          url: '/api/idea/chat',
          method: 'POST',
          data: {
            ideaId: Number(this.idea.id || this.id),
            message: text,
            context: this.buildContext()
          }
        });

        const reply =
          res?.reply ??
          res?.data?.reply ??
          res?.text ??
          res?.message ??
          '（AI 暂无可识别 reply 字段，请检查后端返回结构）';

        this.idea.chat.push({ role: 'assistant', text: String(reply), ts: nowTs() });

        if (res?.slots) this.idea.slots = { ...this.idea.slots, ...res.slots };
        if (typeof res?.level === 'string') this.idea.level = res.level;

        if (Array.isArray(res?.tasks)) {
          this.idea.tasks = res.tasks.map((t, idx) => ({
            id: t.id || ('t_' + Date.now() + '_' + idx),
            text: String(t.text || ''),
            done: !!t.done
          }));
        }
        if (typeof res?.draftText === 'string') this.draftText = res.draftText;

        this.persistAll();
        this.scrollChatToBottom();
      } catch (e) {
        console.error('AI chat failed', e);
        this.idea.chat.push({ role: 'assistant', text: '（我这边暂时连接不上后端 AI 了，你可以稍后再试～）', ts: nowTs() });
        this.persistAll();
        this.scrollChatToBottom();
      } finally {
        this.sending = false;
      }
    },

    getLastAssistantText() {
      const list = this.idea.chat || [];
      for (let i = list.length - 1; i >= 0; i--) {
        if (list[i]?.role === 'assistant' && list[i]?.text) return list[i].text;
      }
      return '';
    },
    async aiFillWorkshopLatest() {
      const last = this.getLastAssistantText();
      if (!last) {
        uni.showToast({ title: '还没有AI回复', icon: 'none' });
        return;
      }
      return this.aiFillWorkshopFromMessage(last);
    },

    scrollChatToBottom() {
      this.chatScrollTop += 99999;
    },

    async aiFillWorkshopFromMessage(msgText) {
      if (this.sending) return;

      const payload = {
        ideaId: Number(this.idea.id || this.id),
        message: String(msgText || ''),
        context: this.buildContext(),
        clientTs: Date.now()
      };

      this.sending = true;

      try {
        const res = await request({
          url: '/api/idea/ai/fill-workshop',
          method: 'POST',
          data: payload
        });

        if (res?.slots && typeof res.slots === 'object') {
          this.idea.slots = {
            goal: res.slots.goal ?? '',
            scene: res.slots.scene ?? '',
            audience: res.slots.audience ?? '',
            form: res.slots.form ?? ''
          };
        }

        if (typeof res?.level === 'string') this.idea.level = res.level;

        if (Array.isArray(res?.tasks)) {
          this.idea.tasks = res.tasks.map((t, idx) => ({
            id: t.id || ('t_' + Date.now() + '_' + idx),
            text: String(t.text || ''),
            done: !!t.done
          }));
        }

        if (typeof res?.draftText === 'string') this.draftText = res.draftText;

        const tip = res?.reply ? String(res.reply) : '✅ 已按你最新要求更新作品工坊（含草稿/任务）';
        this.idea.chat.push({ role: 'assistant', text: tip, ts: Date.now() });

        if (this.idea.status === 'draft') this.idea.status = 'building';

        this.persistAll();
        uni.showToast({ title: '已更新工坊', icon: 'none' });
      } catch (e) {
        console.error('fill-workshop failed', e);
        uni.showToast({ title: '写入失败（后端AI未响应）', icon: 'none' });
      } finally {
        this.sending = false;
      }
    },

    // ============ workshop ============
    buildThreeLevelsText() {
      const title = this.idea.title || '这个想法';
      const form = this.idea.slots.form || '作品';
      return [
        `我给你三档落地方案（从易到难）：`,
        `L1（今天就能做）：做一份「${title}」的${form}初稿（标题+3条要点），拍照/截图保存。`,
        `L2（1-2天完成）：做出可展示的成品（加入细节/流程/示例），并让同学或家人给反馈。`,
        `L3（挑战版）：做一个“能演示”的版本（例如：模型/交互流程/小游戏原型），再做一次测试改进。`,
        `你想选哪一档？（回复 L1/L2/L3）`
      ].join('\n');
    },
    giveThreeLevels() {
      this.idea.chat.push({ role:'assistant', text: this.buildThreeLevelsText(), ts: nowTs() });
      this.persistAll();
      this.scrollChatToBottom();
    },
    autoClarifyIdea() {
      const s = this.idea.slots;
      const text = [
        '我把你的想法先整理成一句更清楚的话：',
        `「在${s.scene || '（场景）'}里，为了${s.goal || '（目标）'}，做一个给${s.audience || '（对象）'}用的${s.form || '（形式）'}。」`,
        '你看哪里需要改？可以直接告诉我。'
      ].join('\n');

      this.idea.chat.push({ role:'assistant', text, ts: nowTs() });
      this.persistAll();
      this.tab = 'chat';
      this.scrollChatToBottom();
    },
    setLevel(lv) {
      this.idea.level = lv;
      if (this.idea.status === 'draft') this.idea.status = 'building';
      this.persistAll();
    },

    async generateTasks() {
      if (this.sending) return;

      if (!this.idea.level) {
        uni.showToast({ title: '先选择 L1/L2/L3 路线', icon: 'none' });
        return;
      }

      this.sending = true;

      try {
        const res = await request({
          url: '/api/idea/ai/tasks',
          method: 'POST',
          data: {
            ideaId: Number(this.idea.id || this.id),
            level: this.idea.level,
            context: this.buildContext()
          }
        });

        if (Array.isArray(res?.tasks)) {
          this.idea.tasks = res.tasks.map((t, idx) => ({
            id: t.id || ('t_' + Date.now() + '_' + idx),
            text: String(t.text || ''),
            done: !!t.done
          }));
        } else {
          this.idea.tasks = [{ id: 't_' + Date.now(), text: '（AI没有返回 tasks 字段，请检查后端返回）', done: false }];
        }

        if (this.idea.status === 'draft') this.idea.status = 'building';

        const tip = res?.reply ? String(res.reply) : '我已按你选择的路线生成任务清单 ✅';
        this.idea.chat.push({ role:'assistant', text: tip, ts: nowTs() });

        this.persistAll();
        uni.showToast({ title: '已生成任务清单', icon: 'none' });
      } catch (e) {
        console.error('ai tasks failed', e);
        uni.showToast({ title: '生成失败（后端AI未响应）', icon: 'none' });
      } finally {
        this.sending = false;
      }
    },

    addTask() {
      const text = (this.newTaskText || '').trim();
      if (!text) return;
      this.idea.tasks.push({ id: 't_' + Date.now(), text, done:false });
      this.newTaskText = '';
      this.persistAll();
    },
    toggleTask(id) {
      const t = this.idea.tasks.find(x => x.id === id);
      if (!t) return;
      t.done = !t.done;
      this.persistAll();
    },
    removeTask(id) {
      this.idea.tasks = (this.idea.tasks || []).filter(x => x.id !== id);
      this.persistAll();
    },

    onChangeOutputType(e) {
      this.outputTypeIndex = Number(e.detail.value) || 0;
      this.persistAll();
    },
    persistDraft() {
      this.persistAll();
    },

    // ✅ 新增：草稿图片选择/预览/删除
    async chooseDraftImages() {
      if (this.uploading) return;
    
      uni.chooseImage({
        count: 9,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: async (res) => {
          const paths = res?.tempFilePaths || [];
          if (!paths.length) return;
    
          this.uploading = true;
          uni.showLoading({ title: '上传中…' });
    
          try {
            const uploadedUrls = [];
            for (const p of paths) {
              const url = await this.uploadOneImage(p); // 你已有这个方法
              if (url) uploadedUrls.push(String(url));
            }
    
            // draftImages 现在存的是可访问 URL（http/https）
            const set = new Set([...(this.draftImages || []), ...uploadedUrls]);
            this.draftImages = Array.from(set).slice(0, 9);
    
            this.persistAll();
            uni.showToast({ title: '图片已上传', icon: 'none' });
          } catch (e) {
            console.error(e);
            uni.showToast({ title: '上传失败', icon: 'none' });
          } finally {
            uni.hideLoading();
            this.uploading = false;
          }
        }
      });
    },
    removeDraftImage(i) {
      const list = [...(this.draftImages || [])];
      list.splice(i, 1);
      this.draftImages = list;
      this.persistAll();
    },
    previewDraftImages(startIndex) {
      const urls = this.draftImages || [];
      if (!urls.length) return;
      uni.previewImage({ urls, current: urls[startIndex] });
    },
    previewVersionImages(startIndex) {
      const urls = (this.currentVersion?.payload?.images || []);
      if (!urls.length) return;
      uni.previewImage({ urls, current: urls[startIndex] });
    },

    generateDraft() {
      const type = this.outputTypes[this.outputTypeIndex];
      const title = this.idea.title || '我的想法';
      const s = this.idea.slots || {};
      const lv = this.idea.level || 'L1';

      let text = '';
      if (type === '海报文案') {
        text = [
          `【海报标题】${title}`,
          `【一句话介绍】在${s.scene || '某个场景'}里，为了${s.goal || '一个目标'}，我们一起行动！`,
          `【三条口号】`,
          `1）我来提醒：${s.goal || '坚持好习惯'}`,
          `2）人人参与：${s.audience || '同学们'}一起做`,
          `3）从现在开始：小改变带来大进步`,
          `【行动提示】`,
          `- 看到提示就做一做`,
          `- 做完打个✓`,
          `- 分享给身边的人`
        ].join('\n');
      } else if (type === '故事脚本') {
        text = [
          `【故事标题】${title}`,
          `【人物】小主人公、同伴、一个“会说话”的${s.form || '小助手'}`,
          `【场景】${s.scene || '学校/家里'}`,
          `【冲突】大家经常忘记/做不好：${s.goal || '一个问题'}`,
          `【解决】${s.form || '小助手'}用有趣的方法提醒大家`,
          `【结局】大家养成好习惯，主人公总结：小行动=大改变`,
          `【版本】${lv}（你可以加更多细节和对话）`
        ].join('\n');
      } else if (type === '小游戏策划') {
        text = [
          `【游戏名】${title}`,
          `【目标】让玩家学会：${s.goal || '一个技能/习惯'}`,
          `【场景】${s.scene || '教室/家里'}`,
          `【玩法】`,
          `- 玩家点击/拖动完成任务`,
          `- 做对+1分，做错提示原因`,
          `【关卡】3关：入门 → 练习 → 挑战`,
          `【奖励】徽章/星星/排行榜`,
          `【备注】${lv}：L1写规则，L2做界面草图，L3做可运行原型`
        ].join('\n');
      } else {
        text = [
          `【演讲题目】${title}`,
          `大家好！我有一个想法：在${s.scene || '某个场景'}里，为了${s.goal || '解决一个问题'}，我想做一个给${s.audience || '大家'}用的${s.form || '作品'}。`,
          `为什么要做？因为它可以帮助我们：1）…… 2）……`,
          `我准备怎么做？我选择${lv}路线：先完成初稿，再不断改进。`,
          `希望大家给我一个建议：你觉得哪里最需要改进？谢谢大家！`
        ].join('\n');
      }

      this.draftText = text;
      this.idea.chat.push({ role:'assistant', text:`我已经生成「${type}」初稿啦 ✅\n去「作品工坊」看看并修改，然后保存为版本～`, ts: nowTs() });

      this.persistAll();
      uni.showToast({ title: '已生成初稿', icon: 'none' });
    },

    // ✅ 保存版本：把图片也存进去
    saveVersion() {
      const type = this.outputTypes[this.outputTypeIndex];
      const text = (this.draftText || '').trim();
      const images = Array.isArray(this.draftImages) ? this.draftImages : [];
    
      if (!text && !images.length) {
        uni.showToast({ title: '先写点内容或加图片再保存', icon: 'none' });
        return;
      }
    
      const v = {
        id: vid(),
        ideaId: this.idea.id,
        type,
        title: `${type} · ${this.idea.title || '未命名'} · v${(this.versions.length || 0) + 1}`,
        payload: { text, images },  // ✅ 这里存 URL
        createdAt: nowTs(),
        visibility: 'private',
        workVersionId: ''
      };
    
      const list = [v, ...(this.versions || [])];
      this.saveVersions(list);
    
      if (this.idea.status === 'draft') this.idea.status = 'building';
      this.persistAll();
    
      uni.showToast({ title: '已保存为新版本 ✅', icon: 'none' });
    },

    // =========================
    // ✅ 发布到作品广场（保留 + 支持图片）
    // POST /api/work/version
    // =========================
	async publishVersionToSquare(version) {
	  if (this.sending) return;
	
	  const v = version || this.currentVersion || {};
	  const vis = String(v?.visibility || 'private');
	  if (vis !== 'public') {
	    uni.showToast({ title: '请先把该版本设为公开，再发布到广场', icon: 'none' });
	    return;
	  }
	
	  // ✅ 允许只发图片 or 只发文字
	  const text = String(v?.payload?.text || '').trim();
	
	  // ✅ 关键：只保留“可访问 URL”的图片（http/https）
	  const rawImages = Array.isArray(v?.payload?.images) ? v.payload.images : [];
	  const images = rawImages
	    .map(x => String(x || '').trim())
	    .filter(u => /^https?:\/\//i.test(u)); // ⚠️ 如果你是 base64/dataURL，这里要改策略
	
	  if (!text && !images.length) {
	    uni.showToast({ title: '该版本没有内容/图片，无法发布', icon: 'none' });
	    return;
	  }
	
	  const type = String(v?.type || (this.outputTypes[this.outputTypeIndex] || '作品'));
	  const title = String(v?.title || (this.idea.title ? `${type} · ${this.idea.title}` : '未命名作品'));
	
	  // ✅ 最稳：payload 统一 string（对应你表 longtext）
	  const payloadObj = { text, images };
	  const payloadStr = JSON.stringify(payloadObj);
	
	  this.sending = true;
	  try {
	    uni.showLoading({ title: '发布中…' });
	
	    const res = await request({
	      url: '/api/work/version',
	      method: 'POST',
	      data: {
	        ideaId: Number(this.idea.id || this.id),
	        type,
	        title,
	
	        // ✅ 改这里：优先发 string（后端直接入库 idea_version.payload）
	        payload: payloadStr,
	
	        // ✅ 如果你后端坚持要对象，就把上一行改回 payload: payloadObj
	        visibility: 'public'
	      }
	    });
	
	    const workVersionId = res?.id ?? res?.data?.id ?? res?.versionId;
	    if (!workVersionId) {
	      console.log('[publishVersionToSquare] res=', res);
	      uni.showToast({ title: '发布失败：后端未返回id', icon: 'none' });
	      return;
	    }
	
	    // ✅ 写回本地版本：把 payload 也规范化（避免你本地还保留 tempFilePath）
	    const currentId = v?.id;
	    if (currentId) {
	      const idx = (this.versions || []).findIndex(x => x.id === currentId);
	      if (idx >= 0) {
	        const list = [...this.versions];
	        list[idx] = {
	          ...list[idx],
	          workVersionId: String(workVersionId),
	          visibility: 'public',
	          payload: payloadObj // 保持本地是对象，方便渲染
	        };
	        this.saveVersions(list);
	        this.currentVersion = list[idx];
	      }
	    }
	
	    // ✅ 写回 idea 的 workMeta
	    this.workMeta.workVersionId = String(workVersionId);
	    this.workMeta.visibility = 'public';
	    this.persistAll();
	
	    uni.showToast({ title: '已发布到广场 ✅', icon: 'none' });
	  } catch (e) {
	    console.error('publish work version failed', e);
	    uni.showToast({ title: '发布失败（请看控制台错误）', icon: 'none' });
	  } finally {
	    uni.hideLoading();
	    this.sending = false;
	  }
	},


    // =========================
    // ✅ 切换公开/私密（保留）
    // =========================
    async toggleWorkVisibility(version) {
      if (this.sending) return;

      const v = version || this.currentVersion || {};
      const vidLocal = v?.id;
      const cur = String(v?.visibility || 'private');
      const next = (cur === 'public') ? 'private' : 'public';

      const workId = String(v?.workVersionId || '');
      if (!workId) {
        if (vidLocal) {
          const idx = (this.versions || []).findIndex(x => x.id === vidLocal);
          if (idx >= 0) {
            const list = [...this.versions];
            list[idx] = { ...list[idx], visibility: next };
            this.saveVersions(list);
            this.currentVersion = list[idx];
          }
        }
        this.persistAll();
        uni.showToast({ title: next === 'public' ? '该版本已设为公开（可发布）' : '该版本已设为私密', icon: 'none' });
        return;
      }

      this.sending = true;
      try {
        uni.showLoading({ title: '更新中…' });

        await request({
          url: `/api/work/version/${workId}/visibility`,
          method: 'PATCH',
          data: { visibility: next }
        });

        if (vidLocal) {
          const idx = (this.versions || []).findIndex(x => x.id === vidLocal);
          if (idx >= 0) {
            const list = [...this.versions];
            list[idx] = { ...list[idx], visibility: next };
            this.saveVersions(list);
            this.currentVersion = list[idx];
          }
        }

        this.workMeta.visibility = next;
        this.persistAll();
        uni.showToast({ title: next === 'public' ? '已设为公开' : '已设为私密', icon: 'none' });
      } catch (e) {
        console.error('toggle visibility failed', e);
        uni.showToast({ title: '更新失败（请看控制台错误）', icon: 'none' });
      } finally {
        uni.hideLoading();
        this.sending = false;
      }
    },

    // ============ versions ============
    loadVersions() {
      try {
        const raw = uni.getStorageSync(this.versionsKey(this.id));
        this.versions = raw ? JSON.parse(raw) : [];
        this.versions.sort((a,b) => (b.createdAt||0) - (a.createdAt||0));
      } catch (e) {
        this.versions = [];
      }
    },
    saveVersions(list) {
      uni.setStorageSync(this.versionsKey(this.id), JSON.stringify(list || []));
      this.versions = list || [];
    },
    openVersion(v) {
      this.currentVersion = v || {};
      this.versionModalOpen = true;
    },
    loadVersionToDraft() {
      const text = this.currentVersion?.payload?.text || '';
      const images = Array.isArray(this.currentVersion?.payload?.images) ? this.currentVersion.payload.images : [];

      if (!text && !images.length) return;

      this.draftText = text;
      this.draftImages = [...images];

      this.versionModalOpen = false;
      this.tab = 'workshop';
      this.persistAll();
      uni.showToast({ title: '已加载到草稿', icon: 'none' });
    },
    deleteVersion(id) {
      uni.showModal({
        title: '删除版本？',
        content: '删除后不可恢复',
        success: (res) => {
          if (!res.confirm) return;
          const list = (this.versions || []).filter(v => v.id !== id);
          this.saveVersions(list);
          this.versionModalOpen = false;
          uni.showToast({ title: '已删除', icon: 'none' });
        }
      });
    },

    // ============ helpers ============
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
/* 基础重置与全局样式 - 奇思妙想主题 */
page {
  background: linear-gradient(120deg, #fdf2f8 0%, #e8f4f8 100%);
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", sans-serif;
}
.page {
  height: 96vh;
  display: flex;
  flex-direction: column;
  padding: 24rpx 24rpx 24rpx;
}
.topbar { flex: 0 0 auto; }
.tabs { flex: 0 0 auto; }

/* 顶部栏美化 - 增加创意感 */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 20rpx;
  padding-bottom: 12rpx;
  border-bottom: 1px solid rgba(139, 92, 246, 0.1);
  position: relative;
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
.back {
  font-size: 26rpx;
  color: #8b5cf6;
  font-weight: 600;
  padding: 12rpx 18rpx;
  border-radius: 16rpx;
  background: #ffffff;
  border: 1px solid rgba(139, 92, 246, 0.2);
  box-shadow: 0 4rpx 12rpx rgba(139, 92, 246, 0.1);
  transition: all 0.2s ease;
}
.back:active { background: #faf5ff; transform: scale(0.98); }
.top-title { flex: 1; }
.t {
  font-size: 32rpx;
  font-weight: 700;
  color: #1e1b4b;
  line-height: 1.4;
}
.title-input {
  height: 70rpx;
  background: #ffffff;
  border-radius: 18rpx;
  padding: 0 20rpx;
  border: 1px solid rgba(139, 92, 246, 0.2);
  font-size: 28rpx;
  box-shadow: 0 4rpx 12rpx rgba(139, 92, 246, 0.08);
}
.status-chip {
  font-size: 22rpx;
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  font-weight: 600;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}
.status-chip::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  transition: left 0.5s ease;
}
.status-chip:active::before { left: 100%; }
.status-chip:active { transform: scale(0.95); }
.s-draft { background: linear-gradient(135deg, #fffbeb, #fef3c7); color: #92400e; border: 1px solid #fcd34d; }
.s-building { background: linear-gradient(135deg, #eff6ff, #dbeafe); color: #1e40af; border: 1px solid #60a5fa; }
.s-done { background: linear-gradient(135deg, #ecfdf5, #d1fae5); color: #065f46; border: 1px solid #34d399; }

/* Tab栏美化 - 创意渐变风格 */
.tabs { display: flex; gap: 12rpx; margin-bottom: 20rpx; }
.tab {
  flex: 1;
  text-align: center;
  padding: 16rpx 0;
  border-radius: 18rpx;
  background: #ffffff;
  border: 1px solid rgba(139, 92, 246, 0.15);
  color: #64748b;
  font-size: 26rpx;
  font-weight: 600;
  transition: all 0.2s ease;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.03);
  position: relative;
  overflow: hidden;
}
.tab::before {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 3rpx;
  background: transparent;
  transition: background 0.2s ease;
}
.tab.active {
  background: #ffffff;
  border-color: rgba(139, 92, 246, 0.3);
  color: #8b5cf6;
  font-weight: 700;
  box-shadow: 0 6rpx 16rpx rgba(139, 92, 246, 0.12);
}
.tab.active::before { background: linear-gradient(90deg, #8b5cf6, #ec4899); }
.tab:active { transform: scale(0.98); background: #f8fafc; }

/* 聊天区域 */
.chat-wrap {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: calc(100vh - 200rpx);
}
.chat-list { flex: 1 1 auto; min-height: 0; overflow: hidden; }
.msg-row { display: flex; margin-bottom: 16rpx; align-items: flex-start; }
.msg-row.user { justify-content: flex-end; }
.msg-row.assistant { justify-content: flex-start; }
.bubble {
  max-width: 80%;
  padding: 16rpx 20rpx;
  border-radius: 20rpx;
  line-height: 1.6;
  position: relative;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}
.user .bubble {
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
  color: #ffffff;
  border-bottom-right-radius: 6rpx;
}
.assistant .bubble {
  background: #ffffff;
  color: #1e1b4b;
  border: 1px solid rgba(139, 92, 246, 0.1);
  border-bottom-left-radius: 6rpx;
}
.msg-text { font-size: 26rpx; white-space: pre-wrap; }

/* 迷你操作按钮 */
.mini-actions { display: flex; gap: 10rpx; margin-top: 10rpx; flex-wrap: wrap; }
.mini-btn {
  font-size: 22rpx;
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  background: #ffffff;
  border: 1px solid rgba(139, 92, 246, 0.2);
  color: #8b5cf6;
  font-weight: 600;
  transition: all 0.2s ease;
}
.mini-btn:active {
  background: #faf5ff;
  transform: scale(0.95);
  box-shadow: 0 2rpx 8rpx rgba(139, 92, 246, 0.1);
}

.chat-input-bar {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding-top: 2rpx;
  padding-bottom: calc(env(safe-area-inset-bottom) + 6rpx);
  margin-top: 0rpx;
  background: rgba(253, 242, 248, 0.9);
  backdrop-filter: blur(8rpx);
  box-sizing: border-box;
}
.chat-input {
  flex: 1;
  height: 80rpx;
  background: #ffffff;
  border-radius: 20rpx;
  border: 1px solid rgba(139, 92, 246, 0.15);
  padding: 0 20rpx;
  font-size: 26rpx;
  box-shadow: 0 4rpx 12rpx rgba(139, 92, 246, 0.05);
}
.send-btn {
  flex: 0 0 140rpx;
  height: 80rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
  color: #ffffff;
  font-weight: 700;
  font-size: 26rpx;
  box-shadow: 0 6rpx 16rpx rgba(139, 92, 246, 0.2);
  position: relative;
  overflow: hidden;
}
.send-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  transition: left 0.5s ease;
}
.send-btn:active { transform: scale(0.98); box-shadow: 0 4rpx 12rpx rgba(139, 92, 246, 0.15); }
.send-btn:active::before { left: 100%; }

/* 工坊和历史页面通用 */
.ws, .history { padding-bottom: 20rpx; }

/* 卡片 */
.card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 24rpx;
  border: 1px solid rgba(139, 92, 246, 0.1);
  box-shadow: 0 8rpx 24rpx rgba(139, 92, 246, 0.06);
  margin-bottom: 20rpx;
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
.card:active { box-shadow: 0 10rpx 30rpx rgba(139, 92, 246, 0.09); transform: translateY(-2rpx); }
.card-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #1e1b4b;
  margin-bottom: 18rpx;
  display: flex;
  align-items: center;
}
.card-title::before {
  content: '';
  display: inline-block;
  width: 6rpx;
  height: 24rpx;
  background: linear-gradient(180deg, #8b5cf6, #ec4899);
  border-radius: 3rpx;
  margin-right: 10rpx;
}

/* 表单字段 */
.field { display: flex; align-items: center; gap: 16rpx; margin-bottom: 16rpx; }
.label { width: 90rpx; font-size: 24rpx; color: #475569; font-weight: 600; }
.inp {
  flex: 1;
  height: 70rpx;
  border-radius: 18rpx;
  background: #f8fafc;
  border: 1px solid rgba(139, 92, 246, 0.15);
  padding: 0 18rpx;
  font-size: 26rpx;
  color: #1e1b4b;
  transition: all 0.2s ease;
}
.inp:focus { border-color: #8b5cf6; box-shadow: 0 0 0 4rpx rgba(139, 92, 246, 0.1); background: #ffffff; }

/* 按钮组 */
.row { display: flex; gap: 12rpx; margin-top: 12rpx; }
.btn {
  flex: 1;
  text-align: center;
  padding: 18rpx 0;
  border-radius: 20rpx;
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
  color: #ffffff;
  font-weight: 700;
  font-size: 26rpx;
  transition: all 0.2s ease;
  box-shadow: 0 6rpx 16rpx rgba(139, 92, 246, 0.2);
  position: relative;
  overflow: hidden;
}
.btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
  transition: left 0.5s ease;
}
.btn:active { transform: scale(0.98); box-shadow: 0 4rpx 12rpx rgba(139, 92, 246, 0.15); }
.btn:active::before { left: 100%; }
.btn.ghost {
  background: #ffffff;
  color: #8b5cf6;
  border: 1px solid rgba(139, 92, 246, 0.3);
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.04);
}
.btn.ghost:active { background: #faf5ff; }
.btn.danger { background: linear-gradient(135deg, #ef4444, #dc2626); box-shadow: 0 6rpx 16rpx rgba(239, 68, 68, 0.2); }

/* 等级选择 */
.levels { display: flex; gap: 12rpx; margin-bottom: 16rpx; }
.level {
  flex: 1;
  padding: 20rpx 16rpx;
  border-radius: 20rpx;
  background: #ffffff;
  border: 1px solid rgba(139, 92, 246, 0.15);
  transition: all 0.2s ease;
  text-align: center;
  position: relative;
  overflow: hidden;
}
.level::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 3rpx;
  background: transparent;
  transition: background 0.2s ease;
}
.level.active { background: #faf5ff; border-color: rgba(139, 92, 246, 0.3); box-shadow: 0 6rpx 16rpx rgba(139, 92, 246, 0.12); }
.level.active::after { background: linear-gradient(90deg, #8b5cf6, #ec4899); }
.level:active { transform: scale(0.98); background: #f8fafc; }
.lv { font-size: 32rpx; font-weight: 700; color: #8b5cf6; display: block; }
.lt { font-size: 22rpx; color: #64748b; display: block; margin-top: 6rpx; }

/* 任务清单 */
.task-add { display: flex; gap: 12rpx; margin-bottom: 16rpx; }
.task-inp {
  flex: 1;
  height: 70rpx;
  border-radius: 18rpx;
  background: #f8fafc;
  border: 1px solid rgba(139, 92, 246, 0.15);
  padding: 0 18rpx;
  font-size: 26rpx;
  transition: all 0.2s ease;
}
.task-inp:focus { border-color: #8b5cf6; box-shadow: 0 0 0 4rpx rgba(139, 92, 246, 0.1); background: #ffffff; }
.task-add-btn {
  width: 140rpx;
  height: 70rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  border: 1px solid rgba(139, 92, 246, 0.3);
  color: #8b5cf6;
  font-weight: 700;
  transition: all 0.2s ease;
}
.task-add-btn:active { background: #faf5ff; transform: scale(0.98); box-shadow: 0 2rpx 8rpx rgba(139, 92, 246, 0.1); }

.task-row {
  display: flex;
  align-items: center;
  gap: 14rpx;
  margin-bottom: 12rpx;
  padding: 12rpx 0;
  border-bottom: 1px solid rgba(139, 92, 246, 0.08);
}
.task-row:last-child { border-bottom: none; }
.chk {
  width: 46rpx;
  height: 46rpx;
  border-radius: 12rpx;
  border: 2px solid #a78bfa;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  background: #ffffff;
  font-weight: 700;
  font-size: 20rpx;
  transition: all 0.2s ease;
}
.chk.on {
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
  border-color: #8b5cf6;
  box-shadow: 0 2rpx 8rpx rgba(139, 92, 246, 0.2);
}
.task-text {
  flex: 1;
  height: 64rpx;
  border-radius: 16rpx;
  background: #f8fafc;
  border: 1px solid rgba(139, 92, 246, 0.15);
  padding: 0 16rpx;
  font-size: 26rpx;
  transition: all 0.2s ease;
}
.task-text:focus { border-color: #8b5cf6; box-shadow: 0 0 0 4rpx rgba(139, 92, 246, 0.1); background: #ffffff; }
.del { font-size: 24rpx; color: #ef4444; font-weight: 600; padding: 8rpx 12rpx; border-radius: 8rpx; transition: all 0.2s ease; }
.del:active { background: #fef2f2; transform: scale(0.95); }

/* 作品类型选择 */
.type-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; }
.picker {
  padding: 14rpx 18rpx;
  border-radius: 16rpx;
  background: #f8fafc;
  border: 1px solid rgba(139, 92, 246, 0.15);
  color: #1e1b4b;
  font-size: 24rpx;
  font-weight: 600;
  transition: all 0.2s ease;
}
.picker:active { background: #faf5ff; box-shadow: 0 2rpx 8rpx rgba(139, 92, 246, 0.1); }

/* 草稿编辑区 */
.draft-box { background: #f8fafc; border-radius: 20rpx; border: 1px solid rgba(139, 92, 246, 0.15); overflow: hidden; margin-bottom: 16rpx; }
.draft {
  height: 380rpx;
  width: 100%;
  padding: 20rpx;
  font-size: 26rpx;
  color: #1e1b4b;
  line-height: 1.6;
  background: transparent;
  border: none;
}
.draft:focus { outline: none; box-shadow: 0 0 0 4rpx rgba(139, 92, 246, 0.1); }

/* ✅ 新增：图片草稿区 */
.img-bar {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 14rpx;
}
.muted-mini {
  font-size: 22rpx;
  color: #94a3b8;
}
.img-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 12rpx;
}
.img-item {
  width: 150rpx;
  position: relative;
}
.img-thumb {
  width: 150rpx;
  height: 150rpx;
  border-radius: 18rpx;
  border: 1px solid rgba(139, 92, 246, 0.12);
  background: #ffffff;
}
.img-del {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #ef4444;
  font-weight: 600;
  padding: 6rpx 10rpx;
  border-radius: 12rpx;
  text-align: center;
  background: #fef2f2;
}
.img-del:active { transform: scale(0.98); }

/* 版本历史 */
.ver {
  padding: 20rpx;
  border-radius: 18rpx;
  background: #f8fafc;
  border: 1px solid rgba(139, 92, 246, 0.1);
  margin-bottom: 12rpx;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}
.ver:active { background: #faf5ff; transform: scale(0.98); box-shadow: 0 4rpx 12rpx rgba(139, 92, 246, 0.08); }
.ver-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10rpx; }
.ver-title { font-size: 26rpx; font-weight: 700; color: #1e1b4b; flex: 1; }
.ver-right { text-align: right; }
.vis { font-size: 20rpx; padding: 4rpx 10rpx; border-radius: 8rpx; display: inline-block; margin-bottom: 4rpx; }
.vis.public { background: #ecfdf5; color: #065f46; border: 1px solid #34d399; }
.vis.private { background: #fef2f2; color: #991b1b; border: 1px solid #fca5a5; }
.ver-time { font-size: 20rpx; color: #94a3b8; }
.ver-meta { margin-bottom: 8rpx; }
.chip {
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  background: linear-gradient(135deg, #ede9fe, #fce7f3);
  color: #8b5cf6;
  font-weight: 600;
}
.ver-preview {
  font-size: 22rpx;
  color: #64748b;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 弹窗 */
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  padding: 40rpx;
  backdrop-filter: blur(8rpx);
}
.modal {
  width: 100%;
  max-width: 600rpx;
  background: #ffffff;
  border-radius: 24rpx;
  padding: 30rpx;
  border: 1px solid rgba(139, 92, 246, 0.2);
  box-shadow: 0 12rpx 40rpx rgba(139, 92, 246, 0.15);
  position: relative;
  overflow: hidden;
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
.modal-title { font-size: 32rpx; font-weight: 700; color: #1e1b4b; margin-bottom: 8rpx; }
.modal-sub { font-size: 22rpx; color: #94a3b8; margin-bottom: 20rpx; display: block; }
.modal-body { max-height: 60vh; margin-bottom: 24rpx; }
.modal-text { font-size: 26rpx; line-height: 1.6; color: #1e1b4b; white-space: pre-wrap; }

/* 辅助 */
.muted { font-size: 24rpx; color: #94a3b8; text-align: center; padding: 40rpx 20rpx; line-height: 1.6; }
.foot-space { height: 40rpx; }
.txt-bold { font-weight: 700; }
</style>