/* ============================================================
   COSMOS theme — storefront interactions (vanilla JS, no deps)
   ============================================================ */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const cfg = window.cosmos || { routes: { cart: '/cart', cartAdd: '/cart/add', cartChange: '/cart/change', root: '/' }, strings: {} };
  const S = Object.assign({ addToCart: 'Add to Cart', added: 'Added ✓', soldOut: 'Sold out', unavailable: 'Unavailable' }, cfg.strings);

  /* ---------- Money (mirrors Shopify's money_format) ---------- */
  const formatMoney = (cents, format = cfg.moneyFormat || '£{{amount}}') => {
    const num = (Number(cents) || 0) / 100;
    const fixed = (d, thou = ',', dec = '.') => {
      const parts = num.toFixed(d).split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thou);
      return parts.length > 1 ? parts[0] + dec + parts[1] : parts[0];
    };
    return format.replace(/\{\{\s*(\w+)\s*\}\}/, (m, key) => {
      switch (key) {
        case 'amount_no_decimals': return fixed(0);
        case 'amount_with_comma_separator': return fixed(2, '.', ',');
        case 'amount_no_decimals_with_comma_separator': return fixed(0, '.', ',');
        case 'amount_with_apostrophe_separator': return fixed(2, "'", '.');
        case 'amount_no_decimals_with_space_separator': return fixed(0, ' ', '.');
        case 'amount_with_space_separator': return fixed(2, ' ', ',');
        case 'amount_with_period_and_space_separator': return fixed(2, ' ', '.');
        default: return fixed(2);
      }
    });
  };

  /* ---------- Toast ---------- */
  const toastEl = $('#toast');
  let toastTimer;
  const toast = (msg) => {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 2400);
  };

  /* ---------- Country / currency selector (Shopify localization form) ---------- */
  $$('[data-auto-submit]').forEach((select) => {
    select.addEventListener('change', () => select.closest('form').submit());
  });

  /* ---------- Cart drawer ---------- */
  const drawer = $('#cartDrawer');
  const backdrop = $('#cartBackdrop');
  let lastFocus = null;

  const setCount = (n) => {
    const badge = $('#cartCount');
    if (!badge) return;
    badge.textContent = String(n);
    badge.hidden = !(n > 0);
  };

  const openCart = () => {
    if (!drawer) return;
    lastFocus = document.activeElement;
    backdrop.hidden = false;
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    const close = $('[data-cart-close]', drawer);
    if (close) close.focus();
  };
  const closeCart = () => {
    if (!drawer) return;
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    backdrop.hidden = true;
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  };

  // Re-render the drawer from the Section Rendering API so prices, taxes and currency stay server-accurate.
  const refreshCart = async () => {
    const res = await fetch(`${cfg.routes.root}?sections=cart-drawer`, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error('Could not refresh cart');
    const json = await res.json();
    const html = json['cart-drawer'];
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const body = doc.querySelector('#cartDrawerBody');
    const aside = doc.querySelector('#cartDrawer');
    if (body && drawer) $('#cartDrawerBody', drawer).innerHTML = body.innerHTML;
    if (aside) setCount(Number(aside.dataset.count || 0));
  };

  document.addEventListener('click', (e) => {
    const toggle = e.target.closest('[data-cart-toggle]');
    if (toggle && drawer) { e.preventDefault(); openCart(); return; }
    if (e.target.closest('[data-cart-close]')) { closeCart(); return; }

    const qtyBtn = e.target.closest('[data-cart-qty]');
    if (qtyBtn) {
      const line = Number(qtyBtn.dataset.line);
      const quantity = Number(qtyBtn.dataset.cartQty);
      qtyBtn.disabled = true;
      fetch(`${cfg.routes.cartChange}.js`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ line, quantity }),
      })
        .then((r) => { if (!r.ok) throw new Error('change failed'); return refreshCart(); })
        .catch(() => toast('Sorry, the cart could not be updated.'))
        .finally(() => { qtyBtn.disabled = false; });
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer && drawer.classList.contains('is-open')) closeCart();
  });

  /* ---------- Product forms: variants, gallery, add to cart ---------- */
  $$('[data-product-card]').forEach((card) => {
    const form = $('[data-product-form]', card);
    const mainImage = $('[data-main-image]', card);
    const thumbs = $$('[data-thumb]', card);

    const setMainImage = (src) => {
      if (!mainImage || !src || mainImage.getAttribute('src') === src) return;
      mainImage.classList.add('is-swapping');
      setTimeout(() => {
        mainImage.src = src;
        mainImage.removeAttribute('srcset');
        mainImage.classList.remove('is-swapping');
      }, 180);
    };
    const activateThumb = (thumb) => {
      thumbs.forEach((t) => { t.classList.toggle('is-active', t === thumb); if (t === thumb) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current'); });
    };
    thumbs.forEach((t) => t.addEventListener('click', () => { activateThumb(t); setMainImage(t.dataset.src); }));

    if (!form) return;
    let variants = [];
    try { variants = JSON.parse($('[data-variants]', form).textContent); } catch { variants = []; }
    const idInput = $('[data-variant-id]', form);
    const addBtn = $('[data-add-to-cart]', form);
    const addLabel = $('[data-add-label]', form);
    const priceEl = $('[data-price]', form);
    const tiers = $$('[data-tier]', form);
    const updateTiers = (priceCents) => {
      tiers.forEach((input) => {
        const qty = Number(input.dataset.qty), disc = Number(input.dataset.discount);
        // Same maths as Shopify: per-unit discount truncated to whole cents, times quantity.
        const each = priceCents - Math.floor(priceCents * disc / 100);
        const total = each * qty;
        const label = input.closest('.tier');
        const totalEl = $('[data-tier-total]', label), eachEl = $('[data-tier-each]', label);
        if (totalEl) totalEl.textContent = formatMoney(total);
        if (eachEl) eachEl.textContent = formatMoney(each);
      });
    };
    const selectedQty = () => { const t = tiers.find((i) => i.checked); return t ? Number(t.dataset.qty) || 1 : 1; };
    const optionSets = $$('[data-option-index]', form);

    const selectedOptions = () => optionSets.map((set) => {
      const select = $('select', set);
      if (select) return select.value;
      const checked = $('input:checked', set);
      return checked ? checked.value : null;
    });

    const updateVariant = () => {
      if (!variants.length) return;
      const opts = selectedOptions();
      optionSets.forEach((set, i) => { const label = $('[data-option-value]', set); if (label && opts[i]) label.textContent = opts[i]; });
      const match = variants.find((v) => v.options.every((o, i) => o === opts[i]));
      if (!match) {
        addBtn.disabled = true; addLabel.textContent = S.unavailable; return;
      }
      idInput.value = match.id;
      if (priceEl) priceEl.textContent = match.price;
      if (typeof match.price_cents === 'number') updateTiers(match.price_cents);
      addBtn.disabled = !match.available;
      addLabel.textContent = match.available ? S.addToCart : S.soldOut;
      if (match.image) {
        setMainImage(match.image);
        const thumb = thumbs.find((t) => Number(t.dataset.mediaId) === match.media_id);
        if (thumb) activateThumb(thumb);
      }
      // Keep the URL shareable with the chosen variant on product pages.
      if (document.body.classList.contains('template-product') && window.history.replaceState) {
        const url = new URL(window.location.href); url.searchParams.set('variant', match.id); window.history.replaceState({}, '', url);
      }
    };
    optionSets.forEach((set) => set.addEventListener('change', updateVariant));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (addBtn.disabled) return;
      const original = addLabel.textContent;
      addBtn.disabled = true; addLabel.textContent = 'Adding…';
      try {
        const items = [{ id: Number(idInput.value), quantity: selectedQty() }];
        const protection = $('[data-protection]', form);
        if (protection && protection.checked) items.push({ id: Number(protection.value), quantity: 1 });
        const res = await fetch(`${cfg.routes.cartAdd}.js`, { method: 'POST', body: JSON.stringify({ items }), headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' } });
        let data = {};
        try { data = await res.json(); } catch { data = {}; }
        if (!res.ok) throw new Error(data.description || data.message || 'Could not add to cart');
        addBtn.classList.add('is-added'); addLabel.textContent = S.added;
        setTimeout(() => { addBtn.classList.remove('is-added'); addLabel.textContent = original; }, 1400);
        await refreshCart();
        if (drawer) { setTimeout(openCart, 300); } else { window.location.href = cfg.routes.cart; }
      } catch (err) {
        toast(err.message || 'Sorry, something went wrong.');
        addLabel.textContent = original;
      } finally {
        addBtn.disabled = false;
      }
    });
  });

  /* ---------- Demo product card (no product selected yet) ---------- */
  $$('[data-demo-add]').forEach((btn) => btn.addEventListener('click', () => toast(btn.dataset.demoAdd)));

  /* ---------- Video modal ---------- */
  const modal = $('#videoModal');
  if (modal) {
    const video = $('video', modal);
    const iframe = $('iframe', modal);
    let videoLastFocus = null;
    const openVideo = () => {
      videoLastFocus = document.activeElement;
      modal.hidden = false;
      document.body.style.overflow = 'hidden';
      if (iframe && !iframe.src) iframe.src = iframe.dataset.src;
      if (video) { const p = video.play(); if (p && p.catch) p.catch(() => {}); }
      const close = $('[data-video-close].iconbtn', modal); if (close) close.focus();
    };
    const closeVideo = () => {
      if (video) video.pause();
      if (iframe) iframe.removeAttribute('src');
      modal.hidden = true;
      document.body.style.overflow = '';
      if (videoLastFocus && videoLastFocus.focus) videoLastFocus.focus();
    };
    $$('[data-video-open]').forEach((b) => b.addEventListener('click', openVideo));
    $$('[data-video-close]', modal).forEach((el) => el.addEventListener('click', closeVideo));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) closeVideo(); });
  }

  /* ---------- Carousels (scroll-snap) ---------- */
  $$('[data-carousel]').forEach((carousel) => {
    const track = $('[data-carousel-track]', carousel);
    const slides = $$('[data-carousel-slide]', carousel);
    const dots = $$('[data-carousel-dot]', carousel);
    const prev = $('[data-carousel-prev]', carousel);
    const next = $('[data-carousel-next]', carousel);
    if (!track || slides.length < 2) return;
    const index = () => Math.round(track.scrollLeft / track.clientWidth);
    const goTo = (i) => {
      const n = Math.max(0, Math.min(slides.length - 1, i));
      track.scrollTo({ left: n * track.clientWidth, behavior: 'smooth' });
    };
    const sync = () => {
      const i = index();
      dots.forEach((d, k) => d.setAttribute('aria-selected', String(k === i)));
      if (prev) prev.disabled = i === 0;
      if (next) next.disabled = i === slides.length - 1;
    };
    let raf;
    track.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(sync); }, { passive: true });
    if (prev) prev.addEventListener('click', () => goTo(index() - 1));
    if (next) next.addEventListener('click', () => goTo(index() + 1));
    dots.forEach((d) => d.addEventListener('click', () => goTo(Number(d.dataset.carouselDot))));
    carousel.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(index() - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(index() + 1); }
    });
    window.addEventListener('resize', () => goTo(index()));
    sync();
    // Theme editor: jump to the slide the merchant clicks in the sidebar.
    document.addEventListener('shopify:block:select', (e) => {
      const i = slides.indexOf(e.target);
      if (i > -1) goTo(i);
    });
  });

  /* ---------- FAQ: one open per column ---------- */
  $$('.faq__col').forEach((col) => {
    col.addEventListener('toggle', (e) => {
      if (!e.target.open) return;
      $$('details[open]', col).forEach((d) => { if (d !== e.target) d.open = false; });
    }, true);
  });

  /* ---------- Mobile menu ---------- */
  const menuBtn = $('#menuBtn');
  const mobileNav = $('#mobileNav');
  if (menuBtn && mobileNav) {
    menuBtn.addEventListener('click', () => {
      const open = mobileNav.hidden;
      mobileNav.hidden = !open;
      menuBtn.setAttribute('aria-expanded', String(open));
    });
    $$('a', mobileNav).forEach((a) => a.addEventListener('click', () => { mobileNav.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); }));
  }

  /* ---------- Active nav link on scroll (home page) ---------- */
  const navLinks = $$('.nav a[href*="#"]');
  if (navLinks.length && 'IntersectionObserver' in window) {
    const ids = navLinks.map((a) => a.getAttribute('href').split('#')[1]).filter(Boolean);
    const sections = ids.map((id) => document.getElementById(id)).filter(Boolean);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href').endsWith(`#${en.target.id}`)));
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    sections.forEach((s) => io.observe(s));
  }

  /* ---------- Theme editor: keep drawer usable when sections re-render ---------- */
  document.addEventListener('shopify:section:load', (e) => {
    if (e.target && e.target.querySelector && e.target.querySelector('#cartDrawer')) refreshCart().catch(() => {});
  });
})();
