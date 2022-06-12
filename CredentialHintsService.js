/*!
 * Copyright (c) 2017-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {SimpleContainerService} from 'web-request-mediator';

const ITEM_TYPE = 'credentialHint';

/* Note: The hints service has been deprecated for use by credential handler
developers. It is only used by the mediator internally now. All previously
public APIs have been converted into no-ops with console warnings. */

/* A CredentialHintsService provides the implementation for the
CredentialHints instances on a particular remote origin. */
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

  async delete() {
    this._deprecateNotice();
    return false;
  }

  async get() {
    this._deprecateNotice();
    return null;
  }

  async keys() {
    this._deprecateNotice();
    return [];
  }

  async has() {
    this._deprecateNotice();
    return false;
  }

  async clear() {
    this._deprecateNotice();
  }

  _deprecateNotice() {
    console.warn('Credential hints are deprecated and no longer used.');
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
        // hint must support a `dataType` if `enabledTypes` is present
        if(item.enabledTypes) {
          let match = false;
          const dataTypes = Object.keys(credentialRequestOptions.web);
          for(const dataType of dataTypes) {
            if(item.enabledTypes.includes(dataType)) {
              match = true;
              break;
            }
          }
          if(!match) {
            return false;
          }
        }
        // TODO: implement any additional match algorithm using
        // `credentialRequestOptions`?
        return {
          credentialHandler: handler,
          credentialHintKey: key,
          credentialHint: item
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
        // hint must support credential `dataType` if `enabledTypes` is present
        if(item.enabledTypes &&
          !item.enabledTypes.includes(credential.dataType)) {
          return false;
        }

        // check `match` field on hint if present, otherwise hint matches
        if('match' in item) {
          const matches = item.match[credential.dataType];
          if(matches) {
            // TODO: support deep compare?
            for(const key in matches) {
              if(credential.data[key] !== matches[key]) {
                return false;
              }
            }
          }
        }

        return {
          credentialHandler: handler,
          credentialHintKey: key,
          credentialHint: item
        };
      });
  }

  static async _set(url, key, hint) {
    return SimpleContainerService._getStorage(url, ITEM_TYPE)
      .setItem(key, hint);
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
  if(!Array.isArray(hint.enabledTypes)) {
    throw new TypeError('"hint.enabledTypes" must be an array.');
  }
  hint.enabledTypes.forEach(_validateCredentialType);

  if('match' in hint) {
    if(typeof hint.match !== 'object') {
      throw new TypeError('"hint.match" must be an object.');
    }
    for(const key in hint.match) {
      _validateCredentialType(key);
      if(!(hint.match[key] && typeof hint.match[key] === 'object')) {
        throw new TypeError('"hint.match" entries must be objects.');
      }
    }
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
  // TODO: ensure `imageObject.fetchedImage` is set and contains a data URL
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
