import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useGameStore } from '../src/stores/gameStore';
import { websocketService } from '../src/services/websocketService';
import { SPEED_BOOST } from '../src/constants/player';
import { PlayerStatus, PLAYER_COLORS } from '../src/constants/player';
import { WsMessageType } from '../src/constants/websocket';
import type { CheerMessage } from '../src/models/gameState';

describe('Player speed_boost_ticks 字段完整性检查', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('websocketService.makeState 创建的 Player 必须包含 speed_boost_ticks 且为 0', () => {
    const state = websocketService.makeState('test-room');
    expect(state.players).toHaveLength(1);
    const player = state.players[0];
    expect(player).toHaveProperty('speed_boost_ticks');
    expect(player.speed_boost_ticks).toBe(0);
    expect(typeof player.speed_boost_ticks).toBe('number');
  });

  it('gameStore.start 后玩家的 speed_boost_ticks 存在且为数字', () => {
    const store = useGameStore();
    store.start('test-room');
    expect(store.state).toBeDefined();
    const p = store.state!.players[0];
    expect(p.speed_boost_ticks).toBeDefined();
    expect(Number.isInteger(p.speed_boost_ticks)).toBe(true);
  });

  it('所有 Player 类型字段齐全（含 speed_boost_ticks）', () => {
    const state = websocketService.makeState('test-room');
    const player = state.players[0];
    const requiredKeys = [
      'id', 'nickname', 'color', 'score', 'status',
      'position', 'trail', 'territory', 'speed_boost_ticks'
    ];
    for (const key of requiredKeys) {
      expect(player).toHaveProperty(key);
    }
    expect(player.position).toHaveProperty('x');
    expect(player.position).toHaveProperty('y');
    expect(Array.isArray(player.trail)).toBe(true);
    expect(Array.isArray(player.territory)).toBe(true);
  });

  it('GameState 必须包含 cheers 弹幕列表', () => {
    const state = websocketService.makeState('test-room');
    expect(state).toHaveProperty('cheers');
    expect(Array.isArray(state.cheers)).toBe(true);
    expect(state.cheers).toHaveLength(0);
  });
});

describe('助威加速核心功能', () => {
  let store: ReturnType<typeof useGameStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useGameStore();
    store.start('test-room');
  });

  it('发送助威后目标玩家 speed_boost_ticks 应等于 DURATION_TICKS', () => {
    const targetId = store.state!.players[0].id;
    store.sendCheer(targetId, '加油！');
    const target = store.state!.players[0];
    expect(target.speed_boost_ticks).toBe(SPEED_BOOST.DURATION_TICKS);
    expect(target.speed_boost_ticks).toBeGreaterThan(0);
  });

  it('助威消息应正确写入 cheers 弹幕列表', () => {
    const targetId = store.state!.players[0].id;
    store.sendCheer(targetId, '666');
    expect(store.state!.cheers.length).toBeGreaterThan(0);
    const cheer = store.state!.cheers[0];
    expect(cheer.message).toBe('666');
    expect(cheer.target_id).toBe(targetId);
    expect(cheer.from_id).toBeDefined();
    expect(cheer.from_nickname).toBeDefined();
    expect(cheer.color).toBeDefined();
    expect(cheer.id).toBeDefined();
    expect(cheer.created_at).toBeDefined();
  });

  it('cheers 列表最多保留 20 条（防止溢出）', () => {
    const targetId = store.state!.players[0].id;
    for (let i = 0; i < 30; i++) {
      store.sendCheer(targetId, `msg_${i}`);
    }
    expect(store.state!.cheers.length).toBeLessThanOrEqual(20);
  });

  it('多次助威时 speed_boost_ticks 取较大值（不累加，续期）', () => {
    const targetId = store.state!.players[0].id;
    store.sendCheer(targetId, 'first');
    const firstValue = store.state!.players[0].speed_boost_ticks;
    store.tickBoost();
    store.tickBoost();
    const afterTicks = store.state!.players[0].speed_boost_ticks;
    expect(afterTicks).toBe(firstValue - 2);
    store.sendCheer(targetId, 'second');
    const afterCheer = store.state!.players[0].speed_boost_ticks;
    expect(afterCheer).toBe(SPEED_BOOST.DURATION_TICKS);
  });
});

describe('加速倒计时与移动步长', () => {
  let store: ReturnType<typeof useGameStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useGameStore();
    store.start('test-room');
  });

  it('tickBoost 应将 speed_boost_ticks 递减到 0', () => {
    const targetId = store.state!.players[0].id;
    store.sendCheer(targetId, 'test');
    const initial = store.state!.players[0].speed_boost_ticks;
    for (let i = 0; i < initial; i++) {
      store.tickBoost();
    }
    expect(store.state!.players[0].speed_boost_ticks).toBe(0);
  });

  it('speed_boost_ticks 为 0 时不会变成负数', () => {
    store.state!.players[0].speed_boost_ticks = 0;
    for (let i = 0; i < 10; i++) {
      store.tickBoost();
    }
    expect(store.state!.players[0].speed_boost_ticks).toBe(0);
  });

  it('加速状态下移动步长应为 MULTIPLIER 倍', () => {
    const player = store.state!.players[0];
    const startX = player.position.x;
    const startY = player.position.y;
    store.sendCheer(player.id, 'boost');
    expect(player.speed_boost_ticks).toBeGreaterThan(0);
    store.move(1, 0);
    expect(player.position.x - startX).toBe(SPEED_BOOST.MULTIPLIER);
    expect(player.position.y).toBe(startY);
  });

  it('非加速状态下移动步长为 1', () => {
    const player = store.state!.players[0];
    player.speed_boost_ticks = 0;
    const startX = player.position.x;
    store.move(1, 0);
    expect(player.position.x - startX).toBe(1);
  });

  it('加速倒计时结束后步长恢复为 1', () => {
    const player = store.state!.players[0];
    store.sendCheer(player.id, 'boost');
    while (player.speed_boost_ticks > 0) {
      store.tickBoost();
    }
    const startX = player.position.x;
    store.move(1, 0);
    expect(player.position.x - startX).toBe(1);
  });
});

describe('WebSocket 助威消息广播同步', () => {
  let store: ReturnType<typeof useGameStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useGameStore();
  });

  it('PLAYER_CHEER 消息能被 websocketService 正确 emit', () => {
    let received: CheerMessage | null = null;
    websocketService.on(WsMessageType.PLAYER_CHEER, (payload: CheerMessage) => {
      received = payload;
    });
    const cheer: CheerMessage = {
      id: 'test-cheer-1',
      from_id: 'observer',
      from_nickname: '测试观战者',
      target_id: 'p-local',
      message: '冲啊！',
      color: PLAYER_COLORS[0],
      created_at: new Date().toISOString(),
    };
    websocketService.send(WsMessageType.PLAYER_CHEER, cheer);
    expect(received).toEqual(cheer);
  });

  it('store 监听助威消息后会触发 handleCheer（跨客户端同步）', () => {
    store.start('test-room');
    const cheer: CheerMessage = {
      id: 'test-cheer-2',
      from_id: 'remote-user',
      from_nickname: '远方玩家',
      target_id: store.state!.players[0].id,
      message: '你可以的！',
      color: '#eb5757',
      created_at: new Date().toISOString(),
    };
    websocketService.emit(WsMessageType.PLAYER_CHEER, cheer);
    expect(store.state!.cheers[0].message).toBe('你可以的！');
    expect(store.state!.players[0].speed_boost_ticks).toBe(SPEED_BOOST.DURATION_TICKS);
  });

  it('sendCheer 同时触发 websocket send 和本地 handleCheer', () => {
    store.start('test-room');
    let wsCalled = false;
    const originalSend = websocketService.send.bind(websocketService);
    websocketService.send = (type: WsMessageType, payload: any) => {
      if (type === WsMessageType.PLAYER_CHEER) {
        wsCalled = true;
        expect(payload.message).toBe('发送测试');
      }
      return originalSend(type, payload);
    };
    store.sendCheer(store.state!.players[0].id, '发送测试');
    expect(wsCalled).toBe(true);
    expect(store.state!.cheers.some(c => c.message === '发送测试')).toBe(true);
    websocketService.send = originalSend;
  });
});

describe('边界条件与异常保护', () => {
  let store: ReturnType<typeof useGameStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useGameStore();
  });

  it('state 为 undefined 时 move/sendCheer/tickBoost 不应抛异常', () => {
    expect(() => store.move(1, 0)).not.toThrow();
    expect(() => store.sendCheer('x', 'y')).not.toThrow();
    expect(() => store.tickBoost()).not.toThrow();
    expect(() => store.handleCheer({
      id: '1', from_id: '2', from_nickname: 'n',
      target_id: '3', message: 'm', color: '#fff',
      created_at: new Date().toISOString()
    })).not.toThrow();
  });

  it('observer 状态下无法移动（观战者身份）', () => {
    store.start('test-room');
    store.toggleObserver();
    expect(store.observer).toBe(true);
    const startX = store.state!.players[0].position.x;
    store.move(1, 0);
    expect(store.state!.players[0].position.x).toBe(startX);
  });

  it('非 ALIVE 状态玩家即使被助威也不会获得加速', () => {
    store.start('test-room');
    store.state!.players[0].status = PlayerStatus.DEAD as any;
    store.sendCheer(store.state!.players[0].id, '复活！');
    expect(store.state!.players[0].speed_boost_ticks).toBe(0);
  });

  it('助威目标不存在时不会报错', () => {
    store.start('test-room');
    expect(() => {
      store.sendCheer('non-existent-player', 'hello');
    }).not.toThrow();
    expect(store.state!.cheers.length).toBeGreaterThan(0);
  });

  it('CheerMessage 中 color 字段必须与发送者匹配', () => {
    store.start('test-room');
    const fromColor = store.state!.players[0].color;
    store.sendCheer(store.state!.players[0].id, 'color test');
    expect(store.state!.cheers[0].color).toBe(fromColor);
  });
});
