# How to configure Tokend #

Configuration options for Tokend can be specified by providing a configuration
file on the command-line.

## Command-line Options ##

The options below are specified on the command-line.

* `--config`/`-c` - A configuration file to load. For more information on the format
  of this file, see the **Configuration Files** section. Only one configuration
  file can be specified. Multiple uses of this argument will result in only the
  last configuration file being read.

## Configuration Files ##

Configuration files are a single JSON formatted object, containing additional
objects or key value pairs.

### Minimal Configuration File ###

The configuration file below is an example of the minimal settings that must be
specified in order for Tokend to run.

```json
{
  "vault": {
    "host": "127.0.0.1",
    "port": 8200,
    "token_ttl": 60
  },
  "warden": {
    "host": "127.0.0.1",
    "port": 3000,
    "path": "/v1/authenticate"
  }
}
```

### Default Configuration File ###

This is the default configuration for Tokend, which you can find in
[`config/defaults.json`][config-path].

```json
{
  "vault": {
    "tls": true
  },
  "metadata": {
    "host": "169.254.169.254"
  },
  "service": {
    "host": "127.0.0.1",
    "port": 4500
  },
  "log": {
    "level": "INFO",
    "json": true
  }
}
```

### Configuration Key Reference ###

* `vault` - These specify [Vault][] connection settings.

	The following keys are available:

	* `host` - The HTTP address of the Vault server. Defaults to `127.0.0.1`.
	* `port` - The HTTP port of the Vault server. Defaults to `8200`.
	* `tls` - Whether Vault should use TLS. Defaults to `true`.
	* `token_ttl` - The TTL (time to live) of Vault tokens. This maps directly to Vault's [`default_lease_ttl`][default_lease_ttl] setting.

* `metadata` - This specifies settings for the [EC2 Metadata Service][ec2-metadata-service]

	Generally these settings won't need to be changed from the defaults. They are
exposed for development purposes.

	The following keys are available:

	* `host` - The hostname and port used to connect to the EC2 Metadata Service. Defaults to `169.254.169.254`. This setting includes the port, so if changing from the default, the format is `host:port`.

* `warden` - Connection information for [Warden][].

	Tokend has a tight dependency on Warden to retrieve its initial token.

	The following keys are available:

	* `host` - The hostname for Warden.
  * `port` - The port for Warden.
  * `path` - The Warden endpoint to authenticate against.

* `service` - These settings control the HTTP API.

  The following keys are available:

  * `host` - The address the HTTP API binds to. Defaults to `127.0.0.1`.
  * `port` - The port the HTTP API listens on. Defaults to `4500`.

* `log` - These settings control logging.

  Tokend treats logging as an event stream and logs to `stdout`. Logged events
  can be formatted as JSON objects separated by newlines (see below) or simple
  console output. If you need routing or storage of logs, you'll need to handle
  that outside Tokend.

  The following keys are available:

  * `level` - The level to log at. Valid values are `debug`, `verbose`, `info`,
    `warn`, and `error`. Each log level encompasses all the ones below it. So
    `debug` is the most verbose and `error` is the least verbose. Defaults to
    `info`.
  * `json` - Whether to output the logs as JSON formatted objects. Defaults to `true`.

[config-path]: ../../config/defaults.json
[Vault]: https://www.vaultproject.io/
[default_lease_ttl]: https://www.vaultproject.io/docs/config/#default_lease_ttl
[ec2-metadata-service]: http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-metadata.html
[Warden]: https://github.com/rapid7/warden
