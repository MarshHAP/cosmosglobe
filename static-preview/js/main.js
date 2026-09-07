/* ============================================================
   COSMOS store — interactions
   ============================================================ */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ---------- Product data ---------- */
  const PRODUCT = {
    name: 'COSMOS Magnetic Levitating Globe Lamp',
    price: 13.69,          // GBP, VAT included
    discount: 6.0,         // GBP off
    compareAt: 49.0,       // GBP
    variants: [
      { name: 'Silver',   image: 'assets/globe-silver.svg' },
      { name: 'Pink',     image: 'assets/globe-pink.svg' },
      { name: 'Aqua',     image: 'assets/globe-aqua.svg' },
      { name: 'Black',    image: 'assets/globe-black.svg' },
      { name: 'Midnight', image: 'assets/globe-midnight.svg' },
      { name: 'Gold',     image: 'assets/globe-gold.svg' },
    ],
  };

  const CURRENCIES = {
    GBP: { label: 'UK (GBP)', symbol: '£', rate: 1,    plug: 'UK plug', locale: 'en-GB' },
    USD: { label: 'US (USD)', symbol: '$', rate: 1.27, plug: 'US plug', locale: 'en-US' },
    EUR: { label: 'EU (EUR)', symbol: '€', rate: 1.17, plug: 'EU plug', locale: 'de-DE' },
    AUD: { label: 'AU (AUD)', symbol: 'A$', rate: 1.93, plug: 'AU plug', locale: 'en-AU' },
  };

  const store = {
    get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ } },
  };

  let currency = store.get('cosmos:currency', 'GBP');
  if (!CURRENCIES[currency]) currency = 'GBP';
  let cart = store.get('cosmos:cart', []);

  const money = (gbp) => {
    const c = CURRENCIES[currency];
    const value = gbp * c.rate;
    return c.symbol + value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  /* ---------- Toast ---------- */
  const toastEl = $('#toast');
  let toastTimer;
  const toast = (msg) => {
    toastEl.textContent = msg;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 2400);
  };

  /* ---------- Currency selector ---------- */
  const currencyBtn = $('#currencyBtn');
  const currencyMenu = $('#currencyMenu');
  const currencyLabel = $('#currencyLabel');

  const renderPrices = () => {
    $('#priceNow').textContent = money(PRODUCT.price);
    $('#promoOff').textContent = money(PRODUCT.discount);
    $('#promoWas').textContent = money(PRODUCT.compareAt);
    currencyLabel.textContent = CURRENCIES[currency].label;
    $$('#currencyMenu li').forEach((li) => li.setAttribute('aria-selected', String(li.dataset.currency === currency)));
    renderCart();
  };

  const closeCurrency = () => { currencyMenu.hidden = true; currencyBtn.setAttribute('aria-expanded', 'false'); };
  currencyBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = currencyMenu.hidden;
    currencyMenu.hidden = !open;
    currencyBtn.setAttribute('aria-expanded', String(open));
  });
  currencyMenu.addEventListener('click', (e) => {
    const li = e.target.closest('li[data-currency]');
    if (!li) return;
    currency = li.dataset.currency;
    store.set('cosmos:currency', currency);
    // Suggest the matching plug for the region
    const plug = $(`#sizes input[value="${CURRENCIES[currency].plug}"]`);
    if (plug) { plug.checked = true; $('#sizeName').textContent = plug.value; }
    renderPrices();
    closeCurrency();
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('.currency')) closeCurrency(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeCurrency(); });

  /* ---------- Gallery + variants ---------- */
  const mainImage = $('#mainImage');
  const thumbs = $$('.thumb');
  const colorInputs = $$('#swatches input');

  const selectVariant = (index, { syncSwatch = true } = {}) => {
    const v = PRODUCT.variants[index];
    if (!v) return;
    thumbs.forEach((t) => {
      const active = Number(t.dataset.index) === index;
      t.classList.toggle('is-active', active);
      if (active) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current');
    });
    if (syncSwatch) {
      const input = colorInputs[index];
      if (input) input.checked = true;
    }
    $('#colorName').textContent = v.name;
    if (mainImage.getAttribute('src') !== v.image) {
      mainImage.classList.add('is-swapping');
      setTimeout(() => {
        mainImage.src = v.image;
        mainImage.alt = `${PRODUCT.name} in ${v.name}`;
        mainImage.classList.remove('is-swapping');
      }, 180);
    }
  };
  thumbs.forEach((t) => t.addEventListener('click', () => selectVariant(Number(t.dataset.index))));
  colorInputs.forEach((i) => i.addEventListener('change', () => selectVariant(Number(i.dataset.index), { syncSwatch: false })));
  $$('#sizes input').forEach((i) => i.addEventListener('change', () => { $('#sizeName').textContent = i.value; }));

  /* ---------- Cart ---------- */
  const drawer = $('#cartDrawer');
  const backdrop = $('#cartBackdrop');
  const cartItems = $('#cartItems');
  const cartEmpty = $('#cartEmpty');
  const cartFoot = $('#cartFoot');
  const cartCount = $('#cartCount');
  const cartTotal = $('#cartTotal');

  const saveCart = () => store.set('cosmos:cart', cart);

  const renderCart = () => {
    cartItems.innerHTML = '';
    const count = cart.reduce((n, i) => n + i.qty, 0);
    cartCount.hidden = count === 0;
    cartCount.textContent = String(count);
    cartEmpty.hidden = count > 0;
    cartFoot.hidden = count === 0;
    let total = 0;
    cart.forEach((item, idx) => {
      total += item.qty * PRODUCT.price;
      const variant = PRODUCT.variants.find((v) => v.name === item.color) || PRODUCT.variants[3];
      const li = document.createElement('li');
      li.className = 'cart-item';
      li.innerHTML = `
        <img src="${variant.image}" alt="">
        <div>
          <div class="cart-item__name">${PRODUCT.name}</div>
          <div class="cart-item__meta">${item.color} · ${item.size}</div>
          <div class="cart-item__qty">
            <button type="button" data-act="dec" data-idx="${idx}" aria-label="Decrease quantity">−</button>
            <output aria-live="polite">${item.qty}</output>
            <button type="button" data-act="inc" data-idx="${idx}" aria-label="Increase quantity">+</button>
          </div>
        </div>
        <div>
          <div class="cart-item__price">${money(item.qty * PRODUCT.price)}</div>
          <button type="button" class="cart-item__remove" data-act="remove" data-idx="${idx}">Remove</button>
        </div>`;
      cartItems.appendChild(li);
    });
    cartTotal.textContent = money(total);
  };

  const openCart = () => {
    backdrop.hidden = false;
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    $('#cartClose').focus();
  };
  const closeCart = () => {
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    backdrop.hidden = true;
    document.body.style.overflow = '';
    $('#cartBtn').focus();
  };

  $('#cartBtn').addEventListener('click', openCart);
  $('#cartClose').addEventListener('click', closeCart);
  backdrop.addEventListener('click', closeCart);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && drawer.classList.contains('is-open')) closeCart(); });

  cartItems.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const idx = Number(btn.dataset.idx);
    const item = cart[idx];
    if (!item) return;
    if (btn.dataset.act === 'inc') item.qty += 1;
    if (btn.dataset.act === 'dec') item.qty -= 1;
    if (btn.dataset.act === 'remove' || item.qty <= 0) cart.splice(idx, 1);
    saveCart();
    renderCart();
  });

  $('#buyForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const color = ($('#swatches input:checked') || {}).value || 'Black';
    const size = ($('#sizes input:checked') || {}).value || 'UK plug';
    const existing = cart.find((i) => i.color === color && i.size === size);
    if (existing) existing.qty += 1; else cart.push({ color, size, qty: 1 });
    saveCart();
    renderCart();
    const btn = $('#addToCart');
    btn.classList.add('is-added');
    btn.querySelector('span').textContent = 'Added ✓';
    setTimeout(() => { btn.classList.remove('is-added'); btn.querySelector('span').textContent = 'Add to Cart'; }, 1400);
    toast(`Added ${color} · ${size} to your cart`);
    setTimeout(openCart, 500);
  });

  $('#checkoutBtn').addEventListener('click', () => {
    toast('Checkout is not connected yet. Hook this button up to your payment provider.');
  });

  /* ---------- Video modal ---------- */
  const modal = $('#videoModal');
  const video = $('#videoEl');
  // If no video file has been added yet, say so instead of showing a broken player.
  const source = $('source', video);
  if (source) source.addEventListener('error', () => {
    if ($('.modal__note', modal)) return;
    const note = document.createElement('p');
    note.className = 'modal__note';
    note.textContent = 'Video coming soon. Add your clip at assets/cosmos.mp4 to play it here.';
    $('.modal__box', modal).appendChild(note);
  });
  const openVideo = () => {
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    const p = video.play();
    if (p && p.catch) p.catch(() => { /* no source yet; poster stays visible */ });
    $('.modal__close', modal).focus();
  };
  const closeVideo = () => {
    video.pause();
    modal.hidden = true;
    document.body.style.overflow = '';
    $('#playBtn').focus();
  };
  $('#playBtn').addEventListener('click', openVideo);
  $$('[data-close]', modal).forEach((el) => el.addEventListener('click', closeVideo));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) closeVideo(); });

  /* ---------- FAQ: one open per column feels tidier ---------- */
  $$('.faq__col').forEach((col) => {
    col.addEventListener('toggle', (e) => {
      if (!e.target.open) return;
      $$('details[open]', col).forEach((d) => { if (d !== e.target) d.open = false; });
    }, true);
  });

  /* ---------- Newsletter ---------- */
  $('#newsletterForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('#newsEmail');
    const msg = $('#newsMsg');
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
    msg.classList.toggle('is-error', !ok);
    msg.textContent = ok ? 'Thanks for joining. Welcome to a brighter world.' : 'Please enter a valid email address.';
    if (ok) input.value = '';
  });

  /* ---------- Header: mobile menu, search, account ---------- */
  const menuBtn = $('#menuBtn');
  const mobileNav = $('#mobileNav');
  menuBtn.addEventListener('click', () => {
    const open = mobileNav.hidden;
    mobileNav.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  $$('a', mobileNav).forEach((a) => a.addEventListener('click', () => { mobileNav.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); }));
  $('#searchBtn').addEventListener('click', () => { document.getElementById('shop').scrollIntoView({ behavior: 'smooth' }); toast('One product, one page: here is the COSMOS globe.'); });
  $('#accountBtn').addEventListener('click', () => toast('Accounts are coming soon.'));

  /* ---------- Active nav link on scroll ---------- */
  const sections = ['top', 'shop', 'about', 'reviews', 'faq'].map((id) => document.getElementById(id)).filter(Boolean);
  const navLinks = $$('.nav a');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${en.target.id}`));
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    sections.forEach((s) => io.observe(s));
  }

  /* ---------- Init ---------- */
  $('#year').textContent = String(new Date().getFullYear());
  renderPrices();
  selectVariant(3);
})();
