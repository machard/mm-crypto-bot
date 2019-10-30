import _ from 'lodash';
import WSBase from '../../lib/sources/WS';
import { BLINKTRADE_WS_URL } from './constants';

export default class WS extends WSBase {
  constructor() {
    super('blinktrade', BLINKTRADE_WS_URL);
  }

  onOpen() {
    this.pingInterval = setInterval(() => this.send({
      MsgType: '1',
      TestReqID: this.getReqId().toString(),
      SendTime: Math.floor(Date.now() / 1000)
    }), 5000);
  }
  onClose() {
    clearInterval(this.pingInterval);
  }

  getReqId() {
    return _.random(1111111111111, 9999999999999);
  }
};
