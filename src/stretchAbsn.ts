import Kali from "./Kali";

export function stretchAbsn(
  absn: AudioBufferSourceNode,
  playbackRate: number
): AudioBufferSourceNode {
  const audioBuffer = absn.buffer;
  const arrayBufferByteLength = audioBuffer?.length;
  const inputData = audioBuffer!.getChannelData(0);
  const output = doStretch(inputData, playbackRate);
  const context2 = new AudioContext();
  const source2 = context2.createBufferSource();
  const audioBuffer2 = context2.createBuffer(
    1,
    Math.ceil(arrayBufferByteLength! * (1.0 / playbackRate)),
    44100
  );
  audioBuffer2.copyToChannel(output, 0, 0);
  source2.buffer = audioBuffer2;
  source2.connect(context2.destination);
  return source2;
}

function doStretch(
  inputData: Float32Array,
  playbackRate: number,
  numChannels: number = 1
): Float32Array {
  const numInputFrames = inputData.length / numChannels;
  const bufsize = 4096 * numChannels;
  const stretchFactor = playbackRate;

  // Create a Kali instance and initialize it
  const kali = new Kali(numChannels);
  kali.setup(44100, stretchFactor);

  // Create an array for the stretched output. Note if the rate is changing, this array won't be completely full
  const completed = new Float32Array(
    (numInputFrames / stretchFactor) * numChannels
  );

  let inputOffset: number = 0;
  let completedOffset: number = 0;
  let loopCount: number = 0;
  let flushed = false;

  while (completedOffset < completed.length || inputOffset < inputData.length) {
    if (loopCount % 50 == 0) {
      kali.setTempo(stretchFactor);
    }

    // Read stretched samples into our output array
    completedOffset += kali.output(
      completed.subarray(
        completedOffset,
        Math.min(completedOffset + bufsize, completed.length)
      )
    );

    if (inputOffset < inputData.length) {
      // If we have more data to write, write it
      const dataToInput: Float32Array = inputData.subarray(
        inputOffset,
        Math.min(inputOffset + bufsize, inputData.length)
      );
      inputOffset += dataToInput.length;

      // Feed Kali samples
      kali.input(dataToInput);
      kali.process();
    } else if (!flushed) {
      // Flush if we haven't already
      kali.flush();
      flushed = true;
    }

    loopCount++;
    // if (rates.START_RATE == 0.5) {
    //   console.log(completed);
    // }
  }

  return completed;
}
