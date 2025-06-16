# Implicit-Solvent Molecular Dynamics

## User Input
STORMM uses an input format with similarities to AMBER's **sander** and **pmemd** engines, but
with design decisions that reorganize the input blocks.  This is meant to support STORMM's
multi-system paradigm and also reorganize the information in a more intuitive way.  Rather than a
common `&cntrl` namelist control block, STORMM uses separate `&minimize` and `&dynamics` namelists
for each process.  Inputs that would go on the command line in one of the AMBER engines are
encapsulated within the `&files` namelist, although command line inputs are still accepted (some
will override, others will be added to directives in the `&files` namelist).  As part of an effort
to provide reproducible calculations, STORMM offers controls for the numerics and random number
generation through the `&precision` and `&random` namelists, respectively.  With the bulk of the
directives packaged into an input file such as **stormm.in**,
most STORMM apps can run with:
```
>> /stormm/build/apps/my_app -i stormm.in
```
An example of possible user input is given [elsewhere on the website](../stormm-md).  This
tutorial will explore some of the more sophisticated methods available in STORMM.

<a href="https://storage.googleapis.com/stomm-psivant-com-files/run_dynamics.sh" download>A script
to run the entire set of simulations is available here.</a> The script depends on two environment
variables which may already be set as part of the STORMM build process, but the script will prompt
the user if they are unset.

## The `&files` Control Block
Most STORMM input will begin with a namelist control block such as:
```
&files
  -sys { -p /name/of/topology.prmtop -c /name/of/input/coordinates.inpcrd }
  -o /name/of/report/file.m
&end
```
To exploit what STORMM was engineered to do, we can enter multiple instances of the `-sys` (system)
keyword.  Each instance can have its own sub-key entries for the topology (`-p`), input coordinates
(`-c`), output trajectory (`-x`) and even choices of the file formats for the input and output
coordinates. (Additional formats for the input topology are planned but not yet implemented.)
Another important option in the `-sys` keyword space is `-label`.  This provides a way to identify
the system and modify it with subsequent inputs.  Furthermore, multiple systems can be grouped
under the same `-label`.  If no `-label` is given by the user, a unique label will be assigned
automatically.  The user may look in the report file (`-o`) to see which labels were assigned to
each system, e.g. to trace a problem reported later in the run.

Multiple replicas of any given system can be initiated from one input coordinates file.  There are
two options.  First, providing a *trajectory* of input coordinates with multiple frames can create
multiple simulations based on each frame.  By default, only the first frame of a trajectory will be
taken, but by specifying `frame_start` and `frame_end` a series of frames in the trajectory can
each initialize their own replica of the system described by the associated topology.  All such
systems will fall under the same `-label` group.  In addition, the user may specify `-n` to
replicate a single starting structure a number of times.

The output report is named in the `&files` namelist control block (`-o`) but further configured in
another control block.  Another option for output is `-t`, the input transcript file, into which a
report of all user input and its interpretation will be dumped at the end of the calculation.  A
third output file is specified by `-wrn`, the destination of any warnings generated over the course
of the run.

If the user prefers, the topology, input coordinates, and various report files may be specified on
the command line.  The `&files` namelist prevents a user from needing to enter a large amount of
data for many systems on the command line.  The command line lets a user re-use the same input file
for separate runs of individual systems.

One other feature that STORMM offers, at a slight expense in computation time, is the ability to
direct STORMM to an entire directory of files, or to all files matching a regular expression.  Each
value supplied after a `-p` or `-c` sub-key in the space of a `-sys` keyword is first searched as
the name of an actual file, and if no such file exists it is searched as the name of a regular
expression and finally as a directory.  If multiple files are found by either of the subsequent
searches, all such files will spawn systems, again under the same `-label` group.

Here is the `&files` control block from the example that this tutorial will develop:
```
&files
  -p ${STORMM_SOURCE}/test/Namelists/topol/.*.top
  -c ${STORMM_SOURCE}/test/Namelists/coord/.*.inpcrd
  -x amino.crd
  -r amino.rst
  x_kind AMBER_CRD
  -sys { -p ${STORMM_SOURCE}/test/Topology/trpcage.top
         -c ${STORMM_SOURCE}/test/Trajectory/trpcage.inpcrd
         -x trpcage_run.crd
         -r trpcage_run.rst
         x_kind AMBER_CRD
         -label trpcage -n 4 }
  -t dynamics.xscript
  -o report.m
&end
```
The above input will look in the STORMM source distribution for all matching topologies in
**/stormm/home/test/Namelists/topol/** and all matching coordinates in
**/stormm/home/test/Namelists/coord/**, making one system out of each matching pair.  A topology
and coordinate set are "matched" by first checking the numbers of atoms, then checking the base
file names (the part discarding all directory paths and before any '.') for matches, and for
further discrimination running a quick calculation of the bond and angle energy on the CPU for the
given topological parameters and coordinates.  The best available matches are chosen, but this
"lazy" method for telling STORMM what files to use remains prone to errors and should be used only
in well controlled cases with sane input structures.  Alongside various amino acid di- and
tri-peptides, the input will also grab the Trp-cage structure and topology from the source
distribution and clone four copies of that system.

## The `&minimize` Control Block
Most systems' initial coordinates contain strained interactions that must be relaxed before stable
dynamics can take place.  In STORMM, directives for this geometry optimization to minimize the
energy are collected in the `&minimize` control block.  Many of the inputs will be familiar to
AMBER users: `ncyc` for the number of steepest descent minimization steps, `maxcyc` for the maximum
number of energy minimization cycles, and ntpr for the step frequency at which to output the
energy components throughout the calculation.

One fundamental difference in STORMM and AMBER is the algorithm by which STORMM does the line
minimization.  AMBER will compute the force and perhaps take the conjugate gradient if the current
step count is greater than `ncyc`, then make the move and back up and reduce the step size if the
energy is computed to be worse on the subsequent step.  By comparison, STORMM will compute the
energy of the current configuration as well as the force or conjugate gradient applicable to all
atoms, then move the particles along that directional vector in proportion to the current step
size, at which point it will recalculate the energy (but not forces), then move further along the
chosen direction if it yielded a lower energy or reverse the move if the energy increased.  This
will happen a third time, and after STORMM has amassed four distinct energy readings along the line
of interest, it will use a cubic polynomial fit to estimate the optimal point along the chosen
direction to situate the system.  This is a more laborious move, step for step, than AMBER takes,
but it accomplishes a deeper minimization for a given number of steps. (We are not sure whether
STORMM or AMBER accomplishes a more rapid or depthy relaxation of the system for a given amount of
wall time.)

The most significant addition to STORMM's `&minimize` namelist is the `cdcyc` keyword.  This
introduces a soft-core potential for electrostatic or van-der Waals interactions *within a limited
range and no further*.  Outside of the applicable range, which is typically less than 0.1 nm for
electrostatics and a fraction of the pairwise particle radius for van-der Waals forces, the
potentials take their natural form, with the soft-core potentials adjusted to provide continuous
values and derivatives at the crossover point.  Furthermore, as the step count approaches `cdcyc`,
the limits of the soft-core potentials are reduced until they vanish.  These potentials help a
great deal of otherwise intractable minimizations to proceed.

Minimization directives for the tutorial are as follows:
```
&minimize
  cdcyc 50,  ncyc 100,  maxcyc 1000,
  ntpr 50,
&end
```

## The `&dynamics` Control Block
Molecular dynamics will begin immediately after energy minimization if a `&dynamics` namelist is
present.  Again, many of the namelist keywords follow from AMBER, such as `dt` for the time step,
although the units of `dt` are femtoseconds in STORMM (in the interest of keeping an exact
representation of the overall simulation time--0.001 picoseconds cannot be represented exactly in
floating point numbers).  Geometry constraints are engaged by setting the keyword `rigid_geom` to
`on` or `true`.

Because STORMM handles multiple systems at once, the thermostat controls are more complex.  The
type of thermostat is, as in AMBER, specified by `ntt` (3 being a Langevin thermostat, which is
appropriate for implicit solvent simulations).  We can use the labels applied in the `&files`
namelist to specify the temperature controls for groups of systems.  As in AMBER, `tempi` states in
the initial temperature (of the heat bath connected to the thermostat, and which will be applied to
all particle velocities if they are not read from the input coordinates).  The sub-key `temp0`
states the final simulation temperature.  Unique to STORMM, the `tevo_start` (start of temperature
evolution) and `tevo_end` (end of temperature evolution) specify a range of time step over which
the thermostat temperature will make a linear shift from `tempi` to `temp0`.

Dynamics in the tutorial are controlled by the following.  One additional namelist, `&solvent`,
sweeps up some additional keywords from the AMBER engines' `&cntrl` namelist such as `igb`, but
this tutorial will not go into great detail.  As with all namelists used by
**dynamics.stormm.cuda**, the contents of the control block will display in the terminal if a user
runs the program with the name of the control block, e.g. `&dynamics` or `&solvent`, as the command
line argument.
```
&dynamics
  nstlim = 200000,  ntpr = 250,  ntwx = 5000, dt = 1.0,
  ntt = 3,
  rigid_geom on,
  temperature = { tempi 100.0, temp0 400.0, -label all },
  temperature = { tempi 100.0, temp0 300.0, -label trpcage },
  tevo_start = 250, tevo_end = 750,
  tcache_depth 1,
&end
```

## The `report` Control Block
Preliminary diagnostics for any MD simulation, including free energy calculations, include the
total energy and its breakdown by specific components such as bond stretching or kinetic energy.
(In reality, the enthalpic terms do not separate, there is just the wavefunction and its energy.)
The information in the `mdout` file produced by AMBER's **sander** or **pmemd** (provide `-o mdout`
on the command line) is provided step by step at the frequency of `ntpr` in the `&cntrl` namelist
control block (as it is in STORMM, with the same keyword for the frequency in the `&dynamics` or
`&minimize` namelists).  However, STORMM's report file provides the information in a much more
compact format, one which is designed to mimic the syntax of a matrix algebra package.  This is the
function of the `syntax` keyword: to specify which matrix package or use STORMM's native format.
No matter the choice, the energy values for each system will be displayed in the columns of a
table, with the step number in the leftmost column.  The choice of energy quantities to display is
up to the user: in the example below, we display total energy as well as the temperature, a state
variable (along with pressure or volume, although those do not register in an implicit solvent
simulation).
```
&report
  syntax = Matlab,
  energy total, state temperature,
  varname tutr,
&end
```
In order to specify additional energy components, we would write more instances of the `energy`
keyword, e.g. `energy bond, energy angle`.  As with all other keywords, it is also valid to write
`energy = bond`, `energy = dihedral`.  When specifying some energy components, this will trigger
multiple related quantities to be printed.  In particular, `energy = electrostatic` will cause both
the non-bonded electrostatic and 1:4 attenuated electrostatic interactions to be printed as
separate quantities.  Requesting `energy = dihedral` will print separate quantities for the
"proper" and "improper" dihedral energies.  Another option the user gets is to specify the name of
the matrix variables under which different energy components will be stored if the output report is
run in the matrix algebra package of choice with the `varname` keyword.  This can be useful when
loading the results from multiple simulation sets in a single matrix algebra program session.

## Results
<a href="https://storage.googleapis.com/stomm-psivant-com-files/dynamics_tutorial_result.m">Results
of the exmaple script can be found here.</a> The exact energies may vary depending on the CPU or
GPU architecture used to run the test, but for a given machine (and also identical hardware
configurations) the results should be reproducible from run to run.

A few notes on the output:
- The final temperatures of the various systems (four Trp-cage simulations and a handful of amino
  acids) will not be exactly 300 or 400 Kelvin, respectively, due to the nature of the Langevin
  thermostat and the way energy sloshes around between potential and kinetic components even in a
  simulation with no thermostating.  Over time, if the simulations are pushed longer, the average
  energies of each system will be much closer to the `temp0` targets of their respective
  thermostats.
- The output is organized into sections.  Narration is protected behind comment characters
  recognized by the chosen matrix algebra package so that the report file is human readable and
  also runs as a script.
- In Section 2, the file names and labels of each system are listed with their system numbers.
  These system numbers appear above various columns in subsequent tables detailing energy or state
  values.
- If a table would exceed the width of the terminal (or, the allowed output file width specified
  by the `report_width` keyword in the `&report` namelist, additional columns of the table will
  be specified further on in the file.  Matrices are pre-allocated in various matrix algebra
  packages to ensure that the style does not create excessive array resizing during an analysis
  session.
- Options are in development to report mean values for energies in various label groups, and to
  cull statistical outliers.

## Conclusion
STORMM's unique approach, building the package to assume that multiple systems will be involved in
any calculation, has led to innovations and new standards in the input and control options as well
as new organization in the output.  Without explicit intervention, the systems in a
[STORMM synthesis](./tutorial_iv) are independent, but with the coordinates arranged back-to-back
in a contiguous array there is no barrier to creating a new class or function that makes the
systems exchange or interact.  Engineering in this aspect of STORMM will continue to provide users
and developers with convenient ways to create and manage many related problems at once.
