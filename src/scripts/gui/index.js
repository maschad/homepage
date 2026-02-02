import * as dat from 'dat.gui';

const gui = new dat.GUI();
gui.width = 300;
gui.close();

// Remove dat.gui's built-in toggle label ("Open/Close Controls") from the screen.
// (We keep the GUI instance for debugging, but hide its open/close button UI.)
if (typeof window !== 'undefined') {
  const closeButton = gui?.__closeButton || document.querySelector('.dg .close-button');
  if (closeButton && closeButton.style) closeButton.style.display = 'none';
}

export default gui;