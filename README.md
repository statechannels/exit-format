<div style="text-align:center"><img src="logo.png" /></div>

Standard Exit Format for L2s built on EVM chains

An exit format allows calldata to specify how assets locked up and redistributed in an L2 should be paid out in L1. We present a general standard for such a format, along with coders written in Typescript and Cairo, which will aid L2 interoperability and support arbitrary tokens

In the statechannels.org project, we have an existing format for exits (which is currently called an 'outcome'), expressed both in solidity and typescript. As well as coders, we require functions that transform the exit according to set rules: for example to execute a part of the exit, paying out one party and generating a new exit with that party removed. We will explore the use of zero knowledge methods to update exits stored on chain more efficiently. We will improve and generalize our existing format in order to save gas, reduce complexity and handle custom exit logic. We will present a standard exit format which other state channel and rollup protocols can conform with.
