import WS from './WS';
import crypto from 'crypto-js';
import { BF_API_KEY, BF_API_SECRET } from './constants';

export default class AuthWS extends WS {
  constructor(filter) {
    super();

    this.filter = filter;
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
      filter: this.filter
    });
  }
};
