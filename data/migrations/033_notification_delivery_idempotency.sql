BEGIN;

-- Satu kanal/tujuan hanya memiliki satu delivery record per notifikasi.
-- Retry memperbarui attempts/status pada baris yang sama sehingga audit
-- operasional tetap ringkas dan pengiriman sukses tidak terduplikasi.
DELETE FROM notification_deliveries
WHERE id IN (
  SELECT id FROM (
    SELECT id,row_number() OVER(
      PARTITION BY notification_id,channel,COALESCE(destination,'')
      ORDER BY sent_at DESC NULLS LAST,created_at DESC,id DESC
    ) duplicate_rank
    FROM notification_deliveries
  ) ranked WHERE duplicate_rank>1
);

CREATE UNIQUE INDEX ux_notification_delivery_target
  ON notification_deliveries(notification_id,channel,COALESCE(destination,''));

REVOKE DELETE ON notification_deliveries FROM mat_erp_app;

COMMIT;
