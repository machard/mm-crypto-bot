import CoinbaseExchange from 'coinbase-exchange';
import restify from 'restify';
import { COINBASE_FIX_ACCESS } from '../constants';
import config from '../../../config';
var RateLimiter = require('limiter').RateLimiter;

const {
  key,
  port
} = JSON.parse(process.argv[2]);

var limiterPublic = new RateLimiter(1, 'second');
var limiterAuth = new RateLimiter(1, 'second');
const protect = (limiter, client, method) => {
  const _method = client[method];
  client[method] = (params, callback) => {
    limiter.removeTokens(1, (err) => {
      if (err)
        return callback('rate limit');
      _method.call(client, ...params, callback);
    });
  };
};

var client = new CoinbaseExchange.AuthenticatedClient(
  COINBASE_FIX_ACCESS[key].KEY,
  COINBASE_FIX_ACCESS[key].SECRET,
  COINBASE_FIX_ACCESS[key].PASSPHRASE,
  config.GDAX_API_HOST
);

client.withdraw = (opts, callback) => {
  client.post(['withdrawals', 'coinbase-account'], {
    currency: opts.currency,
    amount: opts.amount,
    'coinbase_account_id': opts.destination
  }, callback);
};

protect(limiterAuth, client, 'cancelAllOrders');
protect(limiterAuth, client, 'getOrders');
protect(limiterAuth, client, 'getAccounts');
protect(limiterAuth, client, 'withdraw');

const publicClients = {};
const publicClient = (label) => {
  return (() => {
    publicClients[label] = publicClients[label] || new CoinbaseExchange.PublicClient(label, config.GDAX_API_HOST);

    if (!publicClients[label].patched) {
      publicClients[label].patched = true;

      protect(limiterPublic, publicClients[label], 'getProductHistoricRates');
    }

    return publicClients[label];
  })();
};

const server = restify.createServer();
server.use(restify.bodyParser());
server.use(restify.queryParser());
server.use(restify.CORS());
server.post('/auth', (req, res, next) => {
  client[req.body.command](req.body.params, (...args) => res.send({ client: args }));
});
server.post('/public', (req, res, next) => {
  publicClient(req.body.label)[req.body.command](req.body.params, (...args) => res.send({ client: args }));
});
server.listen(port, '127.0.0.1');

