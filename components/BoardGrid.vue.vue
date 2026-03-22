<template>
  <view class="cell" :class="cell.type">
    <text>{{ cell.name }}</text>
  </view>
</template>

<script setup>
defineProps({
  cell: Object
})
</script>

<style scoped>
.cell {
  height: 160rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: bold;
}

.start {
  background: linear-gradient(135deg, #00c9ff, #92fe9d);
}
.reward {
  background: linear-gradient(135deg, #f7971e, #ffd200);
}
.trap {
  background: linear-gradient(135deg, #ff416c, #ff4b2b);
}
.boss {
  background: linear-gradient(135deg, #654ea3, #eaafc8);
}
</style>
