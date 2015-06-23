//
// .apg viewer for WebGL
// Anton Gerdelan 22 Jun 2015
// antongerdelan.net
//
// TODO slerp, lerp
// TODO actually recurse the animations to inherit parents
// and root and local transforms for bones
//

var mesh_url = "meshes/dungeonDoor_revision3.apg"; //"meshes/cube.apg";
var img = "textures/checkerboard.png";

var canvas;
var gl;
var vao_ext;

var cube_vao;
var texture;
var test_sp;
var test_M_loc, test_PV_loc;
var skinned_sp;
var skinned_M_loc, skinned_PV_loc, skinned_bone_mat_locs = [];

var previous_millis;
var cam_dirty = false;
var PV, M;
var deg = 0.0;
var skinned = false;
var anim_timer = 0.0;
var curr_bone_mats = [];

var g_time_step_size_s = 1.0 / 50.0; // smallest fixed-step update in seconds

function main () {
	canvas = document.getElementById ("canvas");
	gl = canvas.getContext ("webgl");
	vao_ext = gl.getExtension ("OES_vertex_array_object");
	if (!vao_ext) {
		console.error ("ERROR: Your browser does not support WebGL VAO extension");
		alert ("ERROR: Your browser does not support WebGL VAO extension");
	}
	
	gl.clearColor (0.9, 0.85, 0.8, 1.0);
	gl.cullFace (gl.BACK);
	gl.frontFace (gl.CCW);
	gl.enable (gl.CULL_FACE);
	gl.enable (gl.DEPTH_TEST);
	gl.viewport (0, 0, canvas.clientWidth, canvas.clientHeight);
	
	texture = gl.createTexture ();
	texture.is_loaded = false;
	var image = new Image();
	image.onload = function () {
		gl.bindTexture (gl.TEXTURE_2D, texture);
		gl.pixelStorei (gl.UNPACK_FLIP_Y_WEBGL, true);
		gl.texImage2D (gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE,
			image);
		gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri (gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		texture.is_loaded = true;
		console.log ("texture loaded ");
	}
	image.src = "textures/checkerboard.png";
	
	M = identity_mat4 ();
	var V = translate_mat4 (identity_mat4 (), [0.0, 0.0, -5.0]);
	var P = perspective (67.0, 1.0, 0.1, 100.0);
	PV = mult_mat4_mat4 (P, V);
	
	var el = document.getElementById ("test.vert");
	var vs_str = el.innerHTML;
	el = document.getElementById ("test.frag");
	var fs_str = el.innerHTML;
	
	var vs = gl.createShader (gl.VERTEX_SHADER);
	var fs = gl.createShader (gl.FRAGMENT_SHADER);
	gl.shaderSource (vs, vs_str);
	gl.shaderSource (fs, fs_str);
	gl.compileShader (vs);
	if (!gl.getShaderParameter (vs, gl.COMPILE_STATUS)) {
		console.error ("ERROR compiling vert shader. log: " +
			gl.getShaderInfoLog (vs));
	}
	gl.compileShader (fs);
	if (!gl.getShaderParameter (fs, gl.COMPILE_STATUS)) {
		console.error ("ERROR compiling frag shader. log: " +
			gl.getShaderInfoLog (fs));
	}
	test_sp = gl.createProgram ();
	gl.attachShader (test_sp, vs);
	gl.attachShader (test_sp, fs);
	gl.bindAttribLocation (test_sp, 0, "vp");
	gl.bindAttribLocation (test_sp, 2, "vt");
	gl.bindAttribLocation (test_sp, 1, "vn");
	gl.bindAttribLocation (test_sp, 3, "vtan");
	gl.linkProgram (test_sp);
	if (!gl.getProgramParameter (test_sp, gl.LINK_STATUS)) {
		console.error ("ERROR linking program. log: " +
			gl.getProgramInfoLog (test_sp));
	}
	gl.validateProgram (test_sp);
	if (!gl.getProgramParameter(test_sp, gl.VALIDATE_STATUS)) {
		console.error ("ERROR validating program. log: " +
			gl.getProgramInfoLog (test_sp));
	}
	gl.useProgram (test_sp);
	test_PV_loc = gl.getUniformLocation (test_sp, "PV");
	gl.uniformMatrix4fv (test_PV_loc, gl.FALSE, new Float32Array (PV));
	test_M_loc = gl.getUniformLocation (test_sp, "M");
	gl.uniformMatrix4fv (test_M_loc, gl.FALSE, new Float32Array (M));
	test_sp.is_linked = true;
	
	var el = document.getElementById ("skinned.vert");
	var vs_str = el.innerHTML;
	el = document.getElementById ("skinned.frag");
	var fs_str = el.innerHTML;
	
	vs = gl.createShader (gl.VERTEX_SHADER);
	fs = gl.createShader (gl.FRAGMENT_SHADER);
	gl.shaderSource (vs, vs_str);
	gl.shaderSource (fs, fs_str);
	gl.compileShader (vs);
	if (!gl.getShaderParameter (vs, gl.COMPILE_STATUS)) {
		console.error ("ERROR compiling vert shader. log: " +
			gl.getShaderInfoLog (vs));
	}
	gl.compileShader (fs);
	if (!gl.getShaderParameter (fs, gl.COMPILE_STATUS)) {
		console.error ("ERROR compiling frag shader. log: " +
			gl.getShaderInfoLog (fs));
	}
	skinned_sp = gl.createProgram ();
	gl.attachShader (skinned_sp, vs);
	gl.attachShader (skinned_sp, fs);
	gl.bindAttribLocation (skinned_sp, 0, "vp");
	gl.bindAttribLocation (skinned_sp, 2, "vt");
	gl.bindAttribLocation (skinned_sp, 1, "vn");
	gl.bindAttribLocation (skinned_sp, 3, "vtan");
	gl.bindAttribLocation (skinned_sp, 4, "vb");
	gl.linkProgram (skinned_sp);
	if (!gl.getProgramParameter (skinned_sp, gl.LINK_STATUS)) {
		console.error ("ERROR linking program. log: " +
			gl.getProgramInfoLog (skinned_sp));
	}
	gl.validateProgram (skinned_sp);
	if (!gl.getProgramParameter(skinned_sp, gl.VALIDATE_STATUS)) {
		console.error ("ERROR validating program. log: " +
			gl.getProgramInfoLog (skinned_sp));
	}
	gl.useProgram (skinned_sp);
	skinned_PV_loc = gl.getUniformLocation (skinned_sp, "PV");
	gl.uniformMatrix4fv (skinned_PV_loc, gl.FALSE, new Float32Array (PV));
	skinned_M_loc = gl.getUniformLocation (skinned_sp, "M");
	gl.uniformMatrix4fv (skinned_M_loc, gl.FALSE, new Float32Array (M));
	for (var i = 0; i < 32; i++) {
		var str = "bone_mats[" + i + "]";
		skinned_bone_mat_locs[i] = gl.getUniformLocation (skinned_sp, str);
		gl.uniformMatrix4fv (skinned_bone_mat_locs[i], gl.FALSE,
			new Float32Array (identity_mat4 ()));
	}
	skinned_sp.is_linked = true;
	
	cube_vao = start_loading_apg_mesh (mesh_url);
	
	previous_millis = performance.now ();
	main_loop ();
}

window.requestAnimFrame = (function() {
return window.requestAnimationFrame ||
	window.webkitRequestAnimationFrame ||
	window.mozRequestAnimationFrame ||
	window.oRequestAnimationFrame ||
	window.msRequestAnimationFrame ||
	function(callback, element) {
		return window.setTimeout (callback, 1000 / 60);
	};
})();

function anim_recurse (vao) {
	// anim_timer
	var curr_bone_anims = [];
	
	// all nodes in animation[0]
	for (var i = 0; i < cube_vao.animations[0].nodes.length; i++) {
		var n = cube_vao.animations[0].nodes[i];
		var lov;
		var hiv;
		var lot;
		var hit;
		if (vao.anim_nodes[i].bone_id == -1) {
			continue;
		}
		// rot keys in node
		for (var j = 0; j < n.rot_keys.length; j++) {
			var rk = n.rot_keys[j];
			var t = rk.t;
			var v = rk.v;
			if (t >= anim_timer) {
				hiv = v;
				loi = Math.max (j - 1, 0);
				lov = n.rot_keys[loi].v;
				hit = t;
				lot = n.rot_keys[loi].t;
				break;
			}
		} // endfor
		var tf = (anim_timer - lot) / (hit - lot);
		var slerped = slerp (lov, hiv, tf);
		
		Rr = vao.root_transform;

		Rp = identity_mat4 ();
		// HACK -- replace with recursion
		if (vao.anim_nodes[i].bone_id > 0) {
			Rp = curr_bone_anims[0];
		}
		Rl = vao.offset_mat[vao.anim_nodes[i].bone_id];
		Ra = quat_to_mat4 (slerped);
		Rla = mult_mat4_mat4 (Ra, Rl);
		Ri = mult_mat4_mat4 (inverse_mat4 (Rl), Rla);
		Rus = mult_mat4_mat4 (Ri, Rp);
		
		R = mult_mat4_mat4 (Rus, Rr);
		
		curr_bone_anims.push (Rus);
		if (vao.anim_nodes[i].bone_id > -1) {
			gl.uniformMatrix4fv (skinned_bone_mat_locs[vao.anim_nodes[i].bone_id], gl.FALSE,
				new Float32Array (R));
		}
	} // endfor
}

function main_loop () {
	var current_millis = performance.now ();
	var elapsed_millis = current_millis - previous_millis;
	previous_millis = current_millis;
	var elapsed_s = elapsed_millis / 1000.0;
	
	draw (elapsed_s);
	
	deg = elapsed_s * 90.0;
	M = rotate_y_deg (M, deg);
	
	// this function is from webgl-utils
	window.requestAnimFrame (main_loop, canvas);
}

function draw (elapsed_s) {
	gl.clear (gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
	if (!texture.is_loaded || !test_sp.is_linked || !skinned_sp.is_linked ||
		!cube_vao.is_loaded) {
		return;
	}
	if (cube_vao.anim_count <= 0) {
		gl.useProgram (test_sp);
		gl.uniformMatrix4fv (test_M_loc, gl.FALSE, new Float32Array (M));
	} else {
		gl.useProgram (skinned_sp);
		//gl.uniformMatrix4fv (skinned_M_loc, gl.FALSE, new Float32Array (M));
		anim_timer += elapsed_s;
		if (anim_timer >= cube_vao.animations[0].duration) {
			anim_timer = 0.0; // doing this because if you lose focuse it gets massive
			// and subtracting duration can still leave it too big cube_vao.animations[0].duration;
		}
		anim_recurse (cube_vao);
	}
	gl.activeTexture (gl.TEXTURE0);
	gl.bindTexture (gl.TEXTURE_2D, texture);
	vao_ext.bindVertexArrayOES (cube_vao);
	gl.drawArrays (gl.TRIANGLES, 0, cube_vao.pc);
}
