import num from 'num';
import IPCServerProcess from '../../../lib/IPCServerProcess';
import sharedTicker from '../../../lib/sharedTicker';
import Source from '../../../lib/Source';
import Sample from '../../../filters/Sample';
import AtLeast from '../../../filters/AtLeast';
import IPCClientProcess from '../../../lib/IPCClientProcess';
import { runningHours } from '../../../utils';
import processOutput from '../../../lib/processOutput';

var conf = JSON.parse(process.argv[2]);
const fx = new Source('fx', sharedTicker);

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
      tags: ['price', 'fx', 'hardfx', `${conf.base}-${conf.quote}`],
      values: { fx }
    },
    {
      tags: ['runningHours', 'fx', 'hardfx', `${conf.base}-${conf.quote}`],
      values: {
        runningHours: runningHours()
      }
    }
  ])
);

fx.lag(false);
fx.write(num(conf.fx));
sharedTicker.tick();

const keepAlive = () => {
  setTimeout(keepAlive, 5000);
};
keepAlive();
