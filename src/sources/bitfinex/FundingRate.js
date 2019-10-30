import WS from './WS';
import num from 'num';
import _ from 'lodash';

export default class XX extends WS {
  constructor(currency) {
    super();

    this.currency = currency;
  }

  onOpen() {
    super.onOpen();

    this.send({
      event: 'subscribe',
      symbol: `f${this.currency}`,
      channel: 'trades'
    });
  }

  onMessage(data) {
    data = super.onMessage(data);

    if (_.get(data, 'data.1') !== 'fte')
      return;

    this.lag(false);

    this.write(num(data.data[2][3]));

    this.makeTick();
  }
};
