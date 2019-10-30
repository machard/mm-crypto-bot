import num from 'num';
import request from 'request';
import moment from 'moment';
import IPCServerProcess from '../../../lib/IPCServerProcess';
import sharedTicker from '../../../lib/sharedTicker';
import Source from '../../../lib/Source';
import noComparaisonCheck from '../../../lib/noComparaisonCheck';
import CachedBatchedZippedStream from '../../../lib/CachedBatchedZippedStream';
import Sample from '../../../filters/Sample';
import AtLeast from '../../../filters/AtLeast';
import IPCClientProcess from '../../../lib/IPCClientProcess';
import { runningHours } from '../../../utils';
import processOutput from '../../../lib/processOutput';

var conf = JSON.parse(process.argv[2]);
const fx = new Source('fx', sharedTicker);
fx.getExecutionReport().addKey('error');

processOutput(
  new AtLeast(fx),
  new IPCServerProcess(`${conf.source}-${conf.id}`),
  fx => ({ fx }),
  { onlySendLast: true }
);

const logger = new IPCClientProcess('logs');

processOutput(
  new Sample(fx, 1000),
  logger,
  fx => ([
    {
      tags: ['price', 'fx', 'mastercard', `${conf.base}-${conf.quote}`],
      values: { fx }
    },
    {
      tags: ['runningHours', 'fx', 'mastercard', `${conf.base}-${conf.quote}`],
      values: {
        runningHours: runningHours()
      }
    }
  ])
);

processOutput(
  noComparaisonCheck(
    new CachedBatchedZippedStream(
      `${conf.source}-${conf.id}-reports`,
      {
        fx: fx.getExecutionReport().getSource()
      }
    )
  ),
  logger,
  ({ fx }) => ([
    {
      tags: ['badevents', 'fx', 'mastercard', `${conf.base}-${conf.quote}`],
      values: {
        fx
      }
    }
  ])
);

const fetchRate = () => {
  const date = moment().subtract(1, 'day').format('YYYY-MM-DD');

  request({
    url: `https://www.mastercard.us/settlement/currencyrate/fxDate=${date};transCurr=${conf.base};crdhldBillCurr=${conf.quote};bankFee=0.00;transAmt=1.00/conversion-rate`,
    headers: {
      Referer: 'https://www.mastercard.us/en-us/consumers/get-support/convert-currency.html',
      Accept: 'application/json, text/plain, */*',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.111 Safari/537.36'
    }
  }, (err, res, body) => {
    try {
      body = JSON.parse(body);
      fx.lag(false);
      fx.write(num(body.data.conversionRate).set_precision(2));
      sharedTicker.tick();
    } catch(e) {
      console.log('mastercard err', err, body);
      fx.getExecutionReport().increment('error');
    }

    setTimeout(fetchRate, 5 * 60 * 1000);
  });
};

fetchRate();

const keepAlive = () => {
  setTimeout(keepAlive, 5000);
};
keepAlive();
