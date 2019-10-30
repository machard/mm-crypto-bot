import _ from 'lodash';
import Source from '../lib/Source';

export default class Extend extends Source {
  wantToWrite = [];
  lastSlow = null;

  constructor(quick, slow, fn = v => v) {

    super('extend', [quick.getTicker(), slow.getTicker()]);

    this.fn = fn;
    this.lag(_.some([quick, slow], source => source.isLagging()));

    _.each([quick, slow], (source, i) => {
      source.onLag(() => {
        this.lag(true);

        if (source === quick)
          this.wantToWrite = [];
        if (source === slow)
          this.lastSlow = null;
      });

      source.onUnlag(() => {
        this.lag(_.some([quick, slow], source => source.isLagging()));
      });

      source.get().each((v) => {
        if (source === quick)
          this.wantToWrite.push(v);
        if (source === slow)
          this.lastSlow = v;
      });
    });
  }

  processTick() {
    var freeToWrite = this.wantToWrite.length && this.lastSlow;

    if (freeToWrite) {
      const toWrite = this.wantToWrite;
      this.wantToWrite = [];
      while (toWrite.length)
        this.write(this.fn(
          [toWrite.shift(), this.lastSlow]
        ));
    }

    super.processTick();
  }

}
