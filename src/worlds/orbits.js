/* Original orbit geometry shared by the space worlds; pure, no app state. */
(function(root){
 'use strict';
 function position(i,angle,{scene:sceneMode=0,syncMotion=false,cx=0,cy=0,scale=1}={}){if(syncMotion){const radius=(135+i*24)*scale;return {x:cx+radius*Math.cos(angle),y:cy+radius*.8*Math.sin(angle)}}let base=(135+i*24)*scale,rx=base,ry=base*(.79+i*.008),rot=.14*i;let x,y;if(sceneMode===0){let mod=1+.044*Math.sin(3*angle+i*.75)+.028*Math.cos(5*angle-i);x=rx*mod*Math.cos(angle);y=ry*mod*Math.sin(angle)}else if(sceneMode===1){let rr=base*(.80+.21*Math.cos(angle*4+i*.43));x=rr*Math.cos(angle);y=rr*.84*Math.sin(angle)}else{let t=angle+i*.24;x=rx*(.84*Math.cos(t)+.19*Math.cos(3*t+i));y=ry*(.78*Math.sin(t)-.2*Math.sin(2*t+i*.5))}return {x:cx+x*Math.cos(rot)-y*Math.sin(rot),y:cy+x*Math.sin(rot)+y*Math.cos(rot)}}
 root.HaloOrbitGeometry={position};
 if(typeof module!=='undefined'&&module.exports)module.exports=root.HaloOrbitGeometry;
})(globalThis);
