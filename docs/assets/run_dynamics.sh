#!/bin/bash

if [ ! ${STORMM_BUILD} ] || [ ! ${STORMM_SOURCE} ] ; then
  echo "Set the ${STORMM_BUILD} and ${STORMM_SOURCE} environment variables " \
       "to run this script."
  echo "  STORMM_BUILD: the build directory where STORMM is installed"
  echo "  STORMM_SOURCE: source directory where the code base is located"
  exit
fi

cat > dynamics.in << EOF
&files
  -p ${STORMM_SOURCE}/test/Namelists/topol/.*.top
  -c ${STORMM_SOURCE}/test/Namelists/coord/.*.inpcrd
  -x amino.crd
  -r amino.rst
  x_kind AMBER_CRD
  -sys { -p ${STORMM_SOURCE}/test/Topology/trpcage.top
         -c ${STORMM_SOURCE}/test/Trajectory/trpcage.inpcrd
         -x trpcage_run.crd
         -r trpcage_run.rst
         x_kind AMBER_CRD
         -label trpcage -n 4 }
  -t dynamics.xscript
  -o dynamics_tutorial_result.m
&end

&minimize
  cdcyc 50,  ncyc 100,  maxcyc 1000,
  ntpr 50,
&end

&dynamics
  nstlim = 200000,  ntpr = 250,  ntwx = 5000, dt = 1.0,
  ntt = 3,
  rigid_geom on,
  temperature = { tempi 100.0, temp0 400.0, -label all },
  temperature = { tempi 100.0, temp0 300.0, -label trpcage },
  tevo_start = 25000, tevo_end = 75000,
  tcache_depth 1,
&end

&solvent
  igb = 8,
&end

&report
  syntax = Matlab,
  energy total, state temperature,
  varname = tutr,
&end
EOF

if [ -e ${STORMM_BUILD}/apps/Dyna/dynamics.stormm.cuda ] ; then
  ${STORMM_BUILD}/apps/Dyna/dynamics.stormm.cuda -O -i dynamics.in -except WARN
elif [ -e ${STORMM_BUILD}/apps/Dyna/dynamics.stormm ] ; then
  ${STORMM_BUILD}/apps/Dyna/dynamics.stormm -O -i dynamics.in
fi
