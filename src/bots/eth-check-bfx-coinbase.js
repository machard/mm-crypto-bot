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
        'ETH-EUR': 'level2_50'
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
      base: 'ETH',
      quote: 'USD',
      level: 'level2',
      id: 'ff-eth-usd',
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
      base: 'ETH',
      quote: 'EUR',
      level: 'level2_50',
      depth: 10,
      id: 'to-eth-eur',
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
        id: 'coinbase-to-eth-eur'
      },
      followFrom: {
        id: 'bitfinex-ff-eth-usd-oanda-fx-eur-usd'
      },
      withoutOffset: true,
      minSize: 80
    }
  }
];
