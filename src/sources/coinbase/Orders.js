import OrdersBase from '../../lib/sources/Orders';
import Trade from '../../models/Trade';
import num from 'num';
import client from './client';
import uuid from 'uuid';
import _ from 'lodash';

const fieldMap = {
  MsgType: '35',
  ExecType: '150',
  ClOrdID: '11',
  OrderID: '37',
  Price: '44',
  LastShares: '32',
  TradeID: '1003',
  AggressorIndicator: '1057'
};

export default class Orders extends OrdersBase {
  constructor(base, quote, executor) {
    super(executor);

    this.base = base;
    this.quote = quote;
  }

  onMessage(message) {
    switch(message[fieldMap.MsgType]) {
      case '8':
        switch(message[fieldMap.ExecType]) {
          case '0':
            this.confirmAddOrder(message[fieldMap.ClOrdID], message[fieldMap.OrderID]);
            break;
          case '4':
            // cancel
            this.confirmRemoveOrder(message[fieldMap.OrderID]);
            break;
          case '1':
            // trade
            console.log(message);
            this.reportTrade(message[fieldMap.OrderID], new Trade({
              id: message[fieldMap.TradeID],
              price: num(message[fieldMap.Price]),
              taker: message[fieldMap.AggressorIndicator] === 'Y',
              $size: num(message[fieldMap.LastShares]),
              ts: Date.now()
            }));
            break;
          case '3':
            // order over
            this.orderOver(message[fieldMap.OrderID]);
            break;
          case '8':
            // rejected
            this.failedAddOrder(message[fieldMap.ClOrdID]);
            break;
        }
        break;
      case '9':
        console.log('fail');
        this.failedRemoveOrder(message[fieldMap.OrderID]);
        break;
    }
  }

  removeAllOrders(syncCallback) {
    client.getOrders({
      'product_id': `${this.base}-${this.quote}`
    }, (err, r, data) => {
      console.log('data', data);

      if (!data || !data.slice)
        err = err || 'no data';

      if (err)
        return syncCallback(err);

      _.each(data, (order) => {
        this.executor.cancel({
          id: order.id,
          symbol: order.product_id,
          fixIndex: null
        });
      });

      setTimeout(
        () => client.getOrders({
          'product_id': `${this.base}-${this.quote}`
        }, (err, r, data) => {
          console.log('data2', data);
          if (!data || !data.slice || data.length)
            err = err || 'no data 2';

          if (err)
            return syncCallback(err);

          syncCallback(null, []);
        }),
        100
      );
    });
  }

  getSymbol(order) {
    return `${order.base}-${order.quote}`;
  }

  getClientId() {
    return uuid.v4();
  }
};
