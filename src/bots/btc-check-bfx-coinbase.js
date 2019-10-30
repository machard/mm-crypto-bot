export default  [
  // clients
  {
    path: './dist/sources/coinbase/workers/client.js',
    conf: {
      key: 0,
      port: 3146
    }
  },
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
  // coinbase shared websocket
  {
    path: './dist/sources/coinbase/workers/shared-ws.js',
    conf: {
      subscriptions: {
        'BTC-EUR': 'level2_50'
      }
    }
  },
  // FXs
  {
    path: './dist/sources/oanda/workers/fx.js',
    conf: {
      source: 'oanda',
      base: 'EUR',
      quote: 'USD',
      id: 'fx-eur-usd'
    }
  },
  // price feeds
  {
    path: './dist/strategies/lib/marketData-worker.js',
    conf: {
      source: 'bitfinex',
      base: 'BTC',
      quote: 'USD',
      level: 'level2',
      id: 'ff-btc-usd',
      depth: 10,
      convert: [
        { id: 'oanda-fx-eur-usd', precision: 2 }
      ],
      clientParams: {
        port: 3147
      }
    }
  },
  {
    path: './dist/strategies/lib/marketData-worker.js',
    conf: {
      base: 'BTC',
      quote: 'EUR',
      level: 'level2_50',
      depth: 10,
      id: 'to-btc-eur',
      source: 'coinbase',
      clientParams: {
        port: 3146
      }
    }
  },
  // ecart process stats arb
  {
    path: './dist/analysis/ecarts.js',
    conf: {
      id: 'ecarts-bfx-coinbase',
      bookData: {
        id: 'coinbase-to-btc-eur'
      },
      followFrom: {
        id: 'bitfinex-ff-btc-usd-oanda-fx-eur-usd'
      },
      withoutOffset: true,
      minSize: 3
    }
  }
];
