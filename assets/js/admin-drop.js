(function(){
  'use strict';
  var SB_URL = 'https://eydsoqnpetqczaeqrscc.supabase.co';
  var SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5ZHNvcW5wZXRxY3phZXFyc2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4ODc1NjYsImV4cCI6MjEwMDQ2MzU2Nn0.ISD7IRYWwr_VMb8YutGlyJuWjBF9UWm1tijzMBAEBmc';
  var sb = supabase.createClient(SB_URL, SB_KEY);
  var $ = function(i){ return document.getElementById(i); };
  var all = [];

  // Only the allowlisted owner may view captured Daily Drop leads. RLS is the
  // authoritative gate; this keeps the UI from showing a broken empty panel.
  var ADMIN_ALLOWED_EMAILS = ['danieloansah7868@gmail.com'];
  function isAllowedAdminEmail(email){
    return ADMIN_ALLOWED_EMAILS.indexOf(String(email || '').trim().toLowerCase()) !== -1;
  }

  function dropDay(){
    var d = new Date();
    if(d.getHours() < 6) d.setDate(d.getDate()-1);
    return d.toISOString().slice(0,10);
  }

  function fmt(ts){
    var d = new Date(ts);
    return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short'}) + ' ' +
           d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
  }

  function waInternational(local){
    var d = String(local || '').replace(/\D/g,'');
    return /^0\d{9}$/.test(d) ? '233' + d.slice(1) : d;
  }

  function render(){
    var q = $('q').value.trim().toLowerCase();
    var tier = $('fTier').value, claim = $('fClaim').value, range = $('fDate').value;
    var today = dropDay();
    var cut = null;
    if(range === '7' || range === '30'){
      cut = new Date(Date.now() - parseInt(range,10)*864e5).toISOString().slice(0,10);
    }

    var rows = all.filter(function(r){
      if(range === 'today' && r.drop_date !== today) return false;
      if(cut && r.drop_date < cut) return false;
      if(tier && r.prize_tier !== tier) return false;
      if(claim === 'yes' && !r.claimed) return false;
      if(claim === 'no' && r.claimed) return false;
      if(q){
        var hay = (r.account_email+' '+r.whatsapp+' '+r.prize_code+' '+r.prize_label+' '+(r.product_name||'')).toLowerCase();
        if(hay.indexOf(q) === -1) return false;
      }
      return true;
    });

    $('sToday').textContent   = all.filter(function(r){ return r.drop_date === today; }).length;
    $('sTotal').textContent   = all.length;
    $('sLeads').textContent   = Object.keys(all.reduce(function(a,r){ a[r.whatsapp]=1; return a; },{})).length;
    $('sGolden').textContent  = all.filter(function(r){ return r.prize_tier === 'golden'; }).length;
    $('sClaimed').textContent = all.filter(function(r){ return r.claimed; }).length;

    if(!rows.length){
      $('rows').innerHTML = '<tr><td colspan="8" class="empty">No flips match this filter yet.</td></tr>';
      return;
    }

    var tbody = $('rows');
    tbody.replaceChildren();
    rows.forEach(function(r){
      var tr = document.createElement('tr');
      var tier = ['common','good','golden'].indexOf(r.prize_tier) >= 0 ? r.prize_tier : 'common';
      if(tier === 'golden') tr.classList.add('golden');

      function textCell(value, style){
        var td = document.createElement('td');
        if(style) td.style.cssText = style;
        td.textContent = value == null || value === '' ? '—' : String(value);
        tr.appendChild(td);
        return td;
      }

      textCell(fmt(r.created_at), 'white-space:nowrap;color:#cbd5e1');
      textCell(r.account_email || 'Legacy / unlinked', 'color:var(--muted);max-width:210px;overflow:hidden;text-overflow:ellipsis');

      var phoneCell = document.createElement('td');
      var phoneLink = document.createElement('a');
      var msg = encodeURIComponent('Hi 👋 Valmont Gadgets here about your Daily Drop card: ' +
                String(r.prize_label || '') + ' (code ' + String(r.prize_code || '') + ').');
      phoneLink.className = 'wa';
      phoneLink.target = '_blank';
      phoneLink.rel = 'noopener noreferrer';
      phoneLink.href = 'https://wa.me/' + encodeURIComponent(waInternational(r.whatsapp)) + '?text=' + msg;
      phoneLink.textContent = r.whatsapp || '—';
      phoneCell.appendChild(phoneLink);
      tr.appendChild(phoneCell);

      var tierCell = document.createElement('td');
      var tierBadge = document.createElement('span');
      tierBadge.className = 'tier ' + tier;
      tierBadge.textContent = tier;
      tierCell.appendChild(tierBadge);
      tr.appendChild(tierCell);

      textCell(r.prize_label);
      var codeCell = document.createElement('td');
      var code = document.createElement('code');
      code.textContent = r.prize_code || '—';
      codeCell.appendChild(code);
      tr.appendChild(codeCell);
      textCell(r.product_name, 'color:var(--muted)');

      var actionCell = document.createElement('td');
      var checkbox = document.createElement('input');
      checkbox.className = 'chk';
      checkbox.type = 'checkbox';
      checkbox.dataset.id = String(r.id || '');
      checkbox.checked = r.claimed === true;
      actionCell.appendChild(checkbox);
      tr.appendChild(actionCell);
      tbody.appendChild(tr);
    });

    Array.prototype.forEach.call(document.querySelectorAll('.chk'), function(c){
      c.addEventListener('change', function(){
        var id = this.dataset.id, val = this.checked, box = this;
        box.disabled = true;
        sb.from('drop_flips').update({claimed: val}).eq('id', id).then(function(res){
          box.disabled = false;
          if(res.error){ box.checked = !val; alert('Could not save: ' + res.error.message); return; }
          all.forEach(function(r){ if(r.id === id) r.claimed = val; });
          $('sClaimed').textContent = all.filter(function(r){ return r.claimed; }).length;
        });
      });
    });
  }

  function load(){
    $('rows').innerHTML = '<tr><td colspan="8" class="loading">Loading…</td></tr>';
    sb.from('drop_flips').select('*').order('created_at',{ascending:false}).limit(2000)
      .then(function(res){
        if(res.error){
          var row = document.createElement('tr');
          var cell = document.createElement('td');
          cell.colSpan = 8;
          cell.className = 'empty';
          cell.textContent = 'Could not load Daily Drop records. Check the migration and your admin access.';
          row.appendChild(cell);
          $('rows').replaceChildren(row);
          return;
        }
        all = res.data || [];
        render();
      });
  }

  function csv(){
    var head = ['date','time','account_email','whatsapp','tier','prize','code','product','claimed'];
    var lines = [head.join(',')].concat(all.map(function(r){
      return [r.drop_date, new Date(r.created_at).toISOString().slice(11,16),
              '"'+(r.account_email||'')+'"', "'" + r.whatsapp, r.prize_tier,
              '"'+r.prize_label+'"', r.prize_code, '"'+(r.product_name||'')+'"',
              r.claimed ? 'yes' : 'no'].join(',');
    }));
    var blob = new Blob([lines.join('\n')], {type:'text/csv'});
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'valmont-daily-drop-' + dropDay() + '.csv';
    a.click();
  }

  ['q','fDate','fTier','fClaim'].forEach(function(id){
    $(id).addEventListener('input', render);
    $(id).addEventListener('change', render);
  });
  $('refreshBtn').addEventListener('click', load);
  $('csvBtn').addEventListener('click', csv);

  sb.auth.getSession().then(function(r){
    var session = r.data.session;
    if(!session || !isAllowedAdminEmail(session.user && session.user.email)){
      $('main').style.display = 'none';
      $('gate').style.display = 'block';
      return;
    }
    load();
  });
})();
