import _ from 'lodash';
import num from 'num';
import regression from 'regression';

export const deltaMultiplierMap = (
  { levels, firstOrderSize, minSize },
  investValue,
  middle
) => {
  levels = parseInt(levels, 10);
  investValue = parseFloat(investValue);
  firstOrderSize = parseFloat(firstOrderSize || num(0)) || (investValue / levels);

  const levelSize = level => ((investValue - (firstOrderSize * levels)) / _.sum(_.range(0, levels))) * level + firstOrderSize;

  const orderSizesMap = _.map(
    _.range(0, levels),
    level => _.sum(_.map(_.range(0, level + 1), level => levelSize(level)))
  );

  return {
    map: _.flatten(_.map(_.range(0, levels), level =>
      ([
        {
          range: [middle.sub(orderSizesMap[level]), middle.sub(level ? orderSizesMap[level - 1] : 0)],
          delta: level,
          sign: 'up',
          level
        },
        {
          range: [middle.add(level ? orderSizesMap[level - 1] : 0), middle.add(orderSizesMap[level])],
          delta: -level,
          sign: 'down',
          level
        }
      ])
    )),
    params: {
      middle
    }
  };
};

export const algo = (
  base,
  quote,
  { fund, emergencyFactor, minSize, priceIncrement },
  ref,
  balanceRef,
  deltaMultiplierMap,
  ecarts
) => {
  const regPredict = (level) =>
    ref.mul(ecarts.reg.predict(level)[1]);
  const regOppositePredict = (level) =>
    ref.mul(ecarts.regOpposite.predict(level)[1]);

  return _.reduce(deltaMultiplierMap.map, (orders, {range, sign, level, delta}) => {
    const emergency = regPredict(level).sub(regOppositePredict(level)).mul(emergencyFactor);
    const deltaSize = range[1].sub(range[0]).abs();

    // buy side
    var buySize = num(0);
    if (balanceRef.lte(range[1]))
      if (range[0].gte(balanceRef))
        buySize = range[1].sub(range[0]);
      else
        buySize = range[1].sub(balanceRef);

    var buyPrice = sign === 'down' ?
      ref.sub(regPredict(level))
      : ref.add(regOppositePredict(level));

    //sell side
    var sellSize = num(0);
    if (balanceRef.gte(range[0]))
      if (range[1].lte(balanceRef))
        sellSize = range[1].sub(range[0]);
      else
        sellSize = balanceRef.sub(range[0]);


    var sellPrice = sign === 'up' ?
      ref.add(regPredict(level))
      : ref.sub(regOppositePredict(level));

    sellPrice = sellPrice.set_precision(priceIncrement._precision);
    buyPrice = buyPrice.set_precision(priceIncrement._precision);
    sellSize = sellSize.set_precision(minSize._precision);
    buySize = buySize.set_precision(minSize._precision);

    const opts = {
      middleBaseBalance: deltaMultiplierMap.params.middle,
      deltaMinSize: minSize,
      delta: delta,
      deltaSize: deltaSize
    };

    return {
      ...orders,
      [`buy-${sign}-${level}`]: {
        $size: buySize,
        price: buyPrice,
        side: 'buy',
        level,
        opts,
        sign,
        emergency,
        tag: `buy-${sign}-${level}`,
        base,
        quote
      },
      [`sell-${sign}-${level}`]: {
        $size: sellSize,
        price: sellPrice,
        side: 'sell',
        level,
        opts,
        sign,
        emergency,
        tag: `sell-${sign}-${level}`,
        base,
        quote
      }
    };
  }, {});
};

export const ecarts = (
  { higher, lower, higherOpposite, lowerOpposite, levels }
) => {
  levels = parseInt(levels, 10);
  const reg = regression.exponential([
    [0, parseFloat(higher)],
    //[(levels - 1) / 2, (lower - higher) / 2],
    [levels - 1, parseFloat(lower)]
  ], { precision: higher._precision + 1 });
  const regOpposite = regression.exponential([
    [0, parseFloat(higherOpposite)],
    //[(levels - 1) / 2, (lowerOpposite - higherOpposite) / 2],
    [levels - 1, parseFloat(lowerOpposite)]
  ], { precision: higherOpposite._precision + 1 });
  // 0.5, O.7
  return {
    reg,
    regOpposite
  };
};
