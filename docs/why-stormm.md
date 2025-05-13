# Why choose STORMM?

## A New Molecular Dynamics Package
There are many codes for molecular dynamics with deep histories, all of which have their notable
accomplishments.  However, in most cases the histories of these codes predate the Graphics
Processing Unit (GPU) technology that has proven so amenable to classical particle simulations, and
as a consequence these codes build on designs which may be as much as forty years old.  Even in the
past ten years, GPU architectures have grown so rapidly that what used to be considered medium to
large problems are not big enough to utilize the entirety of the most powerful cards.

Unlike other codes, STORMM stages multiple calculations in the same program instance, scaling to
any size of card, present and future, by batching the problems.  The required commonalities among
the calculations are minimal, such as that they all take similar boundary conditions or the same
thermostating method and time step.  

## A Workbench for Implementing Molecular Models
STORMM provides a rich C++ framework for reading molecular coordinates and model parameters
(topologies), manipulating their class objects with built-in routines, and parsing them into work
units that distribute the work over a wide GPU.  A versatile API offers simple commands for
exchanging information between systems, on the CPU host or GPU device.

## 
