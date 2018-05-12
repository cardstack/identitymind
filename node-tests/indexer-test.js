const Koa             = require('koa');
const Session         = require('@cardstack/plugin-utils/session');
const JSONAPIFactory  = require('@cardstack/test-support/jsonapi-factory');
const sampleResponse  = require('./fixtures/kyc-retrieve.js');
const nock            = require('nock');
const moment          = require('moment');

const {
  createDefaultEnvironment,
  destroyDefaultEnvironment
} = require('@cardstack/test-support/env');

describe('identitymind/indexer', function() {

  let env, searcher;

  async function setup() {
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

    env = await createDefaultEnvironment(`${__dirname}/..`, factory.getModels());

    let app = new Koa();
    app.use(env.lookup('hub:middleware-stack').middleware());

    await env.lookup('hub:indexers').update({ forceRefresh: true });
    searcher = env.lookup('hub:searchers');
  }

  async function teardown() {
    await destroyDefaultEnvironment(env);
    expect(nock.activeMocks().length).to.equal(0, "There are active nock mocks that should have been called");
  }

  beforeEach(setup);
  afterEach(teardown);

  it("Doesn't index a transaction when not asked to do so with hints", async function() {
    expect(nock.isActive()).to.be.true; // will error if http request is attempted
    await env.lookup('hub:indexers').update({ forceRefresh: true });
  });

  it("Looks up a transaction when asked to do so with hints with a source", async function() {
    nock('https://test.identitymind.com')
      .get("/im/account/consumer/92514582")
      .basicAuth({ user: 'testuser', pass: 'testpass' })
      .reply(200, sampleResponse);

    await env.lookup('hub:indexers').update({ forceRefresh: true, hints: [{type: 'identitymind-verifications', id: "92514582", source: 'tests'}] });
    let model = (await searcher.get(Session.INTERNAL_PRIVILEGED, 'master', 'identitymind-verifications', '92514582')).data;
    expect(model.attributes.state).to.equal('A');

    // attributes should be kebab-cased
    expect(model.attributes['edna-score-card']).to.be.ok;

    // last checked at should be stored
    let lastChecked = model.attributes['last-checked-at'];
    expect(lastChecked).to.be.afterMoment(moment().subtract(2, 'seconds'));
    expect(lastChecked).to.be.beforeMoment(moment());
  });

  it("Doesn't index a transaction when asked to do so with hints without a source", async function() {
    expect(nock.isActive()).to.be.true; // will error if http request is attempted
    await env.lookup('hub:indexers').update({ forceRefresh: true, hints: [{type: 'identitymind-verifications', id: "92514582"}] });
  });
});

