import { defineStore } from 'pinia';
import type { GameState, CheerMessage } from '../models/gameState';
import { websocketService } from '../services/websocketService';
import { fillTerritory } from '../utils/floodFill';
import { logGame } from '../utils/gameLogger';
import { WsMessageType } from '../constants/websocket';
import { SPEED_BOOST } from '../constants/player';
import { PlayerStatus } from '../constants/player';

export const useGameStore = defineStore('game', {
  state: () => ({
    state: undefined as GameState | undefined,
    observer: false,
  }),
  actions: {
    start(roomId: string) {
      this.state = websocketService.makeState(roomId);
      logGame('GAME_START', { id: roomId });
      websocketService.on(WsMessageType.PLAYER_CHEER, (payload: CheerMessage) => {
        this.handleCheer(payload);
      });
    },
    move(dx: number, dy: number) {
      if (!this.state) return;
      if (this.observer) return;
      const p = this.state.players[0];
      if (p.status !== PlayerStatus.ALIVE) return;
      const step = p.speed_boost_ticks > 0 ? SPEED_BOOST.MULTIPLIER : 1;
      p.position.x = Math.max(0, Math.min(31, p.position.x + dx * step));
      p.position.y = Math.max(0, Math.min(21, p.position.y + dy * step));
      p.trail.push({ x: p.position.x, y: p.position.y, type: 'trail' as any, owner_id: p.id });
      this.state.tick++;
      logGame('PLAYER_MOVE', { id: p.id, x: p.position.x, y: p.position.y });
      if (p.trail.length > 4) {
        const cells = fillTerritory(this.state.map, p.id);
        p.score += cells.length;
        logGame('TERRITORY_CAPTURE', { id: p.id, count: cells.length });
      }
    },
    toggleObserver() {
      this.observer = !this.observer;
      logGame('OBSERVER_SWITCH');
    },
    sendCheer(targetId: string, message: string) {
      if (!this.state) return;
      const fromPlayer = this.state.players[0];
      const cheer: CheerMessage = {
        id: crypto.randomUUID(),
        from_id: this.observer ? 'observer' : fromPlayer.id,
        from_nickname: this.observer ? '观战者' : fromPlayer.nickname,
        target_id: targetId,
        message,
        color: fromPlayer.color,
        created_at: new Date().toISOString(),
      };
      websocketService.send(WsMessageType.PLAYER_CHEER, cheer);
      this.handleCheer(cheer);
    },
    handleCheer(cheer: CheerMessage) {
      if (!this.state) return;
      this.state.cheers.unshift(cheer);
      if (this.state.cheers.length > 20) this.state.cheers.pop();
      const target = this.state.players.find(p => p.id === cheer.target_id);
      if (target && target.status === PlayerStatus.ALIVE) {
        const wasBoosted = target.speed_boost_ticks > 0;
        target.speed_boost_ticks = Math.max(target.speed_boost_ticks, SPEED_BOOST.DURATION_TICKS);
        if (!wasBoosted) {
          logGame('SPEED_BOOST_START', { id: target.id });
        }
      }
      logGame('PLAYER_CHEER', {
        target_id: cheer.target_id,
        from_id: cheer.from_id,
        message: cheer.message,
      });
    },
    tickBoost() {
      if (!this.state) return;
      for (const p of this.state.players) {
        if (p.speed_boost_ticks > 0) {
          p.speed_boost_ticks--;
          if (p.speed_boost_ticks === 0) {
            logGame('SPEED_BOOST_END', { id: p.id });
          }
        }
      }
    },
  },
});
