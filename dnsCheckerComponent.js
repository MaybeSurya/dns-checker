const { useState, useEffect, useRef } = React;

const DOH_PROVIDERS = [
  { id: 'google', name: 'Google (8.8.8.8)', url: (q, t) => `https://dns.google/resolve?name=${encodeURIComponent(q)}&type=${t}` },
  { id: 'cloudflare', name: 'Cloudflare (1.1.1.1)', url: (q, t) => `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(q)}&type=${t}`, headers: { 'accept': 'application/dns-json' } },
];

const RECORD_TYPES = ['A','AAAA','CNAME','MX','NS','SOA','TXT','PTR','SRV','NAPTR','CAA','TLSA'];

const DNS_FAQS = [
            {
              q: "What is a DNS Checker?",
              a: "A DNS Checker is a tool that allows you to query different DNS providers to verify how your domain name resolves across various DNS servers. It's useful for troubleshooting DNS issues, verifying DNS propagation, and checking DNS records."
            },
            {
              q: "How does DNS Checking work?",
              a: "DNS checking works by sending queries to different DNS providers (like Google or Cloudflare) to retrieve DNS records for a domain. Each provider returns their cached or resolved DNS information, which can help identify inconsistencies or confirm proper DNS setup."
            },
            {
              q: "What is an A Record?",
              a: "An A Record (Address Record) maps a domain name to an IPv4 address. For example, if your domain 'example.com' points to IP '93.184.216.34', that's an A record."
            },
            {
              q: "What is an AAAA Record?",
              a: "An AAAA Record is similar to an A record but maps a domain to an IPv6 address instead of IPv4. It's essential for supporting newer IPv6 networks."
            },
            {
              q: "What is an MX Record?",
              a: "An MX (Mail Exchange) Record specifies the mail servers responsible for accepting incoming email for a domain. It includes a priority value to determine the order in which mail servers should be tried."
            },
            {
              q: "What is an NS Record?",
              a: "NS (Nameserver) Records specify the authoritative DNS servers for a domain. These servers contain the master copy of your domain's DNS records and respond to DNS queries about your domain."
            },
            {
              q: "What is a TXT Record?",
              a: "TXT Records can hold arbitrary text and are commonly used for domain verification, SPF records for email security, and DKIM keys for email authentication."
          	},
          	{
        	  q: "What is DNS Propagation?",
        	  a: "DNS Propagation is the time it takes for DNS changes to spread across all DNS servers worldwide. Due to caching, changes can take up to 48 hours to fully propagate, though often it's much faster."
        	},
        	{
    	 	  q: "What is a TTL?",
  	  	  a: "TTL (Time To Live) specifies how long DNS records should be cached by DNS resolvers. Lower TTL values mean faster propagation but more DNS queries, while higher values mean better performance but slower updates."
  	  	},
  	  	{
  	  	  q: "What is a CNAME Record?",
  	  	  a: "A CNAME (Canonical Name) Record creates an alias from one domain name to another. It's commonly used to point subdomains to other domains, like pointing 'www.example.com' to 'example.com'."
  	  	}
  	  ];

function timeMs() { return performance.now ? performance.now() : Date.now(); }

window.DNSChecker = function DNSChecker() {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('A');
  const [results, setResults] = useState({});
  const [loadingProviders, setLoadingProviders] = useState([]);
  const [dark, setDark] = useState(() => localStorage.getItem('dns_dark') === '1');
  // History is stored under a per-user key derived from public IP + a per-user cookie token.
  // This reduces accidental exposure of history between different users on the same server/machine.
  const [historyKey, setHistoryKey] = useState('dns_history');
  const [history, setHistory] = useState([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (dark) document.documentElement.classList.add('dark'); else document.documentElement.classList.remove('dark');
    localStorage.setItem('dns_dark', dark ? '1' : '0');
  }, [dark]);

  useEffect(() => {
    // Persist history under the derived per-user key (once available)
    if (!historyKey) return;
    try { localStorage.setItem(historyKey, JSON.stringify(history)); } catch(e) { /* ignore storage errors */ }
  }, [history, historyKey]);

  // Initialize historyKey by deriving from public IP + a per-user cookie token.
  useEffect(() => {
    (async () => {
      try {
        // Ensure there's a per-user token cookie (rotatable). If absent, create one.
        let token = (document.cookie.match(/(?:^|; )dns_user_token=([^;]+)/) || [])[1];
        if (!token) {
          token = Math.random().toString(36).slice(2, 12);
          document.cookie = `dns_user_token=${token}; path=/; max-age=${60*60*24*365}`; // 1 year
      	}

      	// Try to fetch public IP from a simple service. If it fails we'll still continue and use token only.
      	let ip = '';
      	try {
      	  const r = await fetch('https://api.ipify.org?format=json');
      	  if (r.ok) {
      	  	const j = await r.json();
      	  	ip = j.ip || '';
      	  }
      	} catch (e) {
      	  // ignore network failure - fallback to token-only key
      	}

      	const data = ip + '|' + token;
      	// Use SubtleCrypto to compute a SHA-256 hash for stable keying
      	let key = 'dns_history';
      	try {
      	  const enc = new TextEncoder().encode(data);
      	  const hashBuffer = await crypto.subtle.digest('SHA-256', enc);
      	  const hashArray = Array.from(new Uint8Array(hashBuffer));
      	  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      	  key = 'dns_history_' + hashHex.slice(0, 16);
      	} catch (e) {
      	  // subtle digest may not be available in some environments; fallback to token-only key
      	  key = 'dns_history_' + token;
      	}

      	setHistoryKey(key);
      	try {
      	  const stored = localStorage.getItem(key);
      	  if (stored) setHistory(JSON.parse(stored));
  	  	} catch (e) { /* ignore parse errors */ }
  	  } catch (e) {
  	  	console.error('history init failed', e);
  	  }
  	})();
  }, []);

  async function queryProvider(provider, q, t) {
  	const start = timeMs();
  	try {
  	  const resp = await fetch(provider.url(q, t), {
  	  	headers: provider.headers || { 'Accept': 'application/dns-json' },
  	  	mode: 'cors'
  	  });
  	  const took = Math.round(timeMs() - start);
  	  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  	  const json = await resp.json();
  	  return { ok: true, provider: provider.id, name: provider.name, took, json };
  	} catch (err) {
  	  const took = Math.round(timeMs() - start);
  	  console.error(`Error querying ${provider.name}:`, err);
  	  return { ok: false, provider: provider.id, name: provider.name, took, error: String(err) };
  	}
  }

  async function runQuery(e) {
  	if (e) e.preventDefault();
  	const q = query.trim();
  	if (!q) return;

  	setResults({});
  	setLoadingProviders(DOH_PROVIDERS.map(p => p.id));
  	const settled = await Promise.all(DOH_PROVIDERS.map(p => queryProvider(p, q, type)));

  	const map = {};
  	settled.forEach(r => map[r.provider] = r);
  	setResults(map);
  	setLoadingProviders([]);

  	setHistory([{ query: q, type, at: new Date().toISOString() }, ...history.slice(0, 49)]);
  }

  function clearAllHistory() {
  	try {
  	  if (historyKey) {
  	  	localStorage.removeItem(historyKey);
  	  }
  	} catch (e) {}
  	setHistory([]);
  	// rotate token so previous users on same machine won't see new entries
  	try {
  	  const newToken = Math.random().toString(36).slice(2,12);
  	  document.cookie = `dns_user_token=${newToken}; path=/; max-age=${60*60*24*365}`;
  	} catch(e){}
  	alert('History cleared for this user.');
  }

  // Simple inline SVG icon helper returning React elements
  function Icon(name, props) {
  	const base = { className: 'icon', width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  	const a = Object.assign({}, base, props || {});
  	switch (name) {
  	  case 'chev-down':
  	  	return React.createElement('svg', a, React.createElement('path', { d: 'M6 9l6 6 6-6' }));
  	  case 'chev-right':
  	  	return React.createElement('svg', a, React.createElement('path', { d: 'M9 6l6 6-6 6' }));
  	  case 'moon':
  	  	return React.createElement('svg', a, React.createElement('path', { d: 'M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z' }));
  	  case 'sun':
  	  	return React.createElement('svg', a, React.createElement('circle', { cx: 12, cy: 12, r: 3 }), React.createElement('path', { d: 'M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41' }));
  	  case 'download':
  	  	return React.createElement('svg', a, React.createElement('path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }), React.createElement('polyline', { points: '7 10 12 15 17 10' }), React.createElement('line', { x1: 12, y1: 15, x2: 12, y2: 3 }));
  	  case 'play':
  	  	return React.createElement('svg', a, React.createElement('path', { d: 'M5 3v18l15-9L5 3z' }));
  	  case 'x':
  	  	return React.createElement('svg', a, React.createElement('path', { d: 'M18 6L6 18M6 6l12 12' }));
  	  case 'trash':
  	  	return React.createElement('svg', a, React.createElement('polyline', { points: '3 6 5 6 21 6' }), React.createElement('path', { d: 'M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6' }), React.createElement('path', { d: 'M10 11v6M14 11v6' }));
  	  case 'copy':
  	  	return React.createElement('svg', a, React.createElement('rect', { x: 9, y: 9, width: 13, height: 13, rx: 2, ry: 2 }), React.createElement('path', { d: 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' }));
  	  default:
  	  	return React.createElement('svg', a, React.createElement('circle', { cx: 12, cy: 12, r: 10 }));
  	}
  }

  function formatTTL(seconds) {
  	if (!seconds || seconds < 0) return '';
  	if (seconds < 60) return `${seconds} seconds`;
  	if (seconds < 3600) {
  	  const minutes = Math.floor(seconds / 60);
  	  return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  	}
  	const hours = Math.floor(seconds / 3600);
  	return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  }

  function formatAnswerRow(a) {
  	const name = a.name || a.name?.toString() || '';
  	const val = a.data || a.rdata || a.RDATA || a.data || '';
  	const ttl = (a.TTL != null) ? a.TTL : (a.ttl != null ? a.ttl : '');
  	return React.createElement('div', { className: 'flex justify-between items-start gap-4 text-sm leading-6 py-1' },
  	  React.createElement('div', { className: 'flex-1' }, 
  	  	React.createElement('div', { className: 'font-medium' }, name), 
  	  	React.createElement('div', { className: 'text-xs opacity-60' }, val),
  	  	ttl !== '' ? React.createElement('div', { className: 'text-xs mt-1' },
  	  	  React.createElement('span', { className: 'font-medium' }, 'TTL: '),
  	  	  React.createElement('span', { className: 'opacity-60' }, formatTTL(ttl))
  	  	) : null
  	  )
  	);
  }

  function hasAnswers(r) {
  	if (!r || !r.ok) return false;
  	const j = r.json;
  	if (!j) return false;
  	if (Array.isArray(j.Answer) && j.Answer.length > 0) return true;
  	if (Array.isArray(j.Answers) && j.Answers.length > 0) return true;
  	return false;
  }

  function prettyAnswers(json) {
  	if (!json) return ['(no data)'];
  	if (json.Answer && Array.isArray(json.Answer)) {
  	  return json.Answer.map(a => {
  	  	const typeName = a.type || '';
  	  	const ttl = (a.TTL != null) ? `${a.TTL}s` : '';
  	  	const data = a.data || a.rdata || JSON.stringify(a);
  	  	return `${a.name} ${ttl} ${typeName} ${data}`;
  	  });
  	}
  	// Fallbacks
  	if (json.Authority) return json.Authority.map(a => JSON.stringify(a));
  	if (json.Answers) return json.Answers.map(a => JSON.stringify(a));
  	return [JSON.stringify(json)];
  }

  return (
  	React.createElement('div', { className: `min-h-screen p-6 max-w-6xl mx-auto` },
  	  React.createElement('header', { className: 'flex items-center justify-between mb-6' },
  	  	React.createElement('div', { className: 'flex items-center gap-4' },
  	  	  React.createElement('div', { className: 'w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-white font-bold shadow' }, 'V1.1'),
  	  	  React.createElement('div', null, React.createElement('h1', { className: 'text-2xl font-semibold' }, 'DNS Checker by MaybeSurya.dev'), React.createElement('p', { className: 'text-sm opacity-70' }, 'Compare DNS-over-HTTPS responses across major resolvers'))
  	  	),
  	  	React.createElement('div', { className: 'flex items-center gap-3' },
  	  	  React.createElement('button', { className: 'btn ghost', onClick: ()=>setDark(!dark) }, Icon(dark ? 'sun' : 'moon'), React.createElement('span', null, dark ? 'Light' : 'Dark')),
  	  	  React.createElement('button', { className: 'btn ghost', onClick: clearAllHistory }, Icon('trash'), React.createElement('span', null, 'Clear History')),
  	  	  React.createElement('button', { className: 'btn primary', onClick: ()=>{ if(Object.keys(results).length) { const a = document.createElement('a'); const blob = new Blob([JSON.stringify(results, null, 2)], {type: 'application/json'}); a.href = URL.createObjectURL(blob); a.download = `dns-results-${Date.now()}.json`; a.click(); URL.revokeObjectURL(a.href); } else alert('No results to export'); } }, Icon('download'), React.createElement('span', null, 'Export JSON'))
  	  	)
  	  ),

  	  React.createElement('form', { onSubmit: runQuery, className: 'grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 items-end' },
  	  	  React.createElement('div', { className: 'md:col-span-2' },
  	  	  	React.createElement('label', { className: 'text-sm block mb-1' }, 'Domain / Hostname'),
  	  	  	React.createElement('input', {
  	  	  	  className: 'form-compact w-full',
  	  	  	  value: query,
  	  	  	  onChange: e => setQuery(e.target.value),
  	  	  	  placeholder: type === 'TLSA' ? '_443._tcp.example.com' : 'example.com or 1.2.3.4',
  	  	  	  type: 'text'
  	  	  	}),
  	  	  	type === 'TLSA' ? React.createElement('div', { className: 'text-xs mt-1 text-muted' }, 
  	  	  	  'Format: _<port>._<protocol>.<domain> (e.g., _443._tcp.example.com)'
  	  	  	) : null
  	  	  ),   	  	React.createElement('div', null,
  	  	  React.createElement('label', { className: 'text-sm block mb-1' }, 'Record type'),
  	  	  React.createElement('select', {
  	  	  	className: 'form-compact w-full',
  	  	  	value: type,
  	  	  	onChange: e => setType(e.target.value)
  	  	  },
  	  	  	RECORD_TYPES.map(t => React.createElement('option', { key: t, value: t }, t))
  	  	  )
  	  	),

	  	React.createElement('div', { className: 'md:col-span-3 flex gap-2' },
 	  	  React.createElement('button', { type: 'submit', className: 'btn primary' }, Icon('play'), React.createElement('span', null, 'Run Check')),
	  	  React.createElement('button', { type: 'button', className: 'btn ghost', onClick: ()=>{ setResults({}); setLoadingProviders([]); } }, Icon('trash'), React.createElement('span', null, 'Clear'))
 	  	)
  	  ),

  	  React.createElement('main', null,
  	  	React.createElement('section', { className: 'grid md:grid-cols-2 gap-6' },
  	  	  React.createElement('div', { className: 'card' },
  	  	  	React.createElement('h2', { className: 'font-semibold mb-3' }, 'Providers & Results'),
  	  	  	// responders (providers that returned answers)
  	  	  	DOH_PROVIDERS.filter(p => {
  	  	  	  const r = results[p.id];
  	  	  	  return r && r.ok && (Array.isArray(r.json?.Answer) && r.json.Answer.length > 0 || Array.isArray(r.json?.Answers) && r.json.Answers.length > 0);
  	  	  	}).map(p => {
  	  	  	  const r = results[p.id];
  	  	  	  const loading = loadingProviders.includes(p.id);
  	  	  	  return React.createElement('div', { key: p.id, className: 'border-b last:border-b-0 py-3' },
  	  	  	  	React.createElement('div', { className: 'flex justify-between items-center mb-2' },
  	  	  	  	  React.createElement('div', { className: 'flex items-center gap-3' },
  	  	  	  	  	React.createElement('div', null, 
  	  	  	  	  	  React.createElement('div', { className: 'font-medium' }, p.name), 
  	  	  	  	  	  React.createElement('div', { className: 'text-xs opacity-60' }, p.id)
  	  	  	  	  	)
  	  	  	  	  ),
  	  	  	  	  React.createElement('div', { className: 'min-w-[80px] text-right' }, 
  	  	  	  	  	loading ? 
  	  	  	  	  	  React.createElement('span', { className: 'inline-flex items-center gap-2 text-xs px-2 py-1 rounded-full bg-yellow-200 text-yellow-900' }, 
  	  	  	  	  	  	React.createElement('span', { className: 'loader', role: 'img', 'aria-hidden': 'true' }), 
  	  	  	  	  	  	'querying...'
  	  	  	  	  	  ) : 
  	  	  	  	  	  r ? (
  	  	  	  	  	  	r.ok ? 
  	  	  	  	  	  	  React.createElement('span', { className: 'text-xs px-3 py-1 rounded-full bg-emerald-200 text-emerald-900 font-medium' }, 
  	  	  	  	  	  	  	`${r.took} ms`
  	  	  	  	  	  	  ) : 
  	  	  	  	  	  	  React.createElement('span', { className: 'text-xs px-3 py-1 rounded-full bg-rose-200 text-rose-900' }, 
  	  	  	  	  	  	  	`error ${r.took} ms`
  	  	  	  	  	  	  )
  	  	  	  	  	  ) : 
  	  	  	  	  	  React.createElement('span', { className: 'text-xs px-3 py-1 rounded-full bg-slate-200 text-slate-800' }, '-')
  	  	  	  	  )
  	  	  	  	),
  	  	  	  	React.createElement('div', { className: 'mt-2' },
  	  	  	  	  (r && r.ok && Array.isArray(r.json?.Answer)) ? React.createElement('div', null, r.json.Answer.map((a, idx) => React.createElement('div', { key: `${a.name}-${a.type}-${idx}` }, formatAnswerRow(a)))) : null
  	  	  	  	)
  	  	  	  );
  	  	  	}),

  	  	  	// End of providers section
  	  	  ),
  	  	  React.createElement('div', { className: 'card' },
  	  	  	React.createElement('h2', { className: 'font-semibold mb-3' }, 'Summary & Tools'),
  	  	  	React.createElement('div', { className: 'space-y-3' },
  	  	  	  React.createElement('div', null, React.createElement('label', { className: 'text-sm block mb-1' }, 'Notes'), React.createElement('textarea', { className: 'form-compact w-full', rows: 3, value: notes, onChange: e => setNotes(e.target.value), placeholder: 'Optional notes for this check' })),
  	  	  	  React.createElement('div', null, React.createElement('button', { className: 'btn ghost', onClick: () => { navigator.clipboard?.writeText(JSON.stringify(results)); alert('Results copied to clipboard (JSON)'); } }, Icon('copy'), React.createElement('span', null, 'Copy JSON'))),
  	  	  	  React.createElement('div', null, React.createElement('small', { className: 'opacity-60' }, 'Tip: query NS / SOA to inspect delegation and MX to inspect mail routing.'))
  	  	  	)
  	  	  ),
  	  	),

  	  	// History section  
  	  	React.createElement('section', { className: 'mt-6' },
  	  	  React.createElement('h3', { className: 'text-lg font-medium mb-3' }, 'History'),
  	  	  history.length === 0 ? React.createElement('div', { className: 'p-4 rounded-lg bg-slate-100 dark:bg-slate-900' }, 'Search for something before checking here') : (
  	  	  	React.createElement('div', { className: 'space-y-2' }, history.map((h, idx) => React.createElement('div', { key: idx, className: 'flex items-center justify-between p-3 rounded-lg bg-white dark:bg-slate-800' }, React.createElement('div', null, React.createElement('div', { className: 'font-medium' }, h.query), React.createElement('div', { className: 'text-xs opacity-60' }, `${h.type} • ${new Date(h.at).toLocaleString()}`)), React.createElement('div', { className: 'flex gap-2' }, React.createElement('button', { className: 'px-2 py-1 rounded border', onClick: () => { setQuery(h.query); setType(h.type); } }, Icon('download'), React.createElement('span', null, 'Load')), React.createElement('button', { className: 'px-2 py-1 rounded border', onClick: () => { const newH = history.slice(); newH.splice(idx, 1); setHistory(newH); } }, Icon('trash'), React.createElement('span', null, 'Delete'))))))
  	  	  )
  	  	),

   	  	// FAQ Section
  	  	React.createElement('section', { className: 'mt-6' },
  	  	  React.createElement('h3', { className: 'text-lg font-medium mb-3' }, 'DNS FAQ'),
  	  	  React.createElement('div', { className: 'space-y-3' },
  	  	  	DNS_FAQS.map((faq, idx) => 
  	  	  	  React.createElement('div', { 
  	  	  	  	key: idx, 
  	  	  	  	className: 'p-4 rounded-lg bg-white dark:bg-slate-800 shadow-sm'
  	  	  	  },
  	  	  	  	React.createElement('div', { 
  	  	  	  	  className: 'font-medium text-accent mb-2 hover:cursor-pointer',
  	  	  	  	  onClick: () => {
  	  	  	  	  	const elem = document.getElementById(`faq-answer-${idx}`);
  	  	  	  	  	if (elem) {
  	  	  	  	  	  elem.style.display = elem.style.display === 'none' ? 'block' : 'none';
  	  	  	  	  	}
  	  	  	  	  }
  	  	  	  	}, 
  	  	  	  	  React.createElement('span', { className: 'mr-2' }, '▶'),
  	  	  	  	  faq.q
  	  	  	  	),
  	  	  	  	React.createElement('div', { 
  	  	  	  	  id: `faq-answer-${idx}`,
  	  	  	  	  className: 'text-sm text-muted leading-relaxed',
  	  	  	  	  style: { display: 'none' }
  	  	  	  	}, faq.a)
  	  	  	  )
  	  	  	)
  	  	  )
  	  	),

  	  	React.createElement('footer', { className: 'watermark text-xs opacity-60' },
  	  	  React.createElement('a', { href: 'https://MaybeSurya.dev', target: '_blank', rel: 'noopener noreferrer', className: 'underline' }, 'Made with React & ♥ by Surya')
  	  	)
  	  )
  	)
  );
}