import Source from './Source';

export default class TransformedStream extends Source {
  constructor(name, source) {
    super(name, source.getTicker());

    if (!source.isLagging()) {
      this.state = this.getInitialState();
      this.lag(false);
      this.write(this.state);
    }

    source.onLag(() => {
      this.cleanExtraState();
      this.lag(true);
    });

    source.onUnlag(() => {
      this.state = this.getInitialState();
      this.lag(false);
      this.write(this.state);
    });

    source.get().each((data) => {
      this.state = this.processMessage(data);
      this.write(this.state);
    });
  }

  getInitialState() {
    return null;
  }
  cleanExtraState() {}

  getState() {
    return this.state;
  }

  setState(state, write = true) {
    this.state = state;
    if (write)
      this.write(state);
  }

}
