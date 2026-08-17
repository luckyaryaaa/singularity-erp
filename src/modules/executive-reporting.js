'use strict';
(() => {
  const { esc, fmtIDR, fmtDate, fmtDateTime, api, query, invalidate, router, can, state , asList } = window.MAT;
  const { ICONS, toast, formDialog, clayOrb, pageHead } = window.UI;
  const reportIcons={sales_customer:'chart',ar_ap_aging:'wallet',project_profitability:'project',production_performance:'factory',inventory_movement:'box',payroll_bpjs:'payslip',financial_statement:'ledger',quality_analytics:'shield'};
  const reportTones={sales_customer:'blue',ar_ap_aging:'amber',project_profitability:'mint',production_performance:'lavender',inventory_movement:'blue',payroll_bpjs:'coral',financial_statement:'mint',quality_analytics:'amber'};

  // Report Factory berdiri sendiri: ekspor terkontrol + otomasi jadwal.
  // Filter periode/cabang disimpan di state modul supaya tidak reset antar render.
  let filters=null;

  // ── Report Factory: halaman tersendiri (ekspor terkontrol + otomasi) ──────
  const reportFactory={
    permission:'report.view',
    onEvent(type){if(type==='job.updated')this.render(document.getElementById('main'));},
    async render(main,_params,signal){
      const period=(filters&&filters.period)||new Date().toISOString().slice(0,7);
      const [catalog,schedules,scope]=await Promise.all([
        api('/api/reports/catalog',{signal}),
        api('/api/reports/schedules',{signal}),
        query(`executive:${new URLSearchParams({period})}`,()=>api(`/api/reports/cockpit?period=${period}`,{signal}),{staleMs:60_000})
      ]);
      const branches=scope.branches||[];
      main.innerHTML=pageHead({eyebrow:'REPORT FACTORY',title:'Laporan terkontrol',sub:'Ekspor besar berjalan sebagai background job, mengikuti scope pengguna, dan setiap unduhan tercatat di audit trail.',actions:can('report.edit')?`<button class="btn primary" id="newReportSchedule">${ICONS.job} Jadwalkan laporan</button>`:''})+`
        <section class="report-grid exec-library">${catalog.items.map(r=>`<article class="panel report-card">${clayOrb(reportTones[r.key]||'blue',reportIcons[r.key]||'chart')}<p class="eyebrow">${esc(r.group)}</p><h2>${esc(r.title)}</h2><p>${esc(r.description)}</p><div class="row-actions"><button class="btn secondary sm" data-export="${esc(r.key)}" data-format="XLSX">XLSX</button><button class="btn ghost sm" data-export="${esc(r.key)}" data-format="PDF">PDF</button></div></article>`).join('')}</section>
        <section class="panel exec-schedules"><header><div><p class="eyebrow">AUTOMATION</p><h2>Jadwal laporan</h2></div><span class="chip ${schedules.items.some(x=>x.enabled)?'mint':'gray'}">${schedules.items.filter(x=>x.enabled).length} aktif</span></header><div class="table-wrap"><table><thead><tr><th>Jadwal</th><th>Laporan</th><th>Scope</th><th>Frekuensi</th><th>Eksekusi berikutnya</th><th>Status</th><th></th></tr></thead><tbody>${schedules.items.map(s=>`<tr><td><b>${esc(s.name)}</b><small>Dibuat ${esc(s.createdByName)}</small></td><td>${esc((catalog.items.find(r=>r.key===s.reportKey)||{}).title||s.reportKey)}<small>${esc(s.format)}</small></td><td>${esc(s.branchName||'Seluruh perusahaan')}</td><td>${esc(s.frequency)}</td><td>${fmtDateTime(s.nextRunAt)}</td><td>${s.enabled?'<span class="chip mint">Aktif</span>':'<span class="chip gray">Nonaktif</span>'}</td><td>${can('report.edit')?`<button class="btn ghost sm" data-schedule="${esc(s.id)}" data-version="${s.version}" data-enabled="${s.enabled?'1':'0'}">${s.enabled?'Nonaktifkan':'Aktifkan'}</button>`:''}</td></tr>`).join('')||`<tr><td colspan="7"><div class="empty-state">${clayOrb('blue','job')}<h3>Belum ada laporan terjadwal</h3><p>Jadwalkan laporan agar artifact dibuat otomatis dan terkirim tepat waktu.</p></div></td></tr>`}</tbody></table></div></section>`;
      main.querySelector('#newReportSchedule')?.addEventListener('click',async()=>{const first=new Date(Date.now()+86400000);first.setHours(7,0,0,0);const local=new Date(first.getTime()-first.getTimezoneOffset()*60000).toISOString().slice(0,16),fields=[{name:'name',label:'Nama jadwal',required:true},{name:'reportKey',label:'Laporan',type:'select',options:catalog.items.map(r=>[r.key,r.title]),required:true},{name:'format',label:'Format',type:'select',options:[['XLSX','Excel (.xlsx)'],['PDF','PDF']],required:true},{name:'frequency',label:'Frekuensi',type:'select',options:[['DAILY','Harian'],['WEEKLY','Mingguan'],['MONTHLY','Bulanan']],required:true},{name:'firstRunAt',label:'Eksekusi pertama',type:'datetime-local',value:local,required:true}];if(branches.length)fields.splice(2,0,{name:'branchId',label:'Scope cabang',type:'select',options:[['','Seluruh perusahaan'],...branches.map(b=>[b.id,`${b.code} · ${b.name}`])]});const v=await formDialog({title:'Jadwalkan laporan',description:'Worker membuat artifact otomatis sesuai frekuensi. Waktu mengikuti zona server.',fields,submitLabel:'Aktifkan jadwal'});if(!v)return;try{await api('/api/reports/schedules',{method:'POST',body:{...v,firstRunAt:new Date(v.firstRunAt).toISOString(),filters:{period}}});toast('Jadwal aktif','Laporan akan diproses otomatis.');this.render(main);}catch(e){toast('Gagal membuat jadwal',e.detail||e.message,'coral');}});
      main.querySelectorAll('[data-export]').forEach(btn=>btn.onclick=async()=>{const r=catalog.items.find(x=>x.key===btn.dataset.export);try{await api('/api/jobs',{method:'POST',body:{type:btn.dataset.format==='PDF'?'GENERATE_PDF':'REPORT_GENERATE',params:{report:r.title,reportKey:r.key,period,branchId:(filters&&filters.branchId)||null}}});toast('Laporan masuk antrean',`${r.title} (${btn.dataset.format}) sedang diproses.`);}catch(e){toast('Ekspor gagal',e.detail||e.message,'coral');}});
      main.querySelectorAll('[data-schedule]').forEach(btn=>btn.onclick=async()=>{try{await api(`/api/reports/schedules/${btn.dataset.schedule}`,{method:'PATCH',body:{enabled:btn.dataset.enabled!=='1',version:Number(btn.dataset.version),reason:btn.dataset.enabled==='1'?'Dinonaktifkan dari Report Factory':'Diaktifkan kembali dari Report Factory'}});toast('Jadwal diperbarui');this.render(main);}catch(e){toast('Perubahan gagal',e.detail||e.message,'coral');}});
    }
  };

  router.register('/reports',reportFactory);
})();
