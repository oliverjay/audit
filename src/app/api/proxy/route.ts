import { NextRequest } from "next/server";

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const targetUrl = req.nextUrl.searchParams.get("url");

  if (!targetUrl) {
    return new Response("Missing url parameter", { status: 400 });
  }

  try {
    const parsed = new URL(targetUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return new Response("Only http and https URLs are allowed", { status: 400 });
    }
  } catch {
    return new Response("Invalid URL", { status: 400 });
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
    });

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      return new Response("Target is not an HTML page", { status: 400 });
    }

    const rawHtml = await response.text();
    const MAX_HTML_SIZE = 5 * 1024 * 1024; // 5MB
    let html = rawHtml.length > MAX_HTML_SIZE ? rawHtml.slice(0, MAX_HTML_SIZE) : rawHtml;

    const baseUrl = new URL(targetUrl);
    const origin = baseUrl.origin;

    // Convert protocol-relative URLs to https
    html = html.replace(/(href|src|content)=(["'])\/\//g, '$1=$2https://');
    html = html.replace(/url\(\/\//g, 'url(https://');
    html = html.replace(/@import\s+["']\/\//g, '@import "https://');

    // Inject <base> tag as the very first thing in <head>
    const baseTag = `<base href="${origin}/">`;
    const headMatch = html.match(/<head[^>]*>/i);
    if (headMatch) {
      html = html.replace(headMatch[0], headMatch[0] + baseTag);
    } else {
      html = baseTag + html;
    }

    // Remove any pre-existing <base> tags from the original page
    let baseCount = 0;
    html = html.replace(/<base\s[^>]*>/gi, (match) => {
      baseCount++;
      // Keep only the first one (ours)
      return baseCount === 1 ? match : "";
    });

    const controlScript = `
<style>
  html, body { overflow: hidden !important; touch-action: none; }
</style>
<script>
(function() {
  var scrollSettleTimer;

  window.addEventListener('message', function(e) {
    try {
      var msg = e.data;
      if (!msg || !msg.type) return;

      if (msg.type === 'AUDIT_SCROLL') {
        var docHeight = document.documentElement.scrollHeight;
        var viewH = window.innerHeight;
        var maxScroll = docHeight - viewH;
        var rawTarget = (msg.scrollY / 100) * docHeight;
        var target = Math.max(0, Math.min(rawTarget - viewH * 0.35, maxScroll));
        document.documentElement.style.overflow = 'auto';
        document.body.style.overflow = 'auto';
        window.scrollTo({ top: target, behavior: 'smooth' });
        clearTimeout(scrollSettleTimer);
        scrollSettleTimer = setTimeout(function() {
          document.documentElement.style.overflow = 'hidden';
          document.body.style.overflow = 'hidden';
          window.parent.postMessage({ type: 'AUDIT_SCROLL_DONE' }, '*');
          window.parent.postMessage({
            type: 'AUDIT_SCROLL_POS',
            scrollY: window.scrollY,
            scrollHeight: document.documentElement.scrollHeight,
            viewportHeight: window.innerHeight
          }, '*');
        }, 800);
      }

      if (msg.type === 'AUDIT_INJECT_CSS') {
        var existing = document.getElementById('audit-fix-css');
        if (existing) existing.remove();
        if (msg.css) {
          var style = document.createElement('style');
          style.id = 'audit-fix-css';
          style.textContent = msg.css;
          document.head.appendChild(style);
        }
      }

      if (msg.type === 'AUDIT_INJECT_JS') {
        try { new Function(msg.js)(); } catch(err) { console.warn('[audit-fix]', err); }
      }

      if (msg.type === 'AUDIT_REMOVE_FIXES') {
        var fixCss = document.getElementById('audit-fix-css');
        if (fixCss) fixCss.remove();
      }

      if (msg.type === 'AUDIT_GET_SCROLL') {
        window.parent.postMessage({
          type: 'AUDIT_SCROLL_POS',
          scrollY: window.scrollY,
          scrollHeight: document.documentElement.scrollHeight,
          viewportHeight: window.innerHeight
        }, '*');
      }
    } catch(err) {
      console.warn('[audit-proxy]', err);
    }
  });

  window.addEventListener('load', function() {
    window.parent.postMessage({
      type: 'AUDIT_HEIGHT',
      height: document.documentElement.scrollHeight
    }, '*');
  });

  var scrollTimer;
  window.addEventListener('scroll', function() {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(function() {
      window.parent.postMessage({
        type: 'AUDIT_SCROLL_POS',
        scrollY: window.scrollY,
        scrollHeight: document.documentElement.scrollHeight,
        viewportHeight: window.innerHeight
      }, '*');
    }, 50);
  });

  document.addEventListener('click', function(e) {
    var el = e.target;
    while (el && el.tagName !== 'A') el = el.parentElement;
    if (el && el.tagName === 'A') {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  document.addEventListener('wheel', function(e) { e.preventDefault(); }, { passive: false });
  document.addEventListener('touchmove', function(e) { e.preventDefault(); }, { passive: false });
})();
</script>`;

    if (html.match(/<\/body>/i)) {
      html = html.replace(/<\/body>/i, controlScript + "</body>");
    } else {
      html += controlScript;
    }

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (error) {
    console.error("[proxy] Error:", error);
    return new Response(
      `Proxy error: ${error instanceof Error ? error.message : "unknown"}`,
      { status: 502 }
    );
  }
}
