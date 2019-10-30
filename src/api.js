//import profiler from 'v8-profiler';
import restify from 'restify';
var debug = require('debug')('api');
import config from './config';
import elasticsearch from 'elasticsearch';
import _ from 'lodash';

var clientES = new elasticsearch.Client({
  host: config.ES_HOST,
  log: 'error',
  apiVersion: '6.3',
  // si elastic search est dans les choux
  // on veut pas se mettre dans les choux
  maxRetries: 1,
  requestTimeout: 10000,
  deadTimeout: 5000
});


class API {
  server = restify.createServer();

  constructor() {
    this.server.use(restify.bodyParser());
    this.server.use(restify.queryParser());
    this.server.use(restify.CORS());
  }

  start() {
    this.server.get('/reset-es', (req, res, next) => {
      clientES.cat.indices({
        h: ['index', 'docs.count']
      })
        .then(function (body) {
          let lines = body.split('\n');
          let indices = lines.map(function (line) {
            let row = line.split(' ');
            return {name: row[0], count: row[1]};
          });
          indices.pop(); //the last line is empty by default
          indices = _.slice(_.filter(_.sortBy(indices, 'name'), ({name}) =>
            name !== '.kibana'
          ), 0, 24);

          return Promise.all(indices.map(({name}) =>
            clientES.indices.delete({index: name})
          ));
        })
        .then(() => res.send(200), e => res.send(500, JSON.stringify(e)))
        .then(next);
    });

    this.server.listen(process.env.PORT || 6413, () => {
      debug('%s listening at %s', this.server.name, this.server.url);
    });
  }
}

export default new API();
