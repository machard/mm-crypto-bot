import restify from 'restify';
import { BF_API_KEY, BF_API_SECRET } from '../constants';
import BFX from 'bitfinex-api-node';
var RateLimiter = require('limiter').RateLimiter;

var limiter = new RateLimiter(1, 'second');
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

const bfx = new BFX({
  apiKey: BF_API_KEY,
  apiSecret: BF_API_SECRET
});

const bfxRest1 = bfx.rest(1);
const bfxRest2 = bfx.rest(2);

protect(limiter, bfxRest2, 'candles');

const server = restify.createServer();
server.use(restify.bodyParser());
server.use(restify.queryParser());
server.use(restify.CORS());
server.post('/request/1', (req, res, next) => {
  bfxRest1[req.body.command](req.body.params, (...args) => res.send({ client: args }));
});
server.post('/request/2', (req, res, next) => {
  bfxRest2[req.body.command](req.body.params, (...args) => res.send({ client: args }));
});
server.listen(3148, '127.0.0.1');
