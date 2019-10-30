import WS from '../../../lib/sources/WS';
import _ from 'lodash';
import config from '../../../config';
import IPCServerProcess from '../../../lib/IPCServerProcess';
import processOutput from '../../../lib/processOutput';
import IPCClientProcess from '../../../lib/IPCClientProcess';
import { runningHours } from '../../../utils';
var conf = JSON.parse(process.argv[2]);

const channels = _.mapValues(conf.subscriptions, (level, symbol) => ([
  {
    name: level,
    'product_ids': [symbol]
  },
  {
    name: 'heartbeat',
    'product_ids': [symbol]
  }
]));

const servers = _.mapValues(conf.subscriptions, (level, symbol) =>
  new IPCServerProcess(`coinbase-shared-ws-${symbol}-${level}`)
);

const ws = new WS('coinbase', config.GDAX_WSS_HOST);
ws.onOpen = () => {
  _.each(servers, server => server.send({ open: true }));
};
ws.onClose = () => {
  _.each(servers, server => server.send({ closed: true }));
};
ws.onMessage = (data) => {
  if (data.product_id && data.type !== 'heartbeat')
    servers[data.product_id].send({ data });

  if (data.type === 'subscriptions')
    _.each(servers, server => server.send({ data }));
};

_.each(servers, (server, symbol) =>
  server.on('command', (type) => {
    ws.send({
      type,
      channels: channels[symbol]
    });
  })
);

processOutput(
  ws.getExecutionReport().getSource(),
  new IPCClientProcess('logs'),
  (ws) => ([
    {
      tags: ['badevents', 'coinbase-shared-ws'],
      values: {
        ws
      }
    },
    {
      tags: ['runningHours', 'coinbase-shared-ws'],
      values: {
        runningHours: runningHours()
      }
    }
  ])
);
