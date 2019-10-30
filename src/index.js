import minimist from 'minimist';
import path from 'path';
import _ from 'lodash';
var debug = require('debug')('app');
import api from './api';
import IPCClientProcess from './lib/IPCClientProcess';
import IPCServerProcess from './lib/IPCServerProcess';
import ExecutionReport from './lib/ExecutionReport';
import processOutput from './lib/processOutput';
import ChildProcess from './lib/ChildProcess';
import cpuStat from 'cpu-stat';

const options = minimist(process.argv.slice(2));
let bot;
try {
  bot = require(path.resolve(`./dist/bots/${options._[0]}`)).default;
} catch(e) {
  console.log(e);
}

var start = () => {
  debug('start');

  // start bot
  _.each(bot, (conf) =>
    new ChildProcess(
      path.resolve(conf.path),
      conf.conf || {},
    )
  );

  // set up api
  const ipcServer = new IPCServerProcess('api');
  api.server.post('/command', (req, res, next) => {
    ipcServer.send({ data: req.body });
    res.send(200);
    next();
  });

  api.start();

  // log cpu stats
  const cpuLogger = new IPCClientProcess('logs');

  const cpuReport = new ExecutionReport();
  const cpuLog = (i) => {
    cpuStat.usagePercent(
      {
        coreIndex: i,
        sampleMs: 1000
      },
      (err, percent) => {
        if (err)
          return console.log(err);

        cpuReport.setValue(`cpu-${i}`, percent);
        cpuLog(i);
      }
    );
  };
  _.each(_.range(0, cpuStat.totalCores()), i => {
    cpuReport.addKey(`cpu-${i}`);
    cpuLog(i);
  });

  processOutput(cpuReport.getSource(), cpuLogger, cpu => ([
    {
      tags: ['cpu', options._[0]],
      values: {
        ...cpu
      }
    }
  ]));
};

if (!process.env.RUN || !bot)
  setInterval(() => console.log('not running'), 1000);
else
  start();
