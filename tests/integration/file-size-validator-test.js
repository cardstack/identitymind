import EmberObject from '@ember/object';
import FileSizeValidator from 'dummy/validators/file-size';
import { validator, buildValidations } from 'ember-cp-validations';
import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

module('Integration | Validations | File Size', function(hooks) {
  setupTest(hooks);

  
  test('no options', function(assert) {
    assert.expect(1);
    
    let validator = this.owner.lookup('validator:file-size');
    let builtOptions = validator.buildOptions({}).toObject();

    try {
      validator.validate(undefined, builtOptions);
    } catch (e) {
      assert.ok(true);
    }
  });

  test('file-size validator is triggered by dependent key', function(assert) {
    this.owner.register('validator:file-size', FileSizeValidator);

    let FileSizeValidations = buildValidations({
      favoriteSelfie: validator('file-size', {
        minInMb: 1,
        maxInMb: 4,
        notPresentMessage: 'I wanna see your selfie!'
      })
    });

    let obj = EmberObject.extend(FileSizeValidations).create(this.owner.ownerInjection(), {
      favoriteSelfie: null
    });

    assert.equal(obj.get('validations.attrs.favoriteSelfie.isValid'), false, 'favoriteSelfieFileSize has not been set');
    assert.equal(obj.get('validations.attrs.favoriteSelfie.message'), 'I wanna see your selfie!', 'error message is correct');
    
    obj.set('favoriteSelfieFileSize', 238746);
    
    assert.equal(obj.get('validations.attrs.favoriteSelfie.isValid'), false, 'file is too small');
    assert.equal(obj.get('validations.attrs.favoriteSelfie.message'), 'Your uploaded file must be larger than 1MB', 'error message is correct');

    obj.set('favoriteSelfieFileSize', 23987420);
    
    assert.equal(obj.get('validations.attrs.favoriteSelfie.isValid'), false, 'file is too large');
    assert.equal(obj.get('validations.attrs.favoriteSelfie.message'), 'Your uploaded file must be smaller than 4MB', 'error message is correct');
  });

  test('use default not present message', function(assert) {
    this.owner.register('validator:file-size', FileSizeValidator);

    let FileSizeValidations = buildValidations({
      favoriteSelfie: validator('file-size', {
        minInMb: 1,
        maxInMb: 4
      })
    });

    let obj = EmberObject.extend(FileSizeValidations).create(this.owner.ownerInjection(), {
      favoriteSelfie: null
    });

    assert.equal(obj.get('validations.attrs.favoriteSelfie.isValid'), false, 'favoriteSelfieFileSize has not been set');
    assert.equal(obj.get('validations.attrs.favoriteSelfie.message'), 'This file is required', 'error message is correct');
  });
});