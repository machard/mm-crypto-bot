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
    path: './dist/recorders/log.js'
  },
  // bfx lending
  /*{
    path: './dist/strategies/lend/pair-worker.js',
    conf: {
      currency: 'USD',
      source: 'bitfinex'
    }
  },*/
  // coinbase shared websocket
  {
    path: './dist/sources/coinbase/workers/shared-ws.js',
    conf: {
      subscriptions: {
        'BTC-EUR': 'level2_50',
        'BTC-USD': 'level2_50'
      }
    }
  },
  // coinbase shared fix
  {
    path: './dist/sources/coinbase/workers/shared-fix.js',
    conf: {
      nbFixs: 2,
      symbols: [
        'BTC-EUR'
      ]
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
      source: 'coinbase',
      base: 'BTC',
      quote: 'USD',
      level: 'level2_50',
      id: 'ff-btc-usd',
      depth: 1,
      convert: [
        { id: 'oanda-fx-eur-usd', precision: 2 }
      ],
      clientParams: {
        port: 3146
      }
    }
  },
  {
    path: './dist/strategies/lib/marketData-worker.js',
    conf: {
      base: 'BTC',
      quote: 'EUR',
      level: 'level2_50',
      depth: 2,
      id: 'to-btc-eur',
      source: 'coinbase',
      clientParams: {
        port: 3146
      }
    }
  },
  // coinbase stats arb
  {
    path: './dist/strategies/mm-levels/pair-worker.js',
    conf: {
      name: 'atb-coinbase',
      mainCurrency: 'EUR',
      sheetId: '1JeSbnqsrytX3Zjnf9TMC_K18az0ba9qWx4fkjEI9E9c',
      pair: {
        tradeOn: 'BTC',
        bookData: {
          id: 'coinbase-to-btc-eur'
        },
        followFrom: {
          id: 'coinbase-ff-btc-usd-oanda-fx-eur-usd'
        },
        params: {
          range: 'conf!E3:F'
        },
        investments: {
          range: 'conf!A3:B'
        }
      },
      source: 'coinbase',
      clientParams: {
        port: 3146
      }
    }
  },
  {
    path: './dist/strategies/mm-levels/quote-worker.js',
    conf: {
      name: 'atb-coinbase',
      pairs: [
        'atb-coinbase-BTC-EUR'
      ],
      source: 'coinbase',
      sheetId: '1JeSbnqsrytX3Zjnf9TMC_K18az0ba9qWx4fkjEI9E9c',
      mainCurrency: 'EUR',
      clientParams: {
        port: 3146
      }
    }
  }
];
