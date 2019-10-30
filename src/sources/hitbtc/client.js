import request from 'request';

export default (body, callback) => {
  return request(
    {
      url: 'http://127.0.0.1:3145/request',
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
