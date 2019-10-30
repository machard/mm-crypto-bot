import request from 'request';

export default (version, command, params, callback) => {
  return request(
    {
      url: `http://127.0.0.1:3148/request/${version}`,
      method: 'POST',
      json: true,
      body: {
        command,
        params
      }
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
