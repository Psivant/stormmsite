# Conformer Generation in STORMM
Conformer generation requires some degree of geometry optimzation guided by a force field, [whether
that is a simple clash check or rotamer score or a complete molecular mechanics
model](https://pubs.acs.org/doi/10.1021/ci100031x).
In STORMM, conformer generation relies on a complete model such as would be admissible to molecular
dynamics simulations, although there are options to reduce the level of detail.  STORMM makes a
provisional exploration of the combinatorial rotamer possibilities, then uses its molecular
mechanics batching to perform thousands of independent energy minimizations on the GPU.

The procedure described in this tutorial may be implemented by running
<a href="https://storage.googleapis.com/stomm-psivant-com-files/run_dynamics.sh" download>this
script.</a> Two environment variables are required, but may already be set as a part of the
STORMM build procedure.  The script will prompt the user if the variables are unset.

## The `&files` Control Block
The contents of the `&files` namelist will be familiar to those who have worked through the
[dynamics tutorial](./tutorial_md).  Most of the keys and sub-keys have cognates in the controls
for AMBER programs **sander** and **pmemd**.  We use the `-sys` keyword with its various sub-keys
to specify several topologies and their respective input coordinates, along with "trajectory" files
to print the resulting conformers, whatever will be found by the rotamer search and subsequent
optimizations.
```

```

## The `&conformer` Control Block

## The `&minimize` Control Block

## Overall GPU Uptime: What to Expect
If all calculations were run on the CPU, the energy minimization would dominate the calculation
time, more than 98 percent in a typical problem.  However, with GPUs accelerating the calculation
by 1000x or more over what a single CPU can push forward, what was 0.98 becomes 0.002, which is a
small part of the remaining 0.02.  The lengthiest part of the calculation, in terms of wall time,
shifts to something else (our profiling indicates that it is conformer seeding and file
processing), and the overall GPU uptime of the calculation is only about 20-30%.  While it may be
possible to add more CPU work in an MPI- or OpenMP-parallel compilation of the host code, this
introduces more program complexity and eventually makes new features harder to add.  Another
possibility is for the operator to interleave multiple jobs on different CPUs, running STORMM
through [MPS on an NVIDIA GPU](https://docs.nvidia.com/deploy/mps/index.html) for a higher overall
GPU utilization.  The block then moves to the disk hardware, what rate the topology files and input
coordinates can be read or output trajectories written.  For what it is doing, however, STORMM's
conformer generation is producing a huge number of molecular mechanics model optimizations in very
little time.
