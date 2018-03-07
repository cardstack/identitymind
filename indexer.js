const { isEqual } = require('lodash');

module.exports = class Indexer {

  static create(...args) {
    return new this(...args);
  }

  constructor() {
  }

  async branches() {
    return ['master'];
  }

  async beginUpdate() {
    return new Updater();
  }
};

class Updater {

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

    return schema;
  }

  async updateContent(meta, hints, ops) {
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
}
