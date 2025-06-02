# A Random Walk Simulator in STORMM
One of the most significant technical challenges undertaken in the STORMM project involves making
the code's results reproducible, not just in a scientific sense (we provide the code and describe
the approach in enough detail that another investigator could replicate the results) but in the
numerics.  The
[IEEE standard for floating point arithmetic](https://standards.ieee.org/ieee/754/6210/) admits
[some variabilities](https://grouper.ieee.org/groups/msc/ANSI_IEEE-Std-754-2019/background/addendum.html)
and also changes in the order of operations which can change the way in which accepted roundoff
errors combine.  Therefore, different chipsets should be expected to produce different answers in
a long series of arithmetic operations like a simulation, but a highly parallel programming
environment such as a GPU demands a high degree of consistency in order to spot race conditions or
other subtle errors in the code.  STORMM development strives for the highest degrees of numerical
consistency, employing techniques such as those demonstrated in this tutorial.  To showcase the
capabilities, we will program a simple random walk in two dimensions, with a user-specifiable
number of particles and steps.  The goal will be to reproduce GPU results with a CPU
implementation.

## Random Number Generation in STORMM
STORMM makes use of the XOR-shift generators,
[Xoroshiro128+ and Xoshiro256++](https://prng.di.unimi.it), to create streams of predictable
pseudo-random numbers based on state vectors with small memory requirements.  While useless for
cryptography, the presence of "jump" and "long jump" methods in each generator makes them ideal for
molecular simulations and other efforts in computational science.  The particular orbit of any of
the generators depends on some of the internal bit shift settings, but with any given seed the
sequence begins at one point in the series and can then be fast-forwarded by the square root of
the orbit's total length, 2<sup>64</sup> (approximately 18 billion billion) steps in the case of
Xoroshiro128+ and 2<sup>128</sup> steps in the case of Xoshiro256++.  There is also a "long jump"
function in each generator, which jumps forward 2<sup>96</sup> steps in Xoroshiro128+ and
2<sup>192</sup> steps in Xoshiro256++.

Four billion long jumps can (in theory) be taken in Xoroshiro128+ and billions upon billions in
Xoshiro256++, but according to the author the Xoroshiro128+ generator should not be used to
generate thousands of streams of random numbers, as the different segments of the orbit cannot be
guaranteed to be free of detectable correlations.
[(Xoroshiro128+ also fails the Big Crush test.)](https://www.sciencedirect.com/science/article/pii/S0377042718306265)
STORMM therefore uses the Xoshiro256++ generator in its GPU applications, but for the purposes of
this tutorial it's sufficient to assign one segment of the 128-bit orbit to each particle and sally
forth.

The generators are easy to operate from the standpoint of a CPU program: each is encapsulated in
its own C++ class and ticks forward as it produces random numbers.  For GPU operations, there are
special, vectorized initializers and (for kernels) a collection of `__device__` functions that can
be included in any CUDA unit without needing to resort to relocatable device code (`-rdc` for those
familiar with compiler commands).  The C++ initialization is simple, while the GPU initialization
is packaged within `initXoroshiro128pArray` and comes with the STORMM libraries.
```
#include "../../src/Random/random.h"

using stormm::random::Xoroshiro128pGenerator;
using stormm::random::initXoroshiro128pArray;

  Xoroshiro128pGenerator xrs(prng_seed, 10);
  for (int i = 0; i < coordinate_count; i++) {
    rng_states.putHost(xrs.revealState(), i);
    xrs.jump();
  }
```

## Setting up the Problem: A Typical Class in STORMM
We can prepare for the simulation by collecting all of the variables into a single C++ class: the
number of particles, step size, number of steps in the simulation, and coordinates along the
Cartesian *x* and *y* axes.  The basic form of the class would then be:
```
#include "/stormm/home/src/Accelerator/gpu_details.h"
#include "/stormm/home/src/Accelerator/hybrid.h"
#include "/stormm/home/src/DataTypes/common_types.h"
#include "/stormm/home/src/Random/random_enumerators.h"

using stormm::card::GpuDetails;
using stormm::card::Hybrid;
using stormm::data_types::llint;
using stormm::data_types::ullint2;

class RandomWalk {
public:
  RandomWalk(int coordinate_count_in, int bits_in = 24, int prng_seed_in = 1083674,
             double fluctation_in = 1.0,
             RandomNumberKind fluctuation_style_in = RandomNumberKind::GAUSSIAN,
             const GpuDetails &gpu = null_gpu);

private:
  int coordinate_count;  // Number of particles
  int bits;              // Bit count for fixed-precision representations
  double fp_scale;       // Two to the power of bits
  double fp_inv_scale;   // Two to the inverse power of bits
  int prng_seed;         // Random number seed (all particles' generators will jump
                         //   from this)
  double fluctuation;    // Step size

  // Take steps based on a uniform random distribution or a normal distribution?
  RandomNumberKind fluctuation_style;

  // The coordinate vectors
  Hybrid<llint> x_coordinates;
  Hybrid<llint> y_coordinates;
  Hybrid<llint> storage;

  // Random number state vectors for each particle
  Hybrid<ullint2> rng_states;
```

In the code above, the coordinates member variables are followed by a `storage` array.  This is to
demonstrate a trick that many STORMM classes make use of, based on a unique feature of the `Hybrid`
class.  The pointer/array duality present in C is formalized in STORMM's dynamic memory management,
as each `Hybrid` class object may be constructed as a `HybridKind::POINTER` or `HybridKind::ARRAY`
based on STORMM's `enum class HybridKind`.  A `POINTER` type Hybrid does not allocate its own data:
instead, it targets its own pointers to data on the CPU host and GPU device held by a different
`Hybrid` object of the `ARRAY` type.  This can be useful when there are many array variables of the
same data type, in particular if each array is relatively small.  The `POINTER` type `Hybrid`
arrays function just like `ARRAY` type objects, enforcing their stated length limits (a `POINTER`
cannot be assigned to say that it has more memory than the underlying `ARRAY` it points to, and for
developers who want to ensure that a `POINTER` type `Hybrid` remains valid each `Hybrid` records
the number of times it has been allocated and can therefore be checked against the number of
allocations when a `POINTER` type `Hybrid` was first assigned.  There is also a `Ledger` class,
recording all `Hybrid` allocations, which can be useful for memory tracking.  The code to set
the `POINTER` type `x_coordinates` and `y_coordinates` to the `ARRAY` type `storage` is:
```
  const int padded_count = roundUp(coordinate_count, warp_size_int);
  storage.resize(2 * padded_count);
  x_coordinates.setPointer(&storage, 0, coordinate_count);
  y_coordinates.setPointer(&storage, padded_count, coordinate_count);
  rng_states.resize(coordinate_count);
```

We will give the class `public` member functions to access each of the member variables, those for
coordinates calling the respective `readHost` member functions of the `Hybrid` arrays.  For
example:
```
#include "/stormm/home/src/Accelerator/gpu_enumerators.h"
#include "../../src/DataTypes/stormm_vector_types.h"
#include "/stormm/home/src/Reporting/error_format.h"

using stormm::card::HybridTargetLevel;
#ifndef STORMM_USE_HPC
using stormm::data_types::double2;
#endif
using stormm::errors::rtErr;

//-------------------------------------------------------------------------------------------------
int RandomWalk::getCoordinateCount() const {
  return coordinate_count;
}

//-------------------------------------------------------------------------------------------------
double2 RandomWalk::getCoordinate(const int index, const HybridTargetLevel tier) const {
  if (index < 0 || index >= coordinate_count) {
    rtErr("Index " + std::to_string(index) + " is invalid for a series of " +
          std::to_string(coordinate_count) + " points.", "RandomWalk", "getCoordinate");
  }
  const size_t index_zu = index;
  switch (tier) {
  case HybridTargetLevel::HOST:
    return { static_cast<double>(x_coordinates.readHost(index_zu)) * fp_inv_scale,
             static_cast<double>(y_coordinates.readHost(index_zu)) * fp_inv_scale };
#ifdef STORMM_USE_HPC
  case HybridTargetLevel::DEVICE:
    return { static_cast<double>(x_coordinates.readDevice(index_zu)) * fp_inv_scale,
             static_cast<double>(y_coordinates.readDevice(index_zu)) * fp_inv_scale };
#endif
  }
  __builtin_unreachable();
}
```
The definition of the two-tuple of `double` values, `double2`, comes as part of the CUDA package
(and also with AMD's HIP).  It is only needed if compiling in CPU-only mode, in which case STORMM's
private definition of the tuple is brought to bear.  The closing call to `__builtin_unreachable()`
suppresses compiler warnings about a function seeming to reach its end without returning a value.

Aside from the typical accoutrements of a C++ class, in STORMM most classes emit "abstracts" to
permit direct access to their underlying array members, bypassing the C++ getter/setter paradigm
to work in the style of classic C.  The abstracts can be taken at the level of the CPU host or the
GPU device.  A fundamental question is whether the abstract should permit the developer to change
the underlying data without going through the class's accessor functions, and there are limits even
when bypassing C++ safeguards.  In many cases, critical elements of the underlying class object
such as array lengths are qualified with `const`, even when the array contents are exposed.  Most
classes also emit "reader" and "writer" abstracts based on whether the class object itself is
`const`-qualified.  In keeping with the convention that `struct` variables do not have member
functions other than constructors, copy and movement methods, and (perhaps implicit) destructors,
the simplified forms of the abstracts for `RandomWalk` might be:
```
struct RandomWalkWriter {
  RandomWalkWriter(int ncoord_in, int bits_in, double fluctuation_in, RandomNumberKind style_in,
                   llint* xcrd_in, llint* ycrd_in, ullint2* rng_stt_in);

  const int ncoord;              // The number of (particle) coordinates
  const int bits;                // Number of bits after the point in fixed-precision
  const double fluctuation;      // Size of fluctuations to add with each random walk step.
  const RandomNumberKind style;  // The type of random walk steps, uniform or Gaussian
  llint* xcrd;                   // Cartesian X coordinates of all particles
  llint* ycrd;                   // Cartesian Y coordinates of all particles
  ullint2* rng_stt;              // Random number state vectors driving each particle
};

struct RandomWalkReader {
  RandomWalkWriter(int ncoord_in, int bits_in, double fluctuation_in, RandomNumberKind style_in,
                   llint* xcrd_in, llint* ycrd_in, ullint2* rng_stt_in);

  const int ncoord;              // The number of (particle) coordinates
  const int bits;                // Number of bits after the point in fixed-precision
  const double fluctuation;      // Size of fluctuations to add with each random walk step.
  const RandomNumberKind style;  // The type of random walk steps, uniform or Gaussian
  const llint* xcrd;             // Cartesian X coordinates of all particles
  const llint* ycrd;             // Cartesian Y coordinates of all particles
  const ullint2* rng_stt;        // Random number state vectors driving each particle
};
```
The struct constructors themselves are not displayed, but can be found in the tutorial's class
implementation, **/stormm/home/apps/Tutorial/randomwalk.cpp**.  Additions to the `RandomWalk`
class for emitting these abstracts can be as follows:
```
RandomWalkWriter RandomWalk::data(const HybridTargetLevel tier) {
  return RandomWalkWriter(coordinate_count, bits, fluctuation, fluctuation_style,
                          x_coordinates.data(tier), y_coordinates.data(tier),
                          rng_states.data(tier));
}

const RandomWalkReader RandomWalk::data(const HybridTargetLevel tier) const {
  return RandomWalkReader(coordinate_count, bits, fluctuation, fluctuation_style,
                          x_coordinates.data(tier), y_coordinates.data(tier),
                          rng_states.data(tier));
}
```

As will be seen, the primary purpose of the abstracts is not to do away with the tedious aspects of
C++, but to shed the parts of a C++ class that a CUDA kernel cannot incorporate.  With the basic
class mechanics and abstracts laid down, the core functionality of the `RandomWalk` class must be
encapsulated in the constructor and a public member function to drive the simulation forward.  The
minimal constructor will call a `private` member function `allocate` to perform the `Hybrid`
allocations described above, then seed the random number gnererator state vectors on the CPU or, if
applicable, on the GPU.  Note that the code paths differ absed on whether the GPU mode is compiled,
and that the GPU kernel launcher `initXoroshiro128p` will download the results from the GPU so that
the CPU and GPU both have the same state vectors when the function returns.  Because `Hybrid`
object data is initialized to zero, a single cycle of the public member function used to advance
the simulation can be used to seed particle positions.  If it is desired that particles initially
occupy a different configuration, some new function could be written but there is no need to
clutter the tutorial.  Note that the CPU and GPU advancement take place in separate calls.  More
details can be found in the implementation documentation in
**/stormm/home/apps/Tutorial/randomwalk.cpp**.
```
RandomWalk::RandomWalk(const int coordinate_count_in, const int bits_in, const int prng_seed_in,
                       const double fluctuation_in, const RandomNumberKind fluctuation_style_in,
                       const GpuDetails &gpu) :
    coordinate_count{coordinate_count_in}, bits{bits_in},
    fp_scale{pow(2.0, bits_in)},
    fp_inv_scale{pow(2.0, -bits_in)},
    prng_seed{prng_seed_in}, fluctuation{fluctuation_in},
    fluctuation_style{fluctuation_style_in},
    x_coordinates{HybridKind::POINTER, "x_coord"},
    y_coordinates{HybridKind::POINTER, "y_coord"},
    storage{HybridKind::ARRAY, "coord_storage"},
    rng_states{HybridKind::ARRAY, "rng_state_vectors"}
{
  allocate(gpu);
#ifdef STORMM_USE_HPC
  initXoroshiro128pArray(&rng_states, prng_seed, 10, gpu);
#else
  Xoroshiro128pGenerator xrs(prng_seed, 10);
  for (int i = 0; i < coordinate_count; i++) {
    rng_states.putHost(xrs.revealState(), i);
    xrs.jump();
  }
#endif
  advance();
#ifdef STORMM_USE_HPC
  advance(1, HybridTargetLevel::DEVICE, gpu);
#endif
}
```
The CPU form of the `advance` function makes clear what the GPU function will need to do: loop
over all particles, read the particle's random number generator state, and then produce random
numbers to move the particle along in the two-dimensional plane for the requested number of steps.
There are no interactions between the particles. (Apologies if decoupling the *x* and *y*
dimensions, rather than using a polar coordinate system based on the stated step size, is incorrect
from a theoretical perspective--the purpose is not a formal investigation of random walk diffusion
but to present C++ and CUDA mechanics.) We create a temporary `Xoroshiro128pGenerator` and use its
`setState` method to instantly place it on tracj with a given particle's pseudo-random stream.  The
state vectors in `rng_states` are what matters: the `Xoroshiro128pGenerator` class object is just
there to provide its methods for creating new random numbers and making the state vector tick
forward.  After the requested number of steps, we will extract the modified state vector from the
temporary generator and place it back in storage within `rng_states`.
```
void RandomWalk::advance(const int step_count, const HybridTargetLevel tier,
                         const GpuDetails &gpu) {
  switch (tier) {
  case HybridTargetLevel::HOST:
    {
      Xoroshiro128pGenerator xrs(10229384, 0);
      for (int i = 0; i < coordinate_count; i++) {
        xrs.setState(rng_states.readHost(i));
        for (int j = 0; j < step_count; j++) {
          const llint ix_crd = x_coordinates.readHost(i);
          const llint iy_crd = y_coordinates.readHost(i);
          switch (fluctuation_style) {
          case RandomNumberKind::GAUSSIAN:
            {
              const llint ix_bump = llround(xrs.gaussianRandomNumber() * fluctuation * fp_scale);
              const llint iy_bump = llround(xrs.gaussianRandomNumber() * fluctuation * fp_scale);
              x_coordinates.putHost(ix_crd + ix_bump, i);
              y_coordinates.putHost(iy_crd + iy_bump, i);
            }
            break;
          case RandomNumberKind::UNIFORM:
            {
              const llint ix_bump = llround((0.5 - xrs.uniformRandomNumber()) * fluctuation *
                                            fp_scale);
              const llint iy_bump = llround((0.5 - xrs.uniformRandomNumber()) * fluctuation *
                                            fp_scale);
              x_coordinates.putHost(ix_crd + ix_bump, i);
              y_coordinates.putHost(iy_crd + iy_bump, i);
            }
            break;
          }
        }
        rng_states.putHost(xrs.revealState(), i);
      }
    }
    break;
#ifdef STORMM_USE_HPC
  case HybridTargetLevel::DEVICE:
    {
      RandomWalkWriter rww = this->data(HybridTargetLevel::DEVICE);
      launchRandomWalkAdvance(step_count, &rww, gpu);
    }
    break;
#endif
  }
}
```
One important aspect of the coordinate storage, noted in the introduction and made clear by the
`advance` function, is fixed-precision.  In this example, we multiply the real-valued number by
some power of two, losing no information as the fraction (mantissa) of the floating point format
does not change.  The result is then converted to an integer (which may lose information) and
stored.  In our experience, storing not just force accumulations but also particle positions in
fixed-precision helps to stamp out instabilities between different architectures, by taking a
more aggressive rounding at critical junctures, rather than letting minor differences propagate
over time.  The level of rounding is an explicit choice of the developer, and in general can be
selected so as not to risk the validity of the simulation in any degree.

As seen above, a mutable abstract is called by the class itself to feed into an `extern void` free
function, `launchRandomWalkAdvance`.  The essential contents of that function and the kernel it
launches are presented below.
```
#include "/stormm/home/src/Accelerator/gpu_details.h"
#include "/stormm/home/src/DataTypes/common_types.h"
#include "/stormm/home/src/DataTypes/stormm_vector_types.h"
#include "/stormm/home/src/Random/random.h"
#include "randomwalk.h"

using stormm::card::GpuDetails;
using stormm::constants::large_block_size;
using stormm::data_types::llint;
using stormm::data_types::ullint;
using stormm::data_types::ullint2;
using stormm::data_types::ullint4;
using stormm::random::xrs128p_jump_i;
using stormm::random::xrs128p_jump_ii;
using stormm::random::xrs256pp_jump_i;
using stormm::random::xrs256pp_jump_ii;
using stormm::random::xrs256pp_jump_iii;
using stormm::random::xrs256pp_jump_iv;
using stormm::random::rng_unit_bin_offset;
using stormm::random::rng_unit_bin_offset_f;

#include "/stormm/home/src/Random/xor_shift_rng.cui"

__global__ void __launch_bounds__(large_block_size, 1)
kRandomWalkAdvance(const int step_count, RandomWalkWriter rww) {
  const int thread_stride = blockDim.x * gridDim.x;
  const double fp_scale = pow(2.0, rww.bits);
  for (int i = threadIdx.x + (blockIdx.x * blockDim.x); i < rww.ncoord; i += thread_stride) {
    ullint2 stti = rww.rng_stt[i];
    switch (rww.style) {
    case RandomNumberKind::GAUSSIAN:
      for (int j = 0; j < step_count; j++) {
        const llint ix_bump = __double2ll_rn(xoroshiro128p_normal(&stti) * rww.fluctuation *
                                             fp_scale);
        const llint iy_bump = __double2ll_rn(xoroshiro128p_normal(&stti) * rww.fluctuation *
                                             fp_scale);
        rww.xcrd[i] += ix_bump;
        rww.ycrd[i] += iy_bump;
      }
      break;
    case RandomNumberKind::UNIFORM:
      for (int j = 0; j < step_count; j++) {
        const llint ix_bump = __double2ll_rn((0.5 - xoroshiro128p_uniform(&stti)) *
                                             rww.fluctuation * fp_scale);
        const llint iy_bump = __double2ll_rn((0.5 - xoroshiro128p_uniform(&stti)) *
                                             rww.fluctuation * fp_scale);
        rww.xcrd[i] += ix_bump;
        rww.ycrd[i] += iy_bump;
      }
      break;
    }
    rww.rng_stt[i] = stti;
  }
}

extern void launchRandomWalkAdvance(const int step_count, RandomWalkWriter *rww,
                                    const GpuDetails &gpu) {
  kRandomWalkAdvance<<<gpu.getSMPCount(), large_block_size>>>(step_count, *rww);
}
```
Notice how a loop over particles in the C++ code is delegated across the launch grid (all threads
of all blocks) in the GPU kernel.  This is a standard approach.  The design also has some hidden
strengths: the concept of extracting the random number generator state vector and holding it in
registers throughout the entire set of simulated steps avoids what would otherwise be a lot of
memory traffic (although it would mitigated to a great extent, in this case, by L1 cache).  For
even better memory bandwidth conservation, the position of the particle itself could be taken into
registers (made into a local variable) and manipulated through the requested number of steps before
the final result is written back to the arrays in main GPU memory.  A minor detail: the intrinsic
function `__double2ll_rn` (round nearest) matches the result of `llround` (round `double` to
`long long int`) in CPU code.  If, instead, the double-precision real were recast to an integer in
the C++ code, this would be rounding towards zero and `__double2ll_rz` would be appropriate.

In order to complete the program, we will need to add a basic user interface, for which we use the
standard C `argc` and `argv[]` command line input variables.  An abridged version follows.  STORMM
comes with substantial support for developers to create their own control blocks and check input
for validity, as will be demonstrated in a later tutorial.  For the complete code,
see **/stormm/home/apps/Tutorial/tutorial_ii.cpp**.
```
int main(int argc, const char* argv[]) {
  if (argc < 3) {
    printf("Usage: %s\n"
           "       [ -n number of particles ] [ -f fluctuation ] [ -s step kind ]\n",
           argv[0]);
    printf("  -n : Select the number of particles to simulate (default 50)\n");
    printf("  -f : Indicate the step size (unitless, default 1.0)\n");
    printf("  -s : Indicate whether steps should involve UNIFORM or GAUSSIAN random numbers\n");
    printf("       (default GAUSSIAN)\n");
    printf("  -x : The number of steps to simulate (default 100)\n");
    exit(0);
  }
  int particle_count = 50;
  double step_size = 1.0;
  for (int i = 1; i < argc - 1; i++) {
    if (strcmpCased(argv[i], "-n", CaseSensitivity::NO)) {
      if (verifyContents(argv[i + 1], NumberFormat::INTEGER)) {
        particle_count = atoi(argv[i + 1]);
      }
      else {
        rtErr("Unrecognized integer " + std::string(argv[i + 1]) + " for the particle count\n");
      }
      i++;
    }
    else if (strcmpCased(argv[i], "-f", CaseSensitivity::NO)) {
      if (verifyContents(argv[i + 1], NumberFormat::STANDARD_REAL) ||
          verifyContents(argv[i + 1], NumberFormat::SCIENTIFIC)) {
        step_size = atof(argv[i + 1]);
      }
      else {
        rtErr("Unrecognized real value " + std::string(argv[i + 1]) + " for the particle count\n");
      }
      i++;
    }
  }
}
```
The `main` function will then take the user input to construct a class object of `RandomWalk` and
drive it forward by the requested number of steps.  In the tutorial program, the `getCoordinates`
method of `RandomWalk` is used to print results to the terminal.
```
#include "/stormm/home/apps/Tutorial/randomwalk.h"

using namespace tutorial;

  RandomWalk rw(particle_count, 24, 1083674, step_size, step_style, gpu);
  rw.advance(step_count, HybridTargetLevel::HOST);
#ifdef STORMM_USE_HPC
  rw.advance(step_count, HybridTargetLevel::DEVICE, gpu);
#endif  
```

Did we succeed?  Does the CPU predict and track the GPU for a simulation?  Here are the results for
14592 particles simulated over 10000 steps (the number of particles was chosen large enough that
multiple GPU thread blocks would be sure to participate):
```
>> /stormm/home/apps/Tutorial/tutorial_ii.stormm.cuda -n 14592 -x 10000 -r 8

Initial coordinates for selected particles:
                      X (host)    Y (host)    X (device)  Y (device)
  Particle      0 :      0.4620     -0.4254       0.4620     -0.4254
  Particle   1824 :     -0.9893     -1.0739      -0.9893     -1.0739
  Particle   3648 :      0.9163      0.3468       0.9163      0.3468
  Particle   5472 :      0.1537     -0.3371       0.1537     -0.3371
  Particle   7296 :      2.1082     -1.0995       2.1082     -1.0995
  Particle   9120 :      0.0275     -0.7435       0.0275     -0.7435
  Particle  10944 :     -0.0590      0.0879      -0.0590      0.0879
  Particle  12768 :      0.8372     -0.8285       0.8372     -0.8285

Final coordinates for selected particles:
                      X (host)    Y (host)    X (device)  Y (device)
  Particle      0 :     -3.7949    111.3093      -3.7949    111.3093
  Particle   1824 :    -89.8540    -94.4231     -89.8540    -94.4231
  Particle   3648 :    -65.3863    -91.7531     -65.3863    -91.7531
  Particle   5472 :     55.1165    164.5935      55.1165    164.5935
  Particle   7296 :    -61.0970    -53.3054     -61.0970    -53.3054
  Particle   9120 :     94.0278    -67.4425      94.0278    -67.4425
  Particle  10944 :    186.5278    -48.3775     186.5278    -48.3775
  Particle  12768 :   -177.0526     76.6744    -177.0526     76.6744
```
The results continue to track between CPU and GPU programs for a million or even ten million
steps.
