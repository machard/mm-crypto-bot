import Source from './Source';

export default class TickSource extends Source {
  constructor(ticker, interval = 1000) {
    super('ticksource', ticker);

    this.i = 0;

    this.lag(false);

    const tick = () => {
      this.write({ping: this.i});
      this.i = this.i + 1;
      ticker.tick();
    };

    setInterval(tick, interval);

    tick();
  }

}
