<template><div><h1 id="getting-started-with-stormm" tabindex="-1"><a class="header-anchor" href="#getting-started-with-stormm"><span>Getting Started with STORMM</span></a></h1>
<h2 id="introduction" tabindex="-1"><a class="header-anchor" href="#introduction"><span>Introduction</span></a></h2>
<p>The STORMM code base provides accessible, performant, and interoperable libraries for a new family
of molecular dynamics (MD) programs. It offers basic operations such as coordinate and topology
intake, user input parsing, and energy evaluations, managed through a common set of C++ classes and
CUDA or HIP kernels. The codebase is optimized for both CPU and GPU environments, aiming to balance
performance and accessibility.</p>
<h2 id="installation-instructions" tabindex="-1"><a class="header-anchor" href="#installation-instructions"><span>Installation Instructions</span></a></h2>
<h3 id="prerequisites" tabindex="-1"><a class="header-anchor" href="#prerequisites"><span>Prerequisites</span></a></h3>
<ul>
<li><strong>CMake</strong>: Version 3.18 or greater for CUDA compatibility.</li>
<li><strong>Environment Variables</strong>:
<ul>
<li><code v-pre>STORMM_SOURCE</code>: Set to <code v-pre>/your/STORMM/source/dir/</code></li>
<li><code v-pre>STORMM_HOME</code>: Set to <code v-pre>/your/STORMM/source/dir/</code></li>
<li><code v-pre>STORMM_BUILD</code>: Set to <code v-pre>/your/STORMM/build/dir/</code></li>
<li><code v-pre>STORMM_VERBOSE</code>: Set to <code v-pre>COMPACT</code> for concise testing output or <code v-pre>FULL</code> for detailed results.</li>
</ul>
</li>
</ul>
<h3 id="steps" tabindex="-1"><a class="header-anchor" href="#steps"><span>Steps</span></a></h3>
<ol>
<li><strong>Download and Unpack</strong>: Download the repository and unpack the source in
<code v-pre>/your/STORMM/source/dir/</code>.</li>
<li><strong>Create Build Directory</strong>: Make a new directory <code v-pre>/your/STORMM/build/dir/</code> and navigate to it.</li>
<li><strong>Configure the Build</strong>:
<ul>
<li>Run:<div class="language-bash line-numbers-mode" data-highlighter="prismjs" data-ext="sh" data-title="sh"><pre v-pre><code><span class="line">cmake <span class="token variable">${STORMM_SOURCE}</span> <span class="token parameter variable">-DCMAKE_BUILD_TYPE</span><span class="token operator">=</span>RELEASE <span class="token punctuation">[</span>additional cmake variable definitions<span class="token punctuation">]</span></span>
<span class="line"></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div></div></div></li>
<li>Or:<div class="language-bash line-numbers-mode" data-highlighter="prismjs" data-ext="sh" data-title="sh"><pre v-pre><code><span class="line">cmake <span class="token parameter variable">-b</span> <span class="token variable">${STORMM_BUILD}</span> <span class="token parameter variable">-s</span> <span class="token variable">${STORMM_SOURCE}</span> <span class="token parameter variable">-DCMAKE_BUILD_TYPE</span><span class="token operator">=</span>RELEASE <span class="token punctuation">[</span>additional cmake</span>
<span class="line">variable definitions<span class="token punctuation">]</span></span>
<span class="line"></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div></div></div></li>
</ul>
</li>
<li><strong>Build</strong>: Navigate to <code v-pre>${STORMM_BUILD}</code> directory and run <code v-pre>make -j</code> to build with all possible
resources.</li>
<li><strong>Test</strong>: Run <code v-pre>make test</code> if the compilation is successful to execute the test suite.</li>
</ol>
<h3 id="additional-cmake-definitions" tabindex="-1"><a class="header-anchor" href="#additional-cmake-definitions"><span>Additional CMake Definitions</span></a></h3>
<ul>
<li><strong><code v-pre>-DCMAKE_BUILD_TYPE</code></strong>: Set to <code v-pre>RELEASE</code> or <code v-pre>DEBUG</code>. The <code v-pre>DEBUG</code> version removes optimizations
and enables debugging flags.</li>
<li><strong><code v-pre>-DSTORMM_ENABLE_CUDA</code></strong>: Set to <code v-pre>ON</code> or <code v-pre>OFF</code> (default is <code v-pre>OFF</code>). Enables CUDA support if set
to <code v-pre>ON</code>.</li>
<li><strong><code v-pre>-DSTORMM_ENABLE_RDKIT</code></strong>: Set to <code v-pre>ON</code> or <code v-pre>OFF</code> (default is <code v-pre>OFF</code>). Enables RDKit support,
requiring a valid RDKit installation.</li>
<li><strong><code v-pre>-DCUSTOM_GPU_ARCH</code></strong>: Define specific GPU architectures for the build, e.g., <code v-pre>52</code>, <code v-pre>61</code>, <code v-pre>75</code>,  <code v-pre>86</code>, etc.</li>
<li><strong><code v-pre>-DCMAKE_SHOW_PTXAS</code></strong>: Set to <code v-pre>ON</code> or <code v-pre>OFF</code> (default is <code v-pre>OFF</code>). Shows PTXAS output, useful for
kernel performance evaluation.</li>
<li><strong><code v-pre>-DSTORMM_ENABLE_TEST_COVERAGE</code></strong>: Enable test coverage if <code v-pre>gcov</code> is installed.</li>
</ul>
<h2 id="code-standards" tabindex="-1"><a class="header-anchor" href="#code-standards"><span>Code Standards</span></a></h2>
<ul>
<li><strong>C++17 Standard</strong>: The code follows C++17 for features like enum classes, member initializers,
and more.</li>
<li><strong>Coding Style</strong>: Strive for a C-like feel with C++ features like templates, private/protected
members, and passing by reference.</li>
<li><strong>Iterators &amp; Pointers</strong>: Limited use of iterators, ranged loops, and unique pointers for
simplicity.</li>
<li><strong>Hybrid Memory Management</strong>: Dynamic memory in a hybrid CPU/GPU environment should be allocated
with Hybrid objects from the STORMM library.</li>
</ul>
<h2 id="coding-conventions" tabindex="-1"><a class="header-anchor" href="#coding-conventions"><span>Coding Conventions</span></a></h2>
<ul>
<li><strong>Max Line Width</strong>: 99 characters, with exceptions for kernel launches.</li>
<li><strong>Indentation</strong>: 2 spaces for new scopes.</li>
<li><strong>Arithmetic Statements</strong>: Group operations with parentheses and follow specific formatting
rules.</li>
<li><strong>Assignment Alignment</strong>: Align assignment operators in tightly connected statements.</li>
<li><strong>Type Inference</strong>: Limited use of <code v-pre>auto</code> typing to maintain clarity for new developers.</li>
<li><strong>Conditional Statements</strong>: Use <code v-pre>(!logic_expr)</code> for performance-critical cases,
<code v-pre>logic_expr == false</code> for readability.</li>
</ul>
<h2 id="abstraction-and-dependencies" tabindex="-1"><a class="header-anchor" href="#abstraction-and-dependencies"><span>Abstraction and Dependencies</span></a></h2>
<ul>
<li><strong>Class Inheritance</strong>: Not heavily used but not prohibited.</li>
<li><strong>Include Order</strong>:
<ol>
<li>C++ Standard Libraries</li>
<li><code v-pre>&quot;copyright.h&quot;</code></li>
<li>STORMM libraries, in alphabetical order.</li>
</ol>
</li>
<li><strong>File Structure</strong>: Separate header and implementation files with corresponding <code v-pre>#include</code>
guards.</li>
</ul>
<h2 id="naming-conventions" tabindex="-1"><a class="header-anchor" href="#naming-conventions"><span>Naming Conventions</span></a></h2>
<ul>
<li><strong>Function Names</strong>: Camel case (e.g., <code v-pre>thisIsCamelCase</code>).</li>
<li><strong>Variable Names</strong>: Lowercase with underscores (e.g., <code v-pre>this_is_a_variable</code>).</li>
<li><strong>Class Names</strong>: Capitalize first letters (e.g., <code v-pre>ThisIsAClassName</code>).</li>
<li><strong>Macros and Constants</strong>: Uppercase with underscores (e.g., <code v-pre>THIS_IS_A_MACRO</code>).</li>
</ul>
<h2 id="function-and-struct-declarations" tabindex="-1"><a class="header-anchor" href="#function-and-struct-declarations"><span>Function and Struct Declarations</span></a></h2>
<ul>
<li><strong>Passing Objects</strong>: Pass by const reference unless modifications are needed; then pass by
pointer.</li>
<li><strong>Documentation</strong>: Place descriptions of the implementation as standard C++ comments the <code v-pre>.cpp</code>
file, summaries of function or class purpose and descriptions of input or member variables as
Doxygen comments in the <code v-pre>.h</code> file.</li>
<li><strong>Template Conventions</strong>: Use type inference carefully, and follow the conventions outlined for
templates.</li>
</ul>
<p>This guide provides an overview of the installation process, coding standards, and conventions for
contributing to the STORMM codebase. For detailed information, refer to the specific sections in
the documentation.</p>
</div></template>


