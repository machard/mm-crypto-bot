// pour le moment on utilise celui de coinbase mais bon open for change!
import CoinbaseExchange from 'coinbase-exchange';
import _ from 'lodash';
import num from 'num';

export default class OrderBook extends CoinbaseExchange.Orderbook {
  minAsk() {
    return (this._getTree('ask').iterator().next() || {}).price;
  }
  maxBid() {
    return (this._getTree('buy').iterator().prev() || {}).price;
  }
  middle() {
    return this.minAsk().add(this.maxBid()).div(2);
  }
  levels(side, depth) {
    const levels = [];
    var it = this._getTree(side).iterator(), item;
    while ((item = it[side === 'buy' ? 'prev' : 'next']()) !== null && levels.length < depth)
      levels.push({
        price: item.price,
        size: _.reduce(item.orders, (sum, lo) => sum.add(lo.size), num(0))
      });
    return levels;
  }
  prepareOrderBookTransmission(depth) {
    const asks = this._getTree('ask').iterator();
    const bids = this._getTree('buy').iterator();

    const ordersBids = [];
    while(ordersBids.length < depth && this._bids.size > ordersBids.length) {
      const levelOrders = bids.prev().orders;
      ordersBids.push(levelOrders);
    }
    const ordersAsks = [];
    while(ordersAsks.length < depth  && this._asks.size > ordersAsks.length) {
      const levelOrders = asks.next().orders;
      ordersAsks.push(levelOrders);
    }

    return {
      bids: _.map(_.flatten(ordersBids), order =>
        [order.price, order.size, order.id]
      ),
      asks: _.map(_.flatten(ordersAsks), order =>
        [order.price, order.size, order.id]
      )
    };
  }
};
