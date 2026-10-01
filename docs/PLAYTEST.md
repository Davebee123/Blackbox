# BLACKBOX automated strategy playtest

Kill-order strategies against each enemy (a level-4 Breaker: Spike, Overload, Crack, Interrupt, Trace; the scripts only use Spike, Overload and Trace). For class balance see BALANCE.md. Scripted policies, not people. They check that no single kill order always wins; they cannot tell you whether a fight is fun or readable in five seconds.

## Fixtures

| Fixture | Start | Strategy | Result | Cycles | Integrity lost | Trace | Break order |
|---|---:|---|---|---:|---:|---:|---|
| cryptjack | 100 | Soonest attack first | victory | 6 | 4 | 0% | pulse > encryptor |
| cryptjack | 100 | Signature part first | victory | 6 | 0 | 0% | encryptor > pulse |
| cryptjack | 100 | Basic attacker first | victory | 6 | 4 | 0% | pulse > encryptor |
| cryptjack | 100 | Least armor first | victory | 6 | 4 | 0% | pulse > encryptor |
| cryptjack | 100 | Finish bare parts first | victory | 6 | 4 | 0% | pulse > encryptor |
| cryptjack | 100 | Trace on quiet cycles | victory | 12 | 58 | 0% | encryptor > pulse |
| cryptjack | 50 | Soonest attack first | victory | 6 | 4 | 0% | pulse > encryptor |
| cryptjack | 50 | Signature part first | victory | 6 | 0 | 0% | encryptor > pulse |
| cryptjack | 50 | Basic attacker first | victory | 6 | 4 | 0% | pulse > encryptor |
| cryptjack | 50 | Least armor first | victory | 6 | 4 | 0% | pulse > encryptor |
| cryptjack | 50 | Finish bare parts first | victory | 6 | 4 | 0% | pulse > encryptor |
| cryptjack | 50 | Trace on quiet cycles | crashed | 11 | 50 | 0% | encryptor |
| splinter | 100 | Soonest attack first | victory | 6 | 12 | 0% | replicator > pulse |
| splinter | 100 | Signature part first | victory | 6 | 12 | 0% | replicator > pulse |
| splinter | 100 | Basic attacker first | victory | 10 | 3 | 0% | pulse > frag1 > frag2 > replicator |
| splinter | 100 | Least armor first | victory | 10 | 3 | 0% | pulse > frag1 > frag2 > replicator |
| splinter | 100 | Finish bare parts first | victory | 6 | 12 | 0% | replicator > pulse |
| splinter | 100 | Trace on quiet cycles | crashed | 28 | 100 | 0% | frag1 > frag2 > frag3 > frag4 > frag5 > frag6 |
| splinter | 50 | Soonest attack first | victory | 6 | 12 | 0% | replicator > pulse |
| splinter | 50 | Signature part first | victory | 6 | 12 | 0% | replicator > pulse |
| splinter | 50 | Basic attacker first | victory | 10 | 3 | 0% | pulse > frag1 > frag2 > replicator |
| splinter | 50 | Least armor first | victory | 10 | 3 | 0% | pulse > frag1 > frag2 > replicator |
| splinter | 50 | Finish bare parts first | victory | 6 | 12 | 0% | replicator > pulse |
| splinter | 50 | Trace on quiet cycles | crashed | 16 | 50 | 0% | frag1 > frag2 > frag3 |
| ghostroot | 100 | Soonest attack first | victory | 6 | 0 | 0% | pulse > scrambler |
| ghostroot | 100 | Signature part first | victory | 8 | 28 | 0% | scrambler > pulse |
| ghostroot | 100 | Basic attacker first | victory | 6 | 0 | 0% | pulse > scrambler |
| ghostroot | 100 | Least armor first | victory | 6 | 0 | 0% | pulse > scrambler |
| ghostroot | 100 | Finish bare parts first | victory | 6 | 0 | 0% | pulse > scrambler |
| ghostroot | 100 | Trace on quiet cycles | victory | 12 | 28 | 0% | pulse > scrambler |
| ghostroot | 50 | Soonest attack first | victory | 6 | 0 | 0% | pulse > scrambler |
| ghostroot | 50 | Signature part first | victory | 8 | 28 | 0% | scrambler > pulse |
| ghostroot | 50 | Basic attacker first | victory | 6 | 0 | 0% | pulse > scrambler |
| ghostroot | 50 | Least armor first | victory | 6 | 0 | 0% | pulse > scrambler |
| ghostroot | 50 | Finish bare parts first | victory | 6 | 0 | 0% | pulse > scrambler |
| ghostroot | 50 | Trace on quiet cycles | victory | 12 | 28 | 0% | pulse > scrambler |

## Best strategy across 30 random variants

Score = victory, then Integrity left, then fewer cycles.

| Strategy | Variants where it was best |
|---|---:|
| Soonest attack first | 17 |
| Signature part first | 7 |
| Basic attacker first | 6 |
