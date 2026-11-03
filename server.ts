import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface MultiplayerPlayer {
  id: string;
  name: string;
  avatar: string;
  isReady: boolean;
  petTeam: any[];
  betINR: number;
  choice?: string;
  currentHp: number;
  maxHp: number;
}

interface MultiplayerRoom {
  id: string;
  code: string;
  gameMode: 'flip' | 'slots' | 'highlow' | 'hunt' | 'battle';
  status: 'waiting' | 'ready' | 'in_progress' | 'finished';
  stakeINR: number;
  host: MultiplayerPlayer;
  guest?: MultiplayerPlayer;
  currentTurn?: string;
  winnerId?: string;
  resultMessage?: string;
  logs: string[];
  lastUpdated: number;
  extraData?: any;
}

// Active real rooms only - no fake accounts
const rooms = new Map<string, MultiplayerRoom>();

async function startServer() {
  const app = express();
  app.use(express.json());

  // --- Real-Time Multiplayer Room API Endpoints ---

  // 1. List active waiting/joinable rooms
  app.get('/api/rooms', (_req: Request, res: Response) => {
    const list = Array.from(rooms.values())
      .filter((r) => r.status === 'waiting' || Date.now() - r.lastUpdated < 600000)
      .sort((a, b) => b.lastUpdated - a.lastUpdated);
    res.json({ success: true, rooms: list });
  });

  // 2. Get specific room by code
  app.get('/api/rooms/:code', (req: Request, res: Response) => {
    const code = req.params.code.trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) {
      return res.status(404).json({ success: false, error: `Room "${code}" not found.` });
    }
    res.json({ success: true, room });
  });

  // 3. Create room (supports auto or custom code)
  app.post('/api/rooms', (req: Request, res: Response) => {
    const { host, gameMode, stakeINR, requestedCode } = req.body;
    if (!host) {
      return res.status(400).json({ success: false, error: 'Host player is required.' });
    }

    let code = requestedCode
      ? requestedCode.toString().trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
      : Math.floor(1000 + Math.random() * 9000).toString();

    if (!code) {
      code = Math.floor(1000 + Math.random() * 9000).toString();
    }

    const room: MultiplayerRoom = {
      id: `room_${Date.now()}_${code}`,
      code,
      gameMode: gameMode || 'flip',
      status: 'waiting',
      stakeINR: Number(stakeINR) || 1000,
      host,
      logs: [`Room ${code} created by ${host.name}. Ready for opponent!`],
      lastUpdated: Date.now(),
    };

    rooms.set(code, room);
    res.json({ success: true, room });
  });

  // 4. Join room as guest
  app.post('/api/rooms/:code/join', (req: Request, res: Response) => {
    const code = req.params.code.trim().toUpperCase();
    const { guest } = req.body;

    if (!guest) {
      return res.status(400).json({ success: false, error: 'Guest player is required.' });
    }

    let room = rooms.get(code);

    // If room does not exist yet, automatically auto-host or initialize it so friends never get stuck!
    if (!room) {
      room = {
        id: `room_${Date.now()}_${code}`,
        code,
        gameMode: 'flip',
        status: 'waiting',
        stakeINR: Number(guest.betINR) || 1000,
        host: guest,
        logs: [`Room ${code} created by ${guest.name}. Waiting for opponent!`],
        lastUpdated: Date.now(),
      };
      rooms.set(code, room);
      return res.json({ success: true, room, isHostNow: true });
    }

    // If user is already the host returning
    if (room.host.id === guest.id) {
      return res.json({ success: true, room });
    }

    // Join room
    room.guest = guest;
    room.status = 'ready';
    room.logs.unshift(`${guest.name} joined the duel! Match is ready.`);
    room.lastUpdated = Date.now();
    rooms.set(code, room);

    res.json({ success: true, room });
  });

  // 5. Update room state / action
  app.post('/api/rooms/:code/action', (req: Request, res: Response) => {
    const code = req.params.code.trim().toUpperCase();
    const { roomUpdate } = req.body;
    if (!roomUpdate) {
      return res.status(400).json({ success: false, error: 'Room update required.' });
    }

    const current = rooms.get(code) || ({} as MultiplayerRoom);
    const updated: MultiplayerRoom = {
      ...current,
      ...roomUpdate,
      code,
      lastUpdated: Date.now(),
    };

    rooms.set(code, updated);
    res.json({ success: true, room: updated });
  });

  // 6. Leave room
  app.post('/api/rooms/:code/leave', (req: Request, res: Response) => {
    const code = req.params.code.trim().toUpperCase();
    const room = rooms.get(code);
    if (room) {
      // If host left, delete or close
      rooms.delete(code);
    }
    res.json({ success: true });
  });

  // Mount Vite middleware in development
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`OwO ₹ Arcade server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
