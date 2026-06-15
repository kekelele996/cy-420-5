<template>
  <main class="page">
    <div class="grid">
      <div class="canvas-wrap">
        <GameCanvas />
        <DanmakuLayer :cheers="game.state?.cheers || []" />
      </div>
      <div class="side-panel">
        <LeaderboardPanel :rows="game.state?.leaderboards || []" />
        <CombatLog />
        <section class="panel cheer-panel">
          <h3>助威弹幕</h3>
          <div class="cheer-targets">
            <button
              v-for="p in alivePlayers"
              :key="p.id"
              class="target-btn"
              :class="{ active: selectedTarget === p.id }"
              :style="{ borderColor: p.color }"
              @click="selectedTarget = p.id"
            >
              <span class="target-dot" :style="{ backgroundColor: p.color }"></span>
              {{ p.nickname }}
              <span v-if="p.speed_boost_ticks > 0" class="boost-indicator">⚡</span>
            </button>
          </div>
          <div class="cheer-input-row">
            <input
              v-model="cheerMessage"
              class="cheer-input"
              placeholder="输入助威消息..."
              maxlength="20"
              @keyup.enter="sendCheer"
            />
            <button class="send-btn" @click="sendCheer" :disabled="!canSend">
              发送
            </button>
          </div>
          <div class="quick-cheers">
            <button
              v-for="(q, idx) in quickCheers"
              :key="idx"
              class="quick-btn"
              @click="sendQuickCheer(q)"
            >
              {{ q }}
            </button>
          </div>
        </section>
        <GameButton @click="game.toggleObserver">
          {{ game.observer ? '退出观战' : '观战切换' }}
        </GameButton>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useGameStore } from '../stores/gameStore';
import GameCanvas from '../components/common/GameCanvas.vue';
import LeaderboardPanel from '../components/common/LeaderboardPanel.vue';
import CombatLog from '../components/common/CombatLog.vue';
import GameButton from '../components/common/GameButton.vue';
import DanmakuLayer from '../components/common/DanmakuLayer.vue';
import { PlayerStatus } from '../constants/player';

const route = useRoute();
const game = useGameStore();
if (!game.state) game.start(String(route.params.id));

const selectedTarget = ref('');
const cheerMessage = ref('');

const quickCheers = ['加油！', '冲啊！', '666', '厉害！', '稳了！', '太强了'];

const alivePlayers = computed(() => {
  return (game.state?.players || []).filter(p => p.status === PlayerStatus.ALIVE);
});

const canSend = computed(() => {
  return selectedTarget.value && cheerMessage.value.trim().length > 0;
});

function sendCheer() {
  if (!canSend.value) return;
  game.sendCheer(selectedTarget.value, cheerMessage.value.trim());
  cheerMessage.value = '';
}

function sendQuickCheer(msg: string) {
  if (!selectedTarget.value && alivePlayers.value.length > 0) {
    selectedTarget.value = alivePlayers.value[0].id;
  }
  if (selectedTarget.value) {
    game.sendCheer(selectedTarget.value, msg);
  }
}
</script>

<style scoped>
.canvas-wrap {
  position: relative;
}

.side-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cheer-panel {
  padding: 12px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.cheer-panel h3 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #333;
}

.cheer-targets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.target-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border: 2px solid #ddd;
  border-radius: 16px;
  background: #f8f9fa;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.target-btn:hover {
  background: #eef2ff;
}

.target-btn.active {
  background: #eef2ff;
  border-color: #2f80ed;
}

.target-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.boost-indicator {
  font-size: 12px;
  animation: pulse 0.6s ease-in-out infinite alternate;
}

@keyframes pulse {
  from { transform: scale(1); }
  to { transform: scale(1.2); }
}

.cheer-input-row {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.cheer-input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
  outline: none;
}

.cheer-input:focus {
  border-color: #2f80ed;
}

.send-btn {
  padding: 6px 16px;
  background: #2f80ed;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s;
}

.send-btn:hover:not(:disabled) {
  background: #1a6ddb;
}

.send-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.quick-cheers {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.quick-btn {
  padding: 4px 10px;
  background: #f0f2f5;
  border: none;
  border-radius: 14px;
  font-size: 12px;
  color: #555;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-btn:hover {
  background: #e0e4ea;
  color: #2f80ed;
}
</style>
