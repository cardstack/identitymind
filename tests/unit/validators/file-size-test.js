import { moduleFor, test } from 'ember-qunit';

moduleFor('validator:file-size', 'Unit | Validator | file-size', {
  needs: ['validator:messages']
});

test('it works', function(assert) {
  const validator = this.subject();
  assert.ok(validator);
});
