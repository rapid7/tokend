# Class: TokenProvider
The `TokenProvider` is responsible for retrieving the initial token that tokend needs to continue to request secrets. It's order of operations is as follows:
1. Get EC2 instance identity information from the EC2 Metadata Service.
2. Send that data to a Warden server.
3. Handle the response from the Warden server.

Once the initial token is retrieved from the Warden server, the `TokenProvider` can `renew` the token by sending a POST request to the ` /v1/auth/token/renew` endpoint on the Vault server.

## Methods
* `constructor(options?): TokenProvider` - Creates a new instance of the TokenProvider. The following is the options object signature:
  ```
  {
    metadata?: {
      host?: string,
      client?: AWS.MetadataService
    },
    vault?: {
      host?: string,
      port?: number,
      ssl?: boolean,
      client?: Vaulted
    },
    warden?: {
      host?: string,
      port?: number
    }
  }
  ```
  Returns an instance of `TokenProvider` for chaining.
* `initialize(callback: Function)` - Initializes the chain of requests that eventually leads to the initial token being returned from Warden. The callback has the following signature: `callback(err, data)`.
* `renew(callback: Function)` - Renews the token. The callback has the following signature: `callback(err, data)`.

  If the `TokenProvider` has not been initialized, the value of `err` will be `Error('This token provider has not been initialized or has not received a valid token from Warden.')`.
* `_sendDocument(data: Object): Promise` - Sends EC2 instance identity data to the Warden server.
* `_getDocument(): Promise` - Gets the EC2 instance identity data from the instance Metadata Service.
* `_post(payload: Object): Promise` - Wraps `http.request` in a `Promise`.

## Properties
* `token` - The token that the Warden server returns. When `renew` is called, it will be renewed via the Vault server.
* `_metadata` - The `AWS.MetadataService` client used to request the instance identity data.
* `_client` - An instance of `Vaulted` used to connect to the Vault server.
* `_warden` - An object containing connection information for the Warden server.
