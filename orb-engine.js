/*
 * OrbEngine — shared WebGL renderer for the Spiralis logo-orb.
 * Used by index.html (production hero) and orbe-lab.html (tuning tool).
 * Exposes a live-mutable params/transform/timeline surface so callers
 * (including a debug UI) can drive the animation without touching GL code.
 */
window.OrbEngine = (function () {
  var VS = "attribute vec2 aPos;varying vec2 vUv;void main(){vUv=aPos*.5+.5;gl_Position=vec4(aPos,0.,1.);}";

  var FS = [
    "precision highp float;",
    "varying vec2 vUv;",
    "uniform float uTime,uSpeed,uOrbBreath,uMouseAmt,uOrbSize,uOrbBlend,uOrbGrain,uMorph,uLogoScale,uTransMode,uForceFx;",
    "uniform float uLogoBreath,uLogoIntensity,uLogoWobble,uLogoPulse,uLogoBlend,uLogoGrain;",
    "uniform vec2 uRes,uMouse,uLogoPos;",
    "uniform vec3 uC1,uC2,uC3,uBg;",
    "uniform sampler2D uLogo;",
    "float blob(vec2 p,vec2 c,float s){float d=length(p-c)/s;return exp(-d*d*2.2);}",
    "float h21(vec2 p,float t){return fract(sin(dot(p+t*.1,vec2(127.1,311.7)))*43758.5453);}",
    "float logoTex(vec2 q){return texture2D(uLogo,vec2(clamp(q.x,0.,1.),1.-clamp(q.y,0.,1.))).r;}",
    // transition variants: how the two halves of the logo swim toward their free-floating orb positions
    "vec2 pathCurve(vec2 s,vec2 e,float dd,float ph,float ls){",
    "  vec2 dir=e-s;vec2 pp=normalize(vec2(-dir.y,dir.x)+vec2(1e-5));",
    "  return mix(s,e,dd)+pp*sin(dd*6.3+ph)*(dd*(1.-dd)*4.)*.14*ls;}",
    "vec2 pathLine(vec2 s,vec2 e,float dd){return mix(s,e,dd);}",
    "vec2 pathSpiral(vec2 s,vec2 e,float dd,float ph,float ls){",
    "  vec2 mid=mix(s,e,dd);float ang=ph+dd*16.0;float rad=(1.0-dd)*length(e-s)*0.4;",
    "  return mid+vec2(cos(ang),sin(ang))*rad;}",
    "vec2 pathZigzag(vec2 s,vec2 e,float dd,float ph,float ls){",
    "  vec2 dir=e-s;vec2 pp=normalize(vec2(-dir.y,dir.x)+vec2(1e-5));",
    "  float elastic=dd>=1.0?1.0:pow(2.0,-9.0*dd)*sin((dd-0.075)*(2.0*3.14159265)/0.3)+1.0;",
    "  vec2 base=mix(s,e,clamp(elastic,0.0,1.25));",
    "  float zig=sin(dd*26.0+ph)*(dd*(1.-dd)*4.)*.10*ls;",
    "  return base+pp*zig;}",
    "vec2 pathGravity(vec2 s,vec2 e,float dd){",
    "  vec2 d=e-s;float fy=dd*dd;vec2 p=s+vec2(d.x*dd,d.y*fy);",
    "  float bounce=abs(sin(dd*6.2831))*(1.0-dd)*0.05*step(0.65,dd);",
    "  p.y+=bounce;return p;}",
    "vec2 path(vec2 s,vec2 e,float dd,float ph,float ls,float mode){",
    "  dd=clamp(dd,0.,1.);",
    "  if(mode<0.5)return pathCurve(s,e,dd,ph,ls);",
    "  if(mode<1.5)return pathLine(s,e,dd);",
    "  if(mode<2.5)return pathSpiral(s,e,dd,ph,ls);",
    "  if(mode<3.5)return pathZigzag(s,e,dd,ph,ls);",
    "  return pathGravity(s,e,dd);}",
    "void main(){",
    "  float ar=uRes.x/uRes.y;vec2 uv=vec2(vUv.x*ar,vUv.y);",
    "  float t=uTime*.38*uSpeed;vec2 m=vec2(uMouse.x*ar,uMouse.y);",
    "  float ep=uMorph;",
    "  float s1=uOrbSize*(1.+uOrbBreath*.05*sin(t*.70));",
    "  float s2=uOrbSize*.95*(1.+uOrbBreath*.04*cos(t*.85+1.));",
    "  float s3=uOrbSize*.90*(1.+uOrbBreath*.05*sin(t*.60+2.1));",
    "  vec2 c1n=vec2(ar*(.18+.12*sin(t*.55))+(m.x-.5)*ar*.10*uMouseAmt,.28+.11*cos(t*.43)+(m.y-.5)*.08*uMouseAmt);",
    "  vec2 c2n=vec2(ar*(.82+.10*cos(t*.48+1.2))+(m.x-.5)*ar*(-.07)*uMouseAmt,.72+.10*sin(t*.60+.8)+(m.y-.5)*(-.07)*uMouseAmt);",
    "  vec2 c3n=vec2(ar*(.50+.08*sin(t*.35+2.3)),.50+.13*cos(t*.52+1.4)+(m.y-.5)*.04*uMouseAmt);",
    "  vec2 lc=vec2(ar*uLogoPos.x,uLogoPos.y)+(m-vec2(ar*.5,.5))*.05*uMouseAmt;",
    "  float ls=uLogoScale*(1.+.012*uLogoBreath*sin(t*.8));",
    "  float melt=smoothstep(.06,.48,ep);",
    "  float meltFx=mix(melt,1.0,uForceFx);",
    "  float drift=smoothstep(.22,1.,ep);",
    "  vec2 sA=lc+vec2(.06,.16)*ls,sB=lc-vec2(.06,.16)*ls;",
    "  float ph1=t*1.7,ph2=t*1.9+2.6;",
    "  vec2 p1=path(sA,c1n,drift,ph1,ls,uTransMode);",
    "  vec2 p2=path(sB,c2n,drift,ph2,ls,uTransMode);",
    "  vec2 p3=mix(lc,c3n,drift);",
    "  float collapsedA=.30,collapsedC=.42;",
    "  float sz1=mix(collapsedA,s1,drift);",
    "  float sz2=mix(collapsedA,s2,drift);",
    "  float sz3=mix(collapsedC,s3,drift);",
    "  float w1=blob(uv,p1,sz1),w2=blob(uv,p2,sz2),w3=blob(uv,p3,sz3);",
    "  float trail=smoothstep(.04,.30,drift)*(1.-smoothstep(.72,.98,drift));",
    "  float w1t=(blob(uv,path(sA,c1n,drift-.09,ph1,ls,uTransMode),sz1*.72)*.5+blob(uv,path(sA,c1n,drift-.18,ph1,ls,uTransMode),sz1*.5)*.28)*trail;",
    "  float w2t=(blob(uv,path(sB,c2n,drift-.09,ph2,ls,uTransMode),sz2*.72)*.5+blob(uv,path(sB,c2n,drift-.18,ph2,ls,uTransMode),sz2*.5)*.28)*trail;",
    "  float W1=w1+w1t,W2=w2+w2t,tot=W1+W2+w3;",
    "  vec3 o=tot>.001?(uC1*W1+uC2*W2+uC3*w3)/tot:uBg;",
    "  float fOLogo=clamp(tot*uLogoBlend,0.,1.)*(1.0-meltFx);",
    "  float fOOrb=clamp(tot*uOrbBlend,0.,1.)*meltFx;",
    "  float fO=fOLogo+fOOrb;",
    "  float lsE=ls*(1.+ep*.22);",
    "  vec2 lp=(uv-lc)/lsE+.5;",
    "  lp+=vec2(sin(lp.y*11.+t*1.3),cos(lp.x*10.+t*1.1))*uLogoWobble;",
    "  float L=logoTex(lp);",
    "  float fL=clamp(L*uLogoIntensity,0.,1.)*(.92+uLogoPulse*sin(t*.9))*(1.-melt);",
    "  float bl=clamp(fL+fO,0.,1.);",
    "  bl=bl*bl*(3.-2.*bl);",
    "  vec3 col=mix(uBg,o,bl);",
    "  float effGrain=mix(uLogoGrain,uOrbGrain,melt);",
    "  if(effGrain>.001)col+=(h21(vUv*uRes,uTime)-.5)*effGrain*.07;",
    "  gl_FragColor=vec4(clamp(col,0.,1.),1.);}"
  ].join("\n");

  var DEFAULT_COLORS = {
    dark: { c1: [0.4863, 0.3020, 0.8588], c2: [0.6588, 0.4941, 0.9608], c3: [0.2863, 0.0941, 0.6471], bg: [0.0392, 0.0196, 0.0588] },
    light: { c1: [0.72, 0.56, 0.96], c2: [0.86, 0.76, 1.00], c3: [0.58, 0.40, 0.92], bg: [0.97, 0.95, 1.00] }
  };

  // transition mode names, index-aligned with the shader's uTransMode branches
  var TRANSITION_MODES = ['Curva suave', 'Linha reta', 'Espiral', 'Zigzag elástico', 'Queda com gravidade'];

  function buildLogoTexture(gl, pathD) {
    var S = 512, PAD = 70;
    var lcv = document.createElement('canvas');
    lcv.width = lcv.height = S;
    var c2 = lcv.getContext('2d');
    var scl = (S - PAD * 2) / 1000;
    c2.translate(PAD, PAD);
    c2.scale(scl, scl);
    c2.fillStyle = '#fff';
    c2.fill(new Path2D(pathD), 'evenodd');
    var px = c2.getImageData(0, 0, S, S).data;
    var base = new Float32Array(S * S), i;
    for (i = 0; i < S * S; i++) base[i] = px[i * 4 + 3] / 255;
    function box(src, r) {
      var w = 2 * r + 1, tmp = new Float32Array(S * S), out = new Float32Array(S * S), x, y, acc, o;
      for (y = 0; y < S; y++) {
        o = y * S; acc = 0;
        for (x = -r; x <= r; x++) acc += src[o + Math.min(Math.max(x, 0), S - 1)];
        for (x = 0; x < S; x++) { tmp[o + x] = acc / w; acc += src[o + Math.min(x + r + 1, S - 1)] - src[o + Math.max(x - r, 0)]; }
      }
      for (x = 0; x < S; x++) {
        acc = 0;
        for (y = -r; y <= r; y++) acc += tmp[Math.min(Math.max(y, 0), S - 1) * S + x];
        for (y = 0; y < S; y++) { out[y * S + x] = acc / w; acc += tmp[Math.min(y + r + 1, S - 1) * S + x] - tmp[Math.max(y - r, 0) * S + x]; }
      }
      return out;
    }
    var halo = box(box(box(base, 10), 10), 10);
    var body = box(box(base, 2), 2);
    var u8 = new Uint8Array(S * S);
    for (i = 0; i < S * S; i++) u8[i] = Math.min(255, Math.round((body[i] * .85 + halo[i] * .62) * 255));
    var tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, S, S, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, u8);
    return tex;
  }

  function create(canvas, opts) {
    opts = opts || {};
    var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return null;

    var mk = function (t, s) { var sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); return sh; };
    var prog = gl.createProgram();
    gl.attachShader(prog, mk(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, mk(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var ap = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(ap);
    gl.vertexAttribPointer(ap, 2, gl.FLOAT, false, 0, 0);
    var ul = function (n) { return gl.getUniformLocation(prog, n); };
    var uT = ul('uTime'), uR = ul('uRes'), uMp = ul('uMouse');
    var uC1 = ul('uC1'), uC2 = ul('uC2'), uC3 = ul('uC3'), uBg_ = ul('uBg');
    var uSp = ul('uSpeed'), uOBr = ul('uOrbBreath'), uMa = ul('uMouseAmt'), uOs = ul('uOrbSize'), uOBl = ul('uOrbBlend'), uOGr = ul('uOrbGrain');
    var uMo = ul('uMorph'), uLp = ul('uLogoPos'), uLs = ul('uLogoScale'), uTm = ul('uTransMode'), uFx = ul('uForceFx');
    var uLBr = ul('uLogoBreath'), uLIn = ul('uLogoIntensity'), uLWo = ul('uLogoWobble'), uLPu = ul('uLogoPulse');
    var uLBl = ul('uLogoBlend'), uLGr = ul('uLogoGrain');

    if (opts.logoPathD) {
      gl.uniform1i(ul('uLogo'), 0);
      buildLogoTexture(gl, opts.logoPathD);
    }

    var params = {
      speed: opts.speed != null ? opts.speed : 2.34,
      mouseAmt: opts.mouseAmt != null ? opts.mouseAmt : 1.00,
      // orbe (blobs livres pós-morph) — não afeta a aparência da logo parada
      orbBreath: opts.orbBreath != null ? opts.orbBreath : 3.00,
      orbSize: opts.orbSize != null ? opts.orbSize : 0.52,
      orbBlend: opts.orbBlend != null ? opts.orbBlend : 1.15,
      orbGrain: opts.orbGrain != null ? opts.orbGrain : 0.19,
      // logo (ícone parado) — independente dos parâmetros da orbe acima
      logoBreath: opts.logoBreath != null ? opts.logoBreath : 3.00,
      logoIntensity: opts.logoIntensity != null ? opts.logoIntensity : 1.45,
      logoWobble: opts.logoWobble != null ? opts.logoWobble : 0.006,
      logoPulse: opts.logoPulse != null ? opts.logoPulse : 0.08,
      logoBlend: opts.logoBlend != null ? opts.logoBlend : 0,
      logoGrain: opts.logoGrain != null ? opts.logoGrain : 0.19,
      transitionMode: opts.transitionMode || 0,
      previewAtRest: opts.previewAtRest || false,
      theme: opts.theme || 'dark',
      colorLerpSpeed: 0.04
    };
    var transform = {
      pos: (opts.logoPos || [.74, .50]).slice(),
      scale: opts.logoScale != null ? opts.logoScale : 0.88
    };
    var timeline = {
      hold: opts.logoHold != null ? opts.logoHold : 5600,
      dur: opts.morphDur != null ? opts.morphDur : 4200
    };
    var morphT0 = performance.now();
    var morphPin = -1;

    var colors = {
      dark: clone(DEFAULT_COLORS.dark),
      light: clone(DEFAULT_COLORS.light),
      cur: null
    };
    if (opts.colors) {
      if (opts.colors.dark) colors.dark = clone(opts.colors.dark);
      if (opts.colors.light) colors.light = clone(opts.colors.light);
    }
    colors.cur = clone(colors[params.theme] || colors.dark);

    function clone(c) { return { c1: c.c1.slice(), c2: c.c2.slice(), c3: c.c3.slice(), bg: c.bg.slice() }; }
    function lerpC(a, b, t) { a[0] += (b[0] - a[0]) * t; a[1] += (b[1] - a[1]) * t; a[2] += (b[2] - a[2]) * t; }

    function setColorsImmediate(next) {
      ['c1', 'c2', 'c3', 'bg'].forEach(function (k) {
        if (!next[k]) return;
        colors.cur[k] = next[k].slice();
        colors.dark[k] = next[k].slice();
        colors.light[k] = next[k].slice();
      });
    }

    var mouse = [.5, .5], tm = [.5, .5];
    function lerp(a, b, t) { return a + (b - a) * t; }
    function onMouseMove(e) {
      var r = canvas.getBoundingClientRect();
      tm[0] = e.clientX / (window.innerWidth || r.width);
      tm[1] = 1 - ((e.clientY - r.top) / r.height);
    }
    function onTouchMove(e) {
      var r = canvas.getBoundingClientRect();
      tm[0] = e.touches[0].clientX / (window.innerWidth || r.width);
      tm[1] = 1 - ((e.touches[0].clientY - r.top) / r.height);
    }
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('touchmove', onTouchMove, { passive: true });

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = canvas.clientWidth || canvas.offsetWidth;
      var h = canvas.clientHeight || canvas.offsetHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    }

    var raf = null, t0 = performance.now(), running = false;
    function renderFrame() {
      var t = (performance.now() - t0) / 1000;
      mouse[0] = lerp(mouse[0], tm[0], .048);
      mouse[1] = lerp(mouse[1], tm[1], .048);
      var tgt = colors[params.theme] || colors.dark;
      lerpC(colors.cur.c1, tgt.c1, params.colorLerpSpeed);
      lerpC(colors.cur.c2, tgt.c2, params.colorLerpSpeed);
      lerpC(colors.cur.c3, tgt.c3, params.colorLerpSpeed);
      lerpC(colors.cur.bg, tgt.bg, params.colorLerpSpeed);
      gl.uniform1f(uT, t);
      gl.uniform2f(uR, canvas.width, canvas.height);
      gl.uniform2f(uMp, mouse[0], mouse[1]);
      gl.uniform3fv(uC1, colors.cur.c1);
      gl.uniform3fv(uC2, colors.cur.c2);
      gl.uniform3fv(uC3, colors.cur.c3);
      gl.uniform3fv(uBg_, colors.cur.bg);
      gl.uniform1f(uSp, params.speed);
      gl.uniform1f(uOBr, params.orbBreath);
      gl.uniform1f(uMa, params.mouseAmt);
      gl.uniform1f(uOs, params.orbSize);
      gl.uniform1f(uLBr, params.logoBreath);
      gl.uniform1f(uLIn, params.logoIntensity);
      gl.uniform1f(uLWo, params.logoWobble);
      gl.uniform1f(uLPu, params.logoPulse);
      gl.uniform1f(uLBl, params.logoBlend);
      gl.uniform1f(uLGr, params.logoGrain);
      gl.uniform1f(uOBl, params.orbBlend);
      gl.uniform1f(uOGr, params.orbGrain);
      gl.uniform1f(uTm, params.transitionMode);
      gl.uniform1f(uFx, params.previewAtRest ? 1 : 0);
      var mp;
      if (morphPin >= 0) {
        mp = morphPin;
      } else {
        mp = (performance.now() - morphT0 - timeline.hold) / timeline.dur;
        mp = Math.min(Math.max(mp, 0), 1);
        mp = mp < .5 ? 4 * mp * mp * mp : 1 - Math.pow(-2 * mp + 2, 3) / 2;
      }
      gl.uniform1f(uMo, mp);
      gl.uniform2f(uLp, transform.pos[0], transform.pos[1]);
      gl.uniform1f(uLs, transform.scale);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    function frame() {
      renderFrame();
      if (running) raf = requestAnimationFrame(frame);
    }

    var controls = {
      hold: function () { morphPin = -1; morphT0 = performance.now() + 1e12; },
      play: function () { morphPin = -1; morphT0 = performance.now() - timeline.hold; },
      reset: function () { morphPin = -1; morphT0 = performance.now(); },
      pin: function (p) { morphPin = Math.min(Math.max(p, 0), 1); },
      unpin: function () { morphPin = -1; },
      getProgress: function () {
        if (morphPin >= 0) return morphPin;
        var mp = (performance.now() - morphT0 - timeline.hold) / timeline.dur;
        return Math.min(Math.max(mp, 0), 1);
      }
    };

    function start() { if (running) return; running = true; resize(); frame(); }
    function stop() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
    }
    function destroy() {
      stop();
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('touchmove', onTouchMove);
    }

    return {
      gl: gl,
      canvas: canvas,
      params: params,
      transform: transform,
      timeline: timeline,
      colors: colors,
      controls: controls,
      transitionModes: TRANSITION_MODES.slice(),
      setColorsImmediate: setColorsImmediate,
      resize: resize,
      start: start,
      stop: stop,
      renderOnce: renderFrame,
      destroy: destroy
    };
  }

  return { create: create, TRANSITION_MODES: TRANSITION_MODES };
})();
