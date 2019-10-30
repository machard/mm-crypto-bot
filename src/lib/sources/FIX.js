import tls from 'tls';
import _ from 'lodash';
import fixFactory from 'fixjs';
import num from 'num';
import Source from '../../lib/Source';
const fix = fixFactory('42');
import sharedTicker from '../../lib/sharedTicker';

export default class FIX extends Source {
  static Msgs = fix.Msgs;

  DISABLE_COMPARAISON_CHECK = true;

  constructor(opts) {
    super('fix', sharedTicker);

    _.each(
      ['error', 'close', 'session-error', 'session-end', 'client-error', 'reject'],
      key => this.getExecutionReport().addKey(key)
    );

    this.opts = opts;

    this.connect();
  }

  connect() {
    if (this.connecting || this.connected || this.logoned || this.opened)
      return;
    this.connecting = true;

    const socket = tls.connect({
      port: 4198,
      host: this.opts.host,
      rejectUnauthorized: false
    });

    socket.on('error', (err) => {
      console.log('fix socket error', err);
      this.executionReport.increment('error');
    });

    socket.on('close', () => {
      console.log('fix socket close');
      this.executionReport.increment('close');
      this.lag(true);
      this.logoned = false;
      this.connected = false;
      this.connecting = false;
      this.opened = false;
      this.connect();
    });

    socket.on('secureConnect', (data) => {
      this.debug('fix socket opened');
      this.connecting = false;
      this.connected = socket;

      const client = fix.createClient(socket);
      client.on('error', (err) => {
        console.log('fix client error', err);
        this.executionReport.increment('client-error');
      });
      this.opened = client;

      this.openSession(this.connected, this.opened);
    });
  }

  openSession(socket, client) {
    if (socket !== this.connected || client !== this.opened || this.logoned)
      return;

    const session = client.session(
      this.opts['sender_comp_id'],
      this.opts['target_comp_id'],
      (msg) => this.opts.beforeSend(session, msg)
    );

    session.on('logon', (data) => {
      this.debug('fix session logon');
      this.logoned = session;
    });

    session.on('error', (error) => {
      this.debug('fix session error', error);
      this.executionReport.increment('session-error');
    });

    session.on('end', () => {
      this.debug('fix session end');
      this.executionReport.increment('session-end');
      this.logoned = false;
      socket.destroy();
    });

    session.on('message', (message, callback) => {
      this.lag(false);

      if (message.MsgType === '3') {
        this.getExecutionReport().increment('reject');
        console.log(message);
        this.reset();
      }

      this.write(message._fields);

      sharedTicker.tick();

      callback();
    });

    session.logon(this.opts.logon);
  }

  reset() {
    if (!this.logoned)
      return;

    this.logoned.logout();
  }

  send(msg) {
    if (!this.logoned)
      return;

    this.logoned.send(msg);
  }

  _makeOrder(order) {
    var fixOrder = new fix.Msgs.NewOrderSingle();

    fixOrder.HandlInst = 1;
    fixOrder.ClOrdID = order.id;
    fixOrder.Symbol = order.symbol;
    if (order.price && num(order.price).gt(0))
      fixOrder.Price = order.price.toString();
    fixOrder.OrderQty = order.$size.toString();
    fixOrder.OrdType = order.options.type;
    if (order.options.timeInForce)
      fixOrder.TimeInForce = order.options.timeInForce;

    return fixOrder;
  }

  buy(order) {
    const fixOrder = this._makeOrder(order);
    fixOrder.Side = 1;

    this.send(fixOrder);
  }

  sell(order) {
    const fixOrder = this._makeOrder(order);
    fixOrder.Side = 2;

    this.send(fixOrder);
  }

  cancel(order) {
    var cancel = new fix.Msgs.OrderCancelRequest();
    cancel.OrderID = order.id;
    cancel.Symbol = order.symbol;

    this.send(cancel);
  }
};
