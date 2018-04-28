const {
  createDefaultEnvironment,
  destroyDefaultEnvironment
} = require('@cardstack/test-support/env');
const JSONAPIFactory = require('@cardstack/test-support/jsonapi-factory');
const Session = require('@cardstack/plugin-utils/session');
const sampleResponse = require('./fixtures/kyc-retrieve.js');
const nock = require('nock');
const moment = require('moment');

describe('identitymind/searcher', function() {
  let env, searcher;

  function session(userId) {
    return new Session({type: 'users', id: userId});
  }

  async function setup(fn) {
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

    if (fn) { await fn(factory); }

    env = await createDefaultEnvironment(`${__dirname}/..`, factory.getModels());

    await env.lookup('hub:indexers').update({ forceRefresh: true });
    searcher = env.lookup('hub:searchers');
  }

  afterEach(async function() {
    await destroyDefaultEnvironment(env);
  });

  it('looks up transactions on identitymind', async function() {
    await setup();

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

  it("Caches the previous result when looking up multiple times", async function() {
    await setup();

    nock('https://test.identitymind.com')
      .get("/im/account/consumer/92514582")
      .basicAuth({ user: 'testuser', pass: 'testpass' })
      .reply(200, sampleResponse);

    let model = (await searcher.get(Session.INTERNAL_PRIVILEGED, 'master', 'identitymind-verifications', '92514582')).data;
    expect(model.attributes.state).to.equal('A');

    // would nock error if http request happened again
    model = (await searcher.get(Session.INTERNAL_PRIVILEGED, 'master', 'identitymind-verifications', '92514582')).data;
    expect(model.attributes.state).to.equal('A');
  });

  it("Caches the previous result if it is made less than 10 hours ago", async function() {
    await setup(factory => {
      factory.addResource('content-types', 'identitymind-verifications').withRelated('fields', [
        factory.addResource('fields', 'last-checked-at').withAttributes({
          fieldType: '@cardstack/core-types::date'
        }),
        factory.addResource('fields', 'state').withAttributes({
          fieldType: '@cardstack/core-types::string'
        })
      ]);

      factory.addResource('identitymind-verifications', '92514582')
        .withAttributes({
          'last-checked-at': moment().subtract(1, 'hour').format(),
          state: 'P'
        });
    });

    expect(nock.isActive()).to.be.true; // will error if http request is attempted


    let model = (await searcher.get(Session.INTERNAL_PRIVILEGED, 'master', 'identitymind-verifications', '92514582')).data;
    expect(model.attributes.state).to.equal('P');

    model = (await searcher.get(Session.INTERNAL_PRIVILEGED, 'master', 'identitymind-verifications', '92514582')).data;
    expect(model.attributes.state).to.equal('P');
  });

  it("Caches the previous result if it is accepted", async function() {
    await setup(factory => {
      factory.addResource('content-types', 'identitymind-verifications').withRelated('fields', [
        factory.addResource('fields', 'last-checked-at').withAttributes({
          fieldType: '@cardstack/core-types::date'
        }),
        factory.addResource('fields', 'state').withAttributes({
          fieldType: '@cardstack/core-types::string'
        })
      ]);

      factory.addResource('identitymind-verifications', '92514582')
        .withAttributes({
          'last-checked-at': moment().subtract(11, 'hour').format(),
          state: 'A'
        });
    });

    expect(nock.isActive()).to.be.true; // will error if http request is attempted


    let model = (await searcher.get(Session.INTERNAL_PRIVILEGED, 'master', 'identitymind-verifications', '92514582')).data;
    expect(model.attributes.state).to.equal('A');

    model = (await searcher.get(Session.INTERNAL_PRIVILEGED, 'master', 'identitymind-verifications', '92514582')).data;
    expect(model.attributes.state).to.equal('A');
  });

  it("Loads a new result if it is pending and over 10 hours old", async function() {
    await setup(factory => {
      factory.addResource('content-types', 'identitymind-verifications').withRelated('fields', [
        factory.addResource('fields', 'last-checked-at').withAttributes({
          fieldType: '@cardstack/core-types::date'
        }),
        factory.addResource('fields', 'state').withAttributes({
          fieldType: '@cardstack/core-types::string'
        })
      ]);

      factory.addResource('identitymind-verifications', '92514582')
        .withAttributes({
          'last-checked-at': moment().subtract(11, 'hour').format(),
          state: 'P'
        });
    });

    let scope = nock('https://test.identitymind.com')
      .get("/im/account/consumer/92514582")
      .basicAuth({ user: 'testuser', pass: 'testpass' })
      .reply(200, sampleResponse);


    let model = (await searcher.get(Session.INTERNAL_PRIVILEGED, 'master', 'identitymind-verifications', '92514582')).data;
    expect(model.attributes.state).to.equal('A');

    expect(scope.isDone()).to.be.ok;

    model = (await searcher.get(Session.INTERNAL_PRIVILEGED, 'master', 'identitymind-verifications', '92514582')).data;
    expect(model.attributes.state).to.equal('A');
  });



  it('fails to find the kyc when looking up kyc that is not your own', async function() {
    await setup();

    expect(nock.isActive()).to.be.true; // will error if http request is attempted

    await expect(
      searcher.get(session('user-with-different-kyc'), 'master', 'identitymind-verifications', '92514582')
    ).to.be.rejectedWith(Error, 'master/identitymind-verifications/92514582');
  });

  it('fails to find the kyc when looking up kyc if you have no KYC attached at all', async function() {
    await setup();

    expect(nock.isActive()).to.be.true; // will error if http request is attempted

    await expect(
      searcher.get(session('user-with-no-kyc'), 'master', 'identitymind-verifications', '92514582')
    ).to.be.rejectedWith(Error, 'master/identitymind-verifications/92514582');
  });

  it('fails to find the kyc when not logged in', async function() {
    await setup();

    expect(nock.isActive()).to.be.true; // will error if http request is attempted

    await expect(
      searcher.get(Session.EVERYONE, 'master', 'identitymind-verifications', '92514582')
    ).to.be.rejectedWith(Error, 'master/identitymind-verifications/92514582');
  });
});
