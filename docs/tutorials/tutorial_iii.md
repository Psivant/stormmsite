# Creating Your Own Input Blocks
With few exceptions, creating custom programs, or modifying existing programs, requires the
developer to create input options for the user to control new features.  STORMM uses a native
C++ emulator for Fortran-like namelists, allowing it to read input files that look much like those
of the AMBER molecular dynamics engines **sander** and **pmemd**.  The namelist syntax in STORMM is
enhanced, allowing users to forego `=` signs and commas: `keyword_a = value_a, keyword_b = value_b`
is interpreted in the same way as `keyword_a value_a keyword_b value_b`, although a comma would
help for legibility.  STORMM also lets the developer specify keywords to take `STRUCT` inputs,
signified by brace characters before and after a list of sub-key entries, e.g.
`composite_a = { -part_i value_i, -part_ii value_ii, -part_iv value_iv }` with sub-keys being
optional or required at the developer's discretion.  Furthermore, STORMM lets the developer
stipulate whether a keyword will accept multiple entries.  In this tutorial, we will explore how to
make a custom input block and give the user a pathway to feeding information into programs written
with STORMM.

## The Method
There are three major steps to passing user input into STORMM, each requiring C++ code of moderate
density.
- Establish a new [`NamelistEmulator`](../doxygen/classstormm_1_1namelist_1_1NamelistEmulator.html)
  class object.
- Run a file stream by that `NamelistEmulator` object to load it up user input directives
- Write an original class to offload information from the `NamelistEmulator` and digest it for
  the rest of the program
The third step is not essential, but in general is a good idea to streamline the extraction of
information from a general-purpose format (where each access requires interpreting, checking, and
comparing a character string) to an application-specific dispenser.  STORMM also comes with a
number of modular namelists, e.g. `&dynamics` and `&precision`, which can be included in programs
from the main libraries.  Each of these native input blocks comes with its own unique class to
digest the user's input by the strategy above, e.g.
[`DynamicsControls`](../doxygen/classstormm_1_1namelist_1_1DynamicsControls.html) or
[`PrecisionControls`](../doxygen/classstormm_1_1namelist_1_1PrecisionControls.html)

The preferred route is to make a function to configure the `NamelistEmulator` with input elements,
and have that function take the user input file or a
[`TextFile`](../doxygen/classstormm_1_1parse_1_1TextFile.html) class object that has already loaded
the input text into memory.  The bulk of this function will involve configuring the
`NamelistEmulator` with keywords, defaults and help messages.  Before returning the
`NamelistEmulator` object, the function will load it up using the
[`readNamelist`](../doxygen/input_8h_source.html) function.  Again, this will search for keywords
in an ascii text file to convert the user input into a general-purpose dispenser which can then
dispense the information by issuing queries based on those keywords.  The function that manages
configuration and loading of the `NamelistEmulator` object for a given control block will be called
by the class constructor for the application-specific class which further digests information in
the `NamelistEmulator` to make the user input available through specific accessor functions.  An
abbreviated protocol is written below:
```
#include "/stormm/home/src/Namelists/namelist_emulator.h"
#include "/stormm/home/src/Parsing/textfile.h"

using stormm::namelist::NamelistEmulator;

NamelistEmulator starInput(const TextFile &input_ascii_text);

class StarControls() {
public:
  StarControls(const TextFile &input_ascii_text);

  int getPlanetCount() const;
  double getMass() const;
  double getBrightness() const;
  
private:
  int planet_count;   // Number of planets in orbit
  double mass;        // Mass in units of solar masses
  double brightness;  // Brightness expressed in apparent magnitude
};
```

In the example above, which will be expanded in the Tutorial III program, the namelist `&star` is
configured into a `NamelistEmulator` by the `starInput` function.  The contents of that function,
which again accomplishes the first and second stages of the overall process, could be:
```
#include "/stormm/home/src/Constants/behavior.h"
#include "/stormm/home/src/Namelists/input.h"
#include "/stormm/home/src/Namelists/namelist_enumerators.h"
#include "/stormm/home/src/Parse/parsing_enumerators.h"

using stormm::constants::ExceptionResponse;
using stormm::constants::CaseSensitivity;
using stormm::namelist::NamelistType;
using stormm::parse::WrapTextSearch;

NamelistEmulator starInput(const TextFile &input_ascii_text) {
  NamelistEmulator result("star", CaseSensitivity::YES, ExceptionResponse::DIE, "Accepts data "
                          "entry for a star in the sky");
  result.addKeyword("planets", NamelistType::INTEGER, std::to_string(8));
  result.addKeyword("mass", NamelistType::REAL, std::to_string(1.0));
  result.addKeyword("brightness", NamelistType::REAL, std::to_string(-26.74));
  int start_line = 0;
  readNamelist(input_ascii_text, &result, &start_line, WrapTextSearch::YES, tf.getLineCount());
  return result;
}
```

The `starInput` function carried out the laborious task of sifting through the entire input file,
or a portion of its lines if we had some intelligent way to put limits on the range.  This
converted the potentially large block of character input into a developer-defined collection of
keyword-value pairs.  It is incorporated into the `StarControls` class constructor to carry out,
once, the relatively strenuous task of sifting through the keyword-value pairs to find the
appropriate values needed by the program based on their keywords.  Its abridged contents might be:
```
StarControls::StarControls(const TextFile &input_ascii_text) :
    planet_count{0}, mass{1.0}, brightness{1.0}
{
  NamelistEmulator t_nml = starInput(input_ascii_text);
  t_nml.assignVariable(&planet_count, "planets");
  t_nml.assignVariable(&mass, "mass");
  t_nml.assignVariable(&brightness, "brightness");
}
```
Once the `StarControls` class object is constructed, getting the number of planets around a star
no longer requires a series of string comparisons against every keyword in the `&star` namelist,
it can be retrieved by a single call to the `StarControls::getPlanetCount()` accessor function
(the contents of which were not written out above, but should be obvious).  The `NamelistEmulator`
methods such as `assignVariable` and `addKeyword` come with many overloads to give developers
freedom in organizing the keywords and their associated descriptions.  In a real application, there
might be more than a dozen keywords in the new input block.  Configuring the `NamelistEmulator` and
unpacking it in this way will comprise the bulk of the code to write, and is intended to be as
script-like as possible.

## Displaying Keyword Documentation
In addition to the means for developing new namelists, STORMM has a way to give each program a user
manual with an interactive display through the command line.  With this system, running the program
with no arguments or with `--help` and variations thereof will produce a summary of the program's
declared purpose and a list of namelist conntrol block titles, with their own provided
descriptions, in the terminal window.  Running the program with the title of one of the applicable
namelists as the command line argument will produce a table of keywords in the namelist, complete
with data types, default values, and descriptions.  All of this is done by accessing the configured
`NamelistEmulator`, and works with many of the same methods used to display namelist contents and
input choices when printing a report file at the end of a run.

## The Command Line is a Namelist, Too!
The first place STORMM programs take in user information isn't the input file, though: it's the
command line.  Command line arguments need documentation as well, and to address this need, STORMM
bundles all of the character strings passed in from the command line and bundles them as if they
were the contents of a namelist.  This is done using the
[`CommandLineParser`](../doxygen/classstormm_1_1namelist_1_1CommandLineParser.html) class, which
includes among its members a `NamelistEmulator` and a collection of common keywords (with
descriptions) that a developer can add as command line arguments by including them in the
constructor call.  The developer may add original command line arguments by reaching into the
parser to edit the namelist stored inside, and even have the parser coordinate with other classes
which look to the command line for information so as not to have keyword collisions or raise
exceptions when one parser doesn't recognize a keyword to be used by another.
