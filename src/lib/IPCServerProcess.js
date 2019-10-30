import ipc from 'node-ipc';

export default class IPCServerProcess {
  constructor(name) {
    this.ipc = new ipc.IPC();

    this.ipc.config.id = name;
    this.ipc.config.retry = 1500;
    this.ipc.config.silent = true;

    this.ipc.serve();
    this.ipc.server.start();

  }

  on(event, handler) {
    return this.ipc.server.on(event, handler);
  }

  send(data) {
    return this.ipc.server.broadcast('message', data);
  }
}
