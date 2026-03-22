<template>
  <view class="teacher-course-container">


    <!-- ===== 搜索栏 ===== -->
    <view class="search-bar">
      <view class="search-wrapper">
        <svg class="search-icon" viewBox="0 0 24 24" width="18" height="18">
          <path
            d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
            fill="#64748b"
          />
        </svg>

        <input
          id="real-search-input"
          ref="searchInput"
          type="text"
          placeholder="搜索课程/章节..."
          v-model="searchKeyword"
          class="search-input"
          @click="focusSearchInput"
          @confirm="applyFilters"
        />
      </view>

      <!-- ===== 筛选区（下拉框版本）===== -->
      <view class="filter-panel">
        <view class="filter-dropdowns">
			
          <!-- 单元下拉框 -->
		  
          <view class="filter-dropdown">
            <view class="dropdown-label">章节</view>
            <view 
              class="dropdown-selector" 
              @click.stop="toggleDropdown('unit')"
            >
              <span class="dropdown-value">{{ getUnitDisplayText() }}</span>
              <svg class="dropdown-icon" viewBox="0 0 24 24" width="14" height="14">
                <path 
                  d="M7 10l5 5 5-5z" 
                  :fill="unitDropdownOpen ? '#4f6cff' : '#64748b'"
                  :transform="unitDropdownOpen ? 'rotate(180 12 12)' : 'rotate(0 12 12)'"
                  transition="transform 0.2s ease"
                />
              </svg>
            </view>
            <!-- 单元下拉选项 -->
            <view 
              v-if="unitDropdownOpen" 
              class="dropdown-options"
              @click.stop
            >
              <view
                class="dropdown-option"
                @click.stop="setUnitNo('all')"
              >
                全部
              </view>
              <view
                v-for="u in unitButtons"
                :key="u.unitNo"
                class="dropdown-option"
                @click.stop="setUnitNo(u.unitNo)"
              >
                第{{ u.unitNo }}单元 {{ u.unitTitle }}
              </view>
            </view>
          </view>

          <!-- 状态下拉框 -->
          <view class="filter-dropdown">
            <view class="dropdown-label">状态</view>
            <view 
              class="dropdown-selector" 
              @click.stop="toggleDropdown('status')"
            >
              <span class="dropdown-value">{{ getStatusDisplayText() }}</span>
              <svg class="dropdown-icon" viewBox="0 0 24 24" width="14" height="14">
                <path 
                  d="M7 10l5 5 5-5z" 
                  :fill="statusDropdownOpen ? '#4f6cff' : '#64748b'"
                  :transform="statusDropdownOpen ? 'rotate(180 12 12)' : 'rotate(0 12 12)'"
                  transition="transform 0.2s ease"
                />
              </svg>
            </view>
            <!-- 状态下拉选项 -->
            <view 
              v-if="statusDropdownOpen" 
              class="dropdown-options"
              @click.stop
            >
              <view
                v-for="s in statusOptions"
                :key="s.value"
                class="dropdown-option"
                @click.stop="setStatus(s.value)"
              >
                {{ s.label }}
              </view>
            </view>
          </view>
        </view>

        <view class="count-tip">
             年级：{{ teacherGrade ? teacherGrade + '年级' : '未知' }} ｜ 当前：{{ filteredCourses.length }} 门
        </view>
      </view>
    </view>

    <!-- ===== 列表 ===== -->
    <view class="course-list">
      <view v-if="filteredCourses.length === 0" class="empty-state">
        <view class="empty-icon-wrapper">
          <svg viewBox="0 0 24 24" width="60" height="60">
            <path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" fill="#94a3b8" />
            <path d="M12 17c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0-8c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3z" fill="#4f6cff" />
          </svg>
        </view>
        <p class="empty-text">
          {{
            searchKeyword || selectedUnitNo !== 'all' || selectedStatus !== 'all'
              ? '未找到符合条件的课程'
              : '暂无课程数据'
          }}
        </p>
        <button class="empty-reload-btn" @click="initPage">刷新数据</button>
      </view>

      <view
        v-for="(course, index) in filteredCourses"
        :key="course.id || index"
        class="course-card animate"
        :class="'delay' + (index % 5 + 1)"
        @click="goToDetail(course)"


      >
        <view class="card-corner"></view>

        <!-- 状态标签：参考示例的渐变样式 -->
        <div :class="['status-badge', `status-${course.status}`]">
          {{ formatStatus(course.status) }}
        </div>

        <view class="course-card-content">
          <!-- ✅ 单元标注 -->
          <view class="unit-badges">
            <view class="unit-pill" v-if="getUnitInfo(course).unitNo">
              第{{ getUnitInfo(course).unitNo }}单元
            </view>
            <view class="unit-title" v-if="getUnitInfo(course).unitTitle">
              {{ getUnitInfo(course).unitTitle }}
            </view>
            <view class="unit-unknown" v-else>
              未匹配到单元（建议检查 courseName/chapterName 或课次字段）
            </view>
          </view>

          <h3 class="course-title">{{ course.courseName || '未命名课程' }}</h3>
     
          <p class="course-student-count">
            <i class="icon-user">👥</i>
            {{ Number(course.studentCount) || 0 }} 人学习
          </p>
        </view>

        <!-- 参考示例的文字链接样式 -->
        <view class="course-card-footer">
          <div class="text-link">
            点击进入编辑 <i class="arrow-icon">→</i>
          </div>
        </view>
      </view>
    </view>

    <view class="footer-tip">
      <span class="tip-icon">ℹ️</span>
      <span class="tip-text">点击课程卡片进入对应编辑页面</span>
    </view>
  </view>
</template>

<script>
import request from '@/common/request.js';

/** ✅ 3-6年级：单元↔课程（第几课）映射（按你图整理） */
const GRADE_TO_UNITS = {
  3: [
    { unitNo: 1, unitTitle: "开启信息生活", lessons: [
      { lessonNo: 1, title: "寻找信息科技" },
      { lessonNo: 2, title: "使用数字设备" },
      { lessonNo: 3, title: "体验人机交互" },
    ]},
    { unitNo: 2, unitTitle: "记录美好时光", lessons: [
      { lessonNo: 4, title: "图片记录瞬间" },
      { lessonNo: 5, title: "美化处理图片" },
      { lessonNo: 6, title: "视频记录片段" },
      { lessonNo: 7, title: "音频记录声音" },
    ]},
    { unitNo: 3, unitTitle: "畅游网络世界", lessons: [
      { lessonNo: 8, title: "浏览网络资源" },
      { lessonNo: 9, title: "在线搜索资源" },
      { lessonNo: 10, title: "保存信息资源" },
      { lessonNo: 11, title: "整理信息资源" },
    ]},
    { unitNo: 4, unitTitle: "创作数字作品", lessons: [
      { lessonNo: 12, title: "认识数字作品" },
      { lessonNo: 13, title: "制作数字相册" },
      { lessonNo: 14, title: "制作数字小报" },
      { lessonNo: 15, title: "展示数字作品" },
    ]},
    { unitNo: 5, unitTitle: "在线分享交流", lessons: [
      { lessonNo: 16, title: "畅享在线交流" },
      { lessonNo: 17, title: "参与网络社交" },
      { lessonNo: 18, title: "在线行为规范" },
      { lessonNo: 19, title: "认识数字身份" },
    ]},
    { unitNo: 6, unitTitle: "在线学习探究", lessons: [
      { lessonNo: 20, title: "体验在线学习" },
      { lessonNo: 21, title: "分享学习资源" },
      { lessonNo: 22, title: "探讨在线学习" },
    ]},
    { unitNo: 7, unitTitle: "合作解决问题", lessons: [
      { lessonNo: 23, title: "分解描述问题" },
      { lessonNo: 24, title: "分组分派任务" },
      { lessonNo: 25, title: "合作制作作品" },
      { lessonNo: 26, title: "完善评价作品" },
    ]},
    { unitNo: 8, unitTitle: "守护在线安全", lessons: [
      { lessonNo: 27, title: "感悟在线社会" },
      { lessonNo: 28, title: "初识人工智能" },
      { lessonNo: 29, title: "了解自主可控" },
      { lessonNo: 30, title: "在线安全防范" },
    ]},
  ],

  4: [
    { unitNo: 1, unitTitle: "奇妙的数据世界", lessons: [
      { lessonNo: 1, title: "数据宝藏在身边" },
      { lessonNo: 2, title: "获取数据有方法" },
      { lessonNo: 3, title: "寻找可靠数据源" },
      { lessonNo: 4, title: "记录数据讲诀窍" },
      { lessonNo: 5, title: "数据价值巧发现" },
    ]},
    { unitNo: 2, unitTitle: "用数据描绘世界", lessons: [
      { lessonNo: 6, title: "古往今来话编码" },
      { lessonNo: 7, title: "数据编码随处见" },
      { lessonNo: 8, title: "编码管理我知道" },
      { lessonNo: 9, title: "二维码伴我生活" },
      { lessonNo: 10, title: "数据错误及时验" },
    ]},
    { unitNo: 3, unitTitle: "有趣的编码应用", lessons: [
      { lessonNo: 11, title: "嘀嘀嗒嗒的秘密" },
      { lessonNo: 12, title: "二值的黑白图像" },
      { lessonNo: 13, title: "多彩的数字世界" },
      { lessonNo: 14, title: "编码也能动起来" },
      { lessonNo: 15, title: "自定编码讲规则" },
    ]},
    { unitNo: 4, unitTitle: "数据管理与安全", lessons: [
      { lessonNo: 16, title: "数据管理与编码" },
      { lessonNo: 17, title: "查找筛选讲效率" },
      { lessonNo: 18, title: "排序计算有方法" },
      { lessonNo: 19, title: "数据安全意识强" },
      { lessonNo: 20, title: "保护数据小妙招" },
    ]},
    { unitNo: 5, unitTitle: "数据表达我做主", lessons: [
      { lessonNo: 21, title: "展现数量的关系" },
      { lessonNo: 22, title: "探寻趋势与规律" },
      { lessonNo: 23, title: "挑战多角度比拼" },
      { lessonNo: 24, title: "抽取文本汇词云" },
      { lessonNo: 25, title: "知识图谱来帮忙" },
      { lessonNo: 26, title: "用数据支撑观点" },
    ]},
    { unitNo: 6, unitTitle: "人工智能新未来", lessons: [
      { lessonNo: 27, title: "数据点亮新生活" },
      { lessonNo: 28, title: "大数据助力智能" },
      { lessonNo: 29, title: "生成式人工智能" },
      { lessonNo: 30, title: "应对智能新挑战" },
    ]},
  ],

  5: [
    { unitNo: 1, unitTitle: "无处不在的算法", lessons: [
      { lessonNo: 1, title: "生活处处有算法" },
      { lessonNo: 2, title: "算法认识与体验" },
      { lessonNo: 3, title: "游戏体验寻规律" },
      { lessonNo: 4, title: "算法应用在身边" },
    ]},
    { unitNo: 2, unitTitle: "算法结构与描述", lessons: [
      { lessonNo: 5, title: "数学运算讲方法" },
      { lessonNo: 6, title: "判断选择用分支" },
      { lessonNo: 7, title: "重复操作用循环" },
      { lessonNo: 8, title: "算法验证与实现" },
    ]},
    { unitNo: 3, unitTitle: "用算法解决问题", lessons: [
      { lessonNo: 9, title: "互传密信有诀窍" },
      { lessonNo: 10, title: "猜数游戏有捷径" },
      { lessonNo: 11, title: "闰年平年我知道（1）" },
      { lessonNo: 12, title: "闰年平年我知道（2）" },
    ]},
    { unitNo: 4, unitTitle: "发挥算法的优势", lessons: [
      { lessonNo: 13, title: "让计算机会数数" },
      { lessonNo: 14, title: "算法效率比一比" },
      { lessonNo: 15, title: "简单密码易破解" },
    ]},
    { unitNo: 5, unitTitle: "把数据排列有序", lessons: [
      { lessonNo: 16, title: "比较交换找最值" },
      { lessonNo: 17, title: "选择排序轻松做" },
      { lessonNo: 18, title: "冒泡排序齐体验（1）" },
      { lessonNo: 19, title: "冒泡排序齐体验（2）" },
      { lessonNo: 20, title: "化大为小桶排序" },
    ]},
    { unitNo: 6, unitTitle: "快速遍历数据", lessons: [
      { lessonNo: 21, title: "鸡兔同笼巧计算" },
      { lessonNo: 22, title: "兔子增长有规律（1）" },
      { lessonNo: 23, title: "兔子增长有规律（2）" },
    ]},
    { unitNo: 7, unitTitle: "了解更多的算法", lessons: [
      { lessonNo: 24, title: "多人过河巧安排" },
      { lessonNo: 25, title: "有趣的七桥问题" },
      { lessonNo: 26, title: "寻找最短的路径" },
      { lessonNo: 27, title: "网页排名有策略" },
    ]},
    { unitNo: 8, unitTitle: "人工智能中的算法", lessons: [
      { lessonNo: 28, title: "认识决策树算法" },
      { lessonNo: 29, title: "智能工具再体验" },
      { lessonNo: 30, title: "生命游戏有规则" },
    ]},
  ],

  6: [
    { unitNo: 1, unitTitle: "初识过程与控制", lessons: [
      { lessonNo: 1, title: "设备控制处处在" },
      { lessonNo: 2, title: "一分为二开与关" },
      { lessonNo: 3, title: "我是小小控制员" },
      { lessonNo: 4, title: "输入输出与计算" },
    ]},
    { unitNo: 2, unitTitle: "数据运算有逻辑", lessons: [
      { lessonNo: 5, title: "连续变化的数据" },
      { lessonNo: 6, title: "开关量的真与假" },
      { lessonNo: 7, title: "开关量的与运算" },
      { lessonNo: 8, title: "开关量的或运算" },
    ]},
    { unitNo: 3, unitTitle: "有了反馈更优化", lessons: [
      { lessonNo: 9, title: "从人工到自动化" },
      { lessonNo: 10, title: "开环控制应用广" },
      { lessonNo: 11, title: "通过反馈知效果" },
      { lessonNo: 12, title: "闭环控制助稳定" },
    ]},
    { unitNo: 4, unitTitle: "控制系统的描述", lessons: [
      { lessonNo: 13, title: "控制系统有特点" },
      { lessonNo: 14, title: "复杂系统可分解" },
      { lessonNo: 15, title: "模块组装很灵活" },
    ]},
    { unitNo: 5, unitTitle: "智能种植有方法", lessons: [
      { lessonNo: 16, title: "智能种植初探秘" },
      { lessonNo: 17, title: "设计我的种植园" },
      { lessonNo: 18, title: "土壤湿度控制好" },
      { lessonNo: 19, title: "光照温度要适宜" },
    ]},
    { unitNo: 6, unitTitle: "电梯运行的控制", lessons: [
      { lessonNo: 20, title: "找找电梯子系统" },
      { lessonNo: 21, title: "到达指定的楼层" },
      { lessonNo: 22, title: "电梯门的开与关" },
      { lessonNo: 23, title: "如果超载电梯停" },
    ]},
    { unitNo: 7, unitTitle: "汽车里的小奥秘", lessons: [
      { lessonNo: 24, title: "自动熄灭转向灯" },
      { lessonNo: 25, title: "安全带未系提醒" },
      { lessonNo: 26, title: "倒车防撞请注意" },
      { lessonNo: 27, title: "定速巡航的控制" },
    ]},
    { unitNo: 8, unitTitle: "自主可控与安全", lessons: [
      { lessonNo: 28, title: "使用系统讲安全" },
      { lessonNo: 29, title: "避免故障保安全" },
      { lessonNo: 30, title: "自主可控变强大" },
    ]},
  ],
};

export default {
	onLoad(options) {
	  this.courseId = options.id
	  if (options.status) this.course.status = options.status
	  this.loadCourseDetail()
	},

  data() {
    return {
      searchKeyword: '',
      courses: [],
      filteredCourses: [],

      teacherSubject: '',
      teacherGrade: null,

      selectedUnitNo: 'all',
      selectedStatus: 'all',

      statusOptions: [
        { label: '全部', value: 'all' },
        { label: '未发布', value: 'draft' },
        { label: '已发布（未上课）', value: 'published' },
        { label: '已发布（已上课）', value: 'finished' }
      ],

      searchDebounceTimer: null,
      // 新增：下拉框控制
      unitDropdownOpen: false,
      statusDropdownOpen: false
    }
  },

  computed: {
    unitButtons() {
      const g = this.teacherGrade;
      const units = g && GRADE_TO_UNITS[g] ? GRADE_TO_UNITS[g] : [];
      return units.map(u => ({ unitNo: u.unitNo, unitTitle: u.unitTitle }));
    }
  },

  mounted() {
    this.initPage();
    // 点击页面其他区域关闭下拉框
    document.addEventListener('click', this.closeAllDropdowns);
  },

  watch: {
    searchKeyword() {
      if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = setTimeout(() => this.applyFilters(), 300);
    },
    // 选择后自动关闭下拉框
    selectedUnitNo() {
      this.unitDropdownOpen = false;
    },
    selectedStatus() {
      this.statusDropdownOpen = false;
    }
  },

  beforeUnmount() {
    if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
    document.removeEventListener('click', this.closeAllDropdowns);
  },

  methods: {
    // ===== 新增：返回按钮方法 =====
    goBack() {
      uni.navigateTo({
        url: '/pages/teacher/teacher_homepage'
      });
    },

    async initPage() {
      await this.getCurrentUser(); // ✅ 先拿 subject → grade
      await this.fetchCourses();   // ✅ 再拿课程
      this.applyFilters();
    },

    async getCurrentUser() {
      try {
        const data = await request({ url: '/api/auth/me', method: 'GET' });
        this.teacherSubject = data?.subject || '';
        this.teacherGrade = this.parseGradeFromSubject(this.teacherSubject);
      } catch (e) {
        console.error('获取当前用户失败', e);
        uni.reLaunch({ url: '/pages/login/login' });
      }
    },

    parseGradeFromSubject(subject) {
      // "信息3" => 3（取最后一个数字）
      const m = String(subject || '').match(/(\d)/g);
      if (!m || m.length === 0) return null;
      const g = Number(m[m.length - 1]);
      return [3, 4, 5, 6].includes(g) ? g : null;
    },

    async fetchCourses() {
      try {
        const res = await request({ url: '/api/teacher/home', method: 'GET' });
        this.courses = Array.isArray(res?.courses) ? res.courses : [];
        this.filteredCourses = [...this.courses];
      } catch (err) {
        console.error('获取课程失败', err);
        this.courses = [];
        this.filteredCourses = [];
        uni.showToast({ title: '数据加载失败', icon: 'none' });
      }
    },

    /** ✅ 课程→单元：优先按课次字段；否则用名称匹配 */
    getUnitInfo(course) {
      const g = this.teacherGrade;
      const units = g && GRADE_TO_UNITS[g] ? GRADE_TO_UNITS[g] : [];
      if (!units.length) return { unitNo: null, unitTitle: null };

      // 1) 优先：按课次字段匹配（最准）
      const lessonNo =
        Number(course.lessonNo) ||
        Number(course.lessonNumber) ||
        Number(course.sort) ||
        Number(course.order) ||
        Number(course.courseIndex) ||
        null;

      if (lessonNo) {
        for (const u of units) {
          if (u.lessons.some(l => l.lessonNo === lessonNo)) {
            return { unitNo: u.unitNo, unitTitle: u.unitTitle };
          }
        }
      }

      // 2) 兜底：按名称匹配（courseName/chapterName）
      const hay = `${course.courseName || ''} ${course.chapterName || ''}`;
      const normHay = this.norm(hay);

      for (const u of units) {
        if (this.norm(u.unitTitle) && normHay.includes(this.norm(u.unitTitle))) {
          return { unitNo: u.unitNo, unitTitle: u.unitTitle };
        }
        for (const l of u.lessons) {
          if (this.norm(l.title) && normHay.includes(this.norm(l.title))) {
            return { unitNo: u.unitNo, unitTitle: u.unitTitle };
          }
        }
      }

      return { unitNo: null, unitTitle: null };
    },

    norm(s) {
      return String(s || '')
        .replace(/\s+/g, '')
        .replace(/[：:，,。.!！?？、\-—_]/g, '')
        .replace(/第[一二三四五六七八九十0-9]+(课|单元)/g, '')
        .replace(/[一二三四五六七八九十]+(课|单元)/g, '')
        .toLowerCase();
    },

    // ===== 筛选 =====
    applyFilters() {
      const kw = this.searchKeyword.trim().toLowerCase();
    
      this.filteredCourses = (this.courses || []).filter(c => {
        const name = (c.courseName || '').toLowerCase();
        const chap = (c.chapterName || '').toLowerCase();
        const status = c.status || '';
    
        // ✅ 关键：把“课程所属单元信息”也加入搜索
        const unitInfo = this.getUnitInfo(c);
        const unitTitle = (unitInfo.unitTitle || '').toLowerCase(); // 章节名称（单元名）
        const unitNoText = unitInfo.unitNo ? (`第${unitInfo.unitNo}单元`).toLowerCase() : '';
        const unitNoOnly = unitInfo.unitNo ? String(unitInfo.unitNo) : '';
    
        // ✅ 统一拼一个 searchText，让搜索更稳
        const searchText = `${name} ${chap} ${unitTitle} ${unitNoText} ${unitNoOnly}`.toLowerCase();
    
        const hitKw = !kw || searchText.includes(kw);
    
        const hitUnit = this.selectedUnitNo === 'all' || unitInfo.unitNo === this.selectedUnitNo;
        const hitStatus = this.selectedStatus === 'all' || status === this.selectedStatus;
    
        return hitKw && hitUnit && hitStatus;
      });
    },


    setUnitNo(v) { 
      this.selectedUnitNo = v; 
      this.applyFilters(); 
    },
    
    setStatus(v) { 
      this.selectedStatus = v; 
      this.applyFilters(); 
    },
    
    resetFilters() {
      this.searchKeyword = '';
      this.selectedUnitNo = 'all';
      this.selectedStatus = 'all';
      this.applyFilters();
    },

    // ===== 状态 =====
    formatStatus(status) {
      if (status === 'draft') return '未发布';
      if (status === 'published') return '已发布（未上课）';
      if (status === 'finished') return '已发布（已上课）';
      return '未知状态';
    },
    
    getStatusClass(status) {
      if (status === 'finished') return 'finished';
      if (status === 'published') return 'ongoing';
      if (status === 'draft') return 'draft';
      return 'default';
    },

    // ===== 交互 =====
    focusSearchInput() {
      this.$nextTick(() => {
        uni.createSelectorQuery().select('#real-search-input').focus().exec();
      });
    },

    goToDetail(course) {
      uni.navigateTo({
        url: `/pages/teacher/course_detail?id=${course.id}&status=${course.status}`
      })
    },



    // ===== 新增：下拉框相关方法 =====
    toggleDropdown(type) {
      if (type === 'unit') {
        this.unitDropdownOpen = !this.unitDropdownOpen;
        this.statusDropdownOpen = false; // 关闭另一个下拉框
      } else if (type === 'status') {
        this.statusDropdownOpen = !this.statusDropdownOpen;
        this.unitDropdownOpen = false; // 关闭另一个下拉框
      }
    },

    // 关闭所有下拉框
    closeAllDropdowns() {
      this.unitDropdownOpen = false;
      this.statusDropdownOpen = false;
    },

    // 获取单元下拉框显示文本
    getUnitDisplayText() {
      if (this.selectedUnitNo === 'all') return '全部章节';
      const unit = this.unitButtons.find(u => u.unitNo === this.selectedUnitNo);
      return unit ? `第${unit.unitNo}单元 ${unit.unitTitle}` : '全部章节';
    },

    // 获取状态下拉框显示文本
    getStatusDisplayText() {
      const status = this.statusOptions.find(s => s.value === this.selectedStatus);
      return status ? status.label : '全部状态';
    }
  }
}
</script>

<style scoped>
/* ===== 基础样式：参考示例的设计语言 ===== */
.teacher-course-container {
  width: 100%;
  max-width: none;   /* 删掉原来的 400px */
  margin: 0;
  padding: 0 20rpx 140rpx;
  min-height: 100vh;
  background: linear-gradient(180deg, #f5f9ff 0%, #eaf4ff 100%);
  box-sizing: border-box;
  font-family: "PingFang SC", "Microsoft YaHei", Arial, sans-serif;
}

/* ===== 新增：顶部返回栏样式 ===== */
.header-bar {
  padding: 30rpx 20rpx 10rpx;
  display: flex;
  align-items: center;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 20rpx;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 30rpx;
  box-shadow: 0 4rpx 12rpx rgba(79, 108, 255, 0.08);
  border: 1px solid rgba(79, 108, 255, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10rpx);
}

.back-btn:hover {
  background: #fff;
  transform: translateY(-2rpx);
  box-shadow: 0 6rpx 16rpx rgba(79, 108, 255, 0.12);
}

.back-icon {
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.back-btn:hover .back-icon {
  transform: translateX(-2rpx);
}

.back-text {
  font-size: 28rpx;
  color: #4f6cff;
  font-weight: 500;
}

/* ===== 搜索栏 ===== */
.search-bar { 
  margin-bottom: 30rpx; 
  padding-top: 10rpx; /* 调整顶部内边距，适配返回按钮 */
}

.search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 40rpx;
  padding: 0 20rpx;
  height: 80rpx;
  box-shadow: 0 8rpx 24rpx rgba(79, 108, 255, 0.08);
  border: 1px solid #e8f0ff;
  /* 新增：高级感优化 */
  transition: all 0.3s ease;
}

.search-wrapper:focus-within {
  box-shadow: 0 8rpx 28rpx rgba(79, 108, 255, 0.15);
  border-color: #4f6cff;
}

.search-icon { 
  position: absolute; 
  left: 24rpx; 
  pointer-events: none;
}

.search-input {
  flex: 1;
  width: 100%;
  height: 100%;
  padding: 0 20rpx 0 60rpx;
  border: none;
  font-size: 28rpx;
  color: #2d3748;
  background: transparent;
  outline: none;
}

.search-input::placeholder {
  color: #718096;
  font-size: 26rpx;
}

/* ===== 筛选面板 ===== */
.filter-panel {
  margin-top: 20rpx;
  background: #fff;
  border-radius: 30rpx;
  padding: 24rpx 20rpx;
  box-shadow: 0 8rpx 24rpx rgba(79, 108, 255, 0.06);
  border: 1px solid #e8f0ff;
  /* 新增：高级感优化 */
  transition: all 0.3s ease;
}

.filter-panel:hover {
  box-shadow: 0 10rpx 28rpx rgba(79, 108, 255, 0.09);
}

.filter-dropdowns {
  display: flex;
  gap: 16rpx;
  align-items: stretch;
  margin-bottom: 20rpx;
  flex-wrap: wrap;         /* 允许换行 */
  justify-content: flex-start;
}


.dropdown-group {
  display: flex;
  gap: 16rpx;
  flex: 1; /* 让下拉框组占满剩余空间 */
}

.filter-dropdown {
  flex: 1 1 0;             /* 平分空间 */
  min-width: 0;            /* 防止撑出屏幕 */
  max-width: none;         /* 删掉原来的 180rpx */
  width: auto;             /* 删掉原来的固定宽度 */
  position: relative;
}
.dropdown-label {
  font-size: 24rpx;
  color: #718096;
  margin-bottom: 8rpx;
  display: block;
}

/* 下拉框选择器：参考示例的按钮样式 */
.dropdown-selector {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 20rpx;
  background: #f5f9ff;
  border-radius: 24rpx;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid #e8f0ff;
}

.dropdown-selector:hover {
  background: #e8f0ff;
  transform: translateY(-2rpx);
  box-shadow: 0 4rpx 12rpx rgba(79, 108, 255, 0.1);
}

.dropdown-value {
  font-size: 26rpx;
  color: #2d3748;
  flex: 1;
}

.dropdown-icon {
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

/* 下拉框选项列表 */
.dropdown-options {
  position: absolute;
  top: calc(100% + 10rpx);
  left: 0;
  right: 0;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(79, 108, 255, 0.12);
  z-index: 999;
  max-height: 600rpx;
  overflow-y: auto;
  border: 1px solid #e8f0ff;
  /* 新增：高级感优化 */
  animation: fadeIn 0.2s ease forwards;
  opacity: 0;
  transform: translateY(10rpx);
}

@keyframes fadeIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 下拉框选项 */
.dropdown-option {
  padding: 18rpx 20rpx;
  font-size: 26rpx;
  color: #2d3748;
  cursor: pointer;
  transition: all 0.2s ease;
}

.dropdown-option:hover {
  background: #f5f9ff;
  color: #4f6cff;
  padding-left: 24rpx;
}

/* 清空筛选按钮：参考示例的渐变按钮样式 */
.reset-btn {
  font-size: 26rpx;
  color: #fff;
  padding: 16rpx 32rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #4f6cff, #3366ff);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.3s ease;
  box-shadow: 0 4rpx 12rpx rgba(79, 108, 255, 0.15);
  flex-shrink: 0;
  text-align: center;
}

.reset-btn:hover {
  background: linear-gradient(135deg, #3366ff, #2858e6);
  transform: translateY(-2rpx);
  box-shadow: 0 6rpx 18rpx rgba(79, 108, 255, 0.25);
}

/* 统计提示 */
.count-tip {
  font-size: 24rpx;
  color: #718096;
  padding-top: 20rpx;
  border-top: 1px solid #e8f0ff;
}

/* ===== 课程列表 ===== */
.course-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  margin-bottom: 30rpx;
}

/* 课程卡片：参考示例的卡片样式 */
.course-card {
  position: relative;
  background: #fff;
  border-radius: 30rpx;
  padding: 30rpx;
  box-shadow: 0 8rpx 24rpx rgba(79, 108, 255, 0.06);
  transition: all 0.3s ease;
  border: 1px solid #e8f0ff;
  /* 新增：高级感优化 */
  overflow: hidden;
}

.course-card:hover {
  transform: translateY(-6rpx);
  box-shadow: 0 12rpx 32rpx rgba(79, 108, 255, 0.12);
}

.card-corner {
  position: absolute;
  top: 0; right: 0;
  width: 120rpx; height: 120rpx;
  background: linear-gradient(135deg, rgba(79, 108, 255, 0.08), rgba(79, 108, 255, 0));
  border-radius: 0 30rpx 0 80rpx;
}

/* 状态标签：参考示例的渐变样式 */
.status-badge {
  position: absolute;
  top: 24rpx;
  right: 24rpx;
  background: linear-gradient(135deg, #4f6cff, #3366ff);
  color: #fff;
  font-size: 22rpx;
  font-weight: 500;
  padding: 8rpx 16rpx;
  border-radius: 20rpx;
  white-space: nowrap;
  box-shadow: 0 4rpx 12rpx rgba(79, 108, 255, 0.2);
  z-index: 2;
  /* 新增：高级感优化 */
  transition: all 0.3s ease;
}

.course-card:hover .status-badge {
  transform: scale(1.05);
}

/* 未发布 - 灰色渐变 */
.status-draft {
  background: linear-gradient(135deg, #94a3b8, #64748b);
}

/* 已发布（未上课）- 蓝色渐变 */
.status-published {
  background: linear-gradient(135deg, #4f6cff, #3366ff);
}

/* 已发布（已上课）- 绿色渐变 */
.status-finished {
  background: linear-gradient(135deg, #10b981, #059669);
}

/* 课程内容区 */
.course-card-content {
  margin-bottom: 20rpx;
}

/* 单元标注 */
.unit-badges { 
  display:flex; 
  flex-wrap:wrap; 
  gap:10rpx; 
  align-items:center; 
  margin-bottom: 16rpx;
}

.unit-pill {
  font-size: 22rpx;
  padding: 8rpx 16rpx;
  border-radius: 20rpx;
  background: rgba(79, 108, 255, 0.1);
  color: #4f6cff;
  border: 1px solid rgba(79, 108, 255, 0.2);
  /* 新增：高级感优化 */
  transition: all 0.2s ease;
}

.course-card:hover .unit-pill {
  background: rgba(79, 108, 255, 0.15);
  border-color: rgba(79, 108, 255, 0.3);
}

.unit-title { 
  font-size: 26rpx; 
  color: #2d3748; 
  font-weight: 600; 
}

.unit-unknown { 
  font-size: 22rpx; 
  color: #718096; 
}

.course-title { 
  margin: 0 0 12rpx 0; 
  font-size: 32rpx; 
  font-weight: 600; 
  color: #1a2b48; 
  line-height: 1.4;
}

.course-sub { 
  margin: 0 0 12rpx 0; 
  font-size: 24rpx; 
  color: #718096; 
}

.course-student-count { 
  margin:0; 
  font-size: 26rpx; 
  color: #4a5568;
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.icon-user {
  font-size: 24rpx;
}

/* 底部文字链接：参考示例的样式 */
.course-card-footer {
  padding-top: 20rpx;
  border-top: 1px solid #e8f0ff;
}

.text-link {
  font-size: 28rpx;
  color: #4f6cff;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8rpx;
  cursor: pointer;
  transition: all 0.2s ease;
}

.course-card:hover .text-link {
  color: #3366ff;
  transform: translateX(4rpx);
}

.arrow-icon {
  font-size: 24rpx;
}

/* 空状态：参考示例的样式 */
.empty-state {
  text-align: center;
  padding: 80rpx 20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
  background: #fff;
  border-radius: 30rpx;
  box-shadow: 0 8rpx 24rpx rgba(79, 108, 255, 0.06);
  border: 1px solid #e8f0ff;
  /* 新增：高级感优化 */
  transition: all 0.3s ease;
}

.empty-state:hover {
  box-shadow: 0 10rpx 28rpx rgba(79, 108, 255, 0.09);
}

.empty-icon-wrapper {
  padding: 30rpx;
  background: #f5f9ff;
  border-radius: 50%;
  margin-bottom: 20rpx;
  /* 新增：高级感优化 */
  transition: all 0.3s ease;
}

.empty-state:hover .empty-icon-wrapper {
  transform: scale(1.05);
  background: #e8f0ff;
}

.empty-text { 
  margin: 0; 
  font-size: 32rpx; 
  color: #4a5568; 
  font-weight: 500;
}

.empty-reload-btn {
  margin-top: 20rpx;
  background: linear-gradient(135deg, #4f6cff, #3366ff);
  color: white;
  border: none;
  border-radius: 24rpx;
  padding: 18rpx 40rpx;
  font-size: 28rpx;
  transition: all 0.2s ease;
  box-shadow: 0 4rpx 12rpx rgba(79, 108, 255, 0.15);
}

.empty-reload-btn:hover {
  background: linear-gradient(135deg, #3366ff, #2858e6);
  transform: translateY(-2rpx);
  box-shadow: 0 6rpx 18rpx rgba(79, 108, 255, 0.25);
}

/* footer tip */
.footer-tip {
  display:flex;
  align-items:center;
  justify-content:center;
  gap: 10rpx;
  font-size: 24rpx;
  padding: 24rpx;
  background: #fff;
  border-radius: 30rpx;
  box-shadow: 0 4rpx 16rpx rgba(79, 108, 255, 0.04);
  border: 1px solid #e8f0ff;
  margin-top: 20rpx;
  /* 新增：高级感优化 */
  transition: all 0.3s ease;
}

.footer-tip:hover {
  box-shadow: 0 6rpx 20rpx rgba(79, 108, 255, 0.07);
}

.tip-icon { 
  font-size: 28rpx; 
  color: #4f6cff; 
}

.tip-text { 
  color: #718096; 
}

/* ===== 动画：参考示例的渐入动画 ===== */
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

/* 响应式适配 */
@media (max-width: 768px) {
  .filter-dropdowns {
    flex-wrap: wrap;
  }
  
  .filter-dropdown {
    width: 45%;
    min-width: unset;
    max-width: unset;
  }
  
  .reset-btn {
    width: 100%;
    margin-top: 10rpx;
  }
}
</style>