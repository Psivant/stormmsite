# The Molecular Mechanics Workbench: Creating and Unpacking STORMM's Topologies and Coordinates
Memory management, class conventions, and input mechanisms are essential preconditions for a
programming environment that supports GPU programming, but the purpose of STORMM is to collect
many molecular systems into a single program instance and have them communicate where helpful or
subdivide into some common denominator of work units to stack problems together when the goal is
to optimize GPU utilization.  First, we will need a toopology class, which in STORMM is the
`AtomGraph`.  Second, we require a means for storing structures, and also perhaps atomic velocities
and force accumulators, and for that STORMM has several options.
[Topologies and coordinates collate into syntheses](../dev-philosophy#syntheses-not-just-arrays-of-topologies-or-coordinate-sets),
as described elsewhere on the site.
