import WS from './WS';
import fingerprint from 'node-fingerprint';

const FINGERPRINT = fingerprint(process.pid);

export default class FIX extends WS {
  constructor(opts) {
    super();

    // level2
    this.opts = opts;
  }

  onOpen() {
    super.onOpen();

    // authenticate
    this.send({
      'MsgType': 'BE',
      'UserReqID': this.getReqId(),
      'BrokerID': this.opts.brokerId,
      'Username': this.opts.username,
      'Password': this.opts.password,
      'UserReqTyp': '1',
      'FingerPrint': FINGERPRINT
    });
  }

  onMessage(data) {
    this.lag(false);

    this.write(data);

    this.makeTick();
  }

  _makeOrder(order) {
    var fixOrder = {};

    fixOrder.MsgType = 'D';
    fixOrder.ClOrdID = order.id;
    fixOrder.Symbol = order.symbol;
    if (order.price)
      fixOrder.Price = parseInt(order.price.mul(1e8).toString(), 10);
    fixOrder.OrderQty = parseInt(order.$size.mul(1e8).toString(), 10);
    fixOrder.OrdType = order.options.type.toString();
    if (order.options.timeInForce === 'P')
      fixOrder.ExecInst = '6';
    fixOrder.BrokerID = this.opts.brokerId;
    fixOrder.FingerPrint = FINGERPRINT;

    return fixOrder;
  }

  buy(order) {
    const fixOrder = this._makeOrder(order);
    fixOrder.Side = '1';

    this.send(fixOrder);
  }

  sell(order) {
    const fixOrder = this._makeOrder(order);
    fixOrder.Side = '2';

    this.send(fixOrder);
  }

  cancel(order) {
    const cancel = {
      MsgType: 'F',
      OrderID: order.id,
      FingerPrint: FINGERPRINT
    };

    this.send(cancel);
  }

  reset() {
    this.close();
  }
};
