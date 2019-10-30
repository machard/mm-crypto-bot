import Source from './Source';

export default class ProcessSource extends Source {
  constructor(name, ps, format, ticker, opts = { relayLag: true }) {
    super(`worker:${name}`, ticker);

    this.label = name;
    this.ps = ps;

    this.executionReport.addKey('message');
    this.executionReport.addKey('message-added-to-queue');
    this.executionReport.addKey('delay100');

    if (!ps.onMessage)
      ps.onMessage = (handler) => ps.on('message', handler);

    if (opts.noLag)
      this.lag(false);

    let delay = null;

    ps.onMessage(message => {
      this.debug('message from worker', message);
      this.executionReport.increment('message');

      if (message.lag) {
        if (!opts.relayLag)
          return;
        return this.lag(true);
      } else
        this.lag(false);

      // delay sera le meme pour tous les messages d'un batch, le delai
      // par rapport au premier message du batch, ie le plus grd delay
      // pour pas que ce soit influencé par les drop de message
      delay = delay || (Date.now() - message.time);

      if (delay >= 100)
        this.executionReport.increment('delay100');

      if (!opts.onlyWriteLast) {
        this.executionReport.increment('message-added-to-queue');
        this.write(format(message.data, delay));
      }

      clearImmediate(this.workerTo);
      this.workerTo = setImmediate(() => {
        if (opts.onlyWriteLast) {
          this.executionReport.increment('message-added-to-queue');
          this.write(format(message.data, delay));
        }
        delay = null;
        ticker.tick();
      });
    });
  }

  name() {
    return this.label;
  }
}
