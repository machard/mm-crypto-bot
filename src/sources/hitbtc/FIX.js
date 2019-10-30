import WS from './WS';

const mapType = {
  1: 'market',
  2: 'limit'
};
const mapTimeInForce = {
  1: 'GTC',
  P: 'GTC'
};

export default class FIX extends WS {
  constructor(opts) {
    super();

    // level2
    this.opts = opts;

    this.getExecutionReport().addKey('error');
    this.getExecutionReport().addKey('cancel-fail');
  }

  onOpen() {
    super.onOpen();

    // authenticate
    this.send({
      method: 'login',
      params: {
        algo: 'BASIC',
        pKey: this.opts.user,
        sKey: this.opts.pass
      }
    });

    this.send({
      method: 'subscribeReports',
      params: {
        symbol: this.opts.productId // to check if this really work
      }
    });
  }

  onMessage(data) {
    this.lag(false);

    if (data.error) {
      console.log('hitbtc fix error', data);
      switch(data.error.code) {
        case 20002:
          this.getExecutionReport().increment('cancel-fail');
          break;
        default:
          this.getExecutionReport().increment('error');
          this.reset();
          break;
      }
    }

    this.write(data);

    this.makeTick();
  }

  _makeOrder(order) {
    var fixOrder = {};

    fixOrder.clientOrderId = order.id;
    fixOrder.symbol = order.symbol;
    if (order.price)
      fixOrder.price = order.price.toString();
    fixOrder.quantity = order.$size.toString();
    fixOrder.type = mapType[order.options.type];
    if (order.options.timeInForce)
      fixOrder.timeInForce = mapTimeInForce[order.options.timeInForce];

    return fixOrder;
  }

  buy(order) {
    const fixOrder = this._makeOrder(order);
    fixOrder.side = 'buy';

    this.send({
      method: 'newOrder',
      params: fixOrder
    });
  }

  sell(order) {
    const fixOrder = this._makeOrder(order);
    fixOrder.side = 'sell';

    this.send({
      method: 'newOrder',
      params: fixOrder
    });
  }

  cancel(order) {
    this.send({
      method: 'cancelOrder',
      params: {
        clientOrderId: order.id
      }
    });
  }

  reset() {
    this.close();
  }
};
