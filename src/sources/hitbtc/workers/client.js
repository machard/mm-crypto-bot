import restify from 'restify';
import request from 'request';
import { HB_API_KEY, HB_API_SECRET } from '../constants';
var RateLimiter = require('limiter').RateLimiter;

var limiter = new RateLimiter(1, 'second');
const requestLimited = (params, callback) => {
  limiter.removeTokens(1, (err) => {
    if (err)
      return callback('rate limit');
    request(params, callback);
  });
};

const server = restify.createServer();
server.use(restify.bodyParser());
server.use(restify.queryParser());
server.use(restify.CORS());
server.post('/request', (req, res, next) => {
  requestLimited({
    auth: req.body.auth && {
      user: HB_API_KEY,
      pass: HB_API_SECRET
    },
    json: true,
    url: `https://api.hitbtc.com/api/2/${req.body.command}`,
    method: req.body.method,
    query: req.body.qs,
    body: req.body.body
  }, (err, __, result) => {
    res.send({ client: [err, result] });
  });
});
server.listen(3145, '127.0.0.1');
