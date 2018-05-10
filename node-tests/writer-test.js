const {
  createDefaultEnvironment,
  destroyDefaultEnvironment
} = require('@cardstack/test-support/env');
const JSONAPIFactory  = require('@cardstack/test-support/jsonapi-factory');
const sampleResponse  = require('./fixtures/kyc-create.js');
const nock            = require('nock');
const matches         = require('lodash.matches');
const DataURI         = require('datauri');
const supertest       = require('supertest');
const Koa             = require('koa');
const moment          = require('moment');
const { s3 }          = require('../cardstack/s3');
const sinon           = require('sinon');


describe('identitymind/writer', function() {
  let env, writer, searcher, sessions, request;

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
            kycField:   'kyc-transaction',
            emailField: 'email',
            nameField:  'name'
          }
        }
      });

    factory.addResource('content-types', 'users').withRelated('fields', [
      factory.addResource('fields', 'kyc-transaction').withAttributes({
        fieldType: '@cardstack/core-types::string'
      }),
      factory.addResource('fields', 'email').withAttributes({
        fieldType: '@cardstack/core-types::string'
      }),
      factory.addResource('fields', 'name').withAttributes({
        fieldType: '@cardstack/core-types::string'
      })
    ]);

    factory.addResource('users', 'create-only').withAttributes({
      email: 'goodemail@example.com',
      name: 'Goodfirst Goodlast'
    });

    env = await createDefaultEnvironment(`${__dirname}/..`, factory.getModels());

    await env.lookup('hub:indexers').update({ forceRefresh: true });

    writer = env.lookup('hub:writers');
    searcher = env.lookup('hub:searchers');
    sessions = env.lookup('hub:sessions');

    let app = new Koa();
    app.use(env.lookup('hub:middleware-stack').middleware());
    request = supertest(app.callback());

    sinon.replace(s3, 'upload', sinon.fake.returns({ promise() { return Promise.resolve(); } }));
  });

  afterEach(async function() {
    expect(nock.activeMocks().length).to.equal(0, "There are active nock mocks that should have been called");
    sinon.restore();
    await destroyDefaultEnvironment(env);
  });

  it('can send KYC data to identitymind', async function() {

    nock('https://test.identitymind.com')
      .post('/im/account/consumer', matches({bsn: '123 a street'}))
      .basicAuth({ user: 'testuser', pass: 'testpass' })
      .reply(200, sampleResponse);


    let created = await writer.create('master', sessions.create('users', 'create-only'), 'identitymind-verifications', {
      type: 'identitymind-verifications',
      attributes: {
        bsn:          '123 a street'
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
    // dasherizes keys
    expect(created.attributes['edna-score-card']).to.be.ok;

    let lastChecked = created.attributes['last-checked-at'];
    expect(lastChecked).to.be.ok;
    expect(lastChecked).to.be.afterMoment(moment().subtract(2, 'seconds'));
    expect(lastChecked).to.be.beforeMoment(moment());
  });

  it('associates the identitymind request with the user model', async function() {
    nock('https://test.identitymind.com')
      .post('/im/account/consumer', matches({bsn: '123 a street'}))
      .basicAuth({ user: 'testuser', pass: 'testpass' })
      .reply(200, sampleResponse);


    let session = sessions.create('users', 'create-only');

    await writer.create('master', session, 'identitymind-verifications', {
      type: 'identitymind-verifications',
      attributes: {
        bsn: '123 a street'
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

  it("doesn't allow overriding the user's email", async function() {
    nock('https://test.identitymind.com')
      .post('/im/account/consumer', matches({tea: 'goodemail@example.com'}))
      .basicAuth({ user: 'testuser', pass: 'testpass' })
      .reply(200, sampleResponse);


    let session = sessions.create('users', 'create-only');

    await writer.create('master', session, 'identitymind-verifications', {
      type: 'identitymind-verifications',
      attributes: {
        tea: 'bademail@example.com'
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

  it("allows overriding the user's name", async function() {
    nock('https://test.identitymind.com')
      .post('/im/account/consumer', matches({man: 'New Name', bfn: 'New', bln: 'Name'}))
      .basicAuth({ user: 'testuser', pass: 'testpass' })
      .reply(200, sampleResponse);


    let session = sessions.create('users', 'create-only');

    await writer.create('master', session, 'identitymind-verifications', {
      type: 'identitymind-verifications',
      attributes: {
        man: 'New Name',
        bfn: 'New',
        bln: 'Name'
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


  it('sends the IP address of the user to IM from the session', async function() {
    nock('https://test.identitymind.com')
      .post('/im/account/consumer', matches({ip: '1.2.3.4'}))
      .basicAuth({ user: 'testuser', pass: 'testpass' })
      .reply(200, sampleResponse);


    let session = sessions.create('users', 'create-only', {ip: '1.2.3.4'});

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
        .post('/im/account/consumer', body => body.stage === 1 && !body.scanData && !body.addressScanData && !body.faceImageData)
        .basicAuth({ user: 'testuser', pass: 'testpass' })
        .reply(200, imResponse("ACCEPT"));



      let session = sessions.create('users', 'create-only');

      await writer.create('master', session, 'identitymind-verifications', {
        type: 'identitymind-verifications',
        attributes: {
          man:                'test@example.com',
          "scan-data":            dataUriText('scan data content'),
          'address-scan-data':    dataUriText('address scan data content'),
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

      expect(s3.upload).to.have.callCount(4);
      expect(s3.upload).to.have.been.calledWithMatch({ Body: Buffer.from("scan data content"), Key: "92514582/Scan Data.txt" });
      expect(s3.upload).to.have.been.calledWithMatch({ Body: Buffer.from("address scan data content"), Key: "92514582/Address Scan Data.txt" });
      expect(s3.upload).to.have.been.calledWithMatch({ Body: Buffer.from("face image data content"), Key: "92514582/Face Image Data.txt" });
      expect(s3.upload).to.have.been.calledWithMatch({ Key: "92514582/FormA-92514582 (Blank).pdf" });
    });

    it("It does the correct amount of requests when requesting via the api", async function() {
      await env.setUser('users', 'create-only');

      nock('https://test.identitymind.com')
        .post('/im/account/consumer', body => body.stage === 1 && !body.scanData && !body.addressScanData && !body.faceImageData)
        .basicAuth({ user: 'testuser', pass: 'testpass' })
        .reply(200, imResponse("ACCEPT"));



      let doc = {
        data: {
          type: 'identitymind-verifications',
          attributes: {
            man:                'test@example.com',
            "scan-data":            dataUriText('scan data content'),
            "face-image-data":      dataUriText('face image data content'),
            "address-scan-data":    dataUriText('address scan data content')
          },
          relationships: {
            user: {
              data: {
                id: 'create-only',
                type: 'users'
              }
            }
          }
        }
      };

      let response = await request.post(`/api/identitymind-verifications`).send(doc);
      expect(response).hasStatus(201);

      expect(s3.upload).to.have.callCount(4);
      expect(s3.upload).to.have.been.calledWithMatch({ Body: Buffer.from("scan data content"), Key: "92514582/Scan Data.txt" });
      expect(s3.upload).to.have.been.calledWithMatch({ Body: Buffer.from("address scan data content"), Key: "92514582/Address Scan Data.txt" });
      expect(s3.upload).to.have.been.calledWithMatch({ Body: Buffer.from("face image data content"), Key: "92514582/Face Image Data.txt" });
      expect(s3.upload).to.have.been.calledWithMatch({ Key: "92514582/FormA-92514582 (Blank).pdf" });
    });

    it("Allows uploading large files", async function() {
      await env.setUser('users', 'create-only');

      nock('https://test.identitymind.com')
        .post('/im/account/consumer', body => body.stage === 1 && !body.scanData && !body.addressScanData && !body.faceImageData)
        .basicAuth({ user: 'testuser', pass: 'testpass' })
        .reply(200, imResponse("ACCEPT"));



      let fourMegsOf = (c) => c.repeat(4 * 1000 * 1000);

      let doc = {
        data: {
          type: 'identitymind-verifications',
          attributes: {
            man:                'test@example.com',
            "scan-data":            dataUriText(fourMegsOf("a")),
            "address-scan-data":    dataUriText(fourMegsOf("b")),
            "face-image-data":      dataUriText(fourMegsOf("c"))
          },
          relationships: {
            user: {
              data: {
                id: 'create-only',
                type: 'users'
              }
            }
          }
        }
      };

      let response = await request.post(`/api/identitymind-verifications`).send(doc);
      expect(response.status).to.equal(201);

      expect(s3.upload).to.have.callCount(4);

    });


    it("handles submission when the initial result without image data is marked for review", async function() {
      nock('https://test.identitymind.com')
        .post('/im/account/consumer', body => body.stage === 1 && !body.scanData && !body.addressScanData && !body.faceImageData)
        .basicAuth({ user: 'testuser', pass: 'testpass' })
        .reply(200, imResponse("MANUAL_REVIEW"));


      let session = sessions.create('users', 'create-only');

      await writer.create('master', session, 'identitymind-verifications', {
        type: 'identitymind-verifications',
        attributes: {
          man:                'test@example.com',
          "scan-data":            dataUriText('scan data content'),
          'address-scan-data':    dataUriText('address scan data content'),
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

      expect(s3.upload).to.have.callCount(4);
      expect(s3.upload).to.have.been.calledWithMatch({ Body: Buffer.from("scan data content"), Key: "92514582/Scan Data.txt" });
      expect(s3.upload).to.have.been.calledWithMatch({ Body: Buffer.from("address scan data content"), Key: "92514582/Address Scan Data.txt" });
      expect(s3.upload).to.have.been.calledWithMatch({ Body: Buffer.from("face image data content"), Key: "92514582/Face Image Data.txt" });
      expect(s3.upload).to.have.been.calledWithMatch({ Key: "92514582/FormA-92514582 (Blank).pdf" });

    });

    it("handles submission when the initial result is rejected for blacklist", async function() {
      nock('https://test.identitymind.com')
        .post('/im/account/consumer', body => body.stage === 1 && !body.scanData && !body.addressScanData && !body.faceImageData)
        .basicAuth({ user: 'testuser', pass: 'testpass' })
        .reply(200, imResponse("DENY", "Blacklist"));

      let session = sessions.create('users', 'create-only');

      await writer.create('master', session, 'identitymind-verifications', {
        type: 'identitymind-verifications',
        attributes: {
          man:                'test@example.com',
          "scan-data":            dataUriText('scan data content'),
          'address-scan-data':    dataUriText('address scan data content'),
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

      expect(s3.upload).to.have.callCount(4);
      expect(s3.upload).to.have.been.calledWithMatch({ Body: Buffer.from("scan data content"), Key: "92514582/Scan Data.txt" });
      expect(s3.upload).to.have.been.calledWithMatch({ Body: Buffer.from("address scan data content"), Key: "92514582/Address Scan Data.txt" });
      expect(s3.upload).to.have.been.calledWithMatch({ Body: Buffer.from("face image data content"), Key: "92514582/Face Image Data.txt" });
      expect(s3.upload).to.have.been.calledWithMatch({ Key: "92514582/FormA-92514582 (Blank).pdf" });
    });

    it("handles submission when the initial result is rejected for sanctions", async function() {
      nock('https://test.identitymind.com')
        .post('/im/account/consumer', body => body.stage === 1 && !body.scanData && !body.addressScanData && !body.faceImageData)
        .basicAuth({ user: 'testuser', pass: 'testpass' })
        .reply(200, imResponse("DENY", "Sanctions"));

      let session = sessions.create('users', 'create-only');

      await writer.create('master', session, 'identitymind-verifications', {
        type: 'identitymind-verifications',
        attributes: {
          man:                'test@example.com',
          "scan-data":            dataUriText('scan data content'),
          'address-scan-data':    dataUriText('address scan data content'),
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

      expect(s3.upload).to.have.callCount(4);
      expect(s3.upload).to.have.been.calledWithMatch({ Body: Buffer.from("scan data content"), Key: "92514582/Scan Data.txt" });
      expect(s3.upload).to.have.been.calledWithMatch({ Body: Buffer.from("address scan data content"), Key: "92514582/Address Scan Data.txt" });
      expect(s3.upload).to.have.been.calledWithMatch({ Body: Buffer.from("face image data content"), Key: "92514582/Face Image Data.txt" });
      expect(s3.upload).to.have.been.calledWithMatch({ Key: "92514582/FormA-92514582 (Blank).pdf" });
    });

    it("handles submission when the initial result is rejected with other fraud rules", async function() {
      nock('https://test.identitymind.com')
        .post('/im/account/consumer', body => body.stage === 1 && !body.scanData && !body.addressScanData && !body.faceImageData)
        .basicAuth({ user: 'testuser', pass: 'testpass' })
        .reply(200, imResponse("DENY", "Some Other Reason"));

      let session = sessions.create('users', 'create-only');

      await writer.create('master', session, 'identitymind-verifications', {
        type: 'identitymind-verifications',
        attributes: {
          man:                'test@example.com',
          "scan-data":            dataUriText('scan data content'),
          'address-scan-data':    dataUriText('address scan data content'),
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

      expect(s3.upload).to.have.callCount(4);
      expect(s3.upload).to.have.been.calledWithMatch({ Body: Buffer.from("scan data content"), Key: "92514582/Scan Data.txt" });
      expect(s3.upload).to.have.been.calledWithMatch({ Body: Buffer.from("address scan data content"), Key: "92514582/Address Scan Data.txt" });
      expect(s3.upload).to.have.been.calledWithMatch({ Body: Buffer.from("face image data content"), Key: "92514582/Face Image Data.txt" });
      expect(s3.upload).to.have.been.calledWithMatch({ Key: "92514582/FormA-92514582 (Blank).pdf" });

    });
  });
});

function dataUriText(text) {
  let datauri = new DataURI();
  datauri.format('.txt', text);
  return datauri.content;
}
