import test from 'node:test';
import assert from 'node:assert/strict';
import { computeAudioBands, formatTrackTime } from './visualizerMath';

test('computeAudioBands returns zero bands for empty input', () => {
  assert.deepEqual(computeAudioBands([]), {
    bass: 0,
    mid: 0,
    treble: 0,
    overall: 0,
  });
});

test('computeAudioBands normalizes low, mid, and high frequency bins', () => {
  const bins = new Uint8Array(10);
  bins[0] = 255;
  bins[1] = 255;
  bins[2] = 128;
  bins[3] = 128;
  bins[4] = 128;
  bins[5] = 0;
  bins[6] = 255;
  bins[7] = 0;
  bins[8] = 0;
  bins[9] = 0;

  const bands = computeAudioBands(bins);
  assert.equal(bands.bass, 1);
  assert.ok(bands.mid > 0.49 && bands.mid < 0.52);
  assert.ok(bands.treble > 0.19 && bands.treble < 0.21);
  assert.ok(bands.overall > 0.6);
});

test('formatTrackTime formats seconds as m:ss', () => {
  assert.equal(formatTrackTime(0), '0:00');
  assert.equal(formatTrackTime(9.8), '0:09');
  assert.equal(formatTrackTime(16), '0:16');
  assert.equal(formatTrackTime(75), '1:15');
});
