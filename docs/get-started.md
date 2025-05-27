# Getting Started with STORMM

## Introduction
The STORMM code base provides accessible, performant, and interoperable libraries for a new family
of molecular dynamics (MD) programs. It offers basic operations such as coordinate and topology
intake, user input parsing, and energy evaluations, managed through a common set of C++ classes and
CUDA or HIP kernels. The codebase is optimized for both CPU and GPU environments, aiming to balance
performance and accessibility.

## Installation Instructions

### Prerequisites
- **CMake**: Version 3.18 or greater for CUDA compatibility.
- **Environment Variables**:
  - `STORMM_SOURCE`: Set to `/your/STORMM/source/dir/`
  - `STORMM_HOME`: Set to `/your/STORMM/source/dir/`
  - `STORMM_BUILD`: Set to `/your/STORMM/build/dir/`
  - `STORMM_VERBOSE`: Set to `COMPACT` for concise testing output or `FULL` for detailed results.

### Steps
1. **Download and Unpack**: Download the repository and unpack the source in
   `/your/STORMM/source/dir/`.
2. **Create Build Directory**: Make a new directory `/your/STORMM/build/dir/` and navigate to it.
3. **Configure the Build**:
   - Run: 
     ```bash
     cmake ${STORMM_SOURCE} -DCMAKE_BUILD_TYPE=RELEASE [additional cmake variable definitions]
     ```
   - Or: 
     ```bash
     cmake -b ${STORMM_BUILD} -s ${STORMM_SOURCE} -DCMAKE_BUILD_TYPE=RELEASE [additional cmake
     variable definitions]
     ```
4. **Build**: Navigate to `${STORMM_BUILD}` directory and run `make -j` to build with all possible
   resources.
5. **Test**: Run `make test` if the compilation is successful to execute the test suite.

### Additional CMake Definitions
- **`-DCMAKE_BUILD_TYPE`**: Set to `RELEASE` or `DEBUG`. The `DEBUG` version removes optimizations
  and enables debugging flags.
- **`-DSTORMM_ENABLE_CUDA`**: Set to `ON` or `OFF` (default is `OFF`). Enables CUDA support if set
  to `ON`.
- **`-DSTORMM_ENABLE_RDKIT`**: Set to `ON` or `OFF` (default is `OFF`). Enables RDKit support,
  requiring a valid RDKit installation.
- **`-DCUSTOM_GPU_ARCH`**: Define specific GPU architectures for the build, e.g., `52`, `61`, `75`,  `86`, etc.
- **`-DCMAKE_SHOW_PTXAS`**: Set to `ON` or `OFF` (default is `OFF`). Shows PTXAS output, useful for
  kernel performance evaluation.
- **`-DSTORMM_ENABLE_TEST_COVERAGE`**: Enable test coverage if `gcov` is installed.

## Code Standards
- **C++17 Standard**: The code follows C++17 for features like enum classes, member initializers,
  and more.
- **Coding Style**: Strive for a C-like feel with C++ features like templates, private/protected
  members, and passing by reference.
- **Iterators & Pointers**: Limited use of iterators, ranged loops, and unique pointers for
  simplicity.
- **Hybrid Memory Management**: Dynamic memory in a hybrid CPU/GPU environment should be allocated
  with Hybrid objects from the STORMM library.

## Coding Conventions
- **Max Line Width**: 99 characters, with exceptions for kernel launches.
- **Indentation**: 2 spaces for new scopes.
- **Arithmetic Statements**: Group operations with parentheses and follow specific formatting
  rules.
- **Assignment Alignment**: Align assignment operators in tightly connected statements.
- **Type Inference**: Limited use of `auto` typing to maintain clarity for new developers.
- **Conditional Statements**: Use `(!logic_expr)` for performance-critical cases,
  `logic_expr == false` for readability.

## Abstraction and Dependencies
- **Class Inheritance**: Not heavily used but not prohibited.
- **Include Order**:
  1. C++ Standard Libraries
  2. `"copyright.h"`
  3. STORMM libraries, in alphabetical order.
- **File Structure**: Separate header and implementation files with corresponding `#include`
  guards.

## Naming Conventions
- **Function Names**: Camel case (e.g., `thisIsCamelCase`).
- **Variable Names**: Lowercase with underscores (e.g., `this_is_a_variable`).
- **Class Names**: Capitalize first letters (e.g., `ThisIsAClassName`).
- **Macros and Constants**: Uppercase with underscores (e.g., `THIS_IS_A_MACRO`).

## Function and Struct Declarations
- **Passing Objects**: Pass by const reference unless modifications are needed; then pass by
  pointer.
- **Documentation**: Place descriptions of the implementation as standard C++ comments the `.cpp`
  file, summaries of function or class purpose and descriptions of input or member variables as
  Doxygen comments in the `.h` file.
- **Template Conventions**: Use type inference carefully, and follow the conventions outlined for
  templates.

This guide provides an overview of the installation process, coding standards, and conventions for
contributing to the STORMM codebase. For detailed information, refer to the specific sections in
the documentation.
