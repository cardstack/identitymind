const request = require("request-promise-native");

async function kyc(data, config) {
  return await imRequest('POST', 'account/consumer', config, data);
}

async function kycRetrieve(transactionId, config) {
  return await imRequest('GET', `account/consumer/${transactionId}`, config);
}

async function imRequest(method, path, { user, pass, env }, body) {
  let baseUrl = `https://${env}.identitymind.com/im`;

  let options = {
    method,
    uri: `${baseUrl}/${path}`,
    auth: {
      user: user,
      pass: pass
    },
    json: true
  };

  if (body) {
    options.body = body;
  }

  return await request(options);
}



module.exports = { kyc, kycRetrieve };