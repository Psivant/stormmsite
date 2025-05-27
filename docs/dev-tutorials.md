# Tutorials for Developers
The following tutorials will seem advanced for many who are familiar with python or are expecting a
simple scripting system to compose their programs.  STORMM's Python bindings are in development,
and the project is intended to let not only its compiled applications but its individual objects to
be created and manipulated from within a Python framework.  For now, we advise prospective
developers to work within the STORMM source code, following the path laid out by other applications
which compile with the main build.  The libraries are modular, the pieces are there.  Rather than
a scripting environment, however, custom applications with STORMM must be compiled, custom input
control blocks written in the native C++ rather than through an interpreter which translates a
script into that language.  It's not hard, however, and we hope that the journey will provide
those who take it with a greater appreciation for how Python and HPC computing work at a level
closer to the "bare metal."

## A Basic GPU Program in STORMM
Before diving into the molecular mechanics capabilities, understand the means by which STORMM
identifies an available GPU, manages memory on the CPU host and GPU device, and transfers data
between the two resources.  For adept developer, the tutorial will also demonstrate the challenges
of implementing templated GPU kernels in the context of a C++ program and some fundamental truths
about GPU computing strategies.
link: ./tutorials/tutorial_i.md
