/* eslint-env node */
const JSONAPIFactory = require('@cardstack/test-support/jsonapi-factory');

function initialModels() {
  let factory = new JSONAPIFactory();

  factory.addResource('content-types', 'identitymind-verifications').withRelated('fields', [
    factory.addResource('fields', 'man').withAttributes({ fieldType: '@cardstack/core-types::string' }),
    factory.addResource('fields', 'bfn').withAttributes({ fieldType: '@cardstack/core-types::string' }),
    factory.addResource('fields', 'bln').withAttributes({ fieldType: '@cardstack/core-types::string' }),
    factory.addResource('fields', 'bco').withAttributes({ fieldType: '@cardstack/core-types::string' }),
    factory.addResource('fields', 'sco').withAttributes({ fieldType: '@cardstack/core-types::string' }),
    factory.addResource('fields', 'tea').withAttributes({ fieldType: '@cardstack/core-types::string' }),
    factory.addResource('fields', 'dob').withAttributes({ fieldType: '@cardstack/core-types::string' }),
    factory.addResource('fields', 'bsn').withAttributes({ fieldType: '@cardstack/core-types::string' }),
    factory.addResource('fields', 'bz').withAttributes({ fieldType: '@cardstack/core-types::string' }),
    factory.addResource('fields', 'bc').withAttributes({ fieldType: '@cardstack/core-types::string' }),
    factory.addResource('fields', 'bs').withAttributes({ fieldType: '@cardstack/core-types::string' }),
    factory.addResource('fields', 'upr').withAttributes({ fieldType: '@cardstack/core-types::string' }),
    factory.addResource('fields', 'frn').withAttributes({ fieldType: '@cardstack/core-types::string' }),
    factory.addResource('fields', 'frp').withAttributes({ fieldType: '@cardstack/core-types::string' }),
    factory.addResource('fields', 'frd').withAttributes({ fieldType: '@cardstack/core-types::string' }),
    factory.addResource('fields', 'mtid').withAttributes({ fieldType: '@cardstack/core-types::string' }),
    factory.addResource('fields', 'state').withAttributes({ fieldType: '@cardstack/core-types::string' }),
    factory.addResource('fields', 'erd').withAttributes({ fieldType: '@cardstack/core-types::string' }),
    factory.addResource('fields', 'arpr').withAttributes({ fieldType: '@cardstack/core-types::string' }),
    factory.addResource('fields', 'res').withAttributes({ fieldType: '@cardstack/core-types::string' }),
    factory.addResource('fields', 'rcd').withAttributes({ fieldType: '@cardstack/core-types::string' }),
    factory.addResource('fields', 'scan-data').withAttributes({ fieldType: '@cardstack/core-types::string' }),
    factory.addResource('fields', 'face-image-data').withAttributes({ fieldType: '@cardstack/core-types::string' }),
    factory.addResource('fields', 'edna-score-card').withAttributes({ fieldType: '@cardstack/core-types::object' }),
    factory.addResource('fields', 'last-checked-at').withAttributes({ fieldType: '@cardstack/core-types::date' }),
    factory.addResource('fields', 'user')
      .withAttributes({ fieldType: '@cardstack/core-types::belongs-to' })
      .withRelated('related-types', [{ type: 'content-types', id: 'users' }])
  ]);

  factory.addResource('content-types', 'users').withRelated('fields', [
    factory.addResource('fields', 'kyc-transaction').withAttributes({ fieldType: '@cardstack/core-types::string' })
  ]);

  return factory.getModels();
}

module.exports = initialModels();

