import IPCClientProcess from '../../lib/IPCClientProcess';
import Source from '../../lib/Source';
import _ from 'lodash';
import sharedTicker from '../../lib/sharedTicker';

// we subscribe to heartbeat so we get heartbeat every sec

export default class XX extends Source {
  DISABLE_COMPARAISON_CHECK = true;

  constructor(base, quote, level) {
    const id = `coinbase-shared-ws-${base}-${quote}-${level}`;

    super(
      id,
      sharedTicker
    );

    this.ipcClient = new IPCClientProcess(id);

    this.ipcClient.on('message', (msg) => {
      if (msg.closed) {
        this.subscribed = false;
        this.lag(true);
        return;
      }

      let isNotSubscribed = false;
      if (msg.data && msg.data.type === 'subscriptions') {
        const heartbeatChannel = _.find(
          msg.data.channels,
          channel => channel.name === 'heartbeat'
        );

        isNotSubscribed = !(!!heartbeatChannel && !!_.find(
          heartbeatChannel.product_ids,
          pId => pId === `${base}-${quote}`
        ));
      }

      if (
        msg.open ||
        (isNotSubscribed && !this.subscribed)
      ) {
        this.subscribed = true; // obligé detre instantanné car snapshot est balancé direct
        // avant le message subsriptions de confirmation
        this.ipcClient.command('subscribe');
        return;
      }

      if (this.subscribed && msg.data && msg.data.type !== 'subscriptions') {
        this.lag(false);
        msg.data.timedrift = Date.now() - (new Date(msg.data.time)).getTime();
        this.write(msg.data);
        sharedTicker.tick();
      }
    });

    this.ipcClient.on('connect', () => {
      // because if it was already subscribed we need to unsubscribed
      this.subscribed = false;
      this.ipcClient.command('unsubscribe');
    });
    this.ipcClient.on('disconnect', () => {
      this.lag(true);
      this.subscribed = false;
    });
  }

  close() {
    this.lag(true);
    this.subscribed = false;
    this.ipcClient.command('unsubscribe');
  }

  name() {
    return 'xx';
  }
};
