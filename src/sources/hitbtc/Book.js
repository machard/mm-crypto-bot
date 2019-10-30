import num from 'num';
import _ from 'lodash';
import BookBase from '../../lib/sources/Book';

export default class Book extends BookBase {
  constructor(base, quote, xx, depth) {
    super(xx, depth);

    this.label = `${base}${quote}`;
  }

  onMessage(data) {
    if (_.get(data, 'params.symbol') !== this.label)
      return null;

    switch(data.method) {
      case 'snapshotOrderbook':
        this.obState({
          bids: _.map(data.params.bid, ({ price, size}) => ([price, size, `buy${num(parseFloat(price)).toString()}`])),
          asks: _.map(data.params.ask, ({ price, size }) => ([price, size, `sell${num(parseFloat(price)).toString()}`]))
        });
        break;
      case 'updateOrderbook':
        _.each(data.params.ask, ({ price, size }) =>
          this.change('sell', price, size)
        );
        _.each(data.params.bid, ({ price, size }) =>
          this.change('buy', price, size)
        );
        break;
    }
  }

  change(side, price, size) {
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
  }
};
