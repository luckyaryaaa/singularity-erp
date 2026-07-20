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
  R('/hr/employees', masterPage({
    endpoint: '/api/employees', key: 'employees', permission: 'employee.view', title: 'Karyawan', eyebrow: 'HRD', detailType: 'employees',
    fields:async()=>{const branches=await api('/api/branches');return[{name:'nik',label:'NIK',required:true},{name:'name',label:'Nama lengkap',required:true},{name:'department',label:'Departemen',required:true},{name:'jobTitle',label:'Jabatan'},{name:'baseSalary',label:'Gaji pokok',type:'number',min:0,required:true},{name:'branchId',label:'Lokasi kerja',type:'select',options:branches.items.map(x=>[x.id,`${x.code} · ${x.name}`]),required:true},{name:'joinDate',label:'Tanggal bergabung',type:'date'},{name:'bpjs',label:'Terdaftar BPJS',type:'checkbox'},{name:'active',label:'Karyawan aktif',type:'checkbox'}];},
    columns: [
      { label: 'Karyawan', render: (r) => `<b>${esc(r.name)}</b><small>${esc(r.nik)} · ${esc(r.jobTitle)}</small>` },
      { label: 'Departemen', render: (r) => esc(r.department) },
      { label: 'Lokasi', render: (r) => esc(r.branchName) },
      { label: 'Gaji pokok', right: true, render: (r) => can('payroll.view') ? `<span class="money">${fmtIDR(r.baseSalary)}</span>` : '<span class="chip gray">Tersembunyi</span>' },
      { label: 'BPJS', render: (r) => r.bpjs ? '<span class="chip mint">Terdaftar</span>' : '<span class="chip gray">—</span>' },
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
})();
