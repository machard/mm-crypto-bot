import _ from 'lodash';
import Source from './Source';
var syncDebug = require('debug')('sync');

export default class SyncedTransformedStream extends Source {
  synced = false;
  syncing = 0;
  sync = 0;
  queue = [];

  constructor(name, source) {
    super(name, source.getTicker());

    this.source = source;
    this.executionReport.addKey('sync-error');

    if (!source.isLagging())
      this.syncFn();

    source.onLag(() => this.unsync());

    source.onUnlag(() => {
      this.syncFn();
    });

    source.get().each((data) => {
      if (!this.synced) {
        this.queue.push(data);
        return;
      }

      this.state = this.processMessage(this.state, data);

      this.write(this.state);
    });
  }

  unsync() {
    if (!this.synced)
      return;

    syncDebug('unsync', this.__debug_name);

    this.queue = [];
    this.synced = false;
    this.sync = this.syncing;
    if (this.cleanExtraState)
      this.cleanExtraState();
    this.lag(true);
  }

  resync() {
    this.unsync();

    this.syncFn();
  }

  syncFn() {
    if (this.syncing > this.sync)
      return;
    this.syncing += 1;

    var _sync = () => {
      var timeoutTO = setTimeout(() => {
        timeoutTO = 'done';
        this.debug('sync timeout');
        syncDebug('sync timeout', this.__debug_name);
        _sync();
      }, 10000);

      this.getSyncData((err, data) => {
        if (timeoutTO !== 'done')
          clearTimeout(timeoutTO);
        else
          return;

        // il y a eu un nouveau lag entre temps
        if (this.syncing <= this.sync) {
          syncDebug('syncing mismatch', this.__debug_name);
          return;
        }

        if (err) {
          this.debug('sync error', err);
          syncDebug('sync error', this.__debug_name, err);
          this.executionReport.increment('sync-error');
          return setTimeout(() => _sync(), 1000);
        }

        syncDebug('getting sync state');

        this.state = this.getSyncState(data);

        _.each(this.getReplayDatas(this.state, this.queue, data), (data) =>
          this.state = this.processMessage(this.state, data)
        );

        this.queue = [];
        this.synced = true;

        this.lag(false);

        this.debug('sync');
        syncDebug('sync', this.__debug_name);
        this.ee.emit('sync', data, this.state);
        this.write(this.state);
      });
    };

    syncDebug('syncing', this.__debug_name);
    this.debug('syncing');
    _sync();
  }

  getState() {
    return this.state;
  }

  setState(state, write = true) {
    this.state = state;
    if (write)
      this.write(state);
  }

  onSync(handler) {
    return this.ee.addListener('sync', handler);
  }

}
