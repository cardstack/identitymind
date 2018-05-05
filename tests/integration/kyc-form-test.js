import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, click } from '@ember/test-helpers';
import { fillInRequiredFields } from '../helpers/form-helpers';
import { acceptedCreateResponse } from '../helpers/fixtures';
import setupMirage from 'ember-cli-mirage/test-support/setup-mirage';
import hbs from 'htmlbars-inline-precompile';

module('Integration | Component | KYC form hooks', function(hooks) {
  setupRenderingTest(hooks);
  setupMirage(hooks);

  test('it renders', async function(assert) {
    await render(hbs`{{kyc-form}}`);

    assert.dom('legend').hasText('Submission Form');
    assert.dom('.kyc-field').exists({ count: 12 });
  });

  test('happy path hooks are fired', async function(assert) {
    assert.expect(2);

    server.post('/identitymind-verifications', () => {
      return acceptedCreateResponse;
    });

    this.set('doSomething', () => {
      assert.ok(true, 'hook is called');
    });

    await render(hbs`{{kyc-form postSubmit=(action doSomething) willSaveModel=(action doSomething)}}`);
    await fillInRequiredFields();
    await click('button.submit');
  });
  
  test('hasValidationErrors hook is fired', async function(assert) {
    assert.expect(1);

    this.set('doSomething', () => {
      assert.ok(true, 'hook is called');
    });

    await render(hbs`{{kyc-form hasValidationErrors=(action doSomething)}}`);
    await click('button.submit');
  });
  
  test('hasNetworkError hook is fired', async function(assert) {
    assert.expect(1);

    server.post('/identitymind-verifications', { errors: ['something went wrong, dawg.'] }, 400);

    this.set('handleError', (err) => {
      assert.equal(err.errors[0], 'something went wrong, dawg.', `hook is called`);
    });

    await render(hbs`{{kyc-form hasNetworkError=(action handleError)}}`);
    await fillInRequiredFields();
    await click('button.submit');
  });

  test('pre-populate name and email fields if user is passed in', async function(assert) {
    await render(hbs`{{kyc-form defaultFirstName='Bill' defaultLastName='Wagby' defaultEmail='bill@wagby.net'}}`);

    assert.dom('#kyc-field_bfn').hasValue('Bill', 'first name is correct');
    assert.dom('#kyc-field_bln').hasValue('Wagby', 'last name is correct');
    assert.dom('#kyc-field_tea').hasValue('bill@wagby.net', 'email is correct');
  });
});
