import nodemailer from 'nodemailer';
import 'dotenv/config';


const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),

    secure: process.env.EMAIL_PORT === '465', 
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
}


export const sendEmail = async ({ to, subject, html }: EmailOptions) => {
    try {
        const info = await transporter.sendMail({
            from: `"Projeto NotaDez" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: subject,
            html: html,
        });

        console.log('E-mail enviado: %s', info.messageId);
        return info;
    } catch (error) {
        console.error('Erro ao enviar e-mail:', error);
        throw new Error('Falha ao enviar e-mail de recuperação.');
    }
};
