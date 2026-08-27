'use strict';
(() => {
  const { esc, fmtIDR, fmtIDRFull, fmtDate, fmtDateTime, relTime, api, uploadFile, query, invalidate, router, can, state, newIdemKey , asList } = window.MAT;
  const { ICONS, chip, toast, formDialog, actionDialog, openDrawer, dataTable, clayOrb, kpiCard, pageHead, runDocAction, runDocConversion, actionButtonsFor, conversionButtonFor, MODULE_OF_TYPE, TYPE_LABEL, AUDIT_LABEL, STATUS_META } = window.UI;
  const { progressBar, docCell, docListPage, masterPage } = window.PageKit;

  const attendancePage = {
    permission: 'attendance.view',
    async render(main, _p, signal) {
      this.period = this.period || new Date().toISOString().slice(0, 7);
      const period = this.period;
      const [attendance, balances] = await Promise.all([
        api(`/api/hr/attendance?period=${period}&limit=250`, { signal }),
        api(`/api/hr/leave-balances?year=${period.slice(0, 4)}`, { signal })
      ]);
      const counts = attendance.items.reduce((out, row) => (out[row.status] = (out[row.status] || 0) + 1, out), {});
      const editable = can('attendance.edit'), entry = editable || can('attendance.create');
      const actions = `<label class="period-picker"><span>Periode</span><input id="attendancePeriod" type="month" value="${esc(period)}"></label>${editable ? `<button class="btn secondary" id="attendanceImport">${ICONS.job} Import CSV</button><input id="attendanceFile" type="file" accept=".csv,text/csv" hidden>` : ''}${entry ? `<button class="btn primary" id="attendanceCreate">${ICONS.plus} Catat kehadiran</button>` : ''}`;
      main.innerHTML = pageHead({ eyebrow: 'HRD', title: 'Kehadiran & cuti', sub: 'Kehadiran harian, saldo cuti, dan sumber data tercatat dalam satu kontrol operasional.', actions }) + `
        <section class="metrics">
          ${kpiCard({ label: 'Hadir', value: String((counts.PRESENT || 0) + (counts.LATE || 0)), note: `${counts.LATE || 0} terlambat`, orb: 'checkCircle', orbTone: 'mint' })}
          ${kpiCard({ label: 'Tidak hadir', value: String(counts.ABSENT || 0), note: 'Mempengaruhi kalkulasi payroll', tone: counts.ABSENT ? 'warn' : '', orb: 'alert', orbTone: 'coral' })}
          ${kpiCard({ label: 'Cuti / sakit', value: String((counts.LEAVE || 0) + (counts.SICK || 0)), note: `${counts.LEAVE || 0} cuti · ${counts.SICK || 0} sakit`, orb: 'clock', orbTone: 'amber' })}
          ${kpiCard({ label: 'Data tercatat', value: String(attendance.total), note: `Periode ${period}`, orb: 'people', orbTone: 'blue' })}
        </section>
        ${entry ? `<section class="scan-attend">
          <div class="scan-attend-copy"><p class="eyebrow">ABSENSI KARTU</p><h2>Scan QR / Barcode Kartu Pegawai</h2><p class="muted">Arahkan pemindai ke kartu pegawai, atau ketik kode karyawan lalu tekan Enter. Scan pertama hari ini = <b>masuk</b>, scan berikutnya = <b>keluar</b>.</p></div>
          <form class="scan-attend-form" id="scanAttendForm"><input id="scanAttendInput" class="scan-attend-input" placeholder="EMP-MAT-0001" autocomplete="off" spellcheck="false"><button class="btn primary" type="submit">${ICONS.checkCircle || ICONS.plus} Rekam</button></form>
          <div class="scan-attend-out" id="scanAttendOut" aria-live="polite"></div>
        </section>` : ''}
        <section class="dashboard-grid">
          <article class="panel"><header><div><p class="eyebrow">KEHADIRAN</p><h2>Catatan harian</h2></div></header><div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Karyawan</th><th>Masuk–keluar</th><th>Status</th><th>Sumber</th></tr></thead><tbody>${attendance.items.map(r => `<tr><td>${fmtDate(r.workDate)}</td><td><b>${esc(r.employeeName)}</b><small>${esc(r.employeeCode || r.nik)} · ${esc(r.department)}</small></td><td>${r.checkIn ? fmtDateTime(r.checkIn) : '—'}<small>${r.checkOut ? fmtDateTime(r.checkOut) : 'Belum keluar'}</small></td><td>${chip(r.status)}</td><td><span class="chip gray">${esc(r.source)}</span></td></tr>`).join('') || '<tr><td colspan="5" class="table-loading">Belum ada data kehadiran.</td></tr>'}</tbody></table></div></article>
          <article class="panel"><header><div><p class="eyebrow">SALDO CUTI</p><h2>Hak tahun ${esc(period.slice(0, 4))}</h2></div></header><div class="panel-body stack">${balances.items.slice(0, 12).map(r => `<div class="stat-row"><span><b>${esc(r.employeeName)}</b><small>${esc(r.department)}</small></span><b>${Number(r.remaining)} / ${Number(r.entitlement)} hari</b></div>`).join('') || '<p class="muted">Belum ada saldo cuti.</p>'}</div></article>
        </section>`;
      main.querySelector('#attendancePeriod').addEventListener('change', e => { this.period = e.target.value; this.render(main); });
      const scanForm = main.querySelector('#scanAttendForm');
      scanForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const inp = main.querySelector('#scanAttendInput'), out = main.querySelector('#scanAttendOut'), code = inp.value.trim();
        if (!code) return;
        const LBL = { CHECK_IN: 'MASUK', CHECK_OUT: 'KELUAR', ALREADY_IN: 'sudah masuk', COMPLETE: 'sudah lengkap' };
        const TONE = { CHECK_IN: 'mint', CHECK_OUT: 'blue', ALREADY_IN: 'amber', COMPLETE: 'gray' };
        try {
          const r = await api('/api/hr/attendance/scan', { method: 'POST', body: { code } });
          const t = TONE[r.action] || 'gray';
          out.innerHTML = `<div class="scan-attend-card ${t}"><b>${esc(r.employeeName)}</b><span class="chip ${t}">${LBL[r.action] || r.action}</span><small>${esc(r.employeeCode || '')}${r.checkIn ? ' · masuk ' + esc(r.checkIn) : ''}${r.checkOut ? ' · keluar ' + esc(r.checkOut) : ''}</small></div>`;
          toast(`${r.employeeName} — ${LBL[r.action] || r.action}`, r.checkOut ? `Keluar ${r.checkOut}` : `Masuk ${r.checkIn || ''}`, r.action === 'COMPLETE' ? 'amber' : 'mint');
          inp.value = ''; inp.focus();
          if (r.action === 'CHECK_IN' || r.action === 'CHECK_OUT') setTimeout(() => this.render(main), 1400);
        } catch (err) { out.innerHTML = `<div class="scan-attend-card coral"><b>Gagal</b><small>${esc(err.message)}</small></div>`; toast('Scan gagal', err.message, 'coral'); inp.select(); }
      });
      main.querySelector('#attendanceCreate')?.addEventListener('click', async () => { try { const employees = editable ? await api('/api/employees?limit=250') : null; const fields = [{ name: 'workDate', label: 'Tanggal kerja', type: 'date', value: new Date().toISOString().slice(0, 10), required: true }, { name: 'status', label: 'Status', type: 'select', options: editable ? [['PRESENT', 'Hadir'], ['LATE', 'Terlambat'], ['ABSENT', 'Tidak hadir'], ['LEAVE', 'Cuti'], ['SICK', 'Sakit'], ['REMOTE', 'Remote']] : [['PRESENT', 'Hadir'], ['REMOTE', 'Remote']], required: true }, { name: 'checkIn', label: 'Waktu masuk', type: 'datetime-local' }, { name: 'checkOut', label: 'Waktu keluar', type: 'datetime-local' }, { name: 'notes', label: 'Catatan', type: 'textarea' }]; if (editable) fields.unshift({ name: 'employeeId', label: 'Karyawan', type: 'select', options: employees.items.map(x => [x.id, `${x.nik} · ${x.name}`]), required: true }); const value = await formDialog({ title: 'Catat kehadiran', description: 'Data pada tanggal yang sama akan diperbarui, bukan diduplikasi.', fields, submitLabel: 'Simpan kehadiran' }); if (!value) return; await api('/api/hr/attendance', { method: 'POST', body: value }); toast('Kehadiran tersimpan'); this.render(main); } catch (error) { toast('Penyimpanan gagal', error.message, 'coral'); } });
      const picker = main.querySelector('#attendanceFile'); main.querySelector('#attendanceImport')?.addEventListener('click', () => picker.click()); picker?.addEventListener('change', async () => { const file = picker.files[0]; if (!file) return; try { const saved = await uploadFile('/api/files?module=attendance', file); await api('/api/jobs', { method: 'POST', body: { type: 'IMPORT_CSV', params: { module: 'attendance', fileId: saved.id } } }); toast('Import dijadwalkan', 'Format: nik, work_date, check_in, check_out, status, notes.'); } catch (error) { toast('Import gagal', error.message, 'coral'); } });
    }
  };

  const payrollPage = {
    permission: 'payroll.view|payroll.view_self',
    onEvent() { this._table?.reload(); },
    async render(main) {
      if (!can('payroll.view') && can('payroll.view_self')) {
        const data = await api('/api/payroll/my');
        main.innerHTML = pageHead({ eyebrow: 'PENGGAJIAN', title: 'Slip gaji saya', sub: 'Rincian gaji hanya terlihat oleh Anda dan petugas HR yang berwenang.' }) + `<section class="report-grid">${data.items.map(item => `<article class="panel report-card"><div class="clay-orb mint">${ICONS.payslip}</div><p class="eyebrow">${esc(item.period)}</p><h2>${esc(item.documentNumber)}</h2><div class="stack"><div class="stat-row"><span>Gaji pokok</span><b>${fmtIDR(item.baseSalary)}</b></div><div class="stat-row"><span>Tunjangan & lembur</span><b>${fmtIDR(Number(item.allowances) + Number(item.overtime))}</b></div><div class="stat-row"><span>BPJS + PPh 21</span><b>${fmtIDR(Number(item.bpjsEmployee) + Number(item.pph21))}</b></div><div class="stat-row"><span>Gaji bersih</span><b>${fmtIDR(item.netPay)}</b></div></div><button class="btn secondary" data-slip="${esc(item.payrollDocumentId)}">${ICONS.doc} Buat slip PDF</button></article>`).join('') || '<article class="panel"><div class="empty-state"><div class="clay-orb blue">' + ICONS.payslip + '</div><h3>Belum ada slip gaji</h3><p>Slip tampil setelah payroll disetujui.</p></div></article>'}</section>`;
        main.querySelectorAll('[data-slip]').forEach(btn => btn.addEventListener('click', async () => { try { await api('/api/jobs', { method: 'POST', body: { type: 'PAYROLL_SLIPS', params: { documentId: btn.dataset.slip } } }); toast('Slip dijadwalkan', 'PDF privat akan tersedia di halaman Job.'); } catch (error) { toast('Pembuatan slip gagal', error.message, 'coral'); } }));
        return;
      }
      const create = can('payroll.create');
      main.innerHTML = pageHead({ eyebrow: 'PENGGAJIAN', title: 'Payroll', sub: 'Kalkulasi gaji mengambil gaji pokok, komponen, kehadiran, BPJS, dan PPh 21 secara terkendali.', actions: create ? `<button class="btn primary" id="payrollCreate">${ICONS.plus} Hitung payroll</button>` : '' }) + '<section id="payrollTable"></section>';
      this._table = dataTable(main.querySelector('#payrollTable'), { key: 'documents:PAYROLL_RUN', endpoint: '/api/documents', params: { type: 'PAYROLL_RUN' }, title: 'Payroll run', eyebrow: 'PAYROLL', columns: [{ label: 'Periode', render: docCell }, { label: 'Karyawan', render: r => `${r.payload?.headcount || '—'} orang` }, { label: 'Gaji bersih', right: true, render: r => `<span class="money">${fmtIDR(r.amount)}</span>` }, { label: 'BPJS', right: true, render: r => fmtIDR(r.payload?.bpjs || 0) }, { label: 'PPh 21', right: true, render: r => fmtIDR(r.payload?.pph21 || 0) }, { label: 'Status', render: r => chip(r.status) }], statusFilter: ['DRAFT', 'WAITING_APPROVAL', 'APPROVED', 'CLOSED', 'VOID'], onRow: (row) => router.go('#/payroll/runs/' + row.id), empty: { icon: 'payslip', title: 'Belum ada payroll run' } });
      main.querySelector('#payrollCreate')?.addEventListener('click', async () => { const value = await formDialog({ title: 'Hitung payroll', description: 'Sistem menghitung seluruh karyawan aktif. Hasil dibuat sebagai draft untuk ditinjau sebelum approval dan posting.', fields: [{ name: 'period', label: 'Periode penggajian', type: 'month', value: new Date().toISOString().slice(0, 7), required: true }, { name: 'title', label: 'Judul payroll', value: `Payroll ${new Date().toISOString().slice(0, 7)}` }], submitLabel: 'Hitung payroll' }); if (!value) return; try { const result = await api('/api/payroll/runs', { method: 'POST', body: value }); toast('Payroll dihitung', `${result.headcount} karyawan · ${fmtIDR(result.total)}`); router.go('#/payroll/runs/' + result.document.id); } catch (error) { toast('Kalkulasi gagal', error.message, 'coral'); } });
    }
  };

  // Payroll Register — drill-down per-karyawan untuk satu payroll run (read-only,
  // lifecycle/approval tetap via document drawer). Sumber: /api/payroll/runs/:id/items.
  const payrollRegisterPage = {
    permission: 'payroll.view',
    async render(main, params, signal) {
      const id = params.id;
      let doc, items;
      try { [doc, items] = await Promise.all([api('/api/documents/' + id, { signal }), api('/api/payroll/runs/' + id + '/items', { signal })]); }
      catch (error) { main.innerHTML = pageHead({ eyebrow: 'PENGGAJIAN · REGISTER', title: 'Payroll Register' }) + `<section class="panel"><div class="empty-state">${clayOrb('coral', 'alert')}<h3>Gagal memuat register</h3><p>${esc(error.message)}</p></div></section>`; return; }
      const rows = (Array.isArray(items) ? items : (items && items.items) || []).map((r) => { const base = Number(r.baseSalary) || 0, allow = Number(r.allowances) || 0, ot = Number(r.overtime) || 0, ded = Number(r.deductions) || 0, bpjsE = Number(r.bpjsEmployee) || 0, bpjsC = Number(r.bpjsCompany) || 0, pph = Number(r.pph21) || 0, net = Number(r.netPay) || 0; return { employeeId: r.employeeId, employeeName: r.employeeName, nik: r.nik, department: r.department, base, allow, ot, ded, bpjsE, bpjsC, pph, net, gross: base + allow + ot }; });
      const T = rows.reduce((o, r) => { o.base += r.base; o.allow += r.allow; o.ot += r.ot; o.ded += r.ded; o.bpjsE += r.bpjsE; o.bpjsC += r.bpjsC; o.pph += r.pph; o.net += r.net; o.gross += r.gross; return o; }, { base: 0, allow: 0, ot: 0, ded: 0, bpjsE: 0, bpjsC: 0, pph: 0, net: 0, gross: 0 });
      const period = (doc.payload && doc.payload.period) || '—', status = doc.status || doc.lifecycleStatus || '';
      const metric = (label, value, note, icon, tone) => `<article class="mk-surface mk-metric"><div class="mk-m-copy"><span class="mk-m-k">${esc(label)}</span><div class="mk-m-v">${esc(value)}</div><span class="mk-m-note mk-mu">${esc(note)}</span></div><div class="mk-m-ic mk-ic-${tone}">${ICONS[icon] || ''}</div></article>`;
      const canManage = can('payroll.approve') || can('payroll.submit') || can('payroll.post') || can('payroll.create');
      main.innerHTML = pageHead({ eyebrow: 'PENGGAJIAN · REGISTER', title: `Payroll Register — ${esc(period)}`, sub: `${esc(doc.documentNumber || '')} · ${rows.length} karyawan · status ${esc(String(status))}`, actions: `<button class="btn secondary" id="regBack">← Kembali</button><button class="btn secondary" id="regCsv">${ICONS.doc || ''} Export CSV</button>${canManage ? `<button class="btn primary" id="regManage">${ICONS.gear || ''} Kelola / Approval</button>` : ''}` }) + `<div class="mk360 mk-analytics">
        <div class="mk-g mk-g4">
          ${metric('Headcount', String(rows.length), 'karyawan diproses', 'people', 'blue')}
          ${metric('Total Bruto', fmtIDR(T.gross), 'pokok + tunjangan + lembur', 'wallet', 'blue')}
          ${metric('Total PPh 21', fmtIDR(T.pph), 'pajak dipotong', 'shield', 'amber')}
          ${metric('Total Gaji Bersih', fmtIDR(T.net), 'take home pay', 'checkCircle', 'emerald')}
        </div>
        <section class="mk-surface"><div class="mk-section-head"><div class="mk-section-title">${ICONS.payslip || ''} Register per Karyawan</div><span class="mk-mu">BPJS perusahaan ${fmtIDR(T.bpjsC)} · total potongan karyawan ${fmtIDR(T.bpjsE + T.pph + T.ded)}</span></div>
        <div class="mk-section-body"><div class="mk-reg-wrap"><table class="mk-reg"><thead><tr><th>Karyawan</th><th class="r">Gaji Pokok</th><th class="r">Tunjangan</th><th class="r">Lembur</th><th class="r">Potongan</th><th class="r">BPJS Kar.</th><th class="r">PPh 21</th><th class="r">Gaji Bersih</th></tr></thead>
        <tbody>${rows.map((r) => `<tr data-emp="${esc(r.employeeId || '')}"><td><div class="mk-reg-emp"><b>${esc(r.employeeName)}</b><small>${esc(r.nik || '')} · ${esc(r.department || '')}</small></div></td><td class="r">${fmtIDR(r.base)}</td><td class="r">${fmtIDR(r.allow)}</td><td class="r">${fmtIDR(r.ot)}</td><td class="r">${fmtIDR(r.ded)}</td><td class="r">${fmtIDR(r.bpjsE)}</td><td class="r">${fmtIDR(r.pph)}</td><td class="r b">${fmtIDR(r.net)}</td></tr>`).join('') || `<tr><td colspan="8" class="mk-reg-empty">Belum ada item payroll pada run ini.</td></tr>`}</tbody>
        <tfoot><tr><td>Total (${rows.length})</td><td class="r">${fmtIDR(T.base)}</td><td class="r">${fmtIDR(T.allow)}</td><td class="r">${fmtIDR(T.ot)}</td><td class="r">${fmtIDR(T.ded)}</td><td class="r">${fmtIDR(T.bpjsE)}</td><td class="r">${fmtIDR(T.pph)}</td><td class="r b">${fmtIDR(T.net)}</td></tr></tfoot>
        </table></div></div></section>
      </div>`;
      main.querySelector('#regBack')?.addEventListener('click', () => router.go('#/payroll'));
      main.querySelector('#regManage')?.addEventListener('click', () => openDrawer(id, { onChange: () => this.render(main, params) }));
      main.querySelectorAll('.mk-reg tbody tr[data-emp]').forEach((tr) => tr.addEventListener('click', () => { const e = tr.dataset.emp; if (e) router.go('#/masters/employees/detail/' + e); }));
      main.querySelector('#regCsv')?.addEventListener('click', () => {
        const head = ['Karyawan', 'NIK', 'Departemen', 'Gaji Pokok', 'Tunjangan', 'Lembur', 'Potongan', 'BPJS Karyawan', 'PPh 21', 'Gaji Bersih'];
        const csv = [head.join(',')].concat(rows.map((r) => [r.employeeName, r.nik || '', r.department || '', r.base, r.allow, r.ot, r.ded, r.bpjsE, r.pph, r.net].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))).join('\r\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })); a.download = `payroll-register-${period}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
        toast('CSV diunduh', `payroll-register-${period}.csv`);
      });
    }
  };

  // ── Laporan ───────────────────────────────────────────────────────────────

  const R = router.register.bind(router);
  const empInitials = (n) => String(n || '?').split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
  // Sel data-quality (CSP-safe: <progress> value/max, bukan inline style).
  const dqCell = (score, flags) => {
    const s = Math.max(0, Math.min(100, Number(score) || 0)), tone = s >= 80 ? 'mint' : s >= 50 ? 'amber' : 'coral';
    const fc = Array.isArray(flags) ? flags.length : 0;
    return `<div class="dq-cell ${tone}"><progress class="dq-mini" max="100" value="${s}"></progress><b>${s}%</b>${fc ? `<span class="dq-flags" title="${fc} isu data quality">${fc} isu</span>` : ''}</div>`;
  };
  R('/hr/employees', masterPage({
    endpoint: '/api/employees', key: 'employees', permission: 'employee.view', title: 'Karyawan', eyebrow: 'HRD', detailType: 'employees',
    presentation: { shell: 'mk-dir', subtitle: 'Klik profil untuk membuka Employee 360 — identitas, kepegawaian, kompensasi, pajak, BPJS, dan tata kelola data.', kpis: async () => { const d = await api('/api/hr/workforce-analytics').catch(() => ({})); const k = d.kpi || {}; return [{ label: 'Total Headcount', value: k.total || 0, note: `${k.active || 0} aktif`, tone: 'blue', icon: 'people' }, { label: 'Cakupan BPJS', value: k.bpjsCovered || 0, note: `dari ${k.total || 0} karyawan`, tone: 'emerald', icon: 'shield' }, { label: 'Rata-rata Data Quality', value: (k.avgQuality || 0) + '%', note: (k.avgQuality || 0) >= 80 ? 'golden record' : 'perlu dilengkapi', tone: 'amber', icon: 'checkCircle' }, { label: 'Hire Baru (90 hari)', value: k.newHires90d || 0, note: 'akuisisi talenta', tone: 'blue', icon: 'people' }]; } },
    fields:async()=>{
      const branches=await api('/api/branches');
      let depts=[];try{const emps=await api('/api/employees?limit=250');depts=[...new Set(emps.items.map(e=>e.department).filter(Boolean))];}catch(_){}
      const deptList=[...new Set([...depts,'Produksi','Engineering','Quality Control','Finance','HRD','Procurement','Warehouse','Sales & Marketing','IT','General Affairs','Maintenance'])];
      return [
        {type:'section',label:'Data Pokok Kepegawaian',icon:ICONS.job,hint:'Kode Karyawan (EMP-…) dibuat otomatis oleh sistem.'},
        {name:'name',label:'Nama lengkap',required:true,hint:'Sesuai dokumen resmi.'},
        {name:'nik',label:'No. Induk / NIP internal',required:true,hint:'Nomor kepegawaian internal — BUKAN NIK KTP (diisi di menu Ubah Data, terenkripsi).'},
        {name:'department',label:'Departemen',required:true,list:deptList,hint:'Pilih dari daftar atau ketik departemen baru.'},
        {name:'jobTitle',label:'Jabatan'},
        {name:'branchId',label:'Lokasi kerja / cabang',type:'select',options:branches.items.map(x=>[x.id,`${x.code} · ${x.name}`]),required:true},
        {name:'joinDate',label:'Tanggal bergabung',type:'date',value:new Date().toISOString().slice(0,10)},
        {name:'active',label:'Karyawan aktif',type:'checkbox'},
        {type:'section',label:'Kompensasi Awal',icon:ICONS.wallet,hint:'Gaji dapat direvisi kemudian di tab Kompensasi (revisi resmi).'},
        {name:'baseSalary',label:'Gaji pokok (Rp)',type:'number',min:0,step:1000,required:true},
        {name:'bpjs',label:'Didaftarkan BPJS Ketenagakerjaan & Kesehatan',type:'checkbox'}
      ];
    },
    columns: [
      { label: 'Karyawan', render: (r) => `<div class="emp-cell"><span class="emp-cell-av"><span class="emp-cell-fallback">${empInitials(r.name)}</span>${r.profileFileId ? `<img data-party-photo src="/api/files/${esc(r.profileFileId)}" alt="" loading="lazy" decoding="async">` : ''}</span><span class="emp-cell-copy"><b>${esc(r.name)}</b><small><span class="emp-code">${esc(r.employeeCode || '—')}</span><i>·</i>${esc(r.jobTitle || '—')}</small></span></div>` },
      { label: 'Departemen & Lokasi', render: (r) => `<div class="emp-cell-copy"><b>${esc(r.department || '—')}</b><small>${esc(r.branchName || '—')}</small></div>` },
      { label: 'Gaji Pokok', right: true, render: (r) => can('payroll.view') ? `<span class="money">${fmtIDR(r.baseSalary)}</span>` : '<span class="chip gray">Tersembunyi</span>' },
      { label: 'BPJS', render: (r) => r.bpjs ? '<span class="chip mint">Terdaftar</span>' : '<span class="chip gray">—</span>' },
      { label: 'Status', render: (r) => chip(r.lifecycleStatus || (r.active ? 'ACTIVE' : 'INACTIVE')) },
      { label: 'Kualitas Data', render: (r) => dqCell(r.dataQualityScore, r.qualityFlags) },
      { label: 'Bergabung', render: (r) => fmtDate(r.joinDate) }
    ]
  }));
  // ── Workforce: shift/roster, kalender kerja, koreksi absensi (Sprint 14) ──
  const workforcePage = {
    permission: 'attendance.view',
    async render(main) {
      this._period = this._period || new Date().toISOString().slice(0, 7);
      const [shifts, roster, calendar, corrections] = await Promise.all([
        api('/api/hr/shifts'), api(`/api/hr/roster?period=${this._period}`),
        api(`/api/hr/calendar?year=${this._period.slice(0, 4)}`), api('/api/hr/corrections?status=PENDING')
      ]);
      const CO_CHIP = { PENDING: 'amber', APPROVED: 'mint', REJECTED: 'coral' };
      main.innerHTML = pageHead({
        eyebrow: 'HRD', title: 'Workforce: shift, kalender & koreksi', sub: 'Jam standar lembur payroll mengikuti shift roster (default NORMAL); durasi cuti mengikuti kalender kerja.',
        actions: `<label class="period-picker"><span>Periode</span><input id="wfPeriod" type="month" value="${esc(this._period)}"></label>
          ${can('attendance.edit') ? `<button class="btn secondary" id="wfHoliday">${ICONS.plus} Hari libur</button><button class="btn primary" id="wfRoster">${ICONS.plus} Tetapkan roster</button>` : ''}`
      }) + `
        <section class="metrics">
          ${shifts.items.slice(0, 4).map((s) => kpiCard({ label: `${s.code}${s.isDefault ? ' (default)' : ''}`, value: `${s.effectiveHours} jam`, note: `${String(s.startTime).slice(0, 5)}–${String(s.endTime).slice(0, 5)} · istirahat ${s.breakMinutes}m`, orb: 'clock', orbTone: s.isDefault ? 'mint' : 'blue' })).join('')}
        </section>
        <section class="dashboard-grid">
          <article class="panel"><header><div><p class="eyebrow">ROSTER ${esc(this._period)}</p><h2>${roster.items.length} penetapan shift</h2></div></header>
            <div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Karyawan</th><th>Shift</th><th class="right">Jam efektif</th></tr></thead>
            <tbody>${roster.items.slice(0, 50).map((r) => `<tr><td>${fmtDate(r.workDate)}</td><td><b>${esc(r.employeeName)}</b><small>${esc(r.nik)}</small></td><td><span class="chip blue">${esc(r.shiftCode)}</span> ${esc(r.shiftName)}</td><td class="right">${r.effectiveHours} j</td></tr>`).join('') || '<tr><td colspan="4" class="table-loading">Tanpa roster — semua memakai shift default.</td></tr>'}</tbody></table></div>
          </article>
          <article class="panel"><header><div><p class="eyebrow">KALENDER ${esc(calendar.year)}</p><h2>${calendar.items.length} hari libur</h2></div><span class="chip gray">Akhir pekan: ${calendar.weekendDays.map((d2) => ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][d2]).join(' & ')}</span></header>
            <div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Keterangan</th><th>Cakupan</th></tr></thead>
            <tbody>${calendar.items.map((h) => `<tr><td><b>${fmtDate(h.holidayDate)}</b></td><td>${esc(h.name)}</td><td>${esc(h.branchName || 'Nasional')}</td></tr>`).join('') || '<tr><td colspan="3" class="table-loading">Belum ada hari libur terdaftar.</td></tr>'}</tbody></table></div>
          </article>
        </section>
        <section class="panel"><header><div><p class="eyebrow">KOREKSI ABSENSI</p><h2>${corrections.items.length} menunggu keputusan</h2></div>${can('attendance.create') ? `<button class="btn secondary" id="wfCorrect">${ICONS.plus} Ajukan koreksi</button>` : ''}</header>
          <div class="table-wrap"><table><thead><tr><th>Karyawan</th><th>Tanggal</th><th>Lama → Usulan</th><th>Alasan</th><th>Pemohon</th><th>Status</th><th></th></tr></thead>
          <tbody>${corrections.items.map((r) => `<tr><td><b>${esc(r.employeeName)}</b><small>${esc(r.nik)}</small></td><td>${fmtDate(r.workDate)}</td>
            <td><span class="chip gray">${esc(r.oldValue?.status || '—')}</span> → <span class="chip blue">${esc(r.proposed?.status || 'jam')}</span></td>
            <td>${esc(r.reason)}</td><td>${esc(r.requestedByName || '—')}</td>
            <td><span class="chip ${CO_CHIP[r.status]}">${esc(r.status)}</span></td>
            <td>${r.status === 'PENDING' && can('attendance.approve') ? `<div class="row-actions"><button class="btn primary sm" data-codec="${r.id}" data-dec="approve">Setujui</button><button class="btn danger-outline sm" data-codec="${r.id}" data-dec="reject">Tolak</button></div>` : ''}</td></tr>`).join('') || '<tr><td colspan="7" class="table-loading">Tidak ada koreksi menunggu.</td></tr>'}</tbody></table></div>
          <div class="panel-body"><p class="muted">SoD: pemohon tidak dapat memutus koreksinya sendiri (ditegakkan sampai constraint database). Nilai lama dibekukan permanen; hasil approve tercatat source CORRECTION.</p></div>
        </section>`;
      main.querySelector('#wfPeriod').addEventListener('change', (e) => { this._period = e.target.value; this.render(main); });
      main.querySelector('#wfRoster')?.addEventListener('click', async () => {
        try {
          const employees = await api('/api/employees?limit=200');
          const value = await formDialog({ title: 'Tetapkan roster', description: 'Shift menentukan jam standar lembur payroll pada tanggal tersebut.', fields: [
            { name: 'employeeId', label: 'Karyawan', type: 'select', options: employees.items.map((e2) => [e2.id, `${e2.nik} · ${e2.name}`]), required: true },
            { name: 'workDate', label: 'Tanggal (YYYY-MM-DD)', required: true },
            { name: 'shiftId', label: 'Shift', type: 'select', options: shifts.items.map((s2) => [s2.id, `${s2.code} · ${s2.effectiveHours} jam`]), required: true }
          ], submitLabel: 'Tetapkan' });
          if (!value) return;
          await api('/api/hr/roster', { method: 'POST', idempotencyKey: newIdemKey(), body: { assignments: [value] } });
          toast('Roster ditetapkan', ''); this.render(main);
        } catch (error) { toast('Gagal menetapkan roster', error.message, 'coral'); }
      });
      main.querySelector('#wfHoliday')?.addEventListener('click', async () => {
        const value = await formDialog({ title: 'Tambah hari libur', description: 'Hari libur dilewati saat menghitung durasi cuti.', fields: [
          { name: 'holidayDate', label: 'Tanggal (YYYY-MM-DD)', required: true },
          { name: 'name', label: 'Keterangan', required: true }
        ], submitLabel: 'Simpan' });
        if (!value) return;
        try { await api('/api/hr/calendar', { method: 'POST', idempotencyKey: newIdemKey(), body: value }); toast('Hari libur tersimpan', ''); this.render(main); }
        catch (error) { toast('Gagal menyimpan', error.message, 'coral'); }
      });
      main.querySelector('#wfCorrect')?.addEventListener('click', async () => {
        try {
          const employees = await api('/api/employees?limit=200');
          const value = await formDialog({ title: 'Ajukan koreksi absensi', description: 'Nilai lama dibekukan; perubahan berlaku setelah disetujui pemutus berbeda.', fields: [
            { name: 'employeeId', label: 'Karyawan', type: 'select', options: employees.items.map((e2) => [e2.id, `${e2.nik} · ${e2.name}`]), required: true },
            { name: 'workDate', label: 'Tanggal (YYYY-MM-DD)', required: true },
            { name: 'status', label: 'Status usulan', type: 'select', options: [['', '— tidak diubah —'], ['PRESENT', 'Hadir'], ['LATE', 'Terlambat'], ['ABSENT', 'Absen'], ['LEAVE', 'Cuti'], ['SICK', 'Sakit'], ['REMOTE', 'Remote']] },
            { name: 'checkIn', label: 'Jam masuk usulan (opsional, ISO)' },
            { name: 'checkOut', label: 'Jam pulang usulan (opsional, ISO)' },
            { name: 'reason', label: 'Alasan koreksi', type: 'textarea', required: true }
          ], submitLabel: 'Ajukan koreksi' });
          if (!value) return;
          await api('/api/hr/corrections', { method: 'POST', idempotencyKey: newIdemKey(), body: { employeeId: value.employeeId, workDate: value.workDate, reason: value.reason, proposed: { status: value.status || null, checkIn: value.checkIn || null, checkOut: value.checkOut || null } } });
          toast('Koreksi diajukan', 'Menunggu keputusan pemutus berbeda (SoD).'); this.render(main);
        } catch (error) { toast('Gagal mengajukan', error.message, 'coral'); }
      });
      main.querySelectorAll('[data-codec]').forEach((b) => b.addEventListener('click', async () => {
        const approve = b.dataset.dec === 'approve';
        const answer = await actionDialog({ title: approve ? 'Setujui koreksi' : 'Tolak koreksi', description: approve ? 'Absensi diperbarui dengan source CORRECTION.' : 'Koreksi ditolak; absensi tidak berubah.', requireReason: true, confirmLabel: approve ? 'Setujui' : 'Tolak', danger: !approve });
        if (!answer) return;
        try { await api(`/api/hr/corrections/${b.dataset.codec}/${b.dataset.dec}`, { method: 'POST', idempotencyKey: newIdemKey(), body: answer }); toast(approve ? 'Koreksi disetujui' : 'Koreksi ditolak', ''); this.render(main); }
        catch (error) { toast('Gagal memutus', error.message, 'coral'); }
      }));
    }
  };

  R('/hr/attendance', attendancePage);
  R('/hr/workforce', workforcePage);
  R('/hr/leave', docListPage({
    type: 'LEAVE_REQUEST', module: 'leave', title: 'Pengajuan cuti', eyebrow: 'HRD',
    createLabel: 'Ajukan cuti',
    columns: [
      { label: 'Dokumen', render: docCell },
      { label: 'Rentang', render: (r) => r.payload && r.payload.startDate ? `${fmtDate(r.payload.startDate)} — ${fmtDate(r.payload.endDate)}` : '—' },
      { label: 'Hari kerja', render: (r) => r.payload && r.payload.leaveApplied ? `<span class="chip mint">${r.payload.leaveApplied.days} hari terpotong</span>` : '—' },
      { label: 'Status', render: (r) => chip(r.status) },
      { label: 'Diperbarui', render: (r) => relTime(r.updatedAt) }
    ],
    onCreate: async (reload) => {
      try {
        const [employees, balances] = await Promise.all([api('/api/employees?limit=200'), api('/api/hr/leave-balances').catch(() => ({ length: 0 }))]);
        const value = await formDialog({ title: 'Ajukan cuti', description: 'Durasi dihitung dari HARI KERJA (akhir pekan & libur dilewati); saldo divalidasi saat pengajuan dan terpotong saat disetujui penuh.', fields: [
          { name: 'employeeId', label: 'Karyawan', type: 'select', options: employees.items.map((e2) => [e2.id, `${e2.nik} · ${e2.name}`]), required: true },
          { name: 'startDate', label: 'Mulai (YYYY-MM-DD)', required: true },
          { name: 'endDate', label: 'Selesai (YYYY-MM-DD)', required: true },
          { name: 'title', label: 'Keterangan', required: true }
        ], submitLabel: 'Buat & ajukan' });
        if (!value) return;
        const doc = await api('/api/documents', { method: 'POST', idempotencyKey: newIdemKey(), body: { type: 'LEAVE_REQUEST', title: value.title, amount: 0, payload: { employeeId: value.employeeId, startDate: value.startDate, endDate: value.endDate } } });
        await api(`/api/documents/${doc.id}/action`, { method: 'POST', idempotencyKey: newIdemKey(), body: { action: 'submit' } });
        toast(`${doc.documentNumber} diajukan`, 'Saldo tervalidasi — menunggu persetujuan.');
        if (reload) reload();
      } catch (error) { toast('Pengajuan cuti gagal', error.message, 'coral'); }
    }
  }));
  R('/payroll', payrollPage);
  R('/payroll/runs/:id', payrollRegisterPage);

  // Kasbon / Pinjaman Karyawan — pengajuan + persetujuan (SoD) + potongan payroll
  // otomatis (approve → payroll_components DEDUCTION; lunas/batal → nonaktif).
  const LOAN_TYPE_LABEL = { KASBON: 'Kasbon', INSTALLMENT: 'Cicilan', EMERGENCY: 'Darurat' };
  const LOAN_STATUS_TONE = { PENDING: 'amber', APPROVED: 'blue', ACTIVE: 'blue', SETTLED: 'mint', REJECTED: 'coral', CANCELLED: 'gray' };
  const loansPage = {
    permission: 'employee.view',
    async render(main, _p, signal) {
      let d, emps;
      try { [d, emps] = await Promise.all([api('/api/hr/loans', { signal }), api('/api/employees?limit=200', { signal }).catch(() => ({ items: [] }))]); }
      catch (error) { main.innerHTML = pageHead({ eyebrow: 'PENGGAJIAN · PINJAMAN', title: 'Pinjaman Karyawan' }) + `<section class="panel"><div class="empty-state">${clayOrb('coral', 'alert')}<h3>Gagal memuat</h3><p>${esc(error.message)}</p></div></section>`; return; }
      const items = d.items || [], s = d.summary || {};
      const metric = (label, value, note, icon, tone) => `<article class="mk-surface mk-metric"><div class="mk-m-copy"><span class="mk-m-k">${esc(label)}</span><div class="mk-m-v">${esc(value)}</div><span class="mk-m-note mk-mu">${esc(note)}</span></div><div class="mk-m-ic mk-ic-${tone}">${ICONS[icon] || ''}</div></article>`;
      const statusChip = (st) => `<span class="chip ${LOAN_STATUS_TONE[st] || 'gray'}">${esc(st)}</span>`;
      const actionsFor = (r) => r.status === 'PENDING'
        ? `<button class="mk-btn sm" data-loan-approve="${esc(r.id)}">Setujui</button><button class="mk-btn sm mk-cor" data-loan-reject="${esc(r.id)}">Tolak</button>`
        : (r.status === 'ACTIVE' || r.status === 'APPROVED')
          ? `<button class="mk-btn sm" data-loan-settle="${esc(r.id)}">Lunasi</button><button class="mk-btn sm mk-cor" data-loan-cancel="${esc(r.id)}">Batal</button>`
          : '<span class="mk-mu">—</span>';
      main.innerHTML = pageHead({ eyebrow: 'PENGGAJIAN · PINJAMAN', title: 'Kasbon & Pinjaman Karyawan', sub: 'Pengajuan, persetujuan (SoD), dan potongan cicilan otomatis yang terhubung ke payroll.', actions: `<button class="btn primary" id="loanNew">${ICONS.plus} Ajukan Pinjaman</button>` }) + `<div class="mk360 mk-analytics">
        <div class="mk-g mk-g4">
          ${metric('Pengajuan Pending', String(s.pending || 0), 'menunggu persetujuan', 'clock', 'amber')}
          ${metric('Pinjaman Aktif', String(s.active || 0), 'sedang berjalan', 'checkCircle', 'blue')}
          ${metric('Total Outstanding', fmtIDR(s.outstanding || 0), 'sisa pokok belum lunas', 'wallet', 'blue')}
          ${metric('Cicilan / Bulan', fmtIDR(s.monthly || 0), 'potongan payroll aktif', 'payslip', 'emerald')}
        </div>
        <section class="mk-surface"><div class="mk-section-head"><div class="mk-section-title">${ICONS.wallet || ''} Daftar Pinjaman</div><span class="mk-mu">Cicilan disetujui → potongan payroll otomatis</span></div>
        <div class="mk-section-body"><div class="mk-reg-wrap"><table class="mk-reg mk-reg-static"><thead><tr><th>Karyawan</th><th>No. / Jenis</th><th class="r">Pokok</th><th class="r">Tenor</th><th class="r">Cicilan/bln</th><th class="r">Sisa</th><th>Status</th><th>Aksi</th></tr></thead>
        <tbody>${items.map((r) => `<tr><td><div class="mk-reg-emp"><b>${esc(r.employeeName)}</b><small>${esc(r.nik || '')} · ${esc(r.department || '')}</small></div></td><td><b>${esc(r.loanNumber)}</b><small class="mk-mu"> ${esc(LOAN_TYPE_LABEL[r.loanType] || r.loanType)}${r.startPeriod ? ' · mulai ' + esc(r.startPeriod) : ''}</small></td><td class="r">${fmtIDR(r.principalAmount)}</td><td class="r">${esc(String(r.tenorMonths))} bln</td><td class="r">${fmtIDR(r.installmentAmount)}</td><td class="r b">${fmtIDR(r.outstandingAmount)}</td><td>${statusChip(r.status)}</td><td>${actionsFor(r)}</td></tr>`).join('') || `<tr><td colspan="8" class="mk-reg-empty">Belum ada pinjaman terdaftar.</td></tr>`}</tbody>
        </table></div></div></section>
      </div>`;
      const reload = () => this.render(main, _p);
      main.querySelector('#loanNew')?.addEventListener('click', async () => {
        const v = await formDialog({ title: 'Ajukan Pinjaman / Kasbon', description: 'Cicilan otomatis dipotong dari payroll setelah disetujui (SoD: penyetuju ≠ pengaju).', fields: [
          { name: 'employeeId', label: 'Karyawan', type: 'select', options: (emps.items || []).map((e) => [e.id, `${e.name} · ${e.nik || ''}`]), required: true },
          { name: 'loanType', label: 'Jenis', type: 'select', options: [['KASBON', 'Kasbon (cash advance)'], ['INSTALLMENT', 'Pinjaman cicilan'], ['EMERGENCY', 'Darurat']], value: 'KASBON' },
          { name: 'principalAmount', label: 'Jumlah pokok (IDR)', type: 'number', min: 0, required: true },
          { name: 'tenorMonths', label: 'Tenor (bulan)', type: 'number', min: 1, value: 1, required: true },
          { name: 'interestRate', label: 'Bunga total (mis. 0.05 = 5%)', type: 'number', min: 0, step: '0.01', value: 0 },
          { name: 'startPeriod', label: 'Mulai potong', type: 'month', value: new Date().toISOString().slice(0, 7) },
          { name: 'purpose', label: 'Keperluan', type: 'textarea', rows: 2 }
        ], submitLabel: 'Ajukan' });
        if (!v) return;
        try { await api('/api/hr/loans', { method: 'POST', body: v, idempotencyKey: newIdemKey() }); toast('Pengajuan dibuat', 'Menunggu persetujuan.'); reload(); }
        catch (error) { toast('Gagal mengajukan', error.message, 'coral'); }
      });
      const decide = async (id, decision) => {
        const ans = await actionDialog({ title: decision === 'approve' ? 'Setujui pinjaman' : 'Tolak pinjaman', description: decision === 'approve' ? 'Cicilan akan otomatis dipotong payroll. Penyetuju harus berbeda dari pengaju (SoD).' : 'Beri alasan penolakan.', requireReason: decision === 'reject', confirmLabel: decision === 'approve' ? 'Setujui' : 'Tolak', danger: decision === 'reject' });
        if (decision === 'reject' ? !ans : ans === null) return;
        try { await api(`/api/hr/loans/${id}/${decision}`, { method: 'POST', body: { note: ans && ans.reason }, idempotencyKey: newIdemKey() }); toast(decision === 'approve' ? 'Disetujui' : 'Ditolak'); reload(); }
        catch (error) { toast('Gagal memutuskan', error.message, 'coral'); }
      };
      const close = async (id, action) => {
        const ans = await actionDialog({ title: action === 'settle' ? 'Lunasi pinjaman' : 'Batalkan pinjaman', description: 'Potongan payroll untuk pinjaman ini akan dihentikan.', confirmLabel: action === 'settle' ? 'Lunasi' : 'Batalkan', danger: action === 'cancel' });
        if (ans === null) return;
        try { await api(`/api/hr/loans/${id}/${action}`, { method: 'POST', body: {}, idempotencyKey: newIdemKey() }); toast(action === 'settle' ? 'Pinjaman lunas' : 'Pinjaman dibatalkan'); reload(); }
        catch (error) { toast('Gagal', error.message, 'coral'); }
      };
      main.querySelectorAll('[data-loan-approve]').forEach((b) => b.addEventListener('click', () => decide(b.dataset.loanApprove, 'approve')));
      main.querySelectorAll('[data-loan-reject]').forEach((b) => b.addEventListener('click', () => decide(b.dataset.loanReject, 'reject')));
      main.querySelectorAll('[data-loan-settle]').forEach((b) => b.addEventListener('click', () => close(b.dataset.loanSettle, 'settle')));
      main.querySelectorAll('[data-loan-cancel]').forEach((b) => b.addEventListener('click', () => close(b.dataset.loanCancel, 'cancel')));
    }
  };
  R('/hr/loans', loansPage);

  // ── Employee Self-Service: Data Saya + pengkinian identitas (maker-checker) ──
  const svcLen = (d) => { if (!d) return '—'; const st = new Date(d), now = new Date(); let m = (now.getFullYear() - st.getFullYear()) * 12 + (now.getMonth() - st.getMonth()); if (now.getDate() < st.getDate()) m--; if (!(m >= 0)) m = 0; const y = Math.floor(m / 12), mm = m % 12; return y ? `${y} th${mm ? ` ${mm} bln` : ''}` : `${mm} bln`; };
  const SELF_GENDER = { MALE: 'Laki-laki', FEMALE: 'Perempuan' };
  const selfIdentityFields = (p) => [
    { type: 'section', label: 'Data Pribadi', icon: ICONS.people, hint: 'NIK KTP hanya dapat diubah HR.' },
    { name: 'birthPlace', label: 'Tempat lahir', value: p.birthPlace || '' },
    { name: 'birthDate', label: 'Tanggal lahir', type: 'date', value: p.birthDate ? String(p.birthDate).slice(0, 10) : '' },
    { name: 'gender', label: 'Jenis kelamin', type: 'select', options: [['', '—'], ['MALE', 'Laki-laki'], ['FEMALE', 'Perempuan']], value: p.gender || '' },
    { name: 'maritalStatus', label: 'Status perkawinan', type: 'select', options: [['', '—'], ['BELUM KAWIN', 'Belum kawin'], ['KAWIN', 'Kawin'], ['CERAI HIDUP', 'Cerai hidup'], ['CERAI MATI', 'Cerai mati']], value: p.maritalStatus || '' },
    { name: 'religion', label: 'Agama', type: 'select', options: [['', '—'], ['ISLAM', 'Islam'], ['KRISTEN', 'Kristen'], ['KATOLIK', 'Katolik'], ['HINDU', 'Hindu'], ['BUDDHA', 'Buddha'], ['KONGHUCU', 'Konghucu']], value: p.religion || '' },
    { name: 'bloodType', label: 'Golongan darah', type: 'select', options: [['', '—'], ['A', 'A'], ['B', 'B'], ['AB', 'AB'], ['O', 'O']], value: p.bloodType || '' },
    { type: 'section', label: 'Kontak & Alamat', icon: ICONS.building },
    { name: 'phone', label: 'Telepon / HP', type: 'tel', value: p.phone || '' },
    { name: 'personalEmail', label: 'Email pribadi', type: 'email', value: p.personalEmail || '' },
    { name: 'address', label: 'Alamat domisili', type: 'textarea', rows: 2, value: p.address || '' }
  ];
  const myProfilePage = {
    permission: 'employee.view_self',
    async render(main, _p, signal) {
      let data;
      try { data = await api('/api/hr/my-profile', { signal }); }
      catch (error) { main.innerHTML = pageHead({ eyebrow: 'SELF-SERVICE · DATA SAYA', title: 'Data Saya', sub: 'Profil kepegawaian Anda.' }) + `<section class="panel"><div class="empty-state">${clayOrb('amber', 'lock')}<h3>Akun belum tertaut</h3><p>${esc(error.message)}</p></div></section>`; return; }
      const s = data.enterpriseSummary || {}, pos = s.currentPosition || {}, leave = s.leaveBalance || {}, p = data.personal || {};
      const pending = (data.selfUpdates || []).filter((u) => u.status === 'PENDING');
      const g = p.gender ? (SELF_GENDER[p.gender] || p.gender) : '—';
      main.innerHTML = pageHead({
        eyebrow: 'SELF-SERVICE · DATA SAYA', title: `Halo, ${esc(String(data.name || '').split(' ')[0] || '')}`,
        sub: 'Lihat data kepegawaian Anda dan ajukan pengkinian identitas — perubahan ditinjau HR (maker-checker).',
        actions: `<button class="btn clay-action" id="selfUpdateBtn"><span class="clay-ic" aria-hidden="true">${ICONS.people}</span> Ajukan pengkinian</button>`
      }) + `
        <section class="metrics">
          ${kpiCard({ label: 'Jabatan', value: esc(pos.positionTitle || data.jobTitle || '—'), note: esc(pos.division || data.department || ''), orb: 'people', orbTone: 'blue' })}
          ${kpiCard({ label: 'Masa kerja', value: svcLen(data.joinDate), note: data.joinDate ? `Sejak ${fmtDate(data.joinDate)}` : '', orb: 'clock', orbTone: 'mint' })}
          ${kpiCard({ label: 'Sisa cuti', value: `${Number(leave.remaining || 0)} hari`, note: `dari ${Number(leave.entitlement || 0)} hari`, orb: 'clock', orbTone: 'amber' })}
          ${kpiCard({ label: 'Status', value: esc(data.lifecycleStatus || 'ACTIVE'), note: 'Kepegawaian', orb: 'checkCircle', orbTone: 'mint' })}
        </section>
        ${pending.length ? `<section class="panel banner-attention"><div class="panel-body">${pending.length} pengajuan pengkinian sedang menunggu persetujuan HR.</div></section>` : ''}
        <section class="dashboard-grid">
          <article class="panel"><header><div><p class="eyebrow">DATA PRIBADI · IT-0002</p><h2>Identitas diri</h2></div>${chip(p.nikKtp ? 'TERISI' : 'BELUM LENGKAP')}</header><div class="panel-body"><dl class="detail-dl">
            <div><dt>NIK Karyawan</dt><dd>${esc(data.nik || '—')}</dd></div>
            <div><dt>NIK KTP</dt><dd>${esc(p.nikKtp || '—')}</dd></div>
            <div><dt>Tempat, tgl lahir</dt><dd>${esc(p.birthPlace || '—')}${p.birthDate ? `, ${fmtDate(p.birthDate)}` : ''}</dd></div>
            <div><dt>Jenis kelamin</dt><dd>${esc(g)}</dd></div>
            <div><dt>Status perkawinan</dt><dd>${esc(p.maritalStatus || '—')}</dd></div>
            <div><dt>Agama</dt><dd>${esc(p.religion || '—')}</dd></div>
            <div><dt>Golongan darah</dt><dd>${esc(p.bloodType || '—')}</dd></div>
            <div><dt>Telepon / HP</dt><dd>${esc(p.phone || '—')}</dd></div>
            <div><dt>Email pribadi</dt><dd>${esc(p.personalEmail || '—')}</dd></div>
            <div><dt>Alamat domisili</dt><dd>${esc(p.address || '—')}</dd></div>
          </dl></div></article>
          <article class="panel"><header><div><p class="eyebrow">RIWAYAT PENGAJUAN</p><h2>Pengkinian identitas</h2></div></header><div class="panel-body stack">
            ${(data.selfUpdates || []).length ? data.selfUpdates.map((u) => `<div class="stat-row"><span>${fmtDate(u.requestedAt)}<small>${Object.keys(u.proposed || {}).length} field diusulkan</small></span>${chip(u.status)}</div>`).join('') : '<p class="muted">Belum ada pengajuan pengkinian.</p>'}
          </div></article>
        </section>`;
      main.querySelector('#selfUpdateBtn')?.addEventListener('click', async () => {
        const value = await formDialog({ title: 'Ajukan Pengkinian Identitas', description: 'Ajukan perubahan data diri Anda. NIK KTP hanya dapat diubah HR. Pengajuan ditinjau HR sebelum diterapkan (maker-checker).', fields: selfIdentityFields(p), submitLabel: 'Ajukan ke HR' });
        if (!value) return;
        Object.keys(value).forEach((k) => { if (value[k] === '' || value[k] == null) delete value[k]; });
        if (!Object.keys(value).length) { toast('Tidak ada perubahan', 'Isi minimal satu field untuk mengajukan.', 'amber'); return; }
        try { await api('/api/hr/my-profile/identity-request', { method: 'POST', body: value, idempotencyKey: newIdemKey() }); toast('Pengajuan terkirim', 'Menunggu persetujuan HR.'); this.render(main); }
        catch (error) { toast('Gagal mengajukan', error.message, 'coral'); }
      });
    }
  };
  const hrSelfUpdatesPage = {
    permission: 'employee.edit',
    async render(main, _p, signal) {
      const data = await api('/api/hr/self-updates?status=PENDING', { signal });
      const canApprove = can('employee.approve');
      main.innerHTML = pageHead({ eyebrow: 'HRD · SELF-SERVICE', title: 'Persetujuan pengkinian data', sub: 'Tinjau usulan pengkinian identitas dari karyawan. Penyetuju harus berbeda dari pengaju (maker-checker).' }) + `
        <section class="panel table-panel"><header><div><p class="eyebrow">MENUNGGU PERSETUJUAN</p><h2>${data.items.length} pengajuan</h2></div></header>
        <div class="table-wrap"><table><thead><tr><th>Karyawan</th><th>Perubahan diusulkan</th><th>Pemohon</th><th>Waktu</th><th></th></tr></thead><tbody>
        ${data.items.length ? data.items.map((u) => `<tr>
          <td><b>${esc(u.employeeName)}</b><small>${esc(u.nik)}</small></td>
          <td>${Object.entries(u.proposed || {}).map(([k, val]) => `<span class="chip gray">${esc(k)}: ${esc(String(val))}</span>`).join(' ')}</td>
          <td>${esc(u.requestedByName || '—')}</td>
          <td>${fmtDate(u.requestedAt)}</td>
          <td class="right">${canApprove ? `<div class="row-actions"><button class="btn primary sm" data-approve="${esc(u.id)}">Setujui</button><button class="btn danger-outline sm" data-reject="${esc(u.id)}">Tolak</button></div>` : '<span class="chip gray">Perlu approver</span>'}</td>
        </tr>`).join('') : `<tr><td colspan="5"><div class="empty-state">${clayOrb('mint', 'checkCircle')}<h3>Tidak ada antrean</h3><p>Semua pengajuan pengkinian sudah diproses.</p></div></td></tr>`}
        </tbody></table></div></section>`;
      main.querySelectorAll('[data-approve]').forEach((b) => b.addEventListener('click', async () => {
        const answer = await actionDialog({ title: 'Setujui pengkinian', description: 'Perubahan akan diterapkan ke data karyawan. Penyetuju harus berbeda dari pengaju (SoD).', requireReason: false, confirmLabel: 'Setujui' });
        if (answer === null) return;
        try { await api(`/api/hr/self-updates/${b.dataset.approve}/approve`, { method: 'POST', body: answer || {}, idempotencyKey: newIdemKey() }); toast('Pengkinian disetujui', 'Data karyawan diperbarui.'); this.render(main); }
        catch (error) { toast('Gagal menyetujui', error.message, 'coral'); }
      }));
      main.querySelectorAll('[data-reject]').forEach((b) => b.addEventListener('click', async () => {
        const answer = await actionDialog({ title: 'Tolak pengkinian', description: 'Berikan alasan penolakan. Karyawan dapat mengajukan ulang.', requireReason: true, confirmLabel: 'Tolak', danger: true });
        if (!answer) return;
        try { await api(`/api/hr/self-updates/${b.dataset.reject}/reject`, { method: 'POST', body: answer, idempotencyKey: newIdemKey() }); toast('Pengajuan ditolak'); this.render(main); }
        catch (error) { toast('Gagal menolak', error.message, 'coral'); }
      }));
    }
  };
  R('/hr/my-profile', myProfilePage);
  R('/hr/self-updates', hrSelfUpdatesPage);

  // ── Workforce Analytics Cockpit (dashboard SDM ala SAP/Oracle) ────────────
  const workforceAnalyticsPage = {
    permission: 'employee.view',
    async render(main, _p, signal) {
      let d;
      try { d = await api('/api/hr/workforce-analytics', { signal }); }
      catch (error) { main.innerHTML = pageHead({ eyebrow: 'HRD · WORKFORCE ANALYTICS', title: 'Workforce Analytics' }) + `<section class="panel"><div class="empty-state">${clayOrb('coral', 'alert')}<h3>Gagal memuat</h3><p>${esc(error.message)}</p></div></section>`; return; }
      const k = d.kpi || {}, t = d.tenure || {};
      const metric = (label, value, note, icon, tone) => `<article class="mk-surface mk-metric"><div class="mk-m-copy"><span class="mk-m-k">${esc(label)}</span><div class="mk-m-v">${esc(String(value))}</div><span class="mk-m-note mk-mu">${esc(note)}</span></div><div class="mk-m-ic mk-ic-${tone}">${ICONS[icon] || ''}</div></article>`;
      const bars = (arr, tone) => (arr && arr.length) ? `<div class="mk-chart">${(() => { const mx = Math.max(1, ...arr.map((x) => Number(x.value) || 0)); return arr.map((x) => `<div class="mk-chart-row"><span class="mk-chart-lbl">${esc(x.label)}</span><span class="mk-chart-bar"><i class="t-${tone}" data-w="${Math.round((Number(x.value) || 0) / mx * 100)}"></i></span><b>${Number(x.value) || 0}</b></div>`).join(''); })()}</div>` : '<div class="mk-empty">Belum ada data.</div>';
      const tenureArr = [{ label: '< 1 tahun', value: t.lt1 || 0 }, { label: '1–3 tahun', value: t.y1to3 || 0 }, { label: '3–5 tahun', value: t.y3to5 || 0 }, { label: '> 5 tahun', value: t.gt5 || 0 }];
      main.innerHTML = pageHead({ eyebrow: 'HRD · WORKFORCE ANALYTICS', title: 'Workforce Analytics Cockpit', sub: 'Ringkasan tenaga kerja — headcount, masa kerja, grade, demografi, dan span of control.' }) + `<div class="mk360 mk-analytics">
        <div class="mk-g mk-g4">
          ${metric('Total Headcount', k.total || 0, `${k.active || 0} aktif`, 'people', 'blue')}
          ${metric('Rata-rata Data Quality', (k.avgQuality || 0) + '%', k.avgQuality >= 80 ? 'golden record' : 'perlu dilengkapi', 'shield', 'emerald')}
          ${metric('Cakupan BPJS', k.bpjsCovered || 0, `dari ${k.total || 0} karyawan`, 'checkCircle', 'emerald')}
          ${metric('Hire Baru (90 hari)', k.newHires90d || 0, 'akuisisi talenta', 'people', 'amber')}
        </div>
        <div class="mk-g mk-g2">
          <section class="mk-surface"><div class="mk-section-head"><div class="mk-section-title">${ICONS.building || ''} Headcount per Departemen</div></div><div class="mk-section-body">${bars(d.byDept || [], 'blue')}</div></section>
          <section class="mk-surface"><div class="mk-section-head"><div class="mk-section-title">${ICONS.clock || ''} Distribusi Masa Kerja</div></div><div class="mk-section-body">${bars(tenureArr, 'emerald')}</div></section>
        </div>
        <div class="mk-g mk-g2">
          <section class="mk-surface"><div class="mk-section-head"><div class="mk-section-title">${ICONS.wallet || ''} Sebaran Grade</div></div><div class="mk-section-body">${bars(d.byGrade || [], 'purple')}</div></section>
          <section class="mk-surface"><div class="mk-section-head"><div class="mk-section-title">${ICONS.people || ''} Demografi & Span of Control</div></div><div class="mk-section-body mk-col">${bars(d.gender || [], 'amber')}<div class="mk-inset mk-out"><span>Span of Control — rata-rata bawahan / manajer</span><b class="blue">${d.span || 0}</b></div></div></section>
        </div>
        ${(() => {
          const g = d.goals || {}, rv = d.reviews || {}, cmp = d.compliance || {}, attn = (cmp.contractsExpiring || 0) + (cmp.docsExpiring || 0) + (cmp.certsExpiring || 0);
          const NB_LABELS = [['Underperformer', 'Inconsistent', 'Enigma'], ['Effective', 'Core Player', 'High Potential'], ['Trusted Pro', 'High Performer', 'Star']];
          const NB_TONE = [['coral', 'coral', 'amber'], ['amber', 'blue', 'emerald'], ['blue', 'emerald', 'emerald']];
          const nb = d.nineBox || [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
          const nineBoxGrid = `<div class="mk-9box"><span class="mk-9yax">Kinerja →</span><div class="mk-9grid">${[2, 1, 0].map((r) => `<div class="mk-9row">${[0, 1, 2].map((c) => `<div class="mk-9cell t-${NB_TONE[r][c]}"><span class="mk-9lbl">${NB_LABELS[r][c]}</span><span class="mk-9cnt">${nb[r][c]}</span></div>`).join('')}</div>`).join('')}</div></div><div class="mk-9xax"><span>Potensi rendah</span><span>Potensi tinggi</span></div>`;
          const fr = d.flightRisk || {}, frArr = [{ label: 'Rendah', value: fr.low || 0 }, { label: 'Sedang', value: fr.medium || 0 }, { label: 'Tinggi', value: fr.high || 0 }];
          return `<div class="mk-g mk-g4">
            ${metric('Talenta Terkalibrasi', d.talentAssessed || 0, `dari ${k.total || 0} karyawan (9-box)`, 'award', 'purple')}
            ${metric('Rata-rata Progres Goal', (g.avgProgress || 0) + '%', `${g.done || 0} selesai · ${g.atRisk || 0} at-risk`, 'checkCircle', 'blue')}
            ${metric('Review Final', rv.finalized || 0, rv.avgRating ? `rata-rata ${rv.avgRating}/5` : 'belum ada final', 'shield', 'emerald')}
            ${metric('Butuh Perhatian', attn, 'kontrak/dokumen kedaluwarsa ≤60 hari', 'clock', 'amber')}
          </div>
          <div class="mk-g mk-g2">
            <section class="mk-surface"><div class="mk-section-head"><div class="mk-section-title">${ICONS.award || ICONS.shield || ''} Distribusi Talenta (9-Box) — ${d.talentAssessed || 0} terkalibrasi</div></div><div class="mk-section-body">${nineBoxGrid}</div></section>
            <section class="mk-surface"><div class="mk-section-head"><div class="mk-section-title">${ICONS.people || ''} Flight Risk & Kesiapan Suksesi</div></div><div class="mk-section-body mk-col"><div class="mk-o-caps">Flight Risk</div>${bars(frArr, 'amber')}<div class="mk-o-caps">Kesiapan Suksesi</div>${bars(d.succession || [], 'blue')}</div></section>
          </div>
          <section class="mk-surface"><div class="mk-section-head"><div class="mk-section-title">${ICONS.clock || ''} Kepatuhan & Perhatian Tenaga Kerja</div></div><div class="mk-section-body"><div class="mk-g mk-g4">
            <div class="mk-inset mk-out"><span>Kontrak berakhir ≤60 hari</span><b class="${cmp.contractsExpiring ? 'amber' : 'emerald'}">${cmp.contractsExpiring || 0}</b></div>
            <div class="mk-inset mk-out"><span>Dokumen &amp; sertifikat kedaluwarsa ≤60 hari</span><b class="${(cmp.docsExpiring || 0) + (cmp.certsExpiring || 0) ? 'amber' : 'emerald'}">${(cmp.docsExpiring || 0) + (cmp.certsExpiring || 0)}</b></div>
            <div class="mk-inset mk-out"><span>SP aktif</span><b class="${cmp.activeSp ? 'coral' : 'emerald'}">${cmp.activeSp || 0}</b></div>
            <div class="mk-inset mk-out"><span>Offboarding berjalan</span><b class="${cmp.offboardingOpen ? 'amber' : 'emerald'}">${cmp.offboardingOpen || 0}</b></div>
          </div></div></section>`;
        })()}
      </div>`;
      main.querySelectorAll('.mk-chart-bar i[data-w]').forEach((el) => { el.style.width = `${el.dataset.w}%`; });
    }
  };
  R('/hr/analytics', workforceAnalyticsPage);

  // ── Operasi Massal — bulk import/update via CSV + riwayat batch ────────────
  const BULK_TEMPLATES = {
    employees: { label: 'Karyawan', fileModule: 'employee', cols: ['nik', 'name', 'department', 'jobTitle', 'baseSalary', 'branchId', 'joinDate', 'bpjs', 'active'], example: ['3275010101990001', 'Budi Santoso', 'FINANCE', 'Staff Finance', '5000000', '', '2024-01-15', 'true', 'true'], note: 'Baris dicocokkan berdasarkan NIK — NIK sudah ada → update, baru → tambah. branchId (UUID cabang) wajib untuk karyawan baru; boleh dikosongkan saat update.' },
    attendance: { label: 'Kehadiran', fileModule: 'attendance', cols: ['nik', 'work_date', 'check_in', 'check_out', 'status', 'notes'], example: ['3275010101990001', '2026-08-20', '08:00', '17:00', 'PRESENT', ''], note: 'Kehadiran di-upsert per (NIK, tanggal). status: PRESENT / ABSENT / LEAVE / SICK / LATE.' }
  };
  const bulkOpsPage = {
    permission: 'employee.import',
    async render(main, _p, signal) {
      this._module = BULK_TEMPLATES[this._module] ? this._module : 'employees';
      let batches = { items: [] };
      try { batches = await api(`/api/hr/import-batches?module=${this._module}&_ts=${Date.now()}`, { signal }); } catch (_) { batches = { items: [] }; }
      const t = BULK_TEMPLATES[this._module];
      const tone = (b) => (b.errorRows > 0 ? (b.successRows > 0 ? 'amber' : 'coral') : 'emerald');
      main.innerHTML = pageHead({ eyebrow: 'HRD · OPERASI MASSAL', title: 'Operasi Massal — Import & Update', sub: 'Tambah/perbarui data dalam jumlah besar via CSV. Unduh template, isi, unggah — hasil & error tercatat pada riwayat.' }) + `<div class="mk360 mk-analytics">
        <div class="mk-g mk-g2">
          <section class="mk-surface"><div class="mk-section-head"><div class="mk-section-title">${ICONS.job || ''} Unggah CSV</div></div><div class="mk-section-body mk-col">
            <label class="mk-bo-field"><span>Jenis Data</span><select class="mk-input" id="boModule">${Object.entries(BULK_TEMPLATES).map(([k, v]) => `<option value="${k}"${k === this._module ? ' selected' : ''}>${esc(v.label)}</option>`).join('')}</select></label>
            <div class="mk-note">${esc(t.note)}</div>
            <div class="mk-bo-actions"><button class="mk-btn" id="boTemplate">${ICONS.download || ''} Unduh Template CSV</button><button class="mk-btn primary" id="boUpload">${ICONS.plus || ''} Unggah &amp; Proses</button><input id="boFile" type="file" accept=".csv,text/csv" hidden></div>
          </div></section>
          <section class="mk-surface"><div class="mk-section-head"><div class="mk-section-title">${ICONS.shield || ''} Kolom Template — ${esc(t.label)}</div></div><div class="mk-section-body"><div class="mk-bo-cols">${t.cols.map((c, i) => `<div class="mk-inset mk-bo-col"><b>${esc(c)}</b><small>${esc(String(t.example[i] ?? '') || '—')}</small></div>`).join('')}</div></div></section>
        </div>
        <section class="mk-surface"><div class="mk-section-head"><div class="mk-section-title">${ICONS.clock || ''} Riwayat Operasi (${batches.items.length})</div></div><div class="mk-section-body">${batches.items.length ? `<div class="mk-col">${batches.items.map((b) => `<div class="mk-inset mk-bo-row"><div class="mk-flex1"><div class="mk-goal-h"><b>${esc(b.fileName || 'import.csv')}</b><span class="mk-badge slate">${esc(b.module)}</span><span class="mk-badge ${tone(b)}">${b.successRows}/${b.totalRows} sukses${b.errorRows ? ` · ${b.errorRows} error` : ''}</span></div><small class="mk-mu">${relTime(b.createdAt)}</small></div>${(b.errorRows && (b.errors || []).length) ? `<button class="mk-btn sm" data-bo-err="${esc(b.id)}">Lihat error</button>` : ''}</div>`).join('')}</div>` : '<div class="mk-empty">Belum ada operasi massal. Unduh template lalu unggah CSV untuk memulai.</div>'}</div></section>
      </div>`;
      main.querySelector('#boModule')?.addEventListener('change', (e) => { this._module = e.target.value; this.render(main, _p); });
      main.querySelector('#boTemplate')?.addEventListener('click', () => {
        const esc2 = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
        const csv = t.cols.join(',') + '\r\n' + t.example.map(esc2).join(',') + '\r\n';
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = `template-${this._module}.csv`;
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1500);
        toast('Template diunduh', `template-${this._module}.csv`);
      });
      const picker = main.querySelector('#boFile');
      main.querySelector('#boUpload')?.addEventListener('click', () => picker.click());
      picker?.addEventListener('change', async () => {
        const file = picker.files[0]; if (!file) return;
        try {
          const saved = await uploadFile(`/api/files?module=${encodeURIComponent(t.fileModule)}`, file);
          await api('/api/jobs', { method: 'POST', body: { type: 'IMPORT_CSV', params: { module: this._module, fileId: saved.id } } });
          toast('Operasi massal dijadwalkan', `${file.name} diproses di latar belakang — riwayat diperbarui otomatis.`);
          setTimeout(() => this.render(main, _p), 2500);
        } catch (error) { toast('Gagal memproses', error.message, 'coral'); }
      });
      main.querySelectorAll('[data-bo-err]').forEach((btn) => btn.addEventListener('click', async () => {
        const b = batches.items.find((x) => x.id === btn.dataset.boErr); if (!b) return;
        const list = (b.errors || []).map((e) => `• Baris ${e.line || '?'}: ${e.message}`).join('\n') || 'Tidak ada detail error.';
        await actionDialog({ title: `Error impor — ${b.fileName || ''}`, description: list, confirmLabel: 'Tutup' });
      }));
    }
  };
  R('/hr/bulk-ops', bulkOpsPage);

  // ── Rekrutmen / ATS — lowongan + pipeline kandidat ────────────────────────
  const REQ_ST = { DRAFT: ['slate', 'Draft'], OPEN: ['emerald', 'Dibuka'], ON_HOLD: ['amber', 'Ditahan'], CLOSED: ['slate', 'Ditutup'], FILLED: ['blue', 'Terisi'], CANCELLED: ['coral', 'Dibatalkan'] };
  const REQ_PRIO = { LOW: ['slate', 'Rendah'], MEDIUM: ['blue', 'Sedang'], HIGH: ['amber', 'Tinggi'], URGENT: ['coral', 'Mendesak'] };
  const CAND_ST = { APPLIED: ['slate', 'Melamar'], SCREENING: ['blue', 'Skrining'], INTERVIEW: ['amber', 'Interview'], OFFER: ['purple', 'Penawaran'], HIRED: ['emerald', 'Diterima'], REJECTED: ['coral', 'Ditolak'], WITHDRAWN: ['slate', 'Mengundurkan'] };
  const CAND_SRC = { JOB_PORTAL: 'Job Portal', REFERRAL: 'Referral', LINKEDIN: 'LinkedIn', WALK_IN: 'Walk-in', AGENCY: 'Agensi', CAMPUS: 'Kampus', OTHER: 'Lainnya' };
  const PIPE_STAGES = ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER'];
  const EMP_TYPE_OPTS = [['PKWTT', 'PKWTT (tetap)'], ['PKWT', 'PKWT (kontrak)'], ['INTERN', 'Magang'], ['CONTRACT', 'Kontrak lepas'], ['OUTSOURCE', 'Outsource']];
  const rStars = (n) => { const v = Math.round(Number(n) || 0); return v ? `<span class="mk-stars" title="${v}/5">${'★'.repeat(v)}${'☆'.repeat(5 - v)}</span>` : ''; };

  const recruitmentPage = {
    permission: 'employee.view',
    async render(main, _p, signal) {
      if (this._reqId) return this._pipeline(main, signal);
      const [ov, reqs] = await Promise.all([api('/api/hr/recruitment-overview', { signal }).catch(() => ({})), api('/api/hr/requisitions', { signal }).catch(() => ({ items: [] }))]);
      const k = ov.kpi || {}, c = ov.candidates || {}, items = reqs.items || [], editable = can('employee.edit');
      const metric = (label, value, note, icon, tone) => `<article class="mk-surface mk-metric"><div class="mk-m-copy"><span class="mk-m-k">${esc(label)}</span><div class="mk-m-v">${esc(String(value))}</div><span class="mk-m-note mk-mu">${esc(note)}</span></div><div class="mk-m-ic mk-ic-${tone}">${ICONS[icon] || ''}</div></article>`;
      const card = (r) => { const st = REQ_ST[r.status] || REQ_ST.OPEN, pr = REQ_PRIO[r.priority] || REQ_PRIO.MEDIUM; return `<button type="button" class="mk-surface mk-req" data-req="${esc(r.id)}"><div class="mk-req-top"><div class="mk-flex1"><div class="mk-goal-h"><b>${esc(r.title)}</b><span class="mk-badge ${st[0]}">${esc(st[1])}</span><span class="mk-badge ${pr[0]}">${esc(pr[1])}</span></div><small class="mk-mu">${esc(r.code)} · ${esc(r.department || '—')}${r.location ? ' · ' + esc(r.location) : ''}</small></div><span class="mk-req-count"><b>${r.activeCount || 0}</b><small>kandidat aktif</small></span></div><div class="mk-req-meta"><span>${ICONS.people || ''} ${r.hiredCount || 0}/${r.headcount || 1} terisi</span><span>${esc((EMP_TYPE_OPTS.find((e) => e[0] === r.employmentType) || [, r.employmentType])[1] || '')}</span>${r.targetDate ? `<span>Target ${fmtDate(r.targetDate)}</span>` : ''}${r.salaryRange ? `<span>${esc(r.salaryRange)}</span>` : ''}</div></button>`; };
      main.innerHTML = pageHead({ eyebrow: 'HRD · REKRUTMEN / ATS', title: 'Rekrutmen — Lowongan & Kandidat', sub: 'Kelola lowongan (requisition) dan pipeline kandidat: melamar → skrining → interview → penawaran → diterima.', actions: editable ? `<button class="btn primary" id="reqNew">${ICONS.plus} Buat Lowongan</button>` : '' }) + `<div class="mk360 mk-analytics">
        <div class="mk-g mk-g4">
          ${metric('Lowongan Dibuka', k.openReqs || 0, `${k.openHeadcount || 0} posisi dibutuhkan`, 'job', 'blue')}
          ${metric('Kandidat Aktif', c.active || 0, `dari ${c.total || 0} total pelamar`, 'people', 'amber')}
          ${metric('Tahap Interview', c.interviewing || 0, `${c.offers || 0} di penawaran`, 'clock', 'purple')}
          ${metric('Diterima (Hired)', c.hired || 0, 'akuisisi talenta', 'checkCircle', 'emerald')}
        </div>
        <section class="mk-surface"><div class="mk-section-head"><div class="mk-section-title">${ICONS.job || ''} Daftar Lowongan (${items.length})</div></div><div class="mk-section-body">${items.length ? `<div class="mk-req-grid">${items.map(card).join('')}</div>` : '<div class="mk-empty">Belum ada lowongan. Buat requisition untuk memulai rekrutmen.</div>'}</div></section>
      </div>`;
      main.querySelectorAll('[data-req]').forEach((b) => b.addEventListener('click', () => { this._reqId = b.dataset.req; this.render(main); }));
      main.querySelector('#reqNew')?.addEventListener('click', async () => {
        const v = await formDialog({ title: 'Buat Lowongan (Requisition)', description: 'Kode otomatis (REQ-tahun-urut) bila dikosongkan.', fields: [
          { name: 'title', label: 'Judul Posisi', required: true },
          { name: 'department', label: 'Departemen' },
          { name: 'location', label: 'Lokasi' },
          { name: 'employmentType', label: 'Tipe', type: 'select', options: EMP_TYPE_OPTS, value: 'PKWTT' },
          { name: 'headcount', label: 'Jumlah Kebutuhan', type: 'number', min: 1, value: 1 },
          { name: 'priority', label: 'Prioritas', type: 'select', options: [['MEDIUM', 'Sedang'], ['LOW', 'Rendah'], ['HIGH', 'Tinggi'], ['URGENT', 'Mendesak']], value: 'MEDIUM' },
          { name: 'status', label: 'Status', type: 'select', options: [['OPEN', 'Dibuka'], ['DRAFT', 'Draft'], ['ON_HOLD', 'Ditahan']], value: 'OPEN' },
          { name: 'salaryRange', label: 'Rentang Gaji (mis. 8–12 jt)' },
          { name: 'hiringManager', label: 'Hiring Manager' },
          { name: 'targetDate', label: 'Target Terisi', type: 'date' },
          { name: 'requirements', label: 'Kualifikasi', type: 'textarea', rows: 2 },
          { name: 'description', label: 'Deskripsi', type: 'textarea', rows: 2 }
        ], submitLabel: 'Buat lowongan' });
        if (!v) return;
        try { await api('/api/hr/requisitions', { method: 'POST', body: v, idempotencyKey: newIdemKey() }); toast('Lowongan dibuat'); this.render(main); }
        catch (error) { toast('Gagal membuat lowongan', error.message, 'coral'); }
      });
    },
    async _pipeline(main, signal) {
      let req, cands;
      try { [req, cands] = await Promise.all([api(`/api/hr/requisitions/${this._reqId}`, { signal }), api(`/api/hr/candidates?requisitionId=${this._reqId}`, { signal }).catch(() => ({ items: [] }))]); }
      catch (error) { this._reqId = null; toast('Lowongan tidak ditemukan', error.message, 'coral'); return this.render(main); }
      const list = cands.items || [], editable = can('employee.edit');
      const st = REQ_ST[req.status] || REQ_ST.OPEN, pr = REQ_PRIO[req.priority] || REQ_PRIO.MEDIUM;
      const cardOf = (c) => { const cs = CAND_ST[c.stage] || CAND_ST.APPLIED; return `<div class="mk-inset mk-cand"><div class="mk-flex1"><div class="mk-goal-h"><b>${esc(c.name)}</b>${rStars(c.rating)}</div><small class="mk-mu">${esc(CAND_SRC[c.source] || c.source || '')}${c.currentTitle ? ' · ' + esc(c.currentTitle) : ''}${c.expectedSalary ? ' · exp ' + fmtIDR(c.expectedSalary) : ''}</small>${c.email || c.phone ? `<small class="mk-mu">${esc(c.email || '')}${c.email && c.phone ? ' · ' : ''}${esc(c.phone || '')}</small>` : ''}</div>${editable ? `<button class="mk-btn sm" data-cand="${esc(c.id)}" data-cs="${esc(c.stage)}" data-cr="${c.rating != null ? esc(String(c.rating)) : ''}" data-cn="${esc(c.name)}">Kelola</button>` : `<span class="mk-badge ${cs[0]}">${esc(cs[1])}</span>`}</div>`; };
      const column = (stage) => { const cs = CAND_ST[stage], inStage = list.filter((c) => c.stage === stage); return `<div class="mk-pipe-col"><div class="mk-pipe-head"><span class="mk-badge ${cs[0]}">${esc(cs[1])}</span><b>${inStage.length}</b></div><div class="mk-pipe-body">${inStage.length ? inStage.map(cardOf).join('') : '<div class="mk-pipe-empty">—</div>'}</div></div>`; };
      const terminal = list.filter((c) => ['HIRED', 'REJECTED', 'WITHDRAWN'].includes(c.stage));
      main.innerHTML = pageHead({ eyebrow: `REKRUTMEN · ${esc(req.code)}`, title: esc(req.title), sub: `${esc(req.department || '—')}${req.location ? ' · ' + esc(req.location) : ''} · ${req.headcount} posisi`, actions: `<button class="btn secondary" id="reqBack">← Kembali</button>${editable ? `<button class="btn secondary" id="reqEdit">${ICONS.gear || ''} Kelola Lowongan</button><button class="btn primary" id="candNew">${ICONS.plus} Tambah Kandidat</button>` : ''}` }) + `<div class="mk360 mk-analytics">
        <section class="mk-surface"><div class="mk-section-body mk-req-detail"><div class="mk-goal-h"><span class="mk-badge ${st[0]}">${esc(st[1])}</span><span class="mk-badge ${pr[0]}">${esc(pr[1])}</span><span class="mk-badge slate">${esc((EMP_TYPE_OPTS.find((e) => e[0] === req.employmentType) || [, req.employmentType])[1] || '')}</span>${req.salaryRange ? `<span class="mk-badge blue">${esc(req.salaryRange)}</span>` : ''}${req.hiringManager ? `<span class="mk-mu">HM: ${esc(req.hiringManager)}</span>` : ''}${req.targetDate ? `<span class="mk-mu">Target ${fmtDate(req.targetDate)}</span>` : ''}</div>${req.requirements ? `<p class="mk-req-p"><b>Kualifikasi:</b> ${esc(req.requirements)}</p>` : ''}${req.description ? `<p class="mk-req-p">${esc(req.description)}</p>` : ''}</div></section>
        <section class="mk-surface"><div class="mk-section-head"><div class="mk-section-title">${ICONS.people || ''} Pipeline Kandidat (${list.length})</div></div><div class="mk-section-body"><div class="mk-pipe">${PIPE_STAGES.map(column).join('')}</div>${terminal.length ? `<div class="mk-tl-wrap"><div class="mk-o-caps bb">Selesai (${terminal.length})</div><div class="mk-g mk-g2">${terminal.map(cardOf).join('')}</div></div>` : ''}</div></section>
      </div>`;
      main.querySelector('#reqBack').addEventListener('click', () => { this._reqId = null; this.render(main); });
      const reloadPipe = () => this.render(main);
      main.querySelector('#candNew')?.addEventListener('click', async () => {
        const v = await formDialog({ title: `Tambah Kandidat — ${req.title}`, fields: [
          { name: 'name', label: 'Nama Kandidat', required: true },
          { name: 'email', label: 'Email', type: 'email' },
          { name: 'phone', label: 'Telepon', type: 'tel' },
          { name: 'source', label: 'Sumber', type: 'select', options: Object.entries(CAND_SRC), value: 'JOB_PORTAL' },
          { name: 'currentTitle', label: 'Posisi Saat Ini' },
          { name: 'expectedSalary', label: 'Ekspektasi Gaji', type: 'number', min: 0 },
          { name: 'stage', label: 'Tahap Awal', type: 'select', options: PIPE_STAGES.map((s) => [s, CAND_ST[s][1]]), value: 'APPLIED' },
          { name: 'rating', label: 'Rating Awal', type: 'select', options: [['', '—'], ['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5']], value: '' },
          { name: 'notes', label: 'Catatan', type: 'textarea', rows: 2 }
        ], submitLabel: 'Tambah kandidat' });
        if (!v) return; v.requisitionId = this._reqId;
        try { await api('/api/hr/candidates', { method: 'POST', body: v, idempotencyKey: newIdemKey() }); toast('Kandidat ditambahkan'); reloadPipe(); }
        catch (error) { toast('Gagal menambahkan', error.message, 'coral'); }
      });
      main.querySelector('#reqEdit')?.addEventListener('click', async () => {
        const v = await formDialog({ title: `Kelola Lowongan — ${req.code}`, fields: [
          { name: 'status', label: 'Status', type: 'select', options: Object.entries(REQ_ST).map(([k, val]) => [k, val[1]]), value: req.status },
          { name: 'priority', label: 'Prioritas', type: 'select', options: Object.entries(REQ_PRIO).map(([k, val]) => [k, val[1]]), value: req.priority },
          { name: 'headcount', label: 'Jumlah Kebutuhan', type: 'number', min: 1, value: req.headcount || 1 },
          { name: 'hiringManager', label: 'Hiring Manager', value: req.hiringManager || '' },
          { name: 'salaryRange', label: 'Rentang Gaji', value: req.salaryRange || '' },
          { name: 'targetDate', label: 'Target Terisi', type: 'date', value: req.targetDate ? String(req.targetDate).slice(0, 10) : '' }
        ], submitLabel: 'Simpan' });
        if (!v) return;
        try { await api(`/api/hr/requisitions/${this._reqId}`, { method: 'POST', body: v, idempotencyKey: newIdemKey() }); toast('Lowongan diperbarui'); reloadPipe(); }
        catch (error) { toast('Gagal memperbarui', error.message, 'coral'); }
      });
      main.querySelectorAll('[data-cand]').forEach((b) => b.addEventListener('click', async () => {
        const v = await formDialog({ title: `Kelola Kandidat — ${b.dataset.cn}`, description: 'Pindahkan tahap pipeline, beri rating, dan catatan.', fields: [
          { name: 'stage', label: 'Tahap', type: 'select', options: Object.entries(CAND_ST).map(([k, val]) => [k, val[1]]), value: b.dataset.cs || 'APPLIED' },
          { name: 'rating', label: 'Rating', type: 'select', options: [['', '—'], ['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5']], value: b.dataset.cr || '' },
          { name: 'notes', label: 'Catatan', type: 'textarea', rows: 2 }
        ], submitLabel: 'Simpan perubahan' });
        if (!v) return;
        try { await api(`/api/hr/candidates/${b.dataset.cand}`, { method: 'POST', body: v, idempotencyKey: newIdemKey() }); toast('Kandidat diperbarui'); reloadPipe(); }
        catch (error) { toast('Gagal memperbarui', error.message, 'coral'); }
      }));
    }
  };
  R('/hr/recruitment', recruitmentPage);

  // ── Learning & Development (LMS) — katalog program + pendaftaran ───────────
  const PROG_CAT = { TECHNICAL: 'Teknis', LEADERSHIP: 'Kepemimpinan', COMPLIANCE: 'Kepatuhan', SOFT_SKILL: 'Soft Skill', SAFETY: 'K3/Safety', ONBOARDING: 'Onboarding', PRODUCT: 'Produk', OTHER: 'Lainnya' };
  const PROG_MODE = { IN_HOUSE: 'In-house', EXTERNAL: 'Eksternal', ONLINE: 'Online', BLENDED: 'Blended' };
  const PROG_ST = { DRAFT: ['slate', 'Draft'], ACTIVE: ['emerald', 'Aktif'], ARCHIVED: ['slate', 'Arsip'] };
  const ENR_ST = { ENROLLED: ['slate', 'Terdaftar'], IN_PROGRESS: ['amber', 'Berjalan'], COMPLETED: ['emerald', 'Selesai'], CANCELLED: ['slate', 'Batal'], FAILED: ['coral', 'Gagal'] };
  const learningPage = {
    permission: 'employee.view',
    async render(main, _p, signal) {
      const [ov, progs, enrolls] = await Promise.all([
        api('/api/hr/learning-overview', { signal }).catch(() => ({})),
        api('/api/hr/training-programs', { signal }).catch(() => ({ items: [] })),
        api('/api/hr/enrollments', { signal }).catch(() => ({ items: [] }))
      ]);
      const P = ov.programs || {}, E = ov.enrollments || {}, programs = progs.items || [], enrollments = enrolls.items || [], editable = can('employee.edit');
      const metric = (label, value, note, icon, tone) => `<article class="mk-surface mk-metric"><div class="mk-m-copy"><span class="mk-m-k">${esc(label)}</span><div class="mk-m-v">${esc(String(value))}</div><span class="mk-m-note mk-mu">${esc(note)}</span></div><div class="mk-m-ic mk-ic-${tone}">${ICONS[icon] || ''}</div></article>`;
      const progCard = (p) => { const s = PROG_ST[p.status] || PROG_ST.ACTIVE; return `<div class="mk-inset mk-prog"><div class="mk-goal-top"><div class="mk-flex1"><div class="mk-goal-h"><b>${esc(p.title)}</b><span class="mk-badge slate">${esc(PROG_CAT[p.category] || p.category)}</span><span class="mk-badge ${s[0]}">${esc(s[1])}</span></div><small class="mk-mu">${esc(p.code)} · ${esc(PROG_MODE[p.deliveryMode] || p.deliveryMode)}${p.provider ? ' · ' + esc(p.provider) : ''}${p.durationHours ? ' · ' + p.durationHours + ' jam' : ''}${p.cost ? ' · ' + fmtIDR(p.cost) : ''}</small>${p.description ? `<small class="mk-mu">${esc(p.description)}</small>` : ''}</div><span class="mk-req-count"><b>${p.completedCount || 0}/${p.enrollmentCount || 0}</b><small>selesai</small></span></div>${editable ? `<div class="mk-bo-actions"><button class="mk-btn sm" data-prog-enroll="${esc(p.id)}" data-prog-t="${esc(p.title)}">${ICONS.plus || ''} Daftarkan</button><button class="mk-btn sm" data-prog-edit="${esc(p.id)}" data-prog-s="${esc(p.status)}">Kelola</button></div>` : ''}</div>`; };
      const enrollRow = (e) => { const s = ENR_ST[e.status] || ENR_ST.ENROLLED; return `<div class="mk-inset mk-bo-row"><div class="mk-flex1"><div class="mk-goal-h"><b>${esc(e.employeeName)}</b><span class="mk-badge ${s[0]}">${esc(s[1])}</span>${e.score != null ? `<span class="mk-badge blue">Skor ${e.score}</span>` : ''}</div><small class="mk-mu">${esc(e.programTitle)} · ${esc(e.programCode)}${e.employeeDepartment ? ' · ' + esc(e.employeeDepartment) : ''}${e.completedAt ? ' · selesai ' + fmtDate(e.completedAt) : ''}</small></div>${editable ? `<button class="mk-btn sm" data-enr="${esc(e.id)}" data-es="${esc(e.status)}" data-esc="${e.score != null ? esc(String(e.score)) : ''}" data-en="${esc(e.employeeName)}">Kelola</button>` : ''}</div>`; };
      main.innerHTML = pageHead({ eyebrow: 'HRD · LEARNING & DEVELOPMENT', title: 'Learning & Development', sub: 'Katalog program pelatihan dan pendaftaran/riwayat pelatihan karyawan — lacak penyelesaian & skor.', actions: editable ? `<button class="btn primary" id="progNew">${ICONS.plus} Buat Program</button>` : '' }) + `<div class="mk360 mk-analytics">
        <div class="mk-g mk-g4">
          ${metric('Program Aktif', P.active || 0, `${P.total || 0} total program`, 'job', 'blue')}
          ${metric('Pendaftaran Aktif', E.active || 0, `${E.total || 0} total · ${E.employeesTrained || 0} karyawan`, 'people', 'amber')}
          ${metric('Pelatihan Selesai', E.completed || 0, 'penyelesaian tercatat', 'checkCircle', 'emerald')}
          ${metric('Rata-rata Skor', E.avgScore || 0, 'dari pelatihan selesai', 'shield', 'purple')}
        </div>
        <section class="mk-surface"><div class="mk-section-head"><div class="mk-section-title">${ICONS.job || ''} Katalog Program (${programs.length})</div></div><div class="mk-section-body">${programs.length ? `<div class="mk-req-grid">${programs.map(progCard).join('')}</div>` : '<div class="mk-empty">Belum ada program. Buat program pelatihan untuk memulai.</div>'}</div></section>
        <section class="mk-surface"><div class="mk-section-head"><div class="mk-section-title">${ICONS.people || ''} Pendaftaran Terbaru (${enrollments.length})</div></div><div class="mk-section-body">${enrollments.length ? `<div class="mk-col">${enrollments.map(enrollRow).join('')}</div>` : '<div class="mk-empty">Belum ada pendaftaran pelatihan.</div>'}</div></section>
      </div>`;
      const reload = () => this.render(main);
      main.querySelector('#progNew')?.addEventListener('click', async () => {
        const v = await formDialog({ title: 'Buat Program Pelatihan', description: 'Kode otomatis (TRN-tahun-urut) bila dikosongkan.', fields: [
          { name: 'title', label: 'Judul Program', required: true },
          { name: 'category', label: 'Kategori', type: 'select', options: Object.entries(PROG_CAT), value: 'TECHNICAL' },
          { name: 'deliveryMode', label: 'Metode', type: 'select', options: Object.entries(PROG_MODE), value: 'IN_HOUSE' },
          { name: 'provider', label: 'Penyelenggara' },
          { name: 'durationHours', label: 'Durasi (jam)', type: 'number', min: 0 },
          { name: 'cost', label: 'Biaya / peserta', type: 'number', min: 0 },
          { name: 'status', label: 'Status', type: 'select', options: [['ACTIVE', 'Aktif'], ['DRAFT', 'Draft'], ['ARCHIVED', 'Arsip']], value: 'ACTIVE' },
          { name: 'description', label: 'Deskripsi', type: 'textarea', rows: 2 }
        ], submitLabel: 'Buat program' });
        if (!v) return;
        try { await api('/api/hr/training-programs', { method: 'POST', body: v, idempotencyKey: newIdemKey() }); toast('Program dibuat'); reload(); }
        catch (error) { toast('Gagal membuat program', error.message, 'coral'); }
      });
      const enrollDialog = async (programId, programTitle) => {
        let emps = [];
        try { const d = await api('/api/employees?pageSize=200'); emps = (d.items || []).map((x) => [x.id, `${x.name} · ${x.department || '—'}`]); } catch (_) { emps = []; }
        if (!emps.length) { toast('Tidak ada karyawan', 'Data karyawan tidak tersedia.', 'coral'); return; }
        const progOpts = programId ? null : programs.map((p) => [p.id, `${p.title} (${p.code})`]);
        const fields = [{ name: 'employeeId', label: 'Karyawan', type: 'select', options: emps, required: true }];
        if (progOpts) fields.push({ name: 'programId', label: 'Program', type: 'select', options: progOpts, required: true });
        fields.push(
          { name: 'status', label: 'Status', type: 'select', options: Object.entries(ENR_ST).map(([k, val]) => [k, val[1]]), value: 'ENROLLED' },
          { name: 'score', label: 'Skor (jika selesai)', type: 'number', min: 0, max: 100 },
          { name: 'notes', label: 'Catatan', type: 'textarea', rows: 2 }
        );
        const v = await formDialog({ title: programTitle ? `Daftarkan Peserta — ${programTitle}` : 'Daftarkan Pelatihan', fields, submitLabel: 'Daftarkan' });
        if (!v) return; if (programId) v.programId = programId;
        try { await api('/api/hr/enrollments', { method: 'POST', body: v, idempotencyKey: newIdemKey() }); toast('Pendaftaran tersimpan'); reload(); }
        catch (error) { toast('Gagal mendaftarkan', error.message, 'coral'); }
      };
      main.querySelectorAll('[data-prog-enroll]').forEach((b) => b.addEventListener('click', () => enrollDialog(b.dataset.progEnroll, b.dataset.progT)));
      main.querySelectorAll('[data-prog-edit]').forEach((b) => b.addEventListener('click', async () => {
        const v = await formDialog({ title: 'Kelola Program', fields: [
          { name: 'status', label: 'Status', type: 'select', options: Object.entries(PROG_ST).map(([k, val]) => [k, val[1]]), value: b.dataset.progS || 'ACTIVE' },
          { name: 'provider', label: 'Penyelenggara' },
          { name: 'cost', label: 'Biaya / peserta', type: 'number', min: 0 }
        ], submitLabel: 'Simpan' });
        if (!v) return;
        try { await api(`/api/hr/training-programs/${b.dataset.progEdit}`, { method: 'POST', body: v, idempotencyKey: newIdemKey() }); toast('Program diperbarui'); reload(); }
        catch (error) { toast('Gagal memperbarui', error.message, 'coral'); }
      }));
      main.querySelectorAll('[data-enr]').forEach((b) => b.addEventListener('click', async () => {
        const v = await formDialog({ title: `Kelola Pelatihan — ${b.dataset.en}`, description: 'Perbarui status & skor. Status "Selesai" mencatat tanggal penyelesaian otomatis.', fields: [
          { name: 'status', label: 'Status', type: 'select', options: Object.entries(ENR_ST).map(([k, val]) => [k, val[1]]), value: b.dataset.es || 'ENROLLED' },
          { name: 'score', label: 'Skor (0–100)', type: 'number', min: 0, max: 100, value: b.dataset.esc || '' },
          { name: 'notes', label: 'Catatan', type: 'textarea', rows: 2 }
        ], submitLabel: 'Simpan perubahan' });
        if (!v) return;
        try { await api(`/api/hr/enrollments/${b.dataset.enr}`, { method: 'POST', body: v, idempotencyKey: newIdemKey() }); toast('Pelatihan diperbarui'); reload(); }
        catch (error) { toast('Gagal memperbarui', error.message, 'coral'); }
      }));
    }
  };
  R('/hr/learning', learningPage);
})();
