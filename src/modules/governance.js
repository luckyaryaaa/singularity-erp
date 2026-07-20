'use strict';
(() => {
  const { esc, fmtIDR, fmtIDRFull, fmtDate, fmtDateTime, relTime, api, uploadFile, query, invalidate, router, can, state, newIdemKey , asList } = window.MAT;
  const { ICONS, chip, toast, formDialog, actionDialog, openDrawer, dataTable, clayOrb, kpiCard, pageHead, runDocAction, runDocConversion, actionButtonsFor, conversionButtonFor, MODULE_OF_TYPE, TYPE_LABEL, AUDIT_LABEL, STATUS_META } = window.UI;
  const { progressBar, docCell, docListPage, masterPage } = window.PageKit;

  const reports = {
    permission: 'report.view',
    render(main) {
      const cards = [
        ['Penjualan per pelanggan', 'Rekap penawaran hingga invoice per pelanggan.', 'chart', 'blue'],
        ['AR & AP aging', 'Umur piutang dan utang per relasi bisnis.', 'wallet', 'amber'],
        ['Profitabilitas proyek', 'Margin per proyek: nilai kontrak vs HPP aktual.', 'project', 'mint'],
        ['Kinerja produksi', 'Lead time WO, utilisasi, dan tingkat rework.', 'factory', 'lavender'],
        ['Mutasi persediaan', 'Pergerakan stok per SKU per gudang.', 'box', 'blue'],
        ['Rekap payroll & BPJS', 'Komponen gaji, potongan, dan kewajiban.', 'payslip', 'coral']
      ];
      main.innerHTML = pageHead({ eyebrow: 'PELAPORAN', title: 'Laporan', sub: 'Laporan berat diproses sebagai job latar belakang — antarmuka tetap responsif.' }) + `
        <section class="report-grid">
          ${cards.map(([title, desc, icon, tone], i) => `
            <article class="panel report-card">
              ${clayOrb(tone, icon)}
              <h2>${title}</h2><p>${desc}</p>
              <button class="btn secondary" data-report="${i}" data-title="${esc(title)}">${ICONS.job} Buat laporan</button>
            </article>`).join('')}
        </section>`;
      main.querySelectorAll('[data-report]').forEach((btn) => btn.addEventListener('click', async () => {
        try {
          await api('/api/jobs', { method: 'POST', body: { type: 'REPORT_GENERATE', params: { report: btn.dataset.title } } });
          toast('Laporan dijadwalkan', `${btn.dataset.title} sedang diproses di latar belakang.`);
        } catch (error) { toast('Gagal menjadwalkan', error.message, 'coral'); }
      }));
    }
  };

  // ── Sistem: pengguna, audit, monitoring, job, self-test, pengaturan ──────
  const systemUsers = masterPage({
    endpoint: '/api/system/users', key: 'users', permission: 'user.view', title: 'Pengguna & peran', eyebrow: 'SISTEM',
    columns: [
      { label: 'Pengguna', render: (r) => `<b>${esc(r.displayName)}</b><small>@${esc(r.username)} · ${esc(r.jobTitle || '')}</small>` },
      { label: 'Peran', render: (r) => `<span class="chip blue">${esc(r.role)}</span>` },
      { label: 'Cabang', render: (r) => esc(r.branchName || '—') },
      { label: 'MFA', render: (r) => r.mfaEnabled ? '<span class="chip mint">Aktif</span>' : '<span class="chip gray">Nonaktif</span>' },
      { label: 'Login terakhir', render: (r) => r.lastLoginAt ? relTime(r.lastLoginAt) : 'Belum pernah' },
      { label: 'Status', render: (r) => r.active ? '<span class="chip mint">Aktif</span>' : '<span class="chip coral">Nonaktif</span>' }
    ]
  });

  const iamGovernance = {
    permission: 'iam.view',
    async render(main, _p, signal) {
      const [roles, assignments, users] = await Promise.all([
        api('/api/governance/roles', { signal }), api('/api/governance/assignments', { signal }), api('/api/system/users', { signal })
      ]);
      const pending=assignments.items.filter(x=>x.status==='PENDING');
      main.innerHTML=pageHead({eyebrow:'ENTERPRISE IAM',title:'IAM & role assignment',sub:'Role tidak dapat lagi diubah langsung. Setiap assignment memiliki scope, effective date, pengusul, approver, histori, dan session revocation.',actions:can('iam.create')?`<button class="btn primary" id="iamRequest">${ICONS.people} Usulkan role</button>`:''})+`
        <section class="metrics">
          ${kpiCard({label:'Role enterprise',value:String(roles.items.length),note:'Katalog terpisah platform, control, business, dan self-service',orb:'people',orbTone:'blue'})}
          ${kpiCard({label:'Menunggu approval',value:String(pending.length),note:'Maker dan checker wajib berbeda',orb:'approval',orbTone:pending.length?'amber':'mint'})}
          ${kpiCard({label:'Assignment aktif',value:String(assignments.items.filter(x=>x.status==='ACTIVE').length),note:'Effective-dated dan dapat direview',orb:'lock',orbTone:'lavender'})}
        </section>
        <section class="dashboard-grid"><article class="panel"><header><div><p class="eyebrow">ROLE CATALOG</p><h2>Pemisahan kewenangan</h2></div></header><div class="panel-body stack">${roles.items.map(r=>`<div class="stat-row"><span><b>${esc(r.name)}</b><small>${esc(r.description)}</small></span><span><span class="chip ${r.privileged?'coral':'blue'}">${esc(r.code)}</span><small>${r.assignedCount} aktif · ${r.permissions.length} izin</small></span></div>`).join('')}</div></article>
        <article class="panel"><header><div><p class="eyebrow">MAKER–CHECKER</p><h2>Assignment terbaru</h2></div></header><div class="panel-body stack">${assignments.items.slice(0,30).map(a=>`<div class="stat-row"><span><b>${esc(a.displayName)}</b><small>${esc(a.roleName)} · ${esc(a.scopeType)}</small></span><span>${chip(a.status)}${a.status==='PENDING'&&can('iam.approve')?`<span class="row-actions"><button class="btn primary sm" data-assignment="${a.id}" data-decision="approve">Setujui</button><button class="btn danger-outline sm" data-assignment="${a.id}" data-decision="reject">Tolak</button></span>`:''}</span></div>`).join('')||'<p class="muted">Belum ada assignment.</p>'}</div></article></section>`;
      main.querySelector('#iamRequest')?.addEventListener('click',async()=>{const value=await formDialog({title:'Usulkan role enterprise',description:'Usulan harus disetujui pengguna lain. Role/scope lama tetap aktif sampai approval.',fields:[{name:'targetUserId',label:'Pengguna',type:'select',options:users.items.map(x=>[x.id,`${x.displayName} · ${x.role}`]),required:true},{name:'roleCode',label:'Role',type:'select',options:roles.items.map(x=>[x.code,x.name]),required:true},{name:'scopeType',label:'Data scope',type:'select',options:['GLOBAL','BRANCH','OWN_RECORD'].map(x=>[x,x]),required:true},{name:'reason',label:'Alasan bisnis',type:'textarea',required:true}],submitLabel:'Kirim usulan'});if(!value)return;try{await api('/api/governance/assignments',{method:'POST',body:value});toast('Assignment diusulkan','Menunggu checker yang berbeda.');this.render(main);}catch(e){toast('Usulan gagal',e.message,'coral');}});
      main.querySelectorAll('[data-assignment]').forEach(btn=>btn.addEventListener('click',async()=>{const answer=await actionDialog({title:btn.dataset.decision==='approve'?'Setujui assignment':'Tolak assignment',description:'Keputusan tercatat permanen dan perubahan role akan mencabut seluruh sesi pengguna.',requireReason:true,requirePin:btn.dataset.decision==='approve'&&state.user.role==='owner',confirmLabel:btn.dataset.decision==='approve'?'Setujui':'Tolak'});if(!answer)return;try{await api(`/api/governance/assignments/${btn.dataset.assignment}/${btn.dataset.decision}`,{method:'POST',body:answer});toast('Keputusan tersimpan');this.render(main);}catch(e){toast('Keputusan gagal',e.message,'coral');}}));
    }
  };

  const sodCenter={permission:'sod.view',async render(main,_p,signal){const [sod,overrides]=await Promise.all([api('/api/governance/sod',{signal}),api('/api/governance/overrides',{signal})]);main.innerHTML=pageHead({eyebrow:'SEGREGATION OF DUTIES',title:'SoD conflict center',sub:'Konflik role dan transaksi sensitif diblokir sebelum perubahan state. Emergency access dibatasi maksimal 24 jam.',actions:''})+`<section class="metrics">${kpiCard({label:'Aturan aktif',value:String(sod.rules.length),note:'Role conflict dan transaction duty',orb:'shield',orbTone:'blue'})}${kpiCard({label:'Konflik tercatat',value:String(sod.conflicts.length),note:'Blocked, overridden, dan resolved',orb:'warning',orbTone:sod.conflicts.length?'coral':'mint'})}${kpiCard({label:'Emergency access aktif',value:String(overrides.items.filter(x=>x.status==='ACTIVE').length),note:'Owner PIN + expiry wajib',orb:'lock',orbTone:'amber'})}</section><section class="dashboard-grid"><article class="panel"><header><div><p class="eyebrow">CONTROL LIBRARY</p><h2>Aturan SoD</h2></div></header><div class="panel-body stack">${sod.rules.map(r=>`<div class="stat-row"><span><b>${esc(r.name)}</b><small>${esc(r.description)}</small></span><span class="chip ${r.severity==='CRITICAL'?'coral':'amber'}">${esc(r.severity)}</span></div>`).join('')}</div></article><article class="panel"><header><div><p class="eyebrow">EXCEPTIONS</p><h2>Override & konflik</h2></div></header><div class="panel-body stack">${[...overrides.items,...sod.conflicts].slice(0,30).map(x=>`<div class="stat-row"><span><b>${esc(x.permissionCode||x.ruleName||'Conflict')}</b><small>${esc(x.userName||'—')}</small></span>${chip(x.status)}</div>`).join('')||'<p class="muted">Tidak ada exception.</p>'}</div></article></section>`;}};

  const approvalPolicies={permission:'approval_policy.view',async render(main,_p,signal){const data=await api('/api/governance/approval-policies',{signal});main.innerHTML=pageHead({eyebrow:'APPROVAL GOVERNANCE',title:'Approval policy builder',sub:'Policy berbasis modul, nominal, cabang, versi, dan effective date. Snapshot terkunci saat dokumen diajukan.',actions:can('approval_policy.create')?`<button class="btn primary" id="policyCreate">${ICONS.approval} Versi baru</button>`:''})+`<section class="panel"><header><div><p class="eyebrow">POLICY VERSIONS</p><h2>Matrix aktif dan draft</h2></div></header><div class="table-wrap"><table><thead><tr><th>Policy</th><th>Dokumen</th><th>Rentang</th><th>Steps</th><th>Versi</th><th>Status</th><th></th></tr></thead><tbody>${data.items.map(p=>`<tr><td><b>${esc(p.policyKey)}</b><small>${esc(p.branchName||'Semua cabang')}</small></td><td>${esc(p.documentType)}</td><td>${fmtIDR(Number(p.minAmount))} – ${p.maxAmount===null?'∞':fmtIDR(Number(p.maxAmount))}</td><td>${(p.steps||[]).map(x=>`<span class="chip blue">${esc(x.level)}</span>`).join(' ')}</td><td>v${p.version}</td><td>${chip(p.status)}</td><td>${p.status==='DRAFT'&&can('approval_policy.approve')?`<button class="btn primary sm" data-policy="${p.id}">Aktifkan</button>`:''}</td></tr>`).join('')}</tbody></table></div></section>`;main.querySelector('#policyCreate')?.addEventListener('click',async()=>{const v=await formDialog({title:'Buat versi approval policy',fields:[{name:'policyKey',label:'Policy key',required:true},{name:'documentType',label:'Jenis dokumen',placeholder:'* untuk semua',required:true},{name:'minAmount',label:'Nominal minimum',type:'number',min:0,required:true},{name:'maxAmount',label:'Nominal maksimum (kosong = tanpa batas)',type:'number',min:0},{name:'steps',label:'Step dipisahkan koma',placeholder:'supervisor,finance,owner',required:true},{name:'changeReason',label:'Alasan versi',type:'textarea',required:true}],submitLabel:'Simpan draft'});if(!v)return;v.steps=String(v.steps).split(',').map(x=>x.trim()).filter(Boolean);v.maxAmount=v.maxAmount||null;try{await api('/api/governance/approval-policies',{method:'POST',body:v});toast('Draft policy dibuat');this.render(main);}catch(e){toast('Gagal membuat policy',e.message,'coral');}});main.querySelectorAll('[data-policy]').forEach(b=>b.addEventListener('click',async()=>{const a=await actionDialog({title:'Aktifkan policy',description:'Pembuat versi tidak boleh menjadi aktivator. Policy overlap akan ditolak.',requireReason:true,confirmLabel:'Aktifkan'});if(!a)return;try{await api(`/api/governance/approval-policies/${b.dataset.policy}/activate`,{method:'POST',body:a});toast('Policy diaktifkan');this.render(main);}catch(e){toast('Aktivasi gagal',e.message,'coral');}}));}};

  const accessReviews={
    permission:'access_review.view',
    async render(main,_p,signal){
      const data=await api('/api/governance/access-reviews',{signal});
      main.innerHTML=pageHead({eyebrow:'PERIODIC CONTROL',title:'Access review',sub:'Security Admin meninjau assignment aktif secara periodik. Keputusan retain/revoke memiliki approver, waktu, dan alasan.',actions:can('access_review.create')?`<button class="btn primary" id="reviewCreate">${ICONS.audit} Mulai review</button>`:''})+`<section class="report-grid">${data.items.map(r=>`<article class="panel report-card"><div class="clay-orb ${r.pendingItems?'amber':'mint'}">${ICONS.audit}</div><p class="eyebrow">${esc(r.scopeType)}</p><h2>${esc(r.title)}</h2><p>${r.pendingItems} dari ${r.totalItems} assignment menunggu keputusan.</p><div class="stat-row"><span>Jatuh tempo</span><b>${fmtDate(r.dueAt)}</b></div>${chip(r.status)} <a class="btn secondary" href="#/system/access-reviews/${r.id}">Tinjau assignment</a></article>`).join('')||'<article class="panel"><div class="empty-state"><h3>Belum ada access review</h3></div></article>'}</section>`;
      main.querySelector('#reviewCreate')?.addEventListener('click',async()=>{const v=await formDialog({title:'Mulai access review',fields:[{name:'title',label:'Judul review',required:true},{name:'scopeType',label:'Scope',type:'select',options:[['GLOBAL','Global'],['BRANCH','Branch']],required:true},{name:'dueAt',label:'Jatuh tempo',type:'date',required:true}],submitLabel:'Buat review'});if(!v)return;try{await api('/api/governance/access-reviews',{method:'POST',body:v});toast('Access review dibuat');this.render(main);}catch(e){toast('Gagal membuat review',e.message,'coral');}});
    }
  };

  const accessReviewDetail={
    permission:'access_review.view',
    async render(main,params,signal){
      const review=await api(`/api/governance/access-reviews/${params.id}`,{signal});
      const pending=review.items.filter(item=>item.decision==='PENDING').length;
      main.innerHTML=pageHead({eyebrow:'ACCESS REVIEW WORKBENCH',title:review.title,sub:`${review.scopeType} · jatuh tempo ${fmtDate(review.dueAt)} · ${pending} assignment belum diputuskan.`,actions:`<a class="btn secondary" href="#/system/access-reviews">Kembali</a>${can('access_review.approve')&&review.status==='OPEN'&&!pending?'<button class="btn primary" id="reviewComplete">Selesaikan review</button>':''}`})+`<section class="panel"><div class="table-wrap"><table><thead><tr><th>Pengguna</th><th>Role</th><th>Scope</th><th>Keputusan</th><th>Aksi</th></tr></thead><tbody>${review.items.map(item=>`<tr><td><b>${esc(item.userName)}</b></td><td>${esc(item.roleCode)}</td><td>${esc(item.scopeType)}${item.scopeId?` · ${esc(item.scopeId)}`:''}</td><td>${chip(item.decision)}</td><td>${can('access_review.approve')&&item.decision==='PENDING'?`<div class="row-actions"><button class="btn secondary small" data-review-decision="RETAIN" data-id="${item.id}">Retain</button><button class="btn danger small" data-review-decision="REVOKE" data-id="${item.id}">Revoke</button></div>`:`<small>${esc(item.reason||'Sudah diputuskan')}</small>`}</td></tr>`).join('')||'<tr><td colspan="5">Tidak ada assignment dalam scope ini.</td></tr>'}</tbody></table></div></section>`;
      main.querySelectorAll('[data-review-decision]').forEach(button=>button.addEventListener('click',async()=>{const decision=button.dataset.reviewDecision,confirm=await actionDialog({title:decision==='REVOKE'?'Cabut assignment':'Pertahankan assignment',description:decision==='REVOKE'?'Akses pengguna dan sesi aktifnya akan dicabut sesuai hasil review.':'Assignment tetap aktif dan keputusan dicatat permanen.',requireReason:true,confirmLabel:decision==='REVOKE'?'Revoke':'Retain'});if(!confirm)return;try{await api(`/api/governance/access-reviews/items/${button.dataset.id}/decide`,{method:'POST',body:{decision,reason:confirm.reason}});toast(`Assignment ${decision.toLowerCase()} berhasil dicatat`);router.render();}catch(error){toast('Keputusan gagal',error.message,'coral');}}));
      main.querySelector('#reviewComplete')?.addEventListener('click',async()=>{const confirm=await actionDialog({title:'Selesaikan access review',description:'Review yang selesai tidak dapat menerima keputusan baru.',confirmLabel:'Selesaikan'});if(!confirm)return;try{await api(`/api/governance/access-reviews/${params.id}/complete`,{method:'POST',body:{}});toast('Access review selesai');router.go('#/system/access-reviews');}catch(error){toast('Review belum dapat diselesaikan',error.message,'coral');}});
    }
  };

  const auditPage = {
    permission: 'audit.view',
    render(main) {
      main.innerHTML = pageHead({ eyebrow: 'SISTEM', title: 'Log audit', sub: 'Log bersifat append-only dan tidak dapat diubah dari antarmuka.' }) + '<section id="pgTable"></section>';
      dataTable(main.querySelector('#pgTable'), {
        key: 'audit', endpoint: '/api/audit', params: {}, title: 'Aktivitas sistem', eyebrow: 'AUDIT TRAIL', staleMs: 20_000, sort: 'occurredAt:desc',
        columns: [
          { label: 'Waktu', render: (r) => `<b>${fmtDateTime(r.occurredAt)}</b>` },
          { label: 'Pengguna', render: (r) => `${esc(r.userName)}<small>${esc(r.role)}</small>` },
          { label: 'Aksi', render: (r) => `<span class="chip ${['VOID','CANCEL','REJECT','LOGIN_FAILED'].includes(r.action) ? 'coral' : ['APPROVE','LOGIN'].includes(r.action) ? 'mint' : 'gray'}">${esc(r.action)}</span>` },
          { label: 'Modul', render: (r) => esc(r.module) },
          { label: 'Dokumen', render: (r) => esc(r.documentNumber || '—') },
          { label: 'Alasan', render: (r) => r.reason ? `<i>"${esc(r.reason)}"</i>` : '—' }
        ],
        empty: { icon: 'audit', title: 'Belum ada aktivitas' }
      });
    }
  };

  const jobsPage = {
    permission: 'job.view',
    onEvent(type) { if (type === 'job.updated' && this._table) this._table.reload(); },
    render(main) {
      main.innerHTML = pageHead({ eyebrow: 'SISTEM', title: 'Job latar belakang', sub: 'PDF, ekspor, laporan, backup, dan arsip berjalan lewat antrean berprioritas.' }) + '<section id="pgTable"></section>';
      this._table = dataTable(main.querySelector('#pgTable'), {
        key: 'jobs', endpoint: '/api/jobs', params: {}, title: 'Antrean & riwayat', eyebrow: 'WORKER', staleMs: 10_000, sort: 'createdAt:desc',
        columns: [
          { label: 'Job', render: (r) => `<b>${esc(r.label)}</b><small>${esc(r.type)}</small>` },
          { label: 'Pemohon', render: (r) => esc(r.requestedByName) },
          { label: 'Prioritas', render: (r) => `<span class="chip ${r.priority === 'high' ? 'coral' : r.priority === 'medium' ? 'amber' : 'gray'}">${esc(r.priority)}</span>` },
          { label: 'Status', render: (r) => chip(r.status) },
          { label: 'Hasil', render: (r) => r.error ? `<span class="error-text">${esc(r.error)}</span>` : r.result?.artifactId ? `<a class="btn secondary sm" href="/api/artifacts/${esc(r.result.artifactId)}">Unduh ${esc(r.result.fileName || 'file')}</a>` : esc((r.result && (r.result.summary || r.result.note)) || '—') },
          { label: 'Waktu', render: (r) => relTime(r.createdAt) }
        ],
        empty: { icon: 'job', title: 'Belum ada job', hint: 'Jalankan ekspor atau laporan untuk melihat antrean di sini.' }
      });
    }
  };

  const monitoring = {
    permission: 'monitoring.view',
    async render(main, _p, signal) {
      const m = await query('monitoring', () => api('/api/system/monitoring', { signal }), { staleMs: 30_000, force: true });
      const stTone = m.storage.usedPct >= 80 ? 'coral' : m.storage.usedPct >= 70 ? 'amber' : 'mint';
      main.innerHTML = pageHead({
        eyebrow: 'SISTEM', title: 'Monitoring', sub: 'Kondisi server, API, antrean, keamanan, dan backup dalam satu layar.',
        actions: `<button class="btn secondary" id="monRefresh">${ICONS.refresh} Segarkan</button>`
      }) + `
        <section class="metrics">
          ${kpiCard({ label: 'Latensi API (p95)', value: `${m.api.p95Ms} ms`, note: `${m.api.requests} permintaan · error ${m.api.errorRatePct}%`, orb: 'monitor', orbTone: 'blue' })}
          ${kpiCard({ label: 'Memori proses', value: `${m.memory.rssMb} MB`, note: `Heap ${m.memory.heapMb} MB · uptime ${Math.floor(m.uptimeSeconds / 60)} mnt`, orb: 'gear', orbTone: 'mint' })}
          ${kpiCard({ label: 'Penyimpanan', value: `${m.storage.usedPct}%`, note: `${m.storage.usedGb} dari ${m.storage.totalGb} GB · ${m.storage.level}`, tone: m.storage.usedPct >= 70 ? 'warn' : '', orb: 'box', orbTone: stTone })}
          ${kpiCard({ label: 'Sesi aktif', value: String(m.security.activeSessions), note: `${m.security.failedLogins} login gagal tercatat`, orb: 'lock', orbTone: 'lavender' })}
        </section>
        <section class="dashboard-grid">
          <article class="panel"><header><div><p class="eyebrow">INFRASTRUKTUR</p><h2>Basis data & antrean</h2></div></header>
            <div class="panel-body stack">
              <div class="stat-row"><span>Engine</span><b>${esc(m.database.engine)}</b></div>
              <div class="stat-row"><span>Total baris</span><b>${m.database.rows.toLocaleString('id-ID')}</b></div>
              <div class="stat-row"><span>Pool koneksi</span><b>min ${m.database.pool.min} · max ${m.database.pool.max} · aktif ${m.database.pool.active}</b></div>
              <div class="stat-row"><span>Job worker</span><b>${m.jobs.running} berjalan · ${m.jobs.queued} antre · ${m.jobs.failed} gagal</b></div>
              <div class="stat-row"><span>Koneksi realtime (SSE)</span><b>${m.sse.activeConnections} aktif · ${m.sse.publishedEvents} event</b></div>
              <div class="stat-row"><span>Rate limiter</span><b>${m.rateLimit.totalRejected} ditolak dari ${m.rateLimit.totalHits} hit</b></div>
            </div>
          </article>
          <article class="panel"><header><div><p class="eyebrow">KETAHANAN</p><h2>Backup 3-2-1</h2></div></header>
            <div class="panel-body stack">
              ${m.backup ? `
                <div class="stat-row"><span>Backup terakhir</span><b>${fmtDateTime(m.backup.at)}</b></div>
                <div class="stat-row"><span>Ukuran</span><b>${m.backup.sizeMb} MB</b></div>
                <div class="stat-row"><span>Checksum</span><b>${esc(m.backup.checksum)}</b></div>
                <div class="stat-row"><span>Uji restore</span>${m.backup.restoreTested ? '<span class="chip mint">Lulus</span>' : '<span class="chip coral">Belum diuji</span>'}</div>
                <div class="stat-row"><span>Target</span><b>${esc(m.backup.target)}</b></div>` : '<p class="muted">Belum ada backup tercatat.</p>'}
              <p class="muted">Kebijakan: harian 30, mingguan 12, bulanan 24 salinan. Backup dinyatakan valid hanya setelah restore drill lulus.</p>
            </div>
          </article>
        </section>`;
      main.querySelector('#monRefresh').addEventListener('click', () => { invalidate('monitoring'); this.render(main); });
    }
  };

  const selfTest = {
    permission: 'selftest.view',
    async render(main, _p, signal) {
      main.innerHTML = pageHead({ eyebrow: 'SISTEM', title: 'Self test', sub: 'Menjalankan pemeriksaan integritas…' }) + `<section class="panel"><div class="panel-body"><span class="spinner"></span> Menjalankan seluruh pemeriksaan…</div></section>`;
      const s = await api('/api/system/self-test', { signal });
      main.innerHTML = pageHead({
        eyebrow: 'SISTEM', title: 'Self test', sub: `${s.passed} lulus · ${s.warnings || 0} peringatan · ${s.failed} gagal · ${s.blocked || 0} diblokir · dijalankan ${fmtDateTime(s.ranAt)}`,
        actions: `<button class="btn secondary" id="stRerun">${ICONS.refresh} Jalankan ulang</button>`
      }) + `
        <section class="release-gate ${s.releaseBlocked ? 'blocked' : 'clear'}">
          ${clayOrb(s.releaseBlocked ? 'coral' : 'mint', s.releaseBlocked ? 'alert' : 'shield')}
          <div><h2>${s.releaseBlocked ? 'Rilis diblokir' : 'Gerbang rilis terbuka'}</h2>
          <p>${s.releaseBlocked ? `${s.criticalFailed} pemeriksaan kritis gagal/diblokir — perbaiki sebelum rilis.` : (s.warnings ? `Pemeriksaan kritis lulus dengan ${s.warnings} peringatan yang wajib ditindaklanjuti.` : 'Seluruh pemeriksaan kritis lulus. Sistem layak rilis.')}</p></div>
        </section>
        <section class="panel"><header><div><p class="eyebrow">HASIL</p><h2>${s.total} pemeriksaan</h2></div></header>
          <div class="selftest-list">
            ${s.results.map((r) => `
              <div class="selftest-row ${r.status}">
                <span class="st-icon">${r.status === 'pass' ? ICONS.check : r.status === 'warning' ? ICONS.warning : ICONS.close}</span>
                <span><b>${esc(r.name)}</b>${r.critical ? ' <span class="chip gray">kritis</span>' : ''}<small>${esc(r.detail)}</small></span>
                <span class="chip ${r.status === 'pass' ? 'mint' : r.status === 'warning' ? 'amber' : 'coral'}">${r.status === 'pass' ? 'Lulus' : r.status === 'warning' ? 'Peringatan' : r.status === 'blocked' ? 'Diblokir' : 'Gagal'}</span>
              </div>`).join('')}
          </div>
        </section>`;
      main.querySelector('#stRerun').addEventListener('click', () => this.render(main));
    }
  };


  const R = router.register.bind(router);
  R('/system/users', systemUsers);
  R('/system/iam', iamGovernance);
  R('/system/sod', sodCenter);
  R('/system/approval-policies', approvalPolicies);
  R('/system/access-reviews', accessReviews);
  R('/system/access-reviews/:id', accessReviewDetail);
  R('/system/audit', auditPage);
  R('/system/monitoring', monitoring);
  R('/system/jobs', jobsPage);
  R('/system/selftest', selfTest);
})();
