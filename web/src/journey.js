// Drives stage stepping for a World and gently re-targets the orbit camera on each stage.
export class Journey {
  constructor(world, controls, onStage) {
    this.world = world; this.controls = controls; this.onStage = onStage; this.i = 0; this._goal = null;
  }
  get count() { return this.world.topic.stages.length; }
  get stage() { return this.world.topic.stages[this.i]; }
  begin() { this.i = 0; this._apply(true); }
  goto(i) { this.i = Math.max(0, Math.min(this.count - 1, i)); this._apply(false); }
  next() { if (this.i < this.count - 1) this.goto(this.i + 1); }
  prev() { if (this.i > 0) this.goto(this.i - 1); }
  replay() { this._apply(false); }
  setMode(mode) { this.world.setMode(mode); this._frame(true); this._notify(); }
  _apply(instant) { this.world.applyStage(this.i); this._frame(instant); this._notify(); }
  _notify() { this.onStage && this.onStage(this.stage, this.i, this.count); }
  _frame(instant) {
    this._goal = this.world.stageCenter(this.stage);
    if (instant && this._goal) { this.controls.target.copy(this._goal); this._goal = null; }
  }
  update(dt) {
    if (this._goal) {
      this.controls.target.lerp(this._goal, Math.min(1, dt * 4));
      if (this.controls.target.distanceTo(this._goal) < 0.04) this._goal = null;
    }
  }
}
