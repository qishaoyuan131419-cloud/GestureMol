"""GestureMol Step 2: verify Python control of an open PyMOL session."""

from pymol import cmd


def gesturemol_step2_test() -> None:
    """Create a visible test object and rotate it with the official API."""
    cmd.delete("gesturemol_step2")
    cmd.pseudoatom("gesturemol_step2", pos=[-4.0, 0.0, 0.0], color="red")
    cmd.pseudoatom("gesturemol_step2", pos=[4.0, 0.0, 0.0], color="cyan")
    cmd.bond("gesturemol_step2`1", "gesturemol_step2`2")
    cmd.show("spheres", "gesturemol_step2")
    cmd.show("sticks", "gesturemol_step2")
    cmd.zoom("gesturemol_step2", buffer=3.0)
    cmd.rotate("y", 45.0, "gesturemol_step2", camera=0)
    cmd.refresh()
    print("GestureMol Step 2 PASS: cmd.rotate() controlled PyMOL.")


gesturemol_step2_test()
