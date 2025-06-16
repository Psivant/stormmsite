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
optimizations.  Here is what the namelist control block for the provided example looks when the
script is run in the context of STORMM's collection of example systems:
```
&files
  -sys { -p /home/david-cerutti/STORMM/test/Topology/drug_example_iso.top
         -c /home/david-cerutti/STORMM/test/Trajectory/drug_example_iso.inpcrd
         -label drug_example_iso -x conf_drug_example_iso.sdf x_kind sdf }
  <... additional input clipped ...>
&end
```

## The `&conformer` Control Block
Detailed controls of how the rotamer sampling and structure selection will be carried out are
available in the `&conformer` namelist.  While this tutorial will only cover the basics, we
recommend that users run the program with the name of the control block to get a complete
description of all the options:
```
>> /stormm/build/apps/Conf/conformer.stormm.cuda "&conformer"

<... documentation for the namelist is printed to the terminal ...>
```
The first decision to make is how many rotamer settings to sample.  Most rotatable bonds in
chemistry have three conceivable settings, and barring large groups at either end of the bond all
three will be viable to some degree, although one may be preferred.  We will set the number of
ticks on the "wheel" for a rotatable bond to 3 (the default), although if we were to set it to
something like 6, three pairs of closely spaced ticks would be found centered on 120 degree
strides around the circle.  The same functions that perform bond rotation also carry out
*cis-trans* sampling, with two possible settings and variations around them as the obvious moves to
attempt.

When sampling anything with multiple independent choices, there arises the possibility of a
combinatorial explosion: a molecule with four rotatable bonds might have 3<sup>4</sup> = 81
viable states, but if we wanted to sample each rotation to a finer degree the number could easily
grow to over 6,000.  A drug molecule with many rotatable bonds such as an oligopeptide would risk
overwhelming the available memory.  To deal with this problem, STORMM begins by offering the
`effort` keyword, with available settings *minimal*, *light*, *heavy*, and *exhaustive*.  It's
more or less the power of three that the user is comfortable with:
- Minimal will instruct the program to prioritize sampling one of each of the rotation settings,
  *cis-trans* settings (if stereoisomers are being sampled), and chiral orientations (if inversions
  are allowed) for every rotatable bond or invertible center, irrespective of what values the
  others take (they will be selected at random).  If there are more configurations left with the
  `trial_limit` these will be populated with random settings on any rotatable bond.
- A light sampling implies a priority to sample every combination of settings for any neighboring
  pair of rotatable bonds.  If there is an atom chain CA-CB-CG=CD-CZ and the CA-CB, CB-CG, and
  CD-CZ bonds are rotatable, CA-CB and CB-CG are coupled because they share atom CB.  CD-CZ is not
  coupled to either of the other two rotatable bonds, however.
- A heavy* setting will sample all combinations in chains of up to three rotatable bonds
- An *exhaustive* approach will attempt to leave no stone unturned, but prioritize the minimal,
  then light, then heavy sampling up to the `trial_limit` before applying systematic sampling to
  each geometric element.

There are also caps on the number of independent states that the conformer generator will attempt
to create, to place a hard stop on the combinatorial explosion after prioriitized sampling (turn
every rotatable bond, flip each *cis-trans* bond, and/or invert each chiral center while
randomizing other elements).  These are the `trial_count` and `local_trial_count`, which are meant
to limit the total number of conformations that the program will attempt to seed for GPU
optimization and the number of conformations that the program will attempt to sample for local
rearrangements around any given element, respectively.

Unseen in this tutorial input is the cutoff for mutual root mean-squared deviations in particle
positions, needed to ensure that the reported conformations are unique after energy minimization.
The default value of 0.15 nm may be too high for some applications, but it helps to produce a
diverse set in floppy molecules where rotamer sampling is essential.

## The `&minimize` Control Block
Energy minimization is a critical precursor to molecular simulations as it relaxes steric clashes
and other strained arrangements in the structure to bleed off excess energy before it can kick the
system into an unnatural configuration.  Readers should consult the
[dynamics tutorial](./tutorial_md) for more information.  In the conformer generator, the `cdcyc`
keyword, controlling the number of cycles over which a vnaishing softcore potential is applied to
non-bonded interactions, is very important.  While the program will apply a rudimentary clash check
to conformers that it seeds, atoms can still be left with significant overlap, leading to high
van-der Waals energies.  The vanishing softcore potential can salvage a great deal of otherwise
inviable conformations.

## The `&report` Control Block
Because we have selected `x_kind sdf` in the `&files` input for each system, the "trajectories" of
best-scoring conformers will be printed in
[Biovia Structure-Data Format (SDF) files](http://help.accelrysonline.com/ulm/onelab/1.0/content/ulm_pdfs/direct/reference/ctfileformats2016.pdf),
a format which can compile multiple structures and also offers custom meta data and annotations.
STORMM can relay critical information directly into these outputs, which another program able to
read the SDF format can then catalog.  The example's relevant user input for "key" energy
components is:
```
  sdf_item { -title total_energy    -label ALL -energy TOTAL_ENERGY }
  sdf_item { -title dihedral_energy -label ALL -energy PROPER_DIHEDRAL }
  <... other items ...>
```
As with many other keywords in STORMM's enhanced namelist input, `sdf_item` is repeatable.

## Results
Results from the tutorial exercise can be found in
<a href="https://storage.googleapis.com/stomm-psivant-com-files/conf_tutr_result.tar.gz" download>
this download link</a>, including SDF files for each system's selected conformers.

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
