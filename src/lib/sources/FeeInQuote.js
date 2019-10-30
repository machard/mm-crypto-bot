import Extend from '../Extend';

export default class FeeInQuote extends Extend {
  constructor(trades, feeInfos) {
    super(
      trades,
      feeInfos,
      ([ trade, feeInfos ]) => {
        const fee = trade.taker ? feeInfos.takerFee : feeInfos.makerFee;
        return trade
          .set('fee', fee)
          .set('feeCurrency', trade.quote)
          .set('feeValue', trade.$size.mul(trade.price).mul(fee));
      }
    );
  }
};
