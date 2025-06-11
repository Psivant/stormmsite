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

## [A Basic GPU Program in STORMM](./tutorials/tutorial_i)
Before diving into the molecular mechanics capabilities, understand the means by which STORMM
identifies an available GPU, manages memory on the CPU host and GPU device, and transfers data
between the two resources.  For adept developer, the tutorial will also demonstrate the challenges
of implementing templated GPU kernels in the context of a C++ program and some fundamental truths
about GPU computing strategies.

## [A Random Walk Simulator Written in STORMM](./tutorials/tutorial_ii)
In order to present the principles and methods behind molecular dynamics and docking programs
written with STORMM, a small program has been written to carry out random walks with particles on
a two-dimensional surface.  Useful features of the primary memory management class, random number
generation, fixed-precision arithmetic, and exception reporting will be covered.  The complete
program comprises some 600 lines of C++ and 60 lines of CUDA code.

## [Creating Custom User Input Blocks](./tutorials/tutorial_iii)
Programs must accept user input in order to work on real problems, and custom programs may need to
understand unique commands.  STORMM has facilities for tailoring command line input and input
file control blocks to the developer's needs.  The features include a system for adding help
messages and descriptors to the native display system and create an interactive manual that users
navigate from the command line.

## [Making a Collection of Systems in STORMM](./tutorials/tutorial_iv)
STORMM is meant to run with as many molecular systems as the developer needs to solve a problem.
Learn to leverage STORMM's capabilities for listing files, reading topologies and input
coordinates, and creating a "synthesis" of all the named molecular systems.
