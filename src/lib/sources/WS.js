import Websocket from 'ws';
import Source from '../Source';
import sharedTicker from '../sharedTicker';

export default class WS extends Source {
  DISABLE_COMPARAISON_CHECK = true;

  constructor(name, host) {
    super(`ws:${name}`, sharedTicker);

    this.executionReport.addKey('close');
    this.executionReport.addKey('error');

    this.host = host;
    this._name = name;

    this.connect();
  }

  onMessage() {}
  onOpen() {}
  onClose() {}

  connect() {
    if (this.connecting || this.connected)
      return;
    this.connecting = true;

    const websocket = new Websocket(this.host);

    websocket.on('error', (err) => {
      this.debug('ws socket error', err);
      this.executionReport.increment('error');
    });

    websocket.on('close', () => {
      this.debug('ws socket close');
      this.executionReport.increment('close');
      this.lag(true);
      this.connected = false;
      this.connecting = false;
      clearTimeout(this.stalTO);
      this.onClose();
      this.connect();
    });

    websocket.on('open', (data) => {
      this.debug('ws open');
      this.connecting = false;
      this.connected = websocket;
      //
      this.onOpen();

      this.stalTO = setTimeout(() => this.close(), 10000);
    });

    websocket.on('message', (data) => {
      this.onMessage(JSON.parse(data));

      clearTimeout(this.stalTO);
      this.stalTO = setTimeout(() => this.close(), 10000);
    });
  }

  makeTick() {
    sharedTicker.tick();
  }

  close() {
    if (!this.connected)
      return;
    this.connected.close();
  }

  send(msg) {
    if (!this.connected)
      return;

    if (this.connected.readyState === Websocket.OPEN)
      this.connected.send(JSON.stringify(msg));
  }

  name() {
    return `ws:${this._name}`;
  }

};
