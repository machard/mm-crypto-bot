import request from 'request';

const {
  clientParams
} = JSON.parse(process.argv[2]);

const clientCall = (type, body, callback) => {
  return request(
    {
      url: `http://127.0.0.1:${clientParams.port}/${type}`,
      method: 'POST',
      json: true,
      body
    },
    (error, response, body) => {
      try {
        body = JSON.parse(body);
      } catch(e) {}

      if (error || !body.client) {
        console.log(error, body);
        return callback('http error');
      }

      callback.apply(null, body.client);
    }
  );
};

const client = {};

client.cancelAllOrders = (opts, callback) => clientCall('auth', {
  command: 'cancelAllOrders',
  params: [opts]
}, callback);
client.getOrders = (opts, callback) => clientCall('auth', {
  command: 'getOrders',
  params: [opts]
}, callback);
client.getAccounts = (callback) => clientCall('auth', {
  command: 'getAccounts',
  params: []
}, callback);
client.withdraw = (opts, callback) => clientCall('auth', {
  command: 'withdraw',
  params: [opts]
}, callback);

export default client;

var publicClients = {};
export var publicClient = (label) => {
  return (() => {
    publicClients[label] = publicClients[label] || {
      getProductHistoricRates: (opts, callback) => clientCall('public', {
        command: 'getProductHistoricRates',
        label,
        params: [opts]
      }, callback)
    };
    return publicClients[label];
  })();
};
