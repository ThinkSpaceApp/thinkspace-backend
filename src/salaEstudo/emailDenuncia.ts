const RESEND_API_KEY = process.env.RESEND_API_KEY;

export async function sendDenunciaEmail({ to, usuario, post, motivo, denunciaId }: {
  to: string;
  usuario: { nome: string; email: string };
  post: { conteudo: string };
  motivo: string;
  denunciaId: string;
}) {
  if (!RESEND_API_KEY || RESEND_API_KEY === 'YOUR_RESEND_API_KEY') {
    return { success: false, message: 'API key do serviço de email não configurada.' };
  }
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(RESEND_API_KEY);
    const html = `
      <div style="font-family: Arial, sans-serif; text-align: left; color: #333;">
        <img src="https://i.imgur.com/4JBPx3E.png" alt="ThinkSpace Logo" style="height: 40px; margin-bottom: 20px;" />
        <h2 style="color:rgb(146, 102, 204);">Nova denúncia recebida</h2>
        <p><b>Usuário:</b> ${usuario.nome} (${usuario.email})</p>
        <p><b>Motivo:</b> ${motivo}</p>
        <p><b>Conteúdo do post:</b> ${post.conteudo}</p>
        <div style="margin-top:20px;">
          <a href="https://api.thinkspace.app.br/admin/denuncia/${denunciaId}/confirmar" style="background:#e74c3c;color:#fff;padding:10px 20px;text-decoration:none;border-radius:5px;margin-right:10px;">Post é ofensivo</a>
          <a href="https://api.thinkspace.app.br/admin/denuncia/${denunciaId}/ignorar" style="background:#2ecc40;color:#fff;padding:10px 20px;text-decoration:none;border-radius:5px;">Não é ofensivo</a>
        </div>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;" />
        <p style="font-size: 12px; color: #777;">Este é um e-mail automático. Por favor, não responda.</p>
      </div>
    `;
    const result = await resend.emails.send({
      from: "noreply@thinkspace.app.br",
      to,
      subject: "⚠️ Nova denúncia de post - ThinkSpace",
      html,
    });
    if (result.error) {
      return { success: false, message: `Erro ao enviar email: ${result.error.message || result.error}` };
    }
  } catch (err: any) {
    return { success: false, message: `Falha ao enviar email: ${err?.message || err}` };
  }
  return { success: true, message: 'Email de denúncia enviado.' };
}

export async function sendPostRemovidoEmail({ to, usuario, post }: {
  to: string;
  usuario: { nome: string; email: string };
  post: { conteudo: string };
}) {
  if (!RESEND_API_KEY || RESEND_API_KEY === 'YOUR_RESEND_API_KEY') {
    return { success: false, message: 'API key do serviço de email não configurada.' };
  }
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(RESEND_API_KEY);
    const html = `
      <div style="font-family: Arial, sans-serif; text-align: left; color: #333;">
        <img src="https://i.imgur.com/4JBPx3E.png" alt="ThinkSpace Logo" style="height: 40px; margin-bottom: 20px;" />
        <h2 style="color:rgb(146, 102, 204);">Post removido</h2>
        <p>O post do usuário ${usuario.nome} (${usuario.email}) foi removido por violar as diretrizes da plataforma.</p>
        <p><b>Conteúdo do post:</b> ${post.conteudo}</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;" />
        <p style="font-size: 12px; color: #777;">Este é um e-mail automático. Por favor, não responda.</p>
      </div>
    `;
    const result = await resend.emails.send({
      from: "noreply@thinkspace.app.br",
      to,
      subject: " 📢 Post removido - ThinkSpace",
      html,
    });
    if (result.error) {
      return { success: false, message: `Erro ao enviar email: ${result.error.message || result.error}` };
    }
  } catch (err: any) {
    return { success: false, message: `Falha ao enviar email: ${err?.message || err}` };
  }
  return { success: true, message: 'Email de remoção enviado.' };
}
