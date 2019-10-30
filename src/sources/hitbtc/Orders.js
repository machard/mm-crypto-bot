import OrdersBase from '../../lib/sources/Orders';
import Trade from '../../models/Trade';
import num from 'num';
import uuid from 'uuid';
import async from 'async';
import client from './client';

export default class Orders extends OrdersBase {
  constructor(base, quote, executor) {
    super(executor);

    this.base = base;
    this.quote = quote;
  }

  onMessage(message) {
    if (message.method !== 'report')
      return;

    switch(message.params.reportType) {
      case 'new':
        this.confirmAddOrder(message.params.clientOrderId, message.params.clientOrderId);
        break;
      case 'canceled':
        // cancel
        this.confirmRemoveOrder(message.params.clientOrderId);
        break;
      case 'trade':
        // trade
        console.log(message);
        this.reportTrade(message.params.clientOrderId, new Trade({
          id: message.params.tradeId,
          price: num(message.params.tradePrice),
          taker: num(message.params.tradeFee).gt(0),
          $size: num(message.params.tradeQuantity),
          ts: Date.now()
        }));

        if (message.params.status === 'filled')
          this.orderOver(message.params.clientOrderId);
        break;
      case 'suspended':
        this.orderOver(message.params.clientOrderId);
        break;
    }
  }

  removeAllOrders(syncCallback) {
    async.waterfall([
      callback => client({
        command: 'order',
        method: 'GET',
        qs: {
          symbol: `${this.base}${this.quote}`
        },
        auth: true
      }, (err, data) => {
        if (!data || !data.slice)
          err = err || 'no data';

        callback(err, data);
      }),
      (orders, callback) => {
        client({
          command: 'order',
          method: 'DELETE',
          qs: {
            symbol: `${this.base}${this.quote}`
          },
          auth: true
        }, (err, data) => {
          if (err || !data || !data.slice || data.length !== orders.length)
            return callback(err || data || 'not all orders removed');
          callback(null, []);
        });
      }
    ], syncCallback);
  }

  getSymbol(order) {
    return `${order.base}${order.quote}`;
  }

  getClientId() {
    return uuid.v4().split('-').join('');
  }
};
