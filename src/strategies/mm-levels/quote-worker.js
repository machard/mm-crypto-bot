import _ from 'lodash';
import num from 'num';
import path from 'path';
import Trade from '../../models/Trade';
import ChildProcess from '../../lib/ChildProcess';
import ProcessSource from '../../lib/ProcessSource';
import processOutput from '../../lib/processOutput';
import sharedTicker from '../../lib/sharedTicker';
import IPCClientProcess from '../../lib/IPCClientProcess';
import Picker from '../../filters/Picker';
import Metrics from '../../filters/Metrics';
import Compute from '../../filters/Compute';
import Sum from '../../filters/Sum';
import { runningHours } from '../../utils';

const {
  name,
  pairs,
  source,
  sheetId,
  mainCurrency
} = JSON.parse(process.argv[2]);

const Balance = require(path.resolve(`./dist/sources/${source}/Balance`)).default;

const botSources = _.map(pairs, pair =>
  new ProcessSource(
    'botSourceInput',
    new IPCClientProcess(pair),
    (v) => ({
      mytrades: v.mytrades && new Trade({
        ...v.mytrades,
        price: num(v.mytrades.price),
        $size: num(v.mytrades.$size),
        fee: num(v.mytrades.fee),
        feeValue: num(v.mytrades.feeValue)
      }),
      middle: v.middle && num(v.middle),
      balance: v.balance && num(v.balance),
      maxInvestValue: v.maxInvestValue && num(v.maxInvestValue),
      middleBaseBalance: v.middleBaseBalance && num(v.middleBaseBalance),
      reservedQuote: v.reservedQuote && num(v.reservedQuote)
    }),
    sharedTicker
  )
);

const balanceMain = new Balance(mainCurrency, _.map(botSources, botSource => new Picker(botSource, 'mytrades')));

const moneySum = [balanceMain].concat(_.map(botSources, botSource => new Compute(
  ([balance, middle]) => balance.mul(middle),
  new Picker(botSource, 'balance'),
  new Picker(botSource, 'middle')
)));
const totalMoney = new Sum(moneySum);

/// logs

processOutput(
  new Metrics([
    totalMoney,
    ..._.flatten(_.map(botSources, botSource => [
      new Picker(botSource, 'middle'),
      new Picker(botSource, 'maxInvestValue'),
      new Picker(botSource, 'middleBaseBalance'),
      new Picker(botSource, 'reservedQuote')
    ]))
  ], 1000 * 60 * 15),
  new ChildProcess(
    path.resolve('./dist/recorders/long-term-log.js'),
    {
      sheetId: sheetId,
      range: 'state!A1'
    }
  ),
  item => item
);

processOutput(
  new Metrics([
    balanceMain,
    balanceMain.getBalanceTruthSource()
  ]),
  new IPCClientProcess('logs'),
  ([balance, balanceTruth]) => ([
    {
      tags: ['balance', name, mainCurrency],
      values: { balance, balanceTruth }
    },
    {
      tags: ['runningHours', name, mainCurrency],
      values: {
        runningHours: runningHours()
      }
    }
  ])
);
