const request = require("request-promise-native");

async function kyc(data, { user, pass, env }) {

  let baseUrl = `https://${env}.identitymind.com/im`;

  return await request({
    method: "POST",
    uri: `${baseUrl}/account/consumer`,
    auth: {
      user: user,
      pass: pass
    },
    json: true,
    body: data
  });
}


module.exports = { kyc };