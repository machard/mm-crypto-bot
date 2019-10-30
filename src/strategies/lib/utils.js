import num from 'num';

export const getTopPrices = (conf, book, orders) => {
  const bookInfos = {
    bids: book.levels('buy', 2),
    asks: book.levels('ask', 2)
  };
  const ordersAtMinAsk = orders.byPrice.get(parseFloat(bookInfos.asks[0].price));
  const ordersAtMaxBid = orders.byPrice.get(parseFloat(bookInfos.bids[0].price));

  let topPriceSell = bookInfos.asks[0].price.sub(conf.priceIncrement);

  if (ordersAtMinAsk && ordersAtMinAsk.count()) {
    const sizeAtMinAsk = ordersAtMinAsk.reduce(
      (sum, order) => sum.add(order.$size.sub(order.filled_size)),
      num(0)
    );
    if (sizeAtMinAsk.gte(bookInfos.asks[0].size))
      topPriceSell = bookInfos.asks[1].price.sub(conf.priceIncrement);
    else
      topPriceSell = bookInfos.asks[0].price;
  }

  if (topPriceSell.eq(bookInfos.bids[0].price))
    topPriceSell = topPriceSell.add(conf.priceIncrement);


  let topPriceBuy = bookInfos.bids[0].price.add(conf.priceIncrement);

  if (ordersAtMaxBid && ordersAtMaxBid.count()) {
    const sizeAtMaxBid = ordersAtMaxBid.reduce(
      (sum, order) => sum.add(order.$size.sub(order.filled_size)),
      num(0)
    );
    if (sizeAtMaxBid.gte(bookInfos.bids[0].size))
      topPriceBuy = bookInfos.bids[1].price.add(conf.priceIncrement);
    else
      topPriceBuy = bookInfos.bids[0].price;
  }

  if (topPriceBuy.eq(bookInfos.asks[0].price))
    topPriceBuy = topPriceBuy.sub(conf.priceIncrement);


  return { topPriceBuy, topPriceSell };
};

export const updateWishToMarket = (wish, conf, { topPriceBuy, topPriceSell }) => {
  const makerPrice = wish.price.mul(
    1 + (parseFloat(conf.makerFee) * (wish.side === 'sell' ? 1 : -1))
  ).set_precision(conf.priceIncrement._precision);
  const takerPrice = wish.price.mul(
    1 + (parseFloat(conf.takerFee) * (wish.side === 'sell' ? 1 : -1))
  ).set_precision(conf.priceIncrement._precision);
  let price = makerPrice;
  let onTop = false;
  let canTake = false;
  if (wish.side === 'sell' && makerPrice.lte(topPriceSell)) {
    price = topPriceSell;
    onTop = true;
    canTake = takerPrice.lte(topPriceBuy);
  }
  if (wish.side === 'buy' && makerPrice.gte(topPriceBuy)) {
    price = topPriceBuy;
    onTop = true;
    canTake = takerPrice.gte(topPriceSell);
  }
  const maxEcart = (topPriceBuy.add(topPriceSell).div(2)).mul(conf.visibleDepth);
  const minAskEcart = price.sub(topPriceSell).abs();
  const maxBidEcart = price.sub(topPriceBuy).abs();

  const outbound = maxBidEcart.gt(maxEcart) && minAskEcart.gt(maxEcart);

  return {
    ...wish,
    price,
    takerPrice,
    onTop,
    outbound,
    canTake
  };
};

export const convertPrice = (price, fx, convert) =>
  convert.precision ?
    num(price) .set_precision(convert.precision).div(fx) :
    price.mul(fx)
;
