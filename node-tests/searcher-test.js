const {
  createDefaultEnvironment,
  destroyDefaultEnvironment
} = require('@cardstack/test-support/env');
const JSONAPIFactory = require('@cardstack/test-support/jsonapi-factory');
const Session = require('@cardstack/plugin-utils/session');
const sampleResponse = require('./fixtures/kyc-retrieve.js');
const nock = require('nock');

describe('identitymind/writer', function() {
  let env, searcher;

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
        mayReadResource: true,
        mayReadFields: true,
      })
      .withRelated('who', { type: 'groups', id: 'everyone' })
      .withRelated('types', [
        { type: 'content-types', id: 'identitymind-verifications' }
      ]);


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

    let model = (await searcher.get(Session.EVERYONE, 'master', 'identitymind-verifications', '92514582')).data;

    expect(model.type).to.equal('identitymind-verifications');
    expect(model.id).to.equal('92514582');

    // stores details from response
    expect(model.attributes.state).to.equal('A');
  });
});
