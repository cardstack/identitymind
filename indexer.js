const { isEqual }       = require('lodash');
const { kycRetrieve }   = require('./im');

module.exports = class Indexer {

  static create(...args) {
    return new this(...args);
  }

  constructor({ config }) {
    this.config = config;
  }

  async branches() {
    return ['master'];
  }

  async beginUpdate() {
    return new Updater({config: this.config});
  }
};

class Updater {

  constructor({ config }) {
    this.config = config;
  }

  async schema() {

    let contentType = {
      type: 'content-types',
      id: 'identitymind-verifications',
      attributes: {
      },
      relationships: {
        fields: { data: [] },
        'data-source': {
          data: {type: 'data-sources', id: 'identitymind'}
        }
      }
    };

    let schema = [contentType];

    let addField = (fieldName, type="@cardstack/core-types::string") => {
      let field = {
        type: 'fields',
        id: fieldName,
        attributes: {
          'field-type': type
        }
      };
      schema.push(field);
      contentType.relationships.fields.data.push({type: 'fields', id: fieldName});
    };

    ['man', 'bfn', 'bln', 'bco', 'sco', 'tea', 'dob', 'bsn', 'bz', 'bc', 'bs',
    'user', 'upr', 'frn', 'frp', 'frd', 'mtid', 'state', 'erd', 'arpr', 'res',
    'rcd'].forEach(f => addField(f));


    addField('ednaScoreCard', '@cardstack/core-types::object');
    addField('user', '@cardstack/core-types::belongs-to');

    addField('last-checked-at', '@cardstack/core-types::date');

    let addGrant = (id, attributes, who)  => {
      let grant = {
        id,
        type: 'grants',
        attributes,
        relationships: {
          types: {
            data: [{type: 'content-types', id: 'identitymind-verifications'}]
          },
          who: {
            data: who
          }
        }
      };

      schema.push(grant);
    };

    addGrant('grant-kyc-creation', {
      "may-create-resource":  true,
      "may-update-resource":  false,
      "may-delete-resource":  false,
      "may-write-fields":     true
    }, {type: 'groups', id: 'everyone'});

    addGrant('grant-kyc-retrieval', {
      "may-read-resource": true,
      "may-read-fields": true
    }, {type: 'fields', id: 'user'});

    return schema;
  }

  async updateContent(meta, hints, ops) {
    if (hints) {
      await ops.beginReplaceAll();

      for(let hint of hints) {
        if (hint.type === 'identitymind-verifications') {
          let data = await this._getVerification(hint.id);
          await ops.save('identitymind-verifications', hint.id, data);
        }
      }

      await ops.finishReplaceAll();
    } else {
      return await this.updateSchema(meta, ops);
    }

  }

  async updateSchema(meta, ops) {
    let schema = await this.schema();

    if (meta) {
      let { lastSchema } = meta;
      if (isEqual(lastSchema, schema)) {
        return;
      }
    }
    await ops.beginReplaceAll();
    for (let model of schema) {
      await ops.save(model.type, model.id, model);
    }
    await ops.finishReplaceAll();

    return {
      lastSchema: schema
    };
  }

  async read(type, id, isSchema) {
    if (isSchema) {
      return (await this.schema()).find(model => model.type === type && model.id === model.id);
    }
  }

  async _getVerification(id) {
    let attributes = await kycRetrieve(id, this.config);

    return {
      type: 'identitymind-verifications',
      id,
      attributes
    };
  }

}
