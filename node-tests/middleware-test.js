const supertest               = require('supertest');
const Koa                     = require('koa');
const Session                 = require('@cardstack/plugin-utils/session');
const JSONAPIFactory          = require('@cardstack/test-support/jsonapi-factory');
const sampleWebhook           = require('./fixtures/kyc-webhook.js');
const sampleResponse          = require('./fixtures/kyc-retrieve.js');
const samplePendingResponse   = require('./fixtures/kyc-retrieve-pending.js');
const nock                    = require('nock');
const { resolve }             = require('path');
const { promisify }           = require("util");
const pdfText                 = promisify(require('pdf-text'));


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

    factory.addResource('users', 'user-with-cached-kyc').withAttributes({
      'kyc-transaction': '92514583'
    });

    factory.addResource('content-types', 'identitymind-verifications').withRelated('fields',
      ['bfn','bln','dob','sco','bsn','bz','bc','bs','bco'].map(fieldName =>
        factory.addResource('fields', fieldName).withAttributes({
          fieldType: '@cardstack/core-types::string'
        })
      )
    );

    factory.addResource('identitymind-verifications', '92514583').withAttributes({
      bfn:  "Firstname",
      bln:  "Lastname",
      dob:  "1985-01-01",
      sco:  "GB",
      bsn:  "123 Acacia Avenue",
      bz:   "90210",
      bc:   "London",
      bs:   "England",
      bco:  "GB"
    });

    factory.addResource('users', 'user-without-kyc').withAttributes({
      'kyc-transaction': null
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

  it('handles requests with missing tid', async function() {
    expect(nock.isActive()).to.be.true; // will error if http request is attempted
    let response = await request.post(`/identitymind/consumer-callback`).send({tid: null});
    expect(response).hasStatus(400);
  });

  describe('identitymind/middleware/document-upload', function() {
    it('returns 401 if there is no user logged in', async function() {
      expect(nock.isActive()).to.be.true; // will error if http request is attempted
      await env.setUserId(null);
      let response = await request.post(`/identitymind/document-uploads`).send();
      expect(response).hasStatus(401);
    });

    it("returns 404 if there is a user logged in but they don't have a kyc transaction associated", async function() {
      expect(nock.isActive()).to.be.true; // will error if http request is attempted
      await env.setUserId('user-without-kyc');
      let response = await request.post(`/identitymind/document-uploads`).send();
      expect(response).hasStatus(404);
    });

    it("Returns 400 if there is a user logged in but they don't attach a file", async function() {
      expect(nock.isActive()).to.be.true; // will error if http request is attempted
      await env.setUserId('user-with-kyc');
      let response = await request.post(`/identitymind/document-uploads`).send();
      expect(response).hasStatus(400);
    });

    it("Returns 400 if they user is logged in and they attach a file with the wrong key", async function() {
      expect(nock.isActive()).to.be.true; // will error if http request is attempted
      await env.setUserId('user-with-kyc');
      let passportPath = resolve('./node-tests/fixtures/passport.jpg');
      let response = await request.post(`/identitymind/document-uploads`)
        .attach('somebadkey', passportPath);

      expect(response).hasStatus(400);
    });

    it("Uploads the document if there is a user logged in with a kyc transaction and they send a file", async function() {
      await env.setUserId('user-with-kyc');

      nock('https://test.identitymind.com')
        .post("/im/account/consumer/92514582/files", body => body.length > 10000)
        .basicAuth({ user: 'testuser', pass: 'testpass' })
        .reply(200);

      let passportPath = resolve('./node-tests/fixtures/passport.jpg');
      let response = await request.post(`/identitymind/document-uploads`)
        .attach('file', passportPath);

      expect(response).hasStatus(201);
    });
  });

  describe('identitymind/middleware/bcs-pdf', function() {
    it('returns 401 if there is no user logged in', async function() {
      expect(nock.isActive()).to.be.true; // will error if http request is attempted
      await env.setUserId(null);
      let response = await request.get(`/identitymind/bcs-pdf`).send();
      expect(response).hasStatus(401);
    });

    it("returns 404 if there is a user logged in but they don't have a kyc transaction associated", async function() {
      expect(nock.isActive()).to.be.true; // will error if http request is attempted
      await env.setUserId('user-without-kyc');
      let response = await request.get(`/identitymind/bcs-pdf`).send();
      expect(response).hasStatus(404);
    });

    it("Downloads the pdf if the user is logged in with a KYC transaction", async function() {
      expect(nock.isActive()).to.be.true; // will error if http request is attempted
      await env.setUserId('user-with-cached-kyc');
      let response = await request.get(`/identitymind/bcs-pdf`).send();

      expect(response).hasStatus(200);

      let textInPdf = (await pdfText(response.body)).join("\n");

      expect(textInPdf).to.contain("Firstname");
      expect(textInPdf).to.contain("Lastname");
      expect(textInPdf).to.contain("GB");
      expect(textInPdf).to.contain("123 Acacia Avenue, London, England, 90210");
      expect(textInPdf).to.contain("1985-01-01");
      expect(response.type).to.equal("application/pdf");

    });

  });
});
