---
home: true
title: Home
heroImage: 
actions:
  - text: Get Started
    link: /get-started.html
    type: primary

  - text: OSS Repository
    link: https://github.com/psivant/stormm
    type: secondary

  - text: Introductory Publication
    link: https://pubs.aip.org/aip/jcp/article/161/3/032501/3303330/STORMM-Structure-and-topology-replica-molecular
    type: secondary

xfeatures:
  - title: Why Choose STORMM?
    details: STORMM is a unique molecular mechanics package that offers dynamics and other types
             of analysis in a code base built to accelerate GPU computing.  Unlike other packages
             that focus on one molecular system at a time, STORMM combines any number of systems
             into one calculation for superior scaling as well as programming advantages.
    link: ./why-stormm

  - title: Why Open Source?
    details: Psivant Therapeutics releases STORMM as free and open-source software to bring
             together a community and advance molecular science.  Marketing the softare does not
             hold as much value as running an active development project that can invite
             collaborations with academics or other experts based on mutual goals.

  - title: Development Philosophy
    details: A programming style that harnesses the most practical improvements in C++ without
             bewildering programmers familiar with C, building a class and API structure that makes
             it easy to find where the intense math happens to translate equations into molecular
             structures.  The developers of STORMM strive for a clean and accessible tool kit.
    link: ./dev-philosophy
    
  - title: A Radical New Approach to Molecular Dynamics
    details: Unique algorithms and groudbreaking data structures come together for exceptional
             speed and versatility in a modular dynamics engine that also accelerates innovation.
    link: ./stormm-md

  - title: Advanced Ligand Screening
    details: STORMM's batching is unmatched even for small molecule simulations, staging tens of
             thousands of energy calculations in free space or hundreds in the context of a
             biomolecular target.

  - title: At Home in a Python Ecosystem
    details: In a future release, all coordinate and topology class objects will have the option to
             export or import their information to and from Python objects, connecting STORMM to a
             world of computer-aided chemistry.

  - title: Tutorials for Users
    details: Get started with STORMM's standalone programs and learn what it can do for you!
    link: ./user-tutorials
    
  - title: Tutorials for Developers
    details: Study the high-level documentation to get your bearings in the vast, original code
             base.  Learn what the libraries have to offer, and what you would need to build your
             ideal molecular modeling application with STORMM compiled as a library.
    link: ./dev-tutorials

  - title: Code Documentation (Doxygen)
    details: Delve into the code, function by function and class by class.  All methods and inputs
             are described in a manner that links back to the high-level documentation on this
             website.  Any further questions can be put to the principal developers.
    link: ./doxygen/index.html
    
footer: Copyright 2023-2025 | Psivant Therapeutics | MIT Licensed
---
<!-- 
This is the content of home page. Check [Home Page Docs][default-theme-home] for more details.

[default-theme-home]: https://vuejs.press/reference/default-theme/frontmatter.html#home-page -->

<div class="vp-features">
  <div class="vp-feature" v-for="feat in $frontmatter.xfeatures" :key="feat.title">
    <h2><a :href="feat.link" rel="noopener">{{ feat.title }}</a></h2>
    <p>{{ feat.details }}</p>
  </div>
</div>
