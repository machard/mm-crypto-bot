import CachedBatchedZippedStream from '../lib/CachedBatchedZippedStream';
import num from 'num';
import _ from 'lodash';

export default class HigherBid extends CachedBatchedZippedStream {

  constructor(book, minSize) {
    super(`filters:higherbid:${book.name()}`, book);
    this.book = book;
    this.minSize = minSize;
  }

  name() {
    return this.book.name();
  }

  processMessage([orderbook]) {
    if (!this.minSize)
      return orderbook.maxBid();

    const bids = orderbook._getTree('buy').iterator();

    let next = bids.prev();
    let sizeTotal = num(0);
    let price;
    while(next) {
      price = next.price;
      sizeTotal = sizeTotal.add(_.reduce(next.orders, (s, order) => s.add(order.size), num(0)));
      if (sizeTotal.gte(this.minSize)) {
        this.debug('higher bid', sizeTotal.toString(), price.toString());
        break;
      }
      next = bids.prev();
    }

    return price;
  }
};
