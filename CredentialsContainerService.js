/*!
 * A CredentialRequestService provides the implementation for
 * CredentialHint.discoverFromExternalSource for a particular remote origin.
 *
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
/* global DOMException, window */
'use strict';

import * as rpc from 'web-request-rpc';

const CREDENTIAL_OPERATION_TIMEOUT = 0;

export class CredentialsContainerService {
  constructor(relyingOrigin, {
    get = _abort,
    store = _abort,
    customizeHandlerWindow = null
  } = {}) {
    if(!(relyingOrigin && typeof relyingOrigin === 'string')) {
      throw new TypeError('"relyingOrigin" must be a non-empty string.');
    }
    if(typeof get !== 'function') {
      throw new TypeError('"get" must be a function.');
    }
    if(typeof store !== 'function') {
      throw new TypeError('"store" must be a function.');
    }

    this._relyingOrigin = relyingOrigin;
    this._get = get;
    this._store = store;
    this._customizeHandlerWindow = customizeHandlerWindow;

    /* Note: Only one operation is permitted at a time. A more complex
       implementation that tracks this operation via `localForage` is
       required to enforce this across windows, so right now the restriction
       is actually one operation per page. */
    this._operationState = null;
  }

  async get(credentialRequestOptions) {
    // TODO: run validation here to ensure proper implementation of the
    //   client side of the polyfill; the client side code should have
    //   already done proper validation for the end user -- so in theory, this
    //   validation would only ever fail during client polyfill development
    // TODO: validate credentialRequestOptions
    return this._execute(
      this._get, {operationName: 'request', input: {credentialRequestOptions}});
  }

  async store(credential) {
    // TODO: run validation here to ensure proper implementation of the
    //   client side of the polyfill; the client side code should have
    //   already done proper validation for the end user -- so in theory, this
    //   validation would only ever fail during client polyfill development
    // TODO: validate `credential` as WebCredential
    return this._execute(
      this._store, {operationName: 'store', input: {credential}});
  }

  async _execute(fn, options) {
    if(this._operationState) {
      throw new DOMException(
        'Another credential operation is already in progress.',
        'NotAllowedError');
    }

    this._operationState = Object.assign({
      topLevelOrigin: getTopLevelOrigin(this._relyingOrigin),
      relyingOrigin: this._relyingOrigin,
      credentialHandler: null
    }, options);

    let response;
    try {
      response = await fn.call(this, this._operationState);
      // TODO: validate response as a WebCredential or `null`
      //   throw new Error('Invalid response from credential handler.');
    } finally {
      // always clear pending operation
      this._operationState = null;
    }
    return response;
  }

  // called by UI presenting `get` once a hint has been selected
  async _selectCredentialHint(selection) {
    const operationState = this._operationState;
    const customizeHandlerWindow = this._customizeHandlerWindow;
    const {credentialHandler, credentialHintKey} = selection;
    // Note: If an error is raised, it may be recoverable such that the
    //   `UI can allow the selection of another credential handler.
    const credentialHandlerResponse = await _handleCredentialOperation({
      operationState,
      customizeHandlerWindow,
      credentialHandler,
      credentialHintKey
    });
    // TODO: validate CredentialHandlerResponse

    return credentialHandlerResponse;
  }

  async _cancelSelectCredentialHint() {
    if(this._operationState.appContext) {
      this._operationState.canceled = true;
      this._operationState.appContext.close();
    }
  }
}

/**
 * Loads a credential handler to handle a credential operation.
 *
 * @param options the options to use:
 *          operationState the credential operation state information.
 *          customizeHandlerWindow a function to customize the handler window.
 *          credentialHandler the credential handler URL.
 *          credentialHintKey the key for the selected credential hint.
 *
 * @return a Promise that resolves to a CredentialHandlerResponse.
 */
async function _handleCredentialOperation({
  operationState,
  customizeHandlerWindow,
  credentialHandler,
  credentialHintKey
}) {
  operationState.credentialHandler = {};

  const appContext = operationState.appContext = new rpc.WebAppContext();

  // try to load credential handler
  let loadError = null;
  try {
    const injector = await appContext.createWindow(credentialHandler, {
      customize: customizeHandlerWindow,
      // 30 second timeout to load repository
      timeout: 30000
    });
    // enable ability to make calls on remote credential handler
    operationState.credentialHandler.api = injector.get('credentialHandler', {
      functions: [{
        name: operationState.operationName,
        options: {timeout: CREDENTIAL_OPERATION_TIMEOUT}
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

  // no load error at this point, execute remote credential operation
  let credentialHandlerResponse;
  try {
    credentialHandlerResponse = await operationState.credentialHandler.api[
      operationState.operationName](Object.assign({
        hintKey: credentialHintKey,
        // TODO: salt+hash relying origin and send result, keeping `salt`
        // private? ... then include salt in credentialHandlerResponse
        credentialRequestOrigin: operationState.relyingOrigin
      }, operationState.input));
    if(credentialHandlerResponse) {
      // TODO: add `salt` to response (response is a WebCredential)
      //credentialHandlerResponse.originSalt = ...
    }
  } catch(e) {
    if(operationState.canceled) {
      throw new DOMException('Credential operation canceled.', 'AbortError');
    } else {
      throw e;
    }
  } finally {
    appContext.close();
  }
  return credentialHandlerResponse;
}

function getTopLevelOrigin(relyingOrigin) {
  return (window.location.ancestorOrigins &&
    window.location.ancestorOrigins.length > 0) ?
      window.location.ancestorOrigins[
        window.location.ancestorOrigins.length - 1] : relyingOrigin;
}

async function _abort() {
  // TODO: this function is only called when `get` is not implemented
  throw new Error('Not implemented.');
}
