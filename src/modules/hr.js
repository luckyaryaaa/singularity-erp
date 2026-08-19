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
        <section class="dashboard-grid">
          <article class="panel"><header><div><p class="eyebrow">KEHADIRAN</p><h2>Catatan harian</h2></div></header><div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Karyawan</th><th>Masuk–keluar</th><th>Status</th><th>Sumber</th></tr></thead><tbody>${attendance.items.map(r => `<tr><td>${fmtDate(r.workDate)}</td><td><b>${esc(r.employeeName)}</b><small>${esc(r.nik)} · ${esc(r.department)}</small></td><td>${r.checkIn ? fmtDateTime(r.checkIn) : '—'}<small>${r.checkOut ? fmtDateTime(r.checkOut) : 'Belum keluar'}</small></td><td>${chip(r.status)}</td><td><span class="chip gray">${esc(r.source)}</span></td></tr>`).join('') || '<tr><td colspan="5" class="table-loading">Belum ada data kehadiran.</td></tr>'}</tbody></table></div></article>
          <article class="panel"><header><div><p class="eyebrow">SALDO CUTI</p><h2>Hak tahun ${esc(period.slice(0, 4))}</h2></div></header><div class="panel-body stack">${balances.items.slice(0, 12).map(r => `<div class="stat-row"><span><b>${esc(r.employeeName)}</b><small>${esc(r.department)}</small></span><b>${Number(r.remaining)} / ${Number(r.entitlement)} hari</b></div>`).join('') || '<p class="muted">Belum ada saldo cuti.</p>'}</div></article>
        </section>`;
      main.querySelector('#attendancePeriod').addEventListener('change', e => { this.period = e.target.value; this.render(main); });
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
      this._table = dataTable(main.querySelector('#payrollTable'), { key: 'documents:PAYROLL_RUN', endpoint: '/api/documents', params: { type: 'PAYROLL_RUN' }, title: 'Payroll run', eyebrow: 'PAYROLL', columns: [{ label: 'Periode', render: docCell }, { label: 'Karyawan', render: r => `${r.payload?.headcount || '—'} orang` }, { label: 'Gaji bersih', right: true, render: r => `<span class="money">${fmtIDR(r.amount)}</span>` }, { label: 'BPJS', right: true, render: r => fmtIDR(r.payload?.bpjs || 0) }, { label: 'PPh 21', right: true, render: r => fmtIDR(r.payload?.pph21 || 0) }, { label: 'Status', render: r => chip(r.status) }], statusFilter: ['DRAFT', 'WAITING_APPROVAL', 'APPROVED', 'CLOSED', 'VOID'], onRow: (row, reload) => openDrawer(row.id, { onChange: reload }), empty: { icon: 'payslip', title: 'Belum ada payroll run' } });
      main.querySelector('#payrollCreate')?.addEventListener('click', async () => { const value = await formDialog({ title: 'Hitung payroll', description: 'Sistem menghitung seluruh karyawan aktif. Hasil dibuat sebagai draft untuk ditinjau sebelum approval dan posting.', fields: [{ name: 'period', label: 'Periode penggajian', type: 'month', value: new Date().toISOString().slice(0, 7), required: true }, { name: 'title', label: 'Judul payroll', value: `Payroll ${new Date().toISOString().slice(0, 7)}` }], submitLabel: 'Hitung payroll' }); if (!value) return; try { const result = await api('/api/payroll/runs', { method: 'POST', body: value }); toast('Payroll dihitung', `${result.headcount} karyawan · ${fmtIDR(result.total)}`); this._table.reload(); openDrawer(result.document.id, { onChange: () => this._table.reload() }); } catch (error) { toast('Kalkulasi gagal', error.message, 'coral'); } });
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
    presentation: { directory: { kind: 'employee', kicker: 'WORKFORCE 360 · DIREKTORI', headline: 'Direktori Karyawan', description: 'Identitas, penempatan, kompensasi, pajak PPh21, BPJS, dan tata kelola data karyawan dalam satu direktori enterprise.', totalLabel: 'Total karyawan', facts: [['Model data', '360°'], ['Governance', 'Aktif']] }, subtitle: 'Klik profil untuk membuka Employee 360 — identitas, kepegawaian, kompensasi, pajak, BPJS, dan tata kelola data.' },
    fields:async()=>{const branches=await api('/api/branches');return[{name:'nik',label:'NIK',required:true},{name:'name',label:'Nama lengkap',required:true},{name:'department',label:'Departemen',required:true},{name:'jobTitle',label:'Jabatan'},{name:'baseSalary',label:'Gaji pokok',type:'number',min:0,required:true},{name:'branchId',label:'Lokasi kerja',type:'select',options:branches.items.map(x=>[x.id,`${x.code} · ${x.name}`]),required:true},{name:'joinDate',label:'Tanggal bergabung',type:'date'},{name:'bpjs',label:'Terdaftar BPJS',type:'checkbox'},{name:'active',label:'Karyawan aktif',type:'checkbox'}];},
    columns: [
      { label: 'Karyawan', render: (r) => `<div class="emp-cell"><span class="emp-cell-av">${empInitials(r.name)}</span><span class="emp-cell-copy"><b>${esc(r.name)}</b><small>${esc(r.nik)} · ${esc(r.jobTitle || '—')}</small></span></div>` },
      { label: 'Departemen', render: (r) => `<b>${esc(r.department || '—')}</b><small>${esc(r.branchName || '')}</small>` },
      { label: 'Gaji pokok', right: true, render: (r) => can('payroll.view') ? `<span class="money">${fmtIDR(r.baseSalary)}</span>` : '<span class="chip gray">Tersembunyi</span>' },
      { label: 'BPJS', render: (r) => r.bpjs ? '<span class="chip mint">Terdaftar</span>' : '<span class="chip gray">—</span>' },
      { label: 'Status', render: (r) => chip(r.lifecycleStatus || (r.active ? 'ACTIVE' : 'INACTIVE')) },
      { label: 'Data quality', render: (r) => dqCell(r.dataQualityScore, r.qualityFlags) },
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
      </div>`;
      main.querySelectorAll('.mk-chart-bar i[data-w]').forEach((el) => { el.style.width = `${el.dataset.w}%`; });
    }
  };
  R('/hr/analytics', workforceAnalyticsPage);
})();
