<template>
  <view class="nav-placeholder" :style="{ height: safeTop + 'px' }"></view>
</template>

<script>
export default {
  data() {
    return { safeTop: 0 }
  },
  created() {
    const info = uni.getSystemInfoSync()
    // statusBarHeight 是“顶部安全区高度”
    this.safeTop = info.statusBarHeight || 0
  }
}
</script>

<style scoped>
.nav-placeholder {
  width: 100%;
  background: #fff;
}
</style>