import _ from 'lodash';
import { Map } from 'immutable';
import CachedBatchedZippedStream from '../../lib/CachedBatchedZippedStream';
import Order from '../../models/Order';
import { getTopPrices, updateWishToMarket } from './utils';

export default class Engine extends CachedBatchedZippedStream {
  constructor(name, conf, ordersManager, book, wishes) {
    super(name, [conf, wishes, book, ordersManager]);
    this.ordersManager = ordersManager;

    this.onUnlag(() => {
      this.onBlockedInterval = setInterval(() => {
        if (Date.now() - this.lastRun >= 5000) {
          console.log('blocked');
          ordersManager.cancelAllOrders();
        }
      }, 5000);
    });

    this.onLag(() => {
      clearInterval(this.onBlockedInterval);
      ordersManager.cancelAllOrders();
    });
  }

  processMessage([conf, wishes, book, orders]) {
    if (
      conf.waitForAllReady &&
      conf.waitForAllReady.gt(0) &&
      (orders.adding.count() || orders.deleting.count())
    )
      return { waiting: orders.adding.count() + orders.deleting.count() };

    this.lastRun = Date.now();

    if (conf.isPaused && conf.isPaused.gt(0))
      return { isPaused: 1 };

    const topPrices = getTopPrices(conf, book, orders);

    _.each(wishes, (wish, tag) => {

      wish = updateWishToMarket(wish, conf, topPrices);
      const tagOrders = (orders.byTag.get(tag) || new Map({}));

      tagOrders.forEach(order => {
        if (
          !order.price.eq(wish.price) &&
          (
            (Date.now() - order.receivedAt) >= (1000 + _.random(0, 3000)) ||
            wish.onTop ||
            order.price.sub(wish.price).abs().gt(wish.emergency) ||
            wish.outbound
          )
        )
          this.ordersManager.cancelOrder(order.id);

        wish.$size = wish.$size.sub(order.$size.sub(order.filled_size));
      });

      if (wish.$size.lt(0))
        return tagOrders.forEach(order =>
          this.ordersManager.cancelOrder(order.id)
        );

      if (
        wish.$size.lt(conf.minSize) ||
        wish.outbound
      )
        return;

      const order = new Order({
        $size: wish.$size,
        side: wish.side,
        tag: wish.tag,
        base: wish.base,
        quote: wish.quote,
        //
        opts: wish.opts || {}
        //
      });

      if (
        conf.isTakeOrderEnabled && conf.isTakeOrderEnabled.gt(0) &&
        wish.canTake &&
        !orders.ready.count(order => order.options.timeInForce === '1')
      )
        this.ordersManager.passOrder(order
          .set('price', wish.takerPrice)
          .set('options', {
            type: 2,
            // si ce n'est plus un prix optimal apres ce sera de toute façon cancel et remis
            // comme ça si partial fill on a la possibilité de se retrouver premier
            timeInForce: '1'
          })
        );
      else
        this.ordersManager.passOrder(order
          .set('price', wish.price)
          .set('options', {
            type: 2,
            // post only
            timeInForce: 'P'
          })
        );
    });

    return { waiting: 0 };
  }
};
