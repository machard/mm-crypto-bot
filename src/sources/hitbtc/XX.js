import WS from './WS';

// we send heartbeat message creating a response every 5 sec

const mapLevelChannel = {
  level2: {
    method: 'subscribeOrderbook'
  }
};

export default class XX extends WS {
  constructor(base, quote, level) {
    super();

    // level2
    this.base = base;
    this.quote = quote;
    this.level = level;
  }

  onOpen() {
    super.onOpen();

    this.send({
      params: {
        symbol: `${this.base}${this.quote}`
      },
      id: this.getReqId(),
      ...mapLevelChannel[this.level]
    });
  }

  onMessage(data) {
    this.lag(false);

    data.timedrift = -1;

    this.write(data);

    this.makeTick();
  }
};
