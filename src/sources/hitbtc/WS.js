import _ from 'lodash';
import WSBase from '../../lib/sources/WS';

export default class WS extends WSBase {
  constructor() {
    super('hitbtc', 'wss://api.hitbtc.com/api/2/ws');
  }

  onOpen() {
    this.pingInterval = setInterval(
      () => this.send({
        method: 'getCurrency',
        params: { currency: 'ETH' },
        id: this.getReqId()
      }),
      5000
    );
  }
  onClose() {
    clearInterval(this.pingInterval);
  }

  getReqId() {
    return _.random(1111111111111, 9999999999999);
  }
};
