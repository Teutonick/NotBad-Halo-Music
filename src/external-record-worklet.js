/* Capture planar PCM on the same frame clock as the HALO transport. */
class HaloExternalRecorder extends AudioWorkletProcessor {
  constructor() {
    super();
    this.take = null;
    this.port.onmessage = ({ data }) => {
      if (data.type === 'begin') {
        this.take = { ...data, size: 0, channels: [new Float32Array(4096), new Float32Array(4096)] };
      } else if (this.take?.id === data.id && data.type === 'end') {
        this.take.end = Math.min(this.take.end, data.end);
      }
    };
  }

  flush() {
    const take = this.take;
    if (!take.size) return;
    const channels = take.channels.map(channel => channel.slice(0, take.size));
    this.port.postMessage({ id: take.id, channels }, channels.map(channel => channel.buffer));
    take.size = 0;
  }

  process(inputs, outputs) {
    const take = this.take;
    if (!take) return true;
    const input = inputs[0];
    const end = Math.min(take.end, currentFrame + outputs[0][0].length);
    for (let frame = Math.max(currentFrame, take.start); frame < end; frame++) {
      const index = frame - currentFrame;
      take.channels[0][take.size] = input[0]?.[index] ?? 0;
      take.channels[1][take.size] = input[1]?.[index] ?? input[0]?.[index] ?? 0;
      if (++take.size === 4096) this.flush();
    }
    if (currentFrame + outputs[0][0].length >= take.end) {
      this.flush();
      this.port.postMessage({ id: take.id, done: true });
      this.take = null;
    }
    return true;
  }
}
registerProcessor('halo-external-recorder', HaloExternalRecorder);
