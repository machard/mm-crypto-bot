import CachedBatchedZippedStream from '../../lib/CachedBatchedZippedStream';


export default class Algo extends CachedBatchedZippedStream {
  DISABLE_COMPARAISON_CHECK = true;

  constructor(base, quote, conf, balance, balanceMaker, pairInvestment) {
    super('algo:arnaud', [
      conf,
      balance,
      balanceMaker,
      pairInvestment
    ]);

    this.base = base;
    this.quote = quote;
  }

  processMessage([
    conf,
    balance,
    balanceMaker,
    pairInvestment
  ]) {
    const expectedBalance = pairInvestment.sub(balanceMaker);

    return {
      buy: {
        $size: expectedBalance.sub(balance),
        side: 'buy',
        opts: {
          demiPairInvestment: parseFloat(pairInvestment) / 2,
          minSize: conf.minSize
        },
        base: this.base,
        quote: this.quote,
        tag: 'buy'
      },
      sell: {
        $size: balance.sub(expectedBalance),
        side: 'sell',
        opts: {
          demiPairInvestment: parseFloat(pairInvestment) / 2,
          minSize: conf.minSize
        },
        base: this.base,
        quote: this.quote,
        tag: 'sell'
      }
    };
  }

};
