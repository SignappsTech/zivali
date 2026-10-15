/* Direction mockups: light/dark/both rendering and token-driven MapLibre styling.
   The page holds ONE copy of the content in #src (hidden). This script clones it into #stage once per theme,
   so the same markup is shown in light and dark without duplicating it in the file. */
(function () {
  var src = document.getElementById('src');
  var stage = document.getElementById('stage');
  var buttons = Array.prototype.slice.call(document.querySelectorAll('[data-mode]'));
  var STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';
  var stylePromise = null;

  function safeGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function safeSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* storage unavailable: ignore */ } }

  function cssColor(el, token) {
    // Resolve hsl(var(--token)) to rgb() because MapLibre's parser rejects space-separated hsl().
    var probe = document.createElement('i');
    probe.style.color = 'hsl(var(--' + token + '))';
    probe.style.position = 'absolute';
    el.appendChild(probe);
    var c = getComputedStyle(probe).color;
    el.removeChild(probe);
    return c;
  }

  // Calm map: land, water, parks and roads only. No buildings, rails, paths or street names.
  function paintMap(map, el) {
    var c = function (t) { return cssColor(el, t); };
    var set = function (id, prop, val) { if (map.getLayer(id)) map.setPaintProperty(id, prop, val); };
    var hide = function (id) { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none'); };
    var land = c('map-land'), water = c('map-water'), park = c('map-park');
    var road = c('map-road'), casing = c('map-road-casing'), label = c('map-label'), halo = c('map-label-halo');
    set('background', 'background-color', land);
    set('park', 'fill-color', park); set('park', 'fill-opacity', 1);
    set('landcover_wood', 'fill-color', park); set('landcover_wood', 'fill-opacity', 0.7);
    set('landuse_residential', 'fill-color', land);
    set('water', 'fill-color', water);
    set('waterway', 'line-color', water);
    ['highway_minor', 'highway_major_inner', 'highway_motorway_inner', 'highway_major_subtle', 'highway_motorway_subtle'].forEach(function (id) { set(id, 'line-color', road); });
    ['highway_major_casing', 'highway_motorway_casing', 'highway_motorway_bridge_casing'].forEach(function (id) { set(id, 'line-color', casing); set(id, 'line-opacity', 0.6); });
    ['building', 'highway_path', 'railway', 'railway_dashline', 'railway_transit', 'railway_transit_dashline', 'railway_service', 'railway_service_dashline'].forEach(hide);
    if (el.getAttribute('data-roads') !== 'all') hide('highway_minor');
    map.getStyle().layers.forEach(function (l) {
      if (/^boundary/.test(l.id)) { hide(l.id); return; }
      if (l.type === 'symbol') {
        if (/shield|airport|country|state|highway-name|label_city|label_town|label_village/.test(l.id)) { hide(l.id); return; }
        set(l.id, 'text-color', label); set(l.id, 'text-halo-color', halo);
      }
    });
  }

  // Browsers keep only about 16 WebGL contexts per page, so pages with many maps (and "side by side") lost
  // the first ones. Maps are drawn a few at a time, then frozen to an image and removed to free the context.
  var queue = [], active = 0, gen = 0, MAX_ACTIVE = 3;
  function pump(style) {
    while (active < MAX_ACTIVE && queue.length) {
      var el = queue.shift();
      if (el.isConnected) { active++; drawMap(el, style); }
    }
  }
  function drawMap(el, style) {
    var finished = false, g = gen;
    var center = (el.getAttribute('data-center') || '14.4985,46.0655').split(',').map(Number);
    var map = new window.maplibregl.Map({
      container: el, style: JSON.parse(JSON.stringify(style)), center: center,
      zoom: Number(el.getAttribute('data-zoom') || 13.4), interactive: false, attributionControl: false, fadeDuration: 0,
      preserveDrawingBuffer: true
    });
    var done = function (freeze) {
      if (finished) return; finished = true;
      if (freeze) {
        try {
          var img = new Image(); img.alt = ''; img.src = map.getCanvas().toDataURL('image/png');
          img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
          map.remove(); el.appendChild(img);
        } catch (e) { /* keep the live map */ }
      }
      el.setAttribute('data-ready', '1');
      if (g === gen) { active--; pump(style); }
    };
    map.on('load', function () { paintMap(map, el); map.once('idle', function () { done(true); }); });
    setTimeout(function () { done(false); }, 20000);
  }
  function initMaps(root) {
    var els = root.querySelectorAll('.map-canvas');
    if (!els.length || !window.maplibregl) return;
    if (!stylePromise) stylePromise = fetch(STYLE_URL).then(function (r) { return r.json(); });
    stylePromise.then(function (style) {
      els.forEach(function (el) { queue.push(el); });
      pump(style);
    }).catch(function () { /* offline: the tinted land colour stays visible behind the markers */ });
  }

  function scope(theme, both) {
    var w = document.createElement('div');
    w.className = 'scope' + (theme === 'dark' ? ' dark' : '');
    w.setAttribute('data-theme', theme);
    if (both) {
      var label = document.createElement('span');
      label.className = 'scope-label'; label.textContent = theme === 'dark' ? 'Dark mode' : 'Light mode';
      w.appendChild(label);
    }
    var body = document.createElement('div');
    body.innerHTML = src.innerHTML;
    // keep ids unique when two themes are on screen
    body.querySelectorAll('[id]').forEach(function (n) { n.id = n.id + '-' + theme; });
    body.querySelectorAll('[for]').forEach(function (n) { n.setAttribute('for', n.getAttribute('for') + '-' + theme); });
    body.querySelectorAll('[aria-describedby]').forEach(function (n) { n.setAttribute('aria-describedby', n.getAttribute('aria-describedby') + '-' + theme); });
    w.appendChild(body);
    return w;
  }

  function wire(root) {
    root.querySelectorAll('.seg').forEach(function (seg) {
      seg.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        seg.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-selected', String(x === b)); });
      });
    });
    root.querySelectorAll('.switch').forEach(function (sw) {
      sw.addEventListener('click', function () { sw.setAttribute('aria-checked', String(sw.getAttribute('aria-checked') !== 'true')); });
    });
    root.querySelectorAll('.pill[data-toggle]').forEach(function (p) {
      p.addEventListener('click', function () { p.setAttribute('aria-pressed', String(p.getAttribute('aria-pressed') !== 'true')); });
    });
    root.querySelectorAll('[role="radiogroup"]').forEach(function (g) {
      g.addEventListener('click', function (e) {
        var c = e.target.closest('[role="radio"]'); if (!c) return;
        g.querySelectorAll('[role="radio"]').forEach(function (x) { x.setAttribute('aria-checked', String(x === c)); });
      });
    });
  }

  function render(mode) {
    stage.innerHTML = '';
    gen++; queue.length = 0; active = 0;
    var both = mode === 'both';
    (both ? ['light', 'dark'] : [mode]).forEach(function (t) { var s = scope(t, both); stage.appendChild(s); wire(s); initMaps(s); });
    document.documentElement.classList.toggle('dark', mode === 'dark');
    buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-mode') === mode)); });
    safeSet('najdimo-direction-mode', mode);
  }

  var hash = (location.hash || '').replace('#', '');
  var mode = ['light', 'dark', 'both'].indexOf(hash) > -1 ? hash : (safeGet('najdimo-direction-mode') || 'light');
  if (['light', 'dark', 'both'].indexOf(mode) === -1) mode = 'light';
  buttons.forEach(function (b) { b.addEventListener('click', function () { render(b.getAttribute('data-mode')); }); });
  render(mode);
})();
