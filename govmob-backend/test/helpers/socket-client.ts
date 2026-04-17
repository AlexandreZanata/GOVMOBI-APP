import { io, Socket } from 'socket.io-client';

export class SocketClient {
  private socket: Socket;

  constructor(
    private readonly url: string,
    private readonly token: string,
  ) {}

  async connect() {
    this.socket = io(this.url, {
      auth: {
        token: this.token,
      },
      transports: ['websocket'],
    });

    return new Promise<void>((resolve, reject) => {
      this.socket.on('connect', () => resolve());
      this.socket.on('connect_error', (error) => reject(error));
    });
  }

  on(event: string, callback: (...args: any[]) => void) {
    this.socket.on(event, callback);
  }

  emit(event: string, ...args: any[]) {
    this.socket.emit(event, ...args);
  }

  disconnect() {
    if (this.socket) this.socket.disconnect();
  }

  get id() {
    return this.socket.id;
  }
}
