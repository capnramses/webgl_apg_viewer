#WebGL .apg Mesh Viewer
An online parser and viewer for the .apg 3d mesh format

Downside - non-indexed lists are easier to parse but are a bigger download.
An indexed version might be worth making.

Online preview: http://antongerdelan.net/webgl_apg_viewer/

##TODO
* normal mapping in demo
* full recursive animation function
* translations and scale in animation function
* a pass at the end of the parser that informs each node what its children are
```
for all nodes
if has parent
add self to parent's children list
```
* possibly also make a list of parentless nodes, to make parent-child animation
quicker from these as starting points
