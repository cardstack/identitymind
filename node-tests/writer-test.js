const {
  createDefaultEnvironment,
  destroyDefaultEnvironment
} = require('@cardstack/test-support/env');
const JSONAPIFactory = require('@cardstack/test-support/jsonapi-factory');
const Session = require('@cardstack/plugin-utils/session');
const sampleResponse = require('./fixtures/kyc-response.js');
const nock = require('nock');

describe('identitymind/writer', function() {
  let env, writer;

  beforeEach(async function() {
    let factory = new JSONAPIFactory();

    factory.addResource('data-sources', 'identitymind')
      .withAttributes({
        'source-type': '@cardstack/identitymind',
        params: {
          config: {
            user: 'testuser',
            pass: 'testpass',
            env:  'test'
          }
        }
      });

    factory.addResource('grants')
      .withAttributes({
        mayCreateResource: true,
        mayUpdateResource: false,
        mayDeleteResource: false,
        mayWriteFields: true
      }).withRelated('who', factory.addResource('groups', 'create-only'));


    env = await createDefaultEnvironment(`${__dirname}/..`, factory.getModels());

    // Note: realTime changes to forceRefresh on cardstack master
    await env.lookup('hub:indexers').update({ realTime: true });

    writer = env.lookup('hub:writers');
  });

  afterEach(async function() {
    await destroyDefaultEnvironment(env);
  });

  it('can send KYC data to identitymind', async function() {

    nock('https://test.identitymind.com')
      .filteringRequestBody( body =>
        JSON.parse(body).man === 'test@example.com'
      )
      .post('/im/account/consumer')
      .basicAuth({ user: 'testuser', pass: 'testpass' })
      .reply(200, sampleResponse);


    let created = await writer.create('master', new Session({ id: 'create-only', type: 'users'}), 'identitymind-verifications', {
      type: 'identitymind-verifications',
      attributes: {
        man: 'test@example.com'
      }
    });

    expect(created.type).to.equal('identitymind-verifications');
    expect(created.id).to.equal('92514582');

    // stores details from request
    expect(created.attributes.man).to.equal('test@example.com');

    // stores details from response
    expect(created.attributes.rcd).to.equal('131,101,50005,150,202,1002');
  });
});
