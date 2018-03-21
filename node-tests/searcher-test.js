const {
  createDefaultEnvironment,
  destroyDefaultEnvironment
} = require('@cardstack/test-support/env');
const JSONAPIFactory = require('@cardstack/test-support/jsonapi-factory');
const Session = require('@cardstack/plugin-utils/session');
const sampleResponse = require('./fixtures/kyc-retrieve.js');
const nock = require('nock');

describe('identitymind/searcher', function() {
  let env, searcher;

  function session(userId) {
    return new Session({type: 'users', id: userId});
  }

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

    factory.addResource('users', 'user-with-kyc').withAttributes({
      'kyc-transaction': '92514582'
    });

    factory.addResource('users', 'user-with-different-kyc').withAttributes({
      'kyc-transaction': '123456'
    });

    factory.addResource('users', 'user-with-no-kyc');

    env = await createDefaultEnvironment(`${__dirname}/..`, factory.getModels());
    // Note: realTime changes to forceRefresh on cardstack master
    await env.lookup('hub:indexers').update({ realTime: true });
    searcher = env.lookup('hub:searchers');
  });

  afterEach(async function() {
    await destroyDefaultEnvironment(env);
  });

  it('looks up transactions on identitymind', async function() {
    nock('https://test.identitymind.com')
      .get("/im/account/consumer/92514582")
      .basicAuth({ user: 'testuser', pass: 'testpass' })
      .reply(200, sampleResponse);

    let model = (await searcher.get(session('user-with-kyc'), 'master', 'identitymind-verifications', '92514582')).data;

    expect(model.type).to.equal('identitymind-verifications');
    expect(model.id).to.equal('92514582');

    // stores details from response
    expect(model.attributes.state).to.equal('A');
  });


  it('fails to find the kyc when looking up kyc that is not your own', async function() {
    expect(nock.isActive()).to.be.true; // will error if http request is attempted

    await expect(
      searcher.get(session('user-with-different-kyc'), 'master', 'identitymind-verifications', '92514582')
    ).to.be.rejectedWith(Error, 'master/identitymind-verifications/92514582');
  });

  it('fails to find the kyc when looking up kyc if you have no KYC attached at all', async function() {
    expect(nock.isActive()).to.be.true; // will error if http request is attempted

    await expect(
      searcher.get(session('user-with-no-kyc'), 'master', 'identitymind-verifications', '92514582')
    ).to.be.rejectedWith(Error, 'master/identitymind-verifications/92514582');
  });

  it('fails to find the kyc when not logged in', async function() {
    expect(nock.isActive()).to.be.true; // will error if http request is attempted

    await expect(
      searcher.get(Session.EVERYONE, 'master', 'identitymind-verifications', '92514582')
    ).to.be.rejectedWith(Error, 'master/identitymind-verifications/92514582');
  });
});
