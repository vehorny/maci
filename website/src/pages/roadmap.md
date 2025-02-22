---
title: 2024 MACI Product Roadmap
description: An outline of the 2024 MACI team & product roadmap
---

# 2024 MACI Product Roadmap

This document aims to outline the 2024 MACI team & product roadmap.

_As part of our core team's efforts to make our work more accessible and to foster more collaboration from our open source community, we're publicly publishing our roadmap. We plan to re-assess & iterate on our roadmap over time, and will update this document when we do._

:::info
Note: this roadmap is still under active discussion - please join the conversation in our [GitHub roadmap discussion](https://github.com/privacy-scaling-explorations/maci/discussions/859) if you have feedback!
:::

## Team description

The MACI core team is a small collaborative team building various projects within [Privacy & Scaling Explorations (PSE)](https://pse.dev/). Our sustained focus is on MACI: a protocol that allows users to have an on-chain voting process with greatly increased collusion resistance & privacy. Additionally, we allocate a significant portion of our time to support the practical adoption of this technology by grassroots community leaders around the world using it to secure Quadratic Voting (QV) & Quadratic Funding (QF) events.

## MACI mission & vision

MACI (Minimal Anti-Collusion Infrastructure) is a public good & a potential core piece of infrastructure for many Ethereum-based applications to support privacy-protecting on-chain governance. Using MACI, no voter can reveal how they voted yet voting results are published publicly and verified with cryptographic proofs to prevent censorship, bribery, collusion, and other nefarious acts common in public polling processes. With MACI, you get the transparency you want as well as the privacy you need.

**Long term, the MACI team’s vision is to build the most secure e-voting solution in the world.**

Short term, our vision is to empower developers to build on MACI to create privacy-protecting voting applications, including quadratic funding platforms & DAO governance tools. Our goal is to provide an out-of-the-box solution for developers to quickly deploy & plug their applications into. MACI enables you to focus less time worrying about voting infrastructure & more time building the logic specific to your application.

### High-level MACI ecosystem goals

1. ~~2023: MACI integrated by 1 PSE project~~ (✅, [QFI](https://github.com/privacy-scaling-explorations/qf))
2. 2024: MACI integrated by 1 external project
3. 2025: MACI used by several DAOs for governance & multiple QF integrations
4. 2028: MACI used in smaller municipal elections (counties, provinces, etc)
5. 2030: MACI used in national elections

### High-level MACI development goals

1. ~~2023: build technical feasibility for 10K concurrent voters on the platform.~~ (✅)
2. 2024 Q1: release MACI v1.2, with revamped documentation & educational resources
3. 2026: build technical feasibility for 100K concurrent voters on the platform.
4. 2028: build technical feasibility for 1M concurrent voters on the platform.

## QF mission & vision

We’re building technical infrastructure, operational expertise & a network of communities to create a scalable way to enable community organizers to run QF rounds. The mission of our QF project has been to serve as a reference implementation on how to integrate MACI as well as support the practical adoption of this community-funding technology.

**Long term, our vision is to build the most widely adopted QF solution in the world, powered by MACI.**

Our vision to eventually enable QF rounds, running e.g. every quarter, at the local, municipal, national and global scale. We want QF rounds to become the “default” place where projects are contributing funds to public goods.

[Learn more about our QF initiatives here](https://qf.pse.dev/about).

### High-level QF ecosystem goals

1. ~~2023: facilitate 15 QF/QV rounds~~ (❌, 6 rounds)
2. 2024: facilitate 12 QF/QV rounds
3. 2025 & beyond: TBD

### High-level QF development goals

1. ~~2023: build QFI as a QV reference implementation for MACI v1.x~~ (✅❓)
2. 2024: build out reference implementation with complete QF functionality (vs. only QV)
3. 2024/5: implement additional functionality (key-switching, gas-less voting)
4. 2025: support additional QF mechanisms
5. 2025 & beyond: TBD

# 2024 workstreams

_To achieve our mission, we’re focused on 4 major workstreams that comprise our roadmap._

## 1) MACI Developer Experience (DX)

~_50% of team’s total bandwidth_

We believe that MACI is only useful to the extent that people use MACI & build on MACI.

As mentioned above in “challenges”, not a single project has yet integrated MACI v1.x in a production environment We view this as a failure, and we want to fix this. **The goal of this workstream is to make MACI as easy to understand and easy to integrate as possible.**

### Initiatives within this workstream:

- Implement & release a MACI v1.2 ([#856](https://github.com/privacy-scaling-explorations/maci/issues/856))
  - Refactor the codebase for improved quality, readability & modularity
  - Add code comments (with [TypeDoc](https://typedoc.org/) & [NatSpec](https://docs.soliditylang.org/en/latest/natspec-format.html)) to improve productivity
  - Improve tooling (e.g. cross-platform support) for ease of integration & performance
- Improve/create documentation for developer onboarding & education
  - Revamp documentation stack (via Docusaurus) with versioning & additional resources
  - Voter & coordinator guides to understand full poll lifecycle
- Build app templates & tutorials that can serve as reference implementations

**References**

- [MACI v1.2 Refactoring Plan](https://github.com/privacy-scaling-explorations/maci/issues/856)
- [MACI development team sprint board](https://github.com/orgs/privacy-scaling-explorations/projects/40)
- [MACI v1.1.1 refactor milestone](https://github.com/privacy-scaling-explorations/maci/milestone/5)

## 2) MACI Community Engagement

_~15% of team’s total bandwidth_

Along with poor DX, we believe one of the core reasons there hasn’t been ecosystem adoption of MACI is the lack of community engagement (which we touched on in “challenges”). **We’ll create an open source community where integrations & contributions are actively encouraged!**

This workstream relates closely to improving DX but focuses on areas that will require active maintenance, support & engagement from our team vs. improving code, documentation & educational resources that will be available online 24/7/365.

The hope here is that close interactions with integration developers & Ethereum community members will help us gather insightful user feedback that will help us iterate faster to improve MACI as a product. We’ll be rolling out an agile scrum development workflow that should allow us to rapidly respond to input from the community to guide our roadmap & product direction.

### Initiatives within this workstream:

- Allocate team bandwidth to be available to respond to the community
  - Support MACI integrations (starting with [clr.fund](http://clr.fund/) v1.x integration)
  - Revamp GitHub repo maintenance ([MACI GH processes](https://github.com/privacy-scaling-explorations/maci/issues/757))
  - Establish & respond to public channels ([Discord](https://discord.com/invite/sF5CT5rzrR), [Twitter](https://twitter.com/zkMACI))
- Proactively generate engagement
  - Publish public roadmaps, release blog posts, Twitter updates
  - Conference talks/presentations
  - Hackathon bounties & support
  - Actively identify collaboration opportunities with projects in the space
- Update our development processes to quickly react to user needs & input
  - Adopt agile/scrum methodologies

## 3) Quadratic Funding Experiments

_~30% of team’s total bandwidth_

[Read context on on our QF initiative here](https://qf.pse.dev/about).

### 2024 goal

- Help run 12 QF/QV rounds

### Initiatives within this workstream:

- Build an evaluation framework of QF rounds, to increase our sophistication around how we measure success
- Landscape analysis of QF & capital-allocation projects to better understand how our efforts fit in within the broader ecosystem
- Update & expand our [QF website](https://qf.pse.dev/), with public launch to generate inbound interest
- Explore community collaboration opportunities (running QF rounds)
- Exploring project collaboration opportunities (supporting MACI/QF integrations)

**References**

- [GitHub](https://github.com/privacy-scaling-explorations/qf)
- [Website](https://qf.pse.dev/)

## 4) P0tion support & handoff

_~5% of team’s total bandwidth_

A big team accomplishment in 2023 was building & launching p0tion. We’ve seen exciting early traction, with multiple development teams requesting ceremonies using our infrastructure.

For the rest of this year & early into 2024, we plan to hand off this project to the Trusted Setup team for them to maintain. Our developers will continue to support the codebase & ceremonies as we train up that team on this project. For the foreseeable future, we expect to collaborate with that team to align on the vision of the project & direct a product roadmap.

**References**

- [Github](https://github.com/privacy-scaling-explorations/p0tion)
- [Website](https://ceremony.pse.dev/)
- [Wiki](https://p0tion.super.site/)

# Future areas of research & development

While not prioritized as an upcoming workstream, we think it’s worth calling out important areas of research & development that we’re excited to work on in the future:

### [MACI Coordinator Service](https://github.com/privacy-scaling-explorations/maci-coordinator)

- The primary responsibility of the Coordinator Service will be to:
  - offload and automate the tasks performed by the human coordinator
  - minimize proving time by parallelizing SNARK proof generation and making MACI and QFI easier to adopt

### [QF stack](https://github.com/privacy-scaling-explorations/qf)

- To serve as a reference implementation on how to integrate MACI as well as support the practical adoption of this community-funding technology.
- Improvements
  - Support QF (as of now only supports QV functionality)
  - Make it easier for operators to run rounds
  - Make it easier for end users to use

### MACI improvements

- Unconditional Voter Privacy ([#796](https://github.com/privacy-scaling-explorations/maci/issues/796))
- Gas-less MACI
  - Explore ways to support cost-free voting for users
  - e.g. via a message aggregation service?
    - Instead of users submitting vote transactions on-chain, they could sign their vote messages using their MACI key, then post messages to an aggregator server. Later on, the operator can batch votes into a single Ethereum transaction, and periodically insert them a subtree at a time into the MACI message tree.
- Improving gas efficiency
  - Explore SNARK Proof Aggregation:
    - The only major way to reduce gas costs is to decrease call data size, we can do this via proof aggregation.
    - POC with Maze and other solutions to benchmark on MACI V1 circuits
    - aggregate many proofs together and make a solidity verifier for the aggregation circuit, this could offset the need for direct circom optimization
- Different matching mechanisms
  - e.g. [Group Wise Matching in Quadratic Funding](https://github.com/privacy-scaling-explorations/maci/issues/905)
- Scaling explorations
  - e.g SNARK Folding Schemes ([Nova integration](https://github.com/privacy-scaling-explorations/maci/issues/904))

# Feedback

Questions? Concerns? Ideas? We’d love to hear from you!

Feel free to [create an issue on our GitHub](https://github.com/privacy-scaling-explorations/maci/issues) or reach out to our team in the [PSE Discord](https://discord.com/invite/sF5CT5rzrR) (`#maci` channel).
