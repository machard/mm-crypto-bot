import _ from 'lodash';
import Source from './Source';

// merge des sources safe
export default class MergedSource extends Source {
  constructor(name, ...sources) {
    sources = _.flatten(sources);

    super(name, _.map(sources, source => source.getTicker()));

    this.sources = sources;

    this.lag(_.some(this.sources, source => source.isLagging()));

    _.each(this.sources, source => {
      source.onLag(() => this.lag(true));
      source.onUnlag(() => {
        this.lag(_.some(this.sources, source => source.isLagging()));
      });

      source.get().each((v) => {
        this.write(v);
      });
    });
  }

}
