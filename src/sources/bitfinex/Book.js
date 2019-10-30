import num from 'num';
import _ from 'lodash';
import BookBase from '../../lib/sources/Book';

export default class Book extends BookBase {
  constructor(base, quote, xx, depth) {
    super(xx, depth);

    this.label = `${base}${quote}`;
  }

  onMessage(data) {
    if (data.symbol !== `t${this.label}` || (data.channel !== 'book' && data.channel !== 'ticker') || !data.data || !data.data[1] || data.data[1] === 'hb')
      return null;

    const dataBook = data.data[1];

    if (data.channel === 'ticker')
      this.obState({
        bids: [
          [dataBook[0], 1, 'maxbid']
        ],
        asks: [
          [dataBook[2], 1, 'minask']
        ]
      });

    if (data.channel === 'book')
      if (_.isArray(dataBook[0])) {
        // snapshot

        const bids = [];
        const asks = [];

        _.each(dataBook, ([price, count, amount]) => {
          (amount > 0 ? bids : asks).push([
            price,
            Math.abs(parseFloat(amount)),
            `${(amount > 0 ? 'buy' : 'sell')}${num(parseFloat(price)).toString()}`
          ]);
        });

        this.obState({ bids, asks });
      } else {
        const [price, count, amount] = dataBook;
        const side = amount > 0 ? 'buy' : 'sell';
        const orderId = `${side}${num(parseFloat(price)).toString()}`;
        const size = Math.abs(parseFloat(amount));

        if (!this.orderbook.get(orderId) && count)
          this.obAdd({
            orderId,
            price,
            size,
            side
          });
        else if (this.orderbook.get(orderId) && count === 0)
          this.obRemove(orderId);
        else if (this.orderbook.get(orderId) && count)
          this.obChange({
            orderId,
            size,
            price,
            side
          });
      }
  }
};
