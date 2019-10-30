import _ from 'lodash';
import Source from './Source';

// zip etat par etat
// FAUT PAS METTRE UN REDUCER DERRIERE par contre car ça
// batch les events par tick
// et ça met le dernier event connu des sources qui ont pas emis dans le tick
export default class CachedBatchedZippedStream extends Source {
  history = {};
  wantToWrite = false;

  constructor(name, ...sources) {
    sources = _.flattenDeep(sources);

    if (sources.length === 1 && !(sources[0] instanceof Source))
      // object
      sources = sources[0];

    super(name, _.map(sources, source => source.getTicker()));
    this._name = name;
    this.sources = sources;

    this.lag(_.some(this.sources, source => source.isLagging()));

    _.each(this.sources, (source, i) => {
      source.onLag(() => {
        // une source qui lagge n'a plus de bonnes valeurs
        delete this.history[i];
        //
        this.lag(true);
      });

      source.onUnlag(() => {
        this.lag(_.some(this.sources, source => source.isLagging()));
      });

      source.get().each((v) => {
        this.history[i] = v;
        if (this.LIVE_DEBUG) {
          console.log(JSON.parse(JSON.stringify(this.history)));
          console.log('state', _.mapValues(this.sources, (source, j) => !!this.history[j]));
        }

        this.wantToWrite = true;
      });
    });
  }

  // habituellement overriden
  name() {
    return this._name;
  }

  // habituellement overriden
  processMessage(data) {
    this.write(data);
  }

  processTick() {
    var freeToWrite = !this.isLagging() && _.every(this.sources, (source, j) =>
      !!this.history[j]
    );

    if (this.wantToWrite && freeToWrite)
      this.write(
        this.processMessage(_.isArray(this.sources) ?
          _.map(this.sources, (source, i) => this.history[i]) : _.clone(this.history)
        )
      );

    this.wantToWrite = false;

    super.processTick();
  }

}
