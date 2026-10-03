function createRetrievalProgress(totalFiles, totalBytes, now = () => performance.now()) {
  const started = now();
  const samples = [{ time: started, bytes: 0 }];
  let lastBytes = 0;
  let lastMovement = started;
  return (transferredBytes, completedFiles, reusedBytes = 0) => {
    const time = now();
    if (transferredBytes > lastBytes) lastMovement = time;
    lastBytes = transferredBytes;
    samples.push({ time, bytes: transferredBytes });
    while (samples.length > 2 && samples[1].time < time - 8000) samples.shift();
    const elapsed = time - samples[0].time;
    const rate = elapsed >= 3000 && time - lastMovement < 3000
      ? (transferredBytes - samples[0].bytes) * 1000 / elapsed : null;
    const remaining = totalBytes === null ? null : totalBytes - reusedBytes - transferredBytes;
    return {
      totalFiles, totalBytes, completedFiles, transferredBytes, reusedBytes,
      percent: totalFiles ? Math.floor(completedFiles * 100 / totalFiles) : 0,
      bytesPerSecond: rate > 0 ? Math.round(rate) : null,
      etaSeconds: rate > 0 && remaining > 0 ? Math.ceil(remaining / rate) : null,
    };
  };
}

module.exports = { createRetrievalProgress };
