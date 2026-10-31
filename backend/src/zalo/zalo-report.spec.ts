import { readZaloLogo, zaloReportHtml, zaloReportText, ZaloFinancialReport } from './zalo-report';

const report: ZaloFinancialReport = { clubName:'CLB Thử nghiệm <script>alert(1)</script>',periodName:'Quý 4',periodFrom:'2026-10-01',periodTo:'2026-12-31',updatedAt:'2026-10-31T11:00:00Z',income:9600000,expense:6205000,carry:-48000,balance:3347000,mini:1900000,logo:'data:image/png;base64,aGVsbG8=' };
describe('Zalo financial report layout',()=>{
  it('includes branding, accounting periods and a reconciled main fund independent of mini fund',()=>{
    const html=zaloReportHtml(report);const text=zaloReportText(report);
    expect(html).toContain('alt="Logo CLB"');expect(html).toContain('3.347.000 đ');expect(html).toContain('1.900.000 đ');
    expect(html).not.toContain('<script>');expect(html).toContain('&lt;script&gt;');
    expect(text).toContain('Đối chiếu:');expect(text).toContain('Quỹ Phụ không cộng');expect(text).toContain('31/12/2026');
  });
  it('rejects remote and traversal logo sources', async()=>{
    for(const source of ['https://evil.test/image.png','http://169.254.169.254/a','/uploads/../../package.json','file:///etc/passwd','data:text/html;base64,PHNjcmlwdD4=']) expect(await readZaloLogo(source)).toBeNull();
  });
});
