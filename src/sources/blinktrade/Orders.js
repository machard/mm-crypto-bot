import OrdersBase from '../../lib/sources/Orders';
import Trade from '../../models/Trade';
import num from 'num';
import uuid from 'uuid';
import _ from 'lodash';
import Promise from 'bluebird';
import client from './client';

export default class Orders extends OrdersBase {
  constructor(base, quote, executor) {
    super(executor);

    this.base = base;
    this.quote = quote;
  }

  onMessage(message) {
    switch(message.MsgType) {
      case '8':
        switch(message.ExecType) {
          case '0':
            this.confirmAddOrder(message.ClOrdID, message.OrderID);
            break;
          case '4':
            // cancel
            this.confirmRemoveOrder(message.OrderID);
            break;
          case '1':
          case '2':
            // trade
            console.log(message);
            this.reportTrade(message.OrderID, new Trade({
              id: message.ExecID,
              price: num(message.LastPx  / 1e8),
              // todo : support taker orders
              taker: message.ExecSide === message.Side,
              $size: num(message.LastShares  / 1e8),
              ts: Date.now()
            }));

            if (num(message.LeavesQty).eq(0))
              this.orderOver(message.OrderID);
            break;
          case '8':
            // rejected
            this.failedAddOrder(message.ClOrdID);
            break;
        }
        break;
      case '9':
        this.failedRemoveOrder(message.OrderID);
        break;
    }
  }

  removeAllOrders(syncCallback) {
    const pClient = Promise.promisify(client);

    pClient('myOrders', [
      { filter: ['has_leaves_qty eq 1'] }
    ])
      .then(
        (res) => Promise.all(_.map(res[0].OrdListGrp, ({ OrderID }) =>
          pClient('cancelOrder', [{ orderId: OrderID }])
        ))
      )
      .then(
        () => syncCallback(),
        err => syncCallback(err)
      );
  }

  getSymbol(order) {
    return `${order.base}${order.quote}`;
  }

  getClientId() {
    return uuid.v4();
  }
};
