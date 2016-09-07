# How to install Tokend #

[Releases of Tokend][releases] include both source tarballs and Debian
packages. Debian and Ubuntu based Linux distributions can use the pre-built
packages. Other operating systems should install Tokend from source.

## Installing from the Debian package ##

Tokend runs on the 4.4.x LTS version of Node.js, so follow the [instructions
for installing Node.js on Debian based systems][node-debian].

Download a pre-built Debian package of Tokend from [the releases
page][releases] and save it. These instructions assume you've saved the package
to `/tmp/tokend.deb`.

Use `dpkg` to install Tokend.

~~~bash
dpkg -i /tmp/tokend.deb
~~~

Tokend is installed into `/opt/tokend`.

## Installing from source ##

Tokend runs on the 4.4.x LTS version of Node.js, so follow the [instructions
for installing Node.js][node-source].

Download a tarball of the Tokend sources from [the releases page][releases] and
save it. These instructions assume you've saved the tarball to
`/tmp/tokend.tar.gz`.

Create a new folder for tokend. These instructions assume you're using
`/opt` as that folder.

~~~bash
mkdir /opt
~~~

Use `npm` to install Tokend.

~~~bash
cd /opt
npm install /tmp/tokend.tar.gz
~~~

Tokend is installed into `/opt/node_modules/tokend`.

[releases]: https://github.com/rapid7/tokend/releases/latest
[node-debian]: https://nodejs.org/en/download/package-manager/#debian-and-ubuntu-based-linux-distributions
[node-source]: https://nodejs.org/en/download/