/*!
 * A CredentialChoiceService provides the implementation for the
 * CredentialChoices instances on a particular remote origin.
 *
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

import {SimpleContainerService} from 'web-request-mediator';

export class CredentialChoicesService extends SimpleContainerService {
  constructor(relyingOrigin, {permissionManager}) {
    super(relyingOrigin, {
      itemType: 'credentialChoice',
      permissionManager,
      requiredPermission: 'credentialhandler',
      validateKey: _validateChoiceKey,
      validateItem: _validateCredentialChoice
    });
  }

  /**
   * Return all CredentialChoices for a credential handler that match the
   * given CredentialRequestOptions. The matches will be returned in an array
   * with the tuples:
   *
   * {
   *   credentialHandler: <url>,
   *   credentialChoiceKey: <choiceKey>,
   *   credentialChoice: <CredentialChoice>
   * }
   *
   * @param url the URL that identifies the credential handler to check.
   * @param credentialRequestOptions the credential request options.
   *
   * @return a Promise that resolves to an array of credential handler and
   *           CredentialChoice tuples.
   */
  static async _matchCredentialRequest(url, credentialRequestOptions) {
    return SimpleContainerService._match(
      url, 'credentialChoice', ({handler, key, item}) => {
      // TODO: implement matching algorithm using `credentialRequestOptions`
      return {
        credentialHandler: handler,
        credentialChoiceKey: key,
        credentialChoice: item
      };
    });
  }

  static async _destroy(url) {
    return SimpleContainerService._destroy(url, 'credentialChoice');
  }
}

function _validateCredentialChoice(details) {
  // TODO:
  if(!(details && typeof details === 'object')) {
    throw new TypeError('"details" must be an object.');
  }
  if(typeof details.name !== 'string') {
    throw new TypeError('"details.name" must be a string.');
  }
  if(details.icons) {
    if(!Array.isArray(details.icons)) {
      throw new TypeError('"details.icons" must be an array.');
    }
    details.icons.forEach(_validateImageObject);
  }
  if(details.enabledTypes) {
    if(!Array.isArray(details.enabledTypes)) {
      throw new TypeError('"details.icons" must be an array.');
    }
    details.enabledTypes.forEach(_validateCredentialType);
  }
}

function _validateImageObject(imageObject) {
  if(!(imageObject && typeof imageObject === 'object')) {
    throw new TypeError('"icon" must be an object.');
  }
  if(typeof imageObject.src !== 'string') {
    throw new TypeError('"icon.src" must be a string.');
  }
  if(typeof imageObject.sizes !== 'string') {
    throw new TypeError('"icon.sizes" must be a string.');
  }
  if(typeof imageObject.type !== 'string') {
    throw new TypeError('"icon.type" must be a string.');
  }
}

function _validateCredentialType(credentialType) {
  if(typeof credentialType !== 'string') {
    throw new TypeError('"credentialType" must be a string.');
  }
}

function _validateChoiceKey(choiceKey) {
  if(typeof choiceKey !== 'string') {
    throw new TypeError('"choiceKey" must be a string.');
  }
}
