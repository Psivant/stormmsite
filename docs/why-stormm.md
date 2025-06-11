# Why choose STORMM?

## A Workbench for Implementing Molecular Models
STORMM provides a rich C++ framework for reading molecular coordinates and model parameters
(topologies), manipulating their class objects with built-in routines, and parsing them into work
units that distribute the work over a wide GPU.  A versatile API offers simple commands for
exchanging information between systems, on the CPU host or GPU device.

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

## Built-in Facilities for Taking Your Algorithms to the GPU
Without calling an external library like Thrust, STORMM provides a single `Hybrid` class for
managing memory on the CPU host and the GPU device.  Each `Hybrid` object can be allocated and
resized much like a C++ Standard Template Library `vector` and creates space for data on one or
both resources in a format which can be specified by the developer, including options for the best
data transfer rates, maximum CPU memory space, and automatic synchronization.  A `Hybrid` class
object can also operate as the holder of its own data or as a pointer to existing data in another
`Hybrid` object, formalizing C programming's pointer/array duality with an enumerator setting and
allowing more agile manipulation of GPU data in the face of high-latency memory allocation for the
underlying device architecture.

All implementations require testing to validate, and to build the upon existing features without
breaking established methods.  STORMM offers a built-in unit testing feature reminiscent of
[catch2](https://github.com/catchorg/Catch2).  This unit testing library offers a means to compare
single values or arrays of values and analyze failures, offering clues such as a miss scaled array
indicating a misstated constant.  The checks include methods for confirming that certain code
statements or inputs raise exceptions.

## Why Open-Source?
Psivant Therapeutics releases STORMM as free and open-source software to bring together a community
and advance molecular science.  Marketing the softare does not hold as much value as running an
active development project that can invite collaborations with academics or other experts based on
mutual goals.

## Python Integration On the Horizon
In a future release, all coordinate and topology class objects will have the option to export or
import their information to and from Python objects, connecting STORMM to a world of computer-aided
chemistry.
