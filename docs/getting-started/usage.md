# How to use Tokend #

The Tokend service is the core process in Tokend. It's responsible for providing the HTTP 
API, fetching the [Vault][] token from [Warden][], keeping the Vault token alive, and 
retrieving secrets from Vault. Tokend is machine aware, and is designed to run on every 
server that needs to retrieve secrets.

## Vault ##

Tokend works in conjunction with [Vault][] to act as a local interface to the various 
Vault secret APIs. It makes retrieving secrets as simple as issuing a GET request against 
an endpoint. Tokend handles all of the token management and authentication. This allows 
applications like [Propsd][] to integrate secret delivery without committing secrets to 
plain text.

## Warden ##

Tokend is tightly coupled with [Warden][] to handle initial token provisioning. Tokend 
uses EC2 Instance Metadata to authenticate the instance with Warden. In turn, if the 
instance is authenticated, Warden sends a Vault token back to Tokend which uses that 
token to read secrets from Vault.

## Running Tokend ##

The Tokend service is started by running the `bin/server.js` binary. The binary
can be found in the folder where [Tokend is installed][installation]. The
service blocks, running forever or until it's told to quit. The binary supports
several [configuration options][configuration].

When running Tokend you should see output similar to this:

```text
2016-09-07T18:10:43.641Z - INFO: Listening on 127.0.0.1:4500
2016-09-07T18:10:52.822Z - INFO: Manager is ready provider=TokenProvider, status=READY, token=48d86d11-abcb-6818-b0c7-f44ed55c13a9, lease_duration=60
2016-09-07T18:10:52.828Z - INFO: GET /v1/token/default 200 468ms statusCode=200, url=/v1/token/default, host=localhost:4500, connection=keep-alive, upgrade-insecure-requests=1, user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36, accept=text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8, dnt=1, accept-encoding=gzip, deflate, sdch, accept-language=en-US,en;q=0.8, cookie=JSESSIONID=FA08E7963358EE9F3EFF9269908DF2AA; connect.sid=s%3AWii9oXdDlVydXQFF-4xWR8zmJDgTgh6q.Om1sPCgQfakJ1oCJnXCDUwsWwzqE7dC5W7YlppH%2Bwlc, method=GET, httpVersion=1.1, originalUrl=/v1/token/default, , responseTime=468, sourceName=request
2016-09-07T18:11:22.846Z - INFO: Manager renewed provider's data provider=TokenProvider, status=READY, token=48d86d11-abcb-6818-b0c7-f44ed55c13a9, lease_duration=60
2016-09-07T18:11:28.422Z - INFO: Manager is ready provider=SecretProvider, status=READY, bar=1, baz=2, quiz=true, lease_duration=2592000
2016-09-07T18:11:28.423Z - INFO: GET /v1/secret/default/foo 200 19ms statusCode=200, url=/v1/secret/default/foo, host=localhost:4500, connection=keep-alive, upgrade-insecure-requests=1, user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36, accept=text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8, dnt=1, accept-encoding=gzip, deflate, sdch, accept-language=en-US,en;q=0.8, cookie=JSESSIONID=FA08E7963358EE9F3EFF9269908DF2AA; connect.sid=s%3AWii9oXdDlVydXQFF-4xWR8zmJDgTgh6q.Om1sPCgQfakJ1oCJnXCDUwsWwzqE7dC5W7YlppH%2Bwlc, method=GET, httpVersion=1.1, originalUrl=/v1/secret/default/foo, , responseTime=19, sourceName=request
```

## Stopping Tokend ##

Tokend can be stopped by sending it an interrupt signal. This is usually done
by sending `Ctrl-C` from a terminal or by running `kill -INT $tokend_pid`.

## Monitoring Tokend ##

Tokend provides a HTTP endpoints for monitoring its status. Issue a GET
request to `/v1/health` and you'll see output similar to this:

```json
{
  "status": 200,
  "uptime": 3193957,
  "version": "1.0.0"
}
```

The `status` attribute is the response code. Response codes from the health
endpoint are compatible with [Consul's HTTP health checks][consul]. The
`uptime` attribute is the number of milliseconds the service has been running.
The `version` attribute is the version of Tokend.

[Vault]: https://www.vaultproject.io/
[Propsd]: https://github.com/rapid7/propsd/
[Warden]: https://github.com/rapid7/warden/
[installation]: ./installation.md
[configuration]: ./configuration.md
[consul]: https://www.consul.io/docs/agent/checks.html
[Amazon S3]: https://aws.amazon.com/s3/
[bucket-policies]: http://docs.aws.amazon.com/AmazonS3/latest/dev/using-iam-policies.html