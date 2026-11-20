import * as THREE from "three";
import { GPUComputationRenderer } from "three/examples/jsm/misc/GPUComputationRenderer.js";
import { velocityShader, positionShader, renderVertex, renderFragment } from "./shaders/particles.js";
import { damp } from "../core/math.js";

// GPU particle engine. Particles are attracted to a target texture of points
// sampled from the vehicle mesh (formed), or drift as a loose cloud
// (scattered). Pointer repulsion and the disintegration burst are shader
// forces; the CPU only drives a handful of uniforms per frame.

export class ParticleEngine {
  constructor(renderer, side, { reducedMotion = false } = {}) {
    this.renderer = renderer;
    this.side = side;
    this.count = side * side;
    this.reducedMotion = reducedMotion;
    this.mix = 0;
    this.mixTarget = 0;
    this.mixRate = 1.8;
    this.impulse = 0;
    this.hasTarget = false;
    this.fade = 0;
    this.fadeTarget = 0;
    this.time = 0;
    this.ok = false;
    this.pointer = new THREE.Vector3(0, -99, 0);
    this.pointerActive = 0;
    this.pointerActiveTarget = 0;
    this._build();
  }

  _build() {
    const { renderer, side } = this;
    const gpu = new GPUComputationRenderer(side, side, renderer);
    this.gpu = gpu;

    const pos = gpu.createTexture();
    const vel = gpu.createTexture();
    const pd = pos.image.data;
    for (let i = 0; i < this.count; i++) {
      pd[i * 4] = (Math.random() - 0.5) * 12;
      pd[i * 4 + 1] = (Math.random() - 0.5) * 6;
      pd[i * 4 + 2] = (Math.random() - 0.5) * 0.6;
      pd[i * 4 + 3] = Math.random();
    }

    this.targetTex = new THREE.DataTexture(
      new Float32Array(this.count * 4),
      side,
      side,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    this.targetTex.minFilter = this.targetTex.magFilter = THREE.NearestFilter;
    this.targetTex.needsUpdate = true;
    // Per-particle colour, taken from the footage.
    this.colourTex = new THREE.DataTexture(new Uint8Array(this.count * 4).fill(235), side, side, THREE.RGBAFormat, THREE.UnsignedByteType);
    this.colourTex.minFilter = this.colourTex.magFilter = THREE.NearestFilter;
    this.colourTex.needsUpdate = true;

    this.velVar = gpu.addVariable("textureVelocity", velocityShader, vel);
    this.posVar = gpu.addVariable("texturePosition", positionShader, pos);
    gpu.setVariableDependencies(this.velVar, [this.velVar, this.posVar]);
    gpu.setVariableDependencies(this.posVar, [this.velVar, this.posVar]);

    const vu = this.velVar.material.uniforms;
    vu.uTarget = { value: this.targetTex };
    vu.uMix = { value: 0 };
    vu.uTime = { value: 0 };
    vu.uDt = { value: 0.016 };
    vu.uRepel = { value: 0 };
    vu.uImpulse = { value: 0 };
    vu.uMotion = { value: this.reducedMotion ? 0.15 : 1 };
    vu.uPointer = { value: this.pointer };
    vu.uCentre = { value: new THREE.Vector3(0, 0, 0) };
    vu.uHalf = { value: new THREE.Vector2(5, 3) };
    this.posVar.material.uniforms.uDt = { value: 0.016 };

    const err = gpu.init();
    if (err) {
      console.warn("[ParticleEngine] GPU compute unavailable:", err);
      this.dispose();
      return;
    }

    const refs = new Float32Array(this.count * 2);
    const seeds = new Float32Array(this.count);
    const dummy = new Float32Array(this.count * 3);
    for (let y = 0; y < side; y++) {
      for (let x = 0; x < side; x++) {
        const i = y * side + x;
        refs[i * 2] = (x + 0.5) / side;
        refs[i * 2 + 1] = (y + 0.5) / side;
        seeds[i] = Math.random();
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(dummy, 3));
    geo.setAttribute("aRef", new THREE.BufferAttribute(refs, 2));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));

    this.material = new THREE.ShaderMaterial({
      vertexShader: renderVertex,
      fragmentShader: renderFragment,
      uniforms: {
        uPos: { value: null },
        uColour: { value: this.colourTex },
        uVel: { value: null },
        uSize: { value: 2.4 * Math.pow(36864 / this.count, 0.35) },
        uPixelRatio: { value: renderer.getPixelRatio() },
        uDensity: { value: 1 },
        uFade: { value: 0 },
        uAccent: { value: new THREE.Color(0xe0213f) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    this.points.visible = false;
    this.ok = true;
  }

  // Provide target points (RGBA floats, scene units) and, once, their colours.
  setTarget(data, colour = null) {
    if (!this.ok) return;
    if (!data) {
      this.hasTarget = false;
      this.mixTarget = 0;
      return;
    }
    this.targetTex.image.data.set(data.subarray(0, this.count * 4));
    this.targetTex.needsUpdate = true;
    if (colour) {
      this.colourTex.image.data.set(colour.subarray(0, this.count * 4));
      this.colourTex.needsUpdate = true;
    }
    this.hasTarget = true;
  }

  // Half the visible width and height in scene units: where the free cloud lives.
  setHalf(x, y) {
    if (this.ok) this.velVar.material.uniforms.uHalf.value.set(x, y);
  }

  set density(v) {
    if (this.ok) this.material.uniforms.uDensity.value = v;
  }

  setPixelRatio(pr) {
    if (this.ok) this.material.uniforms.uPixelRatio.value = pr;
  }

  show(on) {
    this.fadeTarget = on ? 1 : 0;
    if (on && this.ok) this.points.visible = true;
  }

  form() {
    if (!this.hasTarget) return false;
    this.mixTarget = 1;
    this.mixRate = this.reducedMotion ? 6 : 1.7;
    return true;
  }

  scatter() {
    this.mixTarget = 0;
    this.mixRate = 2.2;
  }

  disintegrate() {
    this.impulse = 1;
    this.mixTarget = 0;
    this.mixRate = 1.4;
  }

  get formed() {
    return this.mix > 0.92;
  }

  setPointer(worldPos, active) {
    if (worldPos) this.pointer.copy(worldPos);
    this.pointerActiveTarget = active ? 1 : 0;
  }

  update(dt) {
    if (!this.ok) return;
    this.fade = damp(this.fade, this.fadeTarget, 3.2, dt);
    this.material.uniforms.uFade.value = this.fade;
    if (this.fade < 0.004 && this.fadeTarget === 0) {
      this.points.visible = false;
      return; // nothing visible: skip the simulation entirely
    }

    dt = Math.min(dt, 0.033);
    this.time += dt;
    this.mix = damp(this.mix, this.mixTarget, this.mixRate, dt);
    this.impulse = damp(this.impulse, 0, 9, dt);
    this.pointerActive = damp(this.pointerActive, this.pointerActiveTarget, 12, dt);

    const vu = this.velVar.material.uniforms;
    vu.uMix.value = this.mix;
    vu.uTime.value = this.time;
    vu.uDt.value = dt;
    vu.uRepel.value = this.pointerActive;
    vu.uImpulse.value = this.impulse > 0.01 ? this.impulse : 0;
    this.posVar.material.uniforms.uDt.value = dt;

    this.gpu.compute();
    this.material.uniforms.uPos.value = this.gpu.getCurrentRenderTarget(this.posVar).texture;
    this.material.uniforms.uVel.value = this.gpu.getCurrentRenderTarget(this.velVar).texture;
  }

  dispose() {
    this.points?.geometry.dispose();
    this.material?.dispose();
    this.targetTex?.dispose();
    this.colourTex?.dispose();
    this.velVar?.initialValueTexture?.dispose();
    this.posVar?.initialValueTexture?.dispose();
    // GPUComputationRenderer exposes dispose() in current three releases.
    this.gpu?.dispose?.();
    this.ok = false;
  }
}
