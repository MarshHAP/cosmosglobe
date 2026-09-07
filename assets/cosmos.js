/* ============================================================
   COSMOS theme — storefront interactions (vanilla JS, no deps)
   ============================================================ */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const cfg = window.cosmos || { routes: { cart: '/cart', cartAdd: '/cart/add', cartChange: '/cart/change', root: '/' }, strings: {} };
  const S = Object.assign({ addToCart: 'Add to Cart', added: 'Added ✓', soldOut: 'Sold out', unavailable: 'Unavailable' }, cfg.strings);

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
      fetch(cfg.routes.cartChange, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
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
    const optionSets = $$('[data-option-index]', form);

    const selectedOptions = () => optionSets.map((set) => {
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
        const fd = new FormData(form);
        const res = await fetch(cfg.routes.cartAdd, { method: 'POST', body: fd, headers: { Accept: 'application/json' } });
        const data = await res.json();
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
