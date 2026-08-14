# Changelog

## [5.0.0](https://github.com/OctopusDeploy/openfeature-provider-ts-web/compare/v4.0.0...v5.0.0) (2026-08-13)


### ⚠ BREAKING CHANGES

* Tidy v3 references, "toggles" and align types with other providers ([#120](https://github.com/OctopusDeploy/openfeature-provider-ts-web/issues/120))
* Segment/context attribute matching should be case-insensitive

### Features

* Add support for upcoming rules-based evaluations ([0b2e8f1](https://github.com/OctopusDeploy/openfeature-provider-ts-web/commit/0b2e8f10c6b24598071e09d5360eb8aff10123c6))
* Add v4 evaluation response types ([#115](https://github.com/OctopusDeploy/openfeature-provider-ts-web/issues/115)) ([ce12a9a](https://github.com/OctopusDeploy/openfeature-provider-ts-web/commit/ce12a9a4ca101d8f715ceef8539417e71102c3c7))
* **deps:** update dependency @openfeature/web-sdk to v1.10.0 ([#101](https://github.com/OctopusDeploy/openfeature-provider-ts-web/issues/101)) ([08c15e7](https://github.com/OctopusDeploy/openfeature-provider-ts-web/commit/08c15e7a7bdb30c3414550812c695868c0120359))
* **deps:** update dependency @openfeature/web-sdk to v1.9.0 ([#94](https://github.com/OctopusDeploy/openfeature-provider-ts-web/issues/94)) ([502d877](https://github.com/OctopusDeploy/openfeature-provider-ts-web/commit/502d8778c6c9f050a0f2964786868304d99fc367))
* Implement v4 client-side evaluation ([#116](https://github.com/OctopusDeploy/openfeature-provider-ts-web/issues/116)) ([58fa9de](https://github.com/OctopusDeploy/openfeature-provider-ts-web/commit/58fa9def92c6937eec7968b4767e9aa505466fe5))
* Increase the number of failure cases that will fall back to the local storage cache ([0b2e8f1](https://github.com/OctopusDeploy/openfeature-provider-ts-web/commit/0b2e8f10c6b24598071e09d5360eb8aff10123c6))


### Bug Fixes

* **deps:** bump form-data from 4.0.5 to 4.0.6 ([#70](https://github.com/OctopusDeploy/openfeature-provider-ts-web/issues/70)) ([7d44fe8](https://github.com/OctopusDeploy/openfeature-provider-ts-web/commit/7d44fe8f0bb6279990812fd8dac8c1f87ad2edff))
* **deps:** resolve brace-expansion and js-yaml security alerts ([#92](https://github.com/OctopusDeploy/openfeature-provider-ts-web/issues/92)) ([d39340f](https://github.com/OctopusDeploy/openfeature-provider-ts-web/commit/d39340f697fbf527032f859e178a0562839b215f))
* Segment/context attribute matching should be case-insensitive ([0b2e8f1](https://github.com/OctopusDeploy/openfeature-provider-ts-web/commit/0b2e8f10c6b24598071e09d5360eb8aff10123c6))


### Code Refactoring

* Tidy v3 references, "toggles" and align types with other providers ([#120](https://github.com/OctopusDeploy/openfeature-provider-ts-web/issues/120)) ([59da185](https://github.com/OctopusDeploy/openfeature-provider-ts-web/commit/59da18504a181602843c7fdaf1ba215e3de273d7))

## [4.0.0](https://github.com/OctopusDeploy/openfeature-provider-ts-web/compare/v3.0.2...v4.0.0) (2026-06-14)


### ⚠ BREAKING CHANGES

* Throw OpenFeature errors for unsupported flag types
* Send product metadata in custom header ([#62](https://github.com/OctopusDeploy/openfeature-provider-ts-web/issues/62))

### Features

* Send product metadata in custom header ([#62](https://github.com/OctopusDeploy/openfeature-provider-ts-web/issues/62)) ([51822cb](https://github.com/OctopusDeploy/openfeature-provider-ts-web/commit/51822cbddf0a78860ae7d582bc783667c5eb71d5))


### Bug Fixes

* patch transitive axios vulnerability via npm audit fix ([#59](https://github.com/OctopusDeploy/openfeature-provider-ts-web/issues/59)) ([68d10d8](https://github.com/OctopusDeploy/openfeature-provider-ts-web/commit/68d10d853379a4dfaa76cb0311d3459b346b4948))
* Remove slug formatting check from flag evaluation ([#64](https://github.com/OctopusDeploy/openfeature-provider-ts-web/issues/64)) ([f9c7fec](https://github.com/OctopusDeploy/openfeature-provider-ts-web/commit/f9c7fec6157af9b2c37f84a65f6403dc329e6a25))
* Throw OpenFeature errors for unsupported flag types ([e9a276e](https://github.com/OctopusDeploy/openfeature-provider-ts-web/commit/e9a276e45dce3a6854127fbff5914ce1c3edb4b2))

## [3.0.2](https://github.com/OctopusDeploy/openfeature-provider-ts-web/compare/v3.0.1...v3.0.2) (2026-04-13)


### Bug Fixes

* **deps:** bump axios from 1.13.5 to 1.15.0 ([#55](https://github.com/OctopusDeploy/openfeature-provider-ts-web/issues/55)) ([b3576dd](https://github.com/OctopusDeploy/openfeature-provider-ts-web/commit/b3576ddc792bab4a382ee5651417ff34b559272c))

## [3.0.1](https://github.com/OctopusDeploy/openfeature-provider-ts-web/compare/v3.0.0...v3.0.1) (2026-04-12)


### Bug Fixes

* Fix README punctuation ([3c1de8e](https://github.com/OctopusDeploy/openfeature-provider-ts-web/commit/3c1de8ed51a9d3a5acb1b74b04ffaf5d9a81a447))

## [3.0.0](https://github.com/OctopusDeploy/openfeature-provider-ts-web/compare/v2.1.4...v3.0.0) (2026-04-09)


### ⚠ BREAKING CHANGES

* Remove V2 toggle endpoint support ([#37](https://github.com/OctopusDeploy/openfeature-provider-ts-web/issues/37))

### Features

* Add fractional evaluation support ([#49](https://github.com/OctopusDeploy/openfeature-provider-ts-web/issues/49)) ([7ebe918](https://github.com/OctopusDeploy/openfeature-provider-ts-web/commit/7ebe9184cbacc66a5fe81b7e43a777264e7774ae))
* Use new evaluations endpoint ([#48](https://github.com/OctopusDeploy/openfeature-provider-ts-web/issues/48)) ([48d8bf5](https://github.com/OctopusDeploy/openfeature-provider-ts-web/commit/48d8bf5bdbae69bfaad7ee427fe4aa61e80b77eb))


### Bug Fixes

* store context parameter in initialize for segment evaluation  ([#41](https://github.com/OctopusDeploy/openfeature-provider-ts-web/issues/41)) ([4e5dff4](https://github.com/OctopusDeploy/openfeature-provider-ts-web/commit/4e5dff42386d37928417603a32530ccd6484284b))


### Miscellaneous Chores

* Remove V2 toggle endpoint support ([#37](https://github.com/OctopusDeploy/openfeature-provider-ts-web/issues/37)) ([2e4d40f](https://github.com/OctopusDeploy/openfeature-provider-ts-web/commit/2e4d40f1a46171b54dd7029a358377f151315378))

## [2.1.4](https://github.com/OctopusDeploy/openfeature-provider-ts-web/compare/v2.1.3...v2.1.4) (2025-09-23)


### Features

* Support passing release version override to OctoToggle ([#25](https://github.com/OctopusDeploy/openfeature-provider-ts-web/issues/25)) ([6f1d846](https://github.com/OctopusDeploy/openfeature-provider-ts-web/commit/6f1d8465652493951ec6022a39f337657ee7b9a0))

## [2.1.3](https://github.com/OctopusDeploy/openfeature-provider-ts-web/compare/v2.1.2...v2.1.3) (2025-07-30)


### Bug Fixes

* dependency update ([14c4521](https://github.com/OctopusDeploy/openfeature-provider-ts-web/commit/14c452184c0301dff7908622e38f3601fdfd2d29))

## [2.1.2](https://github.com/OctopusDeploy/openfeature-provider-ts-web/compare/v2.1.1...v2.1.2) (2025-06-04)


### Bug Fixes

* updates dependencies ([52e610d](https://github.com/OctopusDeploy/openfeature-provider-ts-web/commit/52e610d8406446763a120156ad7bf65038aa2ab4))

## [2.1.1](https://github.com/OctopusDeploy/openfeature-ts-web/compare/v2.1.0...v2.1.1) (2025-04-15)


### Bug Fixes

* evaluate segments in groups ([c90b75d](https://github.com/OctopusDeploy/openfeature-ts-web/commit/c90b75dfc5164e21024353f71c57b1ea822022d4))

## [2.1.0](https://github.com/OctopusDeploy/openfeature-ts-web/compare/v2.0.0...v2.1.0) (2024-12-18)


### Features

* Adds v2 client identifier backwards compatibility ([#10](https://github.com/OctopusDeploy/openfeature-ts-web/issues/10)) ([e6305f3](https://github.com/OctopusDeploy/openfeature-ts-web/commit/e6305f38b8be24639167cd99f5ba608db9baf862))

## [2.0.0](https://github.com/OctopusDeploy/openfeature-ts-web/compare/v1.1.0...v2.0.0) (2024-12-17)


### ⚠ BREAKING CHANGES

* Use v3 endpoint and attach authorization header ([#8](https://github.com/OctopusDeploy/openfeature-ts-web/issues/8))

### Features

* Use v3 endpoint and attach authorization header ([#8](https://github.com/OctopusDeploy/openfeature-ts-web/issues/8)) ([5fbf197](https://github.com/OctopusDeploy/openfeature-ts-web/commit/5fbf19768cedc6420a73ee8f71498931a346856a))

## [1.1.0](https://github.com/OctopusDeploy/openfeature-ts-web/compare/v1.0.1...v1.1.0) (2024-07-08)


### Features

* cache toggle values to promote stability ([954e20c](https://github.com/OctopusDeploy/openfeature-ts-web/commit/954e20ca2bbe8bfa1323ba4074d6bf6fe8d350bc))

## [1.0.1](https://github.com/OctopusDeploy/openfeature-ts-web/compare/v1.0.0...v1.0.1) (2024-06-14)


### Bug Fixes

* Ensure package publishing is public ([1f6e3a1](https://github.com/OctopusDeploy/openfeature-ts-web/commit/1f6e3a1d33124ca5fa8aa7bab873e42671379dd6))

## 1.0.0 (2024-06-14)


### ⚠ BREAKING CHANGES

* Release the client!

### Features

* Release the client! ([d02e66e](https://github.com/OctopusDeploy/openfeature-ts-web/commit/d02e66ed845de3093eee037a7f0c0e18b36ac05e))
