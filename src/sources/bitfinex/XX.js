import WS from './WS';

// heartbeat sent by server every 5 sec

const mapLevelChannel = {
  level2: {
    channel: 'book',
    prec: 'P0',
    freq: 'F0',
    LENGTH: '25'
  },
  level1: {
    channel: 'book',
    prec: 'P0',
    freq: 'F0',
    LENGTH: '1'
  },
  ticker: {
    channel: 'ticker'
  }
};

export default class XX extends WS {
  constructor(base, quote, level) {
    super();

    //level1, level2, ticker
    this.base = base;
    this.quote = quote;
    this.level = level;
  }

  onOpen() {
    super.onOpen();

    this.send({
      event: 'subscribe',
      symbol: `${this.base}${this.quote}`,
      ...mapLevelChannel[this.level]
    });
  }

  onMessage(data) {
    data = super.onMessage(data);

    if (!data)
      return;

    this.lag(false);

    data.timedrift = -1;

    this.write(data);

    this.makeTick();
  }
};
