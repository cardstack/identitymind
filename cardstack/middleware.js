const { declareInjections }   = require('@cardstack/di');
const route                   = require('koa-better-route');
const jsonBody                = require('koa-json-body')({ limit: '500kb' });
const compose                 = require('koa-compose');

module.exports = declareInjections({
  indexer: 'hub:indexers'
},

class IdentityMindMiddleware {
  constructor() {
    this.before = 'authentication';
  }

  middleware() {
    return compose([
      this._webhookMiddleware()
    ]);
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

});

function errorThrower(err) {
  if (err) { throw err; }
}