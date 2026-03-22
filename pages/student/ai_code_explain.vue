<template>
  <view class="page">

    <!-- 输入卡片 -->
    <view class="card">

      <!-- 语言选择（卡片式） -->
      <view class="field">
        <text class="label">语言</text>
        <view class="lang-grid">
          <view
            v-for="(item,index) in langOptions"
            :key="index"
            class="lang-item"
            :class="{active:langIndex===index}"
            @click="langIndex=index"
          >
            {{ item }}
          </view>
        </view>
      </view>

      <!-- 代码输入 -->
      <view class="field">
        <text class="label">代码</text>
        <view class="code-input-wrap">
          <textarea
            v-model="code"
            class="code-textarea"
            placeholder="粘贴完整代码..."
            :maxlength="-1"
            show-confirm-bar="false"
          />
        </view>
      </view>

      <!-- 解释要求 -->
      <view class="field">
        <text class="label">解释要求</text>
        <textarea
          v-model="requirement"
          class="textarea"
          placeholder="例如：解释整体逻辑，并说明main里的循环作用"
        />
      </view>

      <view class="btn primary" @click="submitExplain">
        {{ loading ? '解析中…' : '开始解释' }}
      </view>

      <text v-if="errorText" class="error">{{ errorText }}</text>

    </view>

    <!-- 结果区域 -->
    <view v-if="result" class="result-card">

      <!-- 检查结果 -->
      <view class="check-card">
        <text class="check-title">代码检查</text>
        <view class="check-type" :class="result.check.type.toLowerCase()">
          {{ result.check.type }}
        </view>
        <text class="check-msg">{{ result.check.message }}</text>
      </view>

      <!-- 整体说明 -->
      <view class="section">
        <text class="section-title">整体说明</text>
        <text class="section-text">{{ result.overall }}</text>
      </view>

      <!-- 分段 -->
      <view v-if="result.sections?.length" class="section">
        <text class="section-title">结构说明</text>

        <view
          v-for="(s,i) in result.sections"
          :key="i"
          class="sub-section"
        >
          <text class="sub-title">{{ s.name }}</text>
          <text class="section-text">{{ s.description }}</text>
        </view>
      </view>

      <!-- 重点解释 -->
      <view class="section">
        <text class="section-title">重点解释</text>
        <text class="section-text">{{ result.focusAnswer }}</text>
      </view>

      <!-- 注意点 -->
      <view v-if="result.notes?.length" class="section">
        <text class="section-title">注意点</text>
        <view v-for="(n,i) in result.notes" :key="i" class="bullet">
          • {{ n }}
        </view>
      </view>

      <!-- 建议 -->
      <view v-if="result.suggestions?.length" class="section">
        <text class="section-title">优化建议</text>
        <view v-for="(n,i) in result.suggestions" :key="i" class="bullet">
          • {{ n }}
        </view>
      </view>

    </view>

  </view>
</template>

<script>
export default {
  data() {
    return {
      langOptions: ['Java','Python','C','C++','JavaScript','Go','Rust'],
      langIndex: 0,

      code: '',
      requirement: '',

      loading: false,
      errorText: '',
      result: null
    }
  },

  computed:{
    selectedLang(){
      return this.langOptions[this.langIndex]
    }
  },

  methods:{

    getBase(){
      return 'http://81.70.62.177:8081'
    },

    getBearer(){
      const token = uni.getStorageSync('token')
      if(!token) return ''
      return token.startsWith('Bearer ') ? token : `Bearer ${token}`
    },

    request(path,data){
      return new Promise((resolve,reject)=>{
        uni.request({
          url:this.getBase()+path,
          method:'POST',
          data,
          header:{
            Authorization:this.getBearer(),
            'Content-Type':'application/json'
          },
          success:res=>{
            if(res.statusCode===200) resolve(res.data)
            else reject(res)
          },
          fail:reject
        })
      })
    },

    async submitExplain(){

      if(!this.code.trim()){
        this.errorText='请先输入代码'
        return
      }

      if(!this.requirement.trim()){
        this.errorText='请填写解释要求'
        return
      }

      this.loading=true
      this.errorText=''
      this.result=null

      try{
        const res = await this.request('/api/ai/code/explain',{
          language:this.selectedLang,
          code:this.code,
          requirement:this.requirement
        })

        if(res.code!==0){
          this.errorText=res.msg||'解释失败'
          return
        }

        this.result=res.data

      }catch(e){
        this.errorText='网络异常，请检查服务器'
      }finally{
        this.loading=false
      }
    }

  }
}
</script>

<style scoped>

.page{
  padding:30rpx;
  background:linear-gradient(180deg,#f5f7ff,#ffffff);
}

.card,.result-card{
  background:#fff;
  padding:28rpx;
  border-radius:22rpx;
  margin-bottom:24rpx;
  box-shadow:0 8rpx 24rpx rgba(0,0,0,0.05);
}

.field{ margin-bottom:24rpx; }

.label{
  font-weight:900;
  margin-bottom:12rpx;
  display:block;
  font-size:28rpx;
}

/* 语言选择 */
.lang-grid{
  display:flex;
  flex-wrap:wrap;
  gap:14rpx;
}
.lang-item{
  padding:14rpx 22rpx;
  border-radius:999rpx;
  background:#eef2ff;
  font-weight:800;
  font-size:24rpx;
  color:#4f6cff;
}
.lang-item.active{
  background:linear-gradient(135deg,#4f6cff,#6b86ff);
  color:#fff;
  box-shadow:0 6rpx 16rpx rgba(79,108,255,0.3);
}

/* 普通 textarea */
.textarea{
  min-height:150rpx;
  border:1rpx solid #ddd;
  border-radius:16rpx;
  padding:20rpx;
  font-size:26rpx;
}

/* 代码输入 */
.code-input-wrap{
  background:#0b1020;
  border-radius:18rpx;
  padding:20rpx;
  height:400rpx;
  overflow:hidden;
}

.code-textarea{
  width:100%;
  height:100%;
  color:#e5e7eb;
  font-size:24rpx;
  line-height:1.7;
  background:transparent;
  font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace;
}

.btn{
  background:linear-gradient(135deg,#4f6cff,#6b86ff);
  color:#fff;
  padding:22rpx;
  text-align:center;
  border-radius:16rpx;
  font-weight:900;
  font-size:28rpx;
}

.error{
  color:#ff4d4f;
  margin-top:12rpx;
  font-weight:700;
}

/* 检查卡片 */
.check-card{
  background:#f8f9ff;
  padding:18rpx;
  border-radius:16rpx;
  margin-bottom:24rpx;
}

.check-type{
  display:inline-block;
  padding:6rpx 18rpx;
  border-radius:999rpx;
  font-weight:900;
  margin-bottom:12rpx;
  font-size:22rpx;
}

.check-type.ok{ background:#e6fffa;color:#13c2c2;}
.check-type.syntax{ background:#fff1f0;color:#ff4d4f;}
.check-type.logic{ background:#fffbe6;color:#faad14;}

.section{
  margin-bottom:28rpx;
}

.section-title{
  font-weight:900;
  margin-bottom:12rpx;
  font-size:30rpx;
}

.section-text{
  line-height:1.8;
  font-size:26rpx;
}

.sub-title{
  font-weight:800;
  margin-bottom:6rpx;
}

.bullet{
  margin-bottom:10rpx;
  font-size:26rpx;
}

</style>