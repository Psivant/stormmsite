# Tutorials for STORMM Users

STORMM's general-purpose libraries contain hundreds of thousands of line of code for molecular
simulations.  Its compiled applications draw upon this common core.

## Implicit Solvent Molecular Dynamics in STORMM
STORMM can run molecular dynamics but is currently limited to implicit solvent models. (Code for
simulations with explicit solvent molecules in periodic boundary conditions is nearing completion.)

## Conformer Generation in STORMM
STORMM's conformer generator leverages its native chemical perception algorithms to detect
rotatable bonds, design a sampling protocol to explore the accessible geometric space, and then
perform energy minimization *en masse* on the GPU.  The best scoring conformers that pass a mutual
RMSD filter are reported.
