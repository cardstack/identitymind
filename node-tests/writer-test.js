const {
  createDefaultEnvironment,
  destroyDefaultEnvironment
} = require('@cardstack/test-support/env');
const JSONAPIFactory  = require('@cardstack/test-support/jsonapi-factory');
const Session         = require('@cardstack/plugin-utils/session');
const sampleResponse  = require('./fixtures/kyc-create.js');
const nock            = require('nock');
const matches         = require('lodash.matches');
const DataURI         = require('datauri');
const parseDataUri    = require('parse-data-uri');


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

    await env.lookup('hub:indexers').update({ forceRefresh: true });

    writer = env.lookup('hub:writers');
    searcher = env.lookup('hub:searchers');
  });

  afterEach(async function() {
    expect(nock.activeMocks().length).to.equal(0, "There are active nock mocks that should have been called");
    await destroyDefaultEnvironment(env);
  });

  it('can send KYC data to identitymind', async function() {

    nock('https://test.identitymind.com')
      .post('/im/account/consumer', matches({man: 'test@example.com'}))
      .basicAuth({ user: 'testuser', pass: 'testpass' })
      .reply(200, sampleResponse);


    let created = await writer.create('master', new Session({ id: 'create-only', type: 'users'}), 'identitymind-verifications', {
      type: 'identitymind-verifications',
      attributes: {
        man:          'test@example.com'
      },
      relationships: {
        user: {
          data: {
            id: 'create-only',
            type: 'users'
          }
        }
      }
    });

    expect(created.type).to.equal('identitymind-verifications');
    expect(created.id).to.equal('92514582');

    // stores details from request
    expect(created.attributes.man).to.be.falsey;

    // stores details from response
    expect(created.attributes.rcd).to.equal('131,101,50005,150,202,1002');
  });

  it('associates the identitymind request with the user model', async function() {
    nock('https://test.identitymind.com')
      .post('/im/account/consumer', matches({man: 'test@example.com'}))
      .basicAuth({ user: 'testuser', pass: 'testpass' })
      .reply(200, sampleResponse);


    let session = new Session({ id: 'create-only', type: 'users'});

    await writer.create('master', session, 'identitymind-verifications', {
      type: 'identitymind-verifications',
      attributes: {
        man: 'test@example.com'
      },
      relationships: {
        user: {
          data: {
            id: 'create-only',
            type: 'users'
          }
        }
      }
    });

    let user = (await searcher.get(env.session, 'master', 'users', 'create-only')).data;

    expect(user.attributes['kyc-transaction']).to.equal("92514582");
  });

  describe("identitymind/writer/submission-rules", async function() {

    function imResponse(res, ruleName="DUPTRANSACTION") {
      return {
        "user": "UNKNOWN",
        "upr": "UNKNOWN",
        "ednaScoreCard": {
          "ar": {
              "result": "DISABLED"
          },
          "er": {
            "reportedRule": {
              "description": "Rule2360_RULE_DESC",
              "details": "[Fired] ed:35(false) = false",
              "name": ruleName,
            }
          }
        },
        "frn": "Unknown Fallthrough",
        "frp": "ACCEPT",
        "frd": "Fallthrough for transaction with an unknown entity. No other rules triggered.",
        "mtid": "92514582",
        "state": "P",
        "tid": "92514582",
        "erd": "Unknown User",
        "res": res,
        "rcd": "131,101,50005,150,202,1002"
      };
    }

    it("handles submission when the initial result without image data is accepted", async function() {
      nock('https://test.identitymind.com')
        .post('/im/account/consumer', body => body.stage === 1 && !body.scanData && !body.backsideImageData && !body.faceImageData)
        .basicAuth({ user: 'testuser', pass: 'testpass' })
        .reply(200, imResponse("ACCEPT"));

      nock('https://test.identitymind.com')
        .post("/im/account/consumer/92514582/files", body => body.includes("face image data content"))
        .basicAuth({ user: 'testuser', pass: 'testpass' })
        .reply(200);

      nock('https://test.identitymind.com')
        .post("/im/account/consumer/92514582/files", body => body.includes("backside image data content"))
        .basicAuth({ user: 'testuser', pass: 'testpass' })
        .reply(200);

      nock('https://test.identitymind.com')
        .post("/im/account/consumer/92514582/files", body => body.includes("scan data content"))
        .basicAuth({ user: 'testuser', pass: 'testpass' })
        .reply(200);

      let session = new Session({ id: 'create-only', type: 'users'});

      await writer.create('master', session, 'identitymind-verifications', {
        type: 'identitymind-verifications',
        attributes: {
          man:                'test@example.com',
          "scan-data":            dataUriText('scan data content'),
          'backside-image-data':  dataUriText('backside image data content'),
          "face-image-data":      dataUriText('face image data content')
        },
        relationships: {
          user: {
            data: {
              id: 'create-only',
              type: 'users'
            }
          }
        }
      });

    });

    it("handles submission when the initial result without image data is marked for review", async function() {
      nock('https://test.identitymind.com')
        .post('/im/account/consumer', body => body.stage === 1 && !body.scanData && !body.backsideImageData && !body.faceImageData)
        .basicAuth({ user: 'testuser', pass: 'testpass' })
        .reply(200, imResponse("MANUAL_REVIEW"));

      nock('https://test.identitymind.com')
        .post("/im/account/consumer/92514582/files", body => body.includes("face image data content"))
        .basicAuth({ user: 'testuser', pass: 'testpass' })
        .reply(200);

      nock('https://test.identitymind.com')
        .post("/im/account/consumer/92514582/files", body => body.includes("backside image data content"))
        .basicAuth({ user: 'testuser', pass: 'testpass' })
        .reply(200);

      nock('https://test.identitymind.com')
        .post("/im/account/consumer/92514582/files", body => body.includes("scan data content"))
        .basicAuth({ user: 'testuser', pass: 'testpass' })
        .reply(200);

      nock('https://test.identitymind.com')
        .post('/im/account/consumer', body =>
          body.stage === 2 &&
          dataUriFileText(body.scanData).includes("scan") &&
          dataUriFileText(body.backsideImageData).includes("backside") &&
          dataUriFileText(body.faceImageData).includes("face")
        )
        .basicAuth({ user: 'testuser', pass: 'testpass' })
        .reply(200, imResponse("MANUAL_REVIEW"));

      let session = new Session({ id: 'create-only', type: 'users'});

      await writer.create('master', session, 'identitymind-verifications', {
        type: 'identitymind-verifications',
        attributes: {
          man:                'test@example.com',
          "scan-data":            dataUriText('scan data content'),
          'backside-image-data':  dataUriText('backside image data content'),
          "face-image-data":      dataUriText('face image data content')
        },
        relationships: {
          user: {
            data: {
              id: 'create-only',
              type: 'users'
            }
          }
        }
      });

    });

    it("handles submission when the initial result is rejected for blacklist", async function() {
      nock('https://test.identitymind.com')
        .post('/im/account/consumer', body => body.stage === 1 && !body.scanData && !body.backsideImageData && !body.faceImageData)
        .basicAuth({ user: 'testuser', pass: 'testpass' })
        .reply(200, imResponse("DENY", "Blacklist"));

      nock('https://test.identitymind.com')
        .post("/im/account/consumer/92514582/files", body => body.includes("face image data content"))
        .basicAuth({ user: 'testuser', pass: 'testpass' })
        .reply(200);

      nock('https://test.identitymind.com')
        .post("/im/account/consumer/92514582/files", body => body.includes("backside image data content"))
        .basicAuth({ user: 'testuser', pass: 'testpass' })
        .reply(200);

      nock('https://test.identitymind.com')
        .post("/im/account/consumer/92514582/files", body => body.includes("scan data content"))
        .basicAuth({ user: 'testuser', pass: 'testpass' })
        .reply(200);

      let session = new Session({ id: 'create-only', type: 'users'});

      await writer.create('master', session, 'identitymind-verifications', {
        type: 'identitymind-verifications',
        attributes: {
          man:                'test@example.com',
          "scan-data":            dataUriText('scan data content'),
          'backside-image-data':  dataUriText('backside image data content'),
          "face-image-data":      dataUriText('face image data content')
        },
        relationships: {
          user: {
            data: {
              id: 'create-only',
              type: 'users'
            }
          }
        }
      });

    });

    it("handles submission when the initial result is rejected for sanctions", async function() {
      nock('https://test.identitymind.com')
        .post('/im/account/consumer', body => body.stage === 1 && !body.scanData && !body.backsideImageData && !body.faceImageData)
        .basicAuth({ user: 'testuser', pass: 'testpass' })
        .reply(200, imResponse("DENY", "Sanctions"));

      nock('https://test.identitymind.com')
        .post("/im/account/consumer/92514582/files", body => body.includes("face image data content"))
        .basicAuth({ user: 'testuser', pass: 'testpass' })
        .reply(200);

      nock('https://test.identitymind.com')
        .post("/im/account/consumer/92514582/files", body => body.includes("backside image data content"))
        .basicAuth({ user: 'testuser', pass: 'testpass' })
        .reply(200);

      nock('https://test.identitymind.com')
        .post("/im/account/consumer/92514582/files", body => body.includes("scan data content"))
        .basicAuth({ user: 'testuser', pass: 'testpass' })
        .reply(200);

      let session = new Session({ id: 'create-only', type: 'users'});

      await writer.create('master', session, 'identitymind-verifications', {
        type: 'identitymind-verifications',
        attributes: {
          man:                'test@example.com',
          "scan-data":            dataUriText('scan data content'),
          'backside-image-data':  dataUriText('backside image data content'),
          "face-image-data":      dataUriText('face image data content')
        },
        relationships: {
          user: {
            data: {
              id: 'create-only',
              type: 'users'
            }
          }
        }
      });

    });

    it("handles submission when the initial result is rejected with other fraud rules", async function() {
      nock('https://test.identitymind.com')
        .post('/im/account/consumer', body => body.stage === 1 && !body.scanData && !body.backsideImageData && !body.faceImageData)
        .basicAuth({ user: 'testuser', pass: 'testpass' })
        .reply(200, imResponse("DENY", "Some Other Reason"));

      nock('https://test.identitymind.com')
        .post("/im/account/consumer/92514582/files", body => body.includes("face image data content"))
        .basicAuth({ user: 'testuser', pass: 'testpass' })
        .reply(200);

      nock('https://test.identitymind.com')
        .post("/im/account/consumer/92514582/files", body => body.includes("backside image data content"))
        .basicAuth({ user: 'testuser', pass: 'testpass' })
        .reply(200);

      nock('https://test.identitymind.com')
        .post("/im/account/consumer/92514582/files", body => body.includes("scan data content"))
        .basicAuth({ user: 'testuser', pass: 'testpass' })
        .reply(200);

      nock('https://test.identitymind.com')
        .post('/im/account/consumer', body =>
          body.stage === 2 &&
          dataUriFileText(body.scanData).includes("scan") &&
          dataUriFileText(body.backsideImageData).includes("backside") &&
          dataUriFileText(body.faceImageData).includes("face")
        )
        .basicAuth({ user: 'testuser', pass: 'testpass' })
        .reply(200, imResponse("ACCEPT"));

      let session = new Session({ id: 'create-only', type: 'users'});

      await writer.create('master', session, 'identitymind-verifications', {
        type: 'identitymind-verifications',
        attributes: {
          man:                'test@example.com',
          "scan-data":            dataUriText('scan data content'),
          'backside-image-data':  dataUriText('backside image data content'),
          "face-image-data":      dataUriText('face image data content')
        },
        relationships: {
          user: {
            data: {
              id: 'create-only',
              type: 'users'
            }
          }
        }
      });

    });
  });
});

function dataUriText(text) {
  let datauri = new DataURI();
  datauri.format('.txt', text);
  return datauri.content;
}

function dataUriFileText(dataUri) {
  return parseDataUri(dataUri).data;
}