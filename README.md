Tokend
=========

*A [Node.js][] daemon that interfaces with [Vault][] and [Warden][] to provide a secure method to deliver secrets to servers in the cloud.*

[![Build Status][travis-img]][travis]
[![Coverage Status][coverage-img]][coverage]

## Features

Combined with [Vault][], [Warden][] and [Propsd][], Tokend gives security and accountability around the delivery of secrets to servers running in the cloud.

Tokend provides a seamless interface between [Vault][] and [Propsd][] allowing developers to specify the secrets they need for their service without putting unencrypted secrets out in the wild.

## Usage

See the [getting started guide][gsg] for help installing, configuring, and using Tokend.

## Development

See the **Development** section of the [getting started guide][gsg-d] for more information.

## Releasing

To cut a release do the following:

* [Bump the version][npm-version]
* Build and upload a package
* Create a new release on github.com

This can be accomplished by running the following commands:

```bash
$ npm version minor
$ bundle exec rake default
```

To be able to create a new release on github.com, you must have the following environment variables set:
* `GITHUB_LOGIN`
* `GITHUB_TOKEN`

and the user and token must have the appropriate permissions in this repository.

[Node.js]: https://nodejs.org/en/
[travis-img]: https://travis-ci.org/rapid7/tokend.svg?branch=master
[travis]: https://travis-ci.org/rapid7/tokend
[coverage-img]: https://coveralls.io/repos/github/rapid7/tokend/badge.svg?branch=master
[coverage]: https://coveralls.io/github/rapid7/tokend?branch=master
[npm-version]: https://docs.npmjs.com/cli/version
[github.com]: https://www.github.com
[Vault]: https://www.vaultproject.io/
[Warden]: https://github.com/rapid7/warden
[Propsd]: https://github.com/rapid7/propsd
[gsg]: ./docs/getting-started/
[gsg-d]: ./docs/getting-started/development.md
[dev server mode]: https://www.vaultproject.io/docs/concepts/dev-server.html
