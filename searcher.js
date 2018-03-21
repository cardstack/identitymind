const { kycRetrieve } = require('./im');
const { declareInjections } = require('@cardstack/di');
const Session = require('@cardstack/plugin-utils/session');

module.exports = declareInjections({
  searcher: 'hub:searchers'
},

class IdentitymindSearcher {
  static create(...args) {
    return new this(...args);
  }
  constructor({ dataSource, config, searcher }) {
    this.config       = config;
    this.dataSource   = dataSource;
    this.searcher     = searcher;
  }

  async get(session, branch, type, id, next) {
    if (type === 'identitymind-verifications') {
      let user = (await this.searcher.searchInControllingBranch(Session.INTERNAL_PRIVILEGED, {
        filter: {
          type: this.config.userModel,
          [this.config.kycField]: { exact: id }
        }
      })).data[0];

      let data;

      if (user && session.payload.type === user.type && session.payload.id === user.id) {
        data = await this._getVerification(id);

        data.relationships = data.relationships || {};
        data.relationships.user = {
          data: {type: this.config.userModel, id: user.id}
        };
      } else {
        // return a dummy document here, if it's not found on the user it will
        // fail auth anyway which will be handled by the hub
        data = {
          id:   id,
          type: 'identitymind-verifications'
        };
      }

      return { data };
    }
    return next();
  }

  async search(session, branch, query, next) {
    return next();
  }

  async _getVerification(id) {
    let attributes = await kycRetrieve(id, this.config);

    return {
      type: 'identitymind-verifications',
      id,
      attributes
    };
  }


});
