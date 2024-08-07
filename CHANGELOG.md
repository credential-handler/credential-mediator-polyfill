# credential-mediator-polyfill ChangeLog

## 4.0.0 - 2024-07-02

### Changed
- Use BSD-3-Clause license.
- **BREAKING**: Change to module.
- **BREAKING**: Update dependencies.
  - `web-request-rpc@3`
  - `web-request-mediator@3`

## 3.0.1 - 2023-02-22

### Fixed
- Ensure `loadOnce` only loads once.

## 3.0.0 - 2023-02-21

### Changed
- **BREAKING**: Allow storage to use (in preference order) either IndexedDB,
localStorage, or cookie-based driver in all browsers except versions of Chrome
that have partitioned storage for IndexedDB and localStorage but unpartitioned
cookie storage. This ensures that Chrome can continue to have a fully
integrated UI via third party iframes, but all other browsers (as was already
the case) will use first party dialogs to load the mediator when storage needs
to be accessed.

## 2.2.1 - 2023-02-21

### Fixed
- Ensure `cookieWrapper` is made available as a possible storage driver.

## 2.2.0 - 2022-06-21

### Changed
- Use cookie driver for storage when `localStorage` is not available.

## 2.1.0 - 2022-06-15

### Changed
- Use cookie driver for storage for brave browser.

## 2.0.0 - 2022-06-13

### Changed
- **BREAKING**: Deprecate hints and registration APIs and make them
  ineffectual -- with an attempt to allow for existing behavior to
  continue (note that use of these APIs was largely ineffectual in
  the past, this just better formalizes it and warns devs).
- **BREAKING**: Require `credentialRequestOrigin` instead of
  `relyingOrigin` in the load API. This clarifies that the value that
  should be passed is for the relying party site using the credentials
  API, not the mediator (for cases when the mediator needs to load
  additional windows, e.g. 1p windows for storage access).
- **BREAKING**: Use updated `web-request*` libraries.
- **BREAKING**: Allow additional `rpcServices` to be registered when
  loading. This enables more 1p flows by allowing events to be proxied
  to 1p windows, etc.

## 1.2.1 - 2021-05-16

### Fixed
- Fix origin when setting/removing permissions.

## 1.2.0 - 2021-05-16

### Added
- Exposed methods to enable the mediator itself to register/unregister
  credential handlers.

## 1.1.3 - 2019-01-21

### Fixed
- Do not require cookie-based storage in Firefox.

### Changed
- Use web-request-mediator 1.1.x.

## 1.1.2 - 2018-09-27

### Fixed
- Make canceling credential handler interactions more
  robust. Reset cancelation state and track cancelations
  that occur while credential handlers are loading.

## 1.1.1 - 2018-08-08

### Changed
- Update credential repo load timeout to 30 seconds.

## 1.1.0 - 2018-07-31

### Added
- Add ability to cancel hint selection UI.

## 1.0.1 - 2018-07-20

### Changed
- Updated dependencies.

## 1.0.0 - 2018-07-20

### Added
- Use cookie-based storage in browsers with storage partitioning.

## 0.1.6 - 2017-09-04

### Added
- Support credential hint matching via `match`.

## 0.1.5 - 2017-09-04

### Fixed
- Remove logging.

## 0.1.4 - 2017-09-04

### Added
- Include credential request origin; TBD how
  it will be blinded.

## 0.1.3 - 2017-09-03

### Fixed
- Pass credential hint key as `hintKey`.

## 0.1.2 - 2017-08-24

### Added
- Add hook to enable customization of handler window.

## 0.1.1 - 2017-08-21

### Changed
- Add TODO to require prefetched icons and clear them when returning.
- Allow `null` credential response.

## 0.1.0 - 2017-08-18

## 0.0.1 - 2017-08-18

### Added
- Add core files.

- See git history for changes previous to this release.
