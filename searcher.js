const { declareInjections }   = require('@cardstack/di');
const Session                 = require('@cardstack/plugin-utils/session');
const moment                  = require('moment');

module.exports = declareInjections({
  searcher: 'hub:searchers',
  indexer:  'hub:indexers'
},

class IdentitymindSearcher {
  static create(...args) {
    return new this(...args);
  }
  constructor({ dataSource, config, searcher, indexer }) {
    this.config       = config;
    this.dataSource   = dataSource;
    this.searcher     = searcher;
    this.indexer      = indexer;
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

      let isLoggedInAsSameUser = user && session.payload.type === user.type && session.payload.id === user.id;
      let isPrivilegedSession = Session.INTERNAL_PRIVILEGED === session;


      if (isLoggedInAsSameUser || isPrivilegedSession) {
        let existingRecord = await next();

        if (!existingRecord) {
          return await this.reindexThenSearchAgain(session, branch, id);
        }

        if (!await this.isFresh(existingRecord)) {
          return await this.reindexThenSearchAgain(session, branch, id);
        }

        data = existingRecord.data;

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
    return await next();
  }

  async search(session, branch, query, next) {
    return next();
  }

  async reindexThenSearchAgain(session, branch, id) {
    await this.indexer.update({ hints: [{ type: "identitymind-verifications", id }] });
    return await this.searcher.get(session, branch, 'identitymind-verifications', id);
  }

  async isFresh({ data: {attributes} }) {
    if (attributes.state === 'A') {
      // Accepted records are always fresh
      return true;
    }

    return moment(attributes['last-checked-at']) > moment().subtract(10, 'hours');
  }


});
