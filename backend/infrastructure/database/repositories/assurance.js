'use strict';

const money=(v)=>Math.round(Number(v||0)*100)/100;
const status=(condition,whenFalse='fail')=>condition?'pass':whenFalse;

async function collect(client){
  const [financial,inventory,payroll,orphans,partitions]=await Promise.all([
    client.query(`SELECT count(*)::int posted,
      count(*) FILTER(WHERE abs(debit-credit)>0.01)::int unbalanced,
      count(*) FILTER(WHERE lines<2)::int incomplete
      FROM (SELECT journal_document_id,count(*)::int lines,
        COALESCE(sum(debit),0)::numeric debit,COALESCE(sum(credit),0)::numeric credit
        FROM journal_lines GROUP BY journal_document_id) x`),
    client.query(`SELECT
      count(*)::int balances,
      count(*) FILTER(WHERE qty_on_hand<0 OR qty_reserved<0 OR qty_reserved>qty_on_hand)::int invalid_qty,
      count(*) FILTER(WHERE value_idr<0)::int negative_value,
      COALESCE(sum(value_idr),0)::float subledger_value,
      (SELECT COALESCE(sum(j.debit-j.credit),0)::float FROM journal_lines j
        JOIN chart_of_accounts a ON a.id=j.account_id
        JOIN business_documents d ON d.id=j.journal_document_id
        WHERE a.code='1300' AND d.status NOT IN('DRAFT','REJECTED','CANCELLED','VOID')) gl_value,
      (SELECT count(*)::int FROM (SELECT l.product_id,l.warehouse_id,sum(l.qty_on_hand) lot_qty,
        COALESCE(max(b.qty_on_hand),0) balance_qty FROM stock_lots l
        LEFT JOIN inventory_balances b ON b.product_id=l.product_id AND b.warehouse_id=l.warehouse_id
        WHERE l.status='ACTIVE' GROUP BY l.product_id,l.warehouse_id
        HAVING sum(l.qty_on_hand)>COALESCE(max(b.qty_on_hand),0)+0.0001) q) lot_exceeds_balance
      FROM inventory_balances`),
    client.query(`SELECT count(*)::int runs,
      count(*) FILTER(WHERE abs(document_amount-item_total)>0.01 OR items=0)::int mismatched
      FROM (SELECT d.id,d.amount::numeric document_amount,count(p.*)::int items,
        COALESCE(sum(p.net_pay),0)::numeric item_total FROM business_documents d
        LEFT JOIN payroll_items p ON p.payroll_document_id=d.id
        WHERE d.document_type='PAYROLL_RUN' AND d.status NOT IN('DRAFT','REJECTED','CANCELLED','VOID')
        GROUP BY d.id) x`),
    client.query(`SELECT
      (SELECT count(*) FROM file_metadata f WHERE f.related_document_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM business_documents d WHERE d.id=f.related_document_id))::int files,
      (SELECT count(*) FROM business_documents d WHERE d.branch_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM branches b WHERE b.id=d.branch_id))::int documents,
      (SELECT count(*) FROM background_jobs j WHERE j.requested_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM app_users u WHERE u.id=j.requested_by))::int jobs,
      (SELECT count(*) FROM stock_lots l WHERE NOT EXISTS(SELECT 1 FROM products p WHERE p.id=l.product_id))::int lots,
      (SELECT count(*) FROM document_relations r WHERE NOT EXISTS(SELECT 1 FROM business_documents d WHERE d.id=r.parent_document_id) OR NOT EXISTS(SELECT 1 FROM business_documents d WHERE d.id=r.child_document_id))::int relations`),
    client.query(`SELECT parent.relname parent,child.relname child,pg_get_expr(child.relpartbound,child.oid) bound
      FROM pg_inherits i JOIN pg_class parent ON parent.oid=i.inhparent JOIN pg_class child ON child.oid=i.inhrelid
      WHERE parent.relname IN('audit_logs','inventory_movements')`)
  ]);
  const inv=inventory.rows[0],now=new Date(),nextMonth=new Date(now.getFullYear(),now.getMonth()+1,1);
  const inventoryExpected=[now,nextMonth].map(d=>`inventory_movements_${d.getFullYear()}_${String(d.getMonth()+1).padStart(2,'0')}`);
  const auditExpected=[`audit_logs_${now.getFullYear()}`,`audit_logs_${now.getFullYear()+1}`];
  const children=new Set(partitions.rows.map(x=>x.child));
  return{
    financial:{...financial.rows[0]},
    inventory:{...inv,subledger_value:money(inv.subledger_value),gl_value:money(inv.gl_value),difference:money(Number(inv.subledger_value)-Number(inv.gl_value))},
    payroll:{...payroll.rows[0]},orphans:orphans.rows[0],
    partitions:{inventoryExpected,auditExpected,missing:[...inventoryExpected,...auditExpected,'inventory_movements_default','audit_logs_default'].filter(x=>!children.has(x)),children:[...children].sort()}
  };
}

function checks(metrics){
  const f=metrics.financial,i=metrics.inventory,p=metrics.payroll,o=metrics.orphans,orphanTotal=Object.values(o).reduce((n,v)=>n+Number(v||0),0);
  const inventoryInvalid=Number(i.invalid_qty)+Number(i.negative_value)+Number(i.lot_exceeds_balance);
  const inventoryStatus=inventoryInvalid?'fail':Math.abs(Number(i.difference))>.01?'warning':'pass';
  return[
    {name:'Financial reconciliation',status:status(Number(f.unbalanced)===0&&Number(f.incomplete)===0),critical:true,detail:`${f.posted} dokumen berjurnal; unbalanced=${f.unbalanced}; incomplete=${f.incomplete}.`},
    {name:'Inventory reconciliation',status:inventoryStatus,critical:inventoryInvalid>0,detail:`Subledger Rp ${money(i.subledger_value).toLocaleString('id-ID')} vs GL Rp ${money(i.gl_value).toLocaleString('id-ID')}; selisih Rp ${money(i.difference).toLocaleString('id-ID')}; invalid=${inventoryInvalid}.`},
    {name:'Payroll reconciliation',status:status(Number(p.mismatched)===0),critical:true,detail:`${p.runs} run; mismatch total/item=${p.mismatched}.`},
    {name:'Partition health',status:metrics.partitions.missing.length?'blocked':'pass',critical:true,detail:metrics.partitions.missing.length?`Partition hilang: ${metrics.partitions.missing.join(', ')}.`:`Current/next inventory dan current/next-year audit partition siap.`},
    {name:'Critical orphan detection',status:status(orphanTotal===0),critical:true,detail:`files=${o.files}, documents=${o.documents}, jobs=${o.jobs}, lots=${o.lots}, relations=${o.relations}.`}
  ];
}

async function evaluate(client){const metrics=await collect(client);return{metrics,checks:checks(metrics)};}
module.exports={collect,checks,evaluate};
