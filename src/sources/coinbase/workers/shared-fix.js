import _ from 'lodash';
import IPCServerProcess from '../../../lib/IPCServerProcess';
import processOutput from '../../../lib/processOutput';
import IPCClientProcess from '../../../lib/IPCClientProcess';
import { Buffer } from 'buffer';
import crypto from 'crypto';
import Executor from '../../../lib/sources/Executor';
import FIX from '../../../lib/sources/FIX';
import noComparaisonCheck from '../../../lib/noComparaisonCheck';
import CachedBatchedZippedStream from '../../../lib/CachedBatchedZippedStream';
import { COINBASE_FIX_HOST, COINBASE_FIX_ACCESS } from '../constants';
import { runningHours } from '../../../utils';

var conf = JSON.parse(process.argv[2]);

const executor = new Executor(i => new FIX({
  host: COINBASE_FIX_HOST,
  'sender_comp_id': COINBASE_FIX_ACCESS[i].KEY,
  'target_comp_id': 'Coinbase',
  beforeSend: (session, msg) => {
    if (msg.MsgType === 'A') {
      var presign = [
        msg.SendingTime,
        msg.MsgType,
        session.outgoing_seq_num - 1,
        session.sender_comp_id,
        session.target_comp_id,
        msg._fields['554']
      ].join('\x01');
      var key = Buffer(COINBASE_FIX_ACCESS[i].SECRET, 'base64');
      var hmac = crypto.createHmac('sha256', key);
      msg.RawData = hmac.update(presign).digest('base64');
    }
  },
  logon: {
    108: 30,
    554: COINBASE_FIX_ACCESS[i].PASSPHRASE,
    8013: 'S',
    9406: 'N'
  }
}), conf.nbFixs, { rateLimit: 50, stickyFix: true });

_.each(conf.symbols, symbol => {
  const server = new IPCServerProcess(`coinbase-shared-fix-${symbol}`);
  server.on('command', (command) => {
    executor[command.action](command.order);
  });
  processOutput(executor, server, (v) => {
    let symbolMessage = v['55'];
    if (v.rateLimit)
      symbolMessage = v.rateLimit.symbol;
    if (v.fixIndex)
      symbolMessage = v.fixIndex.symbol;

    if (!symbolMessage || symbolMessage === symbol)
      return v;

    return null;
  });
  setInterval(() => {
    if (!executor.isLagging())
      server.send({ data: { ping: Math.random() }, time: Date.now() });
  }, 5000);
});

processOutput(
  noComparaisonCheck(
    new CachedBatchedZippedStream(
      'bot:reports:coinbase-shared-fix',
      _.map(executor.fixs, fix => fix.getExecutionReport().getSource())
    )
  ),
  new IPCClientProcess('logs'),
  ([...fixs]) => ([
    {
      tags: ['badevents', 'coinbase-shared-fix'],
      ..._.reduce(fixs, (fixsBadevents, fix, i) => ({
        ...fixsBadevents,
        [`fix${i}`]: fix
      }), {})
    },
    {
      tags: ['runningHours', 'coinbase-shared-fix'],
      values: {
        runningHours: runningHours()
      }
    }
  ])
);
