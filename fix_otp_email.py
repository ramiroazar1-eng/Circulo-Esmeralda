content = open("src/app/api/signatures/request-otp/route.ts", "r", encoding="utf-8").read()

old = '''  // Enviar OTP por email via Supabase Auth
  const { error: emailError } = await service.auth.admin.sendRawEmail({
    to: user.email!,
    subject: "Codigo de verificacion - AEF Simple Asociacion",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a2e1a;">Circulo Esmeralda - AEF</h2>
        <p>Tu codigo de verificacion para firmar el documento de membresia es:</p>
        <div style="background: #f0f4f0; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2d5a27;">${otp}</span>
        </div>
        <p style="color: #666; font-size: 13px;">Este codigo vence en 10 minutos.</p>
        <p style="color: #666; font-size: 13px;">Si no solicitaste este codigo, ignora este mensaje.</p>
      </div>
    `
  })

  if (emailError) {
    // Intentar con Brevo SMTP como fallback
    console.error("Email error:", emailError.message)
  }'''

new = '''  // Enviar OTP por email via Brevo
  try {
    await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.BREVO_API_KEY ?? ""
      },
      body: JSON.stringify({
        sender: { name: "Circulo Esmeralda", email: "noreply@circuloesmeralda.com.ar" },
        to: [{ email: user.email! }],
        subject: "Codigo de verificacion - AEF Simple Asociacion",
        htmlContent: `<div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a2e1a;">Circulo Esmeralda - AEF</h2>
          <p>Tu codigo de verificacion para firmar el documento de membresia es:</p>
          <div style="background: #f0f4f0; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2d5a27;">${otp}</span>
          </div>
          <p style="color: #666; font-size: 13px;">Este codigo vence en 10 minutos.</p>
          <p style="color: #666; font-size: 13px;">Si no solicitaste este codigo, ignora este mensaje.</p>
        </div>`
      })
    })
  } catch(e) {
    console.error("Email send error:", e)
  }'''

content = content.replace(old, new)
open("src/app/api/signatures/request-otp/route.ts", "w", encoding="utf-8").write(content)
print("OK")
