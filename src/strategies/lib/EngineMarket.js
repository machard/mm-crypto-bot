import _ from 'lodash';
import CachedBatchedZippedStream from '../../lib/CachedBatchedZippedStream';
import Order from '../../models/Order';

export default class EngineMarket extends CachedBatchedZippedStream {
  constructor(name, conf, ordersManager, wishes) {
    super(name, [conf, wishes, ordersManager]);
    this.ordersManager = ordersManager;
  }

  processMessage([conf, wishes, orders]) {
    if (
      conf.waitForAllReady &&
      conf.waitForAllReady.gt(0) &&
      (orders.adding.count() || orders.deleting.count() || orders.ready.count())
    )
      return { waiting: orders.adding.count() + orders.deleting.count() };
    if (conf.isPaused && conf.isPaused.gt(0))
      return { isPaused: 1 };

    _.each(wishes, (wish, tag) => {
      if (
        wish.$size.lt(conf.minSize)
      )
        return;

      this.ordersManager.passOrder(new Order({
        $size: wish.$size,
        side: wish.side,
        tag: wish.tag,
        base: wish.base,
        quote: wish.quote,
        options: {
          type: 1
        },
        //
        opts: wish.opts || {}
        //
      }));
    });

    return { waiting: 0 };
  }
};
