Tokend
=========

_A daemon that interfaces with [Vault][] and [Warden][] to provide a secure method to deliver secrets to servers in the cloud._

[![Build Status](https://travis-ci.org/rapid7/tokend.svg?branch=master)](https://travis-ci.org/rapid7/tokend)
[![Coverage Status](https://coveralls.io/repos/github/rapid7/tokend/badge.svg?branch=master)](https://coveralls.io/github/rapid7/tokend?branch=master)

## Features

## Releasing
To cut a release do the following:

* [Bump the version][npm-version]
* Build and upload a package
* Create a new release on github.com

This can be accomplished by running the following commands:
~~~bash
npm version minor
rake
~~~
Then following the steps to create the release on [github.com]

[npm-version]: https://docs.npmjs.com/cli/version
[github.com]: https://www.github.com
[Vault]: https://www.vaultproject.io/
[Warden]: https://github.com/rapid7/warden
