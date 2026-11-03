import { MultiplayerPlayer, MultiplayerRoom } from '../types';
import {
  saveOnlineRoom,
  getOnlineRoom,
  subscribeOnlineRoom,
  subscribeOnlineOpenRooms,
} from '../services/firebaseService';

const CHANNEL_NAME = 'owo_arcade_multiplayer_channel';
const ROOMS_STORAGE_KEY = 'owo_multiplayer_rooms_data';

class MultiplayerEngine {
  private channel: BroadcastChannel | null = null;
  private listeners: ((room: MultiplayerRoom) => void)[] = [];
  private activePollInterval: any = null;
  private activeFirestoreUnsub: (() => void) | null = null;
  private currentActiveRoomCode: string | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.onmessage = (event) => {
          const { room } = event.data || {};
          if (room) {
            this.saveRoomLocally(room);
            this.notifyListeners(room);
          }
        };
      } catch {
        // BroadcastChannel fallback
      }
    }

    // Cross-tab storage event listener
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === ROOMS_STORAGE_KEY && e.newValue) {
          try {
            const rooms = JSON.parse(e.newValue);
            if (this.currentActiveRoomCode && rooms[this.currentActiveRoomCode]) {
              this.notifyListeners(rooms[this.currentActiveRoomCode]);
            }
          } catch {
            // ignore
          }
        }
      });
    }
  }

  private notifyListeners(room: MultiplayerRoom) {
    this.listeners.forEach((cb) => {
      try {
        cb(room);
      } catch {
        // ignore
      }
    });
  }

  private getRoomsMap(): Record<string, MultiplayerRoom> {
    try {
      const data = localStorage.getItem(ROOMS_STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  private saveRoomLocally(room: MultiplayerRoom) {
    try {
      const rooms = this.getRoomsMap();
      rooms[room.code] = room;
      localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(rooms));
    } catch {
      // ignore
    }
  }

  public subscribe(cb: (room: MultiplayerRoom) => void) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  /**
   * Start live online room sync via Firebase Firestore and dual fallback
   */
  public startRoomPolling(code: string) {
    const cleanCode = code.trim().toUpperCase();
    this.currentActiveRoomCode = cleanCode;
    this.stopRoomPolling();

    // 1. Direct Real-Time Firebase Firestore WebSocket listener (Online across all devices!)
    try {
      this.activeFirestoreUnsub = subscribeOnlineRoom(cleanCode, (cloudRoom) => {
        if (cloudRoom) {
          this.saveRoomLocally(cloudRoom);
          this.notifyListeners(cloudRoom);
        }
      });
    } catch (err) {
      console.warn('Firestore room subscription fallback:', err);
    }

    // 2. Immediate fetch
    this.fetchRoomFromServer(cleanCode);

    // 3. Fallback heartbeat poll
    this.activePollInterval = setInterval(() => {
      this.fetchRoomFromServer(cleanCode);
    }, 2000);
  }

  public stopRoomPolling() {
    if (this.activeFirestoreUnsub) {
      this.activeFirestoreUnsub();
      this.activeFirestoreUnsub = null;
    }
    if (this.activePollInterval) {
      clearInterval(this.activePollInterval);
      this.activePollInterval = null;
    }
  }

  public async fetchRoomFromServer(code: string): Promise<MultiplayerRoom | null> {
    const cleanCode = code.trim().toUpperCase();

    // 1. Check Firebase Firestore online room first
    try {
      const cloudRoom = await getOnlineRoom(cleanCode);
      if (cloudRoom) {
        this.saveRoomLocally(cloudRoom);
        this.notifyListeners(cloudRoom);
        return cloudRoom;
      }
    } catch {
      // fallback
    }

    // 2. Check backend server
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(cleanCode)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.room) {
          this.saveRoomLocally(data.room);
          this.notifyListeners(data.room);
          return data.room;
        }
      }
    } catch {
      // fallback
    }

    // 3. Check local storage
    const local = this.getRoomsMap()[cleanCode];
    if (local) {
      this.notifyListeners(local);
    }
    return local || null;
  }

  public async listActiveRooms(): Promise<MultiplayerRoom[]> {
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.rooms)) {
          data.rooms.forEach((r: MultiplayerRoom) => this.saveRoomLocally(r));
          return data.rooms;
        }
      }
    } catch {
      // fallback to local rooms
    }
    const map = this.getRoomsMap();
    return Object.values(map);
  }

  public broadcast(room: MultiplayerRoom) {
    this.saveRoomLocally(room);
    if (this.channel) {
      try {
        this.channel.postMessage({ type: 'ROOM_UPDATE', room });
      } catch {
        // ignore
      }
    }
    this.notifyListeners(room);

    // 1. Sync to Firebase Firestore online room immediately
    saveOnlineRoom(room).catch((err) => {
      console.warn('Firestore saveOnlineRoom failed:', err);
    });

    // 2. Sync to server backend
    fetch(`/api/rooms/${encodeURIComponent(room.code)}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomUpdate: room }),
    }).catch(() => {});
  }

  public async createRoom(
    hostPlayer: MultiplayerPlayer,
    gameMode: 'flip' | 'slots' | 'highlow' | 'hunt' | 'battle',
    stakeINR: number,
    requestedCode?: string
  ): Promise<MultiplayerRoom> {
    const cleanRequested = requestedCode
      ? requestedCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
      : Math.floor(1000 + Math.random() * 9000).toString();

    const code = cleanRequested || Math.floor(1000 + Math.random() * 9000).toString();

    const room: MultiplayerRoom = {
      id: `room_${Date.now()}_${code}`,
      code,
      gameMode,
      status: 'waiting',
      stakeINR,
      host: hostPlayer,
      logs: [`Online room ${code} created by ${hostPlayer.name}. Waiting for friend to join!`],
      lastUpdated: Date.now(),
    };

    // Save to Firestore online
    await saveOnlineRoom(room);

    // Sync to backend server
    fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host: hostPlayer,
        gameMode,
        stakeINR,
        requestedCode: code,
      }),
    }).catch(() => {});

    this.broadcast(room);
    this.startRoomPolling(code);
    return room;
  }

  public async getRoom(code: string): Promise<MultiplayerRoom | null> {
    const cleanCode = code.trim().toUpperCase();
    const serverRoom = await this.fetchRoomFromServer(cleanCode);
    if (serverRoom) return serverRoom;
    const rooms = this.getRoomsMap();
    return rooms[cleanCode] || null;
  }

  public async joinRoom(
    code: string,
    guestPlayer: MultiplayerPlayer
  ): Promise<{ room: MultiplayerRoom | null; error?: string; isHostNow?: boolean }> {
    const cleanCode = code.trim().toUpperCase();

    // 1. Check if room exists in Firebase Firestore online
    let room = await getOnlineRoom(cleanCode);

    // 2. If not found in Firestore, check server
    if (!room) {
      try {
        const res = await fetch(`/api/rooms/${encodeURIComponent(cleanCode)}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guest: guestPlayer }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.room) {
            this.broadcast(data.room);
            this.startRoomPolling(data.room.code);
            return { room: data.room, isHostNow: data.isHostNow };
          }
        }
      } catch {
        // fallback
      }
    }

    // 3. Fallback to local storage
    if (!room) {
      room = this.getRoomsMap()[cleanCode];
    }

    // 4. If room does not exist anywhere yet, initialize it as host so the user can invite their friend!
    if (!room) {
      room = {
        id: `room_${Date.now()}_${cleanCode}`,
        code: cleanCode,
        gameMode: 'flip',
        status: 'waiting',
        stakeINR: guestPlayer.betINR || 1000,
        host: guestPlayer,
        logs: [`Room ${cleanCode} opened online by ${guestPlayer.name}. Waiting for opponent!`],
        lastUpdated: Date.now(),
      };
      await saveOnlineRoom(room);
      this.broadcast(room);
      this.startRoomPolling(cleanCode);
      return { room, isHostNow: true };
    }

    // If current player is already host
    if (room.host.id === guestPlayer.id) {
      this.startRoomPolling(cleanCode);
      return { room };
    }

    // Join room as guest online
    const updated: MultiplayerRoom = {
      ...room,
      guest: guestPlayer,
      status: 'ready',
      logs: [`${guestPlayer.name} joined online! Both players ready for duel.`, ...room.logs],
      lastUpdated: Date.now(),
    };

    await saveOnlineRoom(updated);
    this.broadcast(updated);
    this.startRoomPolling(cleanCode);
    return { room: updated };
  }

  public async leaveRoom(code: string) {
    this.stopRoomPolling();
    this.currentActiveRoomCode = null;
    try {
      await fetch(`/api/rooms/${encodeURIComponent(code)}/leave`, { method: 'POST' });
    } catch {
      // ignore
    }
  }
}

export const multiplayer = new MultiplayerEngine();
