import num from 'num';
import _ from 'lodash';
import BookBase from '../../lib/sources/Book';

export default class Book extends BookBase {
  constructor(base, quote, xx, depth) {
    super(xx, depth);

    this.label = `${base}-${quote}`;
  }

  onMessage(data) {
    if (data.product_id !== this.label)
      return null;

    switch(data.type) {
      case 'ticker':
        this.obState({
          bids: [
            [data.best_bid, 1, 'maxbid']
          ],
          asks: [
            [data.best_ask, 1, 'minask']
          ]
        });
        break;
      case 'snapshot':
        this.obState({
          bids: _.map(data.bids, bid => ([...bid, `buy${num(parseFloat(bid[0])).toString()}`])),
          asks: _.map(data.asks, ask => ([...ask, `sell${num(parseFloat(ask[0])).toString()}`]))
        });
        break;
      case 'l2update':
        _.each(data.changes, ([side, price, size]) => {
          const orderId = `${side}${num(parseFloat(price)).toString()}`;
          size = parseFloat(size);

          if (!this.orderbook.get(orderId) && size > 0)
            this.obAdd({
              orderId,
              price,
              size,
              side
            });
          else if (this.orderbook.get(orderId) && size === 0)
            this.obRemove(orderId);
          else if (this.orderbook.get(orderId) && size > 0)
            this.obChange({
              orderId,
              size,
              price,
              side
            });
        });
        break;
    }
  }
};
