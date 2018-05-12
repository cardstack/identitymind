const supertest               = require('supertest');
const Koa                     = require('koa');
const Session                 = require('@cardstack/plugin-utils/session');
const JSONAPIFactory          = require('@cardstack/test-support/jsonapi-factory');
const sampleWebhook           = require('./fixtures/kyc-webhook.js');
const sampleResponse          = require('./fixtures/kyc-retrieve.js');
const samplePendingResponse   = require('./fixtures/kyc-retrieve-pending.js');
const TestMessenger           = require('@cardstack/test-support-messenger/messenger');
const nock                    = require('nock');
const { resolve }             = require('path');
const { promisify }           = require("util");
const pdfText                 = promisify(require('pdf-text'));
const { s3 }                  = require('../cardstack/s3');
const sinon                   = require('sinon');
const moment                  = require('moment');

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
            kycField:   'kyc-transaction',
            formAField: 'form-a-status',
            formATimestampField: 'form-a-timestamp',
            nameField:  'full-legal-name',
            emailField: 'email',
            messageSinkId: 'email-sink',
            textEmailTemplate: `Hello, {{name}}

The status of your KYC application has changed.
To see the changes please log in to your dashboard.

Thank you,
Cardstack team
`,
            htmlEmailTemplate: `Hello, <b>{{name}}</b>

The status of your KYC application has <b>changed</b>.
To see the changes please log in to your dashboard.

Thank you,
Cardstack team
`,
            emailFrom: "from@example.com",
            kycStatusEmailSubject: "KYC Status has changed",

          }
        }
      });

    factory.addResource('message-sinks', 'email-sink').withAttributes({
      messengerType: '@cardstack/test-support-messenger'
    });

    factory.addResource('content-types', 'users').withRelated('fields', [
      factory.addResource('fields', 'kyc-transaction').withAttributes({
        fieldType: '@cardstack/core-types::string'
      }),
      factory.addResource('fields', 'form-a-status').withAttributes({
        fieldType: '@cardstack/core-types::string'
      }),
      factory.addResource('fields', 'form-a-timestamp').withAttributes({
        fieldType: '@cardstack/core-types::date'
      }),
      factory.addResource('fields', 'full-legal-name').withAttributes({
        fieldType: '@cardstack/core-types::string'
      }),
      factory.addResource('fields', 'email').withAttributes({
        fieldType: '@cardstack/core-types::string'
      })
    ]);

    factory.addResource('users', 'user-with-kyc').withAttributes({
      'kyc-transaction':  '92514582',
      'form-a-status':    'INITIAL',
      'full-legal-name':  'Mr Test User',
      'email':            'testuser@example.com'
    });

    factory.addResource('users', 'user-with-kyc-and-non-ascii-name').withAttributes({
      'kyc-transaction':  '92514583',
      'form-a-status':    'INITIAL',
      'full-legal-name':  'Mr Têst Üser',
      'email':            'testuser@example.com'
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

    factory.addResource('users', 'user-without-kyc').withAttributes({
      'kyc-transaction': null
    });

    env = await createDefaultEnvironment(`${__dirname}/..`, factory.getModels());

    let app = new Koa();
    app.use(env.lookup('hub:middleware-stack').middleware());
    request = supertest(app.callback());

    await env.lookup('hub:indexers').update({ forceRefresh: true });
    searcher = env.lookup('hub:searchers');

    sinon.replace(s3, 'upload', sinon.fake.returns({ promise() { return Promise.resolve(); } }));
  }

  async function teardown() {
    await destroyDefaultEnvironment(env);
    sinon.restore();
    expect(nock.activeMocks().length).to.equal(0, "There are active nock mocks that should have been called");
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

    await env.lookup('hub:indexers').update({ forceRefresh: true });

    // the indexing process should be triggered with hints from the webhook, so
    // the indexer should have made the http request by now
    expect(scope.isDone()).to.be.ok;

    model = (await searcher.get(Session.INTERNAL_PRIVILEGED, 'master', 'identitymind-verifications', '92514582')).data;

    expect(model.attributes.state).to.equal('A');

    let sentMessages = await TestMessenger.sentMessages(env);
    expect(sentMessages).has.length(1, 'sent messages has the wrong length');

    let { message } = sentMessages[0];

    expect(message.to).to.equal('testuser@example.com');
    expect(message.from).to.equal('from@example.com');
    expect(message.subject).to.equal("KYC Status has changed");
    expect(message.text).to.match(/Hello, Mr Test User/);
    expect(message.html).to.match(/Hello, <b>Mr Test User<\/b>/);


  });

  it('handles requests with missing tid', async function() {
    expect(nock.isActive()).to.be.true; // will error if http request is attempted
    let response = await request.post(`/identitymind/consumer-callback`).send({tid: null});
    expect(response).hasStatus(400);
  });

  describe('identitymind/middleware/document-upload', function() {
    it('returns 401 if there is no user logged in', async function() {
      expect(nock.isActive()).to.be.true; // will error if http request is attempted
      await env.setUser(null);
      let response = await request.post(`/identitymind/document-uploads`).send();
      expect(response).hasStatus(401);
    });

    it("returns 404 if there is a user logged in but they don't have a kyc transaction associated", async function() {
      expect(nock.isActive()).to.be.true; // will error if http request is attempted
      await env.setUser('users', 'user-without-kyc');
      let response = await request.post(`/identitymind/document-uploads`).send();
      expect(response).hasStatus(404);
    });

    it("Returns 400 if there is a user logged in but they don't attach a file", async function() {
      expect(nock.isActive()).to.be.true; // will error if http request is attempted
      await env.setUser('users', 'user-with-kyc');
      let response = await request.post(`/identitymind/document-uploads`).send();
      expect(response).hasStatus(400);
    });

    it("Returns 400 if they user is logged in and they attach a file with the wrong key", async function() {
      expect(nock.isActive()).to.be.true; // will error if http request is attempted
      await env.setUser('users', 'user-with-kyc');
      let passportPath = resolve('./node-tests/fixtures/passport.jpg');
      let response = await request.post(`/identitymind/document-uploads`)
        .attach('somebadkey', passportPath);

      expect(response).hasStatus(400);
    });

    it("Uploads the document if there is a user logged in with a kyc transaction and they send a file", async function() {
      await env.setUser('users', 'user-with-kyc');

      let passportPath = resolve('./node-tests/fixtures/passport.jpg');
      let response = await request.post(`/identitymind/document-uploads`)
        .attach('file', passportPath);

      expect(response).hasStatus(201);

      let user = (await searcher.get(env.session, 'master', 'users', 'user-with-kyc')).data;

      expect(user.attributes['form-a-status']).to.equal("PENDING");

      let timestamp = user.attributes['form-a-timestamp'];
      expect(timestamp).to.be.ok;
      expect(timestamp).to.be.afterMoment(moment().subtract(2, 'seconds'));
      expect(timestamp).to.be.beforeMoment(moment());

      expect(s3.upload).to.have.been.called.once;
      expect(s3.upload).to.have.been.calledWithMatch({ Key: "92514582/FormA-MrTestUser.pdf" });
    });

    it("Uploads the document with the transaction id if there are non-ascii characters in the user's name", async function() {
      await env.setUser('users', 'user-with-kyc-and-non-ascii-name');

      let passportPath = resolve('./node-tests/fixtures/passport.jpg');
      let response = await request.post(`/identitymind/document-uploads`)
        .attach('file', passportPath);

      expect(response).hasStatus(201);

      let user = (await searcher.get(env.session, 'master', 'users', 'user-with-kyc-and-non-ascii-name')).data;

      expect(user.attributes['form-a-status']).to.equal("PENDING");

      let timestamp = user.attributes['form-a-timestamp'];
      expect(timestamp).to.be.ok;
      expect(timestamp).to.be.afterMoment(moment().subtract(2, 'seconds'));
      expect(timestamp).to.be.beforeMoment(moment());

      expect(s3.upload).to.have.been.called.once;
      expect(s3.upload).to.have.been.calledWithMatch({ Key: "92514583/FormA-92514583.pdf" });

    });
  });

  describe('identitymind/middleware/bcs-pdf', function() {
    it("Downloads the pdf", async function() {
      expect(nock.isActive()).to.be.true; // will error if http request is attempted
      let data = {
        name:         "Firstname",
        surname:      "Lastname",
        dob:          "1985-01-01",
        nationality:  "GB",
        address:      "123 Acacia Avenue, London, England, 90210",
        country:      "GB",
      };
      let response = await request.get(`/identitymind/bcs-pdf`).query(data).send();

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
