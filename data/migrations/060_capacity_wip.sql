BEGIN;
-- 060 — Kapasitas work center dan nilai barang dalam proses (WIP).
--
-- work_centers.capacity_hours_per_day ada sejak migrasi 012 tetapi TIDAK PERNAH
-- diperiksa: sebuah work center berkapasitas 8 jam/hari dapat dijadwalkan 500
-- jam tanpa penolakan apa pun. Lebih dari itu, work_order_operations sama sekali
-- tidak punya TANGGAL, sehingga beban tidak dapat ditempatkan pada waktu —
-- perencanaan kapasitas memang mustahil, bukan sekadar belum dikerjakan.
--
-- Sisi kedua: nilai yang sudah masuk produksi tetapi belum menjadi barang jadi
-- (material dikeluarkan + tenaga kerja terpakai) tidak terlihat di mana pun.
-- Job costing baru dihitung saat WO SELESAI, sehingga selama pekerjaan berjalan
-- tidak ada yang tahu berapa uang yang sedang tertahan di lantai produksi.

ALTER TABLE work_order_operations
  ADD COLUMN scheduled_date date,
  ADD COLUMN actual_hours numeric(8,2) NOT NULL DEFAULT 0 CHECK (actual_hours >= 0);

CREATE INDEX ix_wo_operations_schedule ON work_order_operations(work_center_id, scheduled_date)
  WHERE scheduled_date IS NOT NULL AND status <> 'DONE';

-- Beban harian per work center. Hanya operasi yang benar-benar masih menuntut
-- kapasitas: yang sudah DONE dan WO yang batal tidak lagi membebani.
CREATE VIEW work_center_daily_load AS
SELECT o.work_center_id,
       o.scheduled_date,
       wc.code                     AS work_center_code,
       wc.name                     AS work_center_name,
       wc.capacity_hours_per_day::float AS capacity_hours,
       p.branch_id,
       SUM(o.planned_hours)::float AS planned_hours,
       COUNT(*)::int               AS operation_count
FROM work_order_operations o
JOIN work_centers wc ON wc.id = o.work_center_id
JOIN plants p        ON p.id = wc.plant_id
JOIN business_documents d ON d.id = o.work_order_id
WHERE o.scheduled_date IS NOT NULL
  AND o.status <> 'DONE'
  AND d.status NOT IN ('CANCELLED','VOID','REJECTED','COMPLETED','CLOSED')
GROUP BY o.work_center_id, o.scheduled_date, wc.code, wc.name, wc.capacity_hours_per_day, p.branch_id;

-- Nilai barang dalam proses per work order: material yang sudah dikeluarkan
-- pada biaya snapshot, ditambah tenaga kerja yang sudah terpakai pada rate
-- snapshot. Diturunkan dari fakta, bukan angka yang dipelihara terpisah.
CREATE VIEW work_order_wip AS
SELECT d.id                AS work_order_id,
       d.document_number,
       d.branch_id,
       d.status,
       d.title,
       COALESCE(m.material_cost, 0)::float AS material_cost,
       COALESCE(o.labor_cost, 0)::float    AS labor_cost,
       (COALESCE(m.material_cost, 0) + COALESCE(o.labor_cost, 0))::float AS wip_value,
       COALESCE(m.issued_lines, 0)::int    AS issued_lines,
       COALESCE(o.done_operations, 0)::int AS done_operations,
       COALESCE(o.total_operations, 0)::int AS total_operations
FROM business_documents d
LEFT JOIN LATERAL (
  SELECT SUM(wm.issued_qty * wm.unit_cost_snapshot) material_cost,
         COUNT(*) FILTER (WHERE wm.issued_qty > 0)  issued_lines
  FROM work_order_materials wm WHERE wm.work_order_id = d.id
) m ON true
LEFT JOIN LATERAL (
  SELECT SUM(wo.actual_hours * wo.hourly_rate_snapshot) labor_cost,
         COUNT(*) FILTER (WHERE wo.status = 'DONE')    done_operations,
         COUNT(*)                                       total_operations
  FROM work_order_operations wo WHERE wo.work_order_id = d.id
) o ON true
WHERE d.document_type = 'WORK_ORDER'
  AND d.status IN ('APPROVED','IN_PROCESS','PARTIALLY_COMPLETED');

COMMIT;
