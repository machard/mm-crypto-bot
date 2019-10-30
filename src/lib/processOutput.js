export default (source, ps, format = data => data, opts = {}) => {
  const send = (data) => {
    try {
      const formattedData = format(data);
      if (!formattedData)
        return;
      ps.send({data: formattedData, time: Date.now()});
    } catch(e) {
      console.log('failing to send to process', e);
    }
  };

  let sendTO;

  source.get().each((data) => {
    if (!opts.onlySendLast) {
    	return send(data);
    }

    clearImmediate(sendTO);
    sendTO = setImmediate(() => send(data));
  });

  source.onLag(() => ps.send({lag: true}));
};
