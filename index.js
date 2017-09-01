/*!
 * Credential Mediator Polyfill.
 *
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
/* global navigator */
'use strict';

import {PermissionManager, WebRequestMediator, WebRequestHandlersService} from
  'web-request-mediator';

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
  customizeHandlerWindow
}) {
  const wrm = new WebRequestMediator(relyingOrigin);

  // define custom server API
  const permissionManager = new PermissionManager(
    relyingOrigin, {request: requestPermission});
  permissionManager._registerPermission('credentialhandler');
  wrm.server.define('permissionManager', permissionManager);

  const credentialsContainerService = new CredentialsContainerService(
    relyingOrigin,
    {get: getCredential, store: storeCredential, customizeHandlerWindow});

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

  // connect to relying origin
  const injector = await wrm.connect();

  // TODO: move to another file and/or move out of credentialsContainerService?
  wrm.ui = {
    async selectCredentialHint(selection) {
      return credentialsContainerService._selectCredentialHint(selection);
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
    }
  };

  // TODO: exposed API TBD
  navigator.credentialMediator = wrm;
}
