# Class: GenericProvider

The `GenericProvider` is responsible for retrieving secrets from Vault's generic secret backend.

Because generic secrets are designed as persistent and un-renewable, the `GenericBackend`'s `renew` method simple re-read's the secret if its TTL has expired. This guarantees that the `GenericBackend` won't continually perform tasks that are not required by Vault and will instead update itself only when the validity of the secret expires.

## Methods
* `constructor(path: string, token: string): GenericProvider` - Create a new instance of the `GenericProvider`. The `path` to the secret and the `token` retrieved via the `TokenProvider` are required arguments.
* `initialize(callback: Function)` - Retrieve the generic secret. The callback has the following signature: `callback(err, data)`.
* `renew(callback: Function)` - Renew the generic secret. The method name is a misnomer in the sense that it does not actually renew the secret. Instead, it determines whether the secret is still considered valid (measured by the TTL expiration) and attempts to retrieve the secret again if so. The callback has the following signature: `callback(err, data)`.
* `_read(callback: Function, response: Object)` - Processes a `Vaulted.read` response. `_read` exists so that `initialize` and `renew` can re-use code.
* `_canReRead(): boolean` - Determines whether the secret has become invalid due to its TTL expiring. Returns `true` if the secret's TTL has expired.

## Properties
* `path` - The path to the Vault secret.
* `token` - The token retrieved by the `TokenProvider`.
* `_client` - An instance of `Vaulted` used to connect to the Vault server.
* `_ttl` - The secret's TTL. The TTL, in this case, is the amount of time that Vault considers the secret to be valid.
* `_retrieved` - The time the secret is read. This is used to determine whether the TTL has expired.
* `_value` - The secret value. The `GenericProvider` caches this value so it doesn't have to continuously re-read the secret from Vault.
