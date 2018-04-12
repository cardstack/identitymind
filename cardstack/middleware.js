const { declareInjections }   = require('@cardstack/di');
const route                   = require('koa-better-route');
const jsonBody                = require('koa-json-body')({ limit: '500kb' });
const compose                 = require('koa-compose');
const { docUpload }           = require('./im');
const asyncBusboy             = require('async-busboy');


module.exports = declareInjections({
  indexer: 'hub:indexers',
  sources: 'hub:data-sources'
},

class IdentityMindMiddleware {
  constructor() {
    this.after = 'authentication';
  }

  middleware() {
    return compose([
      this._webhookMiddleware(),
      this._fileUploadMiddleware()
    ]);
  }

  async pluginConfig() {
    let sources = await this.sources.active();
    let source = sources.get('identitymind');
    return source.writer.config;
  }

  _webhookMiddleware() {
    return route.post('/identitymind/consumer-callback',  async (ctxt) => {
      await jsonBody(ctxt, errorThrower);
      let { body } = ctxt.request;

      if (!body.tid) {
        ctxt.status = 400;
        return;
      }

      // Lookup the verification that is posted to refresh it from the api
      this.indexer.update({ hints: [{ type: "identitymind-verifications", id: body.tid }] });

      ctxt.status = 200;
    });
  }

  _fileUploadMiddleware() {
    return route.post('/identitymind/document-uploads', async (ctxt) => {
      let { cardstackSession } = ctxt.state;

      if (!cardstackSession) {
        ctxt.status = 401;
        ctxt.body = "Session required to upload documents";
        return;
      }

      let { payload } = cardstackSession;

      let user = await cardstackSession.userSearcher(payload.type, payload.id);

      let kycTransactionId = user.data.attributes['kyc-transaction'];

      if (!kycTransactionId) {
        ctxt.status = 404;
        ctxt.body = "This user has no kyc transaction associated with them";
        return;
      }

      let fileResponse;

      try {
        fileResponse = await asyncBusboy(ctxt.req);
      } catch (e) {
        ctxt.status = 400;
        ctxt.body = "Please upload a file using a multipart request";
        return;
      }

      let { files } = fileResponse;

      let file = files.find(f => f.fieldname === 'file');

      if (!file) {
        ctxt.status = 400;
        ctxt.body = "Please upload a file in the 'file' field";
        return;
      }

      let config = await this.pluginConfig();
      await docUpload(kycTransactionId, file, config);

      ctxt.status = 201;
    });
  }

});

function errorThrower(err) {
  if (err) { throw err; }
}