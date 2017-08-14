/*!
 * Credential Mediator Polyfill.
 *
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
/* global navigator */
'use strict';

import {PermissionManager, WebRequestMediator, WebRequestHandlersService} from
  'web-request-mediator';

import {CredentialChoicesService} from './CredentialChoicesService';
import {CredentialRequestService} from './CredentialRequestService';

let loaded;
export async function loadOnce(options) {
  if(loaded) {
    return loaded;
  }
  return loaded = await load(options);
}

// TODO: document
export async function load({relyingOrigin, requestPermission, showRequest}) {
  const wrm = new WebRequestMediator(relyingOrigin);

  // define custom server API
  const permissionManager = new PermissionManager(
    relyingOrigin, {request: requestPermission});
  permissionManager._registerPermission('credentialhandler');
  wrm.server.define('permissionManager', permissionManager);

  const credentialRequestService = new CredentialRequestService(
    relyingOrigin, {show: showRequest});

  const credentialHandlersService = new WebRequestHandlersService(
    relyingOrigin, {permissionManager});
  credentialHandlersService.addEventListener('unregister', async event => {
    if(event.requestType === 'credential') {
      event.waitUntil(
        CredentialChoicesService._destroy(event.registration));
    }
  });

  wrm.server.define('credentialHandlers', credentialHandlersService);
  wrm.server.define('credentialStore', credentialStoreService);
  wrm.server.define('credentialChoices', new CredentialChoicesService(
    relyingOrigin, {permissionManager}));

  // connect to relying origin
  const injector = await wrm.connect();

  // TODO: move to another file and/or move out of credentialRequestService?
  wrm.ui = {
    async selectCredentialChoice(selection) {
      return credentialRequestService._selectCredentialChoice(selection);
    },
    async matchCredentialChoices(credentialRequestOptions) {
      // get all credential handler registrations
      const registrations = await WebRequestHandlersService
        ._getAllRegistrations('credential');

      // find all matching credential choices
      const promises = [];
      registrations.forEach(url => promises.push(
        CredentialChoicesService._matchCredentialRequest(
          url, credentialRequestOptions)));
      return [].concat(...await Promise.all(promises));
    }
  };

  // TODO: exposed API TBD
  navigator.credentialMediator = wrm;
}
