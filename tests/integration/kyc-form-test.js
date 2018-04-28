import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, click } from '@ember/test-helpers';
import { uploadFile, fillInKycField } from '../helpers/form-helpers';
import setupMirage from 'ember-cli-mirage/test-support/setup-mirage';
import hbs from 'htmlbars-inline-precompile';
import Service from '@ember/service';

const sessionStub = Service.extend({
  init() {
    this._super(...arguments);
    this.user = {
      reload: async function() {
        return new Promise(resolve => {
          resolve();
        });
      }
    }
  }
});

module('Integration | Component | KYC form hooks', function(hooks) {
  setupRenderingTest(hooks);
  setupMirage(hooks);

  test('it renders', async function(assert) {
    await render(hbs`{{kyc-form}}`);

    assert.dom('legend').hasText('Submission Form');
    assert.dom('.kyc-field').exists({ count: 13 });
  });

  test('hooks are fired', async function(assert) {
    assert.expect(2);

    this.owner.register('service:cardstack-session', sessionStub);

    this.set('doSomething', () => {
      assert.ok(true, 'hook is called');
    });

    await render(hbs`{{kyc-form postSubmit=(action doSomething) willSaveModel=(action doSomething)}}`);

    await fillInKycField('bfn');
    await fillInKycField('bln');
    await fillInKycField('tea');
    await fillInKycField('bsn');
    await fillInKycField('bz');
    await fillInKycField('bc');
    await fillInKycField('bs');
    await fillInKycField('bco');
    await fillInKycField('sco');
    await fillInKycField('dob');

    uploadFile('#kyc-field_scanData');
    uploadFile('#kyc-field_backsideImageData');
    uploadFile('#kyc-field_faceImageData');

    await click('button.submit');
  });

  test('hasErrors hook is fired', async function(assert) {
    assert.expect(1);

    this.set('doSomething', () => {
      assert.ok(true, 'hook is called');
    });

    await render(hbs`{{kyc-form hasErrors=(action doSomething)}}`);
    await click('button.submit');
  });
});
