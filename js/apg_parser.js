//
// .apg parser for WebGL
// Anton Gerdelan 22 Jun 2015
// antongerdelan.net
//

function start_loading_apg_mesh (url) {
	var vao = vao_ext.createVertexArrayOES ();
	vao.is_loaded = false;
	vao.pc = 0;
	vao.brad = 0.0;
	vao.bone_count = 0;
	vao.anim_count = 0;
	// 1 per armature
	vao.root_transform = [];
	// array of arrays (1 matrix per bone)
	vao.offset_mat = [];
	vao.anim_node_count = 0;
	// each item has property .parent (index) and .bone_id (index)
	vao.anim_nodes = [];
	vao.animations = [];

	var xmlhttp = new XMLHttpRequest();
	xmlhttp.open ("GET", url, true);
	xmlhttp.onload = function (e) {
		var attribs_data = [];
		for (var i = 0; i < 5; i++) {
			attribs_data[i] = new Object;
			attribs_data[i].data = [];
			attribs_data[i].comps = 0;
		} // endfor
		var num_attribs = 0;
	
		var str = xmlhttp.responseText;
		var lines = str.split ('\n');
		var i = 0;
		while (i < lines.length) {
			var line_tokens = lines[i].split (' ');
			if (lines[i][0] == '@') {
				switch (line_tokens[0]) {
					// count of vertices -- used for all per-vertex data sections
					case "@vert_count":
						vao.pc = parseInt (line_tokens[1]);
						break;
					// vertex positions
					case "@vp":
						num_attribs++;
						attribs_data[0].comps = parseInt (line_tokens[2]);
						for (j = 0; j < vao.pc; j++) {
							i++;
							line_tokens = lines[i].split (' ');
							for (var k = 0; k < attribs_data[0].comps; k++) {
								attribs_data[0].data.push (parseFloat (line_tokens[k]));
							} // endfor
						} // endfor
						break;
					// vertex normals
					case "@vn":
						num_attribs++;
						attribs_data[1].comps = parseInt (line_tokens[2]);
						for (j = 0; j < vao.pc; j++) {
							i++;
							line_tokens = lines[i].split (' ');
							for (var k = 0; k < attribs_data[1].comps; k++) {
								attribs_data[1].data.push (parseFloat (line_tokens[k]));
							} // endfor
						} // endfor
						break;
					// texture coordinates
					case "@vt":
						num_attribs++;
						attribs_data[2].comps = parseInt (line_tokens[2]);
						for (j = 0; j < vao.pc; j++) {
							i++;
							line_tokens = lines[i].split (' ');
							for (var k = 0; k < attribs_data[2].comps; k++) {
								attribs_data[2].data.push (parseFloat (line_tokens[k]));
							} // endfor
						} // endfor
						break;
					// tangents
					case "@vtan":
						num_attribs++;
						attribs_data[3].comps = parseInt (line_tokens[2]);
						for (j = 0; j < vao.pc; j++) {
							i++;
							line_tokens = lines[i].split (' ');
							for (var k = 0; k < attribs_data[3].comps; k++) {
								attribs_data[3].data.push (parseFloat (line_tokens[k]));
							} // endfor
						} // endfor
						break;
					case "@vb":
						num_attribs++;
						attribs_data[4].comps = parseInt (line_tokens[2]);
						for (j = 0; j < vao.pc; j++) {
							i++;
							line_tokens = lines[i].split (' ');
							for (var k = 0; k < attribs_data[4].comps; k++) {
								attribs_data[4].data.push (parseFloat (line_tokens[k]));
							} // endfor
						} // endfor
						break;
						
					// per-mesh stuff
					case "@skeleton": // @skeleton bones 2 animations 1
						vao.bone_count = parseInt (line_tokens[2]);
						vao.anim_count = parseInt (line_tokens[4]);
						for (var j = 0; j < vao.bone_count; j++) {
							vao.offset_mat[j] = [];
						}
						break;
					case "@root_transform": // @root_transform comps 16
						var comps = parseInt (line_tokens[2]);
						i++;
						line_tokens = lines[i].split (' ');
						for (var j = 0; j < comps; j++) {
							vao.root_transform.push (parseFloat (line_tokens[j]));
						}
						break;
					case "@offset_mat": // @offset_mat comps 16
						for (var j = 0; j < vao.bone_count; j++) {
							i++;
							line_tokens = lines[i].split (' ');
							for (var k = 0; k < comps; k++) {
								vao.offset_mat[j].push (parseFloat (line_tokens[k]));
							}
						}
						break;
					case "@hierarchy": // @hierarchy nodes 5
						vao.anim_node_count = parseInt (line_tokens[2]);
						for (var j = 0; j < vao.anim_node_count; j++) {
							var anim_node = new Object;
							i++;
							line_tokens = lines[i].split (' ');
							anim_node.parent = parseInt (line_tokens[1]);
							anim_node.bone_id = parseInt (line_tokens[3]);
							vao.anim_nodes.push (anim_node);
						}
						break;
					case "@animation": // @animation name TODO duration 1.000000
						var anim = new Object;
						anim.name = line_tokens[2];
						anim.duration = parseFloat (line_tokens[4]);
						anim.nodes = [];
						// each node can have a list of keys unique to each anim
						for (var j = 0; j < vao.anim_node_count; j++) {
							var node = new Object;
							node.tra_keys = [];
							node.rot_keys = [];
							node.sca_keys = [];
							anim.nodes.push (node);
						}
						vao.animations.push (anim);
						break;
					case "@tra_keys": // @tra_keys node 2 count 6 comps 3
						var node = parseInt (line_tokens[2]);
						var count = parseInt (line_tokens[4]);
						var comps = parseInt (line_tokens[6]);
						var curr_anim = vao.animations.length - 1;
						for (var j = 0; j < count; j++) {
							i++;
							line_tokens = lines[i].split (' ');
							var key = new Object;
							key.t = parseFloat (line_tokens[1]);
							key.v = [];
							for (var k = 0; k < comps; k++) {
								key.v.push (parseFloat (line_tokens[3 + k]));
							}
							vao.animations[curr_anim].nodes[node].tra_keys.push (key);
						}
						// t 0.040000 TRA 0.000000 0.000000 0.000000
						break;
					case "@rot_keys": // @rot_keys node 2 count 6 comps 4
						var node = parseInt (line_tokens[2]);
						var count = parseInt (line_tokens[4]);
						var comps = parseInt (line_tokens[6]);
						var curr_anim = vao.animations.length - 1;
						for (var j = 0; j < count; j++) {
							i++;
							line_tokens = lines[i].split (' ');
							var key = new Object;
							key.t = parseFloat (line_tokens[1]);
							key.v = [];
							for (var k = 0; k < comps; k++) {
								key.v.push (parseFloat (line_tokens[3 + k]));
							}
							vao.animations[curr_anim].nodes[node].rot_keys.push (key);
						}
						break;
					case "@sca_keys": // @sca_keys node 2 count 6 comps 3
						var node = parseInt (line_tokens[2]);
						var count = parseInt (line_tokens[4]);
						var comps = parseInt (line_tokens[6]);
						var curr_anim = vao.animations.length - 1;
						for (var j = 0; j < count; j++) {
							i++;
							line_tokens = lines[i].split (' ');
							var key = new Object;
							key.t = parseFloat (line_tokens[1]);
							key.v = [];
							for (var k = 0; k < comps; k++) {
								key.v.push (parseFloat (line_tokens[3 + k]));
							}
							vao.animations[curr_anim].nodes[node].sca_keys.push (key);
						}
						break;
					case "@bounding_radius":
						vao.brad = parseFloat (line_tokens[1]);
						break;
					default:
				} // endswitch
			} // endif
			i++;
		} // endwhile
		console.log ("mesh loaded, " + vao.pc + " points");
		vao.is_loaded = true;
		vao_ext.bindVertexArrayOES (vao);
		for (var i = 0; i < num_attribs; i++) {
			var vbo = gl.createBuffer ();
			gl.bindBuffer (gl.ARRAY_BUFFER, vbo);
			gl.bufferData (gl.ARRAY_BUFFER, new Float32Array (attribs_data[i].data),
				gl.STATIC_DRAW);
			gl.enableVertexAttribArray (i);
			gl.vertexAttribPointer (i, attribs_data[i].comps, gl.FLOAT, false, 0, 0);
		} // endfor
		// update index.html
		var htmlarea = document.getElementById ("mesh_info");
		htmlarea.innerHTML = url + "<br />vertices: " + vao.pc + "<br />faces: " +
			vao.pc / attribs_data[0].comps + "<br />bones: " + vao.bone_count +
			"<br />animations: " + vao.anim_count;
		
		for (var i = 0; i < vao.animations.length; i++) {
			htmlarea.innerHTML += ("<br />&nbsp;&nbsp;\"" +
			vao.animations[i].name + "\" duration: " + vao.animations[i].duration);
		}
		
		htmlarea.innerHTML += "<br />anim nodes: " +
			vao.anim_node_count + "<br />bounding radius: " + vao.brad;
	} // endfunction
	xmlhttp.send ();
	return vao;
}
