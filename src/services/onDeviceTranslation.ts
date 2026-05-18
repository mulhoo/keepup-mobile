/**
 * On-device translation using Gemma 4 E2B via Transformers.js (ONNX).
 * Student message content is translated entirely in the browser — never sent to a server.
 * This enforces COPPA/FERPA compliance at the model boundary.
 *
 * The Transformers.js library is loaded from CDN at runtime (webpackIgnore) to avoid
 * webpack bundling incompatibilities with its webpack-specific ESM internals.
 */

const TRANSFORMERS_CDN = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0/dist/transformers.web.min.js';

const MODEL_ID    = 'onnx-community/gemma-4-E2B-it-ONNX';
const MODEL_DTYPE = 'q4f16';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';
interface LoadProgress { loaded: number; total: number }

let _pipe: any    = null;
let _loadState: LoadState = 'idle';
let _loadPromise: Promise<void> | null = null;

const _listeners = new Set<(state: LoadState, progress?: LoadProgress) => void>();

function _notify(state: LoadState, progress?: LoadProgress) {
  _loadState = state;
  _listeners.forEach(fn => fn(state, progress));
}

export function subscribeToModelState(fn: (state: LoadState, progress?: LoadProgress) => void) {
  _listeners.add(fn);
  fn(_loadState);
  return () => _listeners.delete(fn);
}

export function getModelLoadState(): LoadState {
  return _loadState;
}

export async function ensureModelLoaded(): Promise<void> {
  if (_pipe) return;
  if (_loadPromise) return _loadPromise;

  _loadPromise = (async () => {
    try {
      _notify('loading');

      // webpackIgnore keeps webpack from bundling this — loads as native browser dynamic import
      const { pipeline, env } = await import(/* webpackIgnore: true */ TRANSFORMERS_CDN as any);

      env.allowLocalModels   = false;
      env.useBrowserCache    = true;

      _pipe = await pipeline('text-generation', MODEL_ID, {
        dtype:  MODEL_DTYPE,
        device: (typeof navigator !== 'undefined' && 'gpu' in (navigator as any)) ? 'webgpu' : 'wasm',
        progress_callback: (info: any) => {
          if (info.status === 'progress' && info.total) {
            _notify('loading', { loaded: info.loaded ?? 0, total: info.total });
          }
        },
      });

      _notify('ready');
    } catch (err) {
      _loadState    = 'error';
      _loadPromise  = null;
      _notify('error');
      throw err;
    }
  })();

  return _loadPromise;
}

const SYSTEM_PROMPT = `You are a translator for KeepUp, a high school sports communication platform.
Translate the message below into {LANG}. Output ONLY the translation — no preamble, no quotes, no explanation.
Preserve tone and formatting. Keep proper nouns (school names, athlete names) in their original form.`;

export async function translateOnDevice(text: string, targetLanguage: string): Promise<string> {
  if (!_pipe) await ensureModelLoaded();
  if (!_pipe) throw new Error('Model not loaded');

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT.replace('{LANG}', targetLanguage) },
    { role: 'user',   content: text },
  ];

  const result = await _pipe(messages, { max_new_tokens: 512, do_sample: false });

  const raw: string = result?.[0]?.generated_text ?? '';
  const lastAssistant = raw.split('<start_of_turn>assistant\n').pop() ?? raw;
  return lastAssistant.replace(/<end_of_turn>/g, '').trim();
}
