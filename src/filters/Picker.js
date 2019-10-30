import _ from 'lodash';
import TransformedStream from '../lib/TransformedStream';

export default class Picker extends TransformedStream {

  constructor(source, ppte) {
    super(`filters:picker:${source.name()}:${ppte}`, source);

    this.source = source;

    this.ppte = ppte;
  }

  name() {
    return this.source.name();
  }

  processMessage(data) {
    return _.get(data, this.ppte);
  }
};
