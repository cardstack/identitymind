const request = require("request-promise-native");

async function kyc(data, config) {
  return await imRequest('POST', 'account/consumer', config, {body: data});
}

async function kycRetrieve(transactionId, config) {
  return await imRequest('GET', `account/consumer/${transactionId}`, config);
}

async function docUpload(transactionId, formData, config) {
  return await imRequest('POST', `account/consumer/${transactionId}/files`, config, { formData });
}


async function imRequest(method, path, { user, pass, env }, { body, formData } = {}) {
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

  if (formData) {
    options.formData = formData;
  }

  return await request(options);
}



module.exports = { kyc, kycRetrieve, docUpload };
