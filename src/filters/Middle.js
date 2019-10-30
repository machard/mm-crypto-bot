import CachedBatchedZippedStream from '../lib/CachedBatchedZippedStream';

export default class Middle extends CachedBatchedZippedStream {

  constructor(book) {
    super(`filters:middle:${book.name()}`, book);
    this.book = book;
  }

  name() {
    return this.book.name();
  }

  processMessage([orderbook]) {
    return orderbook.middle();
  }
};
