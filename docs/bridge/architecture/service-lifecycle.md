# Service Lifecycle Contract

The CLI runtime must preserve the following contract:

1. `clawket pair` installs and starts the background runtime whenever the platform supports persistent registration.
2. `clawket pair` must still start the runtime immediately when persistent Linux autostart is unavailable.
3. `clawket start` remains an alias of `clawket install`.
4. `clawket stop` stops the runtime without removing startup registration.
5. `clawket uninstall` removes startup registration.
6. `pair`, `install`, `restart`, `stop`, `reset`, and `uninstall` converge the machine back to a single runtime by cleaning stale bridge processes first.
7. `clawket run` refuses to start alongside an existing runtime unless `--replace` is passed.
8. Runtime logs remain machine-parsable as `[epoch_ms] ...`.

The shared runtime is also demand-driven:

- only keep the local Gateway socket open while Relay has active client demand or queued `connect` handshakes
- close the socket again when the bridge becomes idle
- recycle a still-open Gateway socket when demand transitions from `0` to `>0`
- queue and flush proxied `connect` handshakes across transient Gateway reconnects
