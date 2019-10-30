import num from 'num';
import request from 'request';
import {OANDA_ACCOUNT_ID, OANDA_ACCESS_TOKEN} from '../constants';
import config from '../../../config';
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
fx.getExecutionReport().addKey('close');

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
      tags: ['price', 'fx', 'oanda', `${conf.base}-${conf.quote}`],
      values: { fx }
    },
    {
      tags: ['runningHours', 'fx', 'oanda', `${conf.base}-${conf.quote}`],
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
      tags: ['badevents', 'fx', 'oanda', `${conf.base}-${conf.quote}`],
      values: {
        fx
      }
    }
  ])
);

let connect, startStallTo, stallTo;

startStallTo = (req, askLag) => {
  stallTo = setTimeout(() => {
    if (askLag)
      fx.lag(true);
    req.abort();
    fx.getExecutionReport().increment('close');
    connect();
  }, 10000);
};

connect = () => {
  const req = request({
    url: `${config.OANDA_HOST}/v1/prices?accountId=${OANDA_ACCOUNT_ID}&instruments=${conf.base}_${conf.quote}`,
    headers: {
      Authorization: `Bearer ${OANDA_ACCESS_TOKEN}`
    }
  });
  startStallTo(req, true);
  req.on('error', () => {
    fx.getExecutionReport().increment('error');
  });
  req.on('data', data => {
    clearTimeout(stallTo);
    startStallTo(req);

    try {
      data = JSON.parse(data);
    } catch(e) {}
    if (data && data.tick) {
      fx.lag(false);
      fx.write((num(data.tick.bid).add(data.tick.ask)).div(2));
      sharedTicker.tick();
    }
  });
};

connect();

const keepAlive = () => {
  setTimeout(keepAlive, 5000);
};
keepAlive();
