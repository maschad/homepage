
# Sovereign Parallelized Rollups

## Metadata

0x04aF95dcA725dDDF04A0fF85F70282F51718560d
Chad
0x04aF
April 25th, 2024

### Body

In the true spirit of the rollup-centric ecosystem, this week I’m introducing new language to the space - hopefully it broadens the imagination of what an autonomous future could look like.

Let’s start with a brief analysis of the historical evolution of Ethereum.

The evolution of Ethereum
Ethereum was revolutionary because it allowed people to create applications that could have a shared, unified state across a blockchain through the Ethereum Virtual Machine (EVM), akin to the breakthroughs in shared hosting. Shared hosting allowed many websites to share a server, not only reducing costs and maintenance, but ultimately enabling shared resources, which was epitomized in colocation centres (colos).

These advancements laid the foundation for cloud-computing, which have become the rails of the internet. However, there was a requisite modularization of the components which comprised those shared resources that had to happen first. The various aspects of running a server became problem domains of their own in order for colos to scale. Colos had to offer a variety of configurations of physical space, power, cooling, and physical security for different types of servers, storages, and networking equipment. Cloud-computing providers do the same with a higher level of abstraction over distributed colos.

Execution: The missing piece
We have seen a similar evolution take place in the Ethereum ecosystem with the rise of modular blockchains but with limited variation within the Ethereum architecture itself, particularly the EVM. Majority of layer-2 rollups use the standard EVM, as do other layer-1 networks such as Avalanche, Binance Chain, and many others.

The most glaring discrepancy is that although parallel computing is essentially ubiquitous, the EVM utilizes a traditional sequential execution model. This isn’t a particularly recent discovery, and there have been experimentations parallelizing the EVM prior to the more concerted efforts through the likes of Sei, Monad, and Neon. Eclipse is trying a unique approach utilizing the Solana Virtual Machine (SVM) whilst Fuel has remodelled the EVM , known as the FuelVM, by using strict state access lists in the form of a UTXO model.

Modular Blockchains stack (Source - Celestia)
Parallelization is not enough
Whilst Parallelized EVMs are gaining popularity in the mainstream discourse now, they in and of themselves aren’t sufficient to scale blockchains. One immediate example of a bottleneck that is currently present is that Ethereum-like blockchains generally use commodity databases for reading and writing data, but these types of databases are not optimized to store Merkle tree data - which is necessary for parallel processing. Monad is building a custom database for storing blockchain state to alleviate these concerns, whilst Fuel's unique state model enables better state minimization through native rehydration. There are also a plethora of other problems to address in managing state growth, which are non-trivial and can easily lead to network saturation. Essentially, in order to decrease transaction processing times sustainably, infrastructure around storage will have to change. Enter the fray Sovereign Rollups.

Base Storage growth over time (Source - Paradigm)
Becoming Sovereign
A Sovereign Rollup is a type of rollup that doesn’t rely on another blockchain for settlement but instead determines its canonical chain through the nodes in its own network. Therefore, a sovereign rollup is self-settling, which allows for more freedom over the execution environment it runs in. Unlike traditional rollups, where the settlement layer constrains which types of execution environments they can operate in, sovereign rollups are capable of settling in various execution environments. This means, for instance, one could use the FuelVM for execution, along with Celestia for data availability and Ethereum L1 for consensus and settlement, as has been demonstrated in prototypes such as Fuelmint. Such a reality isn’t particularly difficult to envision given that deploying such a chain has been substantially simplified with the advent of modular rollup frameworks such as Rollkit.

This configuration leverages Fuel’s unique approach to managing state bloat whilst preserving security by final settlement on Ethereum.

As the ecosystem move towards more special-purpose L2s, it’s important to be able to configure different stacks that specialize in different aspects of decentralization whilst still being able to have a shared foundation for coordination.