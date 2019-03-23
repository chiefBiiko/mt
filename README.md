# dumpify

...

## Install

...

## FAQ

**_How does this work?_**

`dumpify` uses a gossip protocol for metadata replication and simple TCP streams for actual file sharing. Awesome modules involved: `discovery-swarm`, `scuttleup`.

**_Are dumped/shared files stored anywhere?_**

No. There are no servers or persistence layers used within dumpify.

**_Can I share files through public internet with `dumpify`?_**

No. You can share files only with peers that are within your local network.

## Troubleshoot

Make sure you and your peers are connected to the same local network.

If any dialogs regarding `dumpify`'s network access permissions pop up, allow.

## License

[MIT](./LICENSE.md)