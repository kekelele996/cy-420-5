<template>
  <div class="danmaku-layer" ref="layerRef">
    <div
      v-for="item in activeDanmaku"
      :key="item.id"
      class="danmaku-item"
      :style="{
        top: item.top + 'px',
        left: item.left + 'px',
        color: item.color,
        animationDuration: item.duration + 's',
      }"
    >
      <span class="danmaku-nick">{{ item.from_nickname }}</span>
      <span class="danmaku-text">: {{ item.message }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import type { CheerMessage } from '../../models/gameState';

interface DanmakuItem extends CheerMessage {
  top: number;
  left: number;
  duration: number;
}

const props = defineProps<{
  cheers: CheerMessage[];
}>();

const layerRef = ref<HTMLDivElement>();
const activeDanmaku = ref<DanmakuItem[]>([]);
const tracks = ref<number[]>([0, 0, 0, 0, 0]);

function findAvailableTrack(): number {
  const now = Date.now();
  let minIndex = 0;
  for (let i = 1; i < tracks.value.length; i++) {
    if (tracks.value[i] < tracks.value[minIndex]) {
      minIndex = i;
    }
  }
  return minIndex;
}

function addDanmaku(cheer: CheerMessage) {
  const track = findAvailableTrack();
  const duration = 8 + Math.random() * 4;
  const item: DanmakuItem = {
    ...cheer,
    top: track * 32 + 8,
    left: 0,
    duration,
  };
  activeDanmaku.value.push(item);
  tracks.value[track] = Date.now() + 2000;
  setTimeout(() => {
    const idx = activeDanmaku.value.findIndex(d => d.id === item.id);
    if (idx > -1) activeDanmaku.value.splice(idx, 1);
  }, duration * 1000);
}

let lastCount = 0;
watch(
  () => props.cheers.length,
  (newLen) => {
    if (newLen > lastCount) {
      const newItems = props.cheers.slice(0, newLen - lastCount);
      newItems.forEach((cheer, i) => {
        setTimeout(() => addDanmaku(cheer), i * 200);
      });
    }
    lastCount = newLen;
  }
);
</script>

<style scoped>
.danmaku-layer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  overflow: hidden;
}

.danmaku-item {
  position: absolute;
  white-space: nowrap;
  font-size: 16px;
  font-weight: bold;
  text-shadow:
    -1px -1px 0 #000,
    1px -1px 0 #000,
    -1px 1px 0 #000,
    1px 1px 0 #000,
    0 0 8px rgba(0, 0, 0, 0.5);
  animation: danmaku-scroll linear forwards;
  z-index: 10;
}

.danmaku-nick {
  opacity: 0.9;
}

.danmaku-text {
  opacity: 1;
}

@keyframes danmaku-scroll {
  from {
    transform: translateX(100vw);
  }
  to {
    transform: translateX(-100%);
  }
}
</style>
