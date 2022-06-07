/*!
 * Credential Mediator Polyfill.
 *
 * Copyright (c) 2017-2018 Digital Bazaar, Inc. All rights reserved.
 */
/* global document, navigator */
'use strict';

import {
  PermissionManager,
  WebRequestMediator,
  WebRequestHandlersService,
  storage
} from 'web-request-mediator';
import {utils} from 'web-request-rpc';

import {CredentialHintsService} from './CredentialHintsService.js';
import {CredentialsContainerService} from './CredentialsContainerService.js';

let loaded;
export async function loadOnce(options) {
  if(loaded) {
    return loaded;
  }
  return loaded = await load(options);
}

// TODO: document
export async function load({
  relyingOrigin,
  requestPermission,
  getCredential,
  storeCredential,
  getCredentialHandlerInjector,
  rpcServices = {}
}) {
  // if browser supports Storage Access API and is not Firefox, use cookies
  // for storage until localStorage/IndexedDB is supported (required to ensure
  // first party storage is available in the mediator in Safari)
  if(typeof document.requestStorageAccess === 'function' && !window.netscape) {
    await storage.setDriver(['cookieWrapper']);
  }

  const wrm = new WebRequestMediator(relyingOrigin);

  // define custom server API
  const permissionManager = new PermissionManager(
    relyingOrigin, {request: requestPermission});
  permissionManager._registerPermission('credentialhandler');
  wrm.server.define('permissionManager', permissionManager);

  const credentialsContainerService = new CredentialsContainerService(
    relyingOrigin, {
      get: getCredential,
      store: storeCredential,
      getCredentialHandlerInjector
    });

  const credentialHandlersService = new WebRequestHandlersService(
    relyingOrigin, {permissionManager});
  credentialHandlersService.addEventListener('unregister', async event => {
    if(event.requestType === 'credential') {
      event.waitUntil(
        CredentialHintsService._destroy(event.registration));
    }
  });

  wrm.server.define('credentialHandlers', credentialHandlersService);
  wrm.server.define('credentialsContainer', credentialsContainerService);
  wrm.server.define('credentialHints', new CredentialHintsService(
    relyingOrigin, {permissionManager}));
  for(const [serviceName, service] of Object.entries(rpcServices)) {
    wrm.server.define(serviceName, service);
  }

  // connect to relying origin
  await wrm.connect();

  // TODO: move to another file and/or move out of credentialsContainerService?
  wrm.ui = {
    async selectCredentialHint(selection) {
      return credentialsContainerService._selectCredentialHint(selection);
    },
    async cancelSelectCredentialHint() {
      return credentialsContainerService._cancelSelectCredentialHint();
    },
    async matchCredentialRequest(credentialRequestOptions) {
      // get all credential handler registrations
      const registrations = await WebRequestHandlersService
        ._getAllRegistrations('credential');

      // find all matching credential hints
      const promises = [];
      registrations.forEach(url => promises.push(
        CredentialHintsService._matchCredentialRequest(
          url, credentialRequestOptions)));
      return [].concat(...await Promise.all(promises));
    },
    async matchCredential(credential) {
      // get all credential handler registrations
      const registrations = await WebRequestHandlersService
        ._getAllRegistrations('credential');

      // find all matching credential hints
      const promises = [];
      registrations.forEach(url => promises.push(
        CredentialHintsService._matchCredential(url, credential)));
      return [].concat(...await Promise.all(promises));
    },
    async registerCredentialHandler(handlerUrl, hint) {
      // grant handler permission
      const {origin: relyingOrigin} = utils.parseUrl(handlerUrl);
      const pm = new PermissionManager(relyingOrigin, {request: _granted});
      pm._registerPermission('credentialhandler');
      await pm.request({name: 'credentialhandler'});

      // set registration
      const requestType = 'credential';
      handlerUrl = await WebRequestHandlersService._setRegistration(
        requestType, handlerUrl);

      // add default hint
      await CredentialHintsService._set(handlerUrl, null, hint);
    },
    async unregisterCredentialHandler(handlerUrl) {
      // remove handler permission
      const {origin: relyingOrigin} = utils.parseUrl(handlerUrl);
      const pm = new PermissionManager(relyingOrigin);
      pm._registerPermission('credentialhandler');
      await pm.revoke({name: 'credentialhandler'});

      // remove handler and its hint storage
      const requestType = 'credential';
      await WebRequestHandlersService._getHandlerStorage(
        requestType, relyingOrigin).removeItem(handlerUrl);
      await CredentialHintsService._destroy(handlerUrl);
    }
  };

  // TODO: exposed API TBD
  navigator.credentialMediator = wrm;
}

async function _granted() {
  return {state: 'granted'};
}
