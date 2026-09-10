export function getFullscreenElement(doc = document) {
  return doc.fullscreenElement || doc.webkitFullscreenElement || null;
}

export function isElementFullscreen(element, doc = document) {
  const current = getFullscreenElement(doc);
  return Boolean(current && (current === element || element?.contains?.(current)));
}

export function isVideoNativeFullscreen(video) {
  return Boolean(video?.webkitDisplayingFullscreen);
}

export async function enterPlayerFullscreen({ container, video } = {}) {
  if (container?.requestFullscreen) {
    return container.requestFullscreen();
  }
  if (container?.webkitRequestFullscreen) {
    return container.webkitRequestFullscreen();
  }
  if (video?.webkitEnterFullscreen) {
    video.webkitEnterFullscreen();
    return;
  }
  throw new Error('Fullscreen is not supported');
}

export async function exitPlayerFullscreen(doc = document, video) {
  if (isVideoNativeFullscreen(video) && video?.webkitExitFullscreen) {
    video.webkitExitFullscreen();
    return;
  }
  if (doc.exitFullscreen) {
    return doc.exitFullscreen();
  }
  if (doc.webkitExitFullscreen) {
    return doc.webkitExitFullscreen();
  }
}

export async function togglePlayerFullscreen({ container, video, doc = document } = {}) {
  if (isElementFullscreen(container, doc) || isVideoNativeFullscreen(video)) {
    return exitPlayerFullscreen(doc, video);
  }
  return enterPlayerFullscreen({ container, video });
}
