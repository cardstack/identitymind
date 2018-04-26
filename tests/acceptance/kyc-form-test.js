import { module, test } from 'qunit';
import { setupApplicationTest } from 'ember-qunit';
import { click, fillIn, currentURL, visit, find } from '@ember/test-helpers';

const validInputValues = {
  bfn: 'Bill',
  bln: 'Wagby',
  bco: 'uk',
  sco: 'so',
  tea: 'bill@wagby.net',
  dob: '1999-01-01',
  bsn: '145 Penny Lane',
  bz: '10901',
  bc: 'Harpers Ferry',
  bs: 'NY',
  scanData: '',
  faceImageData: '',
  backsideImageData: ''
};

function uploadFile(selector) {
  let file = new Blob(['text-image'], {type : 'text/plain'});
  file.name = 'test.txt';

  find(selector).dispatchEvent(new CustomEvent('change', { detail: { testingFiles: [file] } }));
}

async function fillInKycField(field) {
  await fillIn(`#kyc-field_${field}`, validInputValues[field]);
}

module('Acceptance | content', function(hooks) {
  setupApplicationTest(hooks);

  test('validates the form fields', async function(assert) {
    await visit('/kyc');
    assert.equal(currentURL(), '/kyc');

    await click('button.submit');

    assert.dom('.field-error').exists({ count: 11 });

    await fillInKycField('bfn');
    await fillInKycField('bln');
    await fillInKycField('tea');
    await fillInKycField('bsn');
    await fillInKycField('bz');
    await fillInKycField('bc');
    await fillInKycField('bs');

    await click('button.submit');

    assert.dom('.field-error').exists({ count: 6 });

    uploadFile('#kyc-field_scanData');
    uploadFile('#kyc-field_backsideImageData');
    uploadFile('#kyc-field_faceImageData');

    await click('button.submit');
    
    assert.dom('.field-error').exists({ count: 3 });
  });

});