import { PayrollSummary, Employee, Organization } from '@/types';
import { formatCurrency } from '@/lib/payroll';

export interface PayslipData {
  organization: Organization;
  employee: Employee;
  payroll: PayrollSummary;
  period: string;
  payDate: string;
}

/**
 * Generate HTML content for a payslip
 */
export function generatePayslipHTML(data: PayslipData): string {
  const { organization, employee, payroll } = data;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Payslip - ${employee.name} - ${payroll.month}</title>
  <style>
    @media print {
      @page { margin: 0.5in; }
      body { margin: 0; }
      .no-print { display: none; }
    }
    
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
    }
    
    .header {
      border-bottom: 3px solid #2563eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .company-info {
      flex: 1;
    }
    
    .company-logo {
      max-width: 150px;
      max-height: 80px;
    }
    
    .company-name {
      font-size: 24px;
      font-weight: bold;
      color: #1e40af;
      margin: 0 0 5px 0;
    }
    
    .company-details {
      font-size: 12px;
      color: #666;
    }
    
    .payslip-title {
      text-align: center;
      font-size: 28px;
      font-weight: bold;
      margin: 20px 0;
      color: #1e40af;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 30px;
    }
    
    .info-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 15px;
    }
    
    .info-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 4px;
    }
    
    .info-value {
      font-size: 14px;
      color: #0f172a;
      font-weight: 500;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    
    th {
      background: #1e40af;
      color: white;
      padding: 12px;
      text-align: left;
      font-size: 13px;
      font-weight: 600;
    }
    
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 14px;
    }
    
    tr:hover {
      background: #f8fafc;
    }
    
    .amount {
      text-align: right;
      font-weight: 600;
    }
    
    .total-row {
      background: #eff6ff;
      font-weight: bold;
    }
    
    .total-row td {
      border-top: 2px solid #2563eb;
      padding: 14px 12px;
      font-size: 15px;
    }
    
    .net-pay {
      background: #1e40af;
      color: white;
      font-size: 18px;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e2e8f0;
      font-size: 11px;
      color: #64748b;
      text-align: center;
    }
    
    .signature-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin: 40px 0 20px 0;
    }
    
    .signature-box {
      border-top: 1px solid #333;
      padding-top: 8px;
      text-align: center;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-info">
      <h1 class="company-name">${organization.companyName}</h1>
      <div class="company-details">
        ${organization.contactEmail}<br>
        ${organization.contactPhone || ''}
      </div>
    </div>
    ${organization.logoUrl ? `<img src="${organization.logoUrl}" alt="${organization.companyName}" class="company-logo">` : ''}
  </div>
  
  <h2 class="payslip-title">PAYSLIP</h2>
  
  <div class="info-grid">
    <div class="info-box">
      <div class="info-label">Employee Name</div>
      <div class="info-value">${employee.name}</div>
    </div>
    <div class="info-box">
      <div class="info-label">Employee ID</div>
      <div class="info-value">${employee.employeeNumber || employee.id.substring(0, 8)}</div>
    </div>
    <div class="info-box">
      <div class="info-label">Department</div>
      <div class="info-value">${employee.department}</div>
    </div>
    <div class="info-box">
      <div class="info-label">Position</div>
      <div class="info-value">${employee.position}</div>
    </div>
    <div class="info-box">
      <div class="info-label">Pay Period</div>
      <div class="info-value">${payroll.month}</div>
    </div>
    <div class="info-box">
      <div class="info-label">Pay Date</div>
      <div class="info-value">${data.payDate}</div>
    </div>
  </div>
  
  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th class="amount">Hours/Days</th>
        <th class="amount">Amount (ZMW)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Days Worked</td>
        <td class="amount">${payroll.daysWorked}</td>
        <td class="amount">-</td>
      </tr>
      <tr>
        <td>Regular Hours</td>
        <td class="amount">${payroll.regularHours.toFixed(2)}</td>
        <td class="amount">${formatCurrency(payroll.regularPay)}</td>
      </tr>
      ${payroll.holidayHours > 0 ? `
      <tr>
        <td>Holiday/Overtime Hours</td>
        <td class="amount">${payroll.holidayHours.toFixed(2)}</td>
        <td class="amount">${formatCurrency(payroll.holidayPay)}</td>
      </tr>
      ` : ''}
      <tr class="total-row">
        <td colspan="2">Gross Pay</td>
        <td class="amount">${formatCurrency(payroll.totalPay)}</td>
      </tr>
    </tbody>
  </table>
  
  ${payroll.deductions && payroll.deductions.length > 0 ? `
  <table>
    <thead>
      <tr>
        <th>Deductions</th>
        <th class="amount">Amount (ZMW)</th>
      </tr>
    </thead>
    <tbody>
      ${payroll.deductions.map(d => `
      <tr>
        <td>${d.name}</td>
        <td class="amount">${formatCurrency(d.amount)}</td>
      </tr>
      `).join('')}
      <tr class="total-row">
        <td>Total Deductions</td>
        <td class="amount">${formatCurrency(payroll.totalDeductions || 0)}</td>
      </tr>
    </tbody>
  </table>
  ` : ''}
  
  <table>
    <tbody>
      <tr class="total-row net-pay">
        <td colspan="2">NET PAY</td>
        <td class="amount">${formatCurrency(payroll.netPay || payroll.totalPay)}</td>
      </tr>
    </tbody>
  </table>
  
  <div class="signature-section">
    <div class="signature-box">
      Employee Signature & Date
    </div>
    <div class="signature-box">
      Employer Signature & Date
    </div>
  </div>
  
  <div class="footer">
    This is a computer-generated payslip and does not require a signature.<br>
    Generated by Protocol Management System on ${new Date().toLocaleDateString()}
  </div>
  
  <div class="no-print" style="margin-top: 30px; text-align: center;">
    <button onclick="window.print()" style="padding: 12px 24px; background: #2563eb; color: white; border: none; border-radius: 6px; font-size: 16px; cursor: pointer;">
      Print Payslip
    </button>
  </div>
</body>
</html>
  `;
}

/**
 * Print a payslip by opening it in a new window
 */
export function printPayslip(data: PayslipData): void {
  const html = generatePayslipHTML(data);
  const printWindow = window.open('', '_blank');
  
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    
    // Auto-trigger print dialog after content loads
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  } else {
    alert('Please allow popups to print payslips');
  }
}

/**
 * Generate and download payslip as HTML file
 */
export function downloadPayslip(data: PayslipData): void {
  const html = generatePayslipHTML(data);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.href = url;
  link.download = `Payslip_${data.employee.name.replace(/\s+/g, '_')}_${data.payroll.month}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
