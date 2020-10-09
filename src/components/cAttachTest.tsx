import { h } from 'haptic';
import { signal, computed } from 'haptic/s';
import { css, colours, sizes } from 'styletakeout.macro';

import { hooks } from '../sinuous.js';
import { inSSR, debounce } from '../util.js';

import { HelloMessage } from './cHelloMessage.js';

const AttachTest = (): h.JSX.Element | null => {
  const s = {
    xhrFetchedCommentCount: signal('...'),
    windowSize: signal('...'),
  };
  const onWindowResize = debounce(() => {
    s.windowSize(`${window.innerWidth}px x ${window.innerHeight}px`);
  }, 250);

  computed(() => {
    console.log('Value of xhrFetchedCommentCount:', s.xhrFetchedCommentCount());
  });

  const fetchController = new AbortController();
  hooks.onAttach(() => {
    void fetch('fetchData.txt', { signal: fetchController.signal })
      .then(r => r.text())
      .then(count => s.xhrFetchedCommentCount(count.trim()));
    if (!inSSR) {
      onWindowResize();
      window.addEventListener('resize', onWindowResize);
    }
  });

  hooks.onDetach(() => {
    fetchController.abort();
    if (!inSSR) {
      window.removeEventListener('resize', onWindowResize);
    }
  });

  // SSR
  if (inSSR) hooks.saveSignals(s);
  else if (window.hydrating) return null;

  return (
    <div
      class={css`
        background: ${colours.indigo._200};
        border: 2px solid ${colours.indigo._300};
        margin-top: 15px;
        padding: 20px;
      `}
    >
      <p>The window's size is <span>{s.windowSize}</span></p>
      <p>This post has {s.xhrFetchedCommentCount} comments</p>
      <HelloMessage name="Nested! (Works)"/>
    </div>
  );
};

export { AttachTest };
