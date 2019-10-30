export default  [
  {
    path: './dist/sources/bitfinex/workers/client.js',
    conf: {
      key: 0,
      port: 3147
    }
  },
  {
    path: './dist/recorders/log.js'
  },
  {
    path: './dist/strategies/lend/pair-worker.js',
    conf: {
      currency: 'USD',
      source: 'bitfinex'
    }
  }
];
