import restify from 'restify';
import { BLINKTRADE_KEY_NO_NOTIFS, BLINKTRADE_SECRET_NO_NOTIFS } from '../constants';
var RateLimiter = require('limiter').RateLimiter;

var limiter = new RateLimiter(1, 'second');
const protect = (limiter, client, method) => {
  const _method = client[method];
  client[method] = (params, callback) => {
    limiter.removeTokens(1, (err) => {
      if (err)
        return callback('rate limit');

      _method.call(client, ...params)
        .then(
          (...args) => callback(null, args),
          (err) => callback(err)
        );
    });
  };
};

var mock = require('mock-require');
mock('fingerprintjs2', {});
var BlinkTradeRest = require('blinktrade').BlinkTradeRest;
var blinktrade = new BlinkTradeRest({
  prod: true,
  key: BLINKTRADE_KEY_NO_NOTIFS,
  secret: BLINKTRADE_SECRET_NO_NOTIFS
});

protect(limiter, blinktrade, 'balance');
protect(limiter, blinktrade, 'myOrders');
protect(limiter, blinktrade, 'cancelOrder');

const server = restify.createServer();
server.use(restify.bodyParser());
server.use(restify.queryParser());
server.use(restify.CORS());
server.post('/request', (req, res, next) => {
  blinktrade[req.body.command](req.body.params, (...args) => res.send({ client: args }));
});
server.listen(3149, '127.0.0.1');
