import { module, test } from 'qunit';
import { setupApplicationTest } from 'ember-qunit';
import { click, currentURL, visit, waitUntil, waitFor } from '@ember/test-helpers';
import { fillInKycField, uploadFile, fillInRequiredFields } from '../helpers/form-helpers';
import { acceptedCreateResponse } from '../helpers/fixtures';
import setupMirage from 'ember-cli-mirage/test-support/setup-mirage';

module('Acceptance | KYC Application', function(hooks) {
  setupApplicationTest(hooks);
  setupMirage(hooks);

  test('validates the form fields', async function(assert) {
    await visit('/kyc');
    assert.equal(currentURL(), '/kyc');

    assert.dom('.kyc-field').exists({ count: 13 });

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
    uploadFile('#kyc-field_addressScanData');
    uploadFile('#kyc-field_faceImageData');

    await click('button.submit');

    assert.dom('.field-error').exists({ count: 3 });
  });

  test('show a spinner while waiting for response', async function(assert) {
    server.post('/identitymind-verifications', () => {
      return acceptedCreateResponse;
    });

    await visit('/kyc');
    assert.equal(currentURL(), '/kyc');

    await fillInRequiredFields();

    let submitPromise = click('button.submit');

    await waitFor('.kyc-processing');

    await submitPromise;

    await waitUntil(() => currentURL() === '/');
  });
});