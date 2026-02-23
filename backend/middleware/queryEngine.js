const inventory = require('../db_inventory.json');

function buildSmartQuery(targetTable, requestedFilters = {}) {
    const tableInfo = inventory[targetTable];
    if (!tableInfo) throw new Error(`Table ${targetTable} not found in inventory`);

    let selectFields = [`t1.*`, `COALESCE(SUM(p.amountEUR), 0) AS datePaidAmount` ];
    let joins = ` LEFT JOIN payments p ON t1.dateID = p.dateID`;
    
if (tableInfo.relationships) {
        tableInfo.relationships.forEach((rel, index) => {
            const alias = `j${index + 1}`;
            const refTable = rel.references;
            const refTableInfo = inventory[refTable];

            // Dynamically add all columns from the referenced table
            if (refTableInfo && refTableInfo.columns) {
                Object.keys(refTableInfo.columns).forEach(colName => {
                    // Handle specific labeling for status to keep your 'statusLabel' logic
                    if (refTable === 'status' && colName === 'status') {
                        selectFields.push(`${alias}.${colName} AS statusLabel`);
                    } else {
                        // Standard naming: j2.bandColor AS bandColor
                        selectFields.push(`${alias}.${colName} AS ${colName}`);
                    }
                });
            }
            
            joins += ` LEFT JOIN ${refTable} ${alias} ON t1.${rel.column} = ${alias}.${rel.refColumn}`;
        });
    }
    // ... (Keep your WHERE, HAVING, and ORDER BY logic exactly as it is) ...

    let sql = `SELECT ${selectFields.join(', ')} FROM ${targetTable} t1 ${joins}`;
    
    // (Add the rest of your WHERE/GROUP/HAVING/ORDER strings here)

    // --- TERMINAL DIAGNOSTIC ---
    // Copy the output of this from your terminal if colors still don't show!
    console.log("--- 🛠️  GENERATED SQL ---");
    console.log(sql); 

    return { sql, params: [] /* include your params array here */ };
}

module.exports = { buildSmartQuery };