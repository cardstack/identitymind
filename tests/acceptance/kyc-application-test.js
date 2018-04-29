import { module, test } from 'qunit';
import { setupApplicationTest } from 'ember-qunit';
import { click, currentURL, visit } from '@ember/test-helpers';
import { fillInKycField, uploadFile } from '../helpers/form-helpers';

module('Acceptance | content', function(hooks) {
  setupApplicationTest(hooks);

  test('validates the form fields', async function(assert) {
    await visit('/kyc');
    assert.equal(currentURL(), '/kyc');

    await click('button.submit');

    assert.dom('.field-error').exists({ count: 10 });

    await fillInKycField('bfn');
    await fillInKycField('bln');
    await fillInKycField('tea');
    await fillInKycField('bsn');
    await fillInKycField('bz');
    await fillInKycField('bc');
    await fillInKycField('bs');

    await click('button.submit');

    assert.dom('.field-error').exists({ count: 5 });

    uploadFile('#kyc-field_scanData');
    uploadFile('#kyc-field_faceImageData');

    await click('button.submit');

    assert.dom('.field-error').exists({ count: 3 });
  });

});