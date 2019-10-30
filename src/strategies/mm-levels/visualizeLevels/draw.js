import num from 'num';
import { algo, ecarts, deltaMultiplierMap } from './level.calculs';
import { getTopPrices, updateWishToMarket } from './utils';
import Book from './Book';
import Chart from 'chart.js';
import { Map } from 'immutable';
import _ from 'lodash';


const chartColors = {
  red: 'rgb(255, 99, 132)',
  redLight: 'rgb(255, 208, 160)',
  orange: 'rgb(255, 159, 64)',
  yellow: 'rgb(255, 205, 86)',
  green: 'rgb(75, 192, 192)',
  greenLight: 'rgb(170, 209, 183)',
  blue: 'rgb(54, 162, 235)',
  purple: 'rgb(153, 102, 255)',
  grey: 'rgb(201, 203, 207)'
};

const makeDataSet = (label, color, borderDash, x, y) => ({
  label,
  showLine: true,
  borderColor: color,
  backgroundColor: color,
  fill: false,
  ...(borderDash ? { borderDash: [5, 5] } : {}),
  data: [
    {x: 0, y: parseFloat(y)},
    {x: parseFloat(x), y: parseFloat(y)},
  ],
});

window.onload = function() {

  const conf = {
    minSize: num(0.1),
    priceIncrement: num(0.01),
    firstOrderSize: 2,
    levels: num(5),
    emergencyFactor: num(0.5),
    higher: num(0.005),
    lower: num(0.014),
    higherOpposite: num(0.004),
    lowerOpposite: num(0.009),
    visibleDepth: num(1),
    makerFee: num(0.001),
    takerFee: num(0.003)
  };

  const ref = num(1000).set_precision(2);

  const investValue = num(38);
  const middle = num(38);

  const calculEcarts = ecarts(conf);

  const calculDeltaMap = deltaMultiplierMap(
    conf,
    investValue, middle
  );

  ////
  // overview chart
  ///
  var levelsSell = algo(
    'btc',
    'eur',
    conf,
    ref,
    middle.add(investValue), // balance
    calculDeltaMap,
    calculEcarts
  );
  var levelsBuy = algo(
    'btc',
    'eur',
    conf,
    ref,
    middle.sub(investValue), // balance
    calculDeltaMap,
    calculEcarts
  );

  let max = _.max(_.map(levelsBuy, level => parseFloat(level.$size)));

  let buysDownLevels = _.filter(levelsBuy, level => level.side === 'buy' && level.sign === 'down');
  let buysUpLevels = _.filter(levelsBuy, level => level.side === 'buy' && level.sign === 'up');
  let sellsDownLevels = _.filter(levelsSell, level => level.side === 'sell' && level.sign === 'down');
  let sellsUpLevels = _.filter(levelsSell, level => level.side === 'sell' && level.sign === 'up');

  buysDownLevels = _.map(buysDownLevels, level => makeDataSet(
    `buy-down-${level.level}`,
    chartColors.green,
    false,
    level.$size,
    level.price
  ));
  buysUpLevels = _.map(buysUpLevels, level => makeDataSet(
    `buy-up-${level.level}`,
    chartColors.greenLight,
    false,
    level.$size,
    level.price
  ));
  sellsDownLevels = _.map(sellsDownLevels, level => makeDataSet(
    `sell-down-${level.level}`,
    chartColors.redLight,
    false,
    level.$size,
    level.price
  ));
  sellsUpLevels = _.map(sellsUpLevels, level => makeDataSet(
    `sell-up-${level.level}`,
    chartColors.red,
    false,
    level.$size,
    level.price
  ));

  var lineChartData = {
    datasets: [
      makeDataSet('ref', chartColors.blue, false, max, ref),
      ...buysDownLevels,
      ...sellsUpLevels,
      ...buysUpLevels,
      ...sellsDownLevels,
    ]
  };

  var ctx = document.getElementById('canvas').getContext('2d');
  Chart.Scatter(ctx, {
    data: lineChartData,
    options: {
      title: {
        display: true,
        text: 'levels viz'
      },
      scales: {
        xAxes: [{
          ticks: {
            max
          },
        }]
      }
    }
  });

  // situation params
  const minAsk = num(1005).set_precision(2);
  const maxBid = num(1005).set_precision(2);
  const balanceRef = num(36);

  const book = new Book();
  book.state({
    bids: [
      [maxBid, 1, 'maxbid'],
      [maxBid.sub(conf.priceIncrement), 1, 'maxbid-1']
    ],
    asks: [
      [minAsk, 1, 'minask'],
      [minAsk.add(conf.priceIncrement), 1, 'minask-1']
    ]
  });
  const orders = {byPrice: new Map({})};
  const topPrices = getTopPrices(conf, book, orders);

  let situationLevels = _.mapValues(algo(
    'btc',
    'eur',
    conf,
    ref,
    balanceRef,
    calculDeltaMap,
    calculEcarts
  ), wish => updateWishToMarket(wish, conf, topPrices));

  max = _.max(_.map(situationLevels, level => parseFloat(level.$size)));

  situationLevels = _.map(
    _.filter(situationLevels, level => level.$size.gte(conf.minSize) && !level.outbound),
    (level) => makeDataSet(
      level.tag,
      level.side === 'sell' ? chartColors.red : chartColors.green,
      false,
      level.$size,
      level.price
    ));

  lineChartData = {
    datasets: [
      makeDataSet('ref', chartColors.blue, false, max, ref),
      makeDataSet('minAsk', chartColors.blue, true, max, minAsk),
      makeDataSet('maxBid', chartColors.blue, true, max, maxBid),
      ...situationLevels
    ]
  };

  ctx = document.getElementById('canvas-situation').getContext('2d');
  Chart.Scatter(ctx, {
    data: lineChartData,
    options: {
      title: {
        display: true,
        text: 'levels viz situation'
      },
      scales: {
        xAxes: [{
          ticks: {
            max
          }
        }]
      }
    }
  });
};
/*
document.getElementById('randomizeData').addEventListener('click', function() {
  lineChartData.datasets.forEach(function(dataset) {
    dataset.data = dataset.data.map(function() {
      return randomScalingFactor();
    });
  });

  window.myLine.update();
});
*/