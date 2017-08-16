/*!
 * A CredentialHintsService provides the implementation for the
 * CredentialHints instances on a particular remote origin.
 *
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

import {SimpleContainerService} from 'web-request-mediator';

const ITEM_TYPE = 'credentialHint';

export class CredentialHintsService extends SimpleContainerService {
  constructor(relyingOrigin, {permissionManager}) {
    super(relyingOrigin, {
      itemType: ITEM_TYPE,
      permissionManager,
      requiredPermission: 'credentialhandler',
      validateKey: _validateCredentialHintKey,
      validateItem: _validateCredentialHint
    });
  }

  /**
   * Return all CredentialHints for a credential handler that match the
   * given CredentialRequestOptions. The matches will be returned in an array
   * with the tuples:
   *
   * {
   *   credentialHandler: <url>,
   *   credentialHintKey: <choiceKey>,
   *   credentialHint: <CredentialHint>
   * }
   *
   * @param url the URL that identifies the credential handler to check.
   * @param credentialRequestOptions the credential request options.
   *
   * @return a Promise that resolves to an array of credential handler and
   *           CredentialHint tuples.
   */
  static async _matchCredentialRequest(url, credentialRequestOptions) {
    return SimpleContainerService._match(
      url, ITEM_TYPE, ({handler, key, item}) => {
      // TODO: implement matching algorithm using `credentialRequestOptions`
      return {
        credentialHandler: handler,
        credentialHintKey: key,
        CredentialHint: item
      };
    });
  }

  /**
   * Return all CredentialHints for a credential handler that match the
   * given WebCredential. The matches will be returned in an array with the
   * tuples:
   *
   * {
   *   credentialHandler: <url>,
   *   credentialHintKey: <choiceKey>,
   *   credentialHint: <CredentialHint>
   * }
   *
   * @param url the URL that identifies the credential handler to check.
   * @param credential the WebCredential.
   *
   * @return a Promise that resolves to an array of credential handler and
   *           CredentialHint tuples.
   */
  static async _matchCredential(url, credential) {
    return SimpleContainerService._match(
      url, ITEM_TYPE, ({handler, key, item}) => {
      // TODO: hints can be potentially matched based on matching information
      //   with the new WebCredential, e.g. if it's a `verifiableProfile` then
      //   the subject ID in the hint "capabilities" would match that of
      //   `credential.data.id`
      return {
        credentialHandler: handler,
        credentialHintKey: key,
        CredentialHint: item
      };
    });
  }

  static async _destroy(url) {
    return SimpleContainerService._destroy(url, ITEM_TYPE);
  }
}

function _validateCredentialHint(hint) {
  // TODO:
  if(!(hint && typeof hint === 'object')) {
    throw new TypeError('"hint" must be an object.');
  }
  if(typeof hint.name !== 'string') {
    throw new TypeError('"hint.name" must be a string.');
  }
  if(hint.icons) {
    if(!Array.isArray(hint.icons)) {
      throw new TypeError('"hint.icons" must be an array.');
    }
    hint.icons.forEach(_validateImageObject);
  }
  if(hint.enabledTypes) {
    if(!Array.isArray(hint.enabledTypes)) {
      throw new TypeError('"hint.icons" must be an array.');
    }
    hint.enabledTypes.forEach(_validateCredentialType);
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

function _validateCredentialHintKey(hintKey) {
  if(typeof hintKey !== 'string') {
    throw new TypeError('"hintKey" must be a string.');
  }
}
