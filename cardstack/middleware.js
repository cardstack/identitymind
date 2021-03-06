const { declareInjections }   = require('@cardstack/di');
const route                   = require('koa-better-route');
const jsonBody                = require('koa-json-body')({ limit: '500kb' });
const compose                 = require('koa-compose');
const moment                  = require('moment');
const asyncBusboy             = require('async-busboy');
const Pdf                     = require('./pdf');
const Session                 = require('@cardstack/plugin-utils/session');
const Handlebars              = require('handlebars');
const { s3Upload }            = require('./s3');
const mime                    = require('mime-types');

module.exports = declareInjections({
  indexer:    'hub:indexers',
  sources:    'hub:data-sources',
  searcher:   'hub:searchers',
  writer:     'hub:writers',
  messenger:  'hub:messengers'
},

class IdentityMindMiddleware {
  constructor() {
    this.after = 'authentication';
  }

  middleware() {
    return compose([
      this._webhookMiddleware(),
      this._pdfMiddleware(),
      this._fileUploadMiddleware(),
      this._fileUploadPreFlight()
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
      await this.indexer.update({ hints: [{ type: "identitymind-verifications", id: body.tid, source: 'webhook' }] });


      let config = await this.pluginConfig();

      let user = (await this.searcher.searchInControllingBranch(Session.INTERNAL_PRIVILEGED, {
        filter: {
          type: config.userModel,
          [config.kycField]: { exact: body.tid }
        }
      })).data[0];

      let name = user.attributes[config.nameField];
      let email = user.attributes[config.emailField];

      let text = renderHbs(config.textEmailTemplate, { name });
      let html = renderHbs(config.htmlEmailTemplate, { name });

      await this.messenger.send(config.messageSinkId, {
        to:       email,
        subject:  config.kycStatusEmailSubject,
        from:     config.emailFrom,
        text,
        html
      });

      ctxt.status = 200;
    });
  }

  _pdfMiddleware() {
    return route.get('/identitymind/bcs-pdf', async (ctxt) => {
      let pdf = new Pdf(ctxt.request.query);
      ctxt.status = 200;
      ctxt.body = pdf.toStream();
      ctxt.type = 'pdf';
      let filename = `FormA-${encodeURIComponent(ctxt.request.query.name)}${encodeURIComponent(ctxt.request.query.surname)}.pdf`;
      ctxt.response.set('Content-Disposition', `attachment; filename="${filename}"`);
    });
  }

  _fileUploadMiddleware() {
    return route.post('/identitymind/document-uploads', async (ctxt) => {

      let user = await this._checkKycUser(ctxt);
      if (!user) { return; }

      let config = await this.pluginConfig();
      let kycTransactionId = user.data.attributes[config.kycField];

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

      let name = user.data.attributes[config.nameField];
      if (name.match(/^[ -~]+$/)) { // match all printable ascii characters
        name = name.replace(/\s+/g, '');
      } else {
        name = kycTransactionId;
      }

      let key = `${kycTransactionId}/FormA-${name}.${mime.extension(file.mimeType)}`;

      await s3Upload(key, file);

      user.data.attributes[config.formAField] = 'PENDING';
      user.data.attributes[config.formATimestampField] = moment().format();

      await this.writer.update(this.searcher.controllingBranch.name, Session.INTERNAL_PRIVILEGED, user.data.type, user.data.id, user);

      addCorsHeaders(ctxt.response);
      ctxt.body = {status: "uploaded"};
      ctxt.status = 201;
    });
  }

  _fileUploadPreFlight() {
    return route.options('/identitymind/document-uploads',  async (ctxt) => {
      addCorsHeaders(ctxt.response);
      ctxt.status = 200;
    });
  }

  async _checkKycUser(ctxt) {
    let { cardstackSession } = ctxt.state;

    if (!cardstackSession) {
      ctxt.status = 401;
      ctxt.body = "Session required to access this endpoint";
      return;
    }

    let { payload } = cardstackSession;
    let searcher = cardstackSession.userSearcher.get || cardstackSession.userSearcher;

    let user = await searcher(payload.type, payload.id);

    let config = await this.pluginConfig();

    let kycTransactionId = user.data.attributes[config.kycField];

    if (!kycTransactionId) {
      ctxt.status = 404;
      ctxt.body = "This user has no kyc transaction associated with them";
      return;
    }

    return user;
  }

});

function errorThrower(err) {
  if (err) { throw err; }
}

function addCorsHeaders(response) {
  response.set('Access-Control-Allow-Origin', '*');
  response.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  response.set('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

function renderHbs(template, context) {
  let compiled = Handlebars.compile(template);
  return compiled(context);
}
