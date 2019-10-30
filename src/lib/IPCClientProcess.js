import ipc from 'node-ipc';
import _ from 'lodash';

export default class IPCClientProcess {
  constructor(name) {
    this.ipc = new ipc.IPC();

    this.ipc.config.silent = true;

    this.ipc.connectTo(name);
    this.name = name;
    this.handlers = [];
    this.ipc.of[this.name].on('disconnect', () => {
      _.each(this.handlers, handler => handler({ lag: true }));
    });
  }

  on(event, handler) {
    return this.ipc.of[this.name].on(event, handler);
  }

  onMessage(handler) {
    this.handlers.push(handler);
    return this.ipc.of[this.name].on('message', handler);
  }

  send(data) {
    return this.ipc.of[this.name].emit('message', data);
  }

  command(cmd) {
    return this.ipc.of[this.name].emit('command', cmd);
  }
}
