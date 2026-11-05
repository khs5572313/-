// ───────────────────────────────────────────────────────────────
//  shaders.js — 셀 페인트 / 배경 포스터컬러 / 잉크 선화 / 필름 마감
// ───────────────────────────────────────────────────────────────
export const NOISE = /* glsl */`
float hash13(vec3 p){ p=fract(p*0.1031); p+=dot(p,p.zyx+31.32); return fract((p.x+p.y)*p.z); }
float hash12(vec2 p){ vec3 p3=fract(vec3(p.xyx)*0.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
float vn3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(mix(hash13(i),hash13(i+vec3(1,0,0)),f.x),mix(hash13(i+vec3(0,1,0)),hash13(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash13(i+vec3(0,0,1)),hash13(i+vec3(1,0,1)),f.x),mix(hash13(i+vec3(0,1,1)),hash13(i+vec3(1,1,1)),f.x),f.y),f.z); }
float vn2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash12(i),hash12(i+vec2(1,0)),f.x),mix(hash12(i+vec2(0,1)),hash12(i+vec2(1,1)),f.x),f.y); }
`;

// 공용 조명 유니폼 (모든 머티리얼이 같은 객체를 참조)
export const LIGHT_DECL = /* glsl */`
uniform vec3 uKeyDir; uniform vec3 uKeyCol;
uniform vec3 uLP[3]; uniform vec3 uLC[3]; uniform float uLI[3]; uniform float uLR[3];
uniform vec3 uSpP; uniform vec3 uSpD; uniform float uSpI; uniform float uSpCos;
uniform float uDawn;
`;

export const TOON_VS = /* glsl */`
varying vec3 vN; varying vec3 vW;
void main(){
  vec4 w = modelMatrix*vec4(position,1.0);
  vW = w.xyz;
  vN = normalize(inverse(transpose(mat3(modelMatrix)))*normal);
  gl_Position = projectionMatrix*viewMatrix*w;
}`;

// 셀 페인트: 평면 채색 + 2단 하드 섀도 + 램프 색 영역(하드 엣지) — 에어브러시/광택 없음
export const TOON_FS = /* glsl */`
${NOISE}
${LIGHT_DECL}
uniform vec3 uBase; uniform vec3 uS1; uniform vec3 uS2;
uniform float uFrost; uniform float uWear; uniform float uWob;
uniform vec3 uFrostCol; uniform vec3 uFrostS;
uniform float uEmis; uniform vec3 uEmisCol;
varying vec3 vN; varying vec3 vW;
void main(){
  vec3 n = normalize(vN); if(!gl_FrontFacing) n = -n;
  float wob = (vn3(vW*2.3)-0.5)*uWob;
  float ndl = dot(n, normalize(uKeyDir));
  float lvl = ndl > 0.18+wob ? 0.0 : (ndl > -0.32+wob ? 1.0 : 2.0);
  vec3 col = lvl < 0.5 ? uBase : (lvl < 1.5 ? uS1 : uS2);
  // 벗겨진 도장/찌그러짐(하부 도장층이 드러난 평면 패치)
  if(uWear > 0.0){
    float wn = vn3(vW*5.0)*0.65 + vn3(vW*17.0)*0.35;
    if(wn > 1.0-uWear*0.32) col *= vec3(0.70,0.71,0.80);
    float sc = vn3(vec3(vW.x*1.5, vW.y*26.0, vW.z*1.5));
    if(sc > 0.93 && uWear>0.5) col *= 0.82;
  }
  // 서리/눈가루: 위쪽 면에 셀 모양으로
  if(uFrost > 0.0){
    float fn = vn3(vW*4.1)*0.6 + vn3(vW*13.0)*0.4;
    float f = step(1.05 - uFrost*0.35, n.y*0.6 + fn*0.75);
    col = mix(col, lvl < 0.5 ? uFrostCol : uFrostS, f);
  }
  col *= uKeyCol;
  // 램프 빛: 색 영역 2단(하드), 닿는 거리 밖은 0
  for(int i=0;i<3;i++){
    vec3 L = uLP[i]-vW; float d = length(L);
    float a = clamp(1.0-d/uLR[i],0.0,1.0); a = a*a*uLI[i];
    float l = dot(n, L/max(d,1e-3));
    float e = a*(0.2+0.8*max(l,0.0));
    float j = (vn3(vW*3.0+float(i))-0.5)*0.05;
    float b1 = step(0.16+j, e), b2 = step(0.5+j, e);
    col = mix(col, uBase*uLC[i]*1.05, b1*0.55);
    col = mix(col, min(uBase*uLC[i]*1.45+0.06, vec3(1.0)), b2*0.65);
  }
  // 탐조등
  if(uSpI > 0.0){
    vec3 L = vW-uSpP; float d=length(L); float c = dot(L/d, uSpD);
    float inC = step(uSpCos, c)*step(0.0, -dot(n, L/d)+0.15);
    col = mix(col, min(uBase*vec3(1.05,1.08,1.15)*1.25+0.05, vec3(1.0)), inC*uSpI*0.8);
  }
  col = mix(col, uEmisCol, uEmis);
  gl_FragColor = vec4(col, 1.0);
}`;

// 설원(배경 미술): 포스터컬러 붓결 + 3톤 + 구덩이 내부 어둠 + 테두리 붓선 + 대기 원근
export const GROUND_VS = /* glsl */`
attribute float aPit; attribute float aRim;
varying vec3 vN; varying vec3 vW; varying float vPit; varying float vRim;
void main(){
  vec4 w = modelMatrix*vec4(position,1.0);
  vW = w.xyz; vN = normalize(mat3(modelMatrix)*normal);
  vPit = aPit; vRim = aRim;
  gl_Position = projectionMatrix*viewMatrix*w;
}`;
export const GROUND_FS = /* glsl */`
${NOISE}
${LIGHT_DECL}
uniform sampler2D tBrush; uniform vec3 uFogCol; uniform float uFogNear; uniform float uFogFar;
uniform vec3 uLit, uMid, uDeep, uPitCol, uLitD, uMidD, uDeepD, uPitColD;
uniform float uUsePit;
varying vec3 vN; varying vec3 vW; varying float vPit; varying float vRim;
void main(){
  vec3 n = normalize(vN);
  float b1 = texture2D(tBrush, vW.xz*0.055).r;
  float b2 = texture2D(tBrush, vW.xz*0.017+vec2(0.37,0.11)).r;
  float br = (b1*0.6+b2*0.4)-0.5;
  float ndl = dot(n, normalize(uKeyDir)) + br*0.35;
  vec3 lit = mix(uLit,uLitD,uDawn), mid = mix(uMid,uMidD,uDawn), deep = mix(uDeep,uDeepD,uDawn), pitc = mix(uPitCol,uPitColD,uDawn);
  vec3 col = ndl > 0.55 ? lit : (ndl > 0.12 ? mid : deep);
  // 칠 안의 색 변화(붓결)
  col *= 1.0 + br*0.16;
  col += vec3(-0.01,0.0,0.02)*sign(br);
  // 구덩이 내부: 깊을수록 어두운 남보라
  float pd = uUsePit*clamp(vPit*1.9 + br*0.25, 0.0, 1.0);
  col = mix(col, pitc, smoothstep(0.12, 1.2, pd));
  // 구덩이 테두리 — 두껍고 확신 있는 붓선
  float rimS = uUsePit*vRim*(0.8+br*0.5);
  col = mix(col, deep*0.82, step(0.55, rimS)*0.85);
  col = mix(col, lit*1.06, step(0.55, uUsePit*vRim*(0.5-br*2.0))*step(vPit,0.02)*0.5);
  col *= uKeyCol;
  // 램프 빛 영역(눈 위에 칠한 따뜻한 빛 웅덩이)
  for(int i=0;i<3;i++){
    vec3 L = uLP[i]-vW; float d = length(L);
    float a = clamp(1.0-d/(uLR[i]*1.1),0.0,1.0); a=a*a*uLI[i]*(1.0-uDawn*0.85);
    float l = max(dot(n,L/max(d,1e-3)),0.0);
    float e = a*(0.3+0.7*l) + br*0.06;
    col = mix(col, col*uLC[i]*1.25, step(0.12,e)*0.6);
    col = mix(col, min(lit*uLC[i]*1.1, vec3(1.0)), step(0.42,e)*0.5);
    col += uLC[i]*a*0.03;
  }
  if(uSpI > 0.0){
    vec3 L = vW-uSpP; float d=length(L); float c=dot(L/d,uSpD);
    float pool = step(uSpCos+br*0.01, c);
    float halo = smoothstep(uSpCos-0.04, uSpCos, c);
    col = mix(col, col*1.35+vec3(0.12,0.13,0.18), pool*uSpI*0.8);
    col += vec3(0.25,0.28,0.4)*halo*(1.0-pool)*uSpI*0.4;
  }
  float dist = length(vW-cameraPosition);
  float fog = smoothstep(uFogNear, uFogFar, dist);
  col = mix(col, mix(uFogCol, uFogCol*vec3(1.0), 0.0), fog);
  gl_FragColor = vec4(col,1.0);
}`;

export const SKY_VS = /* glsl */`
varying vec3 vD;
void main(){ vec4 w = modelMatrix*vec4(position,1.0); vD = w.xyz - cameraPosition; gl_Position = projectionMatrix*viewMatrix*w; gl_Position.z = gl_Position.w*0.99999; }`;
export const SKY_FS = /* glsl */`
uniform sampler2D tNight; uniform sampler2D tDawn; uniform float uDawn; uniform float uRot; uniform float uExpo;
varying vec3 vD;
void main(){
  vec3 d = normalize(vD);
  float u = atan(d.x, d.z)/6.2831853 + 0.5 + uRot;
  float el = asin(clamp(d.y,-1.0,1.0));
  float v = clamp(1.0 - (el + 0.12)/1.25, 0.002, 0.998);
  vec3 a = texture2D(tNight, vec2(u, 1.0-v)).rgb;
  vec3 b = texture2D(tDawn, vec2(u, 1.0-v)).rgb;
  vec3 c = mix(a,b,uDawn);
  c = mix(c, mix(vec3(0.045,0.06,0.13), vec3(0.17,0.21,0.42), uDawn), smoothstep(0.42, 0.95, el));
  gl_FragColor = vec4(c*uExpo, 1.0);
}`;

export const MTN_VS = /* glsl */`
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
export const MTN_FS = /* glsl */`
uniform sampler2D tNight; uniform sampler2D tDawn; uniform float uDawn; uniform float uExpo;
varying vec2 vUv;
void main(){
  vec4 a = texture2D(tNight, vUv); vec4 b = texture2D(tDawn, vUv);
  vec4 c = mix(a,b,uDawn);
  if(c.a < 0.02) discard;
  gl_FragColor = vec4(c.rgb*uExpo, c.a);
}`;

// 노멀/ID 패스 (선화 검출용)
export const NRM_VS = /* glsl */`
varying vec3 vNV;
void main(){ vNV = normalize(normalMatrix*normal); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
export const NRM_FS = /* glsl */`
uniform float uId;
varying vec3 vNV;
void main(){ vec3 n = normalize(vNV); if(!gl_FrontFacing) n=-n; gl_FragColor = vec4(n*0.5+0.5, uId); }`;

// 램프 유리(원판): 중심에서 빛이 '차오르는' 링 + 깜빡임
export const LAMP_VS = /* glsl */`
varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
export const LAMP_FS = /* glsl */`
${NOISE}
uniform float uLevel; uniform float uFill; uniform vec3 uOff; uniform vec3 uOffS; uniform vec3 uHot; uniform vec3 uWarm; uniform vec3 uEdge; uniform vec3 uKeyCol;
varying vec2 vUv;
void main(){
  vec2 p = vUv*2.0-1.0; float r = length(p);
  // 꺼진 유리: 평면 2톤 (위쪽에 셀 반사 띠 하나)
  vec3 off = (p.y > 0.25 - p.x*0.4 && r < 0.82 && r > 0.45) ? uOff*1.25 : uOff;
  off = r > 0.88 ? uOffS : off;
  off *= uKeyCol;
  float fillR = uFill*1.05;
  vec3 on = r < 0.33 ? uHot : (r < 0.72 ? uWarm : uEdge);
  float inside = step(r, fillR + (vn2(p*6.0)-0.5)*0.06);
  vec3 col = mix(off, on, inside*clamp(uLevel,0.0,1.0));
  col = mix(col, uHot, step(r, 0.2)*clamp(uLevel-1.0,0.0,1.0));
  gl_FragColor = vec4(col,1.0);
}`;

// 탐조등 원뿔: 칠해진 부드러운 빛 기둥
export const BEAM_VS = /* glsl */`
varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.0); vN=normalize(mat3(modelMatrix)*normal); vV=normalize(cameraPosition-w.xyz); gl_Position=projectionMatrix*viewMatrix*w; }`;
export const BEAM_FS = /* glsl */`
${NOISE}
uniform float uI; uniform float uFrame;
varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main(){
  float edge = abs(dot(normalize(vN), normalize(vV)));
  float along = vUv.y; // 1 = 눈(근원), 0 = 끝
  float streak = vn2(vec2(vUv.x*38.0, along*2.0 + uFrame*0.0))*0.5+0.5;
  float a = pow(edge, 1.6) * (0.25+0.75*along) * (0.55+0.45*streak) * uI;
  a = floor(a*5.0+0.5)/5.0 * 0.9 + a*0.1; // 칠한 단계(포스터라이즈)
  gl_FragColor = vec4(vec3(0.78,0.84,1.0)*a*0.3, 1.0);
}`;

export const FS_VS = /* glsl */`
varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }`;

// 잉크 선화 패스: 깊이/노멀/ID 경계를 손그림 선으로 + 색 트레스(held line)
export const INK_FS = /* glsl */`
${NOISE}
uniform sampler2D tCol; uniform sampler2D tNrm; uniform sampler2D tDep; uniform sampler2D tFx;
uniform vec2 uRes; uniform float uNear; uniform float uFar; uniform float uSeed; uniform float uLine; uniform float uDawn;
varying vec2 vUv;
float lin(float d){ float z=d*2.0-1.0; return 2.0*uNear*uFar/(uFar+uNear-z*(uFar-uNear)); }
void main(){
  vec2 px = 1.0/uRes;
  vec3 c = texture2D(tCol, vUv).rgb;
  vec4 nc = texture2D(tNrm, vUv);
  float id = nc.a;
  float dc = lin(texture2D(tDep, vUv).r);
  // 선 굵기: 펜 압력처럼 부풀고 가늘어짐 (2코마마다 미세하게 흔들림 = 손그림 '라인 보일')
  float pr = vn2(vUv*uRes/vec2(70.0,52.0) + uSeed*3.1);
  float wv = (0.55 + 0.95*pr)*uLine;
  float sil = 0.0, inn = 0.0;
  vec3 n0 = nc.xyz*2.0-1.0;
  bool isChar = id > 0.45;
  for(int k=0;k<8;k++){
    float ang = float(k)*0.785398 + 0.39;
    vec2 dir = vec2(cos(ang), sin(ang));
    vec2 o1 = dir*px*(1.6*wv+0.4);
    vec2 o2 = dir*px*(0.9*wv+0.25);
    float d1 = lin(texture2D(tDep, vUv+o1).r);
    vec4 nn1 = texture2D(tNrm, vUv+o1);
    // 실루엣: 이 픽셀이 캐릭터이고 이웃이 훨씬 멀다
    if(isChar && (d1-dc) > max(0.08, dc*0.035)) sil = 1.0;
    // 다른 캐릭터 파츠(ID 경계)
    if(isChar && nn1.a > 0.45 && abs(nn1.a-id) > 0.012 && d1 >= dc - 0.02) sil = max(sil, 0.75);
    vec4 nn2 = texture2D(tNrm, vUv+o2);
    float d2 = lin(texture2D(tDep, vUv+o2).r);
    if(isChar && nn2.a > 0.45){
      float nd = 1.0 - dot(n0, nn2.xyz*2.0-1.0);
      if(nd > 0.35) inn = max(inn, 0.85);
    }
  }
  float lum = dot(c, vec3(0.3,0.55,0.15));
  float warm = clamp((c.r - c.b)*2.6 + (lum-0.45)*1.2, 0.0, 1.0);
  vec3 inkDark = mix(vec3(0.13,0.09,0.12), vec3(0.20,0.12,0.12), uDawn);
  vec3 inkCold = vec3(0.10,0.13,0.30);
  vec3 inkWarm = vec3(0.80,0.42,0.16);
  vec3 lineCol = mix(inkDark, inkCold, clamp(0.55 - lum*1.2, 0.0, 1.0));
  lineCol = mix(lineCol, inkWarm, step(0.5, warm)*0.9);
  float line = max(sil, inn*0.8);
  // 선의 끊김/잉크 농담
  line *= 0.82 + 0.18*vn2(vUv*uRes/9.0 + uSeed);
  vec3 col = mix(c, lineCol, line);
  vec4 fx = texture2D(tFx, vUv);
  col = mix(col, fx.rgb, fx.a);
  gl_FragColor = vec4(col, 1.0);
}`;

export const BRIGHT_FS = /* glsl */`
uniform sampler2D tSrc; varying vec2 vUv;
void main(){ vec3 c = texture2D(tSrc, vUv).rgb; float l = max(max(c.r,c.g),c.b); gl_FragColor = vec4(c*smoothstep(0.78, 1.0, l), 1.0); }`;
export const BLUR_FS = /* glsl */`
uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv;
void main(){
  vec3 s = texture2D(tSrc, vUv).rgb*0.2270;
  s += texture2D(tSrc, vUv+uDir*1.3846).rgb*0.3162; s += texture2D(tSrc, vUv-uDir*1.3846).rgb*0.3162;
  s += texture2D(tSrc, vUv+uDir*3.2308).rgb*0.0703; s += texture2D(tSrc, vUv-uDir*3.2308).rgb*0.0703;
  gl_FragColor = vec4(s,1.0);
}`;

// 최종: 게이트 위브, 할레이션, 들뜬 블랙, 필름 색 틀어짐, 그레인, 종이결, 하모니(회화) 프레임
export const FINAL_FS = /* glsl */`
${NOISE}
uniform sampler2D tInk; uniform sampler2D tBloom; uniform sampler2D tPaper;
uniform vec2 uRes; uniform vec2 uWeave; uniform float uFrame; uniform float uPaint; uniform float uFade; uniform float uHal; uniform float uFlash;
varying vec2 vUv;
vec3 kuwahara(vec2 uv){
  vec2 px = 1.0/uRes; const int R = 3;
  vec3 m[4]; vec3 s[4];
  for(int k=0;k<4;k++){ m[k]=vec3(0.0); s[k]=vec3(0.0); }
  for(int j=-R;j<=0;j++) for(int i=-R;i<=0;i++){ vec3 c=texture2D(tInk, uv+vec2(i,j)*px*1.6).rgb; m[0]+=c; s[0]+=c*c; }
  for(int j=-R;j<=0;j++) for(int i=0;i<=R;i++){ vec3 c=texture2D(tInk, uv+vec2(i,j)*px*1.6).rgb; m[1]+=c; s[1]+=c*c; }
  for(int j=0;j<=R;j++) for(int i=0;i<=R;i++){ vec3 c=texture2D(tInk, uv+vec2(i,j)*px*1.6).rgb; m[2]+=c; s[2]+=c*c; }
  for(int j=0;j<=R;j++) for(int i=-R;i<=0;i++){ vec3 c=texture2D(tInk, uv+vec2(i,j)*px*1.6).rgb; m[3]+=c; s[3]+=c*c; }
  float n = float((R+1)*(R+1)); float best = 1e9; vec3 res = vec3(0.0);
  for(int k=0;k<4;k++){ vec3 mm=m[k]/n; vec3 v=abs(s[k]/n-mm*mm); float vv=v.r+v.g+v.b; if(vv<best){best=vv; res=mm;} }
  return res;
}
void main(){
  vec2 uv = vUv + uWeave/uRes;
  vec3 col = texture2D(tInk, uv).rgb;
  if(uPaint > 0.0){
    vec3 k = kuwahara(uv);
    float p = texture2D(tPaper, uv*uRes/1024.0*0.9).r;
    k *= 0.93 + 0.14*p;
    k = mix(vec3(dot(k,vec3(0.33))), k, 1.12);
    col = mix(col, k, uPaint);
  }
  vec3 bl = texture2D(tBloom, uv).rgb;
  col += bl*vec3(1.0,0.62,0.42)*uHal + bl*vec3(0.25,0.3,0.45)*uHal*0.35;
  // 필름 전사 색감: 섀도는 청록, 하이라이트는 따뜻하게, 블랙은 살짝 들뜸
  float l = dot(col, vec3(0.3,0.55,0.15));
  col = mix(col*vec3(0.96,1.0,1.06), col*vec3(1.04,1.0,0.95), smoothstep(0.2,0.8,l));
  col = col*0.93 + vec3(0.045,0.042,0.07);
  // 셀/종이결
  float pap = texture2D(tPaper, uv*uRes/1024.0).r;
  col *= 0.975 + 0.05*pap;
  // 그레인 (프레임마다 변함, 중간톤에 강하게)
  float g = hash12(floor(vUv*uRes) + vec2(uFrame*17.0, uFrame*31.0)) - 0.5;
  float g2 = hash12(floor(vUv*uRes*0.5) + vec2(uFrame*7.0, uFrame*13.0)) - 0.5;
  col += (g*0.6+g2*0.4)*0.055*(0.35+l*(1.0-l)*2.6);
  // 비네팅
  vec2 q = vUv-0.5; col *= 1.0 - dot(q*vec2(1.0,0.8), q*vec2(1.0,0.8))*0.75;
  col += uFlash;
  col *= uFade;
  // 프레임 가장자리 게이트 그림자
  float edgeX = smoothstep(0.0, 0.004, uv.x)*smoothstep(1.0, 0.996, uv.x);
  float edgeY = smoothstep(0.0, 0.006, uv.y)*smoothstep(1.0, 0.994, uv.y);
  col *= edgeX*edgeY;
  gl_FragColor = vec4(clamp(col,0.0,1.0), 1.0);
}`;
