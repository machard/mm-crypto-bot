import TransformedStream from '../../lib/TransformedStream';
import OrderBook from '../../models/Book';

export default class Book extends TransformedStream {

  DISABLE_DATA_DEBUG = true;

  constructor(source, depth) {
    super('source:book', source);

    this.source = source;
    this.depth = depth;
    this.orderbook = new OrderBook();

    this.executionReport.addKey('need-refill');
    this.executionReport.addKey('spread-crossover');
  }

  name() {
    return 'book';
  }

  onMessage() {
    // to override
  }

  obState(state) {
    this.orderbook = new OrderBook();
    this.orderbook.state(state);
  }
  obAdd({ orderId, price, size, side }) {
    this.orderbook.add({
      'order_id': orderId,
      price,
      size,
      side
    });
  }
  obRemove(orderId) {
    this.orderbook.remove(orderId);
  }
  obChange({ orderId, size, price, side}) {
    this.orderbook.change({
      'order_id': orderId,
      'new_size': size,
      price,
      side,
      size,
      'old_size': this.orderbook.get(orderId).size
    });
  }

  processMessage(data) {
    this.onMessage(data);

    if (this.orderbook._bids.size < this.depth || this.orderbook._asks.size < this.depth) {
      this.executionReport.increment('need-refill');
      this.clearBuffer();
      return;
    }

    if (this.orderbook.maxBid().gte(this.orderbook.minAsk())) {
      this.executionReport.increment('spread-crossover');
      this.source.close();
      return;
    }

    return this.orderbook;
  }
};
