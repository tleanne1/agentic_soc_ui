export function scoreRow(row: any, frequency: Record<string, number>) {
    let score = 0;
  
    if (frequency[row.AccountName] === 1) score += 3; // rare account
    if (row.AccountName === "root") score += 1;
    if (row.AccountName === "backup") score += 1;
  
    return score;
  }
  