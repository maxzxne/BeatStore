import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { api } from '../utils/api';

function looksLikeHtml(text) {
  return /<\/?[a-z][\s\S]*>/i.test(text || '');
}

/**
 * CMS legal/footer page. If body empty and legacy provided — render legacy React content.
 */
export default function FooterLegalPageV2({ slug: slugProp, legacy = null }) {
  const params = useParams();
  const slug = slugProp || params.slug;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setMissing(false);
    api
      .get(`/footer-pages/${slug}`)
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch(() => {
        if (!cancelled) {
          setData(null);
          setMissing(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-white/40">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Загрузка…
      </div>
    );
  }

  const useCms = data && !data.use_legacy && (data.body || '').trim();

  if (useCms) {
    const body = data.body.trim();
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="mb-3 text-xs uppercase tracking-[0.3em] text-[#22c55e]">Legal</p>
        <h1 className="mb-6 font-[Syne] text-3xl font-extrabold text-white">{data.title}</h1>
        {looksLikeHtml(body) ? (
          <div
            className="prose-invert space-y-4 text-sm leading-relaxed text-white/70 [&_a]:text-[#22c55e] [&_a]:underline-offset-2 hover:[&_a]:underline [&_em]:italic [&_h2]:mb-2 [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-white [&_li]:ml-5 [&_li]:list-disc [&_p.lead]:mb-6 [&_p.lead]:text-white/50 [&_p]:mb-3 [&_strong]:font-semibold [&_strong]:text-white/90 [&_ul]:space-y-1"
            dangerouslySetInnerHTML={{ __html: body }}
          />
        ) : (
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-white/70">{body}</div>
        )}
      </div>
    );
  }

  if (legacy) return legacy;

  if (missing && !legacy) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-white/45">
        Страница не найдена или скрыта.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 text-center text-white/45">
      Текст страницы ещё не задан в админке (Футер).
    </div>
  );
}
