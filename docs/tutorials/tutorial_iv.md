# The Molecular Mechanics Workbench: Creating and Unpacking STORMM's Topologies and Coordinates
Memory management, class conventions, and input mechanisms are essential preconditions for a
programming environment that supports GPU programming, but the purpose of STORMM is to collect
many molecular systems into a single program instance and have them communicate where helpful or
subdivide into some common denominator of work units to stack problems together when the goal is
to optimize GPU utilization.  First, we will need a topology class, which in STORMM is the
`AtomGraph`.  Second, we require a means for storing structures, and also perhaps atomic velocities
and force accumulators, and for that STORMM has several options.  To collect systems together and
make them a super-problem amenable to GPU computing,
[topologies and coordinates collate into syntheses](../dev-philosophy#syntheses-not-just-arrays-of-topologies-or-coordinate-sets),
as described elsewhere on the site.

## Reading Individual Topologies and Structures from Files
We can configure command line arguments to accept the names of topology and input coordinate files
for any molecular system, and even multiple systems.  Following on
[the previous tutorial](./tutorial_iii) this is done with a `CommandLineParser` as shown in the
code below:
```
#include "/stormm/home/src/Namelists/command_line_parser.h"
#include "/stormm/home/src/Namelists/namelist_emulator.h"
#include "/stormm/home/src/Namelists/namelist_enumerators.h"

using stormm::namelist::CommandLineParser;
using stormm::namelist::DefaultIsObligatory;
using stormm::namelist::InputRepeats;
using stormm::namelist::NamelistEmulator;
using stormm::namelist::NamelistType;

  CommandLineParser clip("tutorial_iv", "A demonstration of topology and coordinate manipulation "
                         "in STORMM");
  NamelistEmulator *t_nml = clip.getNamelistPointer();
  t_nml->addKeyword("-topol", NamelistType::STRING, std::string(""), DefaultIsObligatory::NO,
                    InputRepeats::YES);
  t_nml->addHelp("-topol", "Select a topology file.  This input may be repeated.\n");
  t_nml->addKeyword("-coord", NamelistType::STRING, std::string(""), DefaultIsObligatory::NO,
                    InputRepeats::YES);
  t_nml->addHelp("-topol", "Select an input coordinate file.  This input may be repeated.\n");
```

## Establishing a Test Framework
Anticipating some tests that will be done on each system to showcase how to unpack a topology, we
can also boot up a wall time tracker to help convey a sense of how much some basic CPU operations
will cost.
```
#include "/stormm/home/src/UnitTesting/stopwatch.h"

using stormm::testing::StopWatch;

  StopWatch the_clock("STORMM Tutorial IV");
  const int file_read_tm  = the_clock.addCategory("File Reading");
  const int chem_work_tm  = the_clock.addCategory("Chemical Features Detection");
  const int excl_work_tm  = the_clock.addCategory("Non-bonded Exclusion Detection");
  const int basic_nonb_tm = the_clock.addCategory("Basic Non-bonded Evaulation");
  const int clean_nonb_tm = the_clock.addCategory("Non-bonded Evaulation Cleanup");
  const int excl_nonb_tm  = the_clock.addCategory("Excluded Non-bonded Evaulation");
```
When we unpack topologies and manipulate data in a coordinate object, it is important to know that
the results are correct, and for that we need a unit testing framework.  This is an oppotunity to
showcase STORMM's native unit testing features.  Unit tests are collected and tracked within a
global object of the [`CheckList`](../doxygen/classstormm_1_1testing_1_1CheckList.html) class while
certain tolerances for the tests and their display is tracked using the
[`TestEnvironment`](../doxygen/classstormm_1_1testing_1_1TestEnvironment.html), which like the
`StopWatch` permits the developer to categorize tests.  We will construct the `TestEnvironment`
object with the already created `CommandLineParser` object, as the `TestEnvironment` also scours
the command line for specific directives.
```
#include "/stormm/home/src/UnitTesting/test_environment.h"

using stormm::testing::TestEnvironment;

  TestEnvironment tenv(argc, argv, &clip);
```
Furthermore, by importing Unit tests can be categorized by declaring different sections with
titles inside of the global `CheckList gbl_test_results`, using the `section` function:
```
#include "/stormm/home/src/UnitTesting/unit_test.h"

using stormm::testing::section;

section("Total charge");
section("Non-bonded electrostatics");
```
Of course, without knowing *a priori* what systems will come in from the command line, we will need
to limit most tests to verifying the equality of quantities that can be evaluated in multiple ways
with independent implementations.

## Reading Structures and Topologies
Both topologies and structure class objects can be constructed based on file names in STORMM (each
of the constructors have a number of default arguments, which will be ignored for the purposes of
this tutorial).  The file names are present in the `NamelistEmulator` member of the
`CommandLineParser`.  It is one case in which we will not make the effort to encapsulate the user
input in a separate class object, as the command line data will not be needed again (and also
because the various `const`-qualified integers and arrays of strings we are creating in `main` are
what such a class object would contain).  To hold atomic positions and also allocate space for
force calculations, we will choose an object of the
[`PhaseSpace`](../doxygen/classstormm_1_1trajectory_1_1PhaseSpace.html) class, and make a
`std::vector` of these phase spaces to hold the initial coordinates of each system.
```

using stormm::topology::AtomGraph;
using stormm::trajectory::PhaseSpace;

  const int ntop = t_nml->getKeywordEntries("-topol");
  const int ncrd = t_nml->getKeywordEntries("-coord");
  std::vector<std::string> user_defined_topologies;
  user_defined_topologies.reserve(ntop);
  std::vector<std::string> user_defined_coordinates;
  user_defined_coordinates.reserve(ncrd);
  for (int i = 0; i < ntop; i++) {
    user_defined_topologies.push_back(t_nml->getStringValue("-topol", i));
  }
  for (int i = 0; i < ncrd; i++) {
    user_defined_coordinates.push_back(t_nml->getStringValue("-coord", i));
  }
  std::vector<AtomGraph> agv;
  if (ntop == 0) {
    rtErr("At least one topology must be provided.");
  }
  for (int i = 0; i < ntop; i++) {
    agv.emplace_back(user_defined_topologies[i]);
  }
  std::vector<PhaseSpace> psv;
  for (int i = 0; i < ncrd; i++) {
    psv.emplace_back(user_defined_coordinates[i]);
  }
  the_clock.assignTime(file_read_tm);
```
Once the above code executes, the files will be read and the information organized.  In the
topology, there is a lot of O(*N*) analysis in the numbers of atoms, valence interaction terms,
and other properties that will take place in order to construct the `AtomGraph` (the class and its
associated utility functions span more than 5,000 lines of C++).  We can now run our first test of
the results (perhaps to check that there is one topology for every structure provided, but that is
trivial).  We will check whether the topologies appear to match the structures, in the order they
were provided:
```
using stormm::testing::RelationalOperator;

  const int failures_pt_a = gbl_test_results.getOverallFailureCount();
  for (int i = 0; i < std::min(ncrd, ntop); i++) {
    check(agv[i].getAtomCount(), RelationalOperator::EQUAL, psv[i].getAtomCount(), "The number of "
          "atoms in supplied topology " + std::to_string(i + 1) + " (" +
          std::to_string(agv[i].getAtomCount()) + ") does not match the number of atoms in the "
          "corresponding coordinate set (" + std::to_string(psv[i].getAtomCount()) + ").",
          TestPriority::NON_CRITICAL);
  }
  const bool all_match = (failures_pt_a == gbl_test_results.getOverallFailureCount());
```
In the above, we are storing a record of the number of failures before checks on the system sanity,
(anticipating that future additions to the program might insert othere unit tests), then comparing
it to the number of failures after the sanity checks to ensure that all of them have passed.  We
could also have done this by declaring a new section for these specific tests:
```
using stormm::testing::section;

  section("Sanity checks on systems");
  <... sanity checks here ...>
  const int sanity_chk_id = gbl_test_results.getCurrentSection();
  const bool all_match = (gbl_test_results.getFailureCount(sanity_chk_id) == 0);
```
Feeding `gbl_test_results.getCurrentSection()` to the `CheckList` method for accessing the failure
count is not necessary, as by default it returns the result pertaining to the current section, but
as with other implementations in this tutorial the goal is explicit pronunciation of inputs to
demonstrate how things work.

## A Look at the Chemistry of Each Topology
With a topology in hand, there are a number of class objects that can be created to facilitate
calculations.  The first is a
[`ChemicalFeatures`](../doxygen/classstormm_1_1chemistry_1_1ChemicalFeatures.html) object, which
was created to detect, at a basic level, the rotatable bonds in the system.  In much the same way
that STORMM builds its own unit testing rather than include a dependency, we built a lightweight
class to analyze the chemical environments in any system that STORMM reads, without having to
install something heavier like [RDKit](https://github.com/rdkit/rdkit) and ship information to and
from the package.  We do intend to have STORMM function in the context of Python and communicate
with RDKit in particular, but in the early development we realized that RDKit needs definitions of
bond orders *as inputs*, and for us calculating the bond orders in organic molecules was both
relatively simple and integral to deciding which bonds rotate.  We also came up with unique
solutions to basic problems like assigning formal charges to atoms: STORMM uses an implementation
of the [Indigo method](https://jcheminf.biomedcentral.com/articles/10.1186/s13321-019-0340-0), and
calculates all structures that participate in resonance to compute average formal charges.  STORMM
will assign -0.5*e* charge to each oxygen of a carboxylate rather than placing -1.0*e* on one and
zero on the other.  With an array of topologies (`std::vector<AtomGraph>`), we can create an array
of corresponding `ChemicalFeatures` objects:
```
#include "/stormm/home/src/Chemistry/chemical_features.h"

using stormm::chemistry::ChemicalFeatures;

  const int chem_work_tm  = the_clock.addCategory("Chemical Features Detection");
  std::vector<ChemicalFeatures> ftv;
  for (int i = 0; i < ntop; i++) {
    if (all_match) {
      ftv.emplace_back(agv[i], psv[i]);
    }
    else {
      ftv.emplace_back(agv[i]);
    }
  }
  the_clock.assignTime(chem_work_tm);
```

The `ChemicalFeatures` object works at the level of C++, although a GPU-compatible form of its
data that collects properties for many systems together is in development (for making conformer
seeding run on the GPU).  The objects are quick to construct, and can be queried for various
results through C++ accessors. (The `ChemicalFeatures` class also produce abstracts, but we won't
provide examples using them here.)
```
  printf("Properties of each system:\n\n");
  printf("                               Net      Molecular  Chiral  Aromatic Rotatable\n");
  printf("    System       Atoms Bonds  Charge     Weight    Centers  Groups    Bonds  \n");
  printf("--------------   ----- ----- -------- ------------ ------- -------- ---------\n");
  for (int i = 0; i < ntop; i++) {
    printf("%-14.14s : %5d %5d %7.4lf %12.4lf %7d %8d %9d\n",
           getBaseName(agv[i].getFileName()).c_str(), agv[i].getAtomCount(),
           agv[i].getBondTermCount(), sum<double>(agv[i].getPartialCharge<double>()),
           agv[i].getTotalMass(), ftv[i].getChiralCenterCount(),
           ftv[i].getAromaticGroupCount(), ftv[i].getRotatableBondCount());
  }
  printf("\n");
```
As can be seen above, `ChemicalFeatures` includes information about chiral centers, aromaticity,
and bond orders.  It is enough information to translate a typical molecular dynamics topology and
coordinate set into a Biovia SDF, despite the fact that a typical topology does not include bond
orders (atom types and bond equilibria or force constants, but not explicit bond orders).  This
will provide a stepping stone to the more advanced capabilities in RDKit, and gives developers some
fundamental tools for chemical perception without any external dependencies.

## Getting Ready to Simulate: Making an Exclusion Table
Molecular dynamics would be so simple, but for the fact that particles bonded to one another do not
participate in non-bonded interactions (which would be very strained if taking their non-bonded
parameters at face value).  Some sort of bookkeeping to address this question is a pervasive need
in any program that does molecular mechanics, and STORMM provides a simple way to get a
sophisticated object for tracking exclusions which evaluates in such a trivial amount of time that
it can be incorporated into a molecular dynamics inner loop.  This is the
[`LocalExclusionMask`](../doxygen/classstormm_1_1energy_1_1LocalExclusionMask.html), and
objects of this class can be created for each topology as shown below:
```
#include "/stormm/home/src/Potential/local_exclusionmask.h"

  using stormm::energy::LocalExclusionMask;

  const int excl_work_tm  = the_clock.addCategory("Non-bonded Exclusion Detection");
  std::vector<LocalExclusionMask> exv;
  for (int i = 0; i < ntop; i++) {
    exv.emplace_back(agv[i]);
  }
  the_clock.assignTime(excl_work_tm);
```
The `LocalExclusionMask` does not participate in the current implicit solvent molecular dynamics /
energy minimization implementation. (It was created later, after some realizations and further
research.) It will be used in the forthcoming implmentation for explicit solvent molecular
simulations in periodic boundary conditions.

## A Basic Electrostatic Calculation
The electrostatics calculation we will perform is simple in concept: *compute the Coulomb
interaction of all pairs of particles in the system*.  The code for something like that could be:
```
#include "/stormm/home/src/Constants/symbol_values.h"

using stormm::symbols::charmm_gromacs_bioq;
using stormm::topology::NonbondedKit;
using stormm::trajectory::PhaseSpaceReader;

  for (int top_idx = 0; top_idx < ntop; top_idx++) {
    const NonbondedKit<double> inbk = agv[top_idx].getDoublePrecisionNonbondedKit();
    const PhaseSpaceReader ipsr = psv[top_idx].data();
    double basic_elec_nrg = 0.0;
    for (int i = 1; i < ipsr.natom; i++) {
      for (int j = 0; j < i; j++) {
        const double qij = inbk.charge[j] * inbk.charge[i];
        const double dx = ipsr.xcrd[j] - ipsr.xcrd[i];
        const double dy = ipsr.ycrd[j] - ipsr.ycrd[i];
        const double dz = ipsr.zcrd[j] - ipsr.zcrd[i];
        const double dr = sqrt((dx * dx) + (dy * dy) + (dz * dz));
        basic_elec_nrg += qij / dr;
      }
    }
  }

  // Multiply the charge-charge interactions (in atomic units) by Coulomb's constant
  basic_elec_nrg *= charmm_gromacs_bioq;
```

We have already covered one qualification to the interactions, that such that the pair is not
connected by three bonds or fewer (so as to participate in some valence term).  

The first qualification to the computation involves how to deal with periodicity.  The `PhaseSpace`
objects already created in our program have a member variable `unit_cell` (use the accessor
`UnitCellType PhaseSpace::getUnitCellType()`, or look at the `unit_cell` member variable in the
`PhaseSpaceReader` or `PhaseSpaceWriter` class abstracts).  We can use that to determine whether
to consider periodic images of the system, as long as we have some convention for computing the
disstance between particles and their interaction in a periodic setting.  Let us take the "minimum
image convention," that the distance between two particles is the smallest possible distance among
all images.  We can use the `imageCoordinates` function and feed it the `unit_cell` member
variable:
```
#include "/stormm/home/src/structure/local_arrangement.h"
#include "/stormm/home/src/structure/structure_enumerators.h"

using stormm::structure::imageCoordinates;
using stormm::structure::ImagingMethod;

  <... outer loops as above ...>
      for (int j = 0; j < i; j++) {
        const double qij = inbk.charge[j] * qi;
        double dx = ipsr.xcrd[j] - posx;
        double dy = ipsr.ycrd[j] - posy;
        double dz = ipsr.zcrd[j] - posz;
        imageCoordinates<double, double>(&dx, &dy, &dz, ipsr.umat, ipsr.invu, ipsr.unit_cell,
                                         ImagingMethod::MINIMUM_IMAGE);
        const double dr = sqrt((dx * dx) + (dy * dy) + (dz * dz));
        basic_elec_nrg += qij / dr;
      }
```
In the tutorial program **/stormm/home/apps/Tutorial/tutorial_iv.cpp**, the evaluation of the unit
cell performed inside of is hard-coded to move it out of the inner loop.  The `imageCoordinates`
function is tempalted and overloaded to deal with single values along each Cartesian axis or arrays
of values, batching the unit cell evaluation but at the expense of greater complexity to store the
displacements of many particles interacting.

The second qualification, already covered in this tutorial, is the exclusion status of each
interacting pair.  As with other STORMM classes, there are two ways to use the `LocalExclusionMask`
in CPU-based code to determine whether a pair of particles *a* and *b* omit their non-bonded
interaction: the C++ way, by using the `bool LocalExclusionMask::testExclusion(int a, int b)` class
method, and the C way, by feeding the class abstract to a free function of the same name and form.
(In fact, both work by being wrappers for the same underlying free function `evaluateLocalMask` in
the **/stormm/home/src/Potential/local_exclusionmask.h** library, with ways of grabbing the first
atom's mask and a pointer to a trove of codified data.) Here's the inner loop from above, with the
exclusion test added (note that the function returns TRUE if the two particle's *should not*
interact:
```
  double masked_elec_nrg = 0.0;
  
  <... outer loops as above ...>
      for (int j = 0; j < i; j++) {
        if (! testExclusion(ilmr, j, i)) {
          const double qij = inbk.charge[j] * qi;
          double dx = ipsr.xcrd[j] - posx;
          double dy = ipsr.ycrd[j] - posy;
          double dz = ipsr.zcrd[j] - posz;
          imageCoordinates<double, double>(&dx, &dy, &dz, ipsr.umat, ipsr.invu, ipsr.unit_cell,
                                           ImagingMethod::MINIMUM_IMAGE);
          const double dr = sqrt((dx * dx) + (dy * dy) + (dz * dz));
          masked_elec_nrg += qij / dr;
        }
      }
```

The `LocalExclusionMask` works by keeping, for every atom, a bit mask "profile" with the atom index
itself at the center and the *N* lower or higher bits being set to 1 if the atom excludes
interactions with atoms 1, 2, ... *N* indices lower or higher in the topology's atom list.  Because
the profile is a 64-bit number, this could have N be as large as 31, and that would be very much
like what [ACEMD](https://www.acellera.com/acemd) does.  However, this leaves some holes if atoms
exclude indices further away in terms of how the topology keeps them, as can happen with disulfide
bridges.  Therefore, STORMM shortens the maximum *N* to 30 in the *most basic case* and invests the
remaining three bits (3 | 30 below | the index itself | 30 above) into a special code that tells
the program how to handle the other 61 bits.  For the basic case, the special code is 000.  For
trickier cases, other codes will tell the program to use perhaps just 31 of the remaining bits in
the basic way, and then use the rest to mask off a patch much further from the original atom, some
of those other bits being devoted to inscribing just how far away that other patch is.

Because of the local, relative nature of the exclusion profiles, most atoms share the same profile
with some other atom in the system--all water, for example, needs just three unique profiles (or
four, if the water contains a virtual site).  All proteins can be handled in 150 to 200 unique
profiles, depending on the ordering of atoms in the parameter libraries, plus 10 to 12 for each
disulfide bridge.  Therefore, the way the `LocalExclusionMask` really works is by storing, for
each atom in the topology, a 32 bit profile index into the list of all unique 64 bit profiles,
which saves half the memory traffic and lets the entire list of profiles reside in chip cache
whether computing on the CPU or on the GPU.

## Electrostatics with and without Masking
The tutorial contains additional code to establish an independent check on the non-bonded
electrostatic energy, based on an abstract of the topology that the `LocalExclusionMask` is built
with in the first place.  If the topology and its `NonbondedKit` abstract is wrong, then we
wouldn't see the effect, but if the `LocalExclusionMask` had a but this test would be likely to
reveal it.  The topology class emits a number of different abstracts, with minimal overlap in terms
of the pointers and length constants they offer.  We can use the abstract (already taken in the
code above) for non-bonded intetractions and then loop through its contents to accumulate and then
subtract the excluded interactions from `basic_elec_nrg` above.  The one abstract of the
`LocalExclusionMask` will help to get the relevant pointers where they are needed, and it is a
convention in STORMM CPU code, "access all involved class objects with accessor functions, or take
the abstracts in all cases and use those instead." What is still needed is some built-from-scratch
method for keeping track of exclusions which have been removed, and for that we can use an array of
arrays written in terms of the Standard Template Library `std::vector`.
```
  using stormm::energy::LocalExclusionMaskReader;

  for (int top_idx = 0; top_idx < ntop; top_idx++) {
    const NonbondedKit<double> inbk = agv[top_idx].getDoublePrecisionNonbondedKit();
    const PhaseSpaceReader ipsr = psv[top_idx].data();
    const LocalExclusionMaskReader ilmr = exv[top_idx].data();
    std::vector<std::vector<int>> excl_counted(ipsr.natom);
    for (int i = 0; i < ipsr.natom; i++) {
      excl_counted[i].reserve(16);
    }
    the_clock.assignTime();
    for (int i = 0; i < ipsr.natom; i++) {
      for (int j = inbk.nb12_bounds[i]; j < inbk.nb12_bounds[i + 1]; j++) {
        const size_t jatom = inbk.nb12x[j];
        if (exclusionKnown(&excl_counted, i, jatom) == false) {
          const double dx = ipsr.xcrd[jatom] - ipsr.xcrd[i];
          const double dy = ipsr.ycrd[jatom] - ipsr.ycrd[i];
          const double dz = ipsr.zcrd[jatom] - ipsr.zcrd[i];
          const double dr = sqrt((dx * dx) + (dy * dy) + (dz * dz));
          const double qij = inbk.charge[i] * inbk.charge[jatom];
          basic_elec_nrg -= qij / dr;
        }
      }

      <... Repeat for 1-3 and 1-4 interactions, also 1-1 for virtual sites ...>
    }
  }
```
In the code above, we loop over all atoms in the topology, then look in the abstract for the bounds
of that atoms 1-2 excluded atom list.  These lists are reflexive, with the 1-2 excluded interaction
between *a* and *b* also noted for *b* and *a*.  Double-counting could be prevented by merely
insisting that exclusions only be evaluated if *b* > *a* (or vice-versa), but this is not the only
way in which multiple exclusions can affect the same atoms.  In particular, a five-membered ring
A-B-C-D-E will have a 1:3 exclusion between A and C (A-B-C) but also a 1:4 exclusion A-E-D-C.
There are some conventions in the construction of the non-bonded kit that mitigate such
double-counting, but to be safe we track everything in the tutorial program.  The contents of the
utility function `exclusionKnown` in the code above is:
```
bool exclusionKnown(std::vector<std::vector<int>> *excl_counted, const int iatom,
                    const int jatom) {
  const size_t ni = excl_counted->at(iatom).size();
  if (ni > 0 && locateValue(excl_counted->at(iatom), jatom, DataOrder::ASCENDING) < ni) {
    return true;
  }
  else {
    excl_counted->at(iatom).push_back(jatom);
    if (ni > 0) {
      std::sort(excl_counted->at(iatom).begin(), excl_counted->at(iatom).end(),
                [](const int a, const int b) { return a < b; });
    }
    excl_counted->at(jatom).push_back(iatom);
    if (excl_counted->at(jatom).size() > 1) {
      std::sort(excl_counted->at(jatom).begin(), excl_counted->at(jatom).end(),
                [](const int a, const int b) { return a < b; });
    }
    return false;
  }
  __builtin_unreachable();
}
```

If we run the calculations and track the time needed to perform the electrostatic calculation
either with complete omission of excluded interactions, the time tracking from the pre-built
tutorial program helps to show the performance of the exclusion calculation.
```
>> /stormm/build/apps/Tutorial/tutorial_iv.stormm.cuda \
     -topol /stormm/home/test/Topology/dhfr_cmap.top \
     -coord /stormm/home/test/Trajectory/dhfr_cmap.inpcrd \
     energy_loop 100

<... additional output ...>
 +--------------------------------+--------------------------------------------------------+
 |         Category Name          | Samples   Total    Mean    Standard   Minimum  Maximum |
 |                                |          Time, s  Time, s  Deviation  Time, s  Time, s |
 +--------------------------------+--------------------------------------------------------+
 | Basic Non-bonded Evaulation    |     100   0.7889   0.0079     0.0031   0.0068   0.0229 |
 | Non-bonded Evaulation Cleanup  |     100   0.0338   0.0003     0.0002   0.0003   0.0010 |
 | Excluded Non-bonded Evaulation |     100   1.1838   0.0118     0.0043   0.0102   0.0314 |
 +--------------------------------+--------------------------------------------------------+
```
While it is faster in this case to evaluate all interactions and then trim away the exclusions,
even with our rudimentary system for tracking them, this is just the electrostatic energy
evaluation.  To evaluate forces would be much more laborious, and to add a van-der Waals potential
on top of that brings the relative cost of the exclusion calculation down by a geat deal, and in
our developmental GPU code for periodic boundaries we are finding that the cost of evaluating the
exclusion status of each pair is on the order of 5% of the total cost of the nested loop over all
neighbor list pairs.  While the tutorial program will yield very similar answers for the total
electrostatic energy with either method, the divergence of electrostatic energy as particles come
within 0.1 nm of one another is not as severe as the divergence of the van-der Waals
(Lennard-Jones) potential, and the tutorial is working in `double` precision.  In `float`
arithmetic, the van-der Waals potential would often break the precision format and destroy
information in  the lower bits as very high values were added to the total and then subtracted
away.  Tracking and preventing the incorporation of excluded non-bonded interactions is a good
practice in molecular simulations.

# Creating a Synthesis of All Systems
With the systems read in and correspondence established, the masterstroke is create a *synthesis*
of the coordinates and topologies.  The coordinate synthesis is the
[`PhaseSapceSynthesis`](../doxygen/classstormm_1_1synthesis_1_1PhaseSpaceSynthesis.html), while the
topopology synthesis is the
[`AtomGraphSynthesis`](../doxygen/classstormm_1_1synthesis_1_1AtomGraphSynthesis.html).  The
constructor for the `PhaseSpaceSynthesis` calls for an array of `PhaseSpace` objects and an array
of *pointers* to their repective topologies.  Note: the tutorial program will abort with an error
if systems with mismatched boundary conditions are supplied in the same run.  All systems must
either have no boundary conditions, or they must all have periodic boundary conditions.  Barring
that mismatch, it's easy enough to create the synthesis:
```
  std::vector<AtomGraph*> agv_ptr;
  for (int i = 0; i < ntop; i++) {
    agv_ptr.push_back(&agv[i]);
  }
```
Various overloads allow a developer to create objects with additional indexing arrays, so that a
list of topologies `{ tA, tB, tC }` could create a synthesis with contents
`{ tA, tA, tA, tB, tB, tC, tA, tC, tA }`.  When created, the synthesis allocates new memory for all
of its data, although it retains pointers to the original objects which should therefore not be
destroyed.  Replicating a system many times is a wy to conserve the amount of memory that must be
allocated for the underlying coordinate and topology objects.  We will create a synthesis with two
copies of each each system supplied to the tutorial program:
```
#include "/stormm/home/src/Synthesis/atomgraph_synthesis.h"
#include "/stormm/home/src/Synthesis/phasespace_synthesis.h"

using stormm::synthesis::AtomGraphSynthesis;
using stormm::synthesis::PhaseSpaceSynthesis;

  std::vector<int> synth_list;
  for (int i = 0; i < ntop; i++) {
    for (int j = 0; j < 2; j++) {
      synth_list.push_back(i);
    }
  }
  PhaseSpaceSynthesis poly_ps(psv, agv_ptr, synth_list);
  AtomGraphSynthesis poly_ag(agv_ptr, synth_list);
```
Inspecting the abstract of the `PhaseSpaceSynthesis` reveals something very important about this
class: the coordinates (positions, velocities, and forces) are all stored in fixed precision,
`long long int` (which STORMM will `typedef` as `llint`) with an extra `int` for each coordinate.
See the implementation in **/stormm/home/src/Synthesis/phasespace_synthesis.h**.  There are also
bit counts for each property: `gpos_bits` for global particle positions, `vel_bits` for particle
velocities, and `frc_bits` for force accumulators.  We left these at their default settings when
constructing the object.  If we want to extract raw information from the `PhaseSpaceSynthesis`
through the abstract system, the conversion back to floating point numbers is essential.

## Computing Electrostatics with the Synthesis
In order to repeat the electrostatic calculations using the synthesis, rather than the "ordinary"
coordinate and topology objects, we will need to understand where each system resides in the
synthesis.  We will restrict the exposition to the read-only `PsSynthesisReader` abstract, as it
is not necessary to modify forces in the object when summing the total energy.  The limits of each
system are given in two arrays, `atom_starts` and `atom_counts`:
```
#include "/stormm/home/src/Numerics/split_fixed_precision.h"
#include "/stormm/home/src/Synthesis/synthesis_abstracts.h"

using stormm::synthesis::PsSynthesisReader;
using stormm::synthesis::SyNonbondedKit;
using stormm::numerics::hostInt95Subtract;

  const LocalExclusionMask poly_lem(poly_ag);
  const LocalExclusionMaskReader poly_lemr = poly_lem.data();
  const SyNonbondedKit<double, double2> poly_nbk = poly_ag.getDoublePrecisionNonbondedKit();
  const PsSynthesisReader poly_psr = pol_psy.data();
  for (int sys_idx = 1; sys_idx < poly_psr.system_count; sys_idx += 2) {
    const int llim = poly_psr.atom_starts[sys_idx];
    const int hlim = llim + poly_psr.atom_counts[sys_idx];
    const double* umat_ptr = &poly_psr.umat[32 * sys_idx];
    const double* invu_ptr = &poly_psr.invu[32 * sys_idx];
    const bool is_periodic = (poly_psr.unit_cell != UnitCellType::NONE);
    for (int i = llim + 1; i < hlim; i++) {
      for (int j = llim; j < i; j++) {
        if (! testExclusion(poly_lemr, i, j)) {
          const int95_t idx = hostInt95Subtract(poly_psr.xcrd[j], poly_psr.xcrd_ovrf[j],
                                                poly_psr.xcrd[i], poly_psr.xcrd_ovrf[i]);
          const int95_t idy = hostInt95Subtract(poly_psr.ycrd[j], poly_psr.ycrd_ovrf[j],
                                                poly_psr.ycrd[i], poly_psr.ycrd_ovrf[i]);
          const int95_t idz = hostInt95Subtract(poly_psr.zcrd[j], poly_psr.zcrd_ovrf[j],
                                                poly_psr.zcrd[i], poly_psr.zcrd_ovrf[i]);
          double dx = hostInt95ToDouble(idx) * poly_psr.inv_gpos_scale;
          double dy = hostInt95ToDouble(idy) * poly_psr.inv_gpos_scale;
          double dz = hostInt95ToDouble(idz) * poly_psr.inv_gpos_scale;
          if (is_periodic) {
            imageCoordinates<double, double>(&dx, &dy, &dz, umat_ptr, invu_ptr, poly_psr.unit_cell,
                                             ImagingMethod::MINIMUM_IMAGE);
          }
          const double qij = poly_nbk.charge[i] * poly_nbk.charge[j];
          const double dr = sqrt((dx * dx) + (dy * dy) + (dz * dz));
          masked_elec_nrg += qij / dr;
        }
      }
    }
  }
```
Note that in the above code, we made a new `LocalExclusionMask` for the topology synthesis.  The
class constructor is overloaded to accept either input, and the ordering of atoms in the synthesis
of topologies, one system after another, is analogous to the ordering of atoms in a single
topology.  We also calculated electrostatics for every other system, as each of the original
topologies and coordinate sets was duplicated in the synthesis.  As a final note, we have taken the
displacements between coordinates in fixed precision using special functions for handling the data
stored by the `PhaseSpaceSynthesis`.  A deep discussion of the "split" fixed precision
representation is beyond the scope of this tutorial, but see the
[introductory paper](https://pubs.aip.org/aip/jcp/article/161/3/032501/3303330/STORMM-Structure-and-topology-replica-molecular)
for more information.  If the bit counts after the point are low enough (which, in fact, they are
in this case with the default values), we can disregard the data in the "overflow" `int` values for
each coordinate and do the subtraction between the `llint` components only.  However, we want
developers to understand that STORMM's `numerics` namespace has a wide selection of functions to
handle the unique format, and even to perform periodic imaging in unit cells defined by cell
lengths in fixed precision.

## Conclusion
We have run through many of the basics, in CPU code, for reading systems into STORMM and unpacking
those topology and coordinate objects to perform calculations.  The `AtomGraph` topology emits more
than just the non-bonded abstract, and for most abstracts of the `AtomGraph` there is a cognate in
the `AtomGraphSynthesis`.

Memory management and avoiding program bloat is an issue of active development in STORMM, in
particular because a synthesis of many unique systems would require not just memory for the
coordinate and topology syntheses but also memory for the singleton objects of each system.  For
coordinates, we have created the option to specify the `Hybrid` memory format, e.g.
`HybridFormat::HOST_ONLY` for the objects that serve only to stage files read from disk,
which will help to conserve GPU memory.  However, the majority of the memory for any particular
system is to be found in the topology, which is not yet format-adaptable.  The `LocalExclusionMask`
and the ability to calculate the exclusion status of a given pair on-the-fly goes a long way to
conserving memory, and we anticipate that STORMM will be an industry leader in terms of the sheer
size of systems that it can simulate.

For most applications, however, modern GPUs have more than enough memory to handle molecular
systems and a number of supporting matrices or dynamic arrays supporting the problem at hand.  We
hope that this tutorial has demonstrated the ease with which developers can construct molecular
systems and delve into their contents.
