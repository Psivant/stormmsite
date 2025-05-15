# Molecular Dynamics in STORMM
The executables dynamics.stormm and dynamics.stormm.cuda are compiled with the build: each engine
works in the manner of backend programs distributed with AMBER, NAMD, or GROMACS, handling the
entire dynamics cycle from topology and input coordinate reading to trajectory writing.  

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

An important new feature of STORMM inputs is the `&amp;files` block, which sweeps up many of the
AMBER command line input arguments while providing a means for users to specify multiple input
topologies and coordinate files in a manageable format.  The block's most important keyword is
`-sys` (system), a struct-type input with multiple subkeys that will be familiar to AMBER users:
`-p` for the topology, `-c` for the input coordinates file (which can also be a trajectory), `-x`
for the output trajectory, and `-r` for the checkpoint file.  

## Example Input

## Output Details
'Diagnostic' output, including the basic run parameters, a summary of system details, and familiar
energy components printed for each time step, are provided in a single report file comprising all
systems in the run.

Some outputs of the dynamics program are still under development: while STORMM can run dynamics
with starting structures and molecular mechanics parameters, checkpointing is not yet ready and the
only trajectory output format is AMBER's .crd (`8.3f`) ASCII output.

