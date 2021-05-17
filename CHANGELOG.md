# credential-mediator-polyfill ChangeLog

## 1.2.0 - 2021-05-xx

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
