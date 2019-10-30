import CachedBatchedZippedStream from '../lib/CachedBatchedZippedStream';
import num from 'num';
import _ from 'lodash';

export default class SmallerAsk extends CachedBatchedZippedStream {

  constructor(book, minSize) {
    super(`filters:smallerask:${book.name()}`, book);
    this.book = book;
    this.minSize = minSize;
  }

  name() {
    return this.book.name();
  }

  processMessage([orderbook]) {
    if (!this.minSize)
      return orderbook.minAsk();

    const asks = orderbook._getTree('ask').iterator();

    let next = asks.next();
    let sizeTotal = num(0);
    let price;
    while(next) {
      price = next.price;
      sizeTotal = sizeTotal.add(_.reduce(next.orders, (s, order) => s.add(order.size), num(0)));
      if (sizeTotal.gte(this.minSize)) {
        this.debug('smaller ask', sizeTotal.toString(), price.toString());
        break;
      }
      next = asks.next();
    }

    return price;
  }
};
