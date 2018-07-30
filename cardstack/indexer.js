const { isEqual, kebabCase, mapKeys }   = require('lodash');
const { kycRetrieve }                   = require('./im');
const moment                            = require('moment');
const log                               = require('@cardstack/logger')('cardstack/identitymind');

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

    let addField = (fieldName, type="@cardstack/core-types::string", relationships={}) => {
      let field = {
        type: 'fields',
        id: fieldName,
        attributes: {
          'field-type': type
        },
        relationships
      };
      schema.push(field);
      contentType.relationships.fields.data.push({type: 'fields', id: fieldName});
    };

    ['man', 'bfn', 'bln', 'bco', 'sco', 'tea', 'dob', 'bsn', 'bz', 'bc', 'bs',
    'upr', 'frn', 'frp', 'frd', 'mtid', 'state', 'erd', 'arpr', 'res', 'rcd',
    'scan-data', 'face-image-data', 'address-scan-data']
      .forEach(f => addField(f));

    addField('edna-score-card', '@cardstack/core-types::object');
    addField('user', '@cardstack/core-types::belongs-to', {
      'related-types': {
        data: [{ type: 'content-types', id: this.config.userModel }]
      }
    });


    addField('last-checked-at', '@cardstack/core-types::date');


    log.debug("Generated schema for IM plugin is:");
    log.debug(JSON.stringify(schema, null, 2));

    return schema;
  }

  async updateContent(meta, hints, ops) {
    if (hints) {

      for(let hint of hints) {
        if (hint.type === 'identitymind-verifications' && hint.source) {
          let data = await this._getVerification(hint.id);
          await ops.save('identitymind-verifications', hint.id, { data });
        }
      }

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
    for (let model of schema) {
      await ops.save(model.type, model.id, { data: model });
    }
    return {
      lastSchema: schema
    };
  }

  async _getVerification(id) {
    let response = await kycRetrieve(id, this.config);
    let attributes = mapKeys(response, (v, k) => kebabCase(k));

    attributes['last-checked-at'] = moment().format();

    return {
      type: 'identitymind-verifications',
      id,
      attributes
    };
  }

}
