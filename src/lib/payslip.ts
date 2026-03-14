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
 * Generate HTML content for a payslip with professional styling
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
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
      padding: 30px;
      margin: -20px -20px 30px -20px;
      border-radius: 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    @media print {
      .header {
        margin: 0;
        box-shadow: none;
      }
    }
    
    .company-info {
      flex: 1;
      color: white;
    }
    
    .company-logo {
      max-width: 180px;
      max-height: 100px;
      background: white;
      padding: 10px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }
    
    .company-name {
      font-size: 32px;
      font-weight: bold;
      color: white;
      margin: 0 0 8px 0;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      letter-spacing: -0.5px;
    }
    
    .company-details {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.95);
      line-height: 1.6;
    }
    
    .payslip-title {
      text-align: center;
      font-size: 32px;
      font-weight: bold;
      margin: 30px 0;
      color: #1e40af;
      text-transform: uppercase;
      letter-spacing: 2px;
      border-bottom: 3px solid #3b82f6;
      padding-bottom: 15px;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-bottom: 30px;
    }
    
    @media print {
      .info-grid {
        grid-template-columns: repeat(4, 1fr);
        gap: 12px;
      }
    }
    
    .info-box {
      background: linear-gradient(to bottom, #f8fafc, #ffffff);
      border: 2px solid #e2e8f0;
      border-radius: 10px;
      padding: 16px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
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
      <div class="info-label">Hourly Wage</div>
      <div class="info-value">${formatCurrency(employee.hourlyWage)}/hr</div>
    </div>
    <div class="info-box">
      <div class="info-label">Pay Period</div>
      <div class="info-value">${payroll.month}</div>
    </div>
    <div class="info-box">
      <div class="info-label">Pay Date</div>
      <div class="info-value">${data.payDate}</div>
    </div>
    <div class="info-box">
      <div class="info-label">Overtime Rate</div>
      <div class="info-value">1.5x Standard</div>
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
        <td>Regular Hours (@ ${formatCurrency(employee.hourlyWage)}/hr)</td>
        <td class="amount">${payroll.regularHours.toFixed(2)}</td>
        <td class="amount">${formatCurrency(payroll.regularPay)}</td>
      </tr>
      ${payroll.holidayHours > 0 ? `
      <tr style="background: #fef3c7;">
        <td><strong>Holiday/Overtime Hours (@ 2x rate = ${formatCurrency(employee.hourlyWage * 2)}/hr)</strong></td>
        <td class="amount"><strong>${payroll.holidayHours.toFixed(2)}</strong></td>
        <td class="amount"><strong>${formatCurrency(payroll.holidayPay)}</strong></td>
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
 * FIXED: Added error handling, retry logic, and fallback print method
 */
export function printPayslip(data: PayslipData): void {
  console.log('[Payslip] Initiating print for:', data.employee.name);
  const html = generatePayslipHTML(data);
  
  try {
    // Try opening a new window
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    
    if (printWindow) {
      console.log('[Payslip] ✅ Print window opened successfully');
      printWindow.document.write(html);
      printWindow.document.close();
      
      // Auto-trigger print dialog after content loads with timeout protection
      let printTriggered = false;
      
      const triggerPrint = () => {
        if (printTriggered) return;
        printTriggered = true;
        
        console.log('[Payslip] 🖨️ Triggering print dialog...');
        printWindow.focus();
        
        // Small delay to ensure content is fully rendered
        setTimeout(() => {
          try {
            printWindow.print();
            console.log('[Payslip] ✅ Print dialog opened');
          } catch (printError) {
            console.error('[Payslip] ❌ Print error:', printError);
            alert('Print failed. Please try using Ctrl+P or Cmd+P in the opened window.');
          }
        }, 250);
      };
      
      // Try both onload and timeout for maximum compatibility
      printWindow.onload = triggerPrint;
      setTimeout(triggerPrint, 500); // Fallback timeout
      
    } else {
      // Popup blocked - use fallback method
      console.warn('[Payslip] ⚠️ Popup blocked, using fallback print method');
      useFallbackPrint(html);
    }
  } catch (error) {
    console.error('[Payslip] ❌ Print exception:', error);
    useFallbackPrint(html);
  }
}

/**
 * Fallback print method when popups are blocked
 */
function useFallbackPrint(html: string): void {
  console.log('[Payslip] Using fallback print method (iframe)');
  
  // Create hidden iframe for printing
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  
  document.body.appendChild(iframe);
  
  const iframeDoc = iframe.contentWindow?.document;
  if (iframeDoc) {
    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();
    
    // Wait for content to load, then print
    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          console.log('[Payslip] ✅ Fallback print triggered');
          
          // Clean up after printing
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 1000);
        } catch (error) {
          console.error('[Payslip] ❌ Fallback print error:', error);
          document.body.removeChild(iframe);
          alert('Unable to print. Please enable popups or download the payslip instead.');
        }
      }, 500);
    };
  } else {
    console.error('[Payslip] ❌ Cannot access iframe document');
    alert('Printing is blocked. Please allow popups for this site or download the payslip.');
    document.body.removeChild(iframe);
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

/**
 * Print all payslips at once in a single combined document
 * Generates one print window with all employees' payslips separated by page breaks
 */
export function printAllPayslips(payslipsData: PayslipData[]): void {
  if (payslipsData.length === 0) {
    alert('No payslips to print');
    return;
  }
  
  console.log(`[Payslip] Initiating bulk print for ${payslipsData.length} employees`);
  
  // Generate HTML for all payslips with page breaks
  const combinedHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Payslips - ${payslipsData[0].organization.companyName} - ${payslipsData[0].period}</title>
  <style>
    @media print {
      @page { 
        margin: 0.5in; 
        size: auto;
      }
      body { margin: 0; }
      .no-print { display: none; }
      .payslip-page { 
        page-break-after: always; 
        page-break-inside: avoid;
      }
      .payslip-page:last-child {
        page-break-after: auto;
      }
    }
    
    @media screen {
      .payslip-page {
        margin-bottom: 40px;
        padding-bottom: 40px;
        border-bottom: 3px dashed #cbd5e1;
      }
      .payslip-page:last-child {
        border-bottom: none;
      }
    }
    
    body {
      font-family: Arial, sans-serif;
      color: #333;
    }
    
    .bulk-header {
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
      color: white;
      padding: 30px;
      text-align: center;
      margin-bottom: 40px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .bulk-header h1 {
      margin: 0 0 10px 0;
      font-size: 36px;
      font-weight: bold;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
    
    .bulk-header p {
      margin: 0;
      font-size: 16px;
      opacity: 0.95;
    }
    
    .payslip-container {
      max-width: 900px;
      margin: 0 auto;
      padding: 0 20px;
    }
    
    /* Copy all styles from single payslip */
    .header {
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
      padding: 30px;
      margin: 0 -20px 30px -20px;
      border-radius: 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .company-info {
      flex: 1;
      color: white;
    }
    
    .company-logo {
      max-width: 180px;
      max-height: 100px;
      background: white;
      padding: 10px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }
    
    .company-name {
      font-size: 32px;
      font-weight: bold;
      color: white;
      margin: 0 0 8px 0;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      letter-spacing: -0.5px;
    }
    
    .company-details {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.95);
      line-height: 1.6;
    }
    
    .payslip-title {
      text-align: center;
      font-size: 32px;
      font-weight: bold;
      margin: 30px 0;
      color: #1e40af;
      text-transform: uppercase;
      letter-spacing: 2px;
      border-bottom: 3px solid #3b82f6;
      padding-bottom: 15px;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-bottom: 30px;
    }
    
    .info-box {
      background: linear-gradient(to bottom, #f8fafc, #ffffff);
      border: 2px solid #e2e8f0;
      border-radius: 10px;
      padding: 16px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
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
    
    @media print {
      .bulk-header { display: none; }
      .header { margin: 0; box-shadow: none; }
      .info-grid { grid-template-columns: repeat(4, 1fr); gap: 12px; }
    }
  </style>
</head>
<body>
  <div class="bulk-header no-print">
    <h1>${payslipsData[0].organization.companyName}</h1>
    <p>Bulk Payslips for ${payslipsData[0].period} • ${payslipsData.length} Employees</p>
  </div>
  
  <div class="no-print" style="max-width: 900px; margin: 0 auto 30px; padding: 0 20px; text-align: center;">
    <button onclick="window.print()" style="padding: 14px 32px; background: #2563eb; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
      🖨️ Print All ${payslipsData.length} Payslips
    </button>
    <p style="margin-top: 12px; color: #64748b; font-size: 14px;">
      Each payslip will print on a separate page
    </p>
  </div>
  
  <div class="payslip-container">
    ${payslipsData.map((data, index) => `
    <div class="payslip-page">
      <div class="header">
        <div class="company-info">
          <h1 class="company-name">${data.organization.companyName}</h1>
          <div class="company-details">
            ${data.organization.contactEmail}<br>
            ${data.organization.contactPhone || ''}
          </div>
        </div>
        ${data.organization.logoUrl ? `<img src="${data.organization.logoUrl}" alt="${data.organization.companyName}" class="company-logo">` : ''}
      </div>
      
      <h2 class="payslip-title">PAYSLIP</h2>
      
      <div class="info-grid">
        <div class="info-box">
          <div class="info-label">Employee Name</div>
          <div class="info-value">${data.employee.name}</div>
        </div>
        <div class="info-box">
          <div class="info-label">Employee ID</div>
          <div class="info-value">${data.employee.employeeNumber || data.employee.id.substring(0, 8)}</div>
        </div>
        <div class="info-box">
          <div class="info-label">Department</div>
          <div class="info-value">${data.employee.department}</div>
        </div>
        <div class="info-box">
          <div class="info-label">Position</div>
          <div class="info-value">${data.employee.position}</div>
        </div>
        <div class="info-box">
          <div class="info-label">Hourly Wage</div>
          <div class="info-value">${formatCurrency(data.employee.hourlyWage)}/hr</div>
        </div>
        <div class="info-box">
          <div class="info-label">Pay Period</div>
          <div class="info-value">${data.payroll.month}</div>
        </div>
        <div class="info-box">
          <div class="info-label">Pay Date</div>
          <div class="info-value">${data.payDate}</div>
        </div>
        <div class="info-box">
          <div class="info-label">Overtime Rate</div>
          <div class="info-value">1.5x Standard</div>
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
            <td class="amount">${data.payroll.daysWorked}</td>
            <td class="amount">-</td>
          </tr>
          <tr>
            <td>Regular Hours (@ ${formatCurrency(data.employee.hourlyWage)}/hr)</td>
            <td class="amount">${data.payroll.regularHours.toFixed(2)}</td>
            <td class="amount">${formatCurrency(data.payroll.regularPay)}</td>
          </tr>
          ${data.payroll.holidayHours > 0 ? `
          <tr style="background: #fef3c7;">
            <td><strong>Holiday/Overtime Hours (@ 2x rate = ${formatCurrency(data.employee.hourlyWage * 2)}/hr)</strong></td>
            <td class="amount"><strong>${data.payroll.holidayHours.toFixed(2)}</strong></td>
            <td class="amount"><strong>${formatCurrency(data.payroll.holidayPay)}</strong></td>
          </tr>
          ` : ''}
          <tr class="total-row">
            <td colspan="2">Gross Pay</td>
            <td class="amount">${formatCurrency(data.payroll.totalPay)}</td>
          </tr>
        </tbody>
      </table>
      
      ${data.payroll.deductions && data.payroll.deductions.length > 0 ? `
      <table>
        <thead>
          <tr>
            <th>Deductions</th>
            <th class="amount">Amount (ZMW)</th>
          </tr>
        </thead>
        <tbody>
          ${data.payroll.deductions.map(d => `
          <tr>
            <td>${d.name}</td>
            <td class="amount">${formatCurrency(d.amount)}</td>
          </tr>
          `).join('')}
          <tr class="total-row">
            <td>Total Deductions</td>
            <td class="amount">${formatCurrency(data.payroll.totalDeductions || 0)}</td>
          </tr>
        </tbody>
      </table>
      ` : ''}
      
      <table>
        <tbody>
          <tr class="total-row net-pay">
            <td colspan="2">NET PAY</td>
            <td class="amount">${formatCurrency(data.payroll.netPay || data.payroll.totalPay)}</td>
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
        Generated by Protocol Management System • Page ${index + 1} of ${payslipsData.length}
      </div>
    </div>
    `).join('')}
  </div>
</body>
</html>
  `;
  
  try {
    // Try opening a new window for bulk print
    const printWindow = window.open('', '_blank', 'width=900,height=900');
    
    if (printWindow) {
      console.log(`[Payslip] ✅ Bulk print window opened for ${payslipsData.length} payslips`);
      printWindow.document.write(combinedHTML);
      printWindow.document.close();
      
      // Auto-trigger print dialog
      let printTriggered = false;
      
      const triggerPrint = () => {
        if (printTriggered) return;
        printTriggered = true;
        
        console.log('[Payslip] 🖨️ Triggering bulk print dialog...');
        printWindow.focus();
        
        setTimeout(() => {
          try {
            printWindow.print();
            console.log(`[Payslip] ✅ Bulk print dialog opened for ${payslipsData.length} payslips`);
          } catch (printError) {
            console.error('[Payslip] ❌ Bulk print error:', printError);
            alert('Print failed. Please try using Ctrl+P or Cmd+P in the opened window.');
          }
        }, 500);
      };
      
      printWindow.onload = triggerPrint;
      setTimeout(triggerPrint, 1000);
      
    } else {
      console.warn('[Payslip] ⚠️ Popup blocked for bulk print, using fallback');
      useFallbackPrint(combinedHTML);
    }
  } catch (error) {
    console.error('[Payslip] ❌ Bulk print exception:', error);
    useFallbackPrint(combinedHTML);
  }
}
