import _ from 'lodash';
import WSBase from '../../lib/sources/WS';
import { BF_WS_URL } from './constants';

export default class WS extends WSBase {
  constructor() {
    super('bff', BF_WS_URL);

    this.executionReport.addKey('restart');
    this.executionReport.addKey('maintenance-start');
    this.executionReport.addKey('maintenance-end');
  }

  onClose() {
    super.onClose();

    clearInterval(this.pingInterval);
  }

  onOpen() {
    this.maintening = false;
    this.mapChannelInfos = {};

    this.pingInterval = setInterval(() => {
      this.send({
        event:'ping',
        cid: _.random(1000, 5000, false)
      });
    }, 3000);
  }

  onMessage(data) {
    if (data.event === 'info' && data.code === 20051) {
      this.debug('bff ws restart');
      this.executionReport.increment('restart');
      this.close();
      return;
    }

    if (data.event === 'info' && data.code === 20060) {
      this.debug('bff ws maintenance start');
      this.executionReport.increment('maintenance-start');
      this.maintening = true;
      return;
    }

    if (data.event === 'info' && data.code === 20061) {
      this.debug('bff ws maintenance end');
      this.executionReport.increment('maintenance-end');
      this.close();
      return;
    }

    if (data.event === 'subscribed' || data.event === 'auth')
      this.mapChannelInfos[data.chanId] = {
        ...data,
        channel: data.event === 'auth' ? 'auth' : data.channel
      };

    if (_.isArray(data) && this.mapChannelInfos[data[0]])
      data = {
        ...this.mapChannelInfos[data[0]],
        data
      };

    return data;
  }

  send(msg) {
    if (this.maintening)
      return;

    return super.send(msg);
  }
};
