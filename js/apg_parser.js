//
// .apg parser for WebGL
// Anton Gerdelan 22 Jun 2015
// antongerdelan.net
//
// TODO: bone ids, skeleton, animation
//

function start_loading_apg_mesh (url) {
	var vao = vao_ext.createVertexArrayOES ();
	vao.is_loaded = false;
	vao.pc = 0;

	var xmlhttp = new XMLHttpRequest();
	xmlhttp.open ("GET", url, true);
	xmlhttp.onload = function (e) {
		var attribs_data = [];
		for (var i = 0; i < 5; i++) {
			attribs_data[i] = [];
		}
		var num_attribs = 0;
	
		var str = xmlhttp.responseText;
		var lines = str.split ('\n');
		var i = 0;
		while (i < lines.length) {
			var line_tokens = lines[i].split (' ');
			if (lines[i][0] == '@') {
				switch (line_tokens[0]) {
					case "@vert_count":
						vao.pc = parseInt (line_tokens[1]);
						break;
					case "@vp":
						num_attribs++;
						attribs_data[0].comps = parseInt (line_tokens[2]);
						for (j = 0; j < vao.pc; j++) {
							i++;
							line_tokens = lines[i].split (' ');
							for (var k = 0; k < attribs_data[0].comps; k++) {
								attribs_data[0].push (parseFloat (line_tokens[k]));
							}
						}
						break;
					case "@vn":
						num_attribs++;
						attribs_data[1].comps = parseInt (line_tokens[2]);
						for (j = 0; j < vao.pc; j++) {
							i++;
							line_tokens = lines[i].split (' ');
							for (var k = 0; k < attribs_data[1].comps; k++) {
								attribs_data[1].push (parseFloat (line_tokens[k]));
							}
						}
						break;
					case "@vt":
						num_attribs++;
						attribs_data[2].comps = parseInt (line_tokens[2]);
						for (j = 0; j < vao.pc; j++) {
							i++;
							line_tokens = lines[i].split (' ');
							for (var k = 0; k < attribs_data[2].comps; k++) {
								attribs_data[2].push (parseFloat (line_tokens[k]));
							}
						}
						break;
					default:
				}
			}
			i++;
		}
		console.log ("mesh loaded, " + vao.pc + " points");
		vao.is_loaded = true;
		vao_ext.bindVertexArrayOES (vao);
		for (var i = 0; i < num_attribs; i++) {
			var vbo = gl.createBuffer ();
			gl.bindBuffer (gl.ARRAY_BUFFER, vbo);
			gl.bufferData (gl.ARRAY_BUFFER, new Float32Array (attribs_data[i]),
				gl.STATIC_DRAW);
			gl.enableVertexAttribArray (i);
			gl.vertexAttribPointer (i, attribs_data[i].comps, gl.FLOAT, false, 0, 0);
		}
		// update index.html
		var htmlarea = document.getElementById ("mesh_info");
		htmlarea.innerHTML = url + "<br />vertices: " + vao.pc + "<br />faces: " +
			vao.pc / attribs_data[0].comps + "<br />bones: " + 0 +
			"<br />animations: " + 0;
	}
	xmlhttp.send ();
	return vao;
}
