# Molecular Dynamics in STORMM
The executables **dynamics.stormm** and **dynamics.stormm.cuda** are compiled with the build: each
engine works in the manner of backend programs distributed with AMBER, NAMD, or GROMACS, handling
the entire dynamics cycle from topology and input coordinate reading to trajectory writing.  

## Implicit Solvent Dynamics
STORMM can apply any of the AMBER Generalize Born models to mimic the reaction field of aqueous
solvent.

## Explicit Solvent Dynamics
Simulations with explicit representations of solvent are still in development.  Progress along
these lines is detailed in our [2024 paper in the Journal of Chemical Physics](https://pubs.aip.org/aip/jcp/article/161/3/032501/3303330/STORMM-Structure-and-topology-replica-molecular).  The
neighbor list scheme mentioned in the paper has seen further development and appears to be a viable
path to a world-class engine.  In addition to efficient simulations, the neighbor list will give
developers easy access to the exact sector that any particle occupies at any given time step, a way
to enumerate all neighboring particles, and a simple function for calculating whether two atoms
share a non-bonded exclusion that is fast enough to be placed in the non-bonded inner loop (STORMM
invokes it for each pairwise interaction).

## Input controls
STORMM input files are designed to resemble [AMBER's](https://ambermd.org) block structure based
on Fortran namelists.  STORMM uses a custom emulator written in C++ to interpret an enhanced input
block syntax, allowing users to specify some keywords multiple times and for the creation of
subkeys in a brace-enclosed syntax reminiscent of XML.  As with other STORMM executables, the
complete list of available input blocks is displayed by running the program with no input
arguments, or by requesting `--help` on the command line.  A brief description of each control
block's purpose is provided next to its title in a table formatted to the terminal.  To see more
about the contents of each control block, users can get a complete list of all keywords, with
descriptions, by typing the name of the control block as the sole argument after the name of the
executable on the command line.

```
>> ./StormmBuild/apps/Dyna/dynamics.stormm.cuda minimize

+-------------------------------------------------------------------------------------------------+
&minimize: Wraps directives needed to carry out energy minimization of a molecular system guided
           by an energy surface based on a force field.

 Keywords [ type, default value ]:
+-------------------------------------------------------------------------------------------------+
 + cut             : [   REAL,     10.0] The inter-particle distance at which to begin neglecting
                     pairwise, particle-particle interactions, in units of Angstroms.  If given,
                     this unifying parameter will take precedence over separate specifications for
                     the electrostatic or Lennard-Jones (van-der Waals) cutoffs.

 + maxcyc          : [INTEGER,      200] Maximum number of line minimization cycles to pursue.

 + cdcyc           : [INTEGER,       25] Number of clash-damping optimization steps to perform, to
                     mitigate the effects of hard collisions between particles at the outset of
                     structure relaxation.

 + ntpr            : [INTEGER,        0] Interval at which to report energy diagnostics for the
                     minimization run, akin to the mdout results in Amber's sander and pmemd
                     programs.  The default of 0 suppresses output except at the outset of the
                     run.
(... additional output clipped...)
```

An important new feature of STORMM inputs is the `&files` block, which sweeps up many of the
AMBER command line input arguments while providing a means for users to specify multiple input
topologies and coordinate files in a manageable format.  The block's most important keyword is
`-sys` (system), a struct-type input with multiple subkeys that will be familiar to AMBER users:
`-p` for the topology, `-c` for the input coordinates file (which can also be a trajectory), `-x`
for the output trajectory, and `-r` for the checkpoint file.  

## Example Input
The following will specify a short molecular dynamics run on three copies of the Trp-cage system,
one copy of dihydrofolate reductase, and three copies of a small drug molecule based on the second
(second of two) [Onufriev / Bashford / Case Generalized Born solvent
model](https://doi.org/10.1002/prot.20033).  The environment variable `$STORMM_SOURCE` should be
replaced with the raw source path in order for the program to find the input files, distributed
with the STORMM code base.

```
&files
  -sys { -p ${STORMM_SOURCE}/test/Topology/trpcage.top
         -c ${STORMM_SOURCE}/test/Trajectory/trpcage.inpcrd
         -label TrpCage -n 3 }
  -sys { -p ${STORMM_SOURCE}/test/Topology/dhfr_cmap.top
         -c ${STORMM_SOURCE}/test/Trajectory/dhfr_cmap.inpcrd
         -label DHFR -n 1 }
  -sys { -p ${STORMM_SOURCE}/test/Topology/drug_example_iso.top
         -c ${STORMM_SOURCE}/test/Trajectory/drug_example_iso.inpcrd
         -label Drug -n 3 }
  -o dyna.m
&end

&minimize
  cdcyc 20,  ncyc 40,  maxcyc 60,
  ntpr 1,
&end

&dynamics
  nstlim = 200000,  ntpr = 500,  ntwx = 0, dt = 1.0,
  ntt = 3,
  rigid_geom on,
  temperature = { tempi 100.0, temp0 300.0, -label TrpCage },
  temperature = { tempi 100.0, temp0 400.0, -label DHFR },
  temperature = { tempi 300.0, temp0 200.0, -label Drug },
  tevo_start = 25000, tevo_end = 75000,
  tcache_depth 1,
&end

&solvent
  igb = 5,
&end

&report
  syntax = Matlab,
  energy bond,
  energy angle,
  energy dihedral,
  energy total,
  state temperature,
&end
```

In this example, each unique molecular system is given its own label group, and the temperatures
for each system are controlled by input in the `&dynamics` control block.  Unique (`ntt = 3`,
Langevin) thermostats for each system maintain the temperature at `tempi` until `tevo_start` (the
start of temperature evolution) steps have passed, then implement a linear shift towards the
equilibrium temperature `temp0` to be maintained after `tevo_end` steps have passed.

For convenience, the above input file is <a href="./assets/dyna.in" download>here</a>.  With the
relevant coordinate and topologies wrapped inside the `&files` namelist, the command to run the
input with the GPU-enabled engine is:

```
${STORMM_BUILD}/apps/Dyna/dynamics.stormm.cuda -O -i dyna.in
```

## Output Details
'Diagnostic' output, including the basic run parameters, a summary of system details, and familiar
energy components printed for each time step, are provided in a single report file comprising all
systems in the run.  In general, STORMM output reports are arranged with numbers in tabulated form,
which helps to reduce the overall size of the files by grouping similar numbers under a single
column or row description.  The tabulated form is also arranged such that narrative describing each
table will be locked behind some sort of comment symbol, if available, while the data itself is
exposed as raw numbers but enclosed within some bracket syntax to be amenable to one of several
popular matrix or data processing packages.  Output options include `.json` (no narration, as
comments are not supported in the format), `.m` (matrix packages like [Matlab](https://www.mathworks.com/products/matlab.html) and [Octave](https://octave.org)),
and `.py` ([Numpy](https://numpy.org) or [MatPlotLib](https://matplotlib.org) data), among others.
The STORMM report file is then comprehensible to a human being or admissible as a script to an
external plotting or matrix analysis toolkit.

Many outputs of the dynamics program and other applications are still under development: while
STORMM can run dynamics with starting structures and molecular mechanics parameters, checkpointing
is not yet ready and the only trajectory output format is AMBER's .crd (`8.3f`) ASCII output.

## Example Output
This <a href="./assets/dyna.m" download>report</a> is produced by **dynamics.stormm.cuda**
running the above input.  It is the equivalent of `mdout` from the AMBER sander or pmemd engines,
displaying similar readouts from the energy decomposition albeit in a different, more compact
format that assumes the user would like such information tabulated.  The output from STORMM
collects results from all systems which were run as part of the same calculation.  While it might
not be sensible to run the example inputs and compare them at once, the possibilities are clear.
The report file is a script that can be read by a human, or submitted as input to Matlab or Octave.
All information from the standard MD diagnostics is then available in a matrix package for further
analysis.

Some notes:
* The program will warn the user that atomic numbers are being inferred from masses.  This is
  because the input topology does not contain all of the information that STORMM would prefer to
  have about the system.  Other warnings might be produced if STORMM needed to insert or override
  the topology's atomic radii for Generalized Born calculations.
* Specifying `energy angle` and `energy dihedral` in the input spans several energetic terms that
  STORMM is aware of.  The `angle` corresponds to both harmonic bending terms as well as
  Urey-Bradley stretching terms which are present in the CHARMM forcefield that describes the DHFR
  system.  Likewise, `dihedral` terms include proper and improper cosine-based dihedrals as well as
  CHARMM harmonic improper dihedrals.
* The opening comment blocks of the file describe the origins of each system, which are numbered
  for convenience in the output.  Table headers of each energy term list the system number for each
  column.
* The first column of each table provides the step number at which the energy quantity was measured
  for any given system.
  