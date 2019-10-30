import WS from './WS';

// we send heartbeat message creating a response every 5 sec

const mapLevelChannel = {
  level2: {
    MarketDepth: '0',
    MDUpdateType: '1',
    MDEntryTypes: ['0', '1']
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
      MsgType: 'V',
      MDReqID: this.getReqId(),
      SubscriptionRequestType: '1',
      Instruments: [`${this.base}${this.quote}`],
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
