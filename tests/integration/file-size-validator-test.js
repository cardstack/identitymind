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
    assert.equal(obj.get('validations.attrs.favoriteSelfie.message'), 'The file must be at least 1 MB in size. Please try again.', 'error message is correct');

    obj.set('favoriteSelfieFileSize', 23987420);

    assert.equal(obj.get('validations.attrs.favoriteSelfie.isValid'), false, 'file is too large');
    assert.equal(obj.get('validations.attrs.favoriteSelfie.message'), 'The file you are trying to upload exceeds the file size limit of 4 MB. Please try again.', 'error message is correct');
  });

  test('can specify minInKb', function(assert) {
    this.owner.register('validator:file-size', FileSizeValidator);

    let FileSizeValidations = buildValidations({
      favoriteSelfie: validator('file-size', {
        minInKb: 400
      })
    });

    let obj = EmberObject.extend(FileSizeValidations).create(this.owner.ownerInjection(), {
      favoriteSelfie: null
    });

    obj.set('favoriteSelfieFileSize', 238746);

    assert.equal(obj.get('validations.attrs.favoriteSelfie.isValid'), false, 'file is too small');
    assert.equal(obj.get('validations.attrs.favoriteSelfie.message'), 'The file must be at least 400 KB in size. Please try again.', 'error message is correct');
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
