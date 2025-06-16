#!/bin/bash

if [ ! ${STORMM_BUILD} ] || [ ! ${STORMM_SOURCE} ] ; then
  echo "Set the ${STORMM_BUILD} and ${STORMM_SOURCE} environment variables " \
       "to run this script."
  echo "  STORMM_BUILD: the build directory where STORMM is installed"
  echo "  STORMM_SOURCE: source directory where the code base is located"
  exit
fi

# Create the
echo "&files" > conf_tutorial.in
for DRUG in drug_example_iso symmetry_C2 symmetry_C5 med_1 med_4 ; do
  echo "  -sys { -p ${STORMM_SOURCE}/test/Topology/${DRUG}.top" >> conf_tutorial.in
  echo "         -c ${STORMM_SOURCE}/test/Trajectory/${DRUG}.inpcrd" >> conf_tutorial.in
  echo "         -label ${DRUG} -x conf_${DRUG}.sdf x_kind sdf }" >> conf_tutorial.in
done
echo "&end" >> conf_tutorial.in

cat >> conf_tutorial.in << EOF

&conformer
  rotation_sample_count 3,
  trial_limit 100, local_trial_limit 30, final_states 6,
  effort LIGHT
&end

&solvent
  igb 8,
&end

&minimize
  ncyc 100, cdcyc 50, maxcyc 500, ntpr = 50,
  clash_vdw_ratio 0.65,
&end

&random
  igseed 9183025
&end                                                                                               

&report
  sdf_item { -title total_energy    -label ALL -energy TOTAL_ENERGY }
  sdf_item { -title dihedral_energy -label ALL -energy PROPER_DIHEDRAL }
  sdf_item { -title elec_energy     -label ALL -energy ELECTROSTATIC_NONBONDED }
  sdf_item { -title elec_14_energy  -label ALL -energy ELECTROSTATIC_NEAR }
  report_width 99
  syntax matlab                                                                                   
&end
EOF

if [ -e ${STORMM_BUILD}/apps/Conf/conformer.stormm.cuda ] ; then
  ${STORMM_BUILD}/apps/Conf/conformer.stormm.cuda -O -i conf_tutorial.in
else
  ${STORMM_BUILD}/apps/Conf/conformer.stormm -O -i conf_tutorial.in
fi
