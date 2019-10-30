import num from 'num';
import _ from 'lodash';
import BookBase from '../../lib/sources/Book';

export default class Book extends BookBase {
  constructor(base, quote, xx, depth) {
    super(xx, depth);

    this.label = `${base}${quote}`;
  }

  onMessage(data) {
    if (data.MsgType === 'X')
      _.each(data.MDIncGrp, (inData) =>
        this.onMessage({ ...inData, MsgType: 'X-spread' })
      );

    if (data.Symbol !== this.label)
      return null;

    if (data.MsgType === 'W') {
      const bids = [];
      const asks = [];
      _.each(data.MDFullGrp, order =>
        (order.MDEntryType === '0' ? bids : asks).push([
          num(order.MDEntryPx / 1e8),
          num(order.MDEntrySize / 1e8),
          order.OrderID
        ])
      );
      this.obState({ bids, asks });
    }

    if (data.MsgType === 'X-spread') {
      let side, order, orders;

      switch(data.MDUpdateAction) {
        case '0': // NEW (orderid available)
          this.obAdd({
            orderId: data.OrderID,
            price: num(data.MDEntryPx / 1e8),
            size: num(data.MDEntrySize / 1e8),
            side: data.MDEntryType === '0' ? 'buy' : 'sell'
          });
          break;
        case '1': // UPDATE
          // remove current at this position
          side = data.MDEntryType === '0' ? 'bids' : 'asks';
          order = this.orderbook.state()[side][data.MDEntryPositionNo - 1];
          this.obRemove(order.id);

          // add new
          this.obAdd({
            orderId: data.OrderID,
            price: num(data.MDEntryPx / 1e8),
            size: num(data.MDEntrySize / 1e8),
            side: data.MDEntryType === '0' ? 'buy' : 'sell'
          });
          break;
        case '2': // DELETE (no orderId, but MDEntryPositionNo)
          side = data.MDEntryType === '0' ? 'bids' : 'asks';
          order = this.orderbook.state()[side][data.MDEntryPositionNo - 1];
          this.obRemove(order.id);
          break;
        case '3': // DELETE_THRU (no irderId but MDEntryPositionNo)
          side = data.MDEntryType === '0' ? 'bids' : 'asks';
          orders = this.orderbook.state()[side].slice(0, data.MDEntryPositionNo);
          _.each(orders, order => this.obRemove(order.id));
          break;
      }
    }
  }
};
