/* Shared decorative GPU surface. Worlds own shaders, never clocks or sound. */
(function(root){
 'use strict';
 function create(canvas){
  const gl=canvas.getContext('webgl2',{antialias:false,alpha:false,powerPreference:'low-power'});
  const programs=new Map(),textures=new Map();let buffer,disposed=false;
  if(gl){buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW)}
  function build(source){
   const shaders=[];let program;
   try{
    for(const [type,text] of [[gl.VERTEX_SHADER,'#version 300 es\nin vec2 p;out vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}'],[gl.FRAGMENT_SHADER,source]]){
     const shader=gl.createShader(type);shaders.push(shader);gl.shaderSource(shader,text);gl.compileShader(shader);
     if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));
    }
    program=gl.createProgram();for(const s of shaders)gl.attachShader(program,s);gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
    return {program,uniforms:new Map(),attribute:gl.getAttribLocation(program,'p')};
   }catch(error){if(program)gl.deleteProgram(program);console.warn('Visual world unavailable:',error.message);return null}
   finally{for(const s of shaders)gl.deleteShader(s)}
  }
  function render(id,source,values){
   if(!gl||disposed||gl.isContextLost())return false;
   if(!programs.has(id))programs.set(id,build(source));
   const entry=programs.get(id);if(!entry)return false;
   gl.useProgram(entry.program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(entry.attribute);gl.vertexAttribPointer(entry.attribute,2,gl.FLOAT,false,0,0);
   const texture=textures.get(id);
   if(texture?.handle){gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture.handle);gl.uniform1i(gl.getUniformLocation(entry.program,'skyMap'),0)}
   gl.uniform1f(gl.getUniformLocation(entry.program,'hasSky'),texture?.handle?1:0);
   for(const [name,value] of Object.entries(values)){
    if(!entry.uniforms.has(name))entry.uniforms.set(name,gl.getUniformLocation(entry.program,name));
    const u=entry.uniforms.get(name);if(Array.isArray(value)){if(value.length===4)gl.uniform4f(u,...value);else if(value.length===3)gl.uniform3f(u,...value);else gl.uniform2f(u,...value)}else gl.uniform1f(u,value);
   }
   gl.drawArrays(gl.TRIANGLES,0,6);return true;
  }
  function setTexture(id,image){
   if(!gl||disposed||gl.isContextLost())return false;
   const previous=textures.get(id),handle=gl.createTexture();
   try{
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,handle);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.generateMipmap(gl.TEXTURE_2D);
   }catch(error){gl.deleteTexture(handle);gl.bindTexture(gl.TEXTURE_2D,previous?.handle||null);throw error;}
   if(previous?.handle)gl.deleteTexture(previous.handle);
   textures.set(id,{handle,image});return true;
  }
  function resize(w,h,quality=1.2){if(!gl)return;const ratio=Math.min(root.devicePixelRatio||1,quality);const width=Math.floor(w*ratio),height=Math.floor(h*ratio);if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height}gl.viewport(0,0,width,height)}
  function dispose(){disposed=true;canvas.removeEventListener('webglcontextlost',lost);canvas.removeEventListener('webglcontextrestored',restored);if(!gl)return;for(const entry of programs.values())if(entry)gl.deleteProgram(entry.program);programs.clear();for(const t of textures.values())if(t.handle)gl.deleteTexture(t.handle);textures.clear();gl.deleteBuffer(buffer)}
  function lost(e){e.preventDefault();programs.clear();for(const t of textures.values())t.handle=null}
  function restored(){if(!gl||disposed)return;buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);for(const [id,t] of textures)setTexture(id,t.image)}
  canvas.addEventListener('webglcontextlost',lost);
  canvas.addEventListener('webglcontextrestored',restored);
  return {gl,render,resize,dispose,setTexture};
 }
 root.HaloWorldRenderer={create};
})(globalThis);
