const presets = {
  configuration: {
    target: {
      server: {
        port: 3000,
        headers: { accept: 'application/json' }
      },
      plugins: ['core']
    },
    source: {
      server: {
        port: 8080,
        headers: { authorization: 'Bearer token' }
      },
      plugins: ['metrics']
    }
  },
  security: {
    target: { role: 'reader', profile: { active: true } },
    sourceText: `{
  "profile": {
    "name": "Ada",
    "constructor": {
      "prototype": { "isAdmin": true }
    },
    "__proto__": { "polluted": true }
  }
}`
  },
  arrays: {
    target: {
      regions: ['ca-central-1'],
      plugins: [{ name: 'core', enabled: true }]
    },
    source: {
      regions: ['us-east-1'],
      plugins: [{ name: 'metrics', enabled: true }]
    }
  },
  mismatch: {
    target: { feature: { mode: 'object', enabled: true } },
    source: { feature: ['source', 'wins'] }
  }
};

const elements = {
  copyResult: document.querySelector('#copy-result-button'),
  depth: document.querySelector('#max-depth'),
  keys: document.querySelector('#max-keys'),
  merge: document.querySelector('#merge-button'),
  modeButtons: Array.from(document.querySelectorAll('[data-mode]')),
  output: document.querySelector('#result-output'),
  preset: document.querySelector('#preset-select'),
  prototypeStatus: document.querySelector('#prototype-status'),
  reset: document.querySelector('#reset-button'),
  share: document.querySelector('#share-button'),
  source: document.querySelector('#source-input'),
  status: document.querySelector('#status-text'),
  statusIndicator: document.querySelector('#status-indicator'),
  swap: document.querySelector('#swap-button'),
  target: document.querySelector('#target-input'),
  timing: document.querySelector('#timing-text'),
  version: document.querySelector('#package-version')
};

let mode = 'skip';
let debounceTimer;

loadVersion();
restoreState();
bindEvents();
runMerge();

function bindEvents() {
  elements.merge.addEventListener('click', runMerge);
  elements.preset.addEventListener('change', () => {
    applyPreset(elements.preset.value);
    runMerge();
  });
  elements.modeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      setMode(button.dataset.mode);
      runMerge();
    });
  });
  for (const input of [elements.target, elements.source, elements.depth, elements.keys]) {
    input.addEventListener('input', scheduleMerge);
  }
  elements.swap.addEventListener('click', () => {
    const target = elements.target.value;
    elements.target.value = elements.source.value;
    elements.source.value = target;
    elements.preset.value = '';
    runMerge();
  });
  elements.reset.addEventListener('click', () => {
    elements.preset.value = 'configuration';
    elements.depth.value = '1000';
    elements.keys.value = '100000';
    setMode('skip');
    applyPreset('configuration');
    runMerge();
  });
  elements.copyResult.addEventListener('click', async () => {
    await copyText(elements.output.textContent);
    flashButton(elements.copyResult, 'Copied');
  });
  elements.share.addEventListener('click', async () => {
    persistState();
    await copyText(location.href);
    flashButton(elements.share, 'Link copied');
  });
  document.querySelectorAll('[data-copy]').forEach((button) => {
    button.addEventListener('click', async () => {
      await copyText(button.dataset.copy);
      flashButton(button, 'Copied');
    });
  });
}

function scheduleMerge() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(runMerge, 220);
}

function runMerge() {
  const prototypeBefore = Object.getOwnPropertyNames(Object.prototype)
    .sort()
    .join('\u0000');
  const startedAt = performance.now();

  try {
    const target = JSON.parse(elements.target.value);
    const source = JSON.parse(elements.source.value);
    const options = {
      maxDepth: parseLimit(elements.depth.value, 'Max depth'),
      maxKeys: parseLimit(elements.keys.value, 'Max keys'),
      onUnsafeKey: mode
    };
    const result = globalThis.StacklineDeepmerge(target, source, options);
    const elapsed = performance.now() - startedAt;

    elements.output.textContent = JSON.stringify(result, null, 2);
    setStatus('Merge completed', false, elapsed);
  } catch (error) {
    const elapsed = performance.now() - startedAt;
    elements.output.textContent = `${error.name}: ${error.message}`;
    setStatus('Merge rejected', true, elapsed);
  }

  const prototypeAfter = Object.getOwnPropertyNames(Object.prototype)
    .sort()
    .join('\u0000');
  const untouched = prototypeBefore === prototypeAfter;
  elements.prototypeStatus.textContent = untouched
    ? 'Object.prototype unchanged'
    : 'Object.prototype changed';
  persistState();
}

function parseLimit(value, label) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new TypeError(`${label} must be a non-negative integer`);
  }
  return parsed;
}

function setStatus(message, isError, elapsed) {
  elements.status.textContent = message;
  elements.statusIndicator.classList.toggle('error', isError);
  elements.timing.textContent = `${elapsed.toFixed(3)} ms`;
}

function setMode(nextMode) {
  mode = nextMode === 'throw' ? 'throw' : 'skip';
  elements.modeButtons.forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
  });
}

function applyPreset(name) {
  const preset = presets[name] || presets.configuration;
  elements.target.value = JSON.stringify(preset.target, null, 2);
  elements.source.value = preset.sourceText || JSON.stringify(preset.source, null, 2);
}

function persistState() {
  const params = new URLSearchParams({
    depth: elements.depth.value,
    keys: elements.keys.value,
    mode,
    source: elements.source.value,
    target: elements.target.value
  });
  history.replaceState(null, '', `${location.pathname}${location.search}#${params}`);
}

function restoreState() {
  const params = new URLSearchParams(location.hash.slice(1));
  if (params.has('target') && params.has('source')) {
    elements.target.value = params.get('target');
    elements.source.value = params.get('source');
    elements.depth.value = params.get('depth') || '1000';
    elements.keys.value = params.get('keys') || '100000';
    elements.preset.value = '';
    setMode(params.get('mode'));
    return;
  }
  applyPreset('configuration');
  setMode('skip');
}

async function loadVersion() {
  try {
    const response = await fetch('./package-meta.json');
    if (!response.ok) return;
    const metadata = await response.json();
    elements.version.textContent = `v${metadata.version}`;
  } catch {
    // The HTML already contains the current release as a static fallback.
  }
}

async function copyText(value) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const temporary = document.createElement('textarea');
  temporary.value = value;
  temporary.setAttribute('readonly', '');
  temporary.style.position = 'fixed';
  temporary.style.opacity = '0';
  document.body.appendChild(temporary);
  temporary.select();
  document.execCommand('copy');
  temporary.remove();
}

function flashButton(button, label) {
  const original = button.textContent;
  button.textContent = label;
  setTimeout(() => {
    button.textContent = original;
  }, 1200);
}
