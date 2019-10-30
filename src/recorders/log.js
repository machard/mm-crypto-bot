import elasticsearch from 'elasticsearch';
import dateFormat from 'dateformat';
var debug = require('debug')('logrecorder');
import config from '../config';
import _ from 'lodash';
import { flatten } from '../utils';
import IPCServerProcess from '../lib/IPCServerProcess';
import IPCClientProcess from '../lib/IPCClientProcess';
import Ticker from '../lib/Ticker';
import ProcessSource from '../lib/ProcessSource';
import sharedTicker from '../lib/sharedTicker';
import nodemailer from 'nodemailer';

const mailer = nodemailer.createTransport({
  host: 'mail.gandi.net',
  port: 465,
  secure: true,
  auth: {
// to fill
  }
});

let clientES = null;

const api = new ProcessSource(
  'api',
  new IPCClientProcess('api'),
  command => {
    if (command.target !== 'es-logs')
      return null;
    return command;
  },
  new Ticker(),
);
api.DISABLE_COMPARAISON_CHECK = true;
api.get().each((command) => {
  if (command.command === 'host')
    clientES = command.host ? new elasticsearch.Client({
      host: command.host,
      log: 'error',
      apiVersion: '6.3',
      // si elastic search est dans les choux
      // on veut pas se mettre dans les choux
      maxRetries: 1,
      requestTimeout: 1000,
      deadTimeout: 5000
    }) : null;
});

class LogRecorder {
  bufferES = [];
  bufferAlerts = [];

  constructor() {
    this.start();
    this.startAlerts();
  }

  start() {
    if (this.bufferES.length && clientES)
      clientES.bulk({body: this.bufferES}, (err) => {
        if (err)
          debug('error persisting log', err);
      });
    this.bufferES = [];

    setTimeout(() => this.start(), 4000);
    // toutes les 4 secondes pour essayer de pas trop charger ES mais
    // ça a pas l'air de trop fonctionner...
  }

  startAlerts() {
    if (this.bufferAlerts.length && !process.env.NO_EMAIL)
      mailer.sendMail({
        from:'XXX@XXX.FR',
        to: 'XXX@XXX.fr',
        subject: 'ATB Alert!',
        text: _.map(this.bufferAlerts, ({ longName, value }) =>
          `${longName}: ${value}`
        ).join('\n')
      }, (err) => {
        console.log('alert email', err);
      });
    this.bufferAlerts = [];

    setTimeout(() => this.startAlerts(), 5 * 60 * 1000); // pas plus de un mail par 5 minutes
  }

  log(items) {
    var ts = Date.now();

    _.each(items, ({ tags, values }) =>
      _.each(flatten(values), (value, name) => {
        const longName = [...tags, name].join('-');

        if (
          tags[0] === 'alerts'
        )
          this.bufferAlerts.push({ longName, value });

        this.bufferES.push({
          index: {
            _index: `${config.INDEX_BASE}-${dateFormat(ts, 'yyyy.mm.dd', true)}-${dateFormat(ts, 'HH', true)}`,
            '_type': 'log'
          }
        });
        this.bufferES.push({
          tags,
          longName,
          name,
          value,
          ts: dateFormat(ts, 'isoDateTime', true)
        });
      })
    );
  }
}

const recorder = new LogRecorder();

new ProcessSource(
  'logs',
  new IPCServerProcess('logs'),
  logs => recorder.log(logs),
  sharedTicker,
  { relayLag: false }
);
