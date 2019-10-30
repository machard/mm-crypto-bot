import SyncedTransformedStream from '../../lib/SyncedTransformedStream';
import { Map, Record } from 'immutable';
import Source from '../../lib/Source';

export default class Orders extends SyncedTransformedStream {
  constructor(executor) {
    super('orders', executor);

    this.executor = executor;

    this.tradeSeq = 0;
    this.tradeSource = new Source('trades', executor.getTicker());
    this.tradeSource.lag(this.isLagging());
    this.onUnlag(
      () => this.tradeSource.lag(false)
    );
    this.onLag(
      () => this.tradeSource.lag(true)
    );

    this.executionReport.addKey('addOrder');
    this.executionReport.addKey('confirmAddOrder');
    this.executionReport.addKey('failedAddOrder');
    this.executionReport.addKey('removeOrder');
    this.executionReport.addKey('confirmRemoveOrder');
    this.executionReport.addKey('failedRemoveOrder');
    this.executionReport.addKey('orderOver');
    this.executionReport.addKey('reportTrade');
  }

  name() {
    return 'orders';
  }

  getTradeSource() {
    return this.tradeSource;
  }

  getSyncData(syncCallback) {
    if (process.env.DISABLE_ORDER_SYNC)
      return syncCallback(null);

    this.removeAllOrders(syncCallback);
  }
  getSyncState() {
    return new Record({
      adding: new Map({}),
      deleting: new Map({}),
      ready: new Map({}),
      byTag: new Map({}),
      byPrice: new Map({})
    })();
  }
  getReplayDatas() {
    return []; // no need to relay any messages as we canceled everything, we start fresh
  }

  processMessage(state, message) {
    if (message.rateLimit) {
      if (state.getIn(['adding', message.rateLimit.id]))
        this.failedAddOrder(message.rateLimit.id);
      if (state.getIn(['deleting', message.rateLimit.id]))
        this.failedRemoveOrder(message.rateLimit.id);
    } else if (message.fixIndex) {
      const order = state.getIn(['adding', message.fixIndex.id]);
      this.setState(
        state.setIn(
          ['adding', message.fixIndex.id],
          order.set('fixIndex', message.index)
        )
      );
    } else
      this.onMessage(message);

    return this.getState();
  }

  /// ACTIONS

  cancelAllOrders() {
    this.resync();
  }

  passOrder(order) {
    order = order
      .set('symbol', this.getSymbol(order))
      .set('id', this.getClientId(order));
    this.executor[order.side](order);
    this.addOrder(order);
  }

  cancelOrder(id) {
    if (!this.getState().getIn(['ready', id]))
      return;

    this.executor.cancel(this.getState().getIn(['ready', id]));
    this.removeOrder(id);
  }

  // OK
  addOrder(order) {
    this.executionReport.increment('addOrder');

    const tag = order.tag;
    const price = parseFloat(order.price);
    const id = order.id;

    this.setState(this.getState()
      .setIn(['adding', id], order)
      .setIn(['byTag', tag, id], order)
      .setIn(['byPrice', price, id], order)
    );
  }

  // OK
  confirmAddOrder(clientId, orderId) {
    this.executionReport.increment('confirmAddOrder');

    let order = this.getState().getIn(['adding', clientId]);

    order = order
      .set('id', orderId)
      .set('receivedAt', Date.now());

    const tag = order.tag;
    const price = parseFloat(order.price);
    const id = order.id;

    let newState = this.getState()
      .deleteIn(['adding', clientId])
      .deleteIn(['byTag', tag, clientId])
      .deleteIn(['byPrice', price, clientId])

      .setIn(['ready', id], order)
      .setIn(['byTag', tag, id], order)
      .setIn(['byPrice', price, id], order)
    ;

    if (!newState.getIn(['byPrice', price]).count())
      newState = newState.deleteIn(['byPrice', price]);

    this.setState(newState);
  }

  // OK
  failedAddOrder(clientId) {
    this.executionReport.increment('failedAddOrder');

    const order = this.getState().getIn(['adding', clientId]);

    const tag = order.tag;
    const price = parseFloat(order.price);
    const id = order.id;

    let newState = this.getState()
      .deleteIn(['adding', id])
      .deleteIn(['byTag', tag, id])
      .deleteIn(['byPrice', price, id])
    ;

    if (!newState.getIn(['byPrice', price]).count())
      newState = newState.deleteIn(['byPrice', price]);

    this.setState(newState);
  }

  //OK
  removeOrder(orderId) {
    this.executionReport.increment('removeOrder');

    let order = this.getState().getIn(['ready', orderId]);

    const tag = order.tag;
    const price = parseFloat(order.price);
    const id = order.id;

    this.setState(this.getState()
      .deleteIn(['ready', id])
      .deleteIn(['byTag', tag, id])
      .deleteIn(['byPrice', price, id])

      .setIn(['deleting', id], order)
      .setIn(['byTag', tag, id], order)
      .setIn(['byPrice', price, id], order)
    );
  }

  // OK
  confirmRemoveOrder(orderId) {
    this.executionReport.increment('confirmRemoveOrder');

    this.orderOver(orderId);
  }

  orderOver(orderId) {
    this.executionReport.increment('orderOver');

    let order = this.getState().getIn(['ready', orderId]) ||
      this.getState().getIn(['deleting', orderId]);

    // weird. so far happened only on blinktrade
    if (!order)
      return;

    const tag = order.tag;
    const price = parseFloat(order.price);
    const id = order.id;

    let newState = this.getState()
      .deleteIn(['byTag', tag, id])
      .deleteIn(['byPrice', price, id]);

    if (!newState.getIn(['byPrice', price]).count())
      newState = newState.deleteIn(['byPrice', price]);

    if (this.getState().getIn(['deleting', id]))
      newState = newState
        .deleteIn(['deleting', id]);
    else
      newState = newState
        .deleteIn(['ready', id]);

    this.setState(newState);
  }

  failedRemoveOrder(orderId) {
    this.executionReport.increment('failedRemoveOrder');

    let order = this.getState().getIn(['deleting', orderId]);

    // peut etre on a recu un order over avant
    if (!order)
      return;

    const tag = order.tag;
    const price = parseFloat(order.price);
    const id = order.id;

    this.setState(this.getState()
      .deleteIn(['deleting', id])
      .deleteIn(['byTag', tag, id])
      .deleteIn(['byPrice', price, id])

      .setIn(['ready', id], order)
      .setIn(['byTag', tag, id], order)
      .setIn(['byPrice', price, id], order)
    );
  }

  reportTrade(orderId, trade) {
    this.executionReport.increment('reportTrade');

    let order = this.getState().getIn(['ready', orderId]) ||
      this.getState().getIn(['deleting', orderId]); // un delete a peu etre ete demandé

    order = order.set('filled_size', order['filled_size'].add(trade.$size));

    const tag = order.tag;
    const price = parseFloat(order.price);
    const id = order.id;

    let newState = this.getState()
      .setIn(['byTag', tag, id], order)
      .setIn(['byPrice', price, id], order);

    if (this.getState().getIn(['ready', id]))
      newState = newState
        .setIn(['ready', id], order);
    else
      newState = newState
        .setIn(['deleting', id], order);

    this.setState(newState);

    this.tradeSeq += 1;
    this.tradeSource.write(
      trade
        .set('side', order.side)
        .set('seq', this.tradeSeq)
        .set('opts', order.opts)
        .set('base', order.base)
        .set('quote', order.quote)
    );
  }

};
