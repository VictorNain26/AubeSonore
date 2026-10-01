import { StrictMode } from 'react';
import { prerenderToNodeStream } from 'react-dom/static';
import { overwriteGetLocale, type Locale } from './paraglide/runtime.js';
import * as m from './paraglide/messages.js';
import { useLocaleStore } from './stores/localeStore';
import App from './App';

/** The page as a crawler without JavaScript should read it, in one language. */
export async function pageHtml(locale: Locale): Promise<string> {
  overwriteGetLocale(() => locale);
  useLocaleStore.setState({ locale });
  const { prelude } = await prerenderToNodeStream(
    <StrictMode>
      <App />
    </StrictMode>
  );
  const chunks: Buffer[] = [];
  for await (const chunk of prelude) chunks.push(Buffer.from(chunk as Uint8Array));
  return Buffer.concat(chunks).toString('utf8');
}

export function meta(locale: Locale): { title: string; description: string } {
  return {
    title: m.meta_title({}, { locale }),
    description: m.meta_description({}, { locale }),
  };
}
