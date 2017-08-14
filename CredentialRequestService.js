/*!
 * A CredentialRequestService provides the implementation for
 * CredentialChoice.discoverFromExternalSource for a particular remote origin.
 *
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
/* global DOMException */
'use strict';

import * as rpc from 'web-request-rpc';

const CREDENTIAL_STORE_TIMEOUT = 0;

export class CredentialRequestService {
  constructor(origin, {get = _abort} = {}) {
    if(!(origin && typeof origin === 'string')) {
      throw new TypeError('"origin" must be a non-empty string.');
    }
    if(typeof get !== 'function') {
      throw new TypeError('"get" must be a function.');
    }

    this._origin = origin;
    this._get = get;

    /* Note: Only one request is permitted at a time. A more complex
       implementation that tracks this operation via `localForage` is
       required to enforce this across windows, so right now the restriction
       is actually one operation per page. */
    this._requestState = null;
  }

  async get({credentialRequestOptions}) {
    if(this._requestState) {
      throw new DOMException(
        'Another credential request is already in progress.',
        'NotAllowedError');
    }

    // TODO: run validation here to ensure proper implementation of the
    //   client side of the polyfill; the client side code should have
    //   already done proper validation for the end user -- so in theory, this
    //   validation would only ever fail during client polyfill development
    // TODO: validate credentialRequestOptions

    this._requestState = {
      request: 'request',
      topLevelOrigin: (window.location.ancestorOrigins &&
        window.location.ancestorOrigins.length > 0) ?
          window.location.ancestorOrigins[
            window.location.ancestorOrigins.length - 1] : this._origin,
      relyingOrigin: this._origin,
      credentialRequestOptions: {credentialRequestOptions},
      credentialHandler: null
    };

    // TODO: set a timeout an expiration of the request or just let it live
    //   as long as the page does?

    // TODO: call custom `get`
    let response;
    try {
      response = await this._get(this._requestState);
      // TODO: validate response as a CredentialResponse
      if(!response) {
        throw new Error('Invalid CredentialResponse from credential handler.');
      }
    } finally {
      // always clear pending request
      this._requestState = null;
    }

    return response;
  }

  // called by UI presenting `get` once a choice has been selected
  async _selectCredentialChoice(selection) {
    const requestState = this._requestState;
    const {credentialHandler, credentialChoiceKey} = selection;
    // Note: If an error is raised, it may be recoverable such that the
    //   `show` UI can allow the selection of another credential handler.
    const credentialHandlerResponse = await _handleCredentialRequest({
      operationState,
      credentialHandler,
      credentialChoiceKey
    });
    // TODO: validate CredentialHandlerResponse

    return credentialHandlerResponse;
  }
}

/**
 * Loads a credential handler to handle the given credential request.
 *
 * @param options the options to use:
 *          requestState the credential request state information.
 *          credentialHandler the credential handler URL.
 *          credentialChoiceKey the key for the selected credential choice.
 *
 * @return a Promise that resolves to a CredentialHandlerResponse.
 */
async function _handleCredentialRequest(
  {requestState, credentialHandler, credentialChoiceKey}) {
  requestState.credentialHandler = {};

  console.log('loading credential handler: ' + credentialHandler);
  const appContext = new rpc.WebAppContext();

  // try to load credential handler
  let loadError = null;
  try {
    const injector = await appContext.createWindow(credentialHandler);
    // enable ability to make calls on remote credential handler
    requestState.credentialHandler.api = injector.get('credentialHandler', {
      functions: [{
        name: 'requestCredential',
        options: {timeout: CREDENTIAL_REQUEST_TIMEOUT}
      }]
    });
  } catch(e) {
    loadError = e;
  }

  if(loadError) {
    // failed to load credential handler, close out context
    appContext.close();
    // can't obtain credential handler response because of load failure
    throw loadError;
  }

  // no load error at this point, send credential request
  let credentialHandlerResponse;
  try {
    console.log('sending credential request...');
    credentialHandlerResponse = await requestState.credentialHandler.api
      .requestCredential({
        topLevelOrigin: requestState.topLevelOrigin,
        credentialRequestOrigin: requestState.credentialRequestOrigin,
        credentialRequestOptions: requestState.credentialRequestOptions,
        credentialChoiceKey: credentialChoiceKey
      });
  } finally {
    appContext.close();
  }
  return credentialHandlerResponse;
}

async function _abort() {
  // TODO: called when `get` is not implemented
  throw new Error('Not implemented.');
}
