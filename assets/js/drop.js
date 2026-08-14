(function(){
  'use strict';

  // ── config ───────────────────────────────────────────────
  var SB_URL = 'https://eydsoqnpetqczaeqrscc.supabase.co';
  var SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5ZHNvcW5wZXRxY3phZXFyc2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4ODc1NjYsImV4cCI6MjEwMDQ2MzU2Nn0.ISD7IRYWwr_VMb8YutGlyJuWjBF9UWm1tijzMBAEBmc';
  var WA_NUMBER = '233542451578';
  var SITE = 'https://valmontgadgets.com';

  var sb = null;

  function getCustomerAccount(){
    if(!localStorage.getItem('valmont_access_token')) return null;
    try {
      var user = JSON.parse(localStorage.getItem('valmont_user') || 'null');
      return user && user.id ? user : null;
    } catch(e){ return null; }
  }

  var account = getCustomerAccount();
  if(account){
    try {
      sb = window.supabase.createClient(SB_URL, SB_KEY, {
        global: { headers: { Authorization: 'Bearer ' + localStorage.getItem('valmont_access_token') } }
      });
    } catch(e){}
  }
  var accountBooted = null;
  var prior = null;
  var flipCheckReady = false;
  var alreadyFlipped = false;

  // ── prize table (REAL, affordable offers only) ───────────
  // weight = relative chance. Edit freely.
  var PRIZES = [
    // common ~85%
    {tier:'common', w:22, label:'Free Accra delivery',            code:'DROPFREE',  cat:null,     note:'On any order today'},
    {tier:'common', w:20, label:'50% OFF any phone case',         code:'DROPCASE50',cat:'power',  note:'Accessory deal'},
    {tier:'common', w:14, label:'50% OFF screen protector + free fitting', code:'DROPSCRN50', cat:'power', note:'Accessory deal'},
    {tier:'common', w:14, label:'Free 32GB memory card',          code:'DROPSD32',  cat:'power',  note:'With any phone purchase'},
    {tier:'common', w:15, label:'5% OFF any phone or laptop',     code:'DROP5',     cat:null,     note:'Sitewide'},
    // good ~13%
    {tier:'good',   w:7,  label:'GH₵150 off your next purchase',  code:'DROPCR150', cat:null,     note:'Store credit'},
    {tier:'good',   w:4,  label:'20% OFF any accessory',          code:'DROPACC20', cat:'audio',  note:'Audio & power'},
    {tier:'good',   w:2,  label:'10% OFF any laptop',             code:'DROPLAP10', cat:'laptops',note:'Executive range'},
    // golden ~2%
    {tier:'golden', w:2,  label:'GOLDEN CARD — 30% OFF one unit', code:'GOLDEN30',  cat:null,     note:'Limited: one winner, today only'}
  ];

  var $ = function(id){ return document.getElementById(id); };
  var deck = $('deck');
  var cards = deck.querySelectorAll('.card');
  var chosen = -1, dealt = null, products = [];

  function showAuthGate(message){
    $('authGate').classList.add('show');
    $('authGate').style.display = 'block';
    $('authErr').textContent = message || 'Sign in first, then come back to unlock the deck.';
    $('authErr').classList.add('show');
    deck.classList.add('locked');
    Array.prototype.forEach.call(cards, function(card){ card.disabled = true; });
    $('stepPick').style.display = 'none';
  }

  function hideAuthGate(){
    $('authGate').classList.remove('show');
    $('authGate').style.display = 'none';
    $('authErr').classList.remove('show');
    if(alreadyFlipped){
      deck.classList.add('locked');
      Array.prototype.forEach.call(cards, function(card){ card.disabled = true; });
      $('stepPick').style.display = 'none';
    } else {
      deck.classList.remove('locked');
      Array.prototype.forEach.call(cards, function(card){ card.disabled = false; });
      $('stepPick').style.display = 'block';
    }
  }

  function refreshAccountGate(){
    var nextAccount = getCustomerAccount();
    if(!nextAccount){
      account = null;
      showAuthGate();
      return false;
    }
    if(!account || account.id !== nextAccount.id){
      account = nextAccount;
      // The account is part of the daily deal identity. Reboot the page so
      // a sign-in change can never reuse another customer's local state.
      if(accountBooted || !sb) window.location.reload();
    }
    hideAuthGate();
    return true;
  }

  // ── account identity ─────────────────────────────────────
  function accountKey(){ return account ? 'acct:' + account.id : null; }

  // ── flip identity ────────────────────────────────────────
  // Keep the existing column name for compatibility with the first migration,
  // but make the value account-scoped. A cleared browser cannot create a new
  // identity for the same signed-in customer.
  function deviceId(){ return accountKey(); }

  // ── drop day: rolls over at 6am local ────────────────────
  function dropDay(){
    var d = new Date();
    if(d.getHours() < 6) d.setDate(d.getDate() - 1);
    return d.getFullYear() + '-' +
           String(d.getMonth()+1).padStart(2,'0') + '-' +
           String(d.getDate()).padStart(2,'0');
  }

  // ── deterministic shuffle per device per day ─────────────
  function seedFrom(str){
    var h = 2166136261;
    for(var i=0;i<str.length;i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed){
    var s = seed;
    return function(){ s ^= s<<13; s>>>=0; s ^= s>>17; s ^= s<<5; s>>>=0; return s/4294967296; };
  }

  function weightedPick(rand){
    var total = PRIZES.reduce(function(a,p){ return a+p.w; },0);
    var r = rand()*total;
    for(var i=0;i<PRIZES.length;i++){ r -= PRIZES[i].w; if(r<=0) return PRIZES[i]; }
    return PRIZES[0];
  }

  function buildHand(){
    var rand = rng(seedFrom(deviceId() + '|' + dropDay()));
    var hand = [], seen = {};
    var guard = 0;
    while(hand.length < 3 && guard++ < 60){
      var p = weightedPick(rand);
      if(seen[p.code]) continue;
      seen[p.code] = 1;
      hand.push(p);
    }
    while(hand.length < 3) hand.push(PRIZES[0]);
    // attach a product image where category matches
    hand.forEach(function(p){
      var pool = p.cat ? products.filter(function(x){ return x.category_id === p.cat; }) : products;
      if(!pool.length) pool = products;
      if(pool.length) p.product = pool[Math.floor(rand()*pool.length)];
    });
    return hand;
  }

  // ── load products + stats ────────────────────────────────
  function loadProducts(){
    if(!sb) return Promise.resolve([]);
    return sb.rpc('get_storefront_catalog', {})
      .then(function(r){
        return (Array.isArray(r.data) ? r.data : [])
          .filter(function(product){ return Number(product.stock || 0) > 0; })
          .slice(0, 60);
      })
      .catch(function(){ return []; });
  }

  function loadStats(){
    if(!sb) return;
    sb.from('drop_stats').select('flips,golden_hits').eq('drop_date', dropDay())
      .then(function(r){
        var row = (r.data && r.data[0]) || {flips:0, golden_hits:0};
        $('pFlips').innerHTML = '<b>' + (row.flips||0) + '</b> flipped today';
        $('pGolden').textContent = (row.golden_hits > 0)
          ? 'Golden Card: CLAIMED 🏆' : 'Golden Card: still unclaimed';
      }).catch(function(){ $('pFlips').textContent = "Today's deck is live"; });
  }

  function flipStorageKey(){
    return 'vg_drop_' + dropDay() + '_' + account.id;
  }

  function loadAccountFlip(){
    if(!sb || !account) return Promise.resolve({data:null, error:new Error('Not signed in')});
    return sb.from('drop_flips')
      .select('id,drop_date,whatsapp,prize_tier,prize_label,prize_code,product_id,product_name')
      .eq('drop_date', dropDay()).eq('account_id', account.id).maybeSingle()
      .then(function(result){ return result; })
      .catch(function(error){ return {data:null, error:error}; });
  }

  function insertAccountFlip(waNum){
    if(!sb || !account) return Promise.reject(new Error('You must be signed in to flip.'));
    // Prize tier, label, code, product, account id and drop day are generated in
    // PostgreSQL from auth.uid(). The browser only supplies the contact number.
    return sb.rpc('claim_daily_drop', {
      p_whatsapp: waNum,
      p_device_id: deviceId()
    }).then(function(result){
      if(result.error) throw result.error;
      if(!result.data || !result.data.prize_tier) throw new Error('The prize service returned an invalid result.');
      return result.data;
    });
  }

  function flipConflict(error){
    return !!(error && (error.code === '23505' || /duplicate|unique/i.test(error.message || '')));
  }

  // ── phone normalise ──────────────────────────────────────
  // Daily Drop leads are stored in Ghana's local mobile format. Keep the
  // international conversion at the WhatsApp-link boundary only.
  var GHANA_MOBILE_PREFIXES = ['020','023','024','025','026','027','028','050','053','054','055','056','057','059'];
  function normWA(v){
    var d = (v||'').replace(/\D/g,'');
    if(!/^0\d{9}$/.test(d)) return null;
    if(!GHANA_MOBILE_PREFIXES.some(function(prefix){ return d.indexOf(prefix) === 0; })) return null;
    return d;
  }

  function waInternational(local){
    var d = String(local || '').replace(/\D/g,'');
    return /^0\d{9}$/.test(d) ? '233' + d.slice(1) : d;
  }

  function midnightLeft(){
    var n = new Date(), m = new Date(n); m.setHours(24,0,0,0);
    var s = Math.max(0, Math.floor((m-n)/1000));
    return String(Math.floor(s/3600)).padStart(2,'0') + 'h ' +
           String(Math.floor(s%3600/60)).padStart(2,'0') + 'm';
  }

  // ── render ───────────────────────────────────────────────
  function paintCard(i, p){
    var f = cards[i].querySelector('.front');
    var img = f.querySelector('img');
    f.classList.toggle('golden', p.tier === 'golden');
    if(p.product && p.product.image_url){
      img.src = p.product.image_url; img.hidden = false; img.alt = p.product.name;
    } else { img.hidden = true; }
    f.querySelector('.fl').textContent = p.label;
    f.querySelector('.fp').textContent = p.product ? p.product.name : p.note;
    cards[i].classList.add('flipped');
  }

  function show(id){
    ['stepPick','stepPhone','stepPrize','stepDone'].forEach(function(s){
      var el = $(s);
      if(s === id){ el.classList.add('show'); el.style.display = (s==='stepPick'?'block':''); }
      else { el.classList.remove('show'); if(s==='stepPick') el.style.display='none'; }
    });
  }

  // ── flow ─────────────────────────────────────────────────
  function choose(i){
    if(!refreshAccountGate() || !flipCheckReady || alreadyFlipped || chosen > -1) return;
    chosen = i;
    for(var k=0;k<cards.length;k++){
      cards[k].classList.remove('float');
      if(k !== i) cards[k].classList.add('dim');
    }
    cards[i].classList.add('chosen');
    show('stepPhone');
    setTimeout(function(){ $('wa').focus(); }, 300);
  }

  function reset(){
    if(alreadyFlipped) return;
    chosen = -1;
    for(var k=0;k<cards.length;k++){
      cards[k].classList.remove('dim','chosen','flipped');
      cards[k].classList.add('float');
      cards[k].disabled = false;
    }
    deck.classList.remove('locked');
    show('stepPick');
  }

  function showDone(flip){
    prior = flip;
    alreadyFlipped = true;
    var label = flip.prize_label || flip.label || 'your Daily Drop deal';
    var code = flip.prize_code || flip.code || '';
    var message = $('doneMsg');
    var prizeStrong = document.createElement('b');
    prizeStrong.style.color = 'var(--orange)';
    prizeStrong.textContent = label;
    var codeStrong = document.createElement('b');
    codeStrong.textContent = code;
    message.replaceChildren(
      document.createTextNode('You drew '), prizeStrong,
      document.createTextNode(' — code '), codeStrong,
      document.createTextNode('. Valid until midnight (' + midnightLeft() + ' left). New deck at 6am.')
    );
    $('stepPick').style.display = 'none';
    $('claimBtn2').style.display = 'block';
    var wm = encodeURIComponent('Hi Valmont Gadgets 👋 I flipped the Daily Drop and got: ' +
      label + ' (code ' + code + '). I\'d like to claim it.');
    $('claimBtn2').onclick = function(){ window.open('https://wa.me/'+WA_NUMBER+'?text='+wm,'_blank'); };
    deck.classList.add('locked');
    for(var k=0;k<cards.length;k++){
      cards[k].classList.remove('float');
      cards[k].disabled = true;
    }
    show('stepDone');
  }

  function reveal(waNum, savedFlip){
    alreadyFlipped = true;
    deck.classList.add('locked');
    Array.prototype.forEach.call(cards, function(card){ card.disabled = true; });
    // The persisted RPC result is authoritative; the client-side hand is only
    // an animation and can never choose the awarded tier or code.
    var win = {
      tier: savedFlip.prize_tier,
      label: savedFlip.prize_label,
      code: savedFlip.prize_code,
      note: 'Daily Drop reward',
      product: savedFlip.product_id ? {
        id: savedFlip.product_id,
        name: savedFlip.product_name || 'Featured product',
        image_url: (products.find(function(p){ return p.id === savedFlip.product_id; }) || {}).image_url || ''
      } : null
    };
    dealt[chosen] = win;
    var isG = win.tier === 'golden';

    setTimeout(function(){ paintCard(chosen, win); }, 120);
    dealt.forEach(function(p,i){
      if(i !== chosen) setTimeout(function(){ paintCard(i,p); }, 900 + i*260);
    });

    var pz = $('prize');
    pz.classList.toggle('g', isG);
    $('tier').textContent = isG ? '★ Golden Card ★' : (win.tier === 'good' ? 'Nice one' : 'Your deal today');
    $('big').textContent = win.label;
    $('prod').textContent = win.product ? ('Suggested: ' + win.product.name) : win.note;
    $('code').textContent = win.code;
    $('timer').innerHTML = 'Expires at midnight — <b>' + midnightLeft() + '</b> left';

    $('missed').innerHTML = dealt.map(function(p,i){
      return i === chosen ? '' : '<div>✕ ' + p.label + '</div>';
    }).join('');

    var msg = encodeURIComponent(
      'Hi Valmont Gadgets 👋 I flipped today\'s Daily Drop and got: ' +
      win.label + ' (code ' + win.code + '). I\'d like to claim it.');
    $('claimBtn').onclick = function(){ window.open('https://wa.me/'+WA_NUMBER+'?text='+msg,'_blank'); };
    $('claimBtn2').onclick = $('claimBtn').onclick;

    $('shareBtn').onclick = function(){
      var txt = 'I just flipped ' + win.label + ' on Valmont Gadgets Daily Drop 🃏 ' +
                'Three cards, one deal, and a Golden Card nobody\'s found. Flip yours: ' + SITE + '/drop.html';
      if(navigator.share) navigator.share({title:'Valmont Daily Drop', text:txt}).catch(function(){});
      else window.open('https://wa.me/?text='+encodeURIComponent(txt),'_blank');
    };

    setTimeout(function(){ show('stepPrize'); }, 700);

    // Persist a convenience copy for this browser. The account-scoped row
    // already saved in Supabase is the source of truth for one-flip-per-day.
    localStorage.setItem(flipStorageKey(), JSON.stringify({
      id: savedFlip && savedFlip.id || null,
      label: win.label, code: win.code, tier: win.tier, whatsapp: waNum
    }));
  }

  // ── wiring ───────────────────────────────────────────────
  for(var i=0;i<cards.length;i++){
    (function(n){ cards[n].addEventListener('click', function(){ choose(n); }); })(i);
  }
  $('backBtn').addEventListener('click', reset);

  $('unlockBtn').addEventListener('click', function(){
    if(!refreshAccountGate()) return;
    var n = normWA($('wa').value);
    if(!n){
      $('waErr').textContent = 'Enter a valid Ghana mobile number, for example 024 123 4567.';
      $('waErr').classList.add('show');
      return;
    }
    $('waErr').classList.remove('show');
    var button = this;
    button.disabled = true; button.textContent = 'Unlocking…';
    $('backBtn').disabled = true;
    loadAccountFlip().then(function(check){
      if(check.data){
        showDone(check.data);
        return null;
      }
      return insertAccountFlip(n).then(function(saved){
        localStorage.setItem('vg_drop_wa_' + account.id, n);
        reveal(n, saved);
      });
    }).catch(function(error){
      button.disabled = false; button.textContent = 'Unlock my card';
      $('backBtn').disabled = false;
      if(flipConflict(error)){
        $('waErr').textContent = 'This account or WhatsApp number has already flipped today.';
      } else {
        $('waErr').textContent = 'We could not save your flip. Please check your connection and try again.';
      }
      $('waErr').classList.add('show');
    });
  });
  $('wa').addEventListener('keydown', function(e){ if(e.key === 'Enter') $('unlockBtn').click(); });
  $('checkAuthBtn').addEventListener('click', function(){
    if(refreshAccountGate()) window.location.reload();
  });
  document.addEventListener('visibilitychange', function(){
    if(document.visibilityState === 'visible') refreshAccountGate();
  });

  // ── boot ─────────────────────────────────────────────────
  if(!refreshAccountGate()) return;
  accountBooted = account.id;
  flipCheckReady = false;
  $('stepPick').style.display = 'none';
  try { prior = JSON.parse(localStorage.getItem(flipStorageKey()) || 'null'); }
  catch(e) { prior = null; }
  loadStats();
  Promise.all([loadProducts(), loadAccountFlip()]).then(function(results){
    products = results[0];
    dealt = buildHand();
    var remote = results[1];
    flipCheckReady = true;

    if(remote && remote.data){
      prior = remote.data;
      try { localStorage.setItem(flipStorageKey(), JSON.stringify(remote.data)); } catch(e){}
      showDone(remote.data);
    } else if(prior){
      showDone(prior);
    } else {
      $('stepPick').style.display = 'block';
    }
  });

})();
