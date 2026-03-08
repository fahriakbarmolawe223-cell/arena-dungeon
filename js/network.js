/* ========================================
   ARENA DUNGEON — Network Layer (PeerJS)
   ======================================== */

/**
 * Generates a random room code (6 alphanumeric chars).
 */
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

/* ----------------------------------------
   HOST NETWORK
   ---------------------------------------- */

class HostNetwork {
  constructor() {
    this.peer = null;
    this.connections = new Map(); // peerId -> DataConnection
    this.roomCode = generateRoomCode();
    this.peerId = 'arena-dungeon-' + this.roomCode;
    this.onPlayerConnect = null;    // (peerId) => void
    this.onPlayerMessage = null;    // (peerId, data) => void
    this.onPlayerDisconnect = null; // (peerId) => void
    this.ready = false;
  }

  /**
   * Initialize host peer and start listening for connections.
   * Returns a Promise that resolves when the peer is ready.
   */
  init() {
    return new Promise((resolve, reject) => {
      this.peer = new Peer(this.peerId, {
        debug: 0,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      });

      this.peer.on('open', (id) => {
        console.log('[Host] Peer ready:', id);
        this.ready = true;
        resolve(id);
      });

      this.peer.on('connection', (conn) => {
        this._handleConnection(conn);
      });

      this.peer.on('error', (err) => {
        console.error('[Host] Peer error:', err);
        // If the ID is taken, try a new one
        if (err.type === 'unavailable-id') {
          this.roomCode = generateRoomCode();
          this.peerId = 'arena-dungeon-' + this.roomCode;
          this.peer.destroy();
          this.init().then(resolve).catch(reject);
        } else {
          reject(err);
        }
      });

      this.peer.on('disconnected', () => {
        console.log('[Host] Disconnected, attempting reconnect...');
        this.peer.reconnect();
      });
    });
  }

  _handleConnection(conn) {
    conn.on('open', () => {
      console.log('[Host] Player connected:', conn.peer);
      this.connections.set(conn.peer, conn);
      if (this.onPlayerConnect) this.onPlayerConnect(conn.peer);
    });

    conn.on('data', (data) => {
      if (this.onPlayerMessage) this.onPlayerMessage(conn.peer, data);
    });

    conn.on('close', () => {
      console.log('[Host] Player disconnected:', conn.peer);
      this.connections.delete(conn.peer);
      if (this.onPlayerDisconnect) this.onPlayerDisconnect(conn.peer);
    });

    conn.on('error', (err) => {
      console.error('[Host] Connection error:', conn.peer, err);
    });
  }

  /**
   * Send data to a specific player.
   */
  sendTo(peerId, data) {
    const conn = this.connections.get(peerId);
    if (conn && conn.open) {
      conn.send(data);
    }
  }

  /**
   * Broadcast data to all connected players.
   */
  broadcast(data) {
    for (const conn of this.connections.values()) {
      if (conn.open) conn.send(data);
    }
  }

  /**
   * Get the controller URL for QR code.
   */
  getControllerUrl() {
    const base = window.location.href.replace(/\/[^/]*$/, '/');
    return base + 'controller.html?room=' + this.roomCode;
  }

  /**
   * Get number of connected players.
   */
  get playerCount() {
    return this.connections.size;
  }

  destroy() {
    if (this.peer) this.peer.destroy();
  }
}

/* ----------------------------------------
   CONTROLLER NETWORK
   ---------------------------------------- */

class ControllerNetwork {
  constructor(roomCode) {
    this.roomCode = roomCode;
    this.hostPeerId = 'arena-dungeon-' + roomCode;
    this.peer = null;
    this.connection = null;
    this.onMessage = null;   // (data) => void
    this.onConnect = null;   // () => void
    this.onDisconnect = null;
    this.connected = false;
  }

  /**
   * Initialize controller peer and connect to host.
   */
  init() {
    return new Promise((resolve, reject) => {
      this.peer = new Peer(undefined, {
        debug: 0,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      });

      this.peer.on('open', () => {
        console.log('[Controller] Peer ready, connecting to host:', this.hostPeerId);
        this.connection = this.peer.connect(this.hostPeerId, { reliable: true });

        this.connection.on('open', () => {
          console.log('[Controller] Connected to host!');
          this.connected = true;
          if (this.onConnect) this.onConnect();
          resolve();
        });

        this.connection.on('data', (data) => {
          if (this.onMessage) this.onMessage(data);
        });

        this.connection.on('close', () => {
          console.log('[Controller] Disconnected from host');
          this.connected = false;
          if (this.onDisconnect) this.onDisconnect();
        });

        this.connection.on('error', (err) => {
          console.error('[Controller] Connection error:', err);
          reject(err);
        });
      });

      this.peer.on('error', (err) => {
        console.error('[Controller] Peer error:', err);
        reject(err);
      });
    });
  }

  /**
   * Send data to the host.
   */
  send(data) {
    if (this.connection && this.connection.open) {
      this.connection.send(data);
    }
  }

  destroy() {
    if (this.peer) this.peer.destroy();
  }
}
