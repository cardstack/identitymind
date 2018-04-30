import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';
import { hubURL } from '@cardstack/plugin-utils/environment';


module('Integration | Helper | identitymind-pdf-url', function(hooks) {
  setupRenderingTest(hooks);

  test('it renders pdf url', async function(assert) {
    this.set('inputValue', '1234');

    await render(hbs`{{identitymind-pdf-url name="first" surname="last" dob="date" nationality="British" country="UK" address="123 Acacia Avenue"}}`);

    assert.equal(this.element.textContent.trim(), `${hubURL}/identitymind/bcs-pdf?name=first&surname=last&dob=date&nationality=British&country=UK&address=123%20Acacia%20Avenue`);
  });
});
