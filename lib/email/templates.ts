export const baseStyles = `
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  background-color: #ffffff;
  color: #18181b;
`;

export const headerStyles = `
  text-align: center;
  padding-bottom: 20px;
  border-bottom: 1px solid #e4e4e7;
  margin-bottom: 24px;
`;

export const codeBoxStyles = `
  background: #f4f4f5;
  padding: 24px;
  font-size: 36px;
  font-weight: 700;
  text-align: center;
  letter-spacing: 8px;
  border-radius: 12px;
  margin: 32px 0;
  color: #09090b;
`;

export const textStyles = `
  font-size: 16px;
  line-height: 1.5;
  color: #3f3f46;
`;

export const footerStyles = `
  margin-top: 48px;
  padding-top: 24px;
  border-top: 1px solid #e4e4e7;
  font-size: 14px;
  color: #71717a;
  text-align: center;
`;

export function getLoginOtpTemplate(code: string): string {
  return `
    <div style="${baseStyles}">
      <div style="${headerStyles}">
        <h1 style="margin:0;color:#09090b;">Pingr</h1>
      </div>
      <p style="${textStyles}">Hello,</p>
      <p style="${textStyles}">Use the following code to sign in to your Pingr account. This code is valid for 10 minutes.</p>
      
      <div style="${codeBoxStyles}">${code}</div>
      
      <p style="${textStyles}">If you didn't request this email, you can safely ignore it.</p>
      
      <div style="${footerStyles}">
        &copy; ${new Date().getFullYear()} Pingr. All rights reserved.
      </div>
    </div>
  `;
}

export function getVerifyEmailTemplate(code: string): string {
  return `
    <div style="${baseStyles}">
      <div style="${headerStyles}">
        <h1 style="margin:0;color:#09090b;">Pingr</h1>
      </div>
      <p style="${textStyles}">Welcome to Pingr!</p>
      <p style="${textStyles}">Please verify your email address by entering the following code. This code is valid for 10 minutes.</p>
      
      <div style="${codeBoxStyles}">${code}</div>
      
      <p style="${textStyles}">If you didn't create an account, you can safely ignore this email.</p>
      
      <div style="${footerStyles}">
        &copy; ${new Date().getFullYear()} Pingr. All rights reserved.
      </div>
    </div>
  `;
}

export function getPasswordResetTemplate(code: string): string {
  return `
    <div style="${baseStyles}">
      <div style="${headerStyles}">
        <h1 style="margin:0;color:#09090b;">Pingr</h1>
      </div>
      <p style="${textStyles}">Hello,</p>
      <p style="${textStyles}">We received a request to reset your password. Use the following code to securely reset your password. This code is valid for 15 minutes.</p>
      
      <div style="${codeBoxStyles}">${code}</div>
      
      <p style="${textStyles}">If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>
      
      <div style="${footerStyles}">
        &copy; ${new Date().getFullYear()} Pingr. All rights reserved.
      </div>
    </div>
  `;
}
