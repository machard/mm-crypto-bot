/*import WS from './WS';
import crypto from 'crypto';
import { BF_API_KEY, BF_API_SECRET } from './constants';

export default class FIX extends WS {
  constructor(base, quote, level) {
    super();

    //level1, level2, ticker
    this.base = base;
    this.quote = quote;
    this.level = level;
  }

  onOpen() {
    super.onOpen();

    const apiKey = BF_API_KEY;
    const apiSecret = BF_API_SECRET;

    const authNonce = Date.now() * 1000;
    const authPayload = 'AUTH' + authNonce;
    const authSig = crypto
      .HmacSHA384(authPayload, apiSecret)
      .toString(crypto.enc.Hex);

    this.send({
      event: 'auth',
      apiKey,
      authSig,
      authNonce: authNonce,
      authPayload,
      filter: [
        `trading-t${this.base}${this.quote}`,
        'notify'
      ]
    });
  }

  onMessage(data) {
    data = super.onMessage(data);

    if (!data)
      return;

    this.lag(false);

    this.write(data);

    this.makeTick();
  }

  buy(order) {
    this.send([
      0,
      'on',
      null,
      {
        cid: order.id,

        type: 'EXCHANGE LIMIT',
        amount: opts.size, // neg or pos for side
        price: opts.price,
        flags: opts.timeInForce === 'P' ? 4096 : 0,
        symbol: this.symbol,
      }
    ]);
  }

  sell(order) {
    this.send([
      0,
      'on',
      null,
      {
        cid: order.id,

        type: 'EXCHANGE LIMIT',
        amount: opts.size.neg(), // neg or pos for side
        price: opts.price,
        flags: opts.timeInForce === 'P' ? 4096 : 0,
        symbol: this.symbol,
      }
    ]);
  }

  cancel(order) {
    this.send([
      0,
      'oc',
      null,
      { id: order.id }
    ]);
  }

  reset() {
    this.close();
  }
};
*/