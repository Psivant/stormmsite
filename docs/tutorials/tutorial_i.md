# A Basic GPU Program in STORMM
Begin at the beginning.  A GPU program will launch kernels on the device for massive parallel
processing in a
[Non-Uniform Memory Access (NUMA)](https://en.wikipedia.org/wiki/Non-uniform_memory_access)
framework.  From the perspective of the host, one CPU thread will stage data on the GPU, copying
data from one resource to another, then launch kernels to process that data.  A serial CPU process
is the administrator for a series of workhorse GPU processes, and this is reflected in the C++ to
CUDA transition that STORMM facilitates for NVIDIA hardware.

It begins with one array.  Constants can be sent to the GPU as kernel launch parameters, but
results from a CUDA kernel must, in general, be written to memory that the GPU can access (e.g. its
on-board memory, or
[memory on the host allocated in such a way that the GPU can see it](https://developer.download.nvidia.com/compute/DevZone/docs/html/C/doc/html/group__CUDART__MEMORY_g15a3871f15f8c38f5b7190946845758c.html).  The contents of the array can then be downloaded by the CPU in the same way that the CPU
can upload data to the device.  STORMM encapsulates memoory management through the templated
`Hybrid` C++ class.

The first step in writing the program is to recognize the GPU.  STORMM provides several classes to
identify and select all available GPUs on the system.  They are the `GpuDetails` and `HpcConfig`,
available by including the following header files:
```
#include "/stormm/home/src/card/gpu_details.h"
#include "/stormm/home/src/card/hpc_config.h"
```
We also need access to the `Hybrid` template implementation and some enumerators to choose among
different options, which are available through:
```
#include "/stormm/home/src/card/gpu_enumerators.h"
#include "/stormm/home/src/card/hybrid.h"
```

Whenever designing a GPU program, the purpose is speed of execution, and a means of profiling the
code is therefore helpful.  While
[NVIDIA's `nvprof` tool](https://docs.nvidia.com/cuda/profiler-users-guide/) is useful for
measuring kernel execution speed, for many applications a great deal of time may be spent on the
CPU, staging the calculation.  If the GPU accelerates by 1000x something which is 99% of the run
time of a single-threaded, CPU program, then in a run that would have taken 100 seconds that
portion takes 0.099 seconds in a GPU-enabled code, but the CPU staging or post-processing portion
still takes one second, accounting for 90% of the wall time.  It can also be useful for users to
see the wall time of various parts of their calculations, to optimize their own workflows or
provide feedback to the developers.  For generating timings "in the wild", one cannot reply on a
profiler, and therefore STORMM provides a dedicated class, the `StopWatch`, for timing different
segments of a program.  Include:
```
#include "/stormm/home/src/UnitTesting/stopwatch.h"
```

These capabilities, to find a GPU and to initialize a timings apparatus, can be laid out in the
opening lines of the program.  Once the GPU is found, it is also helpful to do something such as
allocate an array on the device, to trigger NVIDIA firmware and prepare the card for use by the
program.
```
  StopWatch the_clock("STORMM Tutorial I");
  const int gpu_asgn_tm = the_clock.addCategory("Assign a GPU");
  const int gpu_prep_tm = the_clock.addCategory("Prep the GPU");
  the_clock.assignTime();
#ifdef STORMM_USE_HPC
  const HpcConfig gpu_config(ExceptionResponse::WARN);
  const std::vector<int> my_gpus = gpu_config.getGpuDevice(1);
  const GpuDetails gpu = gpu_config.getGpuInfo(my_gpus[0]);
  the_clock.assignTime("Assign a GPU");
  Hybrid<int> force_gpu_to_engage(1);
#  ifdef STORMM_USE_CUDA
  cudaDeviceSynchronize();
#  endif
  the_clock.assignTime("Prep the GPU");
  printf("This program is running on a %s card:\n", gpu.getCardName().c_str());
  printf("  Major.minor architecture version: %d.%d\n", gpu.getArchMajor(), gpu.getArchMinor());
  printf("  Streaming multiprocessors: %d\n", gpu.getSMPCount());
  printf("  Card RAM: %d megabtyes\n", gpu.getCardRam());
  printf("  Global cache size: %d bytes\n\n", gpu.getGlobalCacheSize());
#endif
```
The above code demonstrates how the `GpuDetails` class, is a standard C++ class with constructors
and accessors.  It can be returned by methods in other classes or passed to functions that will
manage GPU kernel launches.  Moreover, it is a wrapper for various structs in CUDA or, potentially,
other HPC languages that capture specs of a card in the computer system.

The `StopWatch` class is intended to give developers simple and efficient methods to assign the
time spent between any two wall time measurements to one of many customized, labeled bins.  The
code above demonstrates assignment based on the name of the bin.  As implied by the variable
`gpu_asgn_time` and `gpu_prep_time` variables, each category in the time tracking is given a
unique integer value, which can also be used to immediately get the right bin rather than some
search over name strings.

Aside from the tivial array which was allocated to force the GPU to engage, we can now create a
more substantial array and manipulate its contents.  The `Hybrid` class will only accept template
types of familiar, elemental types such as `int`, `double`, `char`, or `bool`.  It is not like the
C++ Standard Template Library `std::vector`, which can be a container for arrays of custom
classes and typically has optimized implementations for `std::vector<bool>`.  Some of the basic
methods are similar, and for this STORMM uses "camel case" rather than underscore-separated
methods, to help developers see when they are dealing with the STORMM dynamic memory class rather
than the C++ standard.  The subscript array index operator `[]` is not overloaded in `Hybrid`
objects at this time.  One feature of the `Hybrid` class is a developer-defined label that goes
along with each array, which will be displayed if range-checked memory accesses fail to expedite
backtracing.

Let us allocate an array to hold a number sequence.  The sequence will start at some value and then
ping-pong between two limits.
```
  // Create an array of integers on the CPU host and (if available) on the GPU device
  const int int_experiment_tm = the_clock.addCategory("Experiment with integers");
  Hybrid<int> xferable_integers(128, "Test_Int_Array");
  int ri = -5;
  for (size_t i = 0; i < xferable_integers.size(); i++) {
    xferable_integers.putHost(ri, i);
    if (i == 0) {
      ri++;
    }
    else if (ri == 16) {
      ri -= 2;
    }
    else if (ri == -8) {
      ri++;
    }
    else {
      if (xferable_integers.readHost(i - 1) < ri) {
        ri++;
      }
      else {
        ri -= 2;
      }
    }
  }
```

This is an opportunity to demonstrate the C++ to C, C to CUDA strategy that guides much of STORMM's
development.  C++ made big improvements in its 2011 update, among them compilers getting smart
about seeing the subscript array operator on `std::vector` objects and optimizing the pointer
arithmetic to work at the same speed as the original C implementations.  CUDA needs pointers to
work best, not classes with methods implemented on the CPU.  The common space on the Venn diagram
is, therefore, to take a valid pointer to the data in an array and access data as if the program
were written in C.  We need to set the pointer again if the array is resized and do not know just
by looking at the pointer how much valid memory is allocated behind it, but the most common bugs
with arrays involve requesting an array subscript index that is out of bounds, and `std::vector`
will not check the index anyway.  We will use this method to print all contents of the array in a
human-readable format:
```
  // Grab a pointer to the array's host-side data and print the contents
  const int* host_xi_ptr = xferable_integers.data(HybridTargetLevel::HOST);
  const int nxi = xferable_integers.size();
  printf("Contents of xferable_integers:\n  ");
  for (int i = 0; i < nxi; i++) {
    printf(" %3d", host_xi_ptr[i]);
    if ((i + 1) % 16 == 0 || i == nxi - 1) {
      printf("   (%3d)\n  ", i + 1);
    }
  }
  printf("\n");
```

Next, we can consider some operation that invovles the array as a whole: the sum of all elements.
This is trivial to do in a single-threaded C program by looping over each element, as was done
above to display the values.  In general, we must consider cases where the array might be so large
that the data type used to hold the summation might break: a floating point value could overflow to
`NaN` or `Inf`, but more likely a 32-bit `int` could be overwhelmed by combining a million values
in the range of 10,000.  We don't need to worry with the problem at hand, but this sort of safety
is what drives a lot of the details in general-purpose code.

Summing the contents of an array in CUDA is very much like taking their sum in another parallel
programming scheme: divide the problem into non-overlapping parts, delegate, and then combine the
results.  It's not within the scope of the present tutorial to delve into the particulars of
kernel writing, which is also covered on many other forums.  This is an opportunity to talk about
how STORMM deals with code bloat and makes C++ templating amenable to CUDA in light of the above
vulnerability, which necessitates versatility in the choice of data types.  A typical C++ program
cannot launch a CUDA kernel unless it was compiled directly by the NVIDIA CUDA compiler.  STORMM
is built to work in a CPU-only environment, to compile without the benefits of CUDA, so that
development can continue and features that do not involve massive number crunching remain
accessible on machines without compatible GPUs.

In order to launch a CUDA kernel, we must write a separate CUDA unit, with a **.cu** rather than
**.cpp** extension.  The CUDA unit will also be able to understand templated CUDA kernels, files
that STORMM stuffs into files with **.cuh** extensions (while many C++ programmers write templated
functions in the header files where the function is first mentioned, STORMM takes a convention of
creating a separate **.tpp** file for the implementation as opposed to the declaration).  The
**.cu** file will contain the implementation of a function to take an array of a given data type
and compute the sum.  For complete generality, we would again need to allow that the sum be
computed in a distnct data type, longer in format than the type of the array elements, but we can
assume the same type for each in this example.  The C++ program cannot be told to `#include` any
CUDA template implementations--the function within the **.cu** file will take an array and then
delegate to some templated form of a CUDA kernel that only the CUDA unit knows about.  C++ doesn't
know what a kernel, much less a template implementation for a kernel, really is.  However, the C++
program will `#include` the header describing the launching function, as illustrated in the
following diagram:

