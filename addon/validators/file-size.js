import BaseValidator from 'ember-cp-validations/validators/base';

const FileSize = BaseValidator.extend({
  validate(value, options, model, attribute) {
    let fileSize = model.get(`${attribute}FileSize`);

    if (fileSize === undefined) { // user hasn't specified file
      return options.notPresentMessage || "This file is required";
    }

    if (options.maxInMb && fileSize > (options.maxInMb * 1024 * 1024)) {
      return `The file you are trying to upload exceeds the file size limit of ${options.maxInMb} MB. Please try again.`;
    }
    if (options.minInMb && fileSize < (options.minInMb * 1024 * 1024)) {
      return `Your uploaded file must be larger than ${options.minInMb} MB`;
    }
    return true;
  }
});

FileSize.reopenClass({
  getDependentsFor(attribute/*, options*/) {
    return [`model.${attribute}FileSize`];
  }
});

export default FileSize;
