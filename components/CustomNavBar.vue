<template>
  <view class="nav">
    <text class="title">{{ title }}</text>
  </view>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    default: ''
  }
})
</script>

<style scoped>
.nav {
  height: 88rpx;
  background: #0f2027;
  display: flex;
  align-items: center;
  justify-content: center;
}

.title {
  color: #fff;
  font-size: 32rpx;
  font-weight: bold;
}
</style>
