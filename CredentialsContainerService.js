/*!
 * A CredentialRequestService provides the implementation for
 * CredentialHint.discoverFromExternalSource for a particular remote origin.
 *
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
/* global DOMException */
'use strict';

import * as rpc from 'web-request-rpc';

const CREDENTIAL_OPERATION_TIMEOUT = 0;

export class CredentialsContainerService {
  constructor(relyingOrigin, {get = _abort, store = _abort} = {}) {
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
      _get, {operationName: 'request', input: {credentialRequestOptions}});
  }

  async store(credential) {
    // TODO: run validation here to ensure proper implementation of the
    //   client side of the polyfill; the client side code should have
    //   already done proper validation for the end user -- so in theory, this
    //   validation would only ever fail during client polyfill development
    // TODO: validate `credential` as WebCredential
    return this._execute(_get, {operationName: 'store', input: {credential}});
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
      // TODO: validate response as a CredentialResponse
      if(!response) {
        throw new Error('Invalid CredentialResponse from credential handler.');
      }
    } finally {
      // always clear pending operation
      this._operationState = null;
    }
  }

  // called by UI presenting `get` once a hint has been selected
  async _selectCredentialHint(selection) {
    const operationState = this._operationState;
    const {credentialHandler, credentialHintKey} = selection;
    // Note: If an error is raised, it may be recoverable such that the
    //   `UI can allow the selection of another credential handler.
    const credentialHandlerResponse = await _handleCredentialOperation(
      {operationState, credentialHandler, credentialHintKey});
    // TODO: validate CredentialHandlerResponse

    return credentialHandlerResponse;
  }
}

/**
 * Loads a credential handler to handle a credential operation.
 *
 * @param options the options to use:
 *          operationState the credential operation state information.
 *          credentialHandler the credential handler URL.
 *          credentialHintKey the key for the selected credential hint.
 *
 * @return a Promise that resolves to a CredentialHandlerResponse.
 */
async function _handleCredentialOperation(
  {operationState, credentialHandler, credentialHintKey}) {
  operationState.credentialHandler = {};

  console.log('loading credential handler: ' + credentialHandler);
  const appContext = new rpc.WebAppContext();

  // try to load credential handler
  let loadError = null;
  try {
    const injector = await appContext.createWindow(credentialHandler);
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
    console.log(
      `running credential ${operationState.operationName} operation...`);
    credentialHandlerResponse = await operationState.credentialHandler.api[
      operationState.operationName](
        Object.assign({credentialHintKey}, operationState.input));
  } finally {
    appContext.close();
  }
  return credentialHandlerResponse;
}

function getTopLevelOrigin(relyingOrigin) {
  return return (window.location.ancestorOrigins &&
    window.location.ancestorOrigins.length > 0) ?
      window.location.ancestorOrigins[
        window.location.ancestorOrigins.length - 1] : relyingOrigin;
}

async function _abort() {
  // TODO: called when `get` is not implemented
  throw new Error('Not implemented.');
}
