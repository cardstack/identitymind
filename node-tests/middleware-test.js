const supertest               = require('supertest');
const Koa                     = require('koa');
const Session                 = require('@cardstack/plugin-utils/session');
const JSONAPIFactory          = require('@cardstack/test-support/jsonapi-factory');
const sampleWebhook           = require('./fixtures/kyc-webhook.js');
const sampleResponse          = require('./fixtures/kyc-retrieve.js');
const samplePendingResponse   = require('./fixtures/kyc-retrieve-pending.js');
const nock                    = require('nock');

const {
  createDefaultEnvironment,
  destroyDefaultEnvironment
} = require('@cardstack/test-support/env');

describe('identitymind/middleware', function() {

  let request, env, searcher;

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
    request = supertest(app.callback());

    await env.lookup('hub:indexers').update({ realTime: true });
    searcher = env.lookup('hub:searchers');
  }

  async function teardown() {
    await destroyDefaultEnvironment(env);
  }

  beforeEach(setup);
  afterEach(teardown);

  it('updates an existing kyc transaction', async function() {
    nock('https://test.identitymind.com')
      .get("/im/account/consumer/92514582")
      .basicAuth({ user: 'testuser', pass: 'testpass' })
      .reply(200, samplePendingResponse);

    let model = (await searcher.get(Session.INTERNAL_PRIVILEGED, 'master', 'identitymind-verifications', '92514582')).data;


    expect(model.attributes.state).to.equal('P');

    let scope = nock('https://test.identitymind.com')
      .get("/im/account/consumer/92514582")
      .basicAuth({ user: 'testuser', pass: 'testpass' })
      .reply(200, sampleResponse);

    let response = await request.post(`/identitymind/consumer-callback`).send(sampleWebhook);
    expect(response).hasStatus(200);

    // The webhook should only trigger indexing, not wait for it
    expect(scope.isDone()).to.not.be.ok;

    await env.lookup('hub:indexers').update({ realTime: true });

    // the indexing process should be triggered with hints from the webhook, so
    // the indexer should have made the http request by now
    expect(scope.isDone()).to.be.ok;

    model = (await searcher.get(Session.INTERNAL_PRIVILEGED, 'master', 'identitymind-verifications', '92514582')).data;

    expect(model.attributes.state).to.equal('A');
  });

});
