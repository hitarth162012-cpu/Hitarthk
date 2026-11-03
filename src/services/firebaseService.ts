import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  where,
  getDocs,
  Unsubscribe,
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError } from '../firebase';
import {
  UserAccount,
  WalletState,
  CloudBattleRecord,
  MultiplayerRoom,
  FriendUser,
  PrivateServer,
} from '../types';

export interface FirestoreUserProfile {
  id: string; // Auth UID
  email: string;
  inGameName: string;
  playerId: string; // "OWO-XXXX"
  avatar: string;
  balanceINR: number;
  teamPetIds: string[];
  unlockedPetIds: string[];
  bossWins: number;
  pvpWins: number;
  pvpLosses: number;
  pets?: any[];
  xp?: number;
  updatedAt: string;
  createdAt: string;
}

export interface FirestoreLeaderboardEntry {
  userId: string;
  inGameName: string;
  playerId: string;
  avatar: string;
  balanceINR: number;
  bossWins: number;
  pvpWins: number;
  updatedAt: string;
}

/**
 * Check if a Google/email auth session exists
 */
export async function ensureOnlineAuth(): Promise<FirebaseUser | null> {
  return auth.currentUser;
}

/**
 * Sign in with Google Popup
 */
export async function signInWithGoogle(): Promise<FirebaseUser> {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    return cred.user;
  } catch (error) {
    console.error('Google Sign-In Error:', error);
    throw error;
  }
}

/**
 * Sign in or Register with Email & Password
 */
export async function registerWithEmail(email: string, pass: string): Promise<FirebaseUser> {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    return cred.user;
  } catch (error) {
    console.error('Firebase Email Register Error:', error);
    throw error;
  }
}

export async function loginWithEmail(email: string, pass: string): Promise<FirebaseUser> {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    return cred.user;
  } catch (error) {
    console.error('Firebase Email Login Error:', error);
    throw error;
  }
}

/**
 * Guest sign-in without contacting disabled STS token service
 */
export async function loginAsGuest(): Promise<FirebaseUser | null> {
  return auth.currentUser;
}

/**
 * Sign Out
 */
export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Firebase Sign-Out Error:', error);
    throw error;
  }
}

/**
 * Fetch or Initialize User Profile in Firestore
 */
export async function syncUserProfile(
  user: FirebaseUser,
  fallbackAccount: UserAccount,
  wallet: WalletState
): Promise<FirestoreUserProfile | null> {
  try {
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      const data = snap.data() as FirestoreUserProfile;
      return data;
    }

    // Initialize document for new user
    const newProfile: FirestoreUserProfile = {
      id: user.uid,
      email: user.email || 'guest@owo.arcade',
      inGameName: fallbackAccount.inGameName || user.displayName || 'ArcadeHero',
      playerId: fallbackAccount.id || `OWO-${Math.floor(1000 + Math.random() * 9000)}`,
      avatar: fallbackAccount.avatar || '⚡',
      balanceINR: Math.max(0, wallet.balanceINR),
      teamPetIds: wallet.teamPetIds || ['starter_cub'],
      unlockedPetIds: wallet.pets.map((p) => p.id),
      bossWins: wallet.stats.battlesWon || 0,
      pvpWins: wallet.stats.multiplayerDuelsWon || 0,
      pvpLosses: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(userRef, newProfile);

    // Also update leaderboard record
    await updateCloudLeaderboard(user.uid, {
      userId: user.uid,
      inGameName: newProfile.inGameName,
      playerId: newProfile.playerId,
      avatar: newProfile.avatar,
      balanceINR: newProfile.balanceINR,
      bossWins: newProfile.bossWins,
      pvpWins: newProfile.pvpWins,
      updatedAt: new Date().toISOString(),
    });

    return newProfile;
  } catch (error) {
    handleFirestoreError({
      action: 'create',
      collection: 'users',
      docId: user.uid,
      originalError: error,
    });
    return null;
  }
}

/**
 * Save user wallet & stats updates to Firestore
 */
export async function saveWalletToFirestore(
  userId: string,
  wallet: WalletState,
  account: UserAccount
): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    const payload = {
      balanceINR: wallet.balanceINR,
      teamPetIds: wallet.teamPetIds || [],
      unlockedPetIds: wallet.pets.map((p) => p.id),
      bossWins: wallet.stats.battlesWon || 0,
      pvpWins: wallet.stats.multiplayerDuelsWon || 0,
      updatedAt: new Date().toISOString(),
    };

    await updateDoc(userRef, payload);

    // Sync to public leaderboard
    await updateCloudLeaderboard(userId, {
      userId,
      inGameName: account.inGameName,
      playerId: account.id,
      avatar: account.avatar,
      balanceINR: wallet.balanceINR,
      bossWins: wallet.stats.battlesWon || 0,
      pvpWins: wallet.stats.multiplayerDuelsWon || 0,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError({
      action: 'update',
      collection: 'users',
      docId: userId,
      originalError: error,
    });
  }
}

/**
 * Update document in `/leaderboard/{userId}`
 */
export async function updateCloudLeaderboard(
  userId: string,
  entry: FirestoreLeaderboardEntry
): Promise<void> {
  try {
    const lbRef = doc(db, 'leaderboard', userId);
    await setDoc(lbRef, entry, { merge: true });
  } catch (error) {
    handleFirestoreError({
      action: 'update',
      collection: 'leaderboard',
      docId: userId,
      originalError: error,
    });
  }
}

/**
 * Real-time listener for the Top Global Players from Firestore
 */
export function subscribeGlobalLeaderboard(
  onUpdate: (entries: FirestoreLeaderboardEntry[]) => void,
  limitCount: number = 10
): Unsubscribe {
  try {
    const lbCollection = collection(db, 'leaderboard');
    const q = query(lbCollection, orderBy('balanceINR', 'desc'), limit(limitCount));

    return onSnapshot(
      q,
      (snapshot) => {
        const entries: FirestoreLeaderboardEntry[] = [];
        snapshot.forEach((docSnap) => {
          entries.push(docSnap.data() as FirestoreLeaderboardEntry);
        });
        onUpdate(entries);
      },
      (error) => {
        handleFirestoreError({
          action: 'list',
          collection: 'leaderboard',
          originalError: error,
        });
      }
    );
  } catch (error) {
    handleFirestoreError({
      action: 'list',
      collection: 'leaderboard',
      originalError: error,
    });
    return () => {};
  }
}

/**
 * Record a Boss or PvP battle directly to `/battles` collection
 */
export async function recordBattleToFirestore(
  userId: string,
  battleData: {
    type: 'boss' | 'pvp';
    playerName: string;
    opponentName: string;
    result: 'win' | 'loss' | 'draw';
    rewardINR: number;
    petsUsed: string[];
  }
): Promise<string | null> {
  try {
    await ensureOnlineAuth();
    const battlesCol = collection(db, 'battles');
    const docRef = await addDoc(battlesCol, {
      ...battleData,
      userId,
      timestamp: new Date().toISOString(),
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError({
      action: 'create',
      collection: 'battles',
      originalError: error,
    });
    return null;
  }
}

/**
 * Real-time subscription to recent battles
 */
export function subscribeUserBattles(
  userId: string,
  onUpdate: (battles: CloudBattleRecord[]) => void,
  limitCount: number = 8
): Unsubscribe {
  try {
    const battlesCol = collection(db, 'battles');
    const q = query(
      battlesCol,
      where('userId', '==', userId),
      limit(limitCount)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const records: CloudBattleRecord[] = [];
        snapshot.forEach((docSnap) => {
          records.push({
            id: docSnap.id,
            ...(docSnap.data() as Omit<CloudBattleRecord, 'id'>),
          });
        });
        records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        onUpdate(records);
      },
      (error) => {
        handleFirestoreError({
          action: 'list',
          collection: 'battles',
          originalError: error,
        });
      }
    );
  } catch (error) {
    handleFirestoreError({
      action: 'list',
      collection: 'battles',
      originalError: error,
    });
    return () => {};
  }
}

// =========================================================================
// REAL-TIME ONLINE MULTIPLAYER ROOMS (1v1 PvP Flip, Battle, High-Low)
// =========================================================================

/**
 * Save / Create / Update a Multiplayer Room in Firestore
 */
export async function saveOnlineRoom(room: MultiplayerRoom): Promise<void> {
  try {
    await ensureOnlineAuth();
    const roomRef = doc(db, 'rooms', room.code.toUpperCase());
    await setDoc(roomRef, {
      ...room,
      code: room.code.toUpperCase(),
      lastUpdated: Date.now(),
    });
  } catch (error) {
    handleFirestoreError({
      action: 'create',
      collection: 'rooms',
      docId: room.code,
      originalError: error,
    });
  }
}

/**
 * Fetch a Multiplayer Room from Firestore by code
 */
export async function getOnlineRoom(code: string): Promise<MultiplayerRoom | null> {
  try {
    const roomRef = doc(db, 'rooms', code.trim().toUpperCase());
    const snap = await getDoc(roomRef);
    if (snap.exists()) {
      return snap.data() as MultiplayerRoom;
    }
    return null;
  } catch (error) {
    handleFirestoreError({
      action: 'read',
      collection: 'rooms',
      docId: code,
      originalError: error,
    });
    return null;
  }
}

/**
 * Real-time listener for a Multiplayer Room (instant synchronization across devices)
 */
export function subscribeOnlineRoom(
  code: string,
  onUpdate: (room: MultiplayerRoom) => void
): Unsubscribe {
  try {
    const cleanCode = code.trim().toUpperCase();
    const roomRef = doc(db, 'rooms', cleanCode);

    return onSnapshot(
      roomRef,
      (docSnap) => {
        if (docSnap.exists()) {
          onUpdate(docSnap.data() as MultiplayerRoom);
        }
      },
      (error) => {
        handleFirestoreError({
          action: 'read',
          collection: 'rooms',
          docId: cleanCode,
          originalError: error,
        });
      }
    );
  } catch (error) {
    handleFirestoreError({
      action: 'read',
      collection: 'rooms',
      docId: code,
      originalError: error,
    });
    return () => {};
  }
}

/**
 * List all waiting/joinable online rooms in real-time
 */
export function subscribeOnlineOpenRooms(
  onUpdate: (rooms: MultiplayerRoom[]) => void
): Unsubscribe {
  try {
    const col = collection(db, 'rooms');
    const q = query(col, where('status', '==', 'waiting'), limit(12));

    return onSnapshot(
      q,
      (snapshot) => {
        const list: MultiplayerRoom[] = [];
        snapshot.forEach((snap) => {
          list.push(snap.data() as MultiplayerRoom);
        });
        onUpdate(list);
      },
      (error) => {
        handleFirestoreError({
          action: 'list',
          collection: 'rooms',
          originalError: error,
        });
      }
    );
  } catch (error) {
    handleFirestoreError({
      action: 'list',
      collection: 'rooms',
      originalError: error,
    });
    return () => {};
  }
}

// =========================================================================
// REAL-TIME ONLINE SOCIAL: FRIENDS, REQUESTS & RUPEE DONATIONS
// =========================================================================

/**
 * Search user online across all registered players by OwO ID or name
 */
export async function searchUserOnline(searchStr: string): Promise<FriendUser | null> {
  try {
    const clean = searchStr.trim();
    if (!clean) return null;

    const usersCol = collection(db, 'users');
    // Search by playerId (e.g. OWO-XXXX)
    const qPlayerId = query(usersCol, where('playerId', '==', clean.toUpperCase()));
    const snap = await getDocs(qPlayerId);

    if (!snap.empty) {
      const data = snap.docs[0].data() as FirestoreUserProfile;
      return {
        id: data.playerId,
        name: data.inGameName,
        avatar: data.avatar,
        accumulatedINR: data.balanceINR,
        status: 'online',
        addedAt: Date.now(),
      };
    }

    // Fallback: search by inGameName
    const qName = query(usersCol, where('inGameName', '==', clean));
    const snapName = await getDocs(qName);
    if (!snapName.empty) {
      const data = snapName.docs[0].data() as FirestoreUserProfile;
      return {
        id: data.playerId,
        name: data.inGameName,
        avatar: data.avatar,
        accumulatedINR: data.balanceINR,
        status: 'online',
        addedAt: Date.now(),
      };
    }

    return null;
  } catch (error) {
    handleFirestoreError({
      action: 'list',
      collection: 'users',
      originalError: error,
    });
    return null;
  }
}

/**
 * Send real-time online friend request
 */
export async function sendOnlineFriendRequest(
  sender: UserAccount,
  targetPlayerId: string
): Promise<boolean> {
  try {
    await ensureOnlineAuth();
    const reqsCol = collection(db, 'friend_requests');
    await addDoc(reqsCol, {
      fromId: sender.id,
      fromName: sender.inGameName,
      fromAvatar: sender.avatar,
      toId: targetPlayerId.trim().toUpperCase(),
      status: 'pending',
      timestamp: Date.now(),
    });
    return true;
  } catch (error) {
    handleFirestoreError({
      action: 'create',
      collection: 'friend_requests',
      originalError: error,
    });
    return false;
  }
}

/**
 * Listen for incoming friend requests addressed to my playerId
 */
export function subscribeIncomingFriendRequests(
  myPlayerId: string,
  onUpdate: (requests: any[]) => void
): Unsubscribe {
  try {
    const reqsCol = collection(db, 'friend_requests');
    const q = query(
      reqsCol,
      where('toId', '==', myPlayerId.trim().toUpperCase()),
      where('status', '==', 'pending')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const reqs: any[] = [];
        snapshot.forEach((d) => reqs.push({ id: d.id, ...d.data() }));
        onUpdate(reqs);
      },
      (error) => {
        handleFirestoreError({
          action: 'list',
          collection: 'friend_requests',
          originalError: error,
        });
      }
    );
  } catch (error) {
    handleFirestoreError({
      action: 'list',
      collection: 'friend_requests',
      originalError: error,
    });
    return () => {};
  }
}

/**
 * Send virtual INR donation to another player
 */
export async function sendFirestoreDonation(
  fromUserId: string,
  fromName: string,
  toPlayerId: string,
  amount: number,
  message?: string
): Promise<boolean> {
  try {
    await ensureOnlineAuth();
    const col = collection(db, 'donations');
    await addDoc(col, {
      fromUserId,
      fromName,
      toPlayerId: toPlayerId.trim().toUpperCase(),
      amount,
      message: message || '',
      timestamp: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    handleFirestoreError({
      action: 'create',
      collection: 'donations',
      originalError: error,
    });
    return false;
  }
}

/**
 * Real-time listener for incoming donations to this player's OwO ID
 */
export function subscribeIncomingDonations(
  myPlayerId: string,
  onDonationReceived: (donation: { id: string; fromName: string; amount: number; message?: string }) => void
): Unsubscribe {
  try {
    const col = collection(db, 'donations');
    const q = query(col, where('toPlayerId', '==', myPlayerId.trim().toUpperCase()), limit(5));

    let initialLoad = true;
    return onSnapshot(
      q,
      (snapshot) => {
        if (initialLoad) {
          initialLoad = false;
          return;
        }
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            onDonationReceived({
              id: change.doc.id,
              fromName: data.fromName || 'Generous Friend',
              amount: data.amount || 0,
              message: data.message,
            });
          }
        });
      },
      (error) => {
        handleFirestoreError({
          action: 'list',
          collection: 'donations',
          originalError: error,
        });
      }
    );
  } catch (error) {
    handleFirestoreError({
      action: 'list',
      collection: 'donations',
      originalError: error,
    });
    return () => {};
  }
}

// =========================================================================
// REAL-TIME ONLINE PRIVATE SERVERS
// =========================================================================

/**
 * Save an online private server in Firestore
 */
export async function saveOnlinePrivateServer(server: PrivateServer): Promise<void> {
  try {
    await ensureOnlineAuth();
    const serverRef = doc(db, 'private_servers', server.code.trim().toUpperCase());
    await setDoc(serverRef, {
      ...server,
      code: server.code.trim().toUpperCase(),
    });
  } catch (error) {
    handleFirestoreError({
      action: 'create',
      collection: 'private_servers',
      docId: server.code,
      originalError: error,
    });
  }
}

/**
 * Fetch an online private server by secret passcode from Firestore
 */
export async function getOnlinePrivateServer(code: string): Promise<PrivateServer | null> {
  try {
    const clean = code.trim().toUpperCase();
    const serverRef = doc(db, 'private_servers', clean);
    const snap = await getDoc(serverRef);
    if (snap.exists()) {
      return snap.data() as PrivateServer;
    }
    return null;
  } catch (error) {
    handleFirestoreError({
      action: 'read',
      collection: 'private_servers',
      docId: code,
      originalError: error,
    });
    return null;
  }
}

/**
 * Subscribe to all online private servers in real time
 */
export function subscribeOnlinePrivateServers(
  onUpdate: (servers: PrivateServer[]) => void
): Unsubscribe {
  try {
    const col = collection(db, 'private_servers');
    return onSnapshot(
      col,
      (snapshot) => {
        const list: PrivateServer[] = [];
        snapshot.forEach((snap) => {
          list.push(snap.data() as PrivateServer);
        });
        onUpdate(list);
      },
      (error) => {
        handleFirestoreError({
          action: 'list',
          collection: 'private_servers',
          originalError: error,
        });
      }
    );
  } catch (error) {
    handleFirestoreError({
      action: 'list',
      collection: 'private_servers',
      originalError: error,
    });
    return () => {};
  }
}
