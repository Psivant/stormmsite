import{_ as n,c as e,o as s,b as i}from"./app-DC3Q17YB.js";const a={},l=i(`<h1 id="a-random-walk-simulator-in-stormm" tabindex="-1"><a class="header-anchor" href="#a-random-walk-simulator-in-stormm"><span>A Random Walk Simulator in STORMM</span></a></h1><p>One of the most significant technical challenges undertaken in the STORMM project involves making the code&#39;s results reproducible, not just in a scientific sense (we provide the code and describe the approach in enough detail that another investigator could replicate the results) but in the numerics. The <a href="https://standards.ieee.org/ieee/754/6210/" target="_blank" rel="noopener noreferrer">IEEE standard for floating point arithmetic</a> admits <a href="https://grouper.ieee.org/groups/msc/ANSI_IEEE-Std-754-2019/background/addendum.html" target="_blank" rel="noopener noreferrer">some variabilities</a> and also changes in the order of operations which can change the way in which accepted roundoff errors combine. Therefore, different chipsets should be expected to produce different answers in a long series of arithmetic operations like a simulation, but a highly parallel programming environment such as a GPU demands a high degree of consistency in order to spot race conditions or other subtle errors in the code. STORMM development strives for the highest degrees of numerical consistency, employing techniques such as those demonstrated in this tutorial. To showcase the capabilities, we will program a simple random walk in two dimensions, with a user-specifiable number of particles and steps. The goal will be to reproduce GPU results with a CPU implementation.</p><h2 id="random-number-generation-in-stormm" tabindex="-1"><a class="header-anchor" href="#random-number-generation-in-stormm"><span>Random Number Generation in STORMM</span></a></h2><p>STORMM makes use of the XOR-shift generators <a href="https://prng.di.unimi.it" target="_blank" rel="noopener noreferrer">Xoroshiro128+ and Xoshiro256++</a> to create streams of predictable pseudo-random numbers based on state vectors with small memory requirements. While useless for cryptography, the presence of &quot;jump&quot; and &quot;long jump&quot; methods in each generator makes them ideal for molecular simulations and other efforts in computational science. The particular orbit of any of the generators depends on some of the internal bit shift settings, but with any given seed the sequence begins at one point in the series and can then be fast-forwarded by the square root of the orbit&#39;s total length, 2<sup>64</sup> (approximately 18 billion billion) steps in the case of Xoroshiro128+ and 2<sup>128</sup> steps in the case of Xoshiro256++. There is also a &quot;long jump&quot; function in each generator, which jumps forward 2<sup>96</sup> steps in Xoroshiro128+ and 2<sup>192</sup> steps in Xoshiro256++.</p><p>Four billion long jumps can (in theory) be taken in Xoroshiro128+ and billions upon billions in Xoshiro256++, but according to the author the Xoroshiro128+ generator should not be used to generate thousands of streams of random numbers, as the different segments of the orbit cannot be guaranteed to be free of detectable correlations. <a href="https://www.sciencedirect.com/science/article/pii/S0377042718306265" target="_blank" rel="noopener noreferrer">(Xoroshiro128+ also fails the Big Crush test.)</a> STORMM therefore uses the Xoshiro256++ generator in its GPU applications, but for the purposes of this tutorial it&#39;s sufficient to assign one segment of the 128-bit orbit to each particle and sally forth.</p><p>The generators are easy to operate from the standpoint of a CPU program: each is encapsulated in its own C++ class and ticks forward as it produces random numbers. For GPU operations, there are special, vectorized initializers and (for kernels) a collection of <code>__device__</code> functions that can be included in any CUDA unit without needing to resort to relocatable device code (<code>-rdc</code> for those familiar with compiler commands). The C++ initialization is simple, while the GPU initialization is packaged within <code>initXoroshiro128pArray</code> and comes with the STORMM libraries.</p><div class="language-text line-numbers-mode" data-highlighter="prismjs" data-ext="text" data-title="text"><pre><code><span class="line">#include &quot;../../src/Random/random.h&quot;</span>
<span class="line"></span>
<span class="line">using stormm::random::Xoroshiro128pGenerator;</span>
<span class="line">using stormm::random::initXoroshiro128pArray;</span>
<span class="line"></span>
<span class="line">  Xoroshiro128pGenerator xrs(prng_seed, 10);</span>
<span class="line">  for (int i = 0; i &lt; coordinate_count; i++) {</span>
<span class="line">    rng_states.putHost(xrs.revealState(), i);</span>
<span class="line">    xrs.jump();</span>
<span class="line">  }</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h2 id="setting-up-the-problem-a-typical-class-in-stormm" tabindex="-1"><a class="header-anchor" href="#setting-up-the-problem-a-typical-class-in-stormm"><span>Setting up the Problem: A Typical Class in STORMM</span></a></h2><p>We can prepare for the simulation by collecting all of the variables into a single C++ class: the number of particles, step size, number of steps in the simulation, and coordinates along the Cartesian <em>x</em> and <em>y</em> axes. The basic form of the class would then be:</p><div class="language-text line-numbers-mode" data-highlighter="prismjs" data-ext="text" data-title="text"><pre><code><span class="line">#include &quot;/stormm/home/src/Accelerator/gpu_details.h&quot;</span>
<span class="line">#include &quot;/stormm/home/src/Accelerator/hybrid.h&quot;</span>
<span class="line">#include &quot;/stormm/home/src/DataTypes/common_types.h&quot;</span>
<span class="line">#include &quot;/stormm/home/src/Random/random_enumerators.h&quot;</span>
<span class="line"></span>
<span class="line">using stormm::card::GpuDetails;</span>
<span class="line">using stormm::card::Hybrid;</span>
<span class="line">using stormm::data_types::llint;</span>
<span class="line">using stormm::data_types::ullint2;</span>
<span class="line"></span>
<span class="line">class RandomWalk {</span>
<span class="line">public:</span>
<span class="line">  RandomWalk(int coordinate_count_in, int bits_in = 24, int prng_seed_in = 1083674,</span>
<span class="line">             double fluctuation_in = 1.0,</span>
<span class="line">             RandomNumberKind fluctuation_style_in = RandomNumberKind::GAUSSIAN,</span>
<span class="line">             const GpuDetails &amp;gpu = null_gpu);</span>
<span class="line"></span>
<span class="line">private:</span>
<span class="line">  int coordinate_count;  // Number of particles</span>
<span class="line">  int bits;              // Bit count for fixed-precision representations</span>
<span class="line">  double fp_scale;       // Two to the power of bits</span>
<span class="line">  double fp_inv_scale;   // Two to the inverse power of bits</span>
<span class="line">  int prng_seed;         // Random number seed (all particles&#39; generators will jump</span>
<span class="line">                         //   from this)</span>
<span class="line">  double fluctuation;    // Step size</span>
<span class="line"></span>
<span class="line">  // Take steps based on a uniform random distribution or a normal distribution?</span>
<span class="line">  RandomNumberKind fluctuation_style;</span>
<span class="line"></span>
<span class="line">  // The coordinate vectors</span>
<span class="line">  Hybrid&lt;llint&gt; x_coordinates;</span>
<span class="line">  Hybrid&lt;llint&gt; y_coordinates;</span>
<span class="line">  Hybrid&lt;llint&gt; storage;</span>
<span class="line"></span>
<span class="line">  // Random number state vectors for each particle</span>
<span class="line">  Hybrid&lt;ullint2&gt; rng_states;</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>In the code above, the coordinates member variables are followed by a <code>storage</code> array. This is to demonstrate a trick that many STORMM classes make use of, based on a unique feature of the <code>Hybrid</code> class. The pointer/array duality present in C is formalized in STORMM&#39;s dynamic memory management, as each <code>Hybrid</code> class object may be constructed as a <code>HybridKind::POINTER</code> or <code>HybridKind::ARRAY</code> based on STORMM&#39;s <code>enum class HybridKind</code>. A <code>POINTER</code> type Hybrid does not allocate its own data: instead, it targets its own pointers to data on the CPU host and GPU device held by a different <code>Hybrid</code> object of the <code>ARRAY</code> type. This can be useful when there are many array variables of the same data type, in particular if each array is relatively small. The <code>POINTER</code> type <code>Hybrid</code> arrays function just like <code>ARRAY</code> type objects, enforcing their stated length limits (a <code>POINTER</code> cannot be assigned to say that it has more memory than the underlying <code>ARRAY</code> it points to, and for developers who want to ensure that a <code>POINTER</code> type <code>Hybrid</code> remains valid each <code>Hybrid</code> records the number of times it has been allocated and can therefore be checked against the number of allocations when a <code>POINTER</code> type <code>Hybrid</code> was first assigned. There is also a <code>Ledger</code> class, recording all <code>Hybrid</code> allocations, which can be useful for memory tracking. The code to set the <code>POINTER</code> type <code>x_coordinates</code> and <code>y_coordinates</code> to the <code>ARRAY</code> type <code>storage</code> is:</p><div class="language-text line-numbers-mode" data-highlighter="prismjs" data-ext="text" data-title="text"><pre><code><span class="line">  const int padded_count = roundUp(coordinate_count, warp_size_int);</span>
<span class="line">  storage.resize(2 * padded_count);</span>
<span class="line">  x_coordinates.setPointer(&amp;storage, 0, coordinate_count);</span>
<span class="line">  y_coordinates.setPointer(&amp;storage, padded_count, coordinate_count);</span>
<span class="line">  rng_states.resize(coordinate_count);</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>We will give the class <code>public</code> member functions to access each of the member variables, those for coordinates calling the respective <code>readHost</code> member functions of the <code>Hybrid</code> arrays. For example:</p><div class="language-text line-numbers-mode" data-highlighter="prismjs" data-ext="text" data-title="text"><pre><code><span class="line">#include &quot;/stormm/home/src/Accelerator/gpu_enumerators.h&quot;</span>
<span class="line">#include &quot;../../src/DataTypes/stormm_vector_types.h&quot;</span>
<span class="line">#include &quot;/stormm/home/src/Reporting/error_format.h&quot;</span>
<span class="line"></span>
<span class="line">using stormm::card::HybridTargetLevel;</span>
<span class="line">#ifndef STORMM_USE_HPC</span>
<span class="line">using stormm::data_types::double2;</span>
<span class="line">#endif</span>
<span class="line">using stormm::errors::rtErr;</span>
<span class="line"></span>
<span class="line">//-------------------------------------------------------------------------------------------------</span>
<span class="line">int RandomWalk::getCoordinateCount() const {</span>
<span class="line">  return coordinate_count;</span>
<span class="line">}</span>
<span class="line"></span>
<span class="line">//-------------------------------------------------------------------------------------------------</span>
<span class="line">double2 RandomWalk::getCoordinate(const int index, const HybridTargetLevel tier) const {</span>
<span class="line">  if (index &lt; 0 || index &gt;= coordinate_count) {</span>
<span class="line">    rtErr(&quot;Index &quot; + std::to_string(index) + &quot; is invalid for a series of &quot; +</span>
<span class="line">          std::to_string(coordinate_count) + &quot; points.&quot;, &quot;RandomWalk&quot;, &quot;getCoordinate&quot;);</span>
<span class="line">  }</span>
<span class="line">  const size_t index_zu = index;</span>
<span class="line">  switch (tier) {</span>
<span class="line">  case HybridTargetLevel::HOST:</span>
<span class="line">    return { static_cast&lt;double&gt;(x_coordinates.readHost(index_zu)) * fp_inv_scale,</span>
<span class="line">             static_cast&lt;double&gt;(y_coordinates.readHost(index_zu)) * fp_inv_scale };</span>
<span class="line">#ifdef STORMM_USE_HPC</span>
<span class="line">  case HybridTargetLevel::DEVICE:</span>
<span class="line">    return { static_cast&lt;double&gt;(x_coordinates.readDevice(index_zu)) * fp_inv_scale,</span>
<span class="line">             static_cast&lt;double&gt;(y_coordinates.readDevice(index_zu)) * fp_inv_scale };</span>
<span class="line">#endif</span>
<span class="line">  }</span>
<span class="line">  __builtin_unreachable();</span>
<span class="line">}</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>The definition of the two-tuple of <code>double</code> values, <code>double2</code>, comes as part of the CUDA package (and also with AMD&#39;s HIP). It is only needed if compiling in CPU-only mode, in which case STORMM&#39;s private definition of the tuple is brought to bear. The closing call to <code>__builtin_unreachable()</code> suppresses compiler warnings about a function seeming to reach its end without returning a value.</p><p>Aside from the typical accoutrements of a C++ class, in STORMM most classes emit &quot;abstracts&quot; to permit direct access to their underlying array members, bypassing the C++ getter/setter paradigm to work in the style of classic C. The abstracts can be taken at the level of the CPU host or the GPU device. A fundamental question is whether the abstract should permit the developer to change the underlying data without going through the class&#39;s accessor functions, and there are limits even when bypassing C++ safeguards. In many cases, critical elements of the underlying class object such as array lengths are qualified with <code>const</code>, even when the array contents are exposed. Most classes also emit &quot;reader&quot; and &quot;writer&quot; abstracts based on whether the class object itself is <code>const</code>-qualified. In keeping with the convention that <code>struct</code> variables do not have member functions other than constructors, copy and movement methods, and (perhaps implicit) destructors, the simplified forms of the abstracts for <code>RandomWalk</code> might be:</p><div class="language-text line-numbers-mode" data-highlighter="prismjs" data-ext="text" data-title="text"><pre><code><span class="line">struct RandomWalkWriter {</span>
<span class="line">  RandomWalkWriter(int ncoord_in, int bits_in, double fluctuation_in, RandomNumberKind style_in,</span>
<span class="line">                   llint* xcrd_in, llint* ycrd_in, ullint2* rng_stt_in);</span>
<span class="line"></span>
<span class="line">  const int ncoord;              // The number of (particle) coordinates</span>
<span class="line">  const int bits;                // Number of bits after the point in fixed-precision</span>
<span class="line">  const double fluctuation;      // Size of fluctuations to add with each random walk step.</span>
<span class="line">  const RandomNumberKind style;  // The type of random walk steps, uniform or Gaussian</span>
<span class="line">  llint* xcrd;                   // Cartesian X coordinates of all particles</span>
<span class="line">  llint* ycrd;                   // Cartesian Y coordinates of all particles</span>
<span class="line">  ullint2* rng_stt;              // Random number state vectors driving each particle</span>
<span class="line">};</span>
<span class="line"></span>
<span class="line">struct RandomWalkReader {</span>
<span class="line">  RandomWalkWriter(int ncoord_in, int bits_in, double fluctuation_in, RandomNumberKind style_in,</span>
<span class="line">                   llint* xcrd_in, llint* ycrd_in, ullint2* rng_stt_in);</span>
<span class="line"></span>
<span class="line">  const int ncoord;              // The number of (particle) coordinates</span>
<span class="line">  const int bits;                // Number of bits after the point in fixed-precision</span>
<span class="line">  const double fluctuation;      // Size of fluctuations to add with each random walk step.</span>
<span class="line">  const RandomNumberKind style;  // The type of random walk steps, uniform or Gaussian</span>
<span class="line">  const llint* xcrd;             // Cartesian X coordinates of all particles</span>
<span class="line">  const llint* ycrd;             // Cartesian Y coordinates of all particles</span>
<span class="line">  const ullint2* rng_stt;        // Random number state vectors driving each particle</span>
<span class="line">};</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>The struct constructors themselves are not displayed, but can be found in the tutorial&#39;s class implementation, <strong>/stormm/home/apps/Tutorial/randomwalk.cpp</strong>. Additions to the <code>RandomWalk</code> class for emitting these abstracts can be as follows:</p><div class="language-text line-numbers-mode" data-highlighter="prismjs" data-ext="text" data-title="text"><pre><code><span class="line">RandomWalkWriter RandomWalk::data(const HybridTargetLevel tier) {</span>
<span class="line">  return RandomWalkWriter(coordinate_count, bits, fluctuation, fluctuation_style,</span>
<span class="line">                          x_coordinates.data(tier), y_coordinates.data(tier),</span>
<span class="line">                          rng_states.data(tier));</span>
<span class="line">}</span>
<span class="line"></span>
<span class="line">const RandomWalkReader RandomWalk::data(const HybridTargetLevel tier) const {</span>
<span class="line">  return RandomWalkReader(coordinate_count, bits, fluctuation, fluctuation_style,</span>
<span class="line">                          x_coordinates.data(tier), y_coordinates.data(tier),</span>
<span class="line">                          rng_states.data(tier));</span>
<span class="line">}</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>As will be seen, the primary purpose of the abstracts is not to do away with the tedious aspects of C++, but to shed the parts of a C++ class that a CUDA kernel cannot incorporate. With the basic class mechanics and abstracts laid down, the core functionality of the <code>RandomWalk</code> class must be encapsulated in the constructor and a public member function to drive the simulation forward. The minimal constructor will call a <code>private</code> member function <code>allocate</code> to perform the <code>Hybrid</code> allocations described above, then seed the random number generator state vectors on the CPU or, if applicable, on the GPU. Note that the code paths differ based on whether the GPU mode is compiled, and that the GPU kernel launcher <code>initXoroshiro128p</code> will download the results from the GPU so that the CPU and GPU both have the same state vectors when the function returns. Because <code>Hybrid</code> object data is initialized to zero, a single cycle of the public member function used to advance the simulation can be used to seed particle positions. If it is desired that particles initially occupy a different configuration, some new function could be written but there is no need to clutter the tutorial. Note that the CPU and GPU advancement take place in separate calls. More details can be found in the implementation documentation in <strong>/stormm/home/apps/Tutorial/randomwalk.cpp</strong>.</p><div class="language-text line-numbers-mode" data-highlighter="prismjs" data-ext="text" data-title="text"><pre><code><span class="line">RandomWalk::RandomWalk(const int coordinate_count_in, const int bits_in, const int prng_seed_in,</span>
<span class="line">                       const double fluctuation_in, const RandomNumberKind fluctuation_style_in,</span>
<span class="line">                       const GpuDetails &amp;gpu) :</span>
<span class="line">    coordinate_count{coordinate_count_in}, bits{bits_in},</span>
<span class="line">    fp_scale{pow(2.0, bits_in)},</span>
<span class="line">    fp_inv_scale{pow(2.0, -bits_in)},</span>
<span class="line">    prng_seed{prng_seed_in}, fluctuation{fluctuation_in},</span>
<span class="line">    fluctuation_style{fluctuation_style_in},</span>
<span class="line">    x_coordinates{HybridKind::POINTER, &quot;x_coord&quot;},</span>
<span class="line">    y_coordinates{HybridKind::POINTER, &quot;y_coord&quot;},</span>
<span class="line">    storage{HybridKind::ARRAY, &quot;coord_storage&quot;},</span>
<span class="line">    rng_states{HybridKind::ARRAY, &quot;rng_state_vectors&quot;}</span>
<span class="line">{</span>
<span class="line">  allocate(gpu);</span>
<span class="line">#ifdef STORMM_USE_HPC</span>
<span class="line">  initXoroshiro128pArray(&amp;rng_states, prng_seed, 10, gpu);</span>
<span class="line">#else</span>
<span class="line">  Xoroshiro128pGenerator xrs(prng_seed, 10);</span>
<span class="line">  for (int i = 0; i &lt; coordinate_count; i++) {</span>
<span class="line">    rng_states.putHost(xrs.revealState(), i);</span>
<span class="line">    xrs.jump();</span>
<span class="line">  }</span>
<span class="line">#endif</span>
<span class="line">  advance();</span>
<span class="line">#ifdef STORMM_USE_HPC</span>
<span class="line">  advance(1, HybridTargetLevel::DEVICE, gpu);</span>
<span class="line">#endif</span>
<span class="line">}</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>The CPU form of the <code>advance</code> function makes clear what the GPU function will need to do: loop over all particles, read the particle&#39;s random number generator state, and then produce random numbers to move the particle along in the two-dimensional plane for the requested number of steps. There are no interactions between the particles. (Apologies if decoupling the <em>x</em> and <em>y</em> dimensions, rather than using a polar coordinate system based on the stated step size, is incorrect from a theoretical perspective--the purpose is not a formal investigation of random walk diffusion but to present C++ and CUDA mechanics.) We create a temporary <code>Xoroshiro128pGenerator</code> and use its <code>setState</code> method to instantly place it on trajectory with a given particle&#39;s pseudo-random stream. The state vectors in <code>rng_states</code> are what matters: the <code>Xoroshiro128pGenerator</code> class object is just there to provide its methods for creating new random numbers and making the state vector tick forward. After the requested number of steps, we will extract the modified state vector from the temporary generator and place it back in storage within <code>rng_states</code>.</p><div class="language-text line-numbers-mode" data-highlighter="prismjs" data-ext="text" data-title="text"><pre><code><span class="line">void RandomWalk::advance(const int step_count, const HybridTargetLevel tier,</span>
<span class="line">                         const GpuDetails &amp;gpu) {</span>
<span class="line">  switch (tier) {</span>
<span class="line">  case HybridTargetLevel::HOST:</span>
<span class="line">    {</span>
<span class="line">      Xoroshiro128pGenerator xrs(10229384, 0);</span>
<span class="line">      for (int i = 0; i &lt; coordinate_count; i++) {</span>
<span class="line">        xrs.setState(rng_states.readHost(i));</span>
<span class="line">        for (int j = 0; j &lt; step_count; j++) {</span>
<span class="line">          const llint ix_crd = x_coordinates.readHost(i);</span>
<span class="line">          const llint iy_crd = y_coordinates.readHost(i);</span>
<span class="line">          switch (fluctuation_style) {</span>
<span class="line">          case RandomNumberKind::GAUSSIAN:</span>
<span class="line">            {</span>
<span class="line">              const llint ix_bump = llround(xrs.gaussianRandomNumber() * fluctuation * fp_scale);</span>
<span class="line">              const llint iy_bump = llround(xrs.gaussianRandomNumber() * fluctuation * fp_scale);</span>
<span class="line">              x_coordinates.putHost(ix_crd + ix_bump, i);</span>
<span class="line">              y_coordinates.putHost(iy_crd + iy_bump, i);</span>
<span class="line">            }</span>
<span class="line">            break;</span>
<span class="line">          case RandomNumberKind::UNIFORM:</span>
<span class="line">            {</span>
<span class="line">              const llint ix_bump = llround((0.5 - xrs.uniformRandomNumber()) * fluctuation *</span>
<span class="line">                                            fp_scale);</span>
<span class="line">              const llint iy_bump = llround((0.5 - xrs.uniformRandomNumber()) * fluctuation *</span>
<span class="line">                                            fp_scale);</span>
<span class="line">              x_coordinates.putHost(ix_crd + ix_bump, i);</span>
<span class="line">              y_coordinates.putHost(iy_crd + iy_bump, i);</span>
<span class="line">            }</span>
<span class="line">            break;</span>
<span class="line">          }</span>
<span class="line">        }</span>
<span class="line">        rng_states.putHost(xrs.revealState(), i);</span>
<span class="line">      }</span>
<span class="line">    }</span>
<span class="line">    break;</span>
<span class="line">#ifdef STORMM_USE_HPC</span>
<span class="line">  case HybridTargetLevel::DEVICE:</span>
<span class="line">    {</span>
<span class="line">      RandomWalkWriter rww = this-&gt;data(HybridTargetLevel::DEVICE);</span>
<span class="line">      launchRandomWalkAdvance(step_count, &amp;rww, gpu);</span>
<span class="line">    }</span>
<span class="line">    break;</span>
<span class="line">#endif</span>
<span class="line">  }</span>
<span class="line">}</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>One important aspect of the coordinate storage, noted in the introduction and made clear by the <code>advance</code> function, is fixed-precision. In this example, we multiply the real-valued number by some power of two, losing no information as the fraction (mantissa) of the floating point format does not change. The result is then converted to an integer (which may lose information) and stored. In our experience, storing not just force accumulations but also particle positions in fixed-precision helps to stamp out instabilities between different architectures, by taking a more aggressive rounding at critical junctures, rather than letting minor differences propagate over time. The level of rounding is an explicit choice of the developer, and in general can be selected so as not to risk the validity of the simulation in any degree.</p><h2 id="attaching-the-equivalent-gpu-code" tabindex="-1"><a class="header-anchor" href="#attaching-the-equivalent-gpu-code"><span>Attaching the Equivalent GPU Code</span></a></h2><p>As seen above, a mutable abstract is called by the class itself to feed into an <code>extern void</code> free function, <code>launchRandomWalkAdvance</code>. The essential contents of that function and the kernel it launches are presented below.</p><div class="language-text line-numbers-mode" data-highlighter="prismjs" data-ext="text" data-title="text"><pre><code><span class="line">#include &quot;/stormm/home/src/Accelerator/gpu_details.h&quot;</span>
<span class="line">#include &quot;/stormm/home/src/DataTypes/common_types.h&quot;</span>
<span class="line">#include &quot;/stormm/home/src/DataTypes/stormm_vector_types.h&quot;</span>
<span class="line">#include &quot;/stormm/home/src/Random/random.h&quot;</span>
<span class="line">#include &quot;randomwalk.h&quot;</span>
<span class="line"></span>
<span class="line">using stormm::card::GpuDetails;</span>
<span class="line">using stormm::constants::large_block_size;</span>
<span class="line">using stormm::data_types::llint;</span>
<span class="line">using stormm::data_types::ullint;</span>
<span class="line">using stormm::data_types::ullint2;</span>
<span class="line">using stormm::data_types::ullint4;</span>
<span class="line">using stormm::random::xrs128p_jump_i;</span>
<span class="line">using stormm::random::xrs128p_jump_ii;</span>
<span class="line">using stormm::random::xrs256pp_jump_i;</span>
<span class="line">using stormm::random::xrs256pp_jump_ii;</span>
<span class="line">using stormm::random::xrs256pp_jump_iii;</span>
<span class="line">using stormm::random::xrs256pp_jump_iv;</span>
<span class="line">using stormm::random::rng_unit_bin_offset;</span>
<span class="line">using stormm::random::rng_unit_bin_offset_f;</span>
<span class="line"></span>
<span class="line">#include &quot;/stormm/home/src/Random/xor_shift_rng.cui&quot;</span>
<span class="line"></span>
<span class="line">__global__ void __launch_bounds__(large_block_size, 1)</span>
<span class="line">kRandomWalkAdvance(const int step_count, RandomWalkWriter rww) {</span>
<span class="line">  const int thread_stride = blockDim.x * gridDim.x;</span>
<span class="line">  const double fp_scale = pow(2.0, rww.bits);</span>
<span class="line">  for (int i = threadIdx.x + (blockIdx.x * blockDim.x); i &lt; rww.ncoord; i += thread_stride) {</span>
<span class="line">    ullint2 stti = rww.rng_stt[i];</span>
<span class="line">    switch (rww.style) {</span>
<span class="line">    case RandomNumberKind::GAUSSIAN:</span>
<span class="line">      for (int j = 0; j &lt; step_count; j++) {</span>
<span class="line">        const llint ix_bump = __double2ll_rn(xoroshiro128p_normal(&amp;stti) * rww.fluctuation *</span>
<span class="line">                                             fp_scale);</span>
<span class="line">        const llint iy_bump = __double2ll_rn(xoroshiro128p_normal(&amp;stti) * rww.fluctuation *</span>
<span class="line">                                             fp_scale);</span>
<span class="line">        rww.xcrd[i] += ix_bump;</span>
<span class="line">        rww.ycrd[i] += iy_bump;</span>
<span class="line">      }</span>
<span class="line">      break;</span>
<span class="line">    case RandomNumberKind::UNIFORM:</span>
<span class="line">      for (int j = 0; j &lt; step_count; j++) {</span>
<span class="line">        const llint ix_bump = __double2ll_rn((0.5 - xoroshiro128p_uniform(&amp;stti)) *</span>
<span class="line">                                             rww.fluctuation * fp_scale);</span>
<span class="line">        const llint iy_bump = __double2ll_rn((0.5 - xoroshiro128p_uniform(&amp;stti)) *</span>
<span class="line">                                             rww.fluctuation * fp_scale);</span>
<span class="line">        rww.xcrd[i] += ix_bump;</span>
<span class="line">        rww.ycrd[i] += iy_bump;</span>
<span class="line">      }</span>
<span class="line">      break;</span>
<span class="line">    }</span>
<span class="line">    rww.rng_stt[i] = stti;</span>
<span class="line">  }</span>
<span class="line">}</span>
<span class="line"></span>
<span class="line">extern void launchRandomWalkAdvance(const int step_count, RandomWalkWriter *rww,</span>
<span class="line">                                    const GpuDetails &amp;gpu) {</span>
<span class="line">  kRandomWalkAdvance&lt;&lt;&lt;gpu.getSMPCount(), large_block_size&gt;&gt;&gt;(step_count, *rww);</span>
<span class="line">}</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>Notice how a loop over particles in the C++ code is delegated across the launch grid (all threads of all blocks) in the GPU kernel. This is a standard approach. The design also has some hidden strengths: the concept of extracting the random number generator state vector and holding it in registers throughout the entire set of simulated steps avoids what would otherwise be a lot of memory traffic (although it would mitigated to a great extent, in this case, by L1 cache). For even better memory bandwidth conservation, the position of the particle itself could be taken into registers (made into a local variable) and manipulated through the requested number of steps before the final result is written back to the arrays in main GPU memory. A minor detail: the intrinsic function <code>__double2ll_rn</code> (round nearest) matches the result of <code>llround</code> (round <code>double</code> to <code>long long int</code>) in CPU code. If, instead, the double-precision real were recast to an integer in the C++ code, this would be rounding towards zero and <code>__double2ll_rz</code> would be appropriate.</p><h2 id="tying-it-all-together-the-main-program" tabindex="-1"><a class="header-anchor" href="#tying-it-all-together-the-main-program"><span>Tying It All Together: The Main Program</span></a></h2><p>In order to complete the program, we will need to add a basic user interface, for which we use the standard C <code>argc</code> and <code>argv[]</code> command line input variables. An abridged version follows. STORMM comes with substantial support for developers to create their own control blocks and check input for validity, as will be demonstrated in a later tutorial. For the complete code, see <strong>/stormm/home/apps/Tutorial/tutorial_ii.cpp</strong>.</p><div class="language-text line-numbers-mode" data-highlighter="prismjs" data-ext="text" data-title="text"><pre><code><span class="line">int main(int argc, const char* argv[]) {</span>
<span class="line">  if (argc &lt; 3) {</span>
<span class="line">    printf(&quot;Usage: %s\\n&quot;</span>
<span class="line">           &quot;       [ -n number of particles ] [ -f fluctuation ] [ -s step kind ]\\n&quot;,</span>
<span class="line">           argv[0]);</span>
<span class="line">    printf(&quot;  -n : Select the number of particles to simulate (default 50)\\n&quot;);</span>
<span class="line">    printf(&quot;  -f : Indicate the step size (unitless, default 1.0)\\n&quot;);</span>
<span class="line">    printf(&quot;  -s : Indicate whether steps should involve UNIFORM or GAUSSIAN random numbers\\n&quot;);</span>
<span class="line">    printf(&quot;       (default GAUSSIAN)\\n&quot;);</span>
<span class="line">    printf(&quot;  -x : The number of steps to simulate (default 100)\\n&quot;);</span>
<span class="line">    exit(0);</span>
<span class="line">  }</span>
<span class="line">  int particle_count = 50;</span>
<span class="line">  double step_size = 1.0;</span>
<span class="line">  for (int i = 1; i &lt; argc - 1; i++) {</span>
<span class="line">    if (strcmpCased(argv[i], &quot;-n&quot;, CaseSensitivity::NO)) {</span>
<span class="line">      if (verifyContents(argv[i + 1], NumberFormat::INTEGER)) {</span>
<span class="line">        particle_count = atoi(argv[i + 1]);</span>
<span class="line">      }</span>
<span class="line">      else {</span>
<span class="line">        rtErr(&quot;Unrecognized integer &quot; + std::string(argv[i + 1]) + &quot; for the particle count\\n&quot;);</span>
<span class="line">      }</span>
<span class="line">      i++;</span>
<span class="line">    }</span>
<span class="line">    else if (strcmpCased(argv[i], &quot;-f&quot;, CaseSensitivity::NO)) {</span>
<span class="line">      if (verifyContents(argv[i + 1], NumberFormat::STANDARD_REAL) ||</span>
<span class="line">          verifyContents(argv[i + 1], NumberFormat::SCIENTIFIC)) {</span>
<span class="line">        step_size = atof(argv[i + 1]);</span>
<span class="line">      }</span>
<span class="line">      else {</span>
<span class="line">        rtErr(&quot;Unrecognized real value &quot; + std::string(argv[i + 1]) + &quot; for the particle count\\n&quot;);</span>
<span class="line">      }</span>
<span class="line">      i++;</span>
<span class="line">    }</span>
<span class="line">  }</span>
<span class="line">}</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>The <code>main</code> function will then take the user input to construct a class object of <code>RandomWalk</code> and drive it forward by the requested number of steps. In the tutorial program, the <code>getCoordinates</code> method of <code>RandomWalk</code> is used to print results to the terminal.</p><div class="language-text line-numbers-mode" data-highlighter="prismjs" data-ext="text" data-title="text"><pre><code><span class="line">#include &quot;/stormm/home/apps/Tutorial/randomwalk.h&quot;</span>
<span class="line"></span>
<span class="line">using namespace tutorial;</span>
<span class="line"></span>
<span class="line">  RandomWalk rw(particle_count, 24, 1083674, step_size, step_style, gpu);</span>
<span class="line">  rw.advance(step_count, HybridTargetLevel::HOST);</span>
<span class="line">#ifdef STORMM_USE_HPC</span>
<span class="line">  rw.advance(step_count, HybridTargetLevel::DEVICE, gpu);</span>
<span class="line">#endif</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h2 id="making-it-compile" tabindex="-1"><a class="header-anchor" href="#making-it-compile"><span>Making It Compile</span></a></h2><p>In order for the new tutorial program to compile along with the STORMM build, we have added some content to the <strong>/stormm/home/apps/Tutorial/CMakeLists.txt</strong> file. The critical components are:</p><ul><li>Reset the <code>APP_NAME</code> variable to that of the new tutorial program</li><li>Use the <code>add_executable</code> CMake command, with <code>APP_NAME</code> and a list of all code implementation and header files as arguments</li><li>Add the main program&#39;s implementation to the <code>target_sources</code></li><li>Link the application to the broader STORMM project</li><li>Install The relevant code for this case is:</li></ul><div class="language-text line-numbers-mode" data-highlighter="prismjs" data-ext="text" data-title="text"><pre><code><span class="line">set(APP_NAME &quot;tutorial_ii.\${STORMM_APP_SUFFIX}&quot;)</span>
<span class="line"></span>
<span class="line">add_executable(\${APP_NAME}</span>
<span class="line">        \${CMAKE_CURRENT_SOURCE_DIR}/tutorial_ii.cpp</span>
<span class="line">        \${CMAKE_CURRENT_SOURCE_DIR}/randomwalk.cpp</span>
<span class="line">        \${CMAKE_CURRENT_SOURCE_DIR}/randomwalk.h</span>
<span class="line">        \${CMAKE_CURRENT_SOURCE_DIR}/hpc_randomwalk.cu</span>
<span class="line">        \${CMAKE_CURRENT_SOURCE_DIR}/hpc_randomwalk.h)</span>
<span class="line"></span>
<span class="line">target_sources(\${APP_NAME} PRIVATE \${CMAKE_CURRENT_SOURCE_DIR}/tutorial_ii.cpp)</span>
<span class="line"></span>
<span class="line">target_link_libraries(\${APP_NAME} \${PROJECT_NAME})</span>
<span class="line"></span>
<span class="line">install(TARGETS \${APP_NAME}</span>
<span class="line">        RUNTIME DESTINATION \${CMAKE_INSTALL_BINDIR})</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h2 id="modeling-diffusion-in-the-plane" tabindex="-1"><a class="header-anchor" href="#modeling-diffusion-in-the-plane"><span>Modeling Diffusion in the Plane</span></a></h2><p>Did we succeed? Does the CPU predict and track the GPU for a simulation? Here are the results for 14592 particles simulated over 10000 steps (the number of particles was chosen large enough that multiple GPU thread blocks would be sure to participate):</p><div class="language-text line-numbers-mode" data-highlighter="prismjs" data-ext="text" data-title="text"><pre><code><span class="line">&gt;&gt; /stormm/home/apps/Tutorial/tutorial_ii.stormm.cuda -n 14592 -x 10000 -r 8</span>
<span class="line"></span>
<span class="line">Initial coordinates for selected particles:</span>
<span class="line">                      X (host)    Y (host)    X (device)  Y (device)</span>
<span class="line">  Particle      0 :      0.4620     -0.4254       0.4620     -0.4254</span>
<span class="line">  Particle   1824 :     -0.9893     -1.0739      -0.9893     -1.0739</span>
<span class="line">  Particle   3648 :      0.9163      0.3468       0.9163      0.3468</span>
<span class="line">  Particle   5472 :      0.1537     -0.3371       0.1537     -0.3371</span>
<span class="line">  Particle   7296 :      2.1082     -1.0995       2.1082     -1.0995</span>
<span class="line">  Particle   9120 :      0.0275     -0.7435       0.0275     -0.7435</span>
<span class="line">  Particle  10944 :     -0.0590      0.0879      -0.0590      0.0879</span>
<span class="line">  Particle  12768 :      0.8372     -0.8285       0.8372     -0.8285</span>
<span class="line"></span>
<span class="line">Final coordinates for selected particles:</span>
<span class="line">                      X (host)    Y (host)    X (device)  Y (device)</span>
<span class="line">  Particle      0 :     -3.7949    111.3093      -3.7949    111.3093</span>
<span class="line">  Particle   1824 :    -89.8540    -94.4231     -89.8540    -94.4231</span>
<span class="line">  Particle   3648 :    -65.3863    -91.7531     -65.3863    -91.7531</span>
<span class="line">  Particle   5472 :     55.1165    164.5935      55.1165    164.5935</span>
<span class="line">  Particle   7296 :    -61.0970    -53.3054     -61.0970    -53.3054</span>
<span class="line">  Particle   9120 :     94.0278    -67.4425      94.0278    -67.4425</span>
<span class="line">  Particle  10944 :    186.5278    -48.3775     186.5278    -48.3775</span>
<span class="line">  Particle  12768 :   -177.0526     76.6744    -177.0526     76.6744</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>The results continue to track between CPU and GPU programs for a million or even ten million steps.</p>`,41),t=[l];function r(d,o){return s(),e("div",null,t)}const p=n(a,[["render",r],["__file","tutorial_ii.html.vue"]]),u=JSON.parse('{"path":"/tutorials/tutorial_ii.html","title":"A Random Walk Simulator in STORMM","lang":"en-US","frontmatter":{},"headers":[{"level":2,"title":"Random Number Generation in STORMM","slug":"random-number-generation-in-stormm","link":"#random-number-generation-in-stormm","children":[]},{"level":2,"title":"Setting up the Problem: A Typical Class in STORMM","slug":"setting-up-the-problem-a-typical-class-in-stormm","link":"#setting-up-the-problem-a-typical-class-in-stormm","children":[]},{"level":2,"title":"Attaching the Equivalent GPU Code","slug":"attaching-the-equivalent-gpu-code","link":"#attaching-the-equivalent-gpu-code","children":[]},{"level":2,"title":"Tying It All Together: The Main Program","slug":"tying-it-all-together-the-main-program","link":"#tying-it-all-together-the-main-program","children":[]},{"level":2,"title":"Making It Compile","slug":"making-it-compile","link":"#making-it-compile","children":[]},{"level":2,"title":"Modeling Diffusion in the Plane","slug":"modeling-diffusion-in-the-plane","link":"#modeling-diffusion-in-the-plane","children":[]}],"git":{"updatedTime":1749824825000},"filePathRelative":"tutorials/tutorial_ii.md"}');export{p as comp,u as data};
