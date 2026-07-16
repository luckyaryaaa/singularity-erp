'use strict';
(() => {
  const { esc, fmtIDR, fmtIDRFull, fmtDate, fmtDateTime, relTime, api, uploadFile, query, invalidate, router, can, state, newIdemKey } = window.MAT;
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
  R('/hr/attendance', attendancePage);
  R('/hr/leave', docListPage({ type: 'LEAVE_REQUEST', module: 'leave', title: 'Pengajuan cuti', eyebrow: 'HRD' }));
  R('/payroll', payrollPage);
})();
