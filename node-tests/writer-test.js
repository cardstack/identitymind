const {
  createDefaultEnvironment,
  destroyDefaultEnvironment
} = require('@cardstack/test-support/env');
const JSONAPIFactory = require('@cardstack/test-support/jsonapi-factory');
const Session = require('@cardstack/plugin-utils/session');
const sampleResponse = require('./fixtures/kyc-create.js');
const nock = require('nock');

describe('identitymind/writer', function() {
  let env, writer, searcher;

  beforeEach(async function() {
    let factory = new JSONAPIFactory();

    factory.addResource('data-sources', 'identitymind')
      .withAttributes({
        'source-type': '@cardstack/identitymind',
        params: {
          config: {
            user:       'testuser',
            pass:       'testpass',
            env:        'test',
            userModel:  'users',
            kycField:   'kyc-transaction'
          }
        }
      });

    factory.addResource('content-types', 'users').withRelated('fields', [
      factory.addResource('fields', 'kyc-transaction').withAttributes({
        fieldType: '@cardstack/core-types::string'
      })
    ]);

    factory.addResource('users', 'create-only');

    env = await createDefaultEnvironment(`${__dirname}/..`, factory.getModels());

    await env.lookup('hub:indexers').update({ realTime: true });

    writer = env.lookup('hub:writers');
    searcher = env.lookup('hub:searchers');
  });

  afterEach(async function() {
    await destroyDefaultEnvironment(env);
  });

  it('can send KYC data to identitymind', async function() {

    nock('https://test.identitymind.com')
      .filteringRequestBody( body => {
        let attrs = JSON.parse(body);
        expect(attrs.man).to.equal('test@example.com');
        expect(attrs.scanData).to.equal('foo');
        return true
      })
      .post('/im/account/consumer')
      .basicAuth({ user: 'testuser', pass: 'testpass' })
      .reply(200, sampleResponse);


    let created = await writer.create('master', new Session({ id: 'create-only', type: 'users'}), 'identitymind-verifications', {
      type: 'identitymind-verifications',
      attributes: {
        man:          'test@example.com',
        'scan-data':  "foo"
      }
    });

    expect(created.type).to.equal('identitymind-verifications');
    expect(created.id).to.equal('92514582');

    // stores details from request
    expect(created.attributes.man).to.equal('test@example.com');

    // stores details from response
    expect(created.attributes.rcd).to.equal('131,101,50005,150,202,1002');
  });

  it('associates the identitymind request with the user model', async function() {
    nock('https://test.identitymind.com')
      .filteringRequestBody( body =>
        JSON.parse(body).man === 'test@example.com'
      )
      .post('/im/account/consumer')
      .basicAuth({ user: 'testuser', pass: 'testpass' })
      .reply(200, sampleResponse);


    let session = new Session({ id: 'create-only', type: 'users'});

    await writer.create('master', session, 'identitymind-verifications', {
      type: 'identitymind-verifications',
      attributes: {
        man: 'test@example.com'
      }
    });

    let user = (await searcher.get(env.session, 'master', 'users', 'create-only')).data;

    expect(user.attributes['kyc-transaction']).to.equal("92514582");

  });
});
