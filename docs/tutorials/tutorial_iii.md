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
The third step is not essential, but in general it is a good idea to streamline the extraction of
information from a general-purpose format (where each access requires interpreting, checking, and
comparing a character string) to an application-specific dispenser.  STORMM also comes with a
number of modular namelists, e.g. `&dynamics` and `&precision`, which can be included in programs
from the main libraries.  Each of these native input blocks comes with its own unique class to
filter the user's input by the strategy above, e.g.
[`DynamicsControls`](../doxygen/classstormm_1_1namelist_1_1DynamicsControls.html) or
[`PrecisionControls`](../doxygen/classstormm_1_1namelist_1_1PrecisionControls.html)

The preferred route is to make a function to configure the `NamelistEmulator` with input elements,
then have that function take the user input file or a
[`TextFile`](../doxygen/classstormm_1_1parse_1_1TextFile.html) class object that has already loaded
the input text into memory.  The bulk of this function will involve configuring the
`NamelistEmulator` with keywords, defaults and help messages.  Before returning the
`NamelistEmulator` object, the function will load it up using the
[`readNamelist`](../doxygen/input_8h_source.html) function.  Again, this will search for keywords
in an ascii text file to convert the user input into a general-purpose dispenser which can then
dispense the information by issuing queries based on those keywords.  The function that manages
configuration and loading of the `NamelistEmulator` object for a given control block will be called
by the constructor for the application-specific class that dispense information to the rest of the
program.  An abbreviated header for the protocol is written below:
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

## Configuring the Keywords
In the example above, which will be expanded in the Tutorial III program, the namelist `&star` is
configured into a `NamelistEmulator` by the `starInput` function.  The contents of that function,
which again accomplishes the first and second stages of the overall process, could be as follows
(a slightly longer version is found in the tutorial "answer" program,
**/stormm/home/apps/Tutorial/tutorial_iii.cpp**).
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
  NamelistEmulator result("star", CaseSensitivity::YES, ExceptionResponse::DIE, "Parameters for "
                          "a star in the sky");
  result.addKeyword("planets", NamelistType::INTEGER, std::to_string(8));
  result.addKeyword("mass", NamelistType::REAL, std::to_string(1.0));
  result.addKeyword("brightness", NamelistType::REAL, std::to_string(-26.74));
  int start_line = 0;
  readNamelist(input_ascii_text, &result, &start_line, WrapTextSearch::YES, tf.getLineCount());
  return result;
}
```

## Optimizing Access with an Application-Specific Class
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

## Displaying Keyword Documentation
In addition to the means for developing new namelists, STORMM has a way to give each program a user
manual with an interactive display through the command line.  With this system, running the program
with no arguments or with `--help` and variations thereof will produce a summary of the program's
declared purpose and a list of namelist control block titles, with their own provided
descriptions, in the terminal window.  Running the program with the title of one of the applicable
namelists as the command line argument will produce a table of keywords in the namelist, complete
with data types, default values, and descriptions.  All of this is done by accessing the configured
`NamelistEmulator`, and works with many of the same methods used to display namelist contents and
input choices when printing a report file at the end of a run.

In order to add help messages for each keyword, we must go to the function wherein the namelist is
being configured.  The help messages can , in fact, be included with each keyword's configuration,
although the `addKeyword` method has many overloads and it can be unwieldy to include so much
documentation in the space of a single function call.  STORMM also provides the `addHelp` method
within the `NamelistEmulator` class to set the user documentation (more precisely, `addHelp` will
modify the message after the constructor assigns a blank message).  The documentation for each
keyword, building on the above code to configure `NamelistEmulator result`, could be:
```
  result.addHelp("planets", "The number of planets known to orbit the star");
  result.addHelp("mass", "Estimated mass of the star, in units of solar masses");
  result.addHelp("brightness", "Apparent magnitude of the star, as observed from Earth");
  result.addHelp("name", "Common name given to the star");
  result.addHelp("constellation", "Name of the constellation in which the star appears, or the "
                 "constellation giving a direction in which to find the star");
```

## Telling the User What To Do
Once the keyword descriptions are configured in the namelist, the developer needs to ensure that
they can be conveyed to the user.  In STORMM programs, the convention is that running the program
with no arguments (or, `--help`) will print a list of all relevant namelist control blocks, with
general descriptions (for `&star`, the description was "Parameters for a star in the sky").
Re-running the program with the title of a namelist as the command line argument will, in turn,
print documentation on the keywords within.  But, how do we tell the system about our new namelist,
`&star`?

It's worthwhile to point out here that STORMM has a number of general-purpose control blocks for
developers to mix and match the input.  To reiterate, a `NamelistEmulator` class object is not
much, until it's configured.  That's why the convention is to encapsulate the configuration for
each namelist control block into a specific function, e.g. `starInput` shown above, so that the
documentation system can call on that function to produce a new `NamelistEmulator` object
configured for the control block of interest.  We can then use a simple class to connect each
configuring function with a namelist title string, and that is the `NamelistToken` class in
**/stormm/home/src/Namelists/namelist_inventory.h**.  The class stores a function pointer and
contains a method to execute that function on demand.  The documentation system can then read
through its lists, match the user's request to the title of a namelist that it knows, and configure
a new `NamelistEmulator` object with all of the relevant keywords.  It can then dive in and grab
the documentation with the `NamelistEmulator` method `printHelp`.

All we need to do is make the documentation system aware of our new control block.  To do that,
we can make a vector of tokens for the custom namelists, which in this case is just `&star`:
```
#include "/stormm/home/src/Namelists/namelist_inventory.h"

using stormm::namelist::NamelistToken;

  const std:vector<NamelistToken> tutorial_specific_namelists = {
    NamelistToken(std::string("&star"), starInput);
  };
  clip.addCustomNamelists(tutorial_specific_namelists);
```
Above, we made a minimal example of the configuration function.  In order to get it into the
reporting system, the function primitive needs to conform to that of other configuration functions
in STORMM.  We can therefore add a couple of input parameters to make the form of `starInput` match
that of functions like `dynamicsInput` in **/stormm/home/src/Namelists/nml_dynamics.h**.
```
NamelistEmulator starInput(const TextFile &input_ascii_text, int *start_line, bool *found_nml,
                           ExceptionResponse policy = ExceptionResponse::DIE,
                           WrapTextSearch wrap = WrapTextSearch::NO);
```
Note that the three of the inputs we added can be passed on to the `readInput` function rather than
being created as local variables in `starInput` and hidden from the rest of the program.  Through
the `NamelistToken` array, the new namelist's token is added to the `CommandLineParser`.  One task
remains, which is to add the name / title of the control block to the parser's list of known
namelists so that it does not confuse the title of an actual namelist for some other argument that
it is supposed to interpret from the command line.  In fact, requests for namelist documentation
will be intercepted before the call to `CommandLineParser::parseUserInput(argc, argv)`.  We use
code from STORMM's `display` library to produce the documentation in the terminal for a user.  The
entire code for configuring the command line parsing is given below:
```
#include "/stormm/home/src/Reporting/help_messages.h"

using stormm::display::displayNamelistHelp;

  CommandLineParser clip("Tutorial_III", "An exercise in creating custom user control blocks with "
                         "the native STORMM documentation system");
  clip.addStandardApplicationInputs("-i");
  NamelistEmulator *cmd_nml = clip.getNamelistPointer();
  cmd_nml->addKeyword("-rating", NamelistType::INTEGER, std::string(""));
  cmd_nml->addHelp("-rating", "Rate this tutorial on a scale of 1-10.");
  const std::vector<NamelistToken> tutorial_specific_namelists = {
    NamelistToken(std::string("&star"), starInput)
  };
  const std::vector<std::string> my_namelist_names = { "star" };
  clip.addControlBlocks(my_namelist_names);
  clip.addCustomNamelists(tutorial_specific_namelists);
  if (displayNamelistHelp(argc, argv, my_namelist_names, tutorial_specific_namelists) &&
      clip.doesProgramExitOnHelp()) {
    return 0;
  }
  clip.parseUserInput(argc, argv);
```
All documentation will be printed to the terminal in the `displayNamelistHelp` function.  The
`CommandLineParser` can be set to have the program continue after rendering the messages, but the
default behavior is to exit and await the user's next attempt.

## Results
When the tutorial's "answer" program found in **/stormm/home/apps/Tutorial/tutorial_iii.cpp** is
run with no command line arguments, or with `--help`, we get the following:
```
>> /stormm/build/apps/Tutorial/tutorial_iii.stormm.cuda

+-----------------------------------------------------------------------------+
Tutorial_III: An exercise in creating custom user control blocks with the
              native STORMM documentation system

 Command line inputs [ type, default value ]:
+-----------------------------------------------------------------------------+
 + --help  : [BOOLEAN, FALSE] List command line arguments with descriptions.

 + -help   : [BOOLEAN, FALSE] List command line arguments with descriptions.

 + -i      : [ STRING, 'stormm.in'] The primary input file, equivalent to
             Amber's mdin.

 + -rating : [INTEGER,  None] Rate this tutorial on a scale of 1-10.

  Applicable namelist control blocks (re-run with one of these titles as the
  command-line argument, in quotes if the leading '&' is included, for a full
  description of all keywords in the namelist):
  |
  | Namelist            Description
  | --------  --------------------------------
  | &star     Parameters for a star in the sky
```
The command line arguments are listed, followed by a brief description of the control block that
we can put in the input file.  If we run the program and request more information on the control
block `&star`, we get:
```
>> /stormm/build/apps/Tutorial/tutorial_iii.stormm.cuda star

+-----------------------------------------------------------------------------+
&star: Parameters for a star in the sky

 Keywords [ type, default value ]:
+-----------------------------------------------------------------------------+
 + planets       : [INTEGER,      8] The number of planets known to orbit the
                   star

 + mass          : [   REAL,    1.0] Estimated mass of the star, in units of
                   solar masses

 + brightness    : [   REAL, -26.74] Apparent magnitude of the star, as
                   observed from Earth

 + name          : [ STRING,   None] Common name given to the star

 + constellation : [ STRING,   None] Name of the constellation in which the
                   star appears, or the constellation giving a direction in
                   which to find the star
```
The types and default values of each keyword are displayed for the user, while the developer is
only required to write the documentation in one place.  If we now run the program with an input
file such as <a href="../assets/t3.in" download>this example</a>, the user input will be parsed
and rendered in a convenient format for the rest of the C++ program.  Note that the tutorial
program makes use of the `start_line` variable and the return value of `readInput` to step through
the input file and record multiple `&star` namelist control blocks.  This is the more complete
behavior available when using the standard form of a STORMM namelist configuration function.  The
result is:
```
>> /stormm/build/apps/Tutorial/tutorial_iii.stormm.cuda -i t3.in

There are 3 stellar entries in t3.in.

    Star Name      Mass  Brightness Planets   Constellation
----------------- ------ ---------- ------- -----------------
 Alpha Centauri A   1.07     0.0100       0         Centaurus
 Alpha Centauri B   0.91     1.3300       0         Centaurus
 Proxima Centauri   0.12    10.4300       3         Centaurus
```

## Closing Remarks
Customized user input is not something that a programming environment can ignore, and the diversity
of methodologies in computational chemistry demands a robust and efficient conduit for new input
directives in any program.  We hope that STORMM's methods, which require about 50 lines of
conformal "overhead" to support any number of new keywords and convey their meaning to the user,
will streamline the process of making new methods of professional quality using STORMM's advanced
GPU kernels.
