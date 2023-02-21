/*!
 * Credential Mediator Polyfill.
 *
 * Copyright (c) 2017-2022 Digital Bazaar, Inc. All rights reserved.
 */
/* global document, navigator */
import {
  PermissionManager,
  WebRequestMediator,
  WebRequestHandlersService,
  storage
} from 'web-request-mediator';
import {utils} from 'web-request-rpc';

import {CredentialHandlersService} from './CredentialHandlersService.js';
import {CredentialHintsService} from './CredentialHintsService.js';
import {CredentialsContainerService} from './CredentialsContainerService.js';

export {PermissionManager};

let loaded;
export async function loadOnce(options) {
  if(loaded) {
    return loaded;
  }
  return loaded = await load(options);
}

// TODO: document
export async function load({
  // use `credentialRequestOrigin` as external name to eliminate confusion
  // over which origin the parameter refers to
  credentialRequestOrigin: relyingOrigin,
  requestPermission,
  getCredential,
  storeCredential,
  getCredentialHandlerInjector,
  rpcServices = {}
}) {
  // if browser is brave, has no `localStorage`, or supports Storage Access API
  // and is not Firefox, use cookies for storage until localStorage/IndexedDB
  // is supported (required to ensure first party storage is available in the
  // mediator in Safari); notably, newer versions of Chrome have the Storage
  // Access API but only partition IndexedDB and localStorage, not cookies, so
  // this will also ensure those versions of Chrome use cookies to enable
  // an integrated experience
  let hasLocalStorage;
  try {
    hasLocalStorage = !!localStorage;
  } catch(e) {
    hasLocalStorage = false;
  }
  if(navigator.brave || !hasLocalStorage ||
    (typeof document.requestStorageAccess === 'function' && !window.netscape)) {
    await storage.setDriver(['cookieWrapper']);
  } else {
    await storage.setDriver(
      ['asyncStorage', 'localStorageWrapper', 'cookieWrapper']);
  }

  // relying origin for the web request mediator is the origin of the opener
  // or parent window (value found in `document.referrer`)
  const {origin} = utils.parseUrl(document.referrer);
  const wrm = new WebRequestMediator(origin);

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

  const credentialHandlersService = new CredentialHandlersService(
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
      await CredentialHintsService._set(handlerUrl, 'default', hint);
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
