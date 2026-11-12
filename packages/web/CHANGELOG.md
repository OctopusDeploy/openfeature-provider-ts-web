# Changelog

## [6.0.0](https://github.com/OctopusDeploy/openfeature-provider-ts/compare/v5.0.2...v6.0.0) (2026-11-05)


### ⚠ BREAKING CHANGES

* fail initialization when feature flags cannot be retrieved and none are cached ([#180](https://github.com/OctopusDeploy/openfeature-provider-ts/issues/180))
* move OpenFeature SDK to peerDependencies ([#177](https://github.com/OctopusDeploy/openfeature-provider-ts/issues/177))
* publish dual ESM/CJS output ([#172](https://github.com/OctopusDeploy/openfeature-provider-ts/issues/172))
* raise compile target from ES2015 to ES2020 ([#169](https://github.com/OctopusDeploy/openfeature-provider-ts/issues/169))
* **deps:** upgrade TypeScript to 7 ([#168](https://github.com/OctopusDeploy/openfeature-provider-ts/issues/168))

### Features

* mark the package as side-effect free for bundlers ([afad2b7](https://github.com/OctopusDeploy/openfeature-provider-ts/commit/afad2b77430e2718f02ef2b7cebfb51254fe31c2))
* move OpenFeature SDK to peerDependencies ([#177](https://github.com/OctopusDeploy/openfeature-provider-ts/issues/177)) ([5de57a0](https://github.com/OctopusDeploy/openfeature-provider-ts/commit/5de57a0978a4d125d88b4a24d24de075818d2d88))
* publish dual ESM/CJS output ([#172](https://github.com/OctopusDeploy/openfeature-provider-ts/issues/172)) ([a3f9866](https://github.com/OctopusDeploy/openfeature-provider-ts/commit/a3f98666aed529d0c2dc4df838d03d9380f6e845))
* raise compile target from ES2015 to ES2020 ([#169](https://github.com/OctopusDeploy/openfeature-provider-ts/issues/169)) ([0ff3dc0](https://github.com/OctopusDeploy/openfeature-provider-ts/commit/0ff3dc0a5cccb664552e6ea769bd5682c2937997))


### Bug Fixes

* **deps:** bump follow-redirects from 1.16.1 to 1.16.2 ([#182](https://github.com/OctopusDeploy/openfeature-provider-ts/issues/182)) ([d600d17](https://github.com/OctopusDeploy/openfeature-provider-ts/commit/d600d177ff09cdb203d11a916ffb39e699893786))
* fail initialization when feature flags cannot be retrieved and none are cached ([#180](https://github.com/OctopusDeploy/openfeature-provider-ts/issues/180)) ([d426f71](https://github.com/OctopusDeploy/openfeature-provider-ts/commit/d426f712774b3f3d7f1c0e241f04be533945a624))


### Miscellaneous Chores

* **deps:** upgrade TypeScript to 7 ([#168](https://github.com/OctopusDeploy/openfeature-provider-ts/issues/168)) ([1c48379](https://github.com/OctopusDeploy/openfeature-provider-ts/commit/1c4837940aa546579a97aed5ec6f8c3ee5c59c66))

## [5.0.2](https://github.com/OctopusDeploy/openfeature-provider-ts/compare/v5.0.1...v5.0.2) (2026-11-02)


### Bug Fixes

* **deps:** bump follow-redirects from 1.16.0 to 1.16.1 ([#161](https://github.com/OctopusDeploy/openfeature-provider-ts/issues/161)) ([edb281e](https://github.com/OctopusDeploy/openfeature-provider-ts/commit/edb281e12dffdee68585f999c4661259e8fec95c))


### Miscellaneous Chores

* **deps:** update dependency brace-expansion to v5.0.12 [security] ([141178b](https://github.com/OctopusDeploy/openfeature-provider-ts/commit/141178bb39e071d4c6a8e03c3a925c3ba02ef7f6))

## [5.0.1](https://github.com/OctopusDeploy/openfeature-provider-ts/compare/v5.0.0...v5.0.1) (2026-10-07)


### Bug Fixes

* **deps:** resolve npm audit advisories ([#145](https://github.com/OctopusDeploy/openfeature-provider-ts/issues/145)) ([58346bb](https://github.com/OctopusDeploy/openfeature-provider-ts/commit/58346bb9d3aa2f1d4e9ba5371d78cf9d12e9d396))
* report no flags through the evaluations, not by failing initialization ([#131](https://github.com/OctopusDeploy/openfeature-provider-ts/issues/131)) ([3f3d5f7](https://github.com/OctopusDeploy/openfeature-provider-ts/commit/3f3d5f752c80914b49100e9fd4b235d64a28b7dd))

## [5.0.0](https://github.com/OctopusDeploy/openfeature-provider-ts/compare/v4.0.0...v5.0.0) (2026-08-13)


### ⚠ BREAKING CHANGES

* Tidy v3 references, "toggles" and align types with other providers ([#120](https://github.com/OctopusDeploy/openfeature-provider-ts/issues/120))
* Segment/context attribute matching should be case-insensitive

### Features

* Add support for upcoming rules-based evaluations ([0b2e8f1](https://github.com/OctopusDeploy/openfeature-provider-ts/commit/0b2e8f10c6b24598071e09d5360eb8aff10123c6))
* Add v4 evaluation response types ([#115](https://github.com/OctopusDeploy/openfeature-provider-ts/issues/115)) ([ce12a9a](https://github.com/OctopusDeploy/openfeature-provider-ts/commit/ce12a9a4ca101d8f715ceef8539417e71102c3c7))
* **deps:** update dependency @openfeature/web-sdk to v1.10.0 ([#101](https://github.com/OctopusDeploy/openfeature-provider-ts/issues/101)) ([08c15e7](https://github.com/OctopusDeploy/openfeature-provider-ts/commit/08c15e7a7bdb30c3414550812c695868c0120359))
* **deps:** update dependency @openfeature/web-sdk to v1.9.0 ([#94](https://github.com/OctopusDeploy/openfeature-provider-ts/issues/94)) ([502d877](https://github.com/OctopusDeploy/openfeature-provider-ts/commit/502d8778c6c9f050a0f2964786868304d99fc367))
* Implement v4 client-side evaluation ([#116](https://github.com/OctopusDeploy/openfeature-provider-ts/issues/116)) ([58fa9de](https://github.com/OctopusDeploy/openfeature-provider-ts/commit/58fa9def92c6937eec7968b4767e9aa505466fe5))
* Increase the number of failure cases that will fall back to the local storage cache ([0b2e8f1](https://github.com/OctopusDeploy/openfeature-provider-ts/commit/0b2e8f10c6b24598071e09d5360eb8aff10123c6))


### Bug Fixes

* **deps:** bump form-data from 4.0.5 to 4.0.6 ([#70](https://github.com/OctopusDeploy/openfeature-provider-ts/issues/70)) ([7d44fe8](https://github.com/OctopusDeploy/openfeature-provider-ts/commit/7d44fe8f0bb6279990812fd8dac8c1f87ad2edff))
* **deps:** resolve brace-expansion and js-yaml security alerts ([#92](https://github.com/OctopusDeploy/openfeature-provider-ts/issues/92)) ([d39340f](https://github.com/OctopusDeploy/openfeature-provider-ts/commit/d39340f697fbf527032f859e178a0562839b215f))
* Segment/context attribute matching should be case-insensitive ([0b2e8f1](https://github.com/OctopusDeploy/openfeature-provider-ts/commit/0b2e8f10c6b24598071e09d5360eb8aff10123c6))


### Code Refactoring

* Tidy v3 references, "toggles" and align types with other providers ([#120](https://github.com/OctopusDeploy/openfeature-provider-ts/issues/120)) ([59da185](https://github.com/OctopusDeploy/openfeature-provider-ts/commit/59da18504a181602843c7fdaf1ba215e3de273d7))

## [4.0.0](https://github.com/OctopusDeploy/openfeature-provider-ts/compare/v3.0.2...v4.0.0) (2026-06-14)


### ⚠ BREAKING CHANGES

* Throw OpenFeature errors for unsupported flag types
* Send product metadata in custom header ([#62](https://github.com/OctopusDeploy/openfeature-provider-ts/issues/62))

### Features

* Send product metadata in custom header ([#62](https://github.com/OctopusDeploy/openfeature-provider-ts/issues/62)) ([51822cb](https://github.com/OctopusDeploy/openfeature-provider-ts/commit/51822cbddf0a78860ae7d582bc783667c5eb71d5))


### Bug Fixes

* patch transitive axios vulnerability via npm audit fix ([#59](https://github.com/OctopusDeploy/openfeature-provider-ts/issues/59)) ([68d10d8](https://github.com/OctopusDeploy/openfeature-provider-ts/commit/68d10d853379a4dfaa76cb0311d3459b346b4948))
* Remove slug formatting check from flag evaluation ([#64](https://github.com/OctopusDeploy/openfeature-provider-ts/issues/64)) ([f9c7fec](https://github.com/OctopusDeploy/openfeature-provider-ts/commit/f9c7fec6157af9b2c37f84a65f6403dc329e6a25))
* Throw OpenFeature errors for unsupported flag types ([e9a276e](https://github.com/OctopusDeploy/openfeature-provider-ts/commit/e9a276e45dce3a6854127fbff5914ce1c3edb4b2))

## [3.0.2](https://github.com/OctopusDeploy/openfeature-provider-ts/compare/v3.0.1...v3.0.2) (2026-04-13)


### Bug Fixes

* **deps:** bump axios from 1.13.5 to 1.15.0 ([#55](https://github.com/OctopusDeploy/openfeature-provider-ts/issues/55)) ([b3576dd](https://github.com/OctopusDeploy/openfeature-provider-ts/commit/b3576ddc792bab4a382ee5651417ff34b559272c))

## [3.0.1](https://github.com/OctopusDeploy/openfeature-provider-ts/compare/v3.0.0...v3.0.1) (2026-04-12)


### Bug Fixes

* Fix README punctuation ([3c1de8e](https://github.com/OctopusDeploy/openfeature-provider-ts/commit/3c1de8ed51a9d3a5acb1b74b04ffaf5d9a81a447))

## [3.0.0](https://github.com/OctopusDeploy/openfeature-provider-ts/compare/v2.1.4...v3.0.0) (2026-04-09)


### ⚠ BREAKING CHANGES

* Remove V2 toggle endpoint support ([#37](https://github.com/OctopusDeploy/openfeature-provider-ts/issues/37))

### Features

* Add fractional evaluation support ([#49](https://github.com/OctopusDeploy/openfeature-provider-ts/issues/49)) ([7ebe918](https://github.com/OctopusDeploy/openfeature-provider-ts/commit/7ebe9184cbacc66a5fe81b7e43a777264e7774ae))
* Use new evaluations endpoint ([#48](https://github.com/OctopusDeploy/openfeature-provider-ts/issues/48)) ([48d8bf5](https://github.com/OctopusDeploy/openfeature-provider-ts/commit/48d8bf5bdbae69bfaad7ee427fe4aa61e80b77eb))


### Bug Fixes

* store context parameter in initialize for segment evaluation  ([#41](https://github.com/OctopusDeploy/openfeature-provider-ts/issues/41)) ([4e5dff4](https://github.com/OctopusDeploy/openfeature-provider-ts/commit/4e5dff42386d37928417603a32530ccd6484284b))


### Miscellaneous Chores

* Remove V2 toggle endpoint support ([#37](https://github.com/OctopusDeploy/openfeature-provider-ts/issues/37)) ([2e4d40f](https://github.com/OctopusDeploy/openfeature-provider-ts/commit/2e4d40f1a46171b54dd7029a358377f151315378))

## [2.1.4](https://github.com/OctopusDeploy/openfeature-provider-ts/compare/v2.1.3...v2.1.4) (2025-09-23)


### Features

* Support passing release version override to OctoToggle ([#25](https://github.com/OctopusDeploy/openfeature-provider-ts/issues/25)) ([6f1d846](https://github.com/OctopusDeploy/openfeature-provider-ts/commit/6f1d8465652493951ec6022a39f337657ee7b9a0))

## [2.1.3](https://github.com/OctopusDeploy/openfeature-provider-ts/compare/v2.1.2...v2.1.3) (2025-07-30)


### Bug Fixes

* dependency update ([14c4521](https://github.com/OctopusDeploy/openfeature-provider-ts/commit/14c452184c0301dff7908622e38f3601fdfd2d29))

## [2.1.2](https://github.com/OctopusDeploy/openfeature-provider-ts/compare/v2.1.1...v2.1.2) (2025-06-04)


### Bug Fixes

* updates dependencies ([52e610d](https://github.com/OctopusDeploy/openfeature-provider-ts/commit/52e610d8406446763a120156ad7bf65038aa2ab4))

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
